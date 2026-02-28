# =============================================================================
# deploy.ps1 — One-Click Idempotent Deployment for Copa (WC2026) on Azure
#              Windows native (PowerShell 7+ / pwsh)
#
# Architecture: Next.js frontend only (GitHub Copilot SDK runs in-process)
# Target: Azure Static Web Apps
#
# Usage:
#   Copy-Item scripts\deploy-config.env.example scripts\deploy-config.env
#   # Fill in deploy-config.env with your values
#   pwsh scripts\deploy.ps1
#
# Re-entrant: safe to run multiple times. Each step checks whether the
# resource already exists before creating it.
#
# To tear down everything:
#   az group delete --name rg-worldcup2026 --yes --no-wait
# =============================================================================
#Requires -Version 7
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot   = Split-Path -Parent $ScriptDir
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

$AZURE_SUBSCRIPTION_ID = Require-Env 'AZURE_SUBSCRIPTION_ID'
$AZURE_LOCATION        = Require-Env 'AZURE_LOCATION'
$RESOURCE_GROUP        = Require-Env 'RESOURCE_GROUP'
$STATIC_WEB_APP_NAME   = Require-Env 'STATIC_WEB_APP_NAME'

# ---------------------------------------------------------------------------
# 0b. Check prerequisites
# ---------------------------------------------------------------------------
function Check-Prereqs {
    $missing = $false

    foreach ($cmd in @('az', 'node', 'npm')) {
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

Write-Host ""
Write-Host "==================================================================="
Write-Host " Copa (WC2026) — One-Click Azure Deployment"
Write-Host "==================================================================="
Write-Host " Resource Group : $RESOURCE_GROUP"
Write-Host " Location       : $AZURE_LOCATION"
Write-Host " Static Web App : $STATIC_WEB_APP_NAME"
Write-Host "==================================================================="
Write-Host ""

az account set --subscription $AZURE_SUBSCRIPTION_ID

# ---------------------------------------------------------------------------
# Step 1 — Resource Group
# ---------------------------------------------------------------------------
Write-Host "🔷 [1/4] Resource Group..."
$null = az group show --name $RESOURCE_GROUP 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅  exists — skipping"
} else {
    Write-Host "  🔨  not found — creating..."
    az group create --name $RESOURCE_GROUP --location $AZURE_LOCATION --output none
    Write-Host "  ✅  created"
}

# ---------------------------------------------------------------------------
# Step 2 — Build Frontend
# ---------------------------------------------------------------------------
Write-Host "🔷 [2/4] Build Frontend..."
Push-Location $RepoRoot
npm ci --prefer-offline
npm run build
Pop-Location
Write-Host "  ✅  frontend built"

# ---------------------------------------------------------------------------
# Step 3 — Static Web App
# ---------------------------------------------------------------------------
Write-Host "🔷 [3/4] Static Web App..."

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

# ---------------------------------------------------------------------------
# Step 4 — Deploy to Static Web App
# ---------------------------------------------------------------------------
Write-Host "🔷 [4/4] Deploy..."

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
Write-Host " 🌐  Frontend : https://$SWA_URL"
Write-Host ""
Write-Host " To tear down all resources:"
Write-Host "   az group delete --name $RESOURCE_GROUP --yes --no-wait"
Write-Host "==================================================================="
