// ============================================
// PERSISTENCE - Sauvegarde et restauration des parties
// ============================================

const fs = require('fs');
const path = require('path');

const SAVE_FILE = path.join(__dirname, 'game-saves.json');
const MAX_SAVED_GAMES = 50; // Limite de parties sauvegardées simultanément

// Convertir une Map en objet sérialisable
function mapToObject(map) {
  const obj = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

// Convertir un objet en Map
function objectToMap(obj) {
  const map = new Map();
  Object.keys(obj).forEach(key => {
    map.set(key, obj[key]);
  });
  return map;
}

// Sérialiser l'état d'un jeu pour la sauvegarde
function serializeGame(game) {
  return {
    gameCode: game.gameCode,
    host: game.host,
    players: mapToObject(game.players),
    status: game.status,
    selectedQuestions: game.selectedQuestions,
    currentQuestionIndex: game.currentQuestionIndex,
    responses: mapToObject(game.responses),
    questionStartTime: game.questionStartTime,
    questionsHistory: game.questionsHistory.map(item => ({
      questionIndex: item.questionIndex,
      question: item.question,
      responses: mapToObject(item.responses),
      timestamp: item.timestamp
    })),
    timestamp: game.timestamp
  };
}

// Désérialiser un jeu sauvegardé
function deserializeGame(data, Game) {
  const game = new Game(data.gameCode);
  game.host = data.host;
  game.players = objectToMap(data.players);

  // Réinitialiser tous les joueurs à déconnectés après un redémarrage serveur
  // Les joueurs qui se reconnectent via player:joinGame retrouveront connected=true
  game.players.forEach(player => {
    player.connected = false;
  });

  game.status = data.status;
  game.selectedQuestions = data.selectedQuestions;
  game.currentQuestionIndex = data.currentQuestionIndex;
  game.responses = objectToMap(data.responses);
  game.questionStartTime = data.questionStartTime;
  game.questionsHistory = data.questionsHistory.map(item => ({
    questionIndex: item.questionIndex,
    question: item.question,
    responses: objectToMap(item.responses),
    timestamp: item.timestamp
  }));

  game.timestamp = data.timestamp || Date.now();

  return game;
}

// Sauvegarder toutes les parties actives
function saveGames(gameManager) {
  try {
    const gamesData = {};

    // Collecter toutes les parties avec leur timestamp
    const gamesArray = [];
    gameManager.games.forEach((game, gameCode) => {
      gamesArray.push({
        gameCode: gameCode,
        data: serializeGame(game),
        timestamp: Date.now()
      });
    });

    // Trier par timestamp décroissant (plus récentes en premier)
    gamesArray.sort((a, b) => b.timestamp - a.timestamp);

    // Limiter au nombre maximum de parties
    const gamesToSave = gamesArray.slice(0, MAX_SAVED_GAMES);

    // Convertir en objet pour la sauvegarde
    gamesToSave.forEach(item => {
      gamesData[item.gameCode] = item.data;
    });

    const data = {
      timestamp: Date.now(),
      games: gamesData
    };

    fs.writeFileSync(SAVE_FILE, JSON.stringify(data, null, 2), 'utf8');

    const totalGames = gamesArray.length;
    const savedGames = Object.keys(gamesData).length;

    if (totalGames > MAX_SAVED_GAMES) {
      console.log(`✅ Parties sauvegardées: ${savedGames}/${totalGames} partie(s) (limite: ${MAX_SAVED_GAMES})`);
      console.log(`⚠️  ${totalGames - savedGames} partie(s) non sauvegardée(s) (dépassement de limite)`);
    } else {
      console.log(`✅ Parties sauvegardées: ${savedGames} partie(s)`);
    }

    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde des parties:', error);
    return false;
  }
}

// Charger les parties sauvegardées
function loadGames(gameManager, Game) {
  try {
    if (!fs.existsSync(SAVE_FILE)) {
      console.log('ℹ️  Aucune sauvegarde de partie trouvée');
      return { success: false, games: [] };
    }

    const fileContent = fs.readFileSync(SAVE_FILE, 'utf8');
    const data = JSON.parse(fileContent);

    const restoredGames = [];

    Object.keys(data.games).forEach(gameCode => {
      const gameData = data.games[gameCode];
      const game = deserializeGame(gameData, Game);
      gameManager.games.set(gameCode, game);
      restoredGames.push({
        gameCode: gameCode,
        status: game.status,
        playersCount: game.players.size,
        currentQuestion: game.currentQuestionIndex + 1,
        totalQuestions: game.selectedQuestions.length
      });
    });

    console.log(`✅ Parties restaurées: ${restoredGames.length} partie(s)`);

    return { success: true, games: restoredGames };
  } catch (error) {
    console.error('❌ Erreur lors du chargement des parties:', error);
    return { success: false, games: [], error: error.message };
  }
}

// Supprimer le fichier de sauvegarde
function clearSaves() {
  try {
    if (fs.existsSync(SAVE_FILE)) {
      fs.unlinkSync(SAVE_FILE);
      console.log('✅ Sauvegardes supprimées');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des sauvegardes:', error);
    return false;
  }
}

// Supprimer une partie spécifique de la sauvegarde
function deleteSavedGame(gameCode) {
  try {
    if (!fs.existsSync(SAVE_FILE)) {
      return false;
    }

    const fileContent = fs.readFileSync(SAVE_FILE, 'utf8');
    const data = JSON.parse(fileContent);

    if (data.games[gameCode]) {
      delete data.games[gameCode];
      fs.writeFileSync(SAVE_FILE, JSON.stringify(data, null, 2), 'utf8');
      console.log(`✅ Partie ${gameCode} supprimée de la sauvegarde`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de la partie:', error);
    return false;
  }
}

module.exports = {
  saveGames,
  loadGames,
  clearSaves,
  deleteSavedGame
};
