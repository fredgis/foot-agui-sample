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
│       └── deploy-azure.yml    ← NOUVEAU — CI/CD Azure SWA + Container Apps — WS8
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

## 📋 Workstream 8 — 🚀 Déploiement Azure (Static Web Apps + Container Apps)

> **Priorité** : 🟡 Moyenne  
> **Dépendances** : WS2, WS7  
> **Parallélisable** : ⚠️ Phase finale

### Décisions Architecturales

| Décision | Choix retenu |
|----------|-------------|
| Frontend hosting | **Azure Static Web Apps** (Next.js avec SSR hybrid natif) |
| Backend hosting | **Azure Container Apps** (agent Python FastAPI conteneurisé) |
| Modèle LLM | **Azure OpenAI** (clé provisionnée par l'utilisateur dans `.env`) |
| Configuration secrets | **GitHub Secrets** (CI/CD) + **Azure App Settings** (runtime) |
| Authentification inter-services | **Managed Identity** (Container Apps → Azure OpenAI) ou clé API via env vars |

### Pourquoi Azure (tout-en-un)

- **Azure Static Web Apps** supporte Next.js **avec SSR** nativement — pas besoin de `output: 'export'`, les API routes (`/api/copilotkit`) fonctionnent sans adaptation
- **Azure Container Apps** offre du serverless conteneurisé avec scale-to-zero — idéal pour le backend FastAPI sans coût au repos
- **Azure OpenAI** est déjà le provider LLM choisi — tout reste dans le même écosystème Azure, simplifie la gestion des identités et des secrets
- **Managed Identity** permet au Container App d'accéder à Azure OpenAI sans clé API exposée (optionnel, le code le supporte déjà via `DefaultAzureCredential()`)

### Architecture de Déploiement

```
┌─────────────────────────────────────────────────────────┐
│  Azure Static Web Apps                                  │
│  ────────────────────                                   │
│  • Next.js 16 avec SSR hybrid (pas d'export statique)  │
│  • API route /api/copilotkit intégrée                   │
│  • React + CopilotKit SDK + AG-UI client                │
│  • URL: https://wc2026.azurestaticapps.net              │
│  • Déploiement automatique via GitHub Actions           │
└──────────────┬──────────────────────────────────────────┘
               │ HTTPS (AG-UI Protocol / SSE events)
               ▼
┌─────────────────────────────────────────────────────────┐
│  Azure Container Apps                                   │
│  ────────────────────                                   │
│  • Agent Python FastAPI (agent/src/main.py)             │
│  • Image Docker depuis Dockerfile                       │
│  • Scale-to-zero (serverless, pas de coût au repos)     │
│  • Ingress HTTPS activé                                 │
│  • URL: https://wc2026-agent.azurecontainerapps.io      │
│  • Secrets injectés via Azure App Settings              │
└──────────────┬──────────────────────────────────────────┘
               │ Managed Identity ou clé API
               ▼
┌─────────────────────────────────────────────────────────┐
│  Azure OpenAI Service                                   │
│  ────────────────────                                   │
│  • Modèle provisionné par l'utilisateur                 │
│  • Endpoint + deployment name + clé dans .env           │
│  • Supporté nativement par _build_chat_client()         │
└─────────────────────────────────────────────────────────┘
```

### Tâches

#### 1. Configuration Next.js (PAS d'export statique)

Le `next.config.ts` reste compatible SSR — **pas de `output: 'export'`** car Azure Static Web Apps gère le SSR nativement :

```typescript
// next.config.ts — Inchangé, SSR supporté
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@copilotkit/runtime"],
};

export default nextConfig;
```

L'API route `/api/copilotkit` continue de fonctionner telle quelle dans Azure Static Web Apps.

#### 2. Externaliser l'URL de l'agent

```typescript
// src/app/api/copilotkit/route.ts — URL configurable
const agentUrl = process.env.AGENT_URL || "http://localhost:8000/";

const runtime = new CopilotRuntime({
  agents: {
    "my_agent": new HttpAgent({ url: agentUrl }),
  }
});
```

```typescript
// src/app/layout.tsx — Inchangé (le runtime CopilotKit reste en API route locale)
<CopilotKit runtimeUrl="/api/copilotkit" agent="my_agent">
  {children}
</CopilotKit>
```

> **Note** : Contrairement à GitHub Pages, Azure Static Web Apps exécute les API routes côté serveur. Le frontend appelle `/api/copilotkit` (même domaine), et c'est l'API route qui contacte le Container App backend. Pas de problème CORS.

#### 3. GitHub Actions Workflow — Déploiement Azure

```yaml
# .github/workflows/deploy-azure.yml
name: Deploy to Azure

on:
  push:
    branches: [worldcup2026]

jobs:
  # ── Frontend : Azure Static Web Apps ──
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install & Build
        run: npm ci && npm run build
        env:
          AGENT_URL: ${{ vars.AGENT_URL }}

      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_SWA_DEPLOYMENT_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          output_location: ".next"

  # ── Backend : Azure Container Apps ──
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Login to ACR
        run: az acr login --name ${{ vars.ACR_NAME }}

      - name: Build & Push Docker image
        run: |
          docker build -t ${{ vars.ACR_NAME }}.azurecr.io/wc2026-agent:${{ github.sha }} -f agent/Dockerfile agent/
          docker push ${{ vars.ACR_NAME }}.azurecr.io/wc2026-agent:${{ github.sha }}

      - name: Deploy to Container Apps
        run: |
          az containerapp update \
            --name wc2026-agent \
            --resource-group ${{ vars.AZURE_RESOURCE_GROUP }} \
            --image ${{ vars.ACR_NAME }}.azurecr.io/wc2026-agent:${{ github.sha }}
```

#### 4. Dockerfile pour le backend agent

```dockerfile
# agent/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Installer uv pour la gestion des dépendances
RUN pip install --no-cache-dir uv

# Copier les fichiers de dépendances d'abord (cache Docker)
COPY pyproject.toml uv.lock .python-version ./

# Installer les dépendances
RUN uv sync --frozen --no-dev

# Copier le code source
COPY src/ src/

# Port exposé (configurable via AGENT_PORT)
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/docs')" || exit 1

# Lancement
CMD ["uv", "run", "python", "src/main.py"]
```

#### 5. Templates de configuration

**`agent/.env.example`** :
```env
# ── Azure OpenAI — Provisionné par l'utilisateur ──
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_CHAT_DEPLOYMENT_NAME=gpt-4o
# Note : En local, utiliser une clé API. En production sur Azure Container Apps,
# préférer Managed Identity (DefaultAzureCredential) — pas besoin de clé.

# ── Agent server ──
AGENT_HOST=0.0.0.0
AGENT_PORT=8000
```

**`.env.example`** (racine, pour le frontend) :
```env
# URL du backend agent (Azure Container Apps en production, localhost en dev)
AGENT_URL=http://localhost:8000/
```

#### 6. Gestion des Secrets

**GitHub Secrets** (pour le CI/CD) :

```
Repository Settings → Secrets and variables → Actions

🔒 Secrets :
  ├── AZURE_SWA_DEPLOYMENT_TOKEN     = (token de déploiement Azure Static Web Apps)
  ├── AZURE_CREDENTIALS              = (Service Principal JSON pour az login)
  └── GITHUB_TOKEN                   = (automatique)

📋 Variables :
  ├── AGENT_URL                      = https://wc2026-agent.azurecontainerapps.io
  ├── ACR_NAME                       = wc2026acr
  └── AZURE_RESOURCE_GROUP           = rg-worldcup2026
```

**Azure Container Apps** (secrets runtime injectés comme env vars) :

```
Azure Portal → Container Apps → wc2026-agent → Settings → Secrets + Environment variables

  AZURE_OPENAI_ENDPOINT              = https://your-resource.openai.azure.com/
  AZURE_OPENAI_CHAT_DEPLOYMENT_NAME  = gpt-4o
  AGENT_HOST                         = 0.0.0.0
  AGENT_PORT                         = 8000
```

> **Option Managed Identity** : Si le Container App a une Managed Identity assignée avec le rôle `Cognitive Services OpenAI User` sur la ressource Azure OpenAI, le code existant (`DefaultAzureCredential()` dans `main.py`) fonctionne sans aucune clé API — c'est la méthode recommandée en production.

**Azure Static Web Apps** (app settings) :

```
Azure Portal → Static Web Apps → wc2026 → Configuration → Application settings

  AGENT_URL = https://wc2026-agent.azurecontainerapps.io
```

**Règle absolue** : Aucun secret dans le code. Le `.gitignore` existant exclut déjà `.env`, `.env.local`, `.env*.local`.

#### 7. Provisionnement de l'infrastructure Azure (IaC optionnel)

Commandes Azure CLI pour créer l'infrastructure :

```bash
# Variables
RG=rg-worldcup2026
LOCATION=eastus2
ACR_NAME=wc2026acr
CA_ENV=wc2026-env
CA_NAME=wc2026-agent

# Resource Group
az group create --name $RG --location $LOCATION

# Azure Container Registry
az acr create --name $ACR_NAME --resource-group $RG --sku Basic --admin-enabled true

# Container Apps Environment
az containerapp env create --name $CA_ENV --resource-group $RG --location $LOCATION

# Container App (première fois — les mises à jour sont faites par le CI/CD)
az containerapp create \
  --name $CA_NAME \
  --resource-group $RG \
  --environment $CA_ENV \
  --image $ACR_NAME.azurecr.io/wc2026-agent:latest \
  --target-port 8000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 3 \
  --cpu 0.5 --memory 1Gi \
  --registry-server $ACR_NAME.azurecr.io

# Azure Static Web Apps (créé via le portail ou CLI)
az staticwebapp create \
  --name wc2026 \
  --resource-group $RG \
  --source https://github.com/fredgis/foot-agui-sample \
  --branch worldcup2026 \
  --location $LOCATION
```

### Critères d'acceptation

- [ ] `npm run build` réussit (build Next.js SSR standard, pas d'export statique)
- [ ] Le GitHub Actions workflow déploie le frontend sur Azure Static Web Apps
- [ ] Le GitHub Actions workflow build et déploie l'image Docker sur Azure Container Apps
- [ ] L'API route `/api/copilotkit` contacte le Container App via `AGENT_URL`
- [ ] Les `.env.example` documentent toutes les variables nécessaires
- [ ] Le Dockerfile du backend agent build et démarre correctement
- [ ] Le healthcheck du Container App est vert
- [ ] La communication frontend → backend fonctionne via HTTPS (pas de CORS nécessaire car même flux via API route)
- [ ] La configuration Azure OpenAI fonctionne avec `_build_chat_client()` (clé ou Managed Identity)
- [ ] Scale-to-zero fonctionne sur le Container App (pas de coût au repos)

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
  └── 🤖 Agent Copilot #8 → WS8 (Azure Static Web Apps + Container Apps + CI/CD)
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
WS8 DEPLOY                                               │ Azure SWA + CA │ ✅
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

## ✅ Risques Identifiés et Solutions

| # | Risque | Impact | Solution concrète | Statut |
|---|--------|--------|-------------------|--------|
| R1 | **Données WC2026 incomplètes** — Le tirage au sort / calendrier officiel pourrait ne pas être finalisé | Moyen | Les types sont conçus avec des champs optionnels (`teamA: string` accepte `"TBD"`). Les données dans `worldcup-data.ts` et `worldcup2026.py` seront structurées avec un flag `provisional: boolean` sur chaque match. Un script `scripts/update-data.mjs` permettra de mettre à jour les données depuis une source FIFA officielle quand elles seront disponibles. **Aucun changement de code nécessaire, seules les données changent.** | 🟢 Résolu par design |
| R2 | **~~Export statique Next.js incompatible avec certaines features~~** | ~~Moyen~~ | **Éliminé** — Avec Azure Static Web Apps, on utilise le SSR hybrid natif de Next.js 16. Pas de `output: 'export'`, les API routes (`/api/copilotkit`) fonctionnent nativement côté serveur. Le `next.config.ts` reste inchangé. | 🟢 Éliminé |
| R3 | **Carte SVG complexe à réaliser** (VenueMap WS5) | Faible | Approche simplifiée validée : carte SVG minimaliste avec contours des 3 pays (paths SVG standards disponibles librement). Les 16 stades sont positionnés par coordonnées GPS normalisées en `viewBox` SVG. Pas de librairie cartographique externe, pur SVG + CSS. Si le rendu est insuffisant, fallback vers une grille de cards par pays (USA/Canada/Mexique) sans carte. | 🟢 Résolu par design |
| R4 | **Latence AG-UI avec backend distant** — Le Container App est sur un réseau différent du frontend | Moyen | **Résolu par l'architecture Azure** — Le frontend Next.js (Azure Static Web Apps) appelle son propre API route `/api/copilotkit` (même domaine, 0 latence CORS). C'est l'API route serveur qui contacte le Container App via le réseau Azure interne. De plus, Azure Container Apps et Static Web Apps peuvent être dans la même région (`eastus2`), minimisant la latence réseau. Le protocole AG-UI utilise SSE (Server-Sent Events) qui maintient une connexion persistante — pas de latence de reconnexion. | 🟢 Résolu par architecture |
| R5 | **Taille du bundle avec toutes les données statiques** (48 équipes, 16 stades, 104 matchs) | Faible | Les données statiques (`worldcup-data.ts`) sont estimées à ~50-80 KB minifiés — négligeable. Next.js 16 avec Turbopack fait du tree-shaking automatique. Si nécessaire, les données seront découpées en modules séparés (`teams.ts`, `stadiums.ts`, `matches.ts`) et importées via `dynamic import()` pour du code splitting. Le composant `TournamentBracket` (le plus lourd en SVG) sera lazy-loaded avec `React.lazy()`. | 🟢 Résolu par design |
| R6 | **CORS entre frontend et backend** | Faible | **Non applicable** — Le frontend appelle `/api/copilotkit` sur son propre domaine (Azure SWA). L'API route contacte le Container App côté serveur (server-to-server, pas de CORS). Le CORS existant dans `main.py` (`allow_origins=["*"]`) reste en place comme filet de sécurité pour le développement local. | 🟢 Non applicable |
| R7 | **Coût Azure** — Les services Azure pourraient générer des coûts | Faible | Azure Static Web Apps a un **tier gratuit** (Free) suffisant pour ce projet. Azure Container Apps offre du **scale-to-zero** (0 coût au repos). Azure Container Registry a un tier Basic à ~5$/mois. Azure OpenAI est le seul coût variable (usage API), provisionné par l'utilisateur. **Coût estimé au repos : ~5$/mois** (ACR uniquement). | 🟢 Maîtrisé |

---

## 📝 Prochaines Étapes

1. ✅ **Valider ce plan** — Lecture et feedback
2. **Créer les 8 issues GitHub** — Une par workstream avec labels, descriptions et critères d'acceptation
3. **Lancer les agents Copilot** — Phase 1 en parallèle (WS1 + WS3-WS6)
4. **Intégration progressive** — WS2 → WS7 → WS8