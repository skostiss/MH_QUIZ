# 🎮 MALAKOFF QUIZ

Application de quiz multi-joueurs en temps réel développée pour Malakoff Humanis.

## 📋 Fonctionnalités

- ✅ Quiz en temps réel avec WebSocket
- ✅ 3 types de questions : QCM, Vrai/Faux, Réponse libre
- ✅ Validation manuelle pour les réponses libres (Version 3A)
- ✅ Système de scoring à paliers basé sur le temps de réponse
- ✅ Timer de 20 secondes par question
- ✅ Classement après chaque question
- ✅ Interface maître du jeu et interface joueurs séparées

## 🚀 Installation

### Prérequis

- Node.js (version 14 ou supérieure)
- npm (installé avec Node.js)

### Étapes d'installation

1. **Ouvrir le terminal**
   - Sur Mac : Applications → Terminal
   - Sur Windows : Menu Démarrer → "cmd" ou "PowerShell"

2. **Aller dans le dossier du projet**
   ```bash
   cd "chemin/vers/test claude control"
   ```
   
   Par exemple sur Mac :
   ```bash
   cd "/Users/skostiss/Desktop/test claude control"
   ```

3. **Installer les dépendances**
   ```bash
   npm install
   ```
   
   Cette commande va télécharger automatiquement :
   - Express (serveur web)
   - Socket.io (communication temps réel)
   - CORS (autorisation des connexions)

## 🎯 Lancer l'application

1. **Démarrer le serveur**
   ```bash
   node server.js
   ```
   
   Vous devriez voir ce message :
   ```
   🎮 MALAKOFF QUIZ SERVEUR DÉMARRÉ 🎮
   📡 Serveur en écoute sur le port 3000
   🌐 Ouvrez votre navigateur sur : http://localhost:3000
   ```

2. **Ouvrir l'application**
   - Ouvrez votre navigateur (Chrome, Firefox, Safari)
   - Allez sur : `http://localhost:3000`
   - Vous verrez la page d'accueil avec 2 options :
     - Maître du jeu
     - Joueur

3. **Pour arrêter le serveur**
   - Dans le terminal, appuyez sur `Ctrl+C`

## 🎮 Utilisation

### Créer une partie (Maître du jeu)

1. Cliquez sur "Maître du jeu"
2. Sélectionnez les questions que vous voulez inclure
3. Cliquez sur "Créer la partie"
4. Un code à 4 chiffres s'affiche (ex: 4827)
5. Communiquez ce code aux joueurs
6. Attendez que les joueurs se connectent
7. Cliquez sur "Lancer la partie"

### Rejoindre une partie (Joueur)

1. Cliquez sur "Joueur"
2. Entrez votre prénom
3. Entrez le code de la partie (donné par le maître)
4. Cliquez sur "Rejoindre"
5. Attendez le lancement de la partie

### Déroulement d'une partie

1. **Question affichée** (20 secondes pour répondre)
2. Les joueurs répondent
3. **Pour QCM/Vrai-Faux** : Correction automatique
4. **Pour Réponse libre** : Le maître valide/refuse chaque réponse
5. **Classement** affiché à tous les joueurs
6. Question suivante
7. Répéter jusqu'à la dernière question
8. **Classement final** avec podium

## 📝 Modifier les questions

Les questions se trouvent dans le fichier : `questions.js`

### Format des questions

**QCM :**
```javascript
{
  id: 1,
  type: "QCM",
  question: "Quelle est la capitale de la France ?",
  choix: ["Lyon", "Paris", "Marseille", "Bordeaux"],
  bonneReponse: "B"
}
```

**Vrai/Faux :**
```javascript
{
  id: 2,
  type: "VraiFaux",
  question: "La Terre est ronde.",
  bonneReponse: "Vrai"
}
```

**Réponse libre :**
```javascript
{
  id: 3,
  type: "Libre",
  question: "Quel est le slogan de Malakoff Humanis ?",
  reponseReference: "Agir ensemble, protéger chacun"
}
```

### Pour ajouter vos questions

1. Ouvrez le fichier `questions.js`
2. Supprimez les questions d'exemple
3. Ajoutez vos questions en respectant le format ci-dessus
4. Sauvegardez le fichier
5. Relancez le serveur (Ctrl+C puis `node server.js`)

## 🐛 Problèmes courants

**Le serveur ne démarre pas**
- Vérifiez que Node.js est bien installé : `node --version`
- Vérifiez que vous êtes dans le bon dossier : `pwd` (Mac) ou `cd` (Windows)
- Essayez de réinstaller les dépendances : `npm install`

**Les joueurs ne peuvent pas se connecter**
- Vérifiez que le serveur est bien démarré
- Vérifiez le code de partie (4 chiffres)
- Rafraîchissez la page du joueur

**Les questions ne s'affichent pas**
- Vérifiez le format dans `questions.js`
- Vérifiez qu'il n'y a pas d'erreur dans la console du terminal
- Relancez le serveur

## 📦 Structure du projet

```
test claude control/
├── server.js              # Serveur principal
├── gameLogic.js           # Logique du jeu
├── questions.js           # Banque de questions
├── package.json           # Dépendances
├── .gitignore            # Fichiers à ignorer
├── README.md             # Ce fichier
│
└── client/               # Fichiers frontend
    ├── index.html        # Page d'accueil
    ├── host.html         # Interface maître
    ├── player.html       # Interface joueur
    ├── css/
    │   └── style.css     # Styles
    └── js/
        ├── host.js       # Logique maître
        └── player.js     # Logique joueur
```

## 🚀 Prochaines étapes

Une fois que vous avez testé l'application en local, vous pourrez :

1. **Mettre le code sur GitHub** pour le sauvegarder
2. **Déployer sur Vercel** pour le rendre accessible en ligne
3. **Partager l'URL** à vos collègues/clients

(Reportez-vous au document PROJET_QUIZ_PRESENTATION.md pour les instructions détaillées)

## 💡 Support

Pour toute question ou problème :
- Consultez le fichier PROJET_QUIZ_PRESENTATION.md
- Demandez de l'aide à Claude
- Vérifiez les logs dans le terminal

## 📄 Licence

Développé par KraftCut pour Malakoff Humanis - 2025
