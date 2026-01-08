# ⚽ Expert Football Mondial - Agent Conversationnel Dynamique

> Application intelligente alimentée par l'IA (GPT-5.2) pour explorer l'univers du football mondial

### Page d'Accueil

![Page d'Accueil](./screenshot.png)

### Interface Thématisée (Exemple : AS Saint-Étienne)

![AS Saint-Étienne](./screenshot-asse.png)

---

## 🌟 Présentation

**Expert Football Mondial** est une application web interactive qui combine l'intelligence artificielle de pointe avec une interface utilisateur dynamique pour offrir une expérience immersive du football mondial. Posez des questions sur n'importe quel club ou équipe nationale, et l'application transforme automatiquement son interface aux couleurs de l'équipe tout en vous racontant son histoire.

### Caractéristiques Principales

- **🌍 Couverture Mondiale Totale**
  - TOUS les clubs de football du monde (aucune limitation géographique)
  - TOUTES les équipes nationales (Coupe du Monde, Euro, Copa América, etc.)
  - Base de connaissances alimentée par GPT-5.2

- **🎨 Interface 100% Dynamique**
  - Couleurs extraites intelligemment depuis les descriptions textuelles
  - Maillot SVG généré en temps réel avec les couleurs du club
  - Plus de 50 couleurs mappées pour une précision optimale
  - Aucun thème hardcodé - tout est calculé dynamiquement

- **💬 Agent Conversationnel Expert**
  - Chat intelligent spécialisé en football
  - Histoire des clubs TOUJOURS traduite en français
  - Restriction thématique : répond uniquement aux questions football
  - Réponses enrichies avec palmarès, légendes, stades

- **⚡ Technologies de Pointe**
  - **Frontend**: Next.js 16 + React 19 + TypeScript
  - **Backend**: Python FastAPI + Microsoft Agent Framework
  - **IA**: Azure OpenAI GPT-5.2 (gpt-4o-2024-08-06)
  - **Protocol**: AG-UI (Agent-Generated UI) via CopilotKit v1.50.0

---

## 🎯 Fonctionnalités

### 1. Détection Automatique des Équipes

Mentionnez simplement un club ou une équipe nationale dans le chat :

```
"Parle-moi de l'AS Saint-Étienne"
"Tell me about Manchester United"
"Brazil national team history"
"Équipe de France Euro 2024"
```

### 2. Thématisation Dynamique

L'interface change instantanément :
- ✅ Couleurs primaires et secondaires du club
- ✅ Maillot SVG généré avec les bonnes couleurs
- ✅ Informations détaillées (fondation, stade, capacité)
- ✅ Histoire traduite en français

### 3. Informations Complètes

Pour chaque équipe, obtenez :
- **📊 Données Factuelles**: Fondation, stade, capacité, pays
- **📖 Histoire**: Récit détaillé en français
- **🏆 Palmarès**: Liste des titres et trophées majeurs
- **⭐ Légendes**: Joueurs iconiques qui ont marqué l'histoire

---

## 🚀 Installation

### Prérequis

- **Node.js** 18+ (pnpm recommandé)
- **Python** 3.11+
- **Azure OpenAI** : Clé API et endpoint configurés

### 1. Cloner le Répertoire

```bash
git clone <votre-repo>
cd my-ag-ui-app
```

### 2. Installer les Dépendances Frontend

```bash
# Avec pnpm (recommandé)
pnpm install

# Avec npm
npm install

# Avec yarn
yarn install
```

### 3. Configurer l'Agent Python

```bash
# Windows
cd agent
.\setup-agent.bat

# Linux/Mac
cd agent
chmod +x setup-agent.sh
./setup-agent.sh
```

Ou manuellement :

```bash
cd agent
pip install uv  # Si pas déjà installé
uv sync
```

### 4. Configuration Azure OpenAI

Créez un fichier `.env` dans le dossier `agent/` :

```env
AZURE_OPENAI_API_KEY=votre_cle_api
AZURE_OPENAI_ENDPOINT=https://votre-endpoint.openai.azure.com
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
```

### 5. Démarrer l'Application

```bash
# Depuis la racine du projet
pnpm dev

# Ou avec npm/yarn
npm run dev
yarn dev
```

Cela lance :
- **Frontend Next.js** sur `http://localhost:3000`
- **Backend Python FastAPI** sur `http://localhost:8000`

---

## 📖 Utilisation

### Exemples de Clubs

Essayez ces clubs pour voir l'application en action :

- **Angleterre**: "Manchester United", "Liverpool", "Chelsea"
- **Espagne**: "FC Barcelona", "Real Madrid", "Atlético"
- **Italie**: "AC Milan", "Juventus", "Inter Milan"
- **Allemagne**: "Bayern Munich", "Borussia Dortmund"
- **France**: "Paris Saint-Germain", "Olympique de Marseille", "AS Saint-Étienne"
- **Brésil**: "Flamengo", "Palmeiras", "Corinthians"
- **Argentine**: "Boca Juniors", "River Plate"

### Exemples d'Équipes Nationales

Explorez également les équipes nationales :

- **Coupe du Monde**: "Brazil national team", "Germany World Cup"
- **Euro**: "France Euro 2024", "Spain Euro history"
- **Copa América**: "Argentina Copa América", "Brazil confederation"

---

## 🏗️ Architecture

### Vue d'Ensemble

```
┌─────────────────────┐
│   👤 UTILISATEUR    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────┐
│  🖥️ FRONTEND (Next.js)  │
│  - CopilotKit           │
│  - React Components     │
│  - Dynamic Theming      │
└──────────┬──────────────┘
           │ AG-UI Protocol
           ▼
┌─────────────────────────┐
│  🐍 BACKEND (FastAPI)   │
│  - Agent Python         │
│  - @ai_function         │
│  - State Management     │
└──────────┬──────────────┘
           │ Azure OpenAI API
           ▼
┌─────────────────────────┐
│   🧠 AZURE OPENAI       │
│   GPT-5.2               │
│   (gpt-4o-2024-08-06)   │
└─────────────────────────┘
```

### Composants Clés

- **[page.tsx](src/app/page.tsx)**: Composant principal avec logique de thématisation
- **[agent.py](agent/src/agent.py)**: Agent Python avec fonctions IA
- **[route.ts](src/app/api/copilotkit/route.ts)**: Endpoint AG-UI
- **[types.ts](src/lib/types.ts)**: Définitions TypeScript

> 📐 Pour une documentation d'architecture complète avec diagrammes, consultez [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 🎨 Extraction de Couleurs

L'application utilise un système intelligent d'extraction de couleurs :

### Fonctionnement

1. **GPT-5.2** fournit une description textuelle des couleurs (ex: "Red and White")
2. **extractColors()** parse le texte et mappe les couleurs vers des codes hex
3. **50+ couleurs mappées** : rouge, bleu, vert, bordeaux, marine, or, argent, etc.
4. **Génération SVG** : Maillot créé dynamiquement avec les couleurs extraites

### Exemple

```typescript
Input: "Green and White"
↓ extractColors()
Output: { primary: "#16A34A", secondary: "#FFFFFF" }
↓ Génération SVG
Maillot vert et blanc affiché
```

---

## 📚 Documentation Complète

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Architecture détaillée avec diagrammes Mermaid
- **[DEBUG.md](DEBUG.md)** - Guide de débogage et résolution de problèmes

---

## 🛠️ Scripts Disponibles

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Lance UI + Agent en mode développement |
| `pnpm dev:debug` | Mode debug avec logs détaillés |
| `pnpm dev:ui` | Lance uniquement le frontend Next.js |
| `pnpm dev:agent` | Lance uniquement l'agent Python |
| `pnpm build` | Build de production |
| `pnpm lint` | Vérification ESLint |

---

## 🐛 Débogage

### Logs Frontend (Console Navigateur F12)

```
🔍 DEBUG - agentState: {...}
✅ Club détecté: Manchester United
🎨 Application du thème: {primary: "#DC143C", secondary: "#FFFFFF"}
```

### Logs Backend (Terminal Agent)

```
🔔 UPDATE_CLUB_INFO CALLED with: {...}
✅ Updating club info for: Manchester United
📤 Sending response to frontend
```

> Pour plus de détails, consultez [DEBUG.md](DEBUG.md)

---

## 🌐 Ressources Externes

- [CopilotKit Documentation](https://docs.copilotkit.ai)
- [Microsoft Agent Framework](https://aka.ms/agent-framework)
- [AG-UI Protocol](https://docs.copilotkit.ai/microsoft-agent-framework)
- [Azure OpenAI Service](https://azure.microsoft.com/products/ai-services/openai-service)
- [Next.js Documentation](https://nextjs.org/docs)

---

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Améliorer l'extraction de couleurs
- Ajouter de nouvelles fonctionnalités
- Optimiser les performances
- Corriger des bugs

---

## 📄 Licence

Ce projet est open-source, basé sur le template CopilotKit.

---

## ⚡ Performance

- **Extraction de couleurs** : < 10ms
- **Génération SVG** : Instantanée
- **Streaming GPT** : Réponses progressives
- **State Management** : Optimisé avec AG-UI protocol

---

**Développé avec ❤️ en utilisant CopilotKit, Microsoft Agent Framework et Azure OpenAI GPT-5.2**
