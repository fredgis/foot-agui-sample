# =============================================================================
# deploy.ps1 — One-Click Idempotent Deployment for foot-agui-sample on Azure
#              Windows native (PowerShell 7+ / pwsh)
#
# Usage:
#   Copy-Item scripts\deploy-config.env.example scripts\deploy-config.env
#   # Fill in deploy-config.env with your values
#   pwsh scripts\deploy.ps1
#
# Re-entrant: safe to run multiple times.  Each step checks whether the
# resource already exists before creating it.
#
# To tear down everything:
#   az group delete --name rg-worldcup2026 --yes --no-wait
# =============================================================================
#Requires -Version 7
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = Split-Path -Parent $ScriptDir
$ConfigFile = Join-Path $ScriptDir 'deploy-config.env'

# ---------------------------------------------------------------------------
# 0. Load configuration
# ---------------------------------------------------------------------------
if (-not (Test-Path $ConfigFile)) {
    Write-Error @"
❌  Configuration file not found: $ConfigFile
    Copy the template and fill in your values:
    Copy-Item scripts\deploy-config.env.example scripts\deploy-config.env
"@
    exit 1
}

# Parse KEY=VALUE lines (skip blank lines and comments)
foreach ($line in Get-Content $ConfigFile) {
    if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
    if ($line -match '^([^=]+)=(.*)$') {
        [System.Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), 'Process')
    }
}

function Require-Env([string]$Name) {
    $val = [System.Environment]::GetEnvironmentVariable($Name)
    if (-not $val) {
        Write-Error "❌  $Name is required in deploy-config.env"
        exit 1
    }
    return $val
}

$AZURE_SUBSCRIPTION_ID            = Require-Env 'AZURE_SUBSCRIPTION_ID'
$AZURE_LOCATION                   = Require-Env 'AZURE_LOCATION'
$RESOURCE_GROUP                   = Require-Env 'RESOURCE_GROUP'
$ACR_NAME                         = Require-Env 'ACR_NAME'
$CONTAINER_APP_ENV                = Require-Env 'CONTAINER_APP_ENV'
$CONTAINER_APP_NAME               = Require-Env 'CONTAINER_APP_NAME'
$STATIC_WEB_APP_NAME              = Require-Env 'STATIC_WEB_APP_NAME'
$IMAGE_NAME                       = Require-Env 'IMAGE_NAME'
$AZURE_OPENAI_ENDPOINT            = Require-Env 'AZURE_OPENAI_ENDPOINT'
$AZURE_OPENAI_API_KEY             = Require-Env 'AZURE_OPENAI_API_KEY'
$AZURE_OPENAI_CHAT_DEPLOYMENT_NAME = Require-Env 'AZURE_OPENAI_CHAT_DEPLOYMENT_NAME'

# ---------------------------------------------------------------------------
# 0. Check prerequisites
# ---------------------------------------------------------------------------
function Check-Prereqs {
    $missing = $false

    foreach ($cmd in @('az', 'docker', 'node', 'npm', 'git')) {
        if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
            Write-Host "❌  Missing prerequisite: $cmd"
            $missing = $true
        }
    }

    $azVer = (az version --query '"azure-cli"' -o tsv 2>$null) -replace '"', ''
    if ($azVer) {
        $parts = $azVer -split '\.'
        $major = [int]$parts[0]; $minor = [int]$parts[1]
        if ($major -lt 2 -or ($major -eq 2 -and $minor -lt 50)) {
            Write-Host "❌  Azure CLI >= 2.50 required (found $azVer)"
            $missing = $true
        }
    }

    $nodeVer = (node --version 2>$null) -replace 'v', '' -split '\.' | Select-Object -First 1
    if ($nodeVer -and [int]$nodeVer -lt 20) {
        Write-Host "❌  Node.js >= 20 required (found v$nodeVer)"
        $missing = $true
    }

    if ($missing) {
        Write-Host "`nPlease install the missing prerequisites and re-run the script."
        exit 1
    }
    Write-Host "✅  Prerequisites OK"
}

Check-Prereqs

# Derive image tag from git SHA (fallback to "latest")
$IMAGE_TAG = (git -C $RepoRoot rev-parse --short HEAD 2>$null)
if (-not $IMAGE_TAG) { $IMAGE_TAG = 'latest' }
$ACR_LOGIN_SERVER = "${ACR_NAME}.azurecr.io"
$FULL_IMAGE       = "${ACR_LOGIN_SERVER}/${IMAGE_NAME}:${IMAGE_TAG}"

Write-Host ""
Write-Host "==================================================================="
Write-Host " foot-agui-sample — One-Click Azure Deployment"
Write-Host "==================================================================="
Write-Host " Resource Group : $RESOURCE_GROUP"
Write-Host " Location       : $AZURE_LOCATION"
Write-Host " ACR            : $ACR_LOGIN_SERVER"
Write-Host " Image          : $FULL_IMAGE"
Write-Host " Container App  : $CONTAINER_APP_NAME"
Write-Host " Static Web App : $STATIC_WEB_APP_NAME"
Write-Host "==================================================================="
Write-Host ""

az account set --subscription $AZURE_SUBSCRIPTION_ID

# ---------------------------------------------------------------------------
# Step 1 — Resource Group
# ---------------------------------------------------------------------------
Write-Host "🔷 [1/7] Resource Group..."
$null = az group show --name $RESOURCE_GROUP 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅  exists — skipping"
} else {
    Write-Host "  🔨  not found — creating..."
    az group create --name $RESOURCE_GROUP --location $AZURE_LOCATION --output none
    Write-Host "  ✅  created"
}

# ---------------------------------------------------------------------------
# Step 2 — Container Registry
# ---------------------------------------------------------------------------
Write-Host "🔷 [2/7] Container Registry..."
$null = az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅  exists — logging in..."
} else {
    Write-Host "  🔨  not found — creating..."
    az acr create `
        --name $ACR_NAME `
        --resource-group $RESOURCE_GROUP `
        --sku Basic `
        --admin-enabled true `
        --output none
    Write-Host "  ✅  created"
}
az acr login --name $ACR_NAME

# ---------------------------------------------------------------------------
# Step 3 — Docker Build & Push
# ---------------------------------------------------------------------------
Write-Host "🔷 [3/7] Docker Build & Push (tag: $IMAGE_TAG)..."
docker build `
    --tag $FULL_IMAGE `
    --file (Join-Path $RepoRoot 'agent' 'Dockerfile') `
    (Join-Path $RepoRoot 'agent')
docker push $FULL_IMAGE
Write-Host "  ✅  pushed $FULL_IMAGE"

# ---------------------------------------------------------------------------
# Step 4 — Container Apps Environment
# ---------------------------------------------------------------------------
Write-Host "🔷 [4/7] Container Apps Environment..."
$null = az containerapp env show `
    --name $CONTAINER_APP_ENV `
    --resource-group $RESOURCE_GROUP 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅  exists — skipping"
} else {
    Write-Host "  🔨  not found — creating..."
    az containerapp env create `
        --name $CONTAINER_APP_ENV `
        --resource-group $RESOURCE_GROUP `
        --location $AZURE_LOCATION `
        --output none
    Write-Host "  ✅  created"
}

# ---------------------------------------------------------------------------
# Step 5 — Container App
# ---------------------------------------------------------------------------
Write-Host "🔷 [5/7] Container App..."

$ACR_USERNAME = az acr credential show --name $ACR_NAME --query username -o tsv
$ACR_PASSWORD = az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv

$null = az containerapp show `
    --name $CONTAINER_APP_NAME `
    --resource-group $RESOURCE_GROUP 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅  exists — updating image + secrets..."
    az containerapp update `
        --name $CONTAINER_APP_NAME `
        --resource-group $RESOURCE_GROUP `
        --image $FULL_IMAGE `
        --set-env-vars "AZURE_OPENAI_ENDPOINT=secretref:azure-openai-endpoint" "AZURE_OPENAI_API_KEY=secretref:azure-openai-api-key" "AZURE_OPENAI_CHAT_DEPLOYMENT_NAME=secretref:azure-openai-deployment" `
        --output none
    Write-Host "  ✅  updated"
} else {
    Write-Host "  🔨  not found — creating..."
    az containerapp create `
        --name $CONTAINER_APP_NAME `
        --resource-group $RESOURCE_GROUP `
        --environment $CONTAINER_APP_ENV `
        --image $FULL_IMAGE `
        --registry-server $ACR_LOGIN_SERVER `
        --registry-username $ACR_USERNAME `
        --registry-password $ACR_PASSWORD `
        --secrets "azure-openai-endpoint=$AZURE_OPENAI_ENDPOINT" "azure-openai-api-key=$AZURE_OPENAI_API_KEY" "azure-openai-deployment=$AZURE_OPENAI_CHAT_DEPLOYMENT_NAME" `
        --env-vars "AZURE_OPENAI_ENDPOINT=secretref:azure-openai-endpoint" "AZURE_OPENAI_API_KEY=secretref:azure-openai-api-key" "AZURE_OPENAI_CHAT_DEPLOYMENT_NAME=secretref:azure-openai-deployment" `
        --ingress external `
        --target-port 8000 `
        --min-replicas 0 `
        --max-replicas 3 `
        --output none
    Write-Host "  ✅  created"
}

$AGENT_FQDN = az containerapp show `
    --name $CONTAINER_APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --query "properties.configuration.ingress.fqdn" -o tsv
$AGENT_URL = "https://$AGENT_FQDN"
Write-Host "  ℹ️   Agent URL: $AGENT_URL"

# ---------------------------------------------------------------------------
# Step 6 — Build Frontend
# ---------------------------------------------------------------------------
Write-Host "🔷 [6/7] Build Frontend (AGENT_URL=$AGENT_URL)..."
Push-Location $RepoRoot
$env:AGENT_URL = $AGENT_URL
npm ci --prefer-offline
npm run build
Pop-Location
Write-Host "  ✅  frontend built"

# ---------------------------------------------------------------------------
# Step 7 — Static Web App
# ---------------------------------------------------------------------------
Write-Host "🔷 [7/7] Static Web App..."

if (-not (Get-Command swa -ErrorAction SilentlyContinue)) {
    Write-Host "  📦  Installing @azure/static-web-apps-cli..."
    npm install -g @azure/static-web-apps-cli --silent
}

$null = az staticwebapp show `
    --name $STATIC_WEB_APP_NAME `
    --resource-group $RESOURCE_GROUP 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅  exists — deploying..."
} else {
    Write-Host "  🔨  not found — creating..."
    az staticwebapp create `
        --name $STATIC_WEB_APP_NAME `
        --resource-group $RESOURCE_GROUP `
        --location $AZURE_LOCATION `
        --output none
    Write-Host "  ✅  created"
}

az staticwebapp appsettings set `
    --name $STATIC_WEB_APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --setting-names "AGENT_URL=$AGENT_URL" `
    --output none

$SWA_DEPLOYMENT_TOKEN = az staticwebapp secrets list `
    --name $STATIC_WEB_APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --query "properties.apiKey" -o tsv

swa deploy `
    --deployment-token $SWA_DEPLOYMENT_TOKEN `
    --app-location (Join-Path $RepoRoot '.next') `
    --env production

$SWA_URL = az staticwebapp show `
    --name $STATIC_WEB_APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --query "properties.defaultHostname" -o tsv

Write-Host "  ✅  deployed"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "==================================================================="
Write-Host " ✅  Deployment complete!"
Write-Host "==================================================================="
Write-Host " 🌐  Frontend  : https://$SWA_URL"
Write-Host " 🤖  Agent API : $AGENT_URL"
Write-Host ""
Write-Host " To tear down all resources:"
Write-Host "   az group delete --name $RESOURCE_GROUP --yes --no-wait"
Write-Host "==================================================================="
