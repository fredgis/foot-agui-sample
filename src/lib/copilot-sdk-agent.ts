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
 */

import { AbstractAgent, EventType } from "@ag-ui/client";
import type { RunAgentInput, BaseEvent } from "@ag-ui/core";
import { Observable } from "rxjs";
import { CopilotClient, defineTool, approveAll } from "@github/copilot-sdk";
import type { CopilotSession } from "@github/copilot-sdk";
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

const CITY_WEATHER: Record<string, string> = {
  "new york": "June–July: hot and humid, ~28°C. Evening thunderstorms possible. MetLife is open-air.",
  "los angeles": "June–July: sunny and dry, ~27°C. Coastal morning fog possible.",
  "dallas": "June–July: very hot, ~35°C. AT&T Stadium is air-conditioned.",
  "atlanta": "June–July: hot and humid, ~30°C. Mercedes-Benz has a retractable roof.",
  "kansas city": "June–July: hot, ~30°C. Frequent thunderstorms.",
  "houston": "June–July: scorching and humid, ~34°C. NRG has a retractable roof.",
  "boston": "June–July: pleasant, ~24°C. The coolest US venue.",
  "philadelphia": "June–July: hot and humid, ~28°C. Open-air — bring sunscreen.",
  "san francisco": "June–July: cool, ~18°C. Bring a jacket for evening matches!",
  "las vegas": "June–July: scorching, ~42°C! Allegiant is fully air-conditioned.",
  "vancouver": "June–July: mild and sometimes rainy, ~20°C. BC Place has a roof.",
  "toronto": "June–July: pleasant, ~23°C. BMO Field is open-air.",
  "mexico city": "June–July: mild and rainy, ~18°C, altitude 2,240 m.",
  "monterrey": "June–July: very hot, ~36°C. Estadio BBVA sits in the hills.",
  "guadalajara": "June–July: warm with tropical showers, ~25°C.",
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

    defineTool("get_venue_weather", {
      description: "Weather and climate overview for a WC2026 host city during June/July.",
      parameters: {
        type: "object" as const,
        properties: {
          city: { type: "string", description: "Host city name" },
        },
        required: ["city"],
      },
      handler: (args: { city: string }) => {
        const key = args.city.trim().toLowerCase();
        for (const [k, v] of Object.entries(CITY_WEATHER)) {
          if (k.includes(key) || key.includes(k)) return `🌤️ WC2026 Weather — ${args.city}:\n${v}`;
        }
        return `Weather for '${args.city}' not available.`;
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
  ];
}

// ── Copa system prompt ──────────────────────────────────────────────────────

const COPA_SYSTEM_PROMPT = `You are **Copa** 🎙️ — the unofficial and passionate guide to the FIFA World Cup 2026 (USA, Canada, Mexico).
You are an expert sports commentator, warm and full of personality.
You ALWAYS respond in English, regardless of the team being discussed.

🚨 TOPIC RESTRICTION: FOOTBALL / WC2026 ONLY
Answer ANYTHING related to football, the World Cup, teams, players, stadiums, matches, coaches, groups, brackets, history, stats, fan guides, weather at venues, etc.
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

// ── CopilotSDKAgent — custom AG-UI agent ────────────────────────────────────

interface CopilotSDKAgentConfig {
  agentId?: string;
  /** Azure OpenAI or BYOK provider config */
  provider?: {
    type: "azure" | "openai";
    baseUrl: string;
    apiKey?: string;
    azure?: { apiVersion?: string };
  };
  /** Model name (required for BYOK) */
  model?: string;
}

export class CopilotSDKAgent extends AbstractAgent {
  private copilotClient: CopilotClient | null = null;
  private session: CopilotSession | null = null;
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
      this.runCopilotSession(input, subscriber).catch((err) => {
        subscriber.next({
          type: EventType.RUN_ERROR,
          message: err instanceof Error ? err.message : String(err),
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

    // 1. Emit RUN_STARTED
    subscriber.next({ type: EventType.RUN_STARTED, runId } as BaseEvent);

    // 2. Emit STATE_SNAPSHOT with current state
    subscriber.next({
      type: EventType.STATE_SNAPSHOT,
      snapshot: input.state ?? {},
    } as BaseEvent);

    // 3. Start Copilot SDK client if not already running
    if (!this.copilotClient) {
      this.copilotClient = new CopilotClient();
      await this.copilotClient.start();
    }

    // 4. Create session with tools and system prompt
    const sessionConfig: Record<string, unknown> = {
      model: this.modelName,
      tools: buildCopaTools(),
      systemMessage: { content: COPA_SYSTEM_PROMPT },
      onPermissionRequest: approveAll,
    };
    if (this.providerConfig) {
      sessionConfig.provider = this.providerConfig;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.session = await this.copilotClient.createSession(sessionConfig as any);

    // 5. Extract user message from input
    const userMessage = this.extractUserMessage(input);

    // 6. Wire up event handlers to translate Copilot SDK → AG-UI events
    const messageId = crypto.randomUUID();
    let textStarted = false;

    const done = new Promise<void>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.session!.on((event: any) => {
        try {
          switch (event.type?.value ?? event.type) {
            case "assistant.message.delta":
            case "assistant.message": {
              const content = event.data?.delta ?? event.data?.content ?? "";
              if (content && !textStarted) {
                textStarted = true;
                subscriber.next({
                  type: EventType.TEXT_MESSAGE_START,
                  messageId,
                } as BaseEvent);
              }
              if (content) {
                subscriber.next({
                  type: EventType.TEXT_MESSAGE_CONTENT,
                  messageId,
                  delta: content,
                } as BaseEvent);
              }
              break;
            }

            case "tool.invocation.start": {
              const toolCallId = event.data?.invocationId ?? crypto.randomUUID();
              const toolName = event.data?.toolName ?? "unknown";
              subscriber.next({
                type: EventType.TOOL_CALL_START,
                toolCallId,
                toolCallName: toolName,
              } as BaseEvent);
              if (event.data?.arguments) {
                subscriber.next({
                  type: EventType.TOOL_CALL_ARGS,
                  toolCallId,
                  delta: typeof event.data.arguments === "string"
                    ? event.data.arguments
                    : JSON.stringify(event.data.arguments),
                } as BaseEvent);
              }
              break;
            }

            case "tool.invocation.result": {
              const toolCallId = event.data?.invocationId ?? "";
              subscriber.next({
                type: EventType.TOOL_CALL_END,
                toolCallId,
              } as BaseEvent);
              break;
            }

            case "session.idle": {
              // End text message if started
              if (textStarted) {
                subscriber.next({
                  type: EventType.TEXT_MESSAGE_END,
                  messageId,
                } as BaseEvent);
              }
              // Emit RUN_FINISHED
              subscriber.next({
                type: EventType.RUN_FINISHED,
                runId,
              } as BaseEvent);
              resolve();
              break;
            }

            case "error": {
              subscriber.next({
                type: EventType.RUN_ERROR,
                message: event.data?.message ?? "Unknown Copilot SDK error",
              } as BaseEvent);
              reject(new Error(event.data?.message ?? "Copilot SDK error"));
              break;
            }
          }
        } catch (err) {
          console.error("[CopilotSDKAgent] Event handling error:", err);
        }
      });
    });

    // 7. Send the user message
    await this.session.send({ prompt: userMessage });

    // 8. Wait for session.idle
    await done;

    // 9. Cleanup session
    await this.session.destroy();
    this.session = null;

    subscriber.complete();
  }

  private extractUserMessage(input: RunAgentInput): string {
    // Get the last user message from the messages array
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
