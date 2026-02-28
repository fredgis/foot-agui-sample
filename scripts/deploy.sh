#!/usr/bin/env bash
# =============================================================================
# deploy.sh — One-Click Idempotent Deployment for foot-agui-sample on Azure
#
# Usage:
#   cp scripts/deploy-config.env.example scripts/deploy-config.env
#   # Fill in deploy-config.env with your values
#   bash scripts/deploy.sh
#
# Re-entrant: safe to run multiple times.  Each step checks whether the
# resource already exists before creating it.
#
# To tear down everything:
#   az group delete --name rg-worldcup2026 --yes --no-wait
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/deploy-config.env"

# ---------------------------------------------------------------------------
# 0. Load configuration
# ---------------------------------------------------------------------------
if [[ ! -f "${CONFIG_FILE}" ]]; then
  echo "❌  Configuration file not found: ${CONFIG_FILE}"
  echo "    Copy the template and fill in your values:"
  echo "    cp scripts/deploy-config.env.example scripts/deploy-config.env"
  exit 1
fi

# shellcheck disable=SC1090
source "${CONFIG_FILE}"

: "${AZURE_SUBSCRIPTION_ID:?AZURE_SUBSCRIPTION_ID is required in deploy-config.env}"
: "${AZURE_LOCATION:?AZURE_LOCATION is required in deploy-config.env}"
: "${RESOURCE_GROUP:?RESOURCE_GROUP is required in deploy-config.env}"
: "${ACR_NAME:?ACR_NAME is required in deploy-config.env}"
: "${CONTAINER_APP_ENV:?CONTAINER_APP_ENV is required in deploy-config.env}"
: "${CONTAINER_APP_NAME:?CONTAINER_APP_NAME is required in deploy-config.env}"
: "${STATIC_WEB_APP_NAME:?STATIC_WEB_APP_NAME is required in deploy-config.env}"
: "${IMAGE_NAME:?IMAGE_NAME is required in deploy-config.env}"
: "${AZURE_OPENAI_ENDPOINT:?AZURE_OPENAI_ENDPOINT is required in deploy-config.env}"
: "${AZURE_OPENAI_API_KEY:?AZURE_OPENAI_API_KEY is required in deploy-config.env}"
: "${AZURE_OPENAI_CHAT_DEPLOYMENT_NAME:?AZURE_OPENAI_CHAT_DEPLOYMENT_NAME is required in deploy-config.env}"

# ---------------------------------------------------------------------------
# 0. Check prerequisites
# ---------------------------------------------------------------------------
check_prereqs() {
  local missing=0
  for cmd in az docker node npm git; do
    if ! command -v "${cmd}" &>/dev/null; then
      echo "❌  Missing prerequisite: ${cmd}"
      missing=1
    fi
  done

  local az_ver
  az_ver=$(az version --query '"azure-cli"' -o tsv 2>/dev/null || echo "0")
  local az_major az_minor
  az_major=$(echo "${az_ver}" | cut -d. -f1)
  az_minor=$(echo "${az_ver}" | cut -d. -f2)
  if [[ "${az_major}" -lt 2 ]] || { [[ "${az_major}" -eq 2 ]] && [[ "${az_minor}" -lt 50 ]]; }; then
    echo "❌  Azure CLI >= 2.50 required (found ${az_ver})"
    missing=1
  fi

  local node_ver
  node_ver=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
  if [[ -n "${node_ver}" ]] && [[ "${node_ver}" -lt 20 ]]; then
    echo "❌  Node.js >= 20 required (found v${node_ver})"
    missing=1
  fi

  if [[ "${missing}" -ne 0 ]]; then
    echo ""
    echo "Please install the missing prerequisites and re-run the script."
    exit 1
  fi
  echo "✅  Prerequisites OK"
}

check_prereqs

# Derive image tag from git SHA (fallback to "latest")
IMAGE_TAG=$(git -C "${REPO_ROOT}" rev-parse --short HEAD 2>/dev/null || echo "latest")
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
FULL_IMAGE="${ACR_LOGIN_SERVER}/${IMAGE_NAME}:${IMAGE_TAG}"

echo ""
echo "==================================================================="
echo " foot-agui-sample — One-Click Azure Deployment"
echo "==================================================================="
echo " Resource Group : ${RESOURCE_GROUP}"
echo " Location       : ${AZURE_LOCATION}"
echo " ACR            : ${ACR_LOGIN_SERVER}"
echo " Image          : ${FULL_IMAGE}"
echo " Container App  : ${CONTAINER_APP_NAME}"
echo " Static Web App : ${STATIC_WEB_APP_NAME}"
echo "==================================================================="
echo ""

az account set --subscription "${AZURE_SUBSCRIPTION_ID}"

# ---------------------------------------------------------------------------
# Step 1 — Resource Group
# ---------------------------------------------------------------------------
echo "🔷 [1/7] Resource Group..."
if az group show --name "${RESOURCE_GROUP}" &>/dev/null; then
  echo "  ✅  exists — skipping"
else
  echo "  🔨  not found — creating..."
  az group create --name "${RESOURCE_GROUP}" --location "${AZURE_LOCATION}" --output none
  echo "  ✅  created"
fi

# ---------------------------------------------------------------------------
# Step 2 — Container Registry
# ---------------------------------------------------------------------------
echo "🔷 [2/7] Container Registry..."
if az acr show --name "${ACR_NAME}" --resource-group "${RESOURCE_GROUP}" &>/dev/null; then
  echo "  ✅  exists — logging in..."
else
  echo "  🔨  not found — creating..."
  az acr create \
    --name "${ACR_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --sku Basic \
    --admin-enabled true \
    --output none
  echo "  ✅  created"
fi
az acr login --name "${ACR_NAME}"

# ---------------------------------------------------------------------------
# Step 3 — Docker Build & Push
# ---------------------------------------------------------------------------
echo "🔷 [3/7] Docker Build & Push (tag: ${IMAGE_TAG})..."
docker build \
  --tag "${FULL_IMAGE}" \
  --file "${REPO_ROOT}/agent/Dockerfile" \
  "${REPO_ROOT}/agent"
docker push "${FULL_IMAGE}"
echo "  ✅  pushed ${FULL_IMAGE}"

# ---------------------------------------------------------------------------
# Step 4 — Container Apps Environment
# ---------------------------------------------------------------------------
echo "🔷 [4/7] Container Apps Environment..."
if az containerapp env show \
    --name "${CONTAINER_APP_ENV}" \
    --resource-group "${RESOURCE_GROUP}" &>/dev/null; then
  echo "  ✅  exists — skipping"
else
  echo "  🔨  not found — creating..."
  az containerapp env create \
    --name "${CONTAINER_APP_ENV}" \
    --resource-group "${RESOURCE_GROUP}" \
    --location "${AZURE_LOCATION}" \
    --output none
  echo "  ✅  created"
fi

# ---------------------------------------------------------------------------
# Step 5 — Container App
# ---------------------------------------------------------------------------
echo "🔷 [5/7] Container App..."

# Retrieve ACR credentials
ACR_USERNAME=$(az acr credential show --name "${ACR_NAME}" --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name "${ACR_NAME}" --query "passwords[0].value" -o tsv)

SECRETS_ARGS=(
  "azure-openai-endpoint=${AZURE_OPENAI_ENDPOINT}"
  "azure-openai-api-key=${AZURE_OPENAI_API_KEY}"
  "azure-openai-deployment=${AZURE_OPENAI_CHAT_DEPLOYMENT_NAME}"
)
ENV_VARS_ARGS=(
  "AZURE_OPENAI_ENDPOINT=secretref:azure-openai-endpoint"
  "AZURE_OPENAI_API_KEY=secretref:azure-openai-api-key"
  "AZURE_OPENAI_CHAT_DEPLOYMENT_NAME=secretref:azure-openai-deployment"
)

if az containerapp show \
    --name "${CONTAINER_APP_NAME}" \
    --resource-group "${RESOURCE_GROUP}" &>/dev/null; then
  echo "  ✅  exists — updating image + secrets..."
  az containerapp update \
    --name "${CONTAINER_APP_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --image "${FULL_IMAGE}" \
    --set-env-vars "${ENV_VARS_ARGS[@]}" \
    --output none
  echo "  ✅  updated"
else
  echo "  🔨  not found — creating..."
  az containerapp create \
    --name "${CONTAINER_APP_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --environment "${CONTAINER_APP_ENV}" \
    --image "${FULL_IMAGE}" \
    --registry-server "${ACR_LOGIN_SERVER}" \
    --registry-username "${ACR_USERNAME}" \
    --registry-password "${ACR_PASSWORD}" \
    --secrets "${SECRETS_ARGS[@]}" \
    --env-vars "${ENV_VARS_ARGS[@]}" \
    --ingress external \
    --target-port 8000 \
    --min-replicas 0 \
    --max-replicas 3 \
    --output none
  echo "  ✅  created"
fi

# Retrieve the Container App FQDN
AGENT_FQDN=$(az containerapp show \
  --name "${CONTAINER_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query "properties.configuration.ingress.fqdn" -o tsv)
AGENT_URL="https://${AGENT_FQDN}"
echo "  ℹ️   Agent URL: ${AGENT_URL}"

# ---------------------------------------------------------------------------
# Step 6 — Build Frontend
# ---------------------------------------------------------------------------
echo "🔷 [6/7] Build Frontend (AGENT_URL=${AGENT_URL})..."
cd "${REPO_ROOT}"
export AGENT_URL
npm ci --prefer-offline
npm run build
echo "  ✅  frontend built"

# ---------------------------------------------------------------------------
# Step 7 — Static Web App
# ---------------------------------------------------------------------------
echo "🔷 [7/7] Static Web App..."

# Ensure SWA CLI is available
if ! command -v swa &>/dev/null; then
  echo "  📦  Installing @azure/static-web-apps-cli..."
  npm install -g @azure/static-web-apps-cli --silent
fi

if az staticwebapp show \
    --name "${STATIC_WEB_APP_NAME}" \
    --resource-group "${RESOURCE_GROUP}" &>/dev/null; then
  echo "  ✅  exists — deploying..."
else
  echo "  🔨  not found — creating..."
  az staticwebapp create \
    --name "${STATIC_WEB_APP_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --location "${AZURE_LOCATION}" \
    --output none
  echo "  ✅  created"
fi

# Configure AGENT_URL as an app setting
az staticwebapp appsettings set \
  --name "${STATIC_WEB_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --setting-names "AGENT_URL=${AGENT_URL}" \
  --output none

# Deploy built assets via SWA CLI
SWA_DEPLOYMENT_TOKEN=$(az staticwebapp secrets list \
  --name "${STATIC_WEB_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query "properties.apiKey" -o tsv)

swa deploy \
  --deployment-token "${SWA_DEPLOYMENT_TOKEN}" \
  --app-location "${REPO_ROOT}/.next" \
  --env production

SWA_URL=$(az staticwebapp show \
  --name "${STATIC_WEB_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query "properties.defaultHostname" -o tsv)

echo "  ✅  deployed"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "==================================================================="
echo " ✅  Deployment complete!"
echo "==================================================================="
echo " 🌐  Frontend  : https://${SWA_URL}"
echo " 🤖  Agent API : ${AGENT_URL}"
echo ""
echo " To tear down all resources:"
echo "   az group delete --name ${RESOURCE_GROUP} --yes --no-wait"
echo "==================================================================="
