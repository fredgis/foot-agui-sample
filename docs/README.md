# ⚽ Copa — FIFA World Cup 2026 AI Assistant

## Problem

The FIFA World Cup 2026 is the largest edition ever — 48 teams, 104 matches, 16 stadiums across 3 countries (USA, Canada, Mexico). Fans face information overload: scattered schedules, confusing group formats, and no single interactive source to explore it all.

Traditional sports apps are static, passive, and don't adapt to what the user is interested in. There's no conversational way to explore the tournament — ask questions, compare teams, check weather at venues, or visualize brackets dynamically.

## Solution

**Copa** is an AI-powered conversational assistant that turns the World Cup 2026 into a living, interactive experience. The entire UI transforms in real time as users chat — colors, flags, maps, schedules, and cards all react to the conversation.

Copa combines:
- **AG-UI Protocol** for real-time agent ↔ frontend communication
- **GitHub Copilot SDK** for zero-key AI (no API keys — uses `gh auth`)
- **MCP (Model Context Protocol)** for live weather data at stadiums
- **CopilotKit** for React integration (co-agent state, generative UI, chat suggestions)

Users can ask Copa about any team, compare head-to-head, explore stadiums on an interactive SVG map, check live weather, browse groups, simulate tournament brackets, and more — all through natural conversation.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| **Node.js** | 20+ (v24 LTS recommended) | [nodejs.org](https://nodejs.org) |
| **GitHub CLI** | latest | `winget install GitHub.cli` / `brew install gh` |
| **GitHub Copilot** | Active subscription | [github.com/features/copilot](https://github.com/features/copilot) |

No OpenAI/Azure API keys are required — the GitHub Copilot SDK uses your `gh auth` token.

---

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/fredgis/foot-agui-sample.git
cd foot-agui-sample
npm install
```

### 2. Authenticate with GitHub

```bash
gh auth login
```

### 3. Environment (optional)

```bash
cp .env.example .env.local
# Edit .env.local if you want to change the LLM model (default: gpt-4o-mini)
```

### 4. Run

```bash
npm run dev
```

Open **http://localhost:3000** and start chatting with Copa! ⚽

---

## Deployment

### Azure Static Web Apps (recommended)

Copa deploys as a single **Azure Static Web App** — no backend containers needed.

```powershell
# 1. Copy and edit the config
Copy-Item scripts\deploy-config.env.example scripts\deploy-config.env
# Edit with your Azure subscription details

# 2. Deploy (idempotent — safe to re-run)
pwsh scripts\deploy.ps1
```

### Teardown

```powershell
az group delete --name rg-worldcup2026 --yes --no-wait
```

---

## Architecture

Copa follows a 4-layer architecture: **Frontend** (CopilotKit + React) → **AG-UI Protocol** (SSE) → **Copilot SDK Agent** (tools) → **LLM + MCP** (external data).

### Architecture Diagram

![Architecture](https://www.plantuml.com/plantuml/svg/TLBTJjim6Bslr7Vub4feAoeqxLQWWcfPqWAY7TMIiMdhX8pzaNX9xCXsA72rgpt1hlOYNErcZyAJJ6whBkFdplxEyJb7v_CRROWoPPu1arItYA89DqXDgR1UqoaN1L4aXmj2qrZ9KZ1VPb91ensuhhjJfUY4C3dd8ePBakd_NZEy96LcHbAOToH7S4AC9SA7O-SPLiXl4TpEC-WgWhyNkC5UbRCAg0GgSDjLXCgya0A5UIiLGxLIwBQxlMxm9A_YC-mDWr6tolAKalCeuJGLg3Lq7c6hbwztlTveLA_LQuQR367_KWe3r887pahN0SrlyS1nUyxW_jTly6L1uFxxJ_0ggzZVjYy7LccT49ncynrUcwrl6jmURC9x9DI0kzTipaI49FU9Ol3d3ivGb3WXXJs_LOIcQ6PYGWnDGfeWApEqoA6IPN76SUu0qL1oQBYZZlUg_SZJbmNFf3dXnXgL6dtfnHRxSmUBsmBsgE5IpCJg6dA65qJ1DanbKHOB3vf2enEue_Qp7c5mif2sHjvXwyCntF_u2IiGmk04BXHdCSv4RzbR96Mc5-9a4QdH3ZgxxkuZ_KDkZigBgfAr68ydSCK9n0cGqYGpyHcL16zw32dUB6KrIw7H3JfxJuIU-DC-d1OeMXCqAArYJeijQIUvdMnHcMzhZJCnvbS8SoGcGRNGpMbX2sy7dU4ZtOyyvGKoJc0JBZCIKoQizZGZDwYWIAIHsfO_oaYyJ8dNfgfMSjXlCJaNhO4jlG_Q48Em0Ge5GrMlqVGVOLbS_y5VNVvaPz1iBlSmLT98AZDu4OR3bytcweFEH3Jy5DamqUdf-DptncDx2ICl6fu7mt7arMjBWxMVRRGF6hNcKi066Bl2UisErnpRpiD4NdV77UtOH1D_kiwpJh9KQ7r9E6CelYeU9wOriCqi-cXL1j27eoYQsgRUe61bdjLhVm40)

> 📐 PlantUML source: [`docs-architecture.puml`](docs-architecture.puml)

### Key Protocols & SDKs

| Component | Role | How it's used |
|---|---|---|
| **[AG-UI Protocol](https://docs.ag-ui.com)** | Open standard for agent ↔ frontend communication | SSE stream: text, tool calls, state deltas between CopilotKit and the agent |
| **[GitHub Copilot SDK](https://github.com/github/copilot-sdk)** | AI runtime — zero API keys | LLM calls via `gh auth`, tool orchestration, MCP server connections |
| **[CopilotKit](https://copilotkit.ai)** | React integration layer | `useCoAgent` (state), `useCopilotAction` (tools/generative UI), sidebar/popup |
| **[MCP](https://modelcontextprotocol.io/)** (Model Context Protocol) | External data sources | Open-Meteo weather server — real-time weather at WC2026 stadiums |

### Layer Details

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 16 + React 19 + TailwindCSS | Rich UI components that react to agent state |
| **Protocol** | AG-UI (SSE events) | Streaming text, tool calls, state sync — one event stream |
| **Agent** | GitHub Copilot SDK + CopilotSDKAgent bridge | Zero API keys, 6 custom tools, streaming, MCP support |
| **External** | MCP open-meteo, Open-Meteo API, Wikipedia API, flagcdn | Weather, player photos, flag images |

### Additional Diagrams

- **Macro architecture**: [`architecture.puml`](architecture.puml)
- **Sequence diagram**: [`sequence.puml`](sequence.puml)

---

## Responsible AI (RAI) Notes

### Scope & Limitations

- **Copa is an entertainment assistant** — it provides information about the FIFA World Cup 2026 for fans. It is NOT a betting or gambling tool.
- **Bracket simulation** uses FIFA rankings and historical data with weighted randomness. Results are explicitly labeled as simulations, not predictions. A disclaimer is shown: *"Simulation based on FIFA World Rankings & historical World Cup titles. Results are randomized — upsets can happen!"*
- **Weather data** comes from Open-Meteo (open-source weather API via MCP) and reflects real-time conditions. It is not a professional weather forecast service.

### Data Sources & Accuracy

- Team rosters, stadiums, and match schedules are based on official FIFA publications as of early 2026. Data may become outdated as rosters change.
- Player photos are fetched from Wikipedia and may not always be available or accurate.
- 13 teams in the dataset are pending playoff qualification — Copa clearly indicates this with a "Qualification Pending" message.

### Content Policy

- Copa is restricted to football/World Cup topics only. It refuses unrelated queries with a friendly redirect.
- Copa does not generate harmful, discriminatory, or politically sensitive content.
- No user data is collected, stored, or shared. All conversations are ephemeral.
- The GitHub Copilot SDK processes prompts through GitHub's infrastructure, which has its own [privacy and responsible AI policies](https://docs.github.com/en/copilot/responsible-use-of-github-copilot-features).

### Azure AI Content Safety

- For production deployments, we recommend adding [Azure AI Content Safety](https://azure.microsoft.com/en-us/products/ai-services/ai-content-safety) as a middleware layer to filter harmful inputs/outputs in real time.
- The AGENTS.md custom instructions enforce topic restrictions (football only) and prohibit harmful content generation at the prompt level.
- The GitHub Copilot SDK inherits GitHub's built-in content filtering and abuse detection systems.

### Bias Considerations

- FIFA rankings are used as a proxy for team strength. Rankings may not fully reflect current form.
- The simulation model favors higher-ranked teams but includes randomness to allow for upsets, reflecting real tournament unpredictability.
- Team descriptions and historical data are presented factually without editorial bias.

---

## Security & Authentication

- **Authentication**: The GitHub Copilot SDK authenticates via `gh auth` (GitHub CLI). No API keys are stored in the codebase — credentials are managed through GitHub's OAuth flow.
- **Secrets management**: Deployment secrets (Azure tokens) are stored in GitHub Actions secrets, never in code.
- **Input sanitization**: Copa's AGENTS.md restricts the agent to football topics only, acting as a prompt-level guardrail against misuse.
- **No PII collection**: No user data, conversations, or personal information is stored. All sessions are ephemeral.
- **HTTPS only**: Azure Static Web Apps enforces HTTPS by default.

---

## Observability

- **Structured logging**: The API route (`/api/copilotkit`) emits JSON-structured logs with timestamps, duration, and error details for every request.
- **Health endpoint**: `GET /api/copilotkit` returns service health status and uptime — compatible with Azure monitoring and load balancer probes.
- **Azure integration**: For production, connect to [Azure Application Insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview) by adding `APPLICATIONINSIGHTS_CONNECTION_STRING` to the environment. The structured log format is compatible with Azure Monitor ingestion.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js + React + TailwindCSS | 16 + 19 + 4 |
| Chat UI | CopilotKit (Sidebar + Popup) | 1.50 |
| Protocol | AG-UI (SSE events) | 0.0.46 |
| AI Agent | GitHub Copilot SDK | 0.1.29 |
| LLM | GitHub Copilot (via `gh auth`) | — |
| Weather | Open-Meteo MCP Server | — |
| Hosting | Azure Static Web Apps | — |
| CI/CD | GitHub Actions (build + typecheck + deploy) | — |
| Monitoring | Structured JSON logs + health endpoint | — |
| Content Safety | GitHub Copilot built-in + AGENTS.md guardrails | — |

---

## GitHub Copilot SDK — Product Feedback

Copa was built as a real-world test of the GitHub Copilot SDK. Here is our developer feedback:

### 👍 What we loved

- **Zero API key setup** — `gh auth login` and the SDK handles everything. No Azure OpenAI deployment, no key rotation, no `.env` secrets to manage.
- **MCP server support** — Adding live weather data took 5 minutes: one entry in `mcp.json` and the agent could call Open-Meteo tools automatically.
- **Tool definition is simple** — Define a function, describe it, and the SDK handles orchestration, planning, and execution.
- **Replaced an entire backend** — What would have been FastAPI + Microsoft Agent Framework + Azure OpenAI + Docker is now a single `npm install @github/copilot-sdk` running in-process inside a Next.js API route.

### 🔧 Areas for improvement

- **Next.js / Turbopack compatibility** — `import.meta.resolve` used internally by the SDK fails in Turbopack. We had to pass `cliPath` explicitly as a workaround.
- **AG-UI bridge documentation** — Building a custom `CopilotSDKAgent` bridge between AG-UI events and the SDK required reverse-engineering the event format. More examples or a built-in adapter would help adoption.
- **STATE_DELTA silent failures** — `replace` operations fail silently if the agent has no `initialState` set. An error or warning would save debugging time.

---

**⚽ Built for the 2026 FIFA World Cup 🇺🇸🇲🇽🇨🇦**
