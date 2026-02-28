# ⚽🏆 FIFA World Cup 2026 — Assistant IA Immersif

> Application conversationnelle propulsée par l'IA pour explorer la Coupe du Monde 2026 : 48 équipes, 104 matchs, 16 stades, powered by AG-UI + CopilotKit + Microsoft Agent Framework.

![World Cup 2026](./screenshot.png)

---

## 🌟 Présentation

**Copa** est un assistant IA expert de la Coupe du Monde 2026 🇺🇸🇲🇽🇨🇦. L'application combine un agent conversationnel intelligent avec une interface immersive qui s'adapte dynamiquement à chaque équipe sélectionnée — couleurs nationales, drapeaux, calendrier des matchs, carte des stades, groupes et bracket du tournoi.

### ✨ Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| 🗣️ **Agent Copa** | Chatbot expert WC2026 — 8 outils IA (infos équipes, matchs, stades, comparaisons, météo, bracket) |
| 🏳️ **48 équipes** | Fiches complètes avec drapeaux, joueurs clés, palmarès, classement FIFA |
| 📅 **104 matchs** | Calendrier complet : phases de groupes → Finale, avec filtres et countdown |
| 🗺️ **Carte interactive** | 16 stades SVG sur carte USA/Canada/Mexique avec pins cliquables |
| 🌍 **12 groupes** | Vue groupes responsive avec navigation inter-équipes |
| 🏆 **Bracket tournoi** | Arbre R32 → Finale avec sélection de phase |
| 🎨 **Thème dynamique** | Interface qui change de couleurs selon l'équipe sélectionnée |
| 📱 **Mobile-first** | Tabs mobiles + CopilotPopup / Desktop sidebar + grille |
| ⏱️ **Countdown live** | Décompte en temps réel jusqu'au 11 juin 2026 |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        👤 UTILISATEUR                               │
│                   (navigateur desktop ou mobile)                    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  🖥️  FRONTEND — Next.js 16 + React 19 + TailwindCSS 4              │
│                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────┐               │
│  │  WelcomeScreen│ │  TeamCard    │ │ MatchSchedule │               │
│  │  (countdown,  │ │  (fiche      │ │ (104 matchs,  │               │
│  │   48 équipes, │ │   complète,  │ │  filtres,     │               │
│  │   recherche)  │ │   joueurs)   │ │  countdown)   │               │
│  └──────────────┘ └──────────────┘ └───────────────┘               │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────┐               │
│  │  VenueMap     │ │  GroupView   │ │ Tournament    │               │
│  │  (carte SVG,  │ │  (12 groupes,│ │ Bracket       │               │
│  │   16 stades)  │ │   4 équipes) │ │ (R32→Finale)  │               │
│  └──────────────┘ └──────────────┘ └───────────────┘               │
│                                                                     │
│  CopilotKit v1.52 ─── useCoAgent (state sync) ─── AG-UI Protocol   │
│                                                                     │
│  API Route: /api/copilotkit → HttpAgent(AGENT_URL)                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ AG-UI Protocol (SSE events)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  🐍  BACKEND — Python 3.12 + FastAPI + Microsoft Agent Framework    │
│                                                                     │
│  Copa Agent (agent.py):                                             │
│    • System prompt: expert passionné WC2026                         │
│    • STATE_SCHEMA → predict_state sync avec le frontend             │
│    • 8 @ai_function tools:                                          │
│        update_team_info    get_team_matches    get_stadium_info     │
│        get_group_standings get_venue_weather   show_tournament_bracket│
│        compare_teams       get_city_guide                           │
│                                                                     │
│  Data layer (data/worldcup2026.py):                                 │
│    • 48 teams, 16 stadiums, 12 groups, 104 matches (Python mirror)  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ API Call
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  🧠  LLM — Azure OpenAI / OpenAI                                    │
│                                                                     │
│  Modèle recommandé : gpt-4o-mini (ou gpt-4o pour plus de qualité)   │
│  Support : Azure OpenAI (Managed Identity) ou OpenAI API key        │
└─────────────────────────────────────────────────────────────────────┘
```

### Flux de données

1. **User → CopilotSidebar/Popup** → CopilotKit Runtime (`/api/copilotkit`)
2. **Runtime → HttpAgent** → FastAPI backend via AG-UI Protocol (SSE)
3. **Agent** appelle LLM + émet des events : `StateSnapshotEvent`, `ToolCallStart/End`, `TextMessageContent`
4. **Events → useCoAgent** → React components se mettent à jour en temps réel
5. **Thème dynamique** : les couleurs nationales de l'équipe changent l'UI entière

> 📐 Plan de développement complet : [`docs/worldcup2026-development-plan.md`](docs/worldcup2026-development-plan.md)

---

## 🚀 Démarrage rapide

### Prérequis

- **Node.js** 18+ (v24 LTS recommandé)
- **Python** 3.12+
- **uv** (gestionnaire de packages Python) — `pip install uv`
- Une clé **Azure OpenAI** ou **OpenAI**

### 1. Cloner et installer

```bash
git clone https://github.com/fredgis/foot-agui-sample.git
cd foot-agui-sample
git checkout worldcup2026

# Frontend
npm install

# Backend
cd agent
uv sync
cd ..
```

### 2. ⚙️ Configurer la clé du modèle

Créez le fichier `agent/.env` (copier depuis l'exemple) :

```bash
cp agent/.env.example agent/.env
```

Puis éditez `agent/.env` avec **une** des deux options :

#### Option A : Azure OpenAI avec clé API (recommandé)

```env
AZURE_OPENAI_ENDPOINT=https://votre-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=votre-clé-api-azure
AZURE_OPENAI_CHAT_DEPLOYMENT_NAME=gpt-4o-mini
```

> Pas besoin de `az login` — la clé API suffit.

#### Option B : Azure OpenAI avec Managed Identity

```env
AZURE_OPENAI_ENDPOINT=https://votre-resource.openai.azure.com/
AZURE_OPENAI_CHAT_DEPLOYMENT_NAME=gpt-4o-mini
```

> Sans `AZURE_OPENAI_API_KEY`, le code utilise `DefaultAzureCredential` (nécessite `az login` en local).

#### Option C : OpenAI directement

```env
OPENAI_API_KEY=sk-proj-...votre-clé...
OPENAI_CHAT_MODEL_ID=gpt-4o-mini
```

> Obtenez votre clé sur [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 3. Lancer l'application

```bash
# Lance frontend + agent ensemble
npm run dev
```

Ou séparément dans deux terminaux :

```bash
# Terminal 1 — Frontend
npm run dev:ui
# → http://localhost:3000

# Terminal 2 — Agent
npm run dev:agent
# → http://localhost:8000
```

### 4. Tester

Ouvrez **http://localhost:3000** et :
- Cliquez sur un drapeau d'équipe → l'agent vous montre sa fiche complète
- Tapez dans le chat : "Montre-moi les matchs de la France"
- Essayez : "Compare Brésil vs Argentine"
- Cliquez sur "Groupe" ou "Bracket" dans la navigation

---

## 📁 Structure du projet

```
foot-agui-sample/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Page principale — orchestration complète
│   │   ├── globals.css           # Dark theme, animations, CopilotKit styles
│   │   ├── layout.tsx            # Layout root + CopilotKit Provider
│   │   └── api/copilotkit/
│   │       └── route.ts          # API route → HttpAgent → backend
│   ├── components/
│   │   ├── team-card.tsx         # Fiche équipe (joueurs, palmarès, maillot)
│   │   ├── match-schedule.tsx    # Calendrier 104 matchs avec filtres
│   │   ├── venue-map.tsx         # Carte SVG interactive 16 stades
│   │   ├── group-view.tsx        # 12 groupes responsive
│   │   └── tournament-bracket.tsx # Bracket R32 → Finale
│   └── lib/
│       ├── types.ts              # Types TS (TeamInfo, MatchInfo, AgentState...)
│       ├── worldcup-data.ts      # Données statiques (48 teams, 104 matches...)
│       └── flags.ts              # FIFA code → flag images (flagcdn.com)
├── agent/
│   ├── src/
│   │   ├── agent.py              # Copa agent — 8 tools, system prompt
│   │   ├── main.py               # FastAPI server + LLM client
│   │   └── data/
│   │       └── worldcup2026.py   # Données Python (mirror du TS)
│   ├── .env.example              # ← COPIER vers .env et configurer
│   ├── Dockerfile                # Multi-stage Docker build
│   └── pyproject.toml            # Dépendances Python
├── scripts/
│   ├── deploy.sh                 # One-click Azure deploy (Linux/Mac)
│   ├── deploy.ps1                # One-click Azure deploy (Windows)
│   └── deploy-config.env.example # Config déploiement Azure
├── .github/workflows/
│   └── deploy-azure.yml          # CI/CD GitHub Actions → Azure
├── docs/
│   └── worldcup2026-development-plan.md  # Plan détaillé (1470+ lignes)
└── package.json
```

---

## 🛠️ Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Lance frontend + agent ensemble (concurrently) |
| `npm run dev:ui` | Frontend seul (Next.js Turbopack) sur :3000 |
| `npm run dev:agent` | Agent Python seul sur :8000 |
| `npm run build` | Build de production Next.js |
| `npm run lint` | Vérification ESLint |

---

## 🎨 Tout est dynamique

Oui, **tout est dynamique** :

- **Couleurs** : Quand vous sélectionnez une équipe, l'UI entière change de couleur (header, borders, sidebar, countdown, boutons)
- **Contenu** : L'agent LLM génère les réponses en temps réel via AG-UI streaming
- **State sync** : Le state de l'agent Python (`teamInfo`, `matches`, `selectedStadium`, `tournamentView`, `highlightedCity`) est synchronisé en temps réel avec React via `useCoAgent`
- **Composants** : La page affiche dynamiquement le bon composant selon le state (WelcomeScreen → TeamCard+MatchSchedule+VenueMap → GroupView → TournamentBracket)
- **Drapeaux** : Images chargées depuis CDN (flagcdn.com) basées sur le code FIFA
- **Cross-component** : Cliquer sur un match → highlight le stade sur la carte ; cliquer sur un adversaire → lance une comparaison dans le chat

---

## ☁️ Déploiement Azure

### Architecture de déploiement

| Composant | Service Azure | Notes |
|---|---|---|
| Frontend (Next.js SSR) | Azure Static Web Apps | Hybrid rendering, API routes incluses |
| Backend (FastAPI) | Azure Container Apps | Scale-to-zero, Docker |
| LLM | Azure OpenAI | Managed Identity (pas de clé) |

### One-click deploy

```bash
# 1. Copier la config
cp scripts/deploy-config.env.example scripts/deploy-config.env

# 2. Éditer avec vos valeurs Azure
#    (subscription, resource group, region, etc.)

# 3. Lancer (idempotent — peut être relancé sans risque)
# Linux/Mac
bash scripts/deploy.sh

# Windows
powershell scripts/deploy.ps1
```

### CI/CD GitHub Actions

Le workflow `.github/workflows/deploy-azure.yml` se déclenche sur push vers `main`. Configurez ces secrets dans votre repo GitHub :

| Secret | Description |
|---|---|
| `AZURE_CREDENTIALS` | Service Principal JSON (`az ad sp create-for-rbac`) |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Token de déploiement SWA |
| `AGENT_URL` | URL du Container App backend |

> ⚠️ `AGENT_URL` doit aussi être configuré comme **Application Setting** dans le portail Azure SWA (Settings → Configuration) pour fonctionner au runtime.

---

## 📚 Documentation

| Document | Contenu |
|---|---|
| [`docs/worldcup2026-development-plan.md`](docs/worldcup2026-development-plan.md) | Plan complet : 9 workstreams, architecture Mermaid, acceptance criteria, risques |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Architecture existante |
| [`DEBUG.md`](DEBUG.md) | Guide de débogage |

---

## 🔧 Stack technique

| Layer | Technologie | Version |
|---|---|---|
| Frontend | Next.js + React + TailwindCSS | 16 + 19 + 4 |
| UI Agent | CopilotKit | 1.52.1 |
| Protocol | AG-UI (SSE events) | 0.0.46 |
| Backend | Python + FastAPI + MS Agent Framework | 3.12 |
| LLM | Azure OpenAI / OpenAI | gpt-4o-mini |
| Deploy | Azure Static Web Apps + Container Apps | — |
| CI/CD | GitHub Actions | — |

---

## 📄 Licence

MIT — voir [LICENSE](LICENSE)

---

**Développé avec ⚽ pour la FIFA World Cup 2026 🇺🇸🇲🇽🇨🇦**
**Propulsé par CopilotKit + Microsoft Agent Framework + Azure OpenAI**
