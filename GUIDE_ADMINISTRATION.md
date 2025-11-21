# 📚 GUIDE D\'ADMINISTRATION - Malakoff Quiz

## 🎯 Accès à l\'interface d\'administration

Une fois le serveur démarré, accédez à l\'interface d\'administration via :

```
http://localhost:3000/admin
```

Ou depuis le réseau local :
```
http://[VOTRE_IP]:3000/admin
```

---

## 🖥️ Interface d\'administration

L\'interface est organisée en **4 sections** accessibles par onglets :

### 1. 📊 Tableau de bord

Affiche les statistiques de vos questions :
- Nombre total de questions
- Nombre de questions QCM
- Nombre de questions Vrai/Faux
- Nombre de questions à réponse libre

### 2. 📋 Liste des questions

Visualisez toutes vos questions existantes avec :
- Le type de question
- Le texte de la question
- Les choix de réponses (pour QCM)
- La bonne réponse

**Actions disponibles :**
- ✏️ **Modifier** : Cliquez pour éditer une question
- 🗑️ **Supprimer** : Supprimez une question (confirmation demandée)

### 3. ➕ Ajouter une question

Créez de nouvelles questions en 3 étapes :

#### Étape 1 : Choisir le type
- **QCM** : Question à choix multiples (4 réponses possibles, A-B-C-D)
- **Vrai/Faux** : Question binaire
- **Réponse libre** : Le joueur saisit sa réponse

#### Étape 2 : Rédiger la question
Entrez le texte de votre question dans le champ prévu

#### Étape 3 : Définir les réponses

**Pour QCM :**
1. Remplissez les 4 choix de réponses (A, B, C, D)
2. **Cochez le bouton radio** de la bonne réponse

**Pour Vrai/Faux :**
- Cochez simplement "Vrai" ou "Faux"

**Pour Réponse libre :**
- Entrez la réponse de référence (utilisée pour validation manuelle)

#### Étape 4 : Enregistrer
Cliquez sur **"✅ Ajouter la question"**

### 4. 📥 Import/Export

Gérez vos questions en masse :

#### 📤 Export
- **Export JSON** : Format pour sauvegarde ou partage
- **Export CSV** : Format tableur (Excel, Google Sheets)

#### 📥 Import
- Importez des questions depuis un fichier JSON
- Remplace toutes les questions existantes

---

## ✨ Fonctionnalités avancées

### Modifier une question existante

1. Allez dans "📋 Liste des questions"
2. Cliquez sur **"✏️ Modifier"**
3. Une fenêtre s\'ouvre avec les champs pré-remplis
4. Modifiez ce que vous voulez
5. Cliquez sur **"💾 Sauvegarder"**

### Supprimer une question

1. Allez dans "📋 Liste des questions"
2. Cliquez sur **"🗑️ Supprimer"**
3. Confirmez la suppression

⚠️ **Attention** : Cette action est irréversible !

### Sauvegarder vos questions

**Sauvegarde automatique** : Toutes les modifications sont automatiquement enregistrées dans le fichier `questions.js`

**Sauvegarde manuelle** : 
1. Allez dans "📥 Import/Export"
2. Cliquez sur **"📄 Export JSON"**
3. Conservez le fichier téléchargé en lieu sûr

### Restaurer des questions

1. Allez dans "📥 Import/Export"
2. Cliquez sur **"Choisir un fichier"**
3. Sélectionnez votre fichier JSON de sauvegarde
4. Cliquez sur **"📥 Importer"**

---

## 💡 Bonnes pratiques

### Rédaction des questions

✅ **À faire :**
- Questions claires et concises
- Éviter les ambiguïtés
- Vérifier l\'orthographe
- Tester les questions avec un collègue

❌ **À éviter :**
- Questions trop longues
- Formulations négatives doubles
- Réponses trop similaires (pour QCM)

### Organisation des questions

- Regroupez par thème (vous pouvez ajouter des tags plus tard)
- Variez les types de questions
- Équilibrez la difficulté
- Testez régulièrement le quiz

### Sauvegarde

🔐 **Recommandations de sauvegarde :**
1. Exportez vos questions en JSON **chaque semaine**
2. Conservez plusieurs versions
3. Testez vos sauvegardes régulièrement
4. Stockez les sauvegardes dans un endroit sûr (cloud, clé USB)

---

## 🔧 Dépannage

### "Les modifications ne s\'appliquent pas au quiz"

**Solution :** Redémarrez le serveur
1. Fermez le terminal (Ctrl+C)
2. Relancez avec `npm start`

### "Je ne peux pas accéder à /admin"

**Vérifiez que :**
- Le serveur est bien démarré
- Vous utilisez la bonne URL (localhost:3000/admin)
- Aucun pare-feu ne bloque l\'accès

### "L\'import ne fonctionne pas"

**Vérifiez que :**
- Le fichier est bien au format JSON
- Le fichier contient un tableau de questions valide
- Le format des questions respecte la structure attendue

---

## 📁 Structure d\'une question

### Format JSON d\'une question QCM :
```json
{
  "id": 1,
  "type": "QCM",
  "question": "Quelle est la capitale de la France ?",
  "choix": ["Lyon", "Paris", "Marseille", "Bordeaux"],
  "bonneReponse": "B"
}
```

### Format JSON d\'une question Vrai/Faux :
```json
{
  "id": 2,
  "type": "VraiFaux",
  "question": "La Terre est ronde.",
  "bonneReponse": "Vrai"
}
```

### Format JSON d\'une question Libre :
```json
{
  "id": 3,
  "type": "Libre",
  "question": "Quel est le plus haut sommet du monde ?",
  "reponseReference": "Everest"
}
```

---

## 🎓 Formation rapide (5 minutes)

### Exercice pratique

1. **Démarrez le serveur** : `npm start`
2. **Accédez à l\'admin** : http://localhost:3000/admin
3. **Consultez le tableau de bord** : Voyez vos statistiques
4. **Ajoutez une question** :
   - Type : QCM
   - Question : "Test": Quelle couleur ?"
   - Choix : Rouge, Bleu, Vert, Jaune
   - Bonne réponse : Cochez B (Bleu)
   - Cliquez "Ajouter"
5. **Vérifiez** : Elle apparaît dans la liste
6. **Modifiez-la** : Changez le texte
7. **Supprimez-la** : Nettoyez votre test

Félicitations ! Vous maîtrisez l\'interface 🎉

---

## 📞 Support

En cas de problème :
1. Consultez ce guide
2. Vérifiez les messages d\'erreur dans le terminal
3. Redémarrez le serveur
4. Contactez le support technique

---

## 🔄 Mises à jour

Le fichier `questions.js` est mis à jour automatiquement à chaque modification.
Un commentaire en haut du fichier indique la date de dernière modification.

---

**✨ Interface développée par KraftCut pour Malakoff Humanis**
