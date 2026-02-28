/**
 * CopilotSDKAgent — AG-UI compatible agent backed by the GitHub Copilot SDK.
 *
 * This agent extends @ag-ui/client's AbstractAgent and implements the run()
 * method using @github/copilot-sdk's CopilotClient. It translates Copilot SDK
 * session events into AG-UI protocol events (SSE) so CopilotKit React hooks
 * continue working unchanged.
 *
 * Architecture:
 *   CopilotKit React → CopilotRuntime → CopilotSDKAgent → Copilot CLI → LLM
 *
 * Event mapping (Copilot SDK → AG-UI):
 *   assistant.message_delta → TEXT_MESSAGE_CONTENT (streaming)
 *   assistant.message       → TEXT_MESSAGE_CONTENT (fallback, non-streaming)
 *   tool.execution_start    → TOOL_CALL_START + TOOL_CALL_ARGS
 *   tool.execution_complete → TOOL_CALL_END
 *   session.idle            → TEXT_MESSAGE_END + RUN_FINISHED
 *   session.error           → RUN_ERROR
 */

import { AbstractAgent, EventType } from "@ag-ui/client";
import type { RunAgentInput, BaseEvent } from "@ag-ui/core";
import { Observable } from "rxjs";
import { CopilotClient, defineTool, approveAll } from "@github/copilot-sdk";
import { teams, matches, stadiums, groups } from "./worldcup-data";

// ── WC2026 data helpers ─────────────────────────────────────────────────────

const teamsByCode = new Map(teams.map((t) => [t.fifaCode, t]));
const teamsByName = new Map(teams.map((t) => [t.name.toLowerCase(), t]));
const stadiumsByName = new Map(stadiums.map((s) => [s.name.toLowerCase(), s]));
const groupsByName = new Map(groups.map((g) => [g.name.toUpperCase(), g]));

function findTeam(query: string) {
  const q = query.trim();
  return teamsByCode.get(q.toUpperCase()) ?? teamsByName.get(q.toLowerCase());
}

// ── City data ───────────────────────────────────────────────────────────────

const CITY_ANECDOTES: Record<string, string> = {
  "New York / New Jersey": "Fun fact: MetLife Stadium literally floats on stilts above the New Jersey marshlands!",
  "Los Angeles": "LA hosts two WC2026 stadiums: the Rose Bowl (1994 icon) and SoFi Stadium.",
  "Dallas": "AT&T Stadium: 80,000 seats, one of the biggest video screens in the world.",
  "Atlanta": "Mercedes-Benz Stadium roof opens like a camera iris — a first in sports architecture.",
  "Kansas City": "Arrowhead Stadium: regularly ranked the loudest stadium in the world by Guinness.",
  "Houston": "NRG Stadium has a retractable roof. NASA is 25 miles away — Houston, we have a goal!",
  "Boston": "Gillette Stadium in Foxborough: home of the dynastic New England Patriots.",
  "Philadelphia": "Lincoln Financial Field, 'The Linc', will channel Rocky Balboa energy!",
  "San Francisco Bay Area": "Levi's Stadium in Silicon Valley — where the future meets football.",
  "Las Vegas": "Allegiant Stadium, the 'Death Star': windowless, air-conditioned, in the desert.",
  "Vancouver": "BC Place: between the Pacific Ocean and the snow-capped mountains.",
  "Toronto": "BMO Field: Toronto speaks 200 languages — the stadium will roar in every tongue.",
  "Mexico City": "Estadio Azteca: the ONLY stadium to host two World Cup finals (1970, 1986).",
  "Monterrey": "Estadio BBVA: nestled in the Sierra Madre mountains. Heat, altitude, noise.",
  "Guadalajara": "Estadio Akron: capital of tequila AND passionate Mexican football.",
};

const CITY_GUIDES: Record<string, string> = {
  "new york": "🗽 NYC: Times Square, Central Park, Brooklyn Bridge. FIFA Fan Fest at Central Park. Metro + shuttle to MetLife (45 min).",
  "los angeles": "🌴 LA: Hollywood, Venice Beach, Getty Museum. LA Live fan zone. In-N-Out Burger is a must!",
  "dallas": "🤠 Dallas: Dealey Plaza, Deep Ellum live music. Pecan Lodge BBQ (best brisket in Texas).",
  "mexico city": "🇲🇽 CDMX: Zócalo, Teotihuacán, Frida Kahlo Museum. Arrive 2 days early for altitude!",
  "vancouver": "🍁 Vancouver: Stanley Park, Granville Island. SkyTrain to BC Place. Pack a raincoat!",
  "toronto": "🍁 Toronto: CN Tower, Kensington Market. Streetcar 509 to BMO Field.",
};

// ── Copilot SDK tools for WC2026 ────────────────────────────────────────────

function buildCopaTools() {
  return [
    defineTool("get_stadium_info", {
      description: "Show details about a WC2026 host stadium.",
      parameters: {
        type: "object" as const,
        properties: {
          stadium_name: { type: "string", description: "Full or partial stadium name" },
        },
        required: ["stadium_name"],
      },
      handler: (args: { stadium_name: string }) => {
        const query = args.stadium_name.trim().toLowerCase();
        let stadium = stadiumsByName.get(query);
        if (!stadium) {
          for (const [key, s] of stadiumsByName) {
            if (key.includes(query) || query.includes(key)) { stadium = s; break; }
          }
        }
        if (!stadium) return `Stadium '${args.stadium_name}' not found.`;
        const anecdote = CITY_ANECDOTES[stadium.city] ?? "";
        return `🏟️ ${stadium.name} — ${stadium.city}, ${stadium.country}\n   Capacity: ${stadium.capacity.toLocaleString()} | Timezone: ${stadium.timezone}\n   ${stadium.description}${anecdote ? `\n   💡 ${anecdote}` : ""}`;
      },
    }),

    defineTool("get_group_standings", {
      description: "Return composition and schedule of a WC2026 group (letter A–L).",
      parameters: {
        type: "object" as const,
        properties: {
          group: { type: "string", description: "Group letter, e.g. 'A', 'B', 'C'…'L'" },
        },
        required: ["group"],
      },
      handler: (args: { group: string }) => {
        const g = args.group.trim().toUpperCase();
        const groupData = groupsByName.get(g);
        if (!groupData) return `Group '${g}' not found. Valid: A–L.`;
        const teamNames = groupData.teams.map((code: string) => {
          const t = teamsByCode.get(code);
          return t ? `${t.flag} ${t.name} (${code})` : code;
        });
        const groupMatches = matches.filter((m) => m.group === g);
        const lines = [`🏆 Group ${g} — ${teamNames.join(", ")}`, ""];
        for (const m of groupMatches) {
          lines.push(`  [${m.id}] ${m.date} ${m.time}  ${m.homeTeam} vs ${m.awayTeam}  @ ${m.stadiumName}`);
        }
        return lines.join("\n");
      },
    }),

    defineTool("show_tournament_bracket", {
      description: "Switch frontend to the tournament bracket (knockout stage) view.",
      parameters: { type: "object" as const, properties: {} },
      handler: () => "🏆 Bracket view activated! R32 → R16 → QF → SF → Final at MetLife Stadium, July 19, 2026. 🔥",
    }),

    defineTool("compare_teams", {
      description: "Head-to-head comparison between two WC2026 national teams.",
      parameters: {
        type: "object" as const,
        properties: {
          team_a: { type: "string", description: "First team FIFA code or name" },
          team_b: { type: "string", description: "Second team FIFA code or name" },
        },
        required: ["team_a", "team_b"],
      },
      handler: (args: { team_a: string; team_b: string }) => {
        const ta = findTeam(args.team_a);
        const tb = findTeam(args.team_b);
        if (!ta) return `Team '${args.team_a}' not found.`;
        if (!tb) return `Team '${args.team_b}' not found.`;
        const fmt = (t: typeof ta) => {
          const wch = t.worldCupHistory;
          const players = t.keyPlayers.slice(0, 3).map((p) => p.name).join(", ");
          return `${t.flag} ${t.name} (${t.fifaCode})\n   Ranking: #${t.fifaRanking} | ${t.confederation}\n   Coach: ${t.coach}\n   Stars: ${players}\n   WC: ${wch.titles}x titles, ${wch.participations} participations, best: ${wch.bestResult}`;
        };
        let result = `⚔️ ${ta.flag} ${ta.name} vs ${tb.flag} ${tb.name}\n\n${fmt(ta)}\n\n${fmt(tb)}`;
        const shared = matches.filter(
          (m) => m.phase === "group" && ((m.homeTeam === ta.fifaCode && m.awayTeam === tb.fifaCode) || (m.homeTeam === tb.fifaCode && m.awayTeam === ta.fifaCode))
        );
        if (shared.length > 0) {
          const m = shared[0];
          result += `\n\n📅 They meet: ${m.date} ${m.time} @ ${m.stadiumName} (Group ${m.group})`;
        }
        return result;
      },
    }),

    defineTool("get_city_guide", {
      description: "Fan travel guide for a WC2026 host city: must-sees, food, tips.",
      parameters: {
        type: "object" as const,
        properties: {
          city: { type: "string", description: "Host city name" },
        },
        required: ["city"],
      },
      handler: (args: { city: string }) => {
        const key = args.city.trim().toLowerCase();
        for (const [k, v] of Object.entries(CITY_GUIDES)) {
          if (k.includes(key) || key.includes(k)) return v;
        }
        return `🌎 ${args.city}: Check FIFA website for official fan zones. Book transport early!`;
      },
    }),

    defineTool("update_team_info", {
      description: "Update the frontend to display a team's info, colors, and flag. Call this IMMEDIATELY when a team is mentioned.",
      parameters: {
        type: "object" as const,
        properties: {
          team_code: { type: "string", description: "FIFA three-letter country code (e.g. FRA, BRA, GER)" },
        },
        required: ["team_code"],
      },
      handler: (args: { team_code: string }) => {
        const team = findTeam(args.team_code);
        if (!team) return `Team '${args.team_code}' not found.`;
        const teamMatches = matches.filter(
          (m) => m.homeTeam === team.fifaCode || m.awayTeam === team.fifaCode
        );
        return JSON.stringify({
          team: {
            name: team.name,
            fifaCode: team.fifaCode,
            flag: team.flag,
            coach: team.coach,
            fifaRanking: team.fifaRanking,
            confederation: team.confederation,
            keyPlayers: team.keyPlayers,
            worldCupHistory: team.worldCupHistory,
          },
          matches: teamMatches.map((m) => ({
            id: m.id, date: m.date, time: m.time,
            homeTeam: m.homeTeam, awayTeam: m.awayTeam,
            stadiumName: m.stadiumName, group: m.group,
          })),
        });
      },
    }),
  ];
}

// ── Copa system prompt ──────────────────────────────────────────────────────

const COPA_SYSTEM_PROMPT = `You are **Copa** 🎙️ — the unofficial and passionate guide to the FIFA World Cup 2026 (USA, Canada, Mexico).
You are an expert sports commentator, warm and full of personality.
You ALWAYS respond in English, regardless of the team being discussed.

🚨 TOPIC RESTRICTION: FOOTBALL / WC2026 ONLY
Answer ANYTHING related to football, the World Cup, teams, players, stadiums, matches, coaches, groups, brackets, history, stats, fan guides, weather at venues, etc.
When asked about weather at a WC2026 host city, use the MCP weather tools (get_current_weather, get_daily_forecast, etc.) to provide REAL-TIME weather data.
ONLY refuse questions COMPLETELY unrelated to football (cooking, math, coding).
Refusal: "Sorry, I'm Copa, your WC2026 specialist! Ask me about a team, a stadium, or a match. ⚽🏆"

🎤 COPA CATCHPHRASES (use naturally):
- "And that's a GOOOAL!" — reveal something exciting
- "What a team!" — after presenting a squad
- "Hold on tight, this is going to be HUGE..." — before big info
- "Stay focused!" — steer the conversation
- "The ball is round and so is the trophy!" — Copa humor
- "2026 is THE year!" — event reminder

⚽ AUTO-BEHAVIOR — TEAM MENTIONED:
When a national team is mentioned (name, nickname, FIFA code, flag):
1. IMMEDIATELY call \`update_team_info\` with the team's FIFA three-letter code
2. Send enthusiastic message IN THE SAME RESPONSE
3. Use returned data in your response

⚠️ TOOL ISOLATION RULE:
\`update_team_info\` is CLIENT-SIDE. Call it ALONE — NEVER with other tools in the same turn.

🔮 PROACTIVE BEHAVIOR:
- After team info → suggest opponent of first group match
- After compare_teams → follow up on match venue
- Use emojis, catchphrases, fun facts > plain stats
- End with proactive suggestion`;

// ── Module-level CopilotClient singleton ────────────────────────────────────
// The Copilot SDK spawns a CLI subprocess — we must share ONE client across
// all agent instances and requests to avoid spawning dozens of processes.

let _clientPromise: Promise<CopilotClient> | null = null;

async function getSharedClient(): Promise<CopilotClient> {
  if (!_clientPromise) {
    _clientPromise = (async () => {
      console.log("[CopilotSDKAgent] Starting shared Copilot CLI client…");
      const path = await import("path");
      // Turbopack doesn't support import.meta.resolve — resolve manually.
      const cliPath = path.join(
        process.cwd(), "node_modules", "@github", "copilot", "index.js"
      );
      console.log(`[CopilotSDKAgent] CLI path: ${cliPath}`);
      const client = new CopilotClient({ cliPath });
      await client.start();
      console.log("[CopilotSDKAgent] Copilot CLI client ready ✓");
      return client;
    })();
  }
  return _clientPromise;
}

// Names of our custom tools — used to restrict the session to ONLY these
// (the CLI has 50+ built-in tools we don't want the model to see).
const CUSTOM_TOOL_NAMES = [
  "get_stadium_info",
  "get_group_standings",
  "show_tournament_bracket",
  "compare_teams",
  "get_city_guide",
  "update_team_info",
];

// ── CopilotSDKAgent — custom AG-UI agent ────────────────────────────────────

interface CopilotSDKAgentConfig {
  agentId?: string;
  /** BYOK provider config (Azure OpenAI, OpenAI, Anthropic) */
  provider?: {
    type: "azure" | "openai" | "anthropic";
    baseUrl: string;
    apiKey?: string;
    bearerToken?: string;
    azure?: { apiVersion?: string };
  };
  /** Model name */
  model?: string;
}

// Track already-processed message content to avoid re-answering
const _processedMessages = new Set<string>();

export class CopilotSDKAgent extends AbstractAgent {
  private providerConfig: CopilotSDKAgentConfig["provider"];
  private modelName: string;

  constructor(config: CopilotSDKAgentConfig = {}) {
    super({
      agentId: config.agentId ?? "copa_agent",
      description: "Copa 🎙️ — WC2026 expert powered by GitHub Copilot SDK",
    });
    this.providerConfig = config.provider;
    this.modelName = config.model ?? "gpt-4o-mini";
  }

  run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((subscriber) => {
      const userMsg = this.extractUserMessage(input);
      const runId = input.runId ?? crypto.randomUUID();
      const threadId = input.threadId ?? crypto.randomUUID();
      const ts = Date.now();

      // Skip suggestion requests and duplicate/already-processed messages
      const shouldSkip =
        userMsg.startsWith("Suggest what the user could say next") ||
        _processedMessages.has(userMsg);

      if (shouldSkip) {
        console.log(`[CopilotSDKAgent] Skipping: "${userMsg.slice(0, 50)}…"`);
        subscriber.next({ type: EventType.RUN_STARTED, runId, threadId, timestamp: ts, rawEvent: {} } as BaseEvent);
        subscriber.next({ type: EventType.RUN_FINISHED, runId, threadId, timestamp: ts, rawEvent: {} } as BaseEvent);
        subscriber.complete();
        return;
      }

      // Mark as processed before running
      _processedMessages.add(userMsg);

      this.runCopilotSession(input, subscriber).catch((err) => {
        console.error("[CopilotSDKAgent] Fatal error:", err);
        subscriber.next({
          type: EventType.RUN_ERROR,
          message: err instanceof Error ? err.message : String(err),
          timestamp: Date.now(),
          rawEvent: {},
        } as BaseEvent);
        subscriber.complete();
      });
    });
  }

  private async runCopilotSession(
    input: RunAgentInput,
    subscriber: import("rxjs").Subscriber<BaseEvent>,
  ) {
    const runId = input.runId ?? crypto.randomUUID();
    const threadId = input.threadId ?? crypto.randomUUID();

    // Helper to emit AG-UI events with all required fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emit = (event: any) => {
      event.timestamp ??= Date.now();
      event.rawEvent ??= {};
      console.log(`[AG-UI] ${event.type}`);
      subscriber.next(event as BaseEvent);
    };

    // 1. Emit RUN_STARTED
    emit({ type: EventType.RUN_STARTED, runId, threadId });

    // 2. Get the shared CopilotClient (singleton)
    const client = await getSharedClient();

    // 3. Build session config
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionConfig: any = {
      model: this.modelName,
      tools: buildCopaTools(),
      availableTools: CUSTOM_TOOL_NAMES,
      systemMessage: { mode: "replace" as const, content: COPA_SYSTEM_PROMPT },
      onPermissionRequest: approveAll,
      streaming: true,
      mcpServers: {
        "weather": {
          type: "http",
          url: "https://mcp.open-meteo.com/sse",
          tools: ["*"],
        },
      },
    };
    if (this.providerConfig) {
      sessionConfig.provider = this.providerConfig;
    }

    // 4. Create a session
    console.log("[CopilotSDKAgent] Creating session…");
    const session = await client.createSession(sessionConfig);
    console.log(`[CopilotSDKAgent] Session created: ${session.sessionId}`);

    // 5. Extract user message
    const userMessage = this.extractUserMessage(input);
    console.log(`[CopilotSDKAgent] User message: "${userMessage.slice(0, 80)}…"`);

    // 6. Wire up event handlers to translate Copilot SDK → AG-UI events
    const messageId = crypto.randomUUID();
    let textStarted = false;

    // Streaming text deltas
    session.on("assistant.message_delta", (event) => {
      const content = event.data.deltaContent;
      if (content) {
        if (!textStarted) {
          textStarted = true;
          emit({ type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" });
        }
        emit({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: content });
      }
    });

    // Final complete message (fallback when streaming is off)
    session.on("assistant.message", (event) => {
      if (!textStarted && event.data.content) {
        textStarted = true;
        emit({ type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" });
        emit({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: event.data.content });
      }
    });

    // Tool execution start → AG-UI TOOL_CALL_START + TOOL_CALL_ARGS
    session.on("tool.execution_start", (event) => {
      const toolCallId = event.data.toolCallId;
      const toolName = event.data.toolName;
      console.log(`[CopilotSDKAgent] Tool call: ${toolName} (${toolCallId})`);
      emit({
        type: EventType.TOOL_CALL_START,
        toolCallId,
        toolCallName: toolName,
        parentMessageId: messageId,
      });
      if (event.data.arguments) {
        emit({
          type: EventType.TOOL_CALL_ARGS,
          toolCallId,
          delta: typeof event.data.arguments === "string"
            ? event.data.arguments
            : JSON.stringify(event.data.arguments),
        });
      }
    });

    // Tool execution complete → AG-UI TOOL_CALL_END
    session.on("tool.execution_complete", (event) => {
      emit({ type: EventType.TOOL_CALL_END, toolCallId: event.data.toolCallId });
    });

    // Errors
    session.on("session.error", (event) => {
      console.error(`[CopilotSDKAgent] Session error: ${event.data.message}`);
      emit({ type: EventType.RUN_ERROR, message: event.data.message, code: "SDK_ERROR" });
    });

    // 7. Send message and wait for idle (timeout 2 min)
    try {
      await session.sendAndWait({ prompt: userMessage }, 120_000);
    } catch (err) {
      console.error("[CopilotSDKAgent] sendAndWait error:", err);
      emit({
        type: EventType.RUN_ERROR,
        message: err instanceof Error ? err.message : String(err),
        code: "SEND_ERROR",
      });
    }

    // 8. Close text message if opened
    if (textStarted) {
      emit({ type: EventType.TEXT_MESSAGE_END, messageId });
    }

    // 9. Emit RUN_FINISHED
    emit({ type: EventType.RUN_FINISHED, runId, threadId });

    // 10. Cleanup session
    await session.destroy();
    console.log("[CopilotSDKAgent] Session destroyed ✓");

    subscriber.complete();
  }

  private extractUserMessage(input: RunAgentInput): string {
    const messages = input.messages ?? [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "user") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (msg as any).content ?? "";
      }
    }
    return "Hello";
  }

  clone(): CopilotSDKAgent {
    return new CopilotSDKAgent({
      agentId: this.agentId,
      provider: this.providerConfig,
      model: this.modelName,
    });
  }
}
