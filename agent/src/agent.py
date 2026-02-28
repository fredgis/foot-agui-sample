from __future__ import annotations

from textwrap import dedent
from typing import Annotated

from agent_framework import ChatAgent, ChatClientProtocol, ai_function
from agent_framework_ag_ui import AgentFrameworkAgent
from pydantic import Field

from data.worldcup2026 import groups, matches, stadiums, teams

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
                "group": {"type": "string"},
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

PREDICT_STATE_CONFIG: dict[str, dict[str, str]] = {
    "teamInfo": {
        "tool": "update_team_info",
        "tool_argument": "team_info",
    },
    "matches": {
        "tool": "get_team_matches",
        "tool_argument": "team_code",
    },
    "selectedStadium": {
        "tool": "get_stadium_info",
        "tool_argument": "stadium_name",
    },
}

# ─── Helper ───────────────────────────────────────────────────────────────────

_TEAMS_BY_CODE: dict[str, dict] = {t["fifaCode"]: t for t in teams}
_TEAMS_BY_NAME: dict[str, dict] = {t["name"].lower(): t for t in teams}
_STADIUMS_BY_NAME: dict[str, dict] = {s["name"].lower(): s for s in stadiums}
_GROUPS_BY_NAME: dict[str, dict] = {g["name"].upper(): g for g in groups}

_CITY_ANECDOTES: dict[str, str] = {
    "New York / New Jersey": (
        "New York / New Jersey accueille la Grande Finale à MetLife Stadium. "
        "Fun fact : le stade flotte littéralement sur des pilotis au-dessus des marais du New Jersey !"
    ),
    "Los Angeles": (
        "LA, terre du show-biz, accueille deux stades WC2026 : le Rose Bowl (icône de 1994) "
        "et SoFi Stadium, le bijou de la NFL. Hollywood n'a rien à envier au football ici."
    ),
    "Dallas": (
        "AT&T Stadium à Arlington : 80 000 places, l'un des plus grands écrans vidéo au monde. "
        "Quand le but rentre, l'image est grande comme une maison !"
    ),
    "Atlanta": (
        "Mercedes-Benz Stadium a accueilli le Super Bowl 2019 et une Copa América. "
        "Son toit s'ouvre comme un iris de caméra — du jamais vu en architecture sportive."
    ),
    "Kansas City": (
        "Arrowhead Stadium : régulièrement classé stade le plus bruyant au monde par le Livre Guinness. "
        "Les fans des Chiefs vont rendre fous les supporters du monde entier !"
    ),
    "Houston": (
        "NRG Stadium à Houston dispose d'un toit rétractable pour survivre à la chaleur texane. "
        "La NASA est à 40 km — Houston, on a un problème… de choix tellement c'est beau !"
    ),
    "Boston": (
        "Gillette Stadium à Foxborough : terrain du dynastique New England Patriots. "
        "Boston, ville de champions (Celtics, Red Sox, Patriots, Bruins) accueille enfin le foot mondial."
    ),
    "Philadelphia": (
        "Lincoln Financial Field, 'The Linc', résonne déjà des chants des Eagles. "
        "Philly, ville de Rocky Balboa, va montrer au monde ce que 'Eye of the Tiger' veut dire !"
    ),
    "San Francisco Bay Area": (
        "Levi's Stadium à Santa Clara, Silicon Valley : là où on invente le futur, "
        "on va aussi écrire l'histoire du football mondial en 2026."
    ),
    "Las Vegas": (
        "Allegiant Stadium, le 'Death Star' de Las Vegas : sans fenêtres, climatisé, au milieu du désert. "
        "Ce qui se passe à Vegas… restera dans les annales du football !"
    ),
    "Vancouver": (
        "BC Place à Vancouver : entre l'océan Pacifique et les montagnes enneigées. "
        "Le Canada 2026, c'est la première Coupe du Monde co-organisée par trois nations !"
    ),
    "Toronto": (
        "BMO Field, maison de Toronto FC, élargi pour l'occasion. "
        "Toronto parle 200 langues — le stade va vibrer en toutes les langues du monde."
    ),
    "Mexico City": (
        "L'Estadio Azteca : le seul stade à avoir accueilli deux finales de Coupe du Monde (1970 et 1986). "
        "C'est là que Maradona a marqué 'La Main de Dieu' et 'Le But du Siècle'. Sacré !"
    ),
    "Monterrey": (
        "L'Estadio BBVA à Monterrey, niché dans les montagnes de la Sierra Madre. "
        "La chaleur, l'altitude et le bruit — un chaudron unique en Amérique du Nord."
    ),
    "Guadalajara": (
        "L'Estadio Akron, maison des Chivas de Guadalajara. "
        "Guadalajara est la capitale de la tequila ET du football passionné au Mexique. Salud !"
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
        "Accepts either the FIFA code (e.g. 'FRA') or the team name (e.g. 'France')."
    ),
)
def update_team_info(
    team_info: Annotated[
        dict | None,
        Field(
            description=(
                "Complete TeamInfo object for the national team "
                "(name, fifaCode, flag, confederation, fifaRanking, primaryColor, secondaryColor, "
                "coach, keyPlayers, worldCupHistory). Set to null to clear."
            )
        ),
    ],
) -> str:
    """Push national team data into the frontend teamInfo state."""
    print(f"🔔 UPDATE_TEAM_INFO called: {team_info}")
    if team_info is None:
        return "Team information cleared."
    name = team_info.get("name", "the team")
    print(f"✅ teamInfo → {name}")
    return f"✅ Team info updated for {name}. The frontend now displays their colors and squad."


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
        f"   Capacité : {stadium['capacity']:,} | Timezone : {stadium['timezone']}\n"
        f"   {stadium['description']}"
    )
    if anecdote:
        result += f"\n   💡 Anecdote : {anecdote}"
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
    lines = [f"🏆 Groupe {g} — équipes : {', '.join(team_names)}", ""]
    lines.append("Calendrier :")
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
        "new york": "Juin–juillet : chaud et humide, ~28°C. Orages possibles en soirée. MetLife Stadium est à l'air libre.",
        "los angeles": "Juin–juillet : ensoleillé et sec, ~27°C. Brouillard matinal côtier possible. Parfait pour le foot !",
        "dallas": "Juin–juillet : très chaud, ~35°C. Humidité modérée. AT&T Stadium est climatisé — ouf !",
        "atlanta": "Juin–juillet : chaud et humide, ~30°C. Mercedes-Benz Stadium a un toit rétractable.",
        "kansas city": "Juin–juillet : chaud, ~30°C. Orages fréquents. L'atmosphère à Arrowhead est électrique.",
        "houston": "Juin–juillet : torride et très humide, ~34°C. NRG Stadium avec toit rétractable — indispensable.",
        "boston": "Juin–juillet : agréable, ~24°C. Le plus frais des sites US. Parfait pour les fans européens.",
        "philadelphia": "Juin–juillet : chaud et humide, ~28°C. 'The Linc' est à l'air libre — prévoir la crème solaire.",
        "san francisco": "Juin–juillet : frais, ~18°C. Vent froid du Pacifique. Prévoyez une veste pour les matches du soir !",
        "las vegas": "Juin–juillet : canicule, ~42°C ! Allegiant Stadium est entièrement climatisé — une nécessité absolue.",
        "vancouver": "Juin–juillet : doux et parfois pluvieux, ~20°C. BC Place a un toit — Canada oblige.",
        "toronto": "Juin–juillet : agréable, ~23°C. BMO Field est à l'air libre — belle météo attendue.",
        "mexico city": "Juin–juillet : tempéré et pluvieux (saison des pluies), ~18°C, altitude 2 240 m. L'Azteca peut être frais !",
        "monterrey": "Juin–juillet : très chaud, ~36°C. L'Estadio BBVA est dans les collines — légèrement plus frais.",
        "guadalajara": "Juin–juillet : chaud avec pluies tropicales en fin de journée, ~25°C. Beau temps le matin.",
    }
    key = city.strip().lower()
    for k, v in city_weather.items():
        if k in key or key in k:
            print(f"✅ get_venue_weather({city})")
            return f"🌤️ Météo WC2026 — {city} :\n{v}"
    return (
        f"Météo pour '{city}' : données non disponibles pour cette ville hôte. "
        f"Villes disponibles : {', '.join(city_weather.keys())}."
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
        "🏆 Vue bracket activée ! Le tableau des phases finales de la WC2026 est maintenant affiché. "
        "32 équipes → Round of 32 → Round of 16 → Quarts → Demies → Finale à MetLife Stadium le 19 juillet 2026. "
        "Attention, ça va être du lourd... 🔥"
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
        return f"Équipe '{team_a}' introuvable dans le roster WC2026."
    if tb is None:
        return f"Équipe '{team_b}' introuvable dans le roster WC2026."

    def _fmt(t: dict) -> str:
        wch = t["worldCupHistory"]
        players = ", ".join(p["name"] for p in t["keyPlayers"][:3])
        return (
            f"{t['flag']} {t['name']} ({t['fifaCode']})\n"
            f"   FIFA Ranking : #{t['fifaRanking']} | Confédération : {t['confederation']}\n"
            f"   Coach : {t['coach']}\n"
            f"   Stars : {players}\n"
            f"   Palmarès WC : {wch['titles']}x titres, {wch['participations']} participations\n"
            f"   Meilleur résultat : {wch['bestResult']}"
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
        result += f"\n\n📅 Ils se retrouvent en phase de groupes !\n   [{m['id']}] {m['date']} {m['time']} @ {m['stadiumName']} (Groupe {m.get('group','')})"
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
            "🗽 New York / New Jersey — Guide Fan WC2026\n"
            "• Incontournables : Times Square, Central Park, Brooklyn Bridge, Statue de la Liberté\n"
            "• Fan Zone : FIFA Fan Festival à Central Park prévu\n"
            "• Resto : Cheesecake Factory, Di Fara Pizza, Gray's Papaya pour l'ambiance\n"
            "• Transport : Metro + navette vers MetLife Stadium depuis Penn Station (45 min)\n"
            "• Conseil Copa : Réservez votre hébergement 6 mois à l'avance — NYC sera blindée !"
        ),
        "los angeles": (
            "🌴 Los Angeles — Guide Fan WC2026\n"
            "• Incontournables : Hollywood Boulevard, Venice Beach, Getty Museum, Universal Studios\n"
            "• Fan Zone : LA Live Downtown\n"
            "• Resto : Tacos Leo, In-N-Out Burger (incontournable), Grand Central Market\n"
            "• Transport : Navette officielle depuis Union Station vers Rose Bowl et SoFi\n"
            "• Conseil Copa : Louez un vélo — LA a de superbes pistes cyclables vers les stades !"
        ),
        "dallas": (
            "🤠 Dallas — Guide Fan WC2026\n"
            "• Incontournables : Dealey Plaza, Deep Ellum (musique live), Fort Worth Stockyards\n"
            "• Fan Zone : Klyde Warren Park prévu pour les fan zones\n"
            "• Resto : Pecan Lodge BBQ (le meilleur brisket du Texas), Whataburger\n"
            "• Transport : Navette depuis Downtown Dallas vers AT&T Stadium (30 min)\n"
            "• Conseil Copa : La chaleur est RÉELLE — boire au moins 2L d'eau par match !"
        ),
        "mexico city": (
            "🇲🇽 Mexico City — Guide Fan WC2026\n"
            "• Incontournables : Zócalo, Teotihuacán, Frida Kahlo Museum, Chapultepec\n"
            "• Fan Zone : Zócalo et Parque Bicentenario\n"
            "• Resto : El Cardenal (tamales), Taqueria Los Parados, Mercado de la Merced\n"
            "• Transport : Métro Línea 2 jusqu'à la station Tasqueña, puis bus vers l'Azteca\n"
            "• Conseil Copa : L'altitude (2 240 m) essoufle — arrivez 2 jours avant le match !\n"
            "• Anecdote : L'Azteca a vu Pelé soulever la Coupe (1970) ET Maradona la Main de Dieu (1986)"
        ),
        "vancouver": (
            "🍁 Vancouver — Guide Fan WC2026\n"
            "• Incontournables : Stanley Park, Granville Island, Capilano Suspension Bridge\n"
            "• Fan Zone : Robson Square et Canada Place\n"
            "• Resto : Japadog (hot-dog japonais unique au monde !), Vij's Indian Restaurant\n"
            "• Transport : SkyTrain ligne Expo jusqu'à BC Place (centre-ville)\n"
            "• Conseil Copa : Prévoyez un imperméable — il peut pleuvoir même en juillet !"
        ),
        "toronto": (
            "🍁 Toronto — Guide Fan WC2026\n"
            "• Incontournables : CN Tower, Kensington Market, Distillery District, Niagara Falls (2h)\n"
            "• Fan Zone : Nathan Phillips Square et Ontario Place\n"
            "• Resto : St. Lawrence Market (le meilleur marché food de la ville), Big Smoke Burger\n"
            "• Transport : Streetcar 509 ou 511 jusqu'à BMO Field (15 min depuis le centre)\n"
            "• Conseil Copa : Toronto est multiculturelle — vous trouverez des supporters de TOUTES les équipes !"
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
        f"🌎 {city} — Guide Fan WC2026\n"
        "• Consultez le site officiel FIFA pour les fan zones officielles.\n"
        "• Réservez transport et hébergement bien à l'avance — la WC2026 va tout saturer !\n"
        "• Conseil Copa : Respectez les cultures locales, apprenez quelques mots dans la langue du pays hôte. ¡Vamos !"
    )


# ─── Agent Factory ─────────────────────────────────────────────────────────────


def create_agent(chat_client: ChatClientProtocol) -> AgentFrameworkAgent:
    """Instantiate Copa — the World Cup 2026 guide agent."""
    base_agent = ChatAgent(
        name="copa_agent",
        instructions=dedent(
            """
            Tu es **Copa** 🎙️ — le guide officieux et passionné de la FIFA World Cup 2026 (USA, Canada, Mexique).
            Tu es un commentateur sportif expert, chaleureux, avec une vraie personnalité.

            ═══════════════════════════════════════════════════════
            🚨 RESTRICTION ABSOLUE — SUJET UNIQUE : FOOTBALL / WC2026
            ═══════════════════════════════════════════════════════
            Tu REFUSES poliment toute question hors football / Coupe du Monde 2026 :
            → "Désolé, je suis Copa, spécialiste WC2026 ! Parle-moi d'une équipe, d'un stade ou d'un match. Et c'est le but... de ma mission ! ⚽🏆"

            ═══════════════════════════════════════════════════════
            🎤 TICS DE LANGAGE COPA (utilise-les naturellement)
            ═══════════════════════════════════════════════════════
            - « Et c'est le but ! » — quand tu révèles quelque chose d'excitant
            - « Quelle équipe ! » — après avoir présenté une sélection
            - « Attention, ça va être du lourd... » — avant une info importante
            - « On reste concentrés ! » — pour cadrer la conversation
            - « Le ballon est rond et la finale est ronde aussi ! » — humour Copa
            - « 2026, c'est l'année ! » — pour rappeler l'événement

            ═══════════════════════════════════════════════════════
            🌍 ADAPTATION LINGUISTIQUE PAR ÉQUIPE
            ═══════════════════════════════════════════════════════
            - France / Belgique / Maroc → Français avec enthousiasme (« Allez les Bleus ! »)
            - Brésil → mots portugais : « Que seleção incrível ! », « Jogo bonito ! », « Vai Brasil ! »
            - Argentine / Espagne / Mexique / Uruguay / Colombie → espagnol : « ¡Qué equipazo! », « ¡Vamos! »
            - Angleterre / USA / Australie → anglais : « What a team! », « Brilliant! »
            - Allemagne → « Was für eine Mannschaft! »
            - Par défaut → Français

            ═══════════════════════════════════════════════════════
            ⚽ COMPORTEMENT AUTOMATIQUE — ÉQUIPE MENTIONNÉE
            ═══════════════════════════════════════════════════════
            Dès qu'une équipe nationale est mentionnée (par nom, surnom, code FIFA ou drapeau) :
            1. Appelle IMMÉDIATEMENT `update_team_info` avec les données complètes de l'équipe
            2. Appelle IMMÉDIATEMENT `get_team_matches` avec le code FIFA de l'équipe
            3. Envoie ton message enthousiaste DANS LA MÊME RÉPONSE

            Données disponibles dans la base WC2026 (utilise-les en priorité) :
            - 48 équipes nationales avec FIFA code, flag, coach, classement FIFA, joueurs clés
            - 16 stades hôtes (USA, Canada, Mexique)
            - 12 groupes (A à L), 104 matchs programmés
            
            Utilise `update_team_info` avec les données EXACTES de la base de données WC2026. Par exemple :
            - France : fifaCode="FRA", flag="🇫🇷", confederation="UEFA", fifaRanking=2, primaryColor="#0055A4"
            - Brazil : fifaCode="BRA", flag="🇧🇷", confederation="CONMEBOL", fifaRanking=4, primaryColor="#009C3B"
            - Argentina : fifaCode="ARG", flag="🇦🇷", confederation="CONMEBOL", fifaRanking=1, primaryColor="#74ACDF"

            ═══════════════════════════════════════════════════════
            🔮 COMPORTEMENT PROACTIF COPA
            ═══════════════════════════════════════════════════════
            Après chaque réponse sur une équipe :
            → Suggère l'adversaire du premier match de groupe : 
              "Tu veux que je te parle de [ADVERSAIRE], leur premier adversaire le [DATE] ?"
            
            Après un compare_teams :
            → Rebondis sur le lieu du match :
              "Ce duel se jouera à [STADE] — tu veux en savoir plus sur cette arène ? 🏟️"
            
            En fin de conversation ou sur demande :
            → Propose un pronostic Copa :
              "Mon pronostic Copa pour cette équipe : [PRONOSTIC PASSIONNÉ]"
            
            Utilise les suggestions CopilotKit (boutons) pour ces rebonds proactifs.

            ═══════════════════════════════════════════════════════
            🏟️ STADES & VILLES
            ═══════════════════════════════════════════════════════
            Quand un stade ou une ville hôte est mentionné, appelle `get_stadium_info` 
            et partage une ANECDOTE inattendue (pas juste des stats).

            ═══════════════════════════════════════════════════════
            📊 GROUPES & BRACKET
            ═══════════════════════════════════════════════════════
            - Pour afficher un groupe : appelle `get_group_standings` + dis "Vue groupe activée !"
            - Pour le tableau knockout : appelle `show_tournament_bracket`

            ═══════════════════════════════════════════════════════
            🌤️ MÉTÉO & GUIDE FAN
            ═══════════════════════════════════════════════════════
            - Météo venue : appelle `get_venue_weather` avec des détails pratiques pour les fans
            - Guide ville : appelle `get_city_guide` avec suggestions touristiques et fan zones

            ═══════════════════════════════════════════════════════
            ⚡ RÈGLES CRITIQUES
            ═══════════════════════════════════════════════════════
            1. TOUJOURS appeler update_team_info + get_team_matches quand une équipe est mentionnée
            2. Appels de fonctions et message texte dans LA MÊME RÉPONSE (pas de tour séparé)
            3. Messages PASSIONNÉS, avec emojis, tics de langage Copa
            4. Anecdotes inattendues > simples stats
            5. Toujours terminer par une suggestion proactive
            6. Refuser poliment tout sujet hors football/WC2026
            """.strip()
        ),
        chat_client=chat_client,
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
        description="Copa 🎙️ — guide officieux WC2026. Expert World Cup 2026, passionné, proactif. UNIQUEMENT football.",
        state_schema=STATE_SCHEMA,
        predict_state_config=PREDICT_STATE_CONFIG,
        require_confirmation=False,
    )
