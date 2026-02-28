import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { NextRequest } from "next/server";

// Service adapter — empty since we only use one agent
const serviceAdapter = new ExperimentalEmptyAdapter();

// Backend selection: USE_COPILOT_SDK=true → GitHub Copilot SDK, otherwise → FastAPI/AG-UI
const useCopilotSDK = process.env.USE_COPILOT_SDK === "true";

async function buildRuntime() {
  if (useCopilotSDK) {
    // GitHub Copilot SDK backend — uses Copilot CLI locally
    const { CopilotSDKAgent } = await import("@/lib/copilot-sdk-agent");
    const providerConfig = process.env.AZURE_OPENAI_ENDPOINT
      ? {
          type: "azure" as const,
          baseUrl: process.env.AZURE_OPENAI_ENDPOINT,
          apiKey: process.env.AZURE_OPENAI_API_KEY,
          azure: { apiVersion: "2024-10-21" },
        }
      : process.env.OPENAI_API_KEY
        ? {
            type: "openai" as const,
            baseUrl: "https://api.openai.com/v1",
            apiKey: process.env.OPENAI_API_KEY,
          }
        : undefined;

    const agent = new CopilotSDKAgent({
      provider: providerConfig,
      model: process.env.COPILOT_SDK_MODEL ?? process.env.AZURE_OPENAI_CHAT_DEPLOYMENT_NAME ?? "gpt-4o-mini",
    });
    console.log("[route] Using Copilot SDK backend");
    return new CopilotRuntime({
      agents: {
        "my_agent": agent,
        "default": agent,
      },
    });
  } else {
    // Default: Microsoft Agent Framework via AG-UI HTTP endpoint
    const agentUrl = process.env.AGENT_URL ?? "http://localhost:8000/";
    return new CopilotRuntime({
      agents: {
        "my_agent": new HttpAgent({ url: agentUrl }),
        "default": new HttpAgent({ url: agentUrl }),
      },
    });
  }
}

// Eagerly build runtime
const runtimePromise = buildRuntime();

export const POST = async (req: NextRequest) => {
  const runtime = await runtimePromise;
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};