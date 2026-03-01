import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { NextRequest } from "next/server";

const serviceAdapter = new ExperimentalEmptyAdapter();

async function buildRuntime() {
  const { CopilotSDKAgent } = await import("@/lib/copilot-sdk-agent");
  const agent = new CopilotSDKAgent({
    model: process.env.COPILOT_SDK_MODEL ?? "gpt-4o-mini",
  });
  console.log("[route] Using GitHub Copilot SDK backend");
  return new CopilotRuntime({
    agents: {
      "my_agent": agent,
      "default": agent,
    },
  });
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