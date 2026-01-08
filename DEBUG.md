# 🔍 GUIDE DE DÉBOGAGE - Thème Football Dynamique

## ✅ MODIFICATIONS APPORTÉES

### 1. **Logs dans le Frontend** (page.tsx)
Ajout de console.log pour tracer:
- L'état complet de agentState
- Les valeurs de clubInfo
- Quand un thème est appliqué
- Les erreurs si le thème n'est pas trouvé

### 2. **Logs dans l'Agent Python** (agent.py)
Ajout de print statements dans `update_club_info`:
- Quand la fonction est appelée
- Les données reçues
- Le nom du club mis à jour

### 3. **Instructions Agent Renforcées**
Instructions plus explicites avec:
- Exemples concrets de détection
- Liste complète des alias (ASSE, Verts, Sainté, PSG, OM, OL, Rennes)
- Règles CRITICAL pour appeler update_club_info AVANT de répondre

## 🧪 TESTS À EFFECTUER

### Test 1: Vérifier que l'application démarre
```bash
npm run dev
```
- ✅ UI sur http://localhost:3000
- ✅ Agent sur http://localhost:8000
- ✅ Pas d'erreurs de compilation

### Test 2: Ouvrir la console navigateur
1. Appuyez sur F12 dans le navigateur
2. Allez dans l'onglet "Console"
3. Cherchez les messages commençant par 🔍 DEBUG

### Test 3: Prompt de test Saint-Étienne
Dans le chat AG-UI, tapez:
```
J'adore Saint-Étienne !
```

**Ce qui DEVRAIT se passer:**

**Dans la console navigateur (F12):**
```
🔍 DEBUG - agentState: {...}
🔍 DEBUG - clubInfo: { name: "AS Saint-Étienne", ... }
✅ Club détecté: AS Saint-Étienne
🎨 Application du thème: { color: "#00965E", logo: "...", background: "..." }
```

**Dans le terminal de l'agent:**
```
🔔 UPDATE_CLUB_INFO CALLED with: { name: "AS Saint-Étienne", founded: "1919", ... }
✅ Updating club info for: AS Saint-Étienne
```

**Visuellement:**
- ✅ Fond change pour le Stade Geoffroy-Guichard
- ✅ Couleur verte (#00965E) partout
- ✅ Logo ASSE apparaît en haut à gauche
- ✅ Titre "AS SAINT-ÉTIENNE" en énorme
- ✅ Barres animées sous le titre
- ✅ Particules flottantes
- ✅ Carte d'informations en bas

### Test 4: Autres clubs
Essayez chaque club:
```
Parle-moi du PSG
```
- Devrait devenir bleu #004170 avec Parc des Princes

```
Lyon c'est le meilleur
```
- Devrait devenir rouge #DA0037 avec Groupama Stadium

```
J'aime l'OM
```
- Devrait devenir bleu ciel #2FAEE0 avec Vélodrome

```
Rennes est génial
```
- Devrait devenir rouge #DC0814 avec Roazhon Park

## 🐛 SI ÇA NE MARCHE PAS

### Problème 1: Console affiche "⏳ En attente de clubInfo..."
**Cause**: L'agent n'appelle pas update_club_info
**Solution**: 
- Vérifiez le terminal de l'agent
- Cherchez les messages 🔔 UPDATE_CLUB_INFO CALLED
- Si aucun → L'agent ne détecte pas le club ou n'appelle pas la fonction

### Problème 2: Terminal agent n'affiche rien
**Cause**: L'agent ne s'exécute pas ou crash
**Solution**:
- Vérifiez que le port 8000 est actif
- Redémarrez avec `npm run dev`
- Vérifiez les erreurs Python

### Problème 3: Console affiche clubInfo mais thème ne change pas
**Cause**: Problème dans le mapping clubThemes
**Solution**:
- Vérifiez que le nom du club EXACT correspond
- Comparez `agentState.clubInfo.name` avec les clés du clubThemes

### Problème 4: "⚠️ Aucun thème trouvé pour: XXX"
**Cause**: Le nom du club retourné par l'agent ne correspond pas exactement aux clés
**Solution**:
- Noms attendus EXACTS:
  * "AS Saint-Étienne"
  * "Paris Saint-Germain"
  * "Olympique de Marseille"
  * "Olympique Lyonnais"
  * "Stade Rennais"

## 📊 ARCHITECTURE DU FLUX

```
USER INPUT
   ↓
AGENT DÉTECTE CLUB (agent.py ligne ~100-230)
   ↓
AGENT APPELLE update_club_info() (agent.py ligne ~45)
   ↓ 
PRINT dans terminal agent: "🔔 UPDATE_CLUB_INFO CALLED"
   ↓
ÉTAT AGENT MIS À JOUR (state.clubInfo)
   ↓
FRONTEND DÉTECTE LE CHANGEMENT (page.tsx useEffect ligne ~57)
   ↓
CONSOLE LOG: "✅ Club détecté: ..."
   ↓
THÈME APPLIQUÉ (setThemeColor, setClubLogo, setBackgroundImage)
   ↓
CSS RÉAGIT À --copilot-kit-primary-color
   ↓
VISUALS APPARAISSENT ✨
```

## 🎯 COMMANDES RAPIDES

### Démarrer l'app
```bash
cd my-ag-ui-app
npm run dev
```

### Voir seulement les logs agent
```bash
cd my-ag-ui-app/agent
python -m uvicorn main:app --reload --port 8000
```

### Réinstaller dépendances si besoin
```bash
npm install
cd agent
pip install -e .
```

## 📝 NOTES IMPORTANTES

1. **Le nom du club DOIT correspondre exactement** aux clés du clubThemes
2. **L'agent DOIT appeler update_club_info** avant de répondre
3. **Le useEffect se déclenche** uniquement si agentState.clubInfo change
4. **Les CSS variables** propagent le thème automatiquement
5. **Les logs sont ESSENTIELS** pour comprendre où ça bloque

## 🆘 EN CAS DE DÉSESPOIR

Testez le fichier demo standalone:
```bash
Start-Process "demo-clubs-dynamique.html"
```

Ce fichier prouve que:
- ✅ Le code visuel fonctionne
- ✅ Le changement de thème fonctionne
- ✅ Les images/logos/couleurs s'affichent

Donc si demo fonctionne mais pas l'app AG-UI:
→ Le problème est dans la communication agent ↔ frontend
→ Pas dans le code visuel lui-même
