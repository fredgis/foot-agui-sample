# Plan de Développement — Assistant Foot AG-UI centré Coupe du Monde 2026

## 1) Contexte et objectifs

Ce document formalise le plan de transformation du projet **fredgis/foot-agui-sample** vers une expérience conversationnelle immersive centrée sur la **FIFA World Cup 2026**.

Objectifs principaux :

- Conserver l’architecture **AG-UI** existante (protocole, synchronisation d’état, événements agent).
- Conserver et renforcer l’usage du **GitHub Copilot SDK** (CopilotKit) côté frontend.
- Garder les sources frontend dans **`/src`**.
- Livrer une UX immersive orientée équipes nationales, matchs, groupes, stades, villes hôtes.
- Déployer avec l’option retenue :
  - **Frontend statique sur GitHub Pages**
  - **Backend agent Python sur Railway/Render (option B)**
- Utiliser un modèle **Azure OpenAI** provisionné par le propriétaire du projet (configuration via variables d’environnement / secrets).

---

## 2) Décisions techniques validées

### 2.1 AG-UI Protocol : conservé

Le protocole AG-UI reste le cœur de la communication entre frontend et agent :

- événements d’agent
- snapshots d’état
- tool calls
- synchronisation bidirectionnelle

### 2.2 GitHub Copilot SDK (CopilotKit) : conservé

Le frontend continue d’utiliser CopilotKit / GitHub Copilot SDK :

- `@copilotkit/react-core`
- `@copilotkit/react-ui`
- `@copilotkit/runtime`
- hooks `useCoAgent`, `useCopilotAction`, etc.

### 2.3 Structure `/src` : conservée

Le frontend reste organisé sous `src/`.

### 2.4 Hébergement : option B

- **GitHub Pages** pour le frontend exporté statiquement.
- **Railway/Render** pour l’agent FastAPI Python (AG-UI backend).

### 2.5 Modèle : Azure OpenAI

- Pas d’usage de GitHub Models pour ce projet.
- Le modèle est fourni via Azure OpenAI.
- Secrets stockés dans GitHub (Actions) et dans l’hébergeur backend (Railway/Render).

---

## 3) Architecture cible

## 3.1 Vue d’ensemble

```text
Utilisateur
  ↓
Frontend Next.js exporté statiquement (GitHub Pages)
  - CopilotKit SDK
  - UI immersive World Cup 2026
  ↓ (HTTPS)
CopilotKit Runtime URL configurée par variable d’environnement
  ↓
Backend Agent Python (Railway/Render)
  - FastAPI
  - Microsoft Agent Framework
  - AG-UI endpoint
  - Azure OpenAI Chat client
  ↓
Azure OpenAI
```

## 3.2 Pourquoi GitHub Pages ne peut pas héberger toute l’app

GitHub Pages héberge du statique uniquement. L’agent Python FastAPI et la logique serveur doivent être déployés séparément.

---

## 4) Structure de projet cible

```text
.
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  ├─ globals.css
│  │  └─ api/ (selon mode local/dev)
│  ├─ components/
│  │  ├─ team-card.tsx
│  │  ├─ match-schedule.tsx
│  │  ├─ venue-map.tsx
│  │  ├─ group-view.tsx
│  │  ├─ tournament-bracket.tsx
│  │  └─ weather.tsx (enrichi)
│  └─ lib/
│     ├─ types.ts
│     └─ worldcup-data.ts
├─ agent/
│  ├─ src/
│  │  ├─ main.py
│  │  ├─ agent.py
│  │  └─ data/
│  │     └─ worldcup2026.py
│  ├─ pyproject.toml
│  └─ .env.example
└─ docs/
   └─ worldcup2026-development-plan.md
```

---

## 5) Expérience utilisateur cible (immersive)

Quand l’utilisateur parle d’une équipe nationale :

- thème dynamique (couleurs de l’équipe)
- carte d’identité équipe (confédération, ranking FIFA, stars)
- calendrier des matchs de la WC 2026
- carte des stades/villes hôtes avec surbrillance du parcours
- vue de groupe + arbre du tournoi
- météo contextualisée des villes de match
- réponses de l’agent avec personnalité de commentateur sportif

---

## 6) Plan de développement en workstreams parallélisables

## WS1 — Data Layer & Types World Cup 2026 (Critique)

**Objectif** : créer les données structurées et les types partagés.

Livrables :

- `src/lib/types.ts`
- `src/lib/worldcup-data.ts`
- `agent/src/data/worldcup2026.py`

Contenu attendu :

- équipes (codes FIFA, confédération, couleurs, stars, historique)
- groupes
- stades/villes hôtes
- calendrier des matchs

## WS2 — Refonte Agent Backend Python (Critique)

**Objectif** : faire de l’agent un expert World Cup 2026.

Livrables :

- `agent/src/agent.py` (nouveau schéma d’état, nouveaux tools)

Fonctions envisagées :

- `update_team_info`
- `get_team_matches`
- `get_stadium_info`
- `get_group_standings`
- `get_venue_weather`
- `show_tournament_bracket`
- `compare_teams`
- `get_city_guide`

## WS3 — TeamCard (Critique)

**Objectif** : composant d’identité équipe nationale immersif.

Livrable : `src/components/team-card.tsx`

## WS4 — MatchSchedule (Haute)

**Objectif** : timeline des matchs d’une équipe.

Livrable : `src/components/match-schedule.tsx`

## WS5 — VenueMap (Haute)

**Objectif** : carte interactive des stades et villes hôtes.

Livrable : `src/components/venue-map.tsx`

## WS6 — GroupView & TournamentBracket (Moyenne)

**Objectif** : visualisation groupes + arbre du tournoi.

Livrables :

- `src/components/group-view.tsx`
- `src/components/tournament-bracket.tsx`

## WS7 — Orchestration page principale (Critique)

**Objectif** : intégrer tous les composants dans une expérience cohérente.

Livrables :

- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`

## WS8 — Déploiement (GitHub Pages + Railway/Render) (Moyenne)

**Objectif** : pipeline de déploiement production.

Livrables :

- configuration export statique Next.js
- workflow GitHub Actions pour Pages
- configuration backend distant
- documentation run/deploy

---

## 7) Flux de parallélisation recommandé

Phase 1 (parallèle) : WS1 + WS3 + WS4 + WS5 + WS6  
Phase 2 : WS2 (après disponibilité des types/données WS1)  
Phase 3 : WS7 (intégration complète)  
Phase 4 : WS8 (industrialisation déploiement)

---

## 8) Configuration environnement et secrets

## 8.1 Fichiers template (committés)

`agent/.env.example`

```env
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_CHAT_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_KEY=

# Agent server
AGENT_HOST=0.0.0.0
AGENT_PORT=8000
```

`.env.example` (frontend)

```env
# URL publique du backend AG-UI (Railway/Render)
NEXT_PUBLIC_COPILOTKIT_URL=https://your-agent.railway.app
```

## 8.2 Secrets (non commit)

Stockage recommandé :

- GitHub **Secrets** (Actions)
- Variables d’environnement Railway/Render

Secrets backend :

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_CHAT_DEPLOYMENT_NAME`
- `AZURE_OPENAI_KEY`

Variable frontend :

- `NEXT_PUBLIC_COPILOTKIT_URL` (variable non sensible)

---

## 9) Intégration AG-UI + Copilot SDK (principes)

- Le state agent est la source de vérité pour les vues conversationnelles.
- `predict_state` doit refléter précisément les mutations induites par les tools.
- Le frontend consomme le state via `useCoAgent`.
- Les interactions UI (clic match/stade/groupe) déclenchent des actions cohérentes avec les tools exposés.
- Le runtime URL CopilotKit doit être paramétrable par environnement (local vs production).

---

## 10) Critères d’acceptation globaux

- [ ] AG-UI fonctionne de bout en bout (state sync + tool events).
- [ ] Copilot SDK est utilisé comme couche conversationnelle principale.
- [ ] Frontend reste dans `/src`.
- [ ] Expérience centrée World Cup 2026 opérationnelle (équipe, matchs, lieux, groupes, bracket).
- [ ] Déploiement GitHub Pages fonctionnel pour le frontend.
- [ ] Backend agent déployé séparément sur Railway/Render.
- [ ] Azure OpenAI configuré uniquement via variables d’environnement/secrets.
- [ ] Aucun secret committé dans le repository.

---

## 11) Risques et mitigations

- **Risque données incomplètes / évolutives**  
  Mitigation : centraliser les données, versionner les sources, prévoir fallback UI.

- **Risque CORS entre Pages et backend**  
  Mitigation : config FastAPI CORS explicite sur domaines autorisés.

- **Risque divergence state frontend/backend**  
  Mitigation : tests d’intégration AG-UI + validation des transitions d’état.

- **Risque UX lourde sur mobile**  
  Mitigation : design responsive, lazy loading des vues riches (carte/bracket).

---

## 12) Prochaines étapes

1. Validation de ce document de plan.
2. Création des issues WS1 → WS8 avec critères d’acceptation détaillés.
3. Attribution des issues à plusieurs Copilot agents pour exécution en parallèle.
4. Revue d’intégration et arbitrages UX.
5. Préparation release candidate et déploiement.

---

Document de référence pour l’exécution du chantier **World Cup 2026** sur `worldcup2026`.