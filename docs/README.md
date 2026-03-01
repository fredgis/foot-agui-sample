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

Copa follows a 4-layer architecture:

```
┌─────────────────────────────────────────────────────────┐
│  👤 Browser — Next.js 16 + React 19                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ TeamCard │ │ VenueMap │ │ Schedule │ │ Bracket   │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│       └─────────────┴────────────┴─────────────┘        │
│                         │                                │
│              CopilotKit (useCoAgent)                     │
└─────────────────────────┬───────────────────────────────┘
                          │ AG-UI Protocol (SSE)
┌─────────────────────────┴───────────────────────────────┐
│  ⚙️ Next.js API Route                                    │
│  CopilotSDKAgent — AG-UI ↔ Copilot SDK bridge           │
│  Copa Tools (×6): update_team, compare, bracket,        │
│                   stadium, group, city_guide             │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────┐
│  🤖 GitHub Copilot SDK                                   │
│  LLM via gh auth token — zero API keys                  │
│  MCP: open-meteo (live weather at stadiums)              │
└─────────────────────────────────────────────────────────┘
```

### Layer Details

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 16 + React 19 + TailwindCSS | Rich UI components that react to agent state |
| **Protocol** | AG-UI (SSE events) | Streaming text, tool calls, state sync — one event stream |
| **Agent** | GitHub Copilot SDK | Zero API keys, custom tools, streaming |
| **External** | MCP open-meteo server | Real-time weather at any WC2026 venue |

### Architecture Diagrams

- **Macro architecture**: [`architecture.puml`](architecture.puml) ([rendered](https://www.plantuml.com/plantuml/svg/bLN1Rjj64BqBq3yCf4Dj5x94oP4j8n5CYv9ZM8uDYqaAr8MnMex9ZSXTOdT9EIa2zDHJWRP0qAAvv99_Q2-zj7_Y7sW-eLYIKcJ9Qk4REVFUcxSpE-I1qaJg90g1I1emZLGd4iibDM4y9f94C2PquakHSAydGY6Xsd0iozfTXAY0U6BAk0_N95Hts1vUaoJK0y7rCn8XL4Re2uJdnvKrg15xWs2rrcGB2xsEOpcTHKnXK7AKO3KNCp6X4-BZeP0UoeBVQhJQBUSUr4ADVhll35fhCBdBdVlgBBVBQbk7pJkEg8XYmP7haNuT8aYacd0_n7in_-DxZljFvxQKOke6Z4uuAWNDbLp1VBHdjmU3SgbSqao728-l1TT0JV99fT2jW69ly4d5QbUwj-__X9w82Tn-zmxiXGi4PodAbE7qSTr8T8raqI2eVFhmyqSub6AgK5Q0A1Zdp_1jkGGmXpt36xtzIe7L1lWIu089rM1rCWR76_rAvGJut0Iez4JCGg5FcCu9bxnUJnJsXEsR_5-_G_QMWMogcU3rUgP89r2r1arxfx6YwIA9UaHw6KvJg3OTwx2nYdk1FC5J4cUuD5gBEoMQ1YCQe9U4c84ZjHPy94KIls0upO1-kXReYaHo4fah8mcTeCxjZjSINYBH0ShvoQPtJlQsN7fxPsgtxt_xvuyVOOGoHGcmCHkFVNuC5oBHk9cfg3oVJMPrBYFd91k46OjzL7j-3BVVluCY2IFd1CQIUJuMGo7PqAeDfxbdxQqg4d2521Li_FrhUpERTEmHZLSQIMH6RT14edaSvpsvv4eJZoLPsgnfdE6OVWr-mhnPNPt9LXjEwz3gBpVYquUFlu1z31S9ropA1oZpvvLZ7p7zD1al7j3OFF2P3f9ndURXcl8cHM7bJR8X3F8XB2WDXwU6UbVmagUCW1y0INHGI8HX1DMMq-mOYMNdF_m4_HkDafCmcoIZg38MpgBB9pZjdU-3Y97N8jGeZ8SXIn6c-UqfYaOqDklJS9hz9VvrI7pgyMqg8iCTXCG75X4VLK4r0FMPd3d-0Yum96OxLS1YLIvf2hMl0-PvoB-Hp0zq3TAeN4gZbN2aogL8hOJzj5poqvMm7fTBUhmIdbBZWawWbiIrhjdv_QLluTvXPwVJhtIL9Xhd7xav8uqUoeZKGnb--b267Z-KCLr_SedSGxdmVJSaJqnvhLlixJ8p_xjKkbjR-UgVIw455U7MLg5ooUylLQ-FHlrzSFjVkMPTtREpuLNF7WxDoyYrtVwLqn-wThs-u2QtC3EKBVHoq2pRsdwWKapmRONSixdtaZ2ziJcNDyoPYjctTIh5Pe8M4-HpTk4YlslTR7UM1UpMhZNODQqwxPq_i56W9U4g5b8lDCGiqAnWld7hF3zrtVE5FXuWzv8eB9V-1G00))
- **Sequence diagram**: [`sequence.puml`](sequence.puml) ([rendered](https://www.plantuml.com/plantuml/svg/lLNBJkH65DqZyGzNPf66D3Hk61wjWOpnWo2w0U564oaTjGhxTdS9kygfAjDX41Ahp2RAIz58cGsRoIXIDjbDDjdCf_03uHEYSXjmG_FA8YjRhdFlFUVSMzSlf292fN444hzEaGKuFYOFA4k8837ia-2WAtZAGfj7NC34h6EQvc8H8diav7tAkj0XaHoA3h53qaXvdAaj4YCOFdOvmjw6SGVAfwyGpEeTfpa5UzandUKY9YSe60fO6kAMIxA4uFrcZmO73AM4wfsOlCIp9Ml1yqQXTeXGDA09OMgDYn157Z4tExSmvpmKSTDDSy5SguvaKuWgI7SNNCUR6uMlqmxMASD7ahg2ts9aLytgI0yTUaX354_GS1dnE4evkg1sQMrvVjaTXLqNF4sUm6I0lvy7u-eXzpB8muvfsBtpIWB5XssvFN03pCCICzo84HaVKrH52Cyxd2a8zE6AaPyQ8EahN37CUMFr_EtVu115m8ju7yvFVm73x_4-n0YU82n0utb5frZLARDYO5oS_VGEzYGA0uY4lV6nv7fQzUcRt_xvwmUmUK8ZhZQfQh7IBf90GO_p0pcPHNamONfLQtxsHlJvsryBmRwpQNMHwGpM-lJU1kmB6dPnaCBIwwYwP2xT8l3kpMK2y9tD5YlPzGsGwNuYU80oPs33HDKnlTcR32xElliH6lOE-2WEKRHOYIUASaQYGLn3CvzrggvsP0-cLy63sYtNChFe8L5ObEffk0Mr6sqPjDzOdPhAL4vDvPx3Rieo_L3oVNUoaBEWtOBfdCDmqi7rCLOhbTszhRRVj7QRhbEf5DffQJOsr42Yb9Ip6Oaij5Zuab1LAbOhM3K-PcVrj0Z5UJI3ts2GQd_QsP-anKff4XA5ROKaRbFMuMKupju37c8D36_NCauc7yExkRrTRzjMlJvWNwd0-RS_G_6xjRlkZ_ZiRXM5tbLepbjRVZQhNVURLjDjEswzQLrvts9V7lEaPWXC8XAWKOQ4g5xDg6Wj6wp3ZJ8SaYZ5sl7vwVj1rqzElj8EwGK0_115LZILQFD15mK6I0zHwbH1hyKqxoQIs2OYB8FgOOnba44FmpJ25YDH10CpWJAf25FH4LoSlVxZukprX-5M42bfXfY9KKhInNQ8aI9GaaeWYIdhFivnzujck-7wlhNkjktjhQQxrRnoiiLAVIv2s3y2_PmSPd0vGpICS7minElXoKVjAQMp1kPjrTFhRMnj-9yFZM-XWdNRz8kpxt-77T95e18OxqCdZQ8Zy0GoRVnQbEB0R_Zu0GIN2eL-YqcY7vSj6AhYwIehAtS8sCvtH0twI5GF1NHu5F7-T9fSNkQLbU6DyR97r2TIqxYAeGnsYA3oi_ztVpnv2zWwfd6BXpMtQ7gBcaV3thbc4QH285FjN6N9o3GQnTo5fTh8HaKJEbOO9pKmbpx-QPUXJrbO0xDw45TwPJW_VNyor9x6FPifu74IeS8dBPshMODF_zjzkNaB7hUe7nprcoFv0bcOnj7usBy0))

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

### Bias Considerations

- FIFA rankings are used as a proxy for team strength. Rankings may not fully reflect current form.
- The simulation model favors higher-ranked teams but includes randomness to allow for upsets, reflecting real tournament unpredictability.
- Team descriptions and historical data are presented factually without editorial bias.

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
| Deployment | Azure Static Web Apps | — |

---

**⚽ Built for the 2026 FIFA World Cup 🇺🇸🇲🇽🇨🇦**
