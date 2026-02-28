# ⚽🏆 Copa — FIFA World Cup 2026 AI Assistant

> An immersive, AI-powered experience to explore the **2026 FIFA World Cup** — 48 teams, 104 matches, 16 stadiums across 3 host nations 🇺🇸🇲🇽🇨🇦
>
> Built with the **[AG-UI Protocol](https://docs.ag-ui.com)**, the **[GitHub Copilot SDK](https://github.com/github/copilot-sdk)**, and **[MCP](https://modelcontextprotocol.io/)** weather tools.

![Copa Welcome Screen](screenshot.png)

---

## 🎯 What Can Copa Do?

Copa is a **conversational AI sports commentator** that turns the FIFA World Cup 2026 into a living, interactive experience. The **entire page transforms in real time** as you chat — colors, data, maps, and cards all react to your conversation.

### 🗣️ Talk to Copa

| Try saying… | What happens on screen |
|---|---|
| *"Show me France"* | 🇫🇷 Full-page switch: blue theme, flag, roster, match schedule, stadiums on the SVG map |
| *"Now show Germany"* | 🇩🇪 Instant switch: black-red-gold theme, new players, new schedule |
| *"Compare Brazil vs Argentina"* | ⚔️ Rich side-by-side comparison card rendered **inside the chat** |
| *"Tell me about MetLife Stadium"* | 🏟️ Stadium card with capacity, location, hosted matches — in chat |
| *"Show Group C"* | 🌍 Interactive group view with all 4 teams, click any to navigate |
| *"Show the tournament bracket"* | 🏆 Full knockout bracket R32 → R16 → QF → SF → Final |
| *"What's the weather in Houston?"* | 🌤️ **Live weather data** via MCP (open-meteo) — real-time, not cached |
| *"City guide for Miami"* | 🏙️ Fan tips: food, transport, must-see spots near the stadium |

### 🖱️ Click & Explore

| Action | Effect |
|---|---|
| Click a **team flag** on the welcome screen | Page transforms with team's national colors and data |
| Click a **stadium dot** on the SVG map | Stadium details panel appears |
| Click a **match row** | Stadium pin highlights on the map |
| Click an **opponent flag** in the schedule | Triggers a compare prompt in Copa's chat |
| Navigate **Groups** / **Bracket** tabs | Interactive tournament views |

---

## 🏗️ Architecture Overview

Copa demonstrates a modern **AI-native frontend** pattern where a chat agent drives the entire UI. Here's the macro view:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          👤  U S E R   B R O W S E R                       │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     🖥️  Next.js 16 Application                      │   │
│  │                                                                      │   │
│  │   ┌─────────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐  │   │
│  │   │  TeamCard    │  │ MatchSchedule│  │  VenueMap  │  │  GroupView│  │   │
│  │   │  (roster,    │  │ (104 matches │  │  (SVG map, │  │  (12 grps│  │   │
│  │   │   colors)    │  │  by phase)   │  │  16 stads) │  │   A→L)   │  │   │
│  │   └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  └────┬─────┘  │   │
│  │          │                 │                 │              │         │   │
│  │   ┌──────┴─────────────────┴─────────────────┴──────────────┴─────┐  │   │
│  │   │                  CopilotKit  React Hooks                      │  │   │
│  │   │  useCoAgent · useCopilotAction · useCopilotReadable           │  │   │
│  │   │  useCopilotChatSuggestions · CopilotSidebar / Popup           │  │   │
│  │   └───────────────────────────┬───────────────────────────────────┘  │   │
│  └───────────────────────────────┼──────────────────────────────────────┘   │
│                                  │                                          │
│                          AG-UI Protocol (SSE)                               │
│                     ┌────────────┼────────────┐                             │
│                     │ TEXT_MESSAGE_*           │                             │
│                     │ TOOL_CALL_*              │                             │
│                     │ STATE_DELTA / SNAPSHOT   │                             │
│                     │ RUN_STARTED / FINISHED   │                             │
│                     └────────────┼─────────────┘                            │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │  🤖 CopilotSDKAgent         │
                    │  (copilot-sdk-agent.ts)      │
                    │                              │
                    │  AbstractAgent → AG-UI       │
                    │  6 custom WC2026 tools       │
                    │  Copa system prompt 🎙️       │
                    ├──────────────┬───────────────┤
                    │              │               │
            ┌───────┴──────┐ ┌────┴────────────┐  │
            │ 🔧 GitHub    │ │ 🌐 MCP Servers  │  │
            │ Copilot SDK  │ │                  │  │
            │              │ │ open-meteo.com   │  │
            │ @github/     │ │ (live weather)   │  │
            │ copilot-sdk  │ │                  │  │
            │              │ │ Extensible:      │  │
            │ CLI subprocess│ │ add any MCP     │  │
            │ via gh auth  │ │ server here      │  │
            └───────┬──────┘ └─────────────────┘  │
                    │                              │
                    └──────────────────────────────┘
                                   │
                            ┌──────┴──────┐
                            │  🧠 LLM     │
                            │  GitHub     │
                            │  Copilot    │
                            │ (via gh     │
                            │   auth)     │
                            └─────────────┘
```

### The 4 layers in plain English

| Layer | What | Why |
|---|---|---|
| **Next.js App** | React 19 frontend with CopilotKit hooks | Rich UI components that react to agent state |
| **AG-UI Protocol** | Open standard for agent ↔ frontend communication (SSE) | Streaming text, tool calls, state sync — all over one event stream |
| **GitHub Copilot SDK** | Node.js agent runtime with custom tools | Zero API keys — uses `gh auth`, custom tools, streaming |
| **MCP Servers** | Model Context Protocol for external data sources | Plug-and-play: live weather today, any data source tomorrow |

---

## 🔌 AG-UI Protocol — How It Works

The [AG-UI Protocol](https://docs.ag-ui.com) is an open standard for agent ↔ frontend communication. Copa uses it to stream text, coordinate tool calls, and synchronize state — all over Server-Sent Events (SSE).

| AG-UI Event | Copa Usage |
|---|---|
| `TEXT_MESSAGE_START/CONTENT/END` | Copa's commentary streams word-by-word |
| `TOOL_CALL_START/ARGS/END` | Agent invokes tools → frontend tracks execution |
| `STATE_DELTA` | Agent pushes state patches → `useCoAgent` updates React (team, bracket, group) |
| `RUN_STARTED / RUN_FINISHED` | Lifecycle: loading indicators, error handling |
| `RUN_ERROR` | Graceful error display in chat |

The `CopilotSDKAgent` class (in `copilot-sdk-agent.ts`) bridges Copilot SDK events to AG-UI:

```
Copilot SDK Event              →  AG-UI Event
─────────────────────────────────────────────────
assistant.message_delta        →  TEXT_MESSAGE_CONTENT
tool.execution_start           →  TOOL_CALL_START + TOOL_CALL_ARGS
tool.execution_complete        →  TOOL_CALL_END + STATE_DELTA (for UI tools)
session.idle                   →  TEXT_MESSAGE_END + RUN_FINISHED
session.error                  →  RUN_ERROR
```

### Data Flow — "Show me France"

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant F as 🖥️ CopilotKit<br/>(React hooks)
    participant A as 🤖 CopilotSDKAgent<br/>(AG-UI bridge)
    participant C as 🔧 Copilot SDK<br/>(CLI subprocess)
    participant M as 🌐 MCP Server<br/>(optional)

    U->>F: "Show me France"
    F->>A: AG-UI RunAgent (SSE)
    A-->>F: RUN_STARTED
    A->>C: session.sendAndWait()
    C-->>A: tool.execution_start(update_team_info, {team_code: "FRA"})
    A-->>F: TOOL_CALL_START → TOOL_CALL_ARGS → TOOL_CALL_END
    A-->>F: STATE_DELTA [{op:"replace", path:"/teamInfo", value:{...France}}]
    Note over F: useCoAgent receives state patch<br/>→ TeamCard, theme, schedule all update
    C-->>A: assistant.message_delta (streaming)
    A-->>F: TEXT_MESSAGE_CONTENT (word by word)
    C-->>A: session.idle
    A-->>F: TEXT_MESSAGE_END → RUN_FINISHED
    Note over F: 🎨 Page is now fully French 🇫🇷<br/>Blue theme, roster, group matches, map
```

---

## 🧠 GitHub Copilot SDK — Zero-Key AI

The [GitHub Copilot SDK](https://github.com/github/copilot-sdk) (`@github/copilot-sdk`) runs the LLM — no OpenAI/Azure API keys required.

| Benefit | Detail |
|---|---|
| **Zero API keys** | Uses your `gh auth` token — if you have Copilot, you're ready |
| **Zero Python** | Everything runs in the Next.js Node.js process |
| **Custom tools** | Define tools with JSON Schema; the model calls them automatically |
| **Streaming** | Real-time token-by-token streaming translated to AG-UI events |
| **MCP support** | Native `mcpServers` in session config — plug any MCP server |

### Copa's 6 Custom Tools

All defined in `src/lib/copilot-sdk-agent.ts`:

| Tool | Type | What it does |
|---|---|---|
| `update_team_info` | Server → STATE_DELTA | Loads a team → pushes state patch → page transforms |
| `get_stadium_info` | Server + Generative UI | Returns stadium details → renders rich card in chat |
| `compare_teams` | Server + Generative UI | Head-to-head comparison → renders comparison grid in chat |
| `get_group_standings` | Server → STATE_DELTA | Returns group data → switches to GroupView |
| `show_tournament_bracket` | Server → STATE_DELTA | Activates bracket view → switches to TournamentBracket |
| `get_city_guide` | Server | Fan travel guide for a host city |

### MCP Server — Live Weather

Copa connects to the [open-meteo MCP server](https://mcp.open-meteo.com/) for **real-time weather data** at any World Cup venue. No API key, no configuration — it just works.

```typescript
// In copilot-sdk-agent.ts — session config
mcpServers: {
  weather: {
    type: "sse",
    url: "https://mcp.open-meteo.com/sse",
    tools: ["*"],  // All weather tools available
  },
},
```

> 💡 **Extensible**: Add any MCP-compatible server (news, sports stats, transit) by adding an entry to `mcpServers`.

---

## 🛠️ CopilotKit — Features Used

[CopilotKit](https://copilotkit.ai) provides the React integration layer between the AG-UI event stream and the UI components.

| Feature | Hook / Component | How Copa Uses It |
|---|---|---|
| **Co-Agent State** | `useCoAgent<AgentState>` | Bidirectional state: `teamInfo`, `matches`, `tournamentView`, `selectedStadium` |
| **Generative UI** | `useCopilotAction` with `render` | Rich stadium cards and comparison grids rendered inside the chat |
| **Copilot Readable** | `useCopilotReadable` | Provides current team context so the agent knows what the user sees |
| **Chat Suggestions** | `useCopilotChatSuggestions` | Dynamic follow-up prompts based on current state |
| **Chat Management** | `useCopilotChat` | Clicking an opponent flag auto-sends a compare prompt |
| **Sidebar / Popup** | `CopilotSidebar` / `CopilotPopup` | Desktop: persistent sidebar · Mobile: floating chat bubble |
| **CSS Theming** | `CopilotKitCSSProperties` | `--copilot-kit-primary-color` adapts to each team's national colors |

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🗣️ **Copa Agent** | Passionate WC2026 commentator with 6 custom tools + MCP weather |
| 🏳️ **48 national teams** | Full profiles: real flag images, key players, honors, FIFA ranking, national colors |
| 📅 **104 matches** | Complete schedule: group stage (72) → R32 (16) → R16 (8) → QF → SF → Final |
| 🗺️ **Interactive SVG map** | 16 stadiums across USA / Canada / Mexico with clickable pins |
| 🌍 **12 groups** | Responsive group view (A→L) with inter-team navigation |
| 🏆 **Tournament bracket** | Visual tree R32 → Final with phase selection |
| 🎨 **Dynamic theme** | Entire UI changes colors based on the selected team's national colors |
| 💬 **Generative UI** | Rich cards rendered inside the chat (stadiums, comparisons) |
| 🌤️ **Live weather** | Real-time weather via MCP (open-meteo) — not cached data |
| 💡 **Smart suggestions** | AI-driven follow-up questions based on current context |
| 📱 **Mobile-first** | Mobile tabs + CopilotPopup / Desktop sidebar |
| ⏱️ **Live countdown** | Real-time countdown to June 11, 2026 |

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ (v24 LTS recommended) | [nodejs.org](https://nodejs.org) |
| GitHub CLI | latest | `winget install GitHub.cli` |
| GitHub Copilot | Active subscription | [github.com/features/copilot](https://github.com/features/copilot) |

### 1. Clone & install

```bash
git clone https://github.com/fredgis/foot-agui-sample.git
cd foot-agui-sample
npm install
```

### 2. Authenticate with GitHub

```bash
gh auth login
```

The Copilot SDK uses your GitHub auth token — **no API keys needed**.

### 3. Run

```bash
npm run dev
```

Open **http://localhost:3000** and start chatting with Copa! ⚽

### 4. Try it

- 🏳️ Click a team flag → the page transforms with national colors
- 💬 Type: *"Show me France"* → blue theme, roster, schedule
- ⚔️ Try: *"Compare Brazil vs Argentina"* → rich comparison card in chat
- 🏟️ Ask: *"Tell me about MetLife Stadium"* → stadium card in chat
- 🌤️ Ask: *"What's the weather in New York?"* → live weather from MCP
- 🌍 Navigate Groups and Bracket views

---

## 📁 Project Structure

```
foot-agui-sample/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Main page — all CopilotKit hooks + components
│   │   ├── globals.css                 # Dark theme, animations, CopilotKit styles
│   │   ├── layout.tsx                  # CopilotKit Provider + metadata
│   │   └── api/copilotkit/route.ts     # CopilotRuntime → CopilotSDKAgent
│   ├── components/
│   │   ├── team-card.tsx               # Team profile (players, honors, SVG jersey)
│   │   ├── match-schedule.tsx          # 104 matches with phase/group filters
│   │   ├── venue-map.tsx               # Interactive SVG map — 16 stadiums
│   │   ├── group-view.tsx              # 12 groups (A→L) responsive grid
│   │   └── tournament-bracket.tsx      # Bracket R32 → Final
│   └── lib/
│       ├── types.ts                    # Types: TeamInfo, MatchInfo, AgentState
│       ├── worldcup-data.ts            # 48 teams, 16 stadiums, 12 groups, 104 matches
│       ├── flags.ts                    # FIFA code → ISO → flagcdn.com images
│       └── copilot-sdk-agent.ts        # CopilotSDKAgent — AG-UI ↔ Copilot SDK bridge
├── scripts/
│   ├── deploy.ps1                      # One-click Azure deploy (idempotent, PowerShell 7+)
│   └── deploy-config.env.example       # Azure config template
├── package.json
└── README.md
```

---

## 🛠️ Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (Next.js Turbopack) on `:3000` |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |

---

## ☁️ Azure Deployment

Copa deploys as a single **Azure Static Web App** — no backend containers needed.

### One-click deploy (idempotent)

```powershell
Copy-Item scripts\deploy-config.env.example scripts\deploy-config.env
# Edit with your Azure subscription details

pwsh scripts\deploy.ps1
```

The script is **re-entrant**: safe to run multiple times (4 idempotent steps).

To tear down:
```powershell
az group delete --name rg-worldcup2026 --yes --no-wait
```

---

## 🔧 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js + React + TailwindCSS | 16 + 19 + 4 |
| Chat UI | CopilotKit (Sidebar + Popup) | 1.50 |
| Protocol | AG-UI (SSE events) | 0.0.46 |
| AI Agent | GitHub Copilot SDK | 0.1.29 |
| LLM | GitHub Copilot (via `gh auth`) | — |
| Weather | open-meteo MCP Server | — |
| Deployment | Azure Static Web Apps | — |
| Flags | flagcdn.com (CDN) | — |

---

## 📊 Project Stats

| Metric | Value |
|---|---|
| **Lines of code** | ~6,000 (TypeScript + CSS) |
| **React components** | 7 |
| **AI tools** | 6 custom + MCP weather |
| **WC2026 data** | 48 teams · 104 matches · 16 stadiums · 12 groups |

> 🤖 This project was developed collaboratively with **GitHub Copilot Agent** — from planning through architecture, implementation, debugging, and documentation.

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

**⚽ Built for the 2026 FIFA World Cup 🇺🇸🇲🇽🇨🇦**
**Powered by [AG-UI Protocol](https://docs.ag-ui.com) · [GitHub Copilot SDK](https://github.com/github/copilot-sdk) · [CopilotKit](https://copilotkit.ai) · [MCP](https://modelcontextprotocol.io/)**
