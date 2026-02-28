from __future__ import annotations

import os

import uvicorn
from agent_framework._clients import ChatClientProtocol
from agent_framework.azure import AzureOpenAIChatClient
from agent_framework.openai import OpenAIChatClient
from agent_framework_ag_ui import add_agent_framework_fastapi_endpoint
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agent import create_agent

load_dotenv()

def _build_chat_client() -> ChatClientProtocol:
    try:
        if bool(os.getenv("AZURE_OPENAI_ENDPOINT")):
            deployment_name = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME", "gpt-4o-mini")
            endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
            api_key = os.getenv("AZURE_OPENAI_API_KEY")

            if api_key:
                # API key auth — no az login needed
                from azure.core.credentials import AzureKeyCredential
                return AzureOpenAIChatClient(
                    credential=AzureKeyCredential(api_key),
                    deployment_name=deployment_name,
                    endpoint=endpoint,
                )
            else:
                # Managed Identity / az login
                from azure.identity import DefaultAzureCredential
                return AzureOpenAIChatClient(
                    credential=DefaultAzureCredential(),
                    deployment_name=deployment_name,
                    endpoint=endpoint,
                )

        if bool(os.getenv("OPENAI_API_KEY")):
            # OpenAI setup - requires explicit model_id and api_key
            return OpenAIChatClient(
                model_id=os.getenv("OPENAI_CHAT_MODEL_ID", "gpt-4o-mini"),
                api_key=os.getenv("OPENAI_API_KEY"),
            )

        raise ValueError("Either AZURE_OPENAI_ENDPOINT or OPENAI_API_KEY environment variable is required")

    except Exception as exc:  # pragma: no cover
        raise RuntimeError(
            "Unable to initialize the chat client. Double-check your API credentials as documented in README.md."
        ) from exc


chat_client = _build_chat_client()
my_agent = create_agent(chat_client)

app = FastAPI(title="CopilotKit + Microsoft Agent Framework (Python)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

add_agent_framework_fastapi_endpoint(
    app=app,
    agent=my_agent,
    path="/",
)


@app.get("/healthz")
async def healthz() -> dict:
    """Health check endpoint for Azure Container Apps."""
    return {"status": "ok"}


if __name__ == "__main__":
    host = os.getenv("AGENT_HOST", "0.0.0.0")
    port = int(os.getenv("AGENT_PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
