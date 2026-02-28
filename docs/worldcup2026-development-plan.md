# 🏆 Plan de Développement — FIFA World Cup 2026 Edition

> **Branche** : `worldcup2026`  
> **Repo** : `fredgis/foot-agui-sample`  
> **Objectif** : Transformer l'assistant football (clubs & équipes nationales) en une expérience immersive centrée sur la Coupe du Monde 2026 🇺🇸🇲🇽🇨🇦

---

## 📊 Analyse de l'Existant

Le projet actuel repose sur une architecture à deux couches que nous **préservons intégralement** :

| Couche | Stack actuelle | Fichiers clés |
|--------|---------------|---------------|
| **Frontend** | Next.js 16 + React 19 + TailwindCSS 4 + CopilotKit | `src/app/page.tsx`, `src/components/clubinfo.tsx`, `src/lib/types.ts` |
| **Agent Backend** | Python 3.12 + FastAPI + Microsoft Agent Framework + AG-UI Protocol | `agent/src/agent.py`, `agent/src/main.py` |
| **Communication** | AG-UI Protocol (`@ag-ui/client` frontend, `agent-framework-ag-ui` Python) via CopilotKit Runtime | `src/app/layout.tsx`, `src/app/api/copilotkit/route.ts` |
| **State Sync** | CoAgent shared state (`clubInfo` schema) avec `predict_state` | `agent/src/agent.py` (`STATE_SCHEMA`, `PREDICT_STATE_CONFIG`) |

### État actuel de l'agent

L'agent Python expose 3 fonctions :
- `update_club_info` — Met à jour les infos d'un club/sélection
- `get_weather` — Météo d'une localisation
- `go_to_moon` — Human-in-the-loop (demo)

Le state partagé AG-UI est centré sur un unique objet `clubInfo`.

### Stack Frontend (npm)

```json
"@ag-ui/client": "^0.0.42",
"@copilotkit/react-core": "^1.50.1",
"@copilotkit/react-textarea": "^1.50.1",
"@copilotkit/react-ui": "^1.50.1",
"@copilotkit/runtime": "^1.50.1",
"next": "16.0.8",
"react": "^19.2.1"
```

### Stack Agent (Python)

```toml
requires-python = ">=3.12"
dependencies = [
    "agent-framework-ag-ui>=1.0.0b251117",
    "python-dotenv",
]
```

---

## 🏗️ Architecture Technique

### Prérequis Techniques Garantis

| Prérequis | Statut | Détail |
|-----------|--------|--------|
| **AG-UI Protocol** | ✅ Conservé | `@ag-ui/client` (frontend) + `agent-framework-ag-ui` (Python) — même protocole, mêmes events SSE |
| **GitHub Copilot SDK (CopilotKit)** | ✅ Conservé | `@copilotkit/react-core` v1.50+, `@copilotkit/react-ui`, `@copilotkit/runtime` — hooks `useCoAgent`, `useCopilotAction` |
| **Microsoft Agent Framework** | ✅ Conservé | `agent_framework` + `ChatAgent` + `@ai_function` — même infra Python |
| **State Sync bidirectionnel** | ✅ Conservé | `predict_state` + `STATE_SCHEMA` côté agent ↔ `useCoAgent` côté React |
| **Next.js + React 19** | ✅ Conservé | Même structure `src/app/` |
| **FastAPI** | ✅ Conservé | `agent/src/main.py` inchangé (structure) |

### Flux Complet AG-UI + CopilotKit

```
Utilisateur → CopilotSidebar (CopilotKit SDK)
                    ↓
            CopilotKit Runtime (/api/copilotkit)
                    ↓ AG-UI Protocol (events SSE)
            FastAPI (agent/src/main.py)
                    ↓
            Agent Python (agent/src/agent.py)
              - @ai_function → update_team_info, get_team_matches...
              - STATE_SCHEMA → predict_state → StateSnapshotEvent
                    ↓ AG-UI Protocol (events remontés)
            CopilotKit Runtime
                    ↓
            useCoAgent<AgentState> (src/app/page.tsx)
                    ↓
            Composants React (src/components/*.tsx)
              - TeamCard, MatchSchedule, VenueMap, GroupView, Bracket
```

### Détail du protocole AG-UI

Le protocole AG-UI (Agent-to-User Interface) est le lien entre l'agent Python et le frontend React :

1. **Côté Agent (Python)** : `agent-framework-ag-ui` expose un endpoint FastAPI qui émet des events SSE :
   - `StateSnapshotEvent` — Synchronise le state partagé (teamInfo, matches, etc.)
   - `ToolCallStart` / `ToolCallEnd` — Signale le début/fin d'un appel de tool
   - `TextMessageContent` — Texte de l'agent en streaming

2. **Côté Runtime (Next.js)** : `@copilotkit/runtime` reçoit les events via `HttpAgent` :
   ```typescript
   // src/app/api/copilotkit/route.ts
   const runtime = new CopilotRuntime({
     agents: {
       "my_agent": new HttpAgent({ url: "http://localhost:8000/" }),
     }
   });
   ```

3. **Côté Frontend (React)** : `@copilotkit/react-core` expose les hooks :
   - `useCoAgent<AgentState>` — State bidirectionnel avec l'agent
   - `useCopilotAction` — Render UI pour les tool calls (Generative UI)
   - `useCopilotContext` — Accès direct au state global

### Détail GitHub Copilot SDK (CopilotKit)

CopilotKit est le SDK qui orchestre toute l'expérience :

```typescript
// src/app/layout.tsx — Provider global
<CopilotKit runtimeUrl="/api/copilotkit" agent="my_agent">
  {children}
</CopilotKit>

// src/app/page.tsx — Hooks utilisés
import { useCoAgent, useCopilotAction, useCopilotContext } from "@copilotkit/react-core";
import { CopilotKitCSSProperties, CopilotSidebar } from "@copilotkit/react-ui";
```

**Hooks clés :**
- `useCoAgent<AgentState>({ name: "my_agent" })` — Shared state bidirectionnel
- `useCopilotAction({ name: "tool_name", render: ... })` — Generative UI pour les tools
- `useCopilotContext()` — Accès au state global pour les effets réactifs
- `CopilotSidebar` — Composant UI de chat en sidebar

---

## 🎯 Vision UX Immersive

Quand l'utilisateur mentionne une équipe (ex: « Parle-moi de la France »), l'interface se transforme dynamiquement :

- 🎨 **Thème dynamique** — Le thème complet passe aux couleurs de l'équipe (bleu-blanc-rouge pour la France)
- 🏟️ **Carte d'identité** — Drapeau, confédération, classement FIFA, sélectionneur, joueurs stars
- 📅 **Calendrier des matchs** — Dates, adversaires, stades, compte à rebours
- 📍 **Carte interactive** — Les 16 villes hôtes avec les stades où l'équipe joue en surbrillance
- 🏆 **Vue du groupe** — Les 4 équipes du groupe avec le calendrier croisé
- 📊 **Bracket du tournoi** — L'arbre complet avec la branche de l'équipe mise en avant
- 🌦️ **Météo enrichie** — Météo des villes de match contextualisée
- 🎙️ **Mode commentateur** — L'agent a une personnalité de commentateur sportif passionné

### Layout Dynamique (Team Active)

```
┌──────────────────────────────────┬────────────────┐
│                                  │                │
│   TeamCard (WS3) — Haut         │   CopilotKit   │
│                                  │   Sidebar      │
├──────────────┬───────────────────│   Chat         │
│              │                   │   (commentateur│
│ MatchSchedule│   VenueMap (WS5)  │    sportif)   │
│   (WS4)      │                   │                │
│              │                   │                │
├──────────────┴───────────────────│                │
│                                  │                │
│  GroupView / TournamentBracket   │                │
│  (WS6) — Toggle entre les 2     │                │
│                                  │                │
└──────────────────────────────────┴────────────────┘
```

---

## 📁 Structure des Fichiers (Cible)

### Frontend (`/src`)

```
src/
├── app/
│   ├── layout.tsx              ← CopilotKit provider (conservé, URL externalisable)
│   ├── page.tsx                ← Page principale (refonte WS7)
│   ├── globals.css             ← Styles + thème dynamique WC2026 (enrichi)
│   └── api/copilotkit/
│       └── route.ts            ← Runtime endpoint (conservé)
├── components/
│   ├── team-card.tsx           ← NOUVEAU (remplace clubinfo.tsx) — WS3
│   ├── match-schedule.tsx      ← NOUVEAU — WS4
│   ├── venue-map.tsx           ← NOUVEAU — WS5
│   ├── group-view.tsx          ← NOUVEAU — WS6
│   ├── tournament-bracket.tsx  ← NOUVEAU — WS6
│   ├── weather.tsx             ← Conservé et enrichi (météo villes hôtes)
│   ├── clubinfo.tsx            ← SUPPRIMÉ (remplacé par team-card.tsx)
│   ├── moon.tsx                ← SUPPRIMÉ (demo, plus nécessaire)
│   └── proverbs.tsx            ← SUPPRIMÉ (demo, plus nécessaire)
└── lib/
    ├── types.ts                ← Refonte avec types World Cup 2026 — WS1
    └── worldcup-data.ts        ← NOUVEAU — Données statiques WC2026 — WS1
```

### Agent Python (`/agent`)

```
agent/
├── src/
│   ├── agent.py                ← Refonte WC2026 — WS2
│   ├── main.py                 ← Conservé (FastAPI + AG-UI endpoint)
│   └── data/
│       └── worldcup2026.py     ← NOUVEAU — Données Python WC2026 — WS1
├── pyproject.toml              ← Conservé
├── .python-version             ← Conservé (3.12)
└── .env.example                ← NOUVEAU — Template de configuration
```

### Racine du projet

```
/
├── .github/
│   └── workflows/
│       └── deploy.yml          ← NOUVEAU — CI/CD GitHub Pages — WS8
├── .env.example                ← NOUVEAU — Template frontend — WS8
├── docs/
│   └── worldcup2026-development-plan.md  ← CE FICHIER
└── ... (fichiers existants conservés)
```

---

## 📋 Workstream 1 — 📦 Data Layer & Types World Cup 2026

> **Priorité** : 🔴 Critique  
> **Dépendances** : Aucune  
> **Parallélisable** : ✅ Immédiatement

### Objectif

Créer la base de données complète du tournoi + les types partagés frontend/backend.

### Fichiers à créer/modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/lib/types.ts` | Refonte | Nouveaux types TypeScript World Cup 2026 |
| `src/lib/worldcup-data.ts` | Création | Données statiques côté frontend (48 équipes, 16 stades, 12 groupes, calendrier) |
| `agent/src/data/worldcup2026.py` | Création | Mêmes données côté Python pour l'agent |

### Données structurées à inclure

- **48 équipes** : nom, code FIFA, drapeau emoji, confédération (UEFA, CONMEBOL, CAF, AFC, CONCACAF, OFC), classement FIFA, couleurs primaire/secondaire, sélectionneur, 5 joueurs clés (nom, poste, club), historique WC (participations, titres, meilleur résultat)
- **16 stades** : nom, ville, pays (USA/Canada/Mexique), capacité, coordonnées GPS, fuseau horaire, description
- **12 groupes** (A→L) : composition de chaque groupe (4 équipes)
- **104 matchs** : date/heure, équipes, stade, phase du tournoi (groupe, huitièmes, quarts, demis, 3e place, finale)

### Types TypeScript à définir

```typescript
// src/lib/types.ts — World Cup 2026

export interface TeamInfo {
  name: string;
  code: string;                // Code FIFA (FRA, BRA, USA...)
  flag: string;                // Emoji drapeau 🇫🇷
  confederation: string;       // UEFA, CONMEBOL, CAF, AFC, CONCACAF, OFC
  fifaRanking: number;
  primaryColor: string;        // Couleur hex primaire
  secondaryColor: string;      // Couleur hex secondaire
  coach: string;               // Sélectionneur
  group: string;               // Groupe WC2026 (A-L)
  stars: PlayerInfo[];         // 5 joueurs clés
  wcHistory: WorldCupHistory;
}

export interface PlayerInfo {
  name: string;
  position: string;            // GK, DEF, MID, FWD
  club: string;                // Club actuel
}

export interface WorldCupHistory {
  participations: number;
  titles: number;
  bestResult: string;          // "Champion", "Finalist", "Semi-finalist", etc.
  titleYears?: string[];       // ["1998", "2018"]
}

export interface StadiumInfo {
  name: string;
  city: string;
  country: string;             // "USA", "Canada", "Mexico"
  capacity: number;
  latitude: number;
  longitude: number;
  timezone: string;            // "America/New_York", etc.
  description: string;
}

export interface MatchInfo {
  id: string;
  date: string;                // ISO 8601
  teamA: string;               // Code FIFA ou "TBD"
  teamB: string;
  stadium: string;             // Nom du stade
  phase: MatchPhase;
  group?: string;              // Groupe (si phase de groupe)
}

export type MatchPhase = 
  | "group" 
  | "round-of-32" 
  | "round-of-16" 
  | "quarter-final" 
  | "semi-final" 
  | "third-place" 
  | "final";

export interface GroupInfo {
  name: string;                // "A", "B", ..., "L"
  teams: string[];             // Codes FIFA des 4 équipes
}

// State AG-UI partagé (remplace l'ancien AgentState)
export type AgentState = {
  teamInfo: TeamInfo | null;
  matches: MatchInfo[];
  selectedStadium: StadiumInfo | null;
  tournamentView: "group" | "bracket" | null;
  highlightedCity: string | null;
};
```

### Critères d'acceptation

- [ ] Tous les types TypeScript compilent sans erreur
- [ ] Les 48 équipes qualifiées sont présentes avec données complètes
- [ ] Les 16 stades sont présents avec coordonnées GPS
- [ ] Les 12 groupes sont correctement composés
- [ ] Le calendrier des matchs de phase de groupes est complet (dates réelles FIFA)
- [ ] Les données Python mirrorent exactement les données TypeScript
- [ ] Les données sont accessibles via import simple (`import { teams, stadiums } from "@/lib/worldcup-data"`)

---

## 📋 Workstream 2 — 🤖 Agent Backend Python (Refonte)

> **Priorité** : 🔴 Critique  
> **Dépendances** : WS1 (types & données)  
> **Parallélisable** : ⚠️ Dès que WS1 a les types

### Objectif

Transformer l'agent de « expert clubs » en « expert World Cup 2026 ».

### Fichier principal : `agent/src/agent.py`

### Nouveau STATE_SCHEMA

Remplacer `clubInfo` par le nouveau schema aligné sur les types TypeScript :

```python
STATE_SCHEMA = {
    "teamInfo": {
        "type": ["object", "null"],
        "properties": {
            "name": {"type": "string"},
            "code": {"type": "string"},
            "flag": {"type": "string"},
            "confederation": {"type": "string"},
            "fifaRanking": {"type": "number"},
            "primaryColor": {"type": "string"},
            "secondaryColor": {"type": "string"},
            "coach": {"type": "string"},
            "group": {"type": "string"},
            "stars": {"type": "array", ...},
            "wcHistory": {"type": "object", ...},
        },
    },
    "matches": {"type": "array", ...},
    "selectedStadium": {"type": ["object", "null"], ...},
    "tournamentView": {"type": ["string", "null"]},
    "highlightedCity": {"type": ["string", "null"]},
}
```

### Nouvelles `@ai_function` (remplacent les existantes)

| Fonction | Description | Déclenche le state |
|----------|-------------|-------------------|
| `update_team_info(team_info)` | Charge une équipe nationale dans le state | `teamInfo` |
| `get_team_matches(team_code)` | Retourne les matchs WC2026 de l'équipe | `matches` |
| `get_stadium_info(stadium_name)` | Détails d'un stade | `selectedStadium` |
| `get_group_standings(group)` | Composition et calendrier d'un groupe | `tournamentView = "group"` |
| `get_venue_weather(city)` | Météo de la ville hôte (enrichie) | — |
| `show_tournament_bracket()` | Basculer la vue bracket | `tournamentView = "bracket"` |
| `compare_teams(team_a, team_b)` | Comparaison head-to-head | — |
| `get_city_guide(city)` | Guide fan de la ville hôte | — |

### Nouveau `PREDICT_STATE_CONFIG`

```python
PREDICT_STATE_CONFIG = {
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
    "tournamentView": {
        "tool": "show_tournament_bracket",
        "tool_argument": None,
    },
    "highlightedCity": {
        "tool": "get_stadium_info",
        "tool_argument": "stadium_name",
    },
}
```

### Nouveau System Prompt

- **Personnalité** : Commentateur sportif passionné, expert tactique
- **Langue** : Répond en français par défaut, supporte anglais et espagnol
- **Comportement automatique** : Appelle TOUJOURS `update_team_info` + `get_team_matches` quand une équipe est mentionnée
- **Restriction** : UNIQUEMENT la Coupe du Monde 2026 et le football (décline poliment les autres sujets)

### Fichier inchangé

`agent/src/main.py` — L'infrastructure FastAPI + AG-UI endpoint reste identique. Seule la configuration Azure OpenAI sera documentée.

### Critères d'acceptation

- [ ] Le nouveau `STATE_SCHEMA` est aligné avec les types TypeScript de WS1
- [ ] Les 8 `@ai_function` sont implémentées et fonctionnelles
- [ ] L'agent répond correctement quand on mentionne une équipe (appel automatique)
- [ ] Le `PREDICT_STATE_CONFIG` synchronise correctement le state frontend
- [ ] Le system prompt est centré World Cup 2026
- [ ] L'agent refuse poliment les sujets hors football/WC2026
- [ ] `agent/src/main.py` reste fonctionnel avec Azure OpenAI

---

## 📋 Workstream 3 — 🏟️ Composant TeamCard (Carte d'Identité Équipe)

> **Priorité** : 🔴 Critique  
> **Dépendances** : WS1 (types)  
> **Parallélisable** : ✅ Avec WS4, WS5, WS6

### Objectif

Remplacer `ClubInfoCard` (`src/components/clubinfo.tsx`) par un composant immersif d'équipe nationale.

### Fichier : `src/components/team-card.tsx`

### UX Immersive

- **Header animé** : drapeau emoji géant + nom de l'équipe + badge confédération (UEFA, CONMEBOL, etc.)
- **Grille de stats** (4 colonnes) :
  - Classement FIFA
  - Groupe WC2026
  - Titres World Cup
  - Participations World Cup
- **Section « Stars »** : 5 joueurs clés avec nom, poste, club — style cartes de joueur
- **Section « Historique WC »** : frise des participations passées avec le meilleur résultat en highlight
- **Thème dynamique** : toute la card prend `primaryColor` / `secondaryColor` de l'équipe
- **Animations** : `slideIn 0.6s ease-out` à l'apparition, transition fluide au changement d'équipe

### Props

```typescript
interface TeamCardProps {
  team: TeamInfo | null;
  themeColor: string;
  secondaryColor: string;
}
```

### Critères d'acceptation

- [ ] Le composant affiche toutes les informations d'une équipe nationale
- [ ] Le thème dynamique s'applique correctement (couleurs de l'équipe)
- [ ] Les animations d'entrée fonctionnent
- [ ] Le composant gère le cas `team = null` (placeholder)
- [ ] Responsive : s'adapte aux différentes tailles d'écran

---

## 📋 Workstream 4 — 📅 Composant MatchSchedule (Calendrier des Matchs)

> **Priorité** : 🟠 Haute  
> **Dépendances** : WS1 (types)  
> **Parallélisable** : ✅ Avec WS3, WS5, WS6

### Fichier : `src/components/match-schedule.tsx`

### UX Immersive

- **Timeline verticale** des matchs de l'équipe dans le tournoi
- Chaque match affiche :
  - Drapeaux des 2 équipes + « VS » animé
  - Date/heure (locale & UTC)
  - Stade + ville
  - Badge de phase (Groupe, R32, R16, QF, SF, Final) avec couleur
- **Compte à rebours** « Dans X jours » pour les matchs futurs (basé sur la date du 11 juin 2026)
- **Séparateurs visuels** entre phase de groupe et phases à élimination directe
- **Interaction** : clic sur un match → envoie `highlightedCity` au state AG-UI pour synchroniser la carte (WS5)
- **Animations** : apparition progressive au scroll (staggered animation)

### Props

```typescript
interface MatchScheduleProps {
  matches: MatchInfo[];
  teamCode: string;
  themeColor: string;
  onMatchClick?: (match: MatchInfo) => void;
}
```

### Critères d'acceptation

- [ ] Affiche correctement tous les matchs d'une équipe
- [ ] Le compte à rebours est fonctionnel
- [ ] Les badges de phase sont correctement colorés
- [ ] Le clic sur un match émet un event (pour WS5/WS7)
- [ ] Les séparateurs entre phases sont visibles
- [ ] Responsive

---

## 📋 Workstream 5 — 📍 Composant VenueMap (Carte Interactive)

> **Priorité** : 🟠 Haute  
> **Dépendances** : WS1 (types)  
> **Parallélisable** : ✅ Avec WS3, WS4, WS6

### Fichier : `src/components/venue-map.tsx`

### UX Immersive

- **Carte SVG stylisée** USA/Canada/Mexique (pur SVG/CSS, pas de Google Maps)
- **16 pins** pour les 16 stades, positionnés par coordonnées GPS normalisées
- **Highlight dynamique** : quand une équipe est sélectionnée, les stades où elle joue brillent avec la couleur de l'équipe
- **Ligne pointillée** reliant les stades du parcours de l'équipe (itinéraire de match)
- **Tooltip au hover** : nom du stade, capacité, date du prochain match
- **Mini-card au clic** : icône du stade + infos détaillées + lien vers la météo
- **3 zones visuelles** : USA (11 villes), Canada (2), Mexique (3) avec séparation légère

### Villes hôtes (16)

| Pays | Villes |
|------|--------|
| 🇺🇸 USA (11) | New York/New Jersey, Los Angeles, Dallas, Houston, Atlanta, Philadelphia, Miami, Seattle, San Francisco, Kansas City, Boston |
| 🇨🇦 Canada (2) | Toronto, Vancouver |
| 🇲🇽 Mexique (3) | Mexico City, Guadalajara, Monterrey |

### Props

```typescript
interface VenueMapProps {
  stadiums: StadiumInfo[];
  teamMatches?: MatchInfo[];
  highlightedCity?: string | null;
  themeColor: string;
  onStadiumClick?: (stadium: StadiumInfo) => void;
}
```

### Critères d'acceptation

- [ ] La carte SVG affiche correctement les 3 pays
- [ ] Les 16 stades sont correctement positionnés
- [ ] Le highlight dynamique fonctionne quand une équipe est sélectionnée
- [ ] Les tooltips s'affichent au hover
- [ ] Les lignes de parcours d'équipe se dessinent
- [ ] Responsive

---

## 📋 Workstream 6 — 🏆 Composants GroupView & TournamentBracket

> **Priorité** : 🟡 Moyenne  
> **Dépendances** : WS1 (types)  
> **Parallélisable** : ✅ Avec WS3, WS4, WS5

### Fichiers

- `src/components/group-view.tsx`
- `src/components/tournament-bracket.tsx`

### GroupView UX

- **12 groupes** (A→L) affichés en grille 3×4 ou 4×3 responsive
- Chaque groupe : 4 équipes avec drapeau + nom + classement FIFA
- **Highlight du groupe de l'équipe sélectionnée** (bordure + glow aux couleurs de l'équipe)
- Mini-calendrier des 6 matchs du groupe intégré
- Clic sur un groupe → zoom/expand pour voir les détails

### TournamentBracket UX

- **Arbre SVG complet** : R32 → R16 → QF → SF → 3e place → Finale
- **Bracket interactif** : la branche de l'équipe sélectionnée est mise en surbrillance
- Animation de révélation progressive (de gauche à droite)
- Responsive : scroll horizontal sur mobile

### Props

```typescript
// group-view.tsx
interface GroupViewProps {
  groups: GroupInfo[];
  selectedTeamCode?: string;
  themeColor: string;
  onGroupClick?: (group: GroupInfo) => void;
}

// tournament-bracket.tsx
interface TournamentBracketProps {
  matches: MatchInfo[];
  selectedTeamCode?: string;
  themeColor: string;
}
```

### Critères d'acceptation

- [ ] Les 12 groupes s'affichent correctement
- [ ] Le highlight de groupe fonctionne
- [ ] Le bracket du tournoi est complet et lisible
- [ ] La surbrillance de branche fonctionne
- [ ] Les deux composants sont responsive

---

## 📋 Workstream 7 — 🎪 Page Principale & Orchestration (Intégration Finale)

> **Priorité** : 🔴 Critique  
> **Dépendances** : WS2, WS3, WS4, WS5, WS6  
> **Parallélisable** : ⚠️ En dernier

### Fichiers : `src/app/page.tsx` + `src/app/layout.tsx` + `src/app/globals.css`

### Welcome Screen World Cup 2026

- Logo/branding WC 2026 avec les 3 drapeaux 🇺🇸🇲🇽🇨🇦
- **Compte à rebours dynamique** jusqu'au 11 juin 2026 (ouverture)
- **Grille des 48 équipes** qualifiées avec drapeaux cliquables (envoie au chat)
- Section « Favoris » : France, Brésil, Argentine, Allemagne, Angleterre, USA...
- Suggestions de questions : « Parle-moi de la France », « Compare Brésil vs Argentine », « Montre-moi le stade de Dallas »

### Intégration CopilotKit + CoAgent

```typescript
// Nouveau state schema
const { state, setState } = useCoAgent<AgentState>({
  name: "my_agent",
  initialState: {
    teamInfo: null,
    matches: [],
    selectedStadium: null,
    tournamentView: null,
    highlightedCity: null,
  },
});

// Tool renders (Generative UI)
useCopilotAction({
  name: "update_team_info",
  // ... render TeamCard dynamique
});

useCopilotAction({
  name: "get_team_matches",
  // ... render MatchSchedule
});

useCopilotAction({
  name: "get_stadium_info",
  // ... render StadiumCard
});
```

### Refonte `globals.css`

- **Animations** : `slideIn`, `fadeIn`, `pulse`, `glow`, `staggeredReveal`
- **Thème sombre** par défaut avec gradient WC2026 (bleu foncé → violet)
- **CSS variables dynamiques** pour les couleurs d'équipe via le state
- Sidebar chat : personnalité commentateur sportif

### Critères d'acceptation

- [ ] Le Welcome Screen s'affiche avec le compte à rebours
- [ ] La grille des 48 équipes est interactive
- [ ] Le layout dynamique se transforme quand une équipe est active
- [ ] Tous les composants (WS3-WS6) sont correctement intégrés
- [ ] Le thème CopilotKit change dynamiquement avec l'équipe
- [ ] La transition welcome → team view est fluide
- [ ] Le state AG-UI est correctement synchronisé

---

## 📋 Workstream 8 — 🚀 Déploiement GitHub Pages + Azure OpenAI

> **Priorité** : 🟡 Moyenne  
> **Dépendances** : WS2, WS7  
> **Parallélisable** : ⚠️ Phase finale

### Décisions Architecturales

| Décision | Choix retenu |
|----------|-------------|
| Frontend hosting | **GitHub Pages** (export statique Next.js) |
| Backend hosting | **Railway ou Render** (agent Python FastAPI) |
| Modèle LLM | **Azure OpenAI** (clé provisionnée par l'utilisateur) |
| Configuration secrets | **GitHub Secrets** + variables d'environnement sur le provider |

### Tâches

#### 1. Export statique Next.js pour GitHub Pages

```typescript
// next.config.ts
const nextConfig = {
  output: 'export',
  basePath: '/foot-agui-sample',
  images: { unoptimized: true },
};
```

#### 2. Externaliser l'URL de l'agent

```typescript
// src/app/layout.tsx
<CopilotKit 
  runtimeUrl={process.env.NEXT_PUBLIC_COPILOTKIT_URL || "/api/copilotkit"} 
  agent="my_agent"
>
  {children}
</CopilotKit>
```

#### 3. GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [worldcup2026]
jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
        env:
          NEXT_PUBLIC_COPILOTKIT_URL: ${{ vars.NEXT_PUBLIC_COPILOTKIT_URL }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: out
      - uses: actions/deploy-pages@v4
```

#### 4. Templates de configuration

**`agent/.env.example`** :
```env
# Azure OpenAI - Provisionné par l'utilisateur
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_CHAT_DEPLOYMENT_NAME=gpt-4o

# Agent server
AGENT_HOST=0.0.0.0
AGENT_PORT=8000
```

**`.env.example`** (racine) :
```env
# URL du backend agent déployé (Railway/Render)
NEXT_PUBLIC_COPILOTKIT_URL=https://your-agent.railway.app
```

#### 5. Gestion des Secrets

```
Repository Settings → Secrets and variables → Actions

🔒 Secrets :
  ├── AZURE_OPENAI_ENDPOINT          = https://your-resource.openai.azure.com/
  ├── AZURE_OPENAI_CHAT_DEPLOYMENT_NAME = gpt-4o
  └── AZURE_OPENAI_KEY               = (clé Azure)

📋 Variables :
  └── NEXT_PUBLIC_COPILOTKIT_URL     = https://your-agent.railway.app
```

Les secrets sont aussi injectés comme variables d'environnement dans Railway/Render :

```
Railway/Render Dashboard → Service → Environment Variables
  AZURE_OPENAI_ENDPOINT          = (copié depuis Azure)
  AZURE_OPENAI_CHAT_DEPLOYMENT_NAME = gpt-4o
  AZURE_OPENAI_KEY               = (copié depuis Azure)
  AGENT_HOST                     = 0.0.0.0
  AGENT_PORT                     = 8000
```

**Règle absolue** : Aucun secret dans le code. Le `.gitignore` existant exclut déjà `.env`, `.env.local`, `.env*.local`.

#### 6. Dockerfile pour le backend agent

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY agent/ .
RUN pip install uv && uv sync
EXPOSE 8000
CMD ["uv", "run", "python", "src/main.py"]
```

### Critères d'acceptation

- [ ] `npm run build` génère un export statique fonctionnel
- [ ] Le GitHub Actions workflow build et déploie sur GitHub Pages
- [ ] L'URL de l'agent est externalisable via `NEXT_PUBLIC_COPILOTKIT_URL`
- [ ] Les `.env.example` documentent toutes les variables nécessaires
- [ ] Le Dockerfile du backend agent fonctionne
- [ ] Le CORS est correctement configuré (déjà `allow_origins=["*"]` dans `main.py`)
- [ ] La configuration Azure OpenAI fonctionne avec `_build_chat_client()`

---

## 🗓️ Matrice de Parallélisation

```
Phase 1 (parallèle — 5 agents Copilot simultanés) :
  ├── 🤖 Agent Copilot #1 → WS1 (Data + Types)
  ├── 🤖 Agent Copilot #2 → WS3 (TeamCard) — avec types mockés
  ├── 🤖 Agent Copilot #3 → WS4 (MatchSchedule) — avec types mockés
  ├── 🤖 Agent Copilot #4 → WS5 (VenueMap) — avec types mockés
  └── 🤖 Agent Copilot #5 → WS6 (GroupView + Bracket) — avec types mockés

Phase 2 (après WS1 terminé) :
  └── 🤖 Agent Copilot #6 → WS2 (Agent Python refonte)

Phase 3 (intégration finale — après WS2-WS6) :
  └── 🤖 Agent Copilot #7 → WS7 (Page principale + orchestration)

Phase 4 (déploiement — après WS7) :
  └── 🤖 Agent Copilot #8 → WS8 (GitHub Pages + CI/CD + Azure OpenAI)
```

### Diagramme temporel

```
Temps →    T0              T1                  T2                  T3
          ┌──────────────┐
WS1 DATA  │ Types + DB   │ ✅
          └──────────────┘
          ┌──────────────────────────────┐
WS3 TEAM  │ TeamCard component           │ ✅
          └──────────────────────────────┘
          ┌──────────────────────────────┐
WS4 MATCH │ MatchSchedule component      │ ✅
          └──────────────────────────────┘
          ┌──────────────────────────────┐
WS5 MAP   │ VenueMap component           │ ✅
          └──────────────────────────────┘
          ┌──────────────────────────────┐
WS6 GROUP │ GroupView + Bracket          │ ✅
          └──────────────────────────────┘
                          ┌──────────────────────────────┐
WS2 AGENT                │ Agent Python refonte          │ ✅
                          └──────────────────────────────┘
                                              ┌──────────────────┐
WS7 PAGE                                      │ Orchestration    │ ✅
                                              └──────────────────┘
                                                          ┌──────────────────┐
WS8 DEPLOY                                               │ GitHub Pages + CI│ ✅
                                                          └──────────────────┘
```

---

## 💡 Idées UX Bonus (pour des issues futures)

| Idée | Description |
|------|-------------|
| 🎙️ Mode Commentateur Live | L'agent génère un commentaire fictif d'un match à venir |
| 🆚 Comparateur d'équipes | « Compare France vs Brazil » → card comparative côte à côte |
| 🎫 Fan Zone Guide | Infos pratiques par ville (visa, transport, hébergement, zones de fans) |
| 📱 Mode Mobile | Layout responsive en accordion/tabs |
| 🔔 Notifications Countdown | « Le prochain match de la France est dans X jours à Dallas ! » |
| 🌐 Multi-langue | FR/EN/ES (3 pays hôtes) |
| 🗳️ Pronostics | L'utilisateur peut pronostiquer les matchs (human-in-the-loop) |
| 📈 Stats avancées | Graphiques radar de comparaison d'équipes |

---

## ⚠️ Risques et Mitigations

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| Données WC2026 incomplètes (tirage au sort pas encore fait) | Moyen | Utiliser données provisoires, structure extensible |
| Export statique Next.js incompatible avec certaines features | Moyen | Tester `output: 'export'` tôt, adapter les API routes |
| Carte SVG complexe à réaliser | Faible | Simplifier avec des points/pins plutôt qu'une carte détaillée |
| Latence AG-UI avec backend distant | Moyen | CORS déjà configuré, optimiser le state sync |
| Taille du bundle avec toutes les données statiques | Faible | Lazy loading des données, code splitting |

---

## 📝 Prochaines Étapes

1. ✅ **Valider ce plan** — Lecture et feedback
2. **Créer les 8 issues GitHub** — Une par workstream avec labels, descriptions et critères d'acceptation
3. **Lancer les agents Copilot** — Phase 1 en parallèle (WS1 + WS3-WS6)
4. **Intégration progressive** — WS2 → WS7 → WS8