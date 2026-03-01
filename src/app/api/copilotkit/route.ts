import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { NextRequest, NextResponse } from "next/server";

const serviceAdapter = new ExperimentalEmptyAdapter();

function log(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  const entry = { timestamp: new Date().toISOString(), level, service: "copa-agent", message, ...meta };
  console[level](JSON.stringify(entry));
}

async function buildRuntime() {
  const { CopilotSDKAgent } = await import("@/lib/copilot-sdk-agent");
  const agent = new CopilotSDKAgent({
    model: process.env.COPILOT_SDK_MODEL ?? "gpt-4o-mini",
  });
  log("info", "Runtime initialized", { backend: "copilot-sdk" });
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
  const start = Date.now();
  try {
    const runtime = await runtimePromise;
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter,
      endpoint: "/api/copilotkit",
    });

    const response = await handleRequest(req);
    log("info", "Request handled", { durationMs: Date.now() - start, status: 200 });
    return response;
  } catch (err) {
    log("error", "Request failed", { durationMs: Date.now() - start, error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

export const GET = async () => {
  try {
    await runtimePromise;
    return NextResponse.json({ status: "healthy", service: "copa-agent", uptime: process.uptime() });
  } catch {
    return NextResponse.json({ status: "unhealthy" }, { status: 503 });
  }
};