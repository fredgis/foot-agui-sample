from __future__ import annotations

import logging
from textwrap import dedent
from typing import Annotated, Any

from agent_framework import ChatAgent, ChatClientProtocol, ai_function
from agent_framework._types import ChatMessage
from agent_framework_ag_ui import AgentFrameworkAgent
from pydantic import Field

from data.worldcup2026 import groups, matches, stadiums, teams

logger = logging.getLogger(__name__)


# ─── Sanitizing wrapper — strips orphaned tool_calls from conversation history ─
class _SanitizingChatClient:
    """Wraps a ChatClientProtocol to fix orphaned tool_calls before sending to the LLM."""

    def __init__(self, inner: ChatClientProtocol):
        self._inner = inner

    @property
    def additional_properties(self) -> dict[str, Any]:
        return getattr(self._inner, "additional_properties", {})

    @staticmethod
    def _sanitize(messages: list[ChatMessage]) -> list[ChatMessage]:
        """Remove tool_calls whose IDs have no matching tool-result message."""
        tool_result_ids: set[str] = set()
        for m in messages:
            if getattr(m, "role", None) == "tool":
                tid = getattr(m, "tool_call_id", None)
                if tid:
                    tool_result_ids.add(tid)

        sanitized: list[ChatMessage] = []
        for m in messages:
            calls = getattr(m, "tool_calls", None)
            if calls:
                kept = [c for c in calls if getattr(c, "id", None) in tool_result_ids]
                if len(kept) < len(calls):
                    dropped = len(calls) - len(kept)
                    logger.warning("Sanitized %d orphaned tool_call(s) from conversation history", dropped)
                if kept:
                    m.tool_calls = kept  # type: ignore[attr-defined]
                    sanitized.append(m)
                else:
                    # All tool_calls orphaned — convert to plain assistant message
                    if hasattr(m, "content") and m.content:
                        m.tool_calls = None  # type: ignore[attr-defined]
                        sanitized.append(m)
                    # else drop entirely
            else:
                sanitized.append(m)
        return sanitized

    async def get_streaming_response(self, messages, **kwargs):
        if isinstance(messages, list):
            messages = self._sanitize(messages)
        async for update in self._inner.get_streaming_response(messages, **kwargs):
            yield update

    async def get_response(self, messages, **kwargs):
        if isinstance(messages, list):
            messages = self._sanitize(messages)
        return await self._inner.get_response(messages, **kwargs)

# ─── State Schema — aligned with AgentState in src/lib/types.ts ───────────────

STATE_SCHEMA: dict[str, object] = {
    "teamInfo": {
        "type": ["object", "null"],
        "properties": {
            "name": {"type": "string"},
            "fifaCode": {"type": "string"},
            "flag": {"type": "string"},
            "confederation": {"type": "string"},
            "fifaRanking": {"type": "number"},
            "primaryColor": {"type": "string"},
            "secondaryColor": {"type": "string"},
            "coach": {"type": "string"},
            "keyPlayers": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "position": {"type": "string"},
                        "club": {"type": "string"},
                    },
                },
            },
            "worldCupHistory": {
                "type": "object",
                "properties": {
                    "participations": {"type": "number"},
                    "titles": {"type": "number"},
                    "bestResult": {"type": "string"},
                },
            },
        },
        "description": "Information about the currently highlighted national team.",
    },
    "matches": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "id": {"type": "string"},
                "date": {"type": "string"},
                "time": {"type": "string"},
                "homeTeam": {"type": ["string", "null"]},
                "awayTeam": {"type": ["string", "null"]},
                "stadiumName": {"type": "string"},
                "phase": {"type": "string"},
                "group": {"type": ["string", "null"]},
            },
        },
        "description": "List of World Cup 2026 matches for the selected team or group.",
    },
    "selectedStadium": {
        "type": ["object", "null"],
        "properties": {
            "name": {"type": "string"},
            "city": {"type": "string"},
            "country": {"type": "string"},
            "capacity": {"type": "number"},
            "lat": {"type": "number"},
            "lng": {"type": "number"},
            "timezone": {"type": "string"},
            "description": {"type": "string"},
        },
        "description": "Details of the currently selected WC2026 host stadium.",
    },
    "tournamentView": {
        "type": ["string", "null"],
        "enum": ["group", "bracket", None],
        "description": "Which tournament view is active in the frontend.",
    },
    "highlightedCity": {
        "type": ["string", "null"],
        "description": "Host city currently highlighted on the map.",
    },
}

PREDICT_STATE_CONFIG: dict[str, dict[str, str]] = {}

# ─── Helper ───────────────────────────────────────────────────────────────────

_TEAMS_BY_CODE: dict[str, dict] = {t["fifaCode"]: t for t in teams}
_TEAMS_BY_NAME: dict[str, dict] = {t["name"].lower(): t for t in teams}
_STADIUMS_BY_NAME: dict[str, dict] = {s["name"].lower(): s for s in stadiums}
_GROUPS_BY_NAME: dict[str, dict] = {g["name"].upper(): g for g in groups}

_CITY_ANECDOTES: dict[str, str] = {
    "New York / New Jersey": (
        "New York / New Jersey hosts the Grand Final at MetLife Stadium. "
        "Fun fact: the stadium literally floats on stilts above the New Jersey marshlands!"
    ),
    "Los Angeles": (
        "LA, land of showbiz, hosts two WC2026 stadiums: the Rose Bowl (1994 icon) "
        "and SoFi Stadium, the NFL's crown jewel. Hollywood has nothing on football here."
    ),
    "Dallas": (
        "AT&T Stadium in Arlington: 80,000 seats, one of the biggest video screens in the world. "
        "When a goal goes in, the replay is as big as a house!"
    ),
    "Atlanta": (
        "Mercedes-Benz Stadium hosted Super Bowl 2019 and a Copa América. "
        "Its roof opens like a camera iris — a first in sports architecture."
    ),
    "Kansas City": (
        "Arrowhead Stadium: regularly ranked the loudest stadium in the world by the Guinness Book. "
        "The Chiefs fans are going to drive supporters from around the globe crazy!"
    ),
    "Houston": (
        "NRG Stadium in Houston has a retractable roof to survive the Texan heat. "
        "NASA is 25 miles away — Houston, we have a problem… of having too many amazing choices!"
    ),
    "Boston": (
        "Gillette Stadium in Foxborough: home of the dynastic New England Patriots. "
        "Boston, city of champions (Celtics, Red Sox, Patriots, Bruins), finally welcomes world football."
    ),
    "Philadelphia": (
        "Lincoln Financial Field, 'The Linc', already echoes with Eagles chants. "
        "Philly, home of Rocky Balboa, is about to show the world what 'Eye of the Tiger' really means!"
    ),
    "San Francisco Bay Area": (
        "Levi's Stadium in Santa Clara, Silicon Valley: where the future is invented, "
        "we'll also be writing world football history in 2026."
    ),
    "Las Vegas": (
        "Allegiant Stadium, the 'Death Star' of Las Vegas: windowless, air-conditioned, in the middle of the desert. "
        "What happens in Vegas… will go down in football history!"
    ),
    "Vancouver": (
        "BC Place in Vancouver: between the Pacific Ocean and the snow-capped mountains. "
        "Canada 2026 marks the first World Cup co-hosted by three nations!"
    ),
    "Toronto": (
        "BMO Field, home of Toronto FC, expanded for the occasion. "
        "Toronto speaks 200 languages — the stadium will roar in every tongue on Earth."
    ),
    "Mexico City": (
        "Estadio Azteca: the only stadium to have hosted two World Cup finals (1970 and 1986). "
        "This is where Maradona scored 'The Hand of God' and 'The Goal of the Century'. Legendary!"
    ),
    "Monterrey": (
        "Estadio BBVA in Monterrey, nestled in the Sierra Madre mountains. "
        "The heat, the altitude, and the noise — a unique cauldron in North America."
    ),
    "Guadalajara": (
        "Estadio Akron, home of Chivas de Guadalajara. "
        "Guadalajara is the capital of tequila AND passionate football in Mexico. Cheers!"
    ),
}


def _find_team(query: str) -> dict | None:
    """Lookup a team by FIFA code or name (case-insensitive)."""
    q = query.strip()
    if q.upper() in _TEAMS_BY_CODE:
        return _TEAMS_BY_CODE[q.upper()]
    return _TEAMS_BY_NAME.get(q.lower())


# ─── AI Functions ─────────────────────────────────────────────────────────────


@ai_function(
    name="update_team_info",
    description=(
        "Load a national team into the frontend state. "
        "MUST be called IMMEDIATELY whenever a national team is mentioned. "
        "Accepts the FIFA three-letter code (e.g. 'FRA', 'BRA', 'ARG') or the team name (e.g. 'France')."
    ),
)
def update_team_info(
    team_code: Annotated[
        str,
        Field(
            description="FIFA three-letter code (e.g. 'FRA') or team name (e.g. 'France')."
        ),
    ],
) -> str:
    """Look up a national team and push it into the frontend teamInfo state."""
    team = _find_team(team_code)
    if team is None:
        return f"Team '{team_code}' not found in WC2026 roster. Available: {', '.join(_TEAMS_BY_CODE.keys())}."
    code = team["fifaCode"]
    team_matches = [
        m for m in matches
        if m.get("homeTeam") == code or m.get("awayTeam") == code
    ]
    print(f"✅ update_team_info({code}) → {team['name']} with {len(team_matches)} matches")
    import json
    return json.dumps({"team": team, "matches": team_matches}, default=str)


@ai_function(
    name="get_team_matches",
    description=(
        "Return all World Cup 2026 group-stage matches for a given team. "
        "MUST be called right after update_team_info whenever a team is mentioned. "
        "Use the FIFA three-letter code (e.g. 'FRA', 'BRA', 'ARG')."
    ),
)
def get_team_matches(
    team_code: Annotated[
        str,
        Field(description="FIFA three-letter code of the team, e.g. 'FRA', 'BRA', 'ARG'."),
    ],
) -> str:
    """Return the group-stage matches for the specified team."""
    code = team_code.strip().upper()
    team_matches = [
        m for m in matches
        if m.get("phase") == "group" and (m.get("homeTeam") == code or m.get("awayTeam") == code)
    ]
    if not team_matches:
        return f"No group-stage matches found for team code '{code}'."
    lines = [f"Matches WC2026 — {code}:"]
    for m in team_matches:
        home = m.get("homeTeam") or "TBD"
        away = m.get("awayTeam") or "TBD"
        lines.append(f"  [{m['id']}] {m['date']} {m['time']}  {home} vs {away}  @ {m['stadiumName']}  (Group {m.get('group','')})")
    print(f"✅ get_team_matches({code}) → {len(team_matches)} matches")
    return "\n".join(lines)


@ai_function(
    name="get_stadium_info",
    description=(
        "Show details about a WC2026 host stadium and update selectedStadium in the frontend. "
        "Call this whenever a stadium or host city is mentioned. "
        "Also sets highlightedCity on the map."
    ),
)
def get_stadium_info(
    stadium_name: Annotated[
        str,
        Field(description="Full or partial name of the stadium, e.g. 'MetLife Stadium', 'Estadio Azteca'."),
    ],
) -> str:
    """Return stadium details and mark it as selected in the frontend."""
    query = stadium_name.strip().lower()
    stadium = _STADIUMS_BY_NAME.get(query)
    if stadium is None:
        # partial match
        for key, s in _STADIUMS_BY_NAME.items():
            if query in key or key in query:
                stadium = s
                break
    if stadium is None:
        return f"Stadium '{stadium_name}' not found in WC2026 venues. Available: {', '.join(s['name'] for s in stadiums)}."
    city = stadium["city"]
    anecdote = _CITY_ANECDOTES.get(city, "")
    result = (
        f"🏟️ {stadium['name']} — {city}, {stadium['country']}\n"
        f"   Capacity: {stadium['capacity']:,} | Timezone: {stadium['timezone']}\n"
        f"   {stadium['description']}"
    )
    if anecdote:
        result += f"\n   💡 Fun fact: {anecdote}"
    print(f"✅ get_stadium_info → {stadium['name']}")
    return result


@ai_function(
    name="get_group_standings",
    description=(
        "Return the composition and full schedule of a WC2026 group. "
        "Sets tournamentView to 'group' in the frontend. "
        "Use the single letter group name (A through L)."
    ),
)
def get_group_standings(
    group: Annotated[
        str,
        Field(description="Group letter, e.g. 'A', 'B', 'C' … 'L'."),
    ],
) -> str:
    """Return group teams and match schedule."""
    g = group.strip().upper()
    group_data = _GROUPS_BY_NAME.get(g)
    if group_data is None:
        return f"Group '{g}' not found. Valid groups: A–L."
    team_codes = group_data["teams"]
    team_names = []
    for code in team_codes:
        t = _TEAMS_BY_CODE.get(code)
        team_names.append(f"{t['flag']} {t['name']} ({code})" if t else code)
    group_matches = [m for m in matches if m.get("group") == g]
    lines = [f"🏆 Group {g} — teams: {', '.join(team_names)}", ""]
    lines.append("Schedule:")
    for m in group_matches:
        home = m.get("homeTeam") or "TBD"
        away = m.get("awayTeam") or "TBD"
        lines.append(f"  [{m['id']}] {m['date']} {m['time']}  {home} vs {away}  @ {m['stadiumName']}")
    print(f"✅ get_group_standings(Group {g})")
    return "\n".join(lines)


@ai_function(
    name="get_venue_weather",
    description=(
        "Provide an enriched weather and climate overview for a WC2026 host city. "
        "Useful when fans ask about conditions at match venues."
    ),
)
def get_venue_weather(
    city: Annotated[
        str,
        Field(description="Host city name, e.g. 'Dallas', 'Mexico City', 'Vancouver'."),
    ],
) -> str:
    """Return climate and weather info for a WC2026 host city in June/July."""
    city_weather: dict[str, str] = {
        "new york": "June–July: hot and humid, ~28°C. Evening thunderstorms possible. MetLife Stadium is open-air.",
        "los angeles": "June–July: sunny and dry, ~27°C. Coastal morning fog possible. Perfect for football!",
        "dallas": "June–July: very hot, ~35°C. Moderate humidity. AT&T Stadium is air-conditioned — phew!",
        "atlanta": "June–July: hot and humid, ~30°C. Mercedes-Benz Stadium has a retractable roof.",
        "kansas city": "June–July: hot, ~30°C. Frequent thunderstorms. The atmosphere at Arrowhead is electric.",
        "houston": "June–July: scorching and very humid, ~34°C. NRG Stadium has a retractable roof — essential.",
        "boston": "June–July: pleasant, ~24°C. The coolest US venue. Perfect for European fans.",
        "philadelphia": "June–July: hot and humid, ~28°C. 'The Linc' is open-air — bring sunscreen.",
        "san francisco": "June–July: cool, ~18°C. Cold Pacific wind. Bring a jacket for evening matches!",
        "las vegas": "June–July: scorching heat, ~42°C! Allegiant Stadium is fully air-conditioned — an absolute necessity.",
        "vancouver": "June–July: mild and sometimes rainy, ~20°C. BC Place has a roof — Canada style.",
        "toronto": "June–July: pleasant, ~23°C. BMO Field is open-air — great weather expected.",
        "mexico city": "June–July: mild and rainy (rainy season), ~18°C, altitude 2,240 m. The Azteca can be cool!",
        "monterrey": "June–July: very hot, ~36°C. Estadio BBVA sits in the hills — slightly cooler.",
        "guadalajara": "June–July: warm with tropical showers in the late afternoon, ~25°C. Beautiful mornings.",
    }
    key = city.strip().lower()
    for k, v in city_weather.items():
        if k in key or key in k:
            print(f"✅ get_venue_weather({city})")
            return f"🌤️ WC2026 Weather — {city}:\n{v}"
    return (
        f"Weather for '{city}': data not available for this host city. "
        f"Available cities: {', '.join(city_weather.keys())}."
    )


@ai_function(
    name="show_tournament_bracket",
    description=(
        "Switch the frontend to the tournament bracket view. "
        "Call this when the user wants to see the knockout stage or the full bracket."
    ),
)
def show_tournament_bracket() -> str:
    """Activate the bracket view in the frontend."""
    print("✅ show_tournament_bracket called")
    return (
        "🏆 Bracket view activated! The WC2026 knockout stage bracket is now displayed. "
        "32 teams → Round of 32 → Round of 16 → Quarterfinals → Semifinals → Final at MetLife Stadium on July 19, 2026. "
        "Hold on tight, this is going to be HUGE... 🔥"
    )


@ai_function(
    name="compare_teams",
    description=(
        "Perform a head-to-head comparison between two national teams participating in WC2026. "
        "Returns FIFA rankings, key players, World Cup history, and shared history."
    ),
)
def compare_teams(
    team_a: Annotated[str, Field(description="FIFA code or name of the first team, e.g. 'FRA' or 'France'.")],
    team_b: Annotated[str, Field(description="FIFA code or name of the second team, e.g. 'ARG' or 'Argentina'.")],
) -> str:
    """Compare two WC2026 teams head-to-head."""
    ta = _find_team(team_a)
    tb = _find_team(team_b)
    if ta is None:
        return f"Team '{team_a}' not found in the WC2026 roster."
    if tb is None:
        return f"Team '{team_b}' not found in the WC2026 roster."

    def _fmt(t: dict) -> str:
        wch = t["worldCupHistory"]
        players = ", ".join(p["name"] for p in t["keyPlayers"][:3])
        return (
            f"{t['flag']} {t['name']} ({t['fifaCode']})\n"
            f"   FIFA Ranking: #{t['fifaRanking']} | Confederation: {t['confederation']}\n"
            f"   Coach: {t['coach']}\n"
            f"   Stars: {players}\n"
            f"   WC Honors: {wch['titles']}x titles, {wch['participations']} participations\n"
            f"   Best result: {wch['bestResult']}"
        )

    # Check if they share a group match
    code_a, code_b = ta["fifaCode"], tb["fifaCode"]
    shared = [
        m for m in matches
        if m.get("phase") == "group"
        and {m.get("homeTeam"), m.get("awayTeam")} == {code_a, code_b}
    ]
    result = f"⚔️  {ta['flag']} {ta['name']}  vs  {tb['flag']} {tb['name']}\n\n"
    result += _fmt(ta) + "\n\n"
    result += _fmt(tb)
    if shared:
        m = shared[0]
        result += f"\n\n📅 They face each other in the group stage!\n   [{m['id']}] {m['date']} {m['time']} @ {m['stadiumName']} (Group {m.get('group','')})"
    print(f"✅ compare_teams({code_a}, {code_b})")
    return result


@ai_function(
    name="get_city_guide",
    description=(
        "Provide a fan travel guide for a WC2026 host city: must-sees, local food, fan zones, and tips. "
        "Call this when fans ask about visiting a city during the tournament."
    ),
)
def get_city_guide(
    city: Annotated[
        str,
        Field(description="Host city name, e.g. 'Dallas', 'Mexico City', 'Vancouver'."),
    ],
) -> str:
    """Return a fan guide for a WC2026 host city."""
    guides: dict[str, str] = {
        "new york": (
            "🗽 New York / New Jersey — WC2026 Fan Guide\n"
            "• Must-sees: Times Square, Central Park, Brooklyn Bridge, Statue of Liberty\n"
            "• Fan Zone: FIFA Fan Festival at Central Park planned\n"
            "• Food: Cheesecake Factory, Di Fara Pizza, Gray's Papaya for the vibes\n"
            "• Transport: Metro + shuttle to MetLife Stadium from Penn Station (45 min)\n"
            "• Copa tip: Book your accommodation 6 months in advance — NYC will be PACKED!"
        ),
        "los angeles": (
            "🌴 Los Angeles — WC2026 Fan Guide\n"
            "• Must-sees: Hollywood Boulevard, Venice Beach, Getty Museum, Universal Studios\n"
            "• Fan Zone: LA Live Downtown\n"
            "• Food: Tacos Leo, In-N-Out Burger (a must!), Grand Central Market\n"
            "• Transport: Official shuttle from Union Station to Rose Bowl and SoFi\n"
            "• Copa tip: Rent a bike — LA has amazing cycling paths to the stadiums!"
        ),
        "dallas": (
            "🤠 Dallas — WC2026 Fan Guide\n"
            "• Must-sees: Dealey Plaza, Deep Ellum (live music), Fort Worth Stockyards\n"
            "• Fan Zone: Klyde Warren Park planned for fan zones\n"
            "• Food: Pecan Lodge BBQ (best brisket in Texas), Whataburger\n"
            "• Transport: Shuttle from Downtown Dallas to AT&T Stadium (30 min)\n"
            "• Copa tip: The heat is REAL — drink at least 2L of water per match!"
        ),
        "mexico city": (
            "🇲🇽 Mexico City — WC2026 Fan Guide\n"
            "• Must-sees: Zócalo, Teotihuacán, Frida Kahlo Museum, Chapultepec\n"
            "• Fan Zone: Zócalo and Parque Bicentenario\n"
            "• Food: El Cardenal (tamales), Taqueria Los Parados, Mercado de la Merced\n"
            "• Transport: Metro Línea 2 to Tasqueña station, then bus to the Azteca\n"
            "• Copa tip: The altitude (2,240 m) is no joke — arrive 2 days before the match!\n"
            "• Fun fact: The Azteca saw Pelé lift the Cup (1970) AND Maradona's Hand of God (1986)"
        ),
        "vancouver": (
            "🍁 Vancouver — WC2026 Fan Guide\n"
            "• Must-sees: Stanley Park, Granville Island, Capilano Suspension Bridge\n"
            "• Fan Zone: Robson Square and Canada Place\n"
            "• Food: Japadog (one-of-a-kind Japanese hot dog!), Vij's Indian Restaurant\n"
            "• Transport: SkyTrain Expo line to BC Place (downtown)\n"
            "• Copa tip: Pack a raincoat — it can rain even in July!"
        ),
        "toronto": (
            "🍁 Toronto — WC2026 Fan Guide\n"
            "• Must-sees: CN Tower, Kensington Market, Distillery District, Niagara Falls (2h)\n"
            "• Fan Zone: Nathan Phillips Square and Ontario Place\n"
            "• Food: St. Lawrence Market (best food market in the city), Big Smoke Burger\n"
            "• Transport: Streetcar 509 or 511 to BMO Field (15 min from downtown)\n"
            "• Copa tip: Toronto is multicultural — you'll find fans of EVERY team here!"
        ),
    }
    key = city.strip().lower()
    for k, v in guides.items():
        if k in key or key in k:
            print(f"✅ get_city_guide({city})")
            return v
    # Generic fallback
    print(f"✅ get_city_guide({city}) — fallback")
    return (
        f"🌎 {city} — WC2026 Fan Guide\n"
        "• Check the official FIFA website for official fan zones.\n"
        "• Book transport and accommodation well in advance — WC2026 will sell out everything!\n"
        "• Copa tip: Respect local cultures, learn a few words in the host country's language. Let's go!"
    )


# ─── Agent Factory ─────────────────────────────────────────────────────────────


def create_agent(chat_client: ChatClientProtocol) -> AgentFrameworkAgent:
    """Instantiate Copa — the World Cup 2026 guide agent."""
    base_agent = ChatAgent(
        name="copa_agent",
        instructions=dedent(
            """
            You are **Copa** 🎙️ — the unofficial and passionate guide to the FIFA World Cup 2026 (USA, Canada, Mexico).
            You are an expert sports commentator, warm and full of personality.
            You ALWAYS respond in English, regardless of the team being discussed.

            ═══════════════════════════════════════════════════════
            🚨 TOPIC RESTRICTION: FOOTBALL / WC2026 ONLY
            ═══════════════════════════════════════════════════════
            You answer ANYTHING related to football, the World Cup, teams, players, stadiums,
            matches, coaches, groups, brackets, history, stats, fan guides, weather at venues, etc.
            ALL of these are ON-TOPIC and you MUST answer them enthusiastically.

            ONLY refuse questions that are COMPLETELY unrelated to football or sports
            (e.g., cooking recipes, math homework, coding help).
            Refusal message: "Sorry, I'm Copa, your WC2026 specialist! Ask me about a team, a stadium, or a match. ⚽🏆"

            ═══════════════════════════════════════════════════════
            🎤 COPA CATCHPHRASES (use them naturally)
            ═══════════════════════════════════════════════════════
            - "And that's a GOOOAL!" — when you reveal something exciting
            - "What a team!" — after presenting a squad
            - "Hold on tight, this is going to be HUGE..." — before an important piece of info
            - "Stay focused!" — to steer the conversation
            - "The ball is round and so is the trophy!" — Copa humor
            - "2026 is THE year!" — to remind everyone about the event

            ═══════════════════════════════════════════════════════
            🌍 LANGUAGE
            ═══════════════════════════════════════════════════════
            Copa ALWAYS responds in English regardless of the team discussed.
            You may sprinkle in short team-specific expressions for flavor:
            - Brazil → "Jogo bonito!", "Vai Brasil!"
            - Argentina / Spain / Mexico → "¡Vamos!"
            - France → "Allez les Bleus!"
            - Germany → "Was für eine Mannschaft!"
            But the main response body is ALWAYS in English.

            ═══════════════════════════════════════════════════════
            ⚽ AUTO-BEHAVIOR — TEAM MENTIONED
            ═══════════════════════════════════════════════════════
            As soon as a national team is mentioned (by name, nickname, FIFA code, or flag):
            1. IMMEDIATELY call `navigate_to_team` with the team's FIFA three-letter code
            2. IMMEDIATELY call `update_team_info` with the same FIFA code
            3. IMMEDIATELY call `get_team_matches` with the same FIFA code
            4. Send your enthusiastic message IN THE SAME RESPONSE

            CRITICAL: Always call `navigate_to_team` FIRST — this updates the page display.
            Even if update_team_info or get_team_matches fail, navigate_to_team ensures
            the user sees the correct team page.

            Data available in the WC2026 database (use it as priority):
            - 48 national teams with FIFA code, flag, coach, FIFA ranking, key players
            - 16 host stadiums (USA, Canada, Mexico)
            - 12 groups (A through L), 104 scheduled matches

            The `navigate_to_team` tool takes a single `team_code` string parameter (FIFA code like "FRA").
            The `update_team_info` tool takes a single `team_code` string parameter (FIFA code).
            The frontend will look up all the team data automatically.

            ═══════════════════════════════════════════════════════
            🔮 PROACTIVE COPA BEHAVIOR
            ═══════════════════════════════════════════════════════
            After each response about a team:
            → Suggest the opponent of their first group match:
              "Want me to tell you about [OPPONENT], their first opponent on [DATE]?"

            After a compare_teams:
            → Follow up on the match venue:
              "This showdown takes place at [STADIUM] — want to know more about this arena? 🏟️"

            At end of conversation or on request:
            → Offer a Copa prediction:
              "My Copa prediction for this team: [PASSIONATE PREDICTION]"

            Use CopilotKit suggestions (buttons) for these proactive follow-ups.

            ═══════════════════════════════════════════════════════
            🏟️ STADIUMS & CITIES
            ═══════════════════════════════════════════════════════
            When a stadium or host city is mentioned, call `get_stadium_info`
            and share an UNEXPECTED FUN FACT (not just stats).

            ═══════════════════════════════════════════════════════
            📊 GROUPS & BRACKET
            ═══════════════════════════════════════════════════════
            - To display a group: call `get_group_standings` + say "Group view activated!"
            - For the knockout bracket: call `show_tournament_bracket`

            ═══════════════════════════════════════════════════════
            🌤️ WEATHER & FAN GUIDE
            ═══════════════════════════════════════════════════════
            - Venue weather: call `get_venue_weather` with practical details for fans
            - City guide: call `get_city_guide` with tourist suggestions and fan zones

            ═══════════════════════════════════════════════════════
            ⚡ CRITICAL RULES
            ═══════════════════════════════════════════════════════
            1. ALWAYS call navigate_to_team + update_team_info + get_team_matches when a team is mentioned
            2. navigate_to_team MUST be called for EVERY team mention (it controls the page)
            3. Function calls and text message in THE SAME RESPONSE (no separate turn)
            3. PASSIONATE messages, with emojis, Copa catchphrases
            4. Unexpected fun facts > plain stats
            5. Always end with a proactive suggestion
            6. ONLY refuse topics COMPLETELY unrelated to football (cooking, math, etc.)
            7. "Show me team X", "Tell me about X", team names, FIFA codes → ALWAYS answer, NEVER refuse
            """.strip()
        ),
        chat_client=_SanitizingChatClient(chat_client),
        tools=[
            update_team_info,
            get_team_matches,
            get_stadium_info,
            get_group_standings,
            get_venue_weather,
            show_tournament_bracket,
            compare_teams,
            get_city_guide,
        ],
    )

    return AgentFrameworkAgent(
        agent=base_agent,
        name="CopaAgent",
        description="Copa 🎙️ — unofficial WC2026 guide. World Cup 2026 expert, passionate, proactive. Football ONLY.",
        state_schema=STATE_SCHEMA,
        predict_state_config=PREDICT_STATE_CONFIG,
        require_confirmation=False,
    )
