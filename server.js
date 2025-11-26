// ============================================
// SERVEUR PRINCIPAL - Malakoff Quiz
// ============================================

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { GameManager, Game } = require('./gameLogic');
const persistence = require('./persistence');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('client'));

// Gestionnaire de parties
const gameManager = new GameManager();

// Charger les parties sauvegardées au démarrage
const loadResult = persistence.loadGames(gameManager, Game);
if (loadResult.success && loadResult.games.length > 0) {
  console.log('🔄 Parties restaurées:', loadResult.games);
}

// Fonction pour sauvegarder automatiquement les parties
function autoSaveGames() {
  if (gameManager.games.size > 0) {
    persistence.saveGames(gameManager);
  }
}

// Sauvegarde automatique toutes les 30 secondes
setInterval(autoSaveGames, 30000);

// Sauvegarde lors de l'arrêt du serveur
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du serveur...');
  autoSaveGames();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt du serveur...');
  autoSaveGames();
  process.exit(0);
});

// Routes HTTP
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'host.html'));
});

app.get('/player', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'player.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'admin.html'));
});

// Route de santé pour le keep-alive
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// ========== API ADMINISTRATION DES QUESTIONS ==========

// Récupérer les parties actives (pour la restauration)
app.get('/api/games/active', (req, res) => {
  try {
    const activeGames = [];
    gameManager.games.forEach((game, gameCode) => {
      // Récupérer les informations des joueurs avec leurs scores
      // Utiliser la clé du Map (socketId) pour vérifier l'état réel des sockets
      const players = [];
      game.players.forEach((player, socketId) => {
        const playerSocket = io.sockets.sockets.get(socketId);
        const isActuallyConnected = playerSocket ? playerSocket.connected : false;
        players.push({
          name: player.name,
          score: player.score,
          connected: isActuallyConnected
        });
      });

      activeGames.push({
        gameCode: gameCode,
        status: game.status,
        playersCount: game.players.size,
        players: players,
        currentQuestion: game.currentQuestionIndex + 1,
        totalQuestions: game.selectedQuestions.length,
        timestamp: game.timestamp
      });
    });
    console.log(`📋 API GET /api/games/active - Envoi de ${activeGames.length} parties actives avec détails des joueurs`);
    res.json(activeGames);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Supprimer une partie spécifique
app.delete('/api/games/:gameCode', (req, res) => {
  try {
    const gameCode = req.params.gameCode;

    // Supprimer de la mémoire si active
    if (gameManager.games.has(gameCode)) {
      gameManager.games.delete(gameCode);
    }

    // Supprimer du fichier de sauvegarde
    const success = persistence.deleteSavedGame(gameCode);

    if (success || !gameManager.games.has(gameCode)) {
      console.log(`🗑️ Partie ${gameCode} supprimée`);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: 'Partie introuvable' });
    }
  } catch (error) {
    console.error('Erreur suppression partie:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Supprimer toutes les parties
app.delete('/api/games', (req, res) => {
  try {
    // Vider la mémoire
    gameManager.games.clear();

    // Vider le fichier
    const success = persistence.clearSaves();

    console.log('🗑️ Toutes les parties ont été supprimées');
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression toutes parties:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Récupérer les manches
app.get('/api/manches', (req, res) => {
  try {
    delete require.cache[require.resolve('./questions.js')];
    const { MANCHES } = require('./questions.js');
    console.log('📚 API GET /api/manches - Envoi des manches');
    res.json(MANCHES);
  } catch (error) {
    console.error('Erreur récupération manches:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Récupérer toutes les questions
app.get('/api/questions', (req, res) => {
  try {
    // Vider le cache pour obtenir les dernières questions
    delete require.cache[require.resolve('./questions.js')];
    const questions = require('./questions.js');
    console.log(`📋 API GET /api/questions - Envoi de ${questions.length} questions`);
    res.json(questions);
  } catch (error) {
    console.error('Erreur récupération questions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ajouter une nouvelle question
app.post('/api/questions', (req, res) => {
  try {
    // Vider le cache pour obtenir les dernières questions
    delete require.cache[require.resolve('./questions.js')];
    const questions = require('./questions.js');
    const newQuestion = req.body;

    console.log('➕ Ajout d\'une nouvelle question:', newQuestion.type, '-', newQuestion.question.substring(0, 50));

    // Générer un nouvel ID
    const maxId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) : 0;
    newQuestion.id = maxId + 1;

    // Ajouter la question
    questions.push(newQuestion);

    // Sauvegarder dans le fichier
    saveQuestions(questions);

    // Vider à nouveau le cache après sauvegarde
    delete require.cache[require.resolve('./questions.js')];

    console.log(`✅ Question ajoutée avec ID ${newQuestion.id}. Total: ${questions.length} questions`);

    res.json({ success: true, question: newQuestion });
  } catch (error) {
    console.error('❌ Erreur ajout question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Modifier une question
app.put('/api/questions/:id', (req, res) => {
  try {
    // Vider le cache
    delete require.cache[require.resolve('./questions.js')];
    const questions = require('./questions.js');
    const id = parseInt(req.params.id);
    const updatedQuestion = req.body;

    const index = questions.findIndex(q => q.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Question introuvable' });
    }

    const oldManche = questions[index].manche;
    const newManche = updatedQuestion.manche;

    // IMPORTANT: Garder l'ID original, ne pas le changer
    updatedQuestion.id = id;

    // Si la manche a changé, on déplace la question à la fin de la nouvelle manche
    if (newManche && oldManche !== newManche) {
      console.log(`🔄 Changement de manche détecté: ${oldManche} -> ${newManche}`);

      // Retirer la question de sa position actuelle
      questions.splice(index, 1);

      // Trouver la dernière position de la nouvelle manche
      // On cherche la dernière question qui a cette manche
      let insertIndex = questions.length;
      for (let i = questions.length - 1; i >= 0; i--) {
        if (questions[i].manche === newManche) {
          insertIndex = i + 1;
          break;
        }
        // Si on ne trouve pas de question de cette manche, on regarde les manches précédentes
        // pour savoir où insérer (pour garder l'ordre des manches)
        if (questions[i].manche < newManche) {
          insertIndex = i + 1;
          break;
        }
        // Si on arrive au début et qu'on a que des manches supérieures, on insère au début
        if (i === 0 && questions[i].manche > newManche) {
          insertIndex = 0;
        }
      }

      // Insérer à la nouvelle position
      questions.splice(insertIndex, 0, updatedQuestion);

      // Réinitialiser les IDs pour que tout soit propre
      questions.forEach((q, idx) => {
        q.id = idx + 1;
      });

      console.log(`📍 Question déplacée à l'index ${insertIndex} et IDs réinitialisés`);
    } else {
      // Mise à jour simple sur place
      questions[index] = updatedQuestion;
    }

    saveQuestions(questions);

    // Recharger le module questions
    delete require.cache[require.resolve('./questions.js')];

    console.log(`✏️ Question ${id} modifiée`);

    res.json({ success: true, question: updatedQuestion });
  } catch (error) {
    console.error('Erreur modification question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Supprimer une question
app.delete('/api/questions/:id', (req, res) => {
  try {
    // Vider le cache
    delete require.cache[require.resolve('./questions.js')];
    const questions = require('./questions.js');
    const id = parseInt(req.params.id);

    const index = questions.findIndex(q => q.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Question introuvable' });
    }

    questions.splice(index, 1);

    // IMPORTANT: Réinitialiser les IDs de 1 à N
    questions.forEach((q, idx) => {
      q.id = idx + 1;
    });

    saveQuestions(questions);

    // Recharger le module questions
    delete require.cache[require.resolve('./questions.js')];

    console.log(`🗑️ Question ${id} supprimée. Reste ${questions.length} questions avec IDs réinitialisés`);

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression question:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Importer des questions
app.post('/api/questions/import', (req, res) => {
  try {
    const importedQuestions = req.body;

    if (!Array.isArray(importedQuestions)) {
      return res.status(400).json({ success: false, error: 'Format invalide' });
    }

    // Réassigner les IDs
    const questions = importedQuestions.map((q, index) => ({
      ...q,
      id: index + 1
    }));

    saveQuestions(questions);

    // Recharger le module questions
    delete require.cache[require.resolve('./questions.js')];

    res.json({ success: true, count: questions.length });
  } catch (error) {
    console.error('Erreur import questions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Réorganiser les questions
app.post('/api/questions/reorder', (req, res) => {
  try {
    console.log('=== DÉBUT RÉORDONNANCEMENT ===');
    const reorderedQuestions = req.body;
    console.log('Nombre de questions reçues:', reorderedQuestions.length);

    if (!Array.isArray(reorderedQuestions)) {
      console.error('Erreur: Le body n\'est pas un tableau');
      return res.status(400).json({ success: false, error: 'Format invalide' });
    }

    if (reorderedQuestions.length === 0) {
      console.error('Erreur: Tableau vide');
      return res.status(400).json({ success: false, error: 'Aucune question à sauvegarder' });
    }

    // IMPORTANT: Réinitialiser les IDs de 1 à N selon le nouvel ordre
    reorderedQuestions.forEach((q, idx) => {
      q.id = idx + 1;
    });
    console.log('IDs réinitialisés de 1 à', reorderedQuestions.length);

    console.log('Appel de saveQuestions...');
    saveQuestions(reorderedQuestions);
    console.log('saveQuestions terminé avec succès');

    // Recharger le module questions
    delete require.cache[require.resolve('./questions.js')];
    console.log('Cache rechargé');

    console.log('=== RÉORDONNANCEMENT RÉUSSI ===');
    res.json({ success: true });
  } catch (error) {
    console.error('=== ERREUR RÉORDONNANCEMENT ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fonction pour sauvegarder les questions dans le fichier
function saveQuestions(questions) {
  try {
    console.log('saveQuestions: Début de la sauvegarde');
    console.log('saveQuestions: Nombre de questions:', questions.length);

    // 1. S'assurer que chaque question a une manche
    // Si une question n'a pas de manche, on lui attribue la manche de la question précédente
    // ou la manche 1 par défaut si c'est la première
    questions.forEach((q, index) => {
      if (!q.manche) {
        if (index > 0) {
          q.manche = questions[index - 1].manche;
        } else {
          q.manche = 1;
        }
      }
    });

    // 2. Calculer dynamiquement les ranges pour chaque manche
    const manchesConfig = {
      1: { id: 1, nom: "Sel ou poivre" },
      2: { id: 2, nom: "Le juste chiffre" },
      3: { id: 3, nom: "Vrai ou faux Express" },
      4: { id: 4, nom: "Le menu" },
      5: { id: 5, nom: "Qui suis-je ?" }
    };

    // Initialiser les ranges
    Object.values(manchesConfig).forEach(m => {
      m.rangeDebut = null;
      m.rangeFin = null;
    });

    // Parcourir les questions pour déterminer les ranges
    questions.forEach(q => {
      const manche = manchesConfig[q.manche];
      if (manche) {
        if (manche.rangeDebut === null || q.id < manche.rangeDebut) {
          manche.rangeDebut = q.id;
        }
        if (manche.rangeFin === null || q.id > manche.rangeFin) {
          manche.rangeFin = q.id;
        }
      }
    });

    // Remplir les trous si une manche est vide (optionnel, pour garder la structure)
    // On peut laisser null ou mettre des valeurs cohérentes si besoin.
    // Ici on laisse tel quel, le front gérera les manches vides.

    const content = `// ============================================
// BANQUE DE QUESTIONS - MALAKOFF QUIZ
// ============================================
// Ce fichier est géré automatiquement par l'interface d'administration
// Dernière modification : ${new Date().toLocaleString('fr-FR')}
// ============================================

// DÉFINITION DES MANCHES
const MANCHES = ${JSON.stringify(manchesConfig, null, 2)};

const questions = ${JSON.stringify(questions, null, 2)};

module.exports = questions;
module.exports.MANCHES = MANCHES;
`;

    const filePath = path.join(__dirname, 'questions.js');
    console.log('saveQuestions: Chemin du fichier:', filePath);

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Questions sauvegardées avec succès');

    return true;
  } catch (error) {
    console.error('❌ Erreur dans saveQuestions:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// WebSocket - Gestion des connexions
io.on('connection', (socket) => {
  console.log('Nouvelle connexion:', socket.id);

  // ========== ÉVÉNEMENTS MAÎTRE DU JEU ==========

  // Créer une partie
  socket.on('host:createGame', (callback) => {
    const { gameCode, game } = gameManager.createGame(socket.id);
    socket.join(gameCode);
    console.log(`Partie créée: ${gameCode} par ${socket.id}`);
    autoSaveGames(); // Sauvegarde après création
    callback({ gameCode });
  });

  // Reconnecter à une partie existante (restaurée)
  socket.on('host:reconnectGame', ({ gameCode }, callback) => {
    const game = gameManager.getGame(gameCode);

    if (!game) {
      callback({ success: false, message: 'Partie introuvable' });
      return;
    }

    // Mettre à jour l'ID du maître
    game.host = socket.id;
    socket.join(gameCode);

    console.log(`✅ Maître du jeu reconnecté à la partie ${gameCode} (status: ${game.status})`);

    // Si la partie est terminée, la réactiver pour permettre la reprise
    if (game.status === 'finished') {
      game.status = 'playing';
      console.log(`🔄 Partie ${gameCode} terminée réactivée pour reprise`);
    }

    // Vérifier l'état réel des connexions des joueurs avant de renvoyer les données
    game.players.forEach((player, socketId) => {
      const playerSocket = io.sockets.sockets.get(socketId);
      player.connected = playerSocket ? playerSocket.connected : false;
    });

    // Renvoyer les informations complètes de la partie
    const players = game.getPlayers();
    const gameInfo = {
      gameCode: gameCode,
      status: game.status,
      players: players,
      currentQuestionIndex: game.currentQuestionIndex,
      totalQuestions: game.selectedQuestions.length,
      selectedQuestions: game.selectedQuestions,
      currentQuestion: game.getCurrentQuestion(),
      questionsHistory: game.getQuestionsHistory()
    };

    autoSaveGames(); // Sauvegarde après reconnexion

    callback({ success: true, gameInfo });

    // Notifier tous les joueurs que le maître s'est reconnecté
    io.to(gameCode).emit('game:hostReconnected');

    console.log(`📤 État de la partie envoyé au maître: ${gameInfo.totalQuestions} questions, question actuelle ${gameInfo.currentQuestionIndex + 1}`);
  });

  // Configurer les questions de la partie
  socket.on('host:configureQuestions', ({ gameCode, questionIds }) => {
    const game = gameManager.getGame(gameCode);
    if (game && game.host === socket.id) {
      console.log(`📋 Configuration des questions pour la partie ${gameCode}`);
      console.log(`   IDs demandés:`, questionIds);
      game.selectQuestions(questionIds);
      console.log(`   Questions chargées: ${game.selectedQuestions.length}`);
      autoSaveGames(); // Sauvegarde après configuration

      if (game.selectedQuestions.length === 0) {
        console.error(`❌ ERREUR: Aucune question n'a été chargée !`);
      }
    }
  });

  // Démarrer la partie
  socket.on('host:startGame', ({ gameCode }) => {
    const game = gameManager.getGame(gameCode);
    if (game && game.host === socket.id) {
      game.startGame();
      io.to(gameCode).emit('game:started');
      console.log(`Partie ${gameCode} démarrée`);
      autoSaveGames(); // Sauvegarde après démarrage

      // Envoyer automatiquement la première question
      setTimeout(() => {
        sendNextQuestion(gameCode);
      }, 3000);
    }
  });

  // Envoyer la prochaine question
  socket.on('host:nextQuestion', ({ gameCode }) => {
    const game = gameManager.getGame(gameCode);
    if (game && game.host === socket.id) {
      // Incrémenter l'index de la question
      const hasNext = game.nextQuestion();
      autoSaveGames(); // Sauvegarde après passage à la question suivante

      if (hasNext) {
        // Envoyer la nouvelle question
        sendNextQuestion(gameCode);
      } else {
        // Plus de questions - fin de partie
        game.status = 'finished';
        const leaderboard = game.getLeaderboard();
        io.to(gameCode).emit('game:finished', { leaderboard });

        // Supprimer la sauvegarde de la partie terminée seulement
        // si elle est réellement terminée (toutes les questions ont été répondues)
        console.log(`🏁 Partie ${gameCode} terminée - La partie reste sauvegardée pour l'historique`);
        // persistence.deleteSavedGame(gameCode); // DÉSACTIVÉ : On garde l'historique

        // Optionnel : supprimer la partie de la mémoire après un délai
        // pour permettre la consultation du classement final
        // setTimeout(() => {
        //   gameManager.deleteGame(gameCode);
        //   console.log(`🗑️  Partie ${gameCode} supprimée de la mémoire`);
        // }, 300000); // 5 minutes
      }
    }
  });

  // Validation manuelle d'une réponse (réponse libre)
  socket.on('host:validateAnswer', ({ gameCode, playerId, isValid }) => {
    const game = gameManager.getGame(gameCode);
    if (game && game.host === socket.id) {
      game.manualValidate(playerId, isValid);

      const player = game.players.get(playerId);
      const response = game.responses.get(playerId);

      // Envoyer le feedback au joueur concerné
      io.to(playerId).emit('player:answerValidated', { isCorrect: isValid });

      // Broadcaster à tous les joueurs la validation de cette réponse
      // MODIFICATION: On ne diffuse plus le résultat aux autres joueurs pour garder le suspense
      // if (player && response) {
      //   io.to(gameCode).emit('game:playerAnswerValidated', {
      //     playerName: player.name,
      //     playerId: playerId,
      //     isCorrect: isValid,
      //     answer: response.answer
      //   });
      // }

      // Envoyer la mise à jour au maître
      const responses = game.getResponsesWithPlayers();
      socket.emit('host:responsesUpdate', { responses });

      // BROADCAST INSTANTANÉ DES SCORES
      const leaderboard = game.getLeaderboard();
      io.to(gameCode).emit('game:scoresUpdated', { leaderboard });

      // Mettre à jour la liste des joueurs (pour le panneau permanent du host)
      const playersList = game.getPlayers();
      io.to(gameCode).emit('game:playersUpdate', { players: playersList });

      autoSaveGames(); // Sauvegarde après validation
    }
  });

  // Révéler les résultats (arrête les timers et montre qui a répondu correctement)
  socket.on('host:revealResults', ({ gameCode }) => {
    const game = gameManager.getGame(gameCode);
    if (game && game.host === socket.id) {
      const currentQuestion = game.getCurrentQuestion();

      // Arrêter les timers de tous les joueurs
      io.to(gameCode).emit('game:stopTimer');
      console.log(`⏱️ Timers arrêtés pour révélation des résultats`);

      // Fermer la question immédiatement pour empêcher toute modification ultérieure de la validation
      game.closeQuestion();
      console.log(`🔒 Question fermée lors de la révélation des résultats`);

      // Pour les questions QCM et VraiFaux, envoyer les résultats à tous les joueurs
      if (currentQuestion && (currentQuestion.type === 'QCM' || currentQuestion.type === 'VraiFaux')) {
        const responses = game.getResponsesWithPlayers();

        // DEBUG: Afficher l'ordre des réponses
        console.log('🔍 DEBUG - Réponses triées par temps:');
        responses.forEach((r, idx) => {
          console.log(`  [${idx}] ${r.playerName} - Time: ${r.time}ms - Validated: ${r.validated} - PlayerId: ${r.playerId}`);
        });

        // Identifier le joueur le plus rapide avec une bonne réponse
        const fastestCorrectPlayer = responses.find(r => r.validated === true);
        const fastestCorrectPlayerId = fastestCorrectPlayer?.playerId;
        console.log(`🏆 Plus rapide identifié: ${fastestCorrectPlayerId} (${fastestCorrectPlayer?.playerName})`);

        // Envoyer à chaque joueur son propre résultat avec indication s'il est le plus rapide
        game.players.forEach((player, socketId) => {
          const playerResponse = game.responses.get(socketId);
          if (playerResponse) {
            const isFastest = playerResponse.validated && socketId === fastestCorrectPlayerId;
            console.log(`📤 Envoi feedback à ${player.name} (socketId: ${socketId}): isCorrect=${playerResponse.validated}, isFastest=${isFastest}`);
            console.log(`   Comparaison: socketId="${socketId}" === fastestCorrectPlayerId="${fastestCorrectPlayerId}" = ${socketId === fastestCorrectPlayerId}`);

            io.to(socketId).emit('player:answerFeedback', {
              isCorrect: playerResponse.validated,
              correctAnswer: currentQuestion.bonneReponse,
              isFastest: isFastest
            });
          }
        });

        // Broadcaster les résultats de tous pour l'affichage des adversaires
        io.to(gameCode).emit('game:resultsRevealed', {
          responses: responses.map(r => ({
            playerName: r.playerName,
            playerId: r.playerId,
            isCorrect: r.validated,
            answer: r.answer,
            isFastest: r.playerId === fastestCorrectPlayerId
          })),
          fastestCorrectPlayerId: fastestCorrectPlayerId
        });

        console.log(`🎭 Résultats révélés pour la question ${currentQuestion.id}${fastestCorrectPlayerId ? ` - Plus rapide: ${fastestCorrectPlayerId}` : ''}`);
      } else if (currentQuestion && currentQuestion.type === 'Libre') {
        // Pour les questions libres, on envoie aussi le feedback
        const responses = game.getResponsesWithPlayers();

        game.players.forEach((player, socketId) => {
          const playerResponse = game.responses.get(socketId);
          if (playerResponse) {
            // Pour Libre, pas de notion de "plus rapide" pour le bonus, mais on peut réutiliser la structure
            io.to(socketId).emit('player:answerFeedback', {
              isCorrect: playerResponse.validated === true,
              correctAnswer: currentQuestion.reponseReference || "Voir avec l'animateur",
              isFastest: false
            });
          }
        });

        // Broadcaster les résultats (juste validé/refusé)
        io.to(gameCode).emit('game:resultsRevealed', {
          responses: responses.map(r => ({
            playerName: r.playerName,
            playerId: r.playerId,
            isCorrect: r.validated === true,
            answer: r.answer,
            isFastest: false
          })),
          fastestCorrectPlayerId: null
        });

        console.log(`🎭 Résultats révélés pour la question Libre ${currentQuestion.id}`);
      }

      autoSaveGames(); // Sauvegarde après révélation des résultats
    }
  });

  // Afficher le classement
  socket.on('host:showLeaderboard', ({ gameCode }) => {
    const game = gameManager.getGame(gameCode);
    if (game && game.host === socket.id) {
      const currentQuestion = game.getCurrentQuestion();

      // Note: La question est déjà fermée par revealResults
      // game.closeQuestion(); 


      // Valider automatiquement les réponses pour QCM et VraiFaux
      if (currentQuestion && (currentQuestion.type === 'QCM' || currentQuestion.type === 'VraiFaux')) {
        game.autoValidateResponses();
        console.log(`✅ Validation automatique des réponses pour la question ${currentQuestion.id}`);

        // BROADCAST INSTANTANÉ DES SCORES après validation automatique
        const updatedLeaderboard = game.getLeaderboard();
        io.to(gameCode).emit('game:scoresUpdated', { leaderboard: updatedLeaderboard });
        console.log(`📊 Scores mis à jour envoyés à tous les joueurs après validation automatique`);
      }

      // Sauvegarder la question dans l'historique immédiatement après l'affichage du classement
      game.saveCurrentQuestionToHistory();

      const leaderboard = game.getLeaderboard();
      const currentQuestionNum = game.currentQuestionIndex;
      const totalQuestions = game.selectedQuestions.length;

      io.to(gameCode).emit('game:leaderboard', {
        leaderboard,
        currentQuestion: currentQuestionNum,
        totalQuestions,
        isFinished: game.isFinished()
      });

      autoSaveGames(); // Sauvegarde après affichage du classement
    }
  });

  // Terminer manuellement la partie
  socket.on('host:endGame', ({ gameCode }, callback) => {
    const game = gameManager.getGame(gameCode);
    if (game && game.host === socket.id) {
      console.log(`⏹️ Le maître du jeu a mis fin à la partie ${gameCode}`);

      // Terminer la partie
      game.endGameManually();

      // Obtenir le classement final
      const leaderboard = game.getLeaderboard();

      // Notifier tous les joueurs que la partie est terminée
      io.to(gameCode).emit('game:finished', {
        leaderboard,
        manuallyEnded: true
      });

      // NE PAS supprimer la sauvegarde - la partie reste accessible pour consultation/reprise
      // persistence.deleteSavedGame(gameCode); // COMMENTÉ : permet de conserver les parties interrompues

      // Sauvegarder l'état final de la partie
      autoSaveGames();

      console.log(`💾 Partie ${gameCode} interrompue manuellement et sauvegardée pour consultation ultérieure`);

      // Envoyer confirmation au client
      if (callback) callback({ success: true });
    } else {
      console.log(`❌ Impossible de terminer la partie ${gameCode} - partie introuvable ou non autorisé`);
      if (callback) callback({ success: false, message: 'Partie introuvable ou non autorisé' });
    }
  });

  // Interrompre la partie (pause)
  socket.on('host:interruptGame', ({ gameCode }) => {
    const game = gameManager.getGame(gameCode);
    if (game && game.host === socket.id) {
      console.log(`⏸️ Le maître du jeu a interrompu la partie ${gameCode}`);
      // Save current state (autoSaveGames already persists)
      autoSaveGames();
      // Notify players that the game is paused and can be resumed later
      io.to(gameCode).emit('game:interrupted', { gameCode });
      console.log(`💾 Partie ${gameCode} sauvegardée après interruption`);
    }
  });

  // Obtenir l'historique des questions
  socket.on('host:getQuestionsHistory', ({ gameCode }) => {
    const game = gameManager.getGame(gameCode);
    if (game && game.host === socket.id) {
      const history = game.getQuestionsHistory();
      socket.emit('host:questionsHistory', { history });
    }
  });

  // Obtenir les détails d'une question de l'historique
  socket.on('host:getHistoricalQuestion', ({ gameCode, questionIndex }) => {
    const game = gameManager.getGame(gameCode);
    if (game && game.host === socket.id) {
      const details = game.getHistoricalQuestionDetails(questionIndex);
      if (details) {
        socket.emit('host:historicalQuestionDetails', {
          questionIndex,
          ...details
        });
      }
    }
  });

  // Modifier rétroactivement une réponse
  socket.on('host:modifyHistoricalAnswer', ({ gameCode, questionIndex, playerId, newValidation }) => {
    const game = gameManager.getGame(gameCode);
    if (game && game.host === socket.id) {
      const success = game.modifyHistoricalAnswer(questionIndex, playerId, newValidation);

      if (success) {
        // Recalculer tous les scores
        game.recalculateAllScores();

        // Envoyer les détails mis à jour
        const details = game.getHistoricalQuestionDetails(questionIndex);
        socket.emit('host:historicalQuestionDetails', {
          questionIndex,
          ...details
        });

        // Envoyer le classement mis à jour
        const leaderboard = game.getLeaderboard();
        socket.emit('host:leaderboardUpdated', { leaderboard });

        // Notifier tous les joueurs du nouveau classement
        io.to(gameCode).emit('game:scoresUpdated', { leaderboard });

        autoSaveGames(); // Sauvegarde après modification rétroactive
      }
    }
  });

  // ========== ÉVÉNEMENTS JOUEUR ==========

  // Rejoindre une partie
  socket.on('player:joinGame', ({ gameCode, playerName }, callback) => {
    const game = gameManager.getGame(gameCode);

    if (!game) {
      callback({ success: false, message: 'Partie introuvable' });
      return;
    }

    // Vérifier si un joueur avec ce nom existait déjà (reconnexion)
    let existingPlayer = null;
    game.players.forEach((player, playerId) => {
      if (player.name === playerName) {
        existingPlayer = { playerId, player };
      }
    });

    if (existingPlayer) {
      // Reconnexion d'un joueur existant
      const oldPlayerId = existingPlayer.playerId;
      const playerData = existingPlayer.player;

      // Retirer l'ancien socket ID
      game.players.delete(oldPlayerId);

      // Remettre le joueur en ligne avec le nouveau socket ID
      playerData.connected = true;
      playerData.id = socket.id;  // Synchroniser l'id avec le nouveau socket
      game.players.set(socket.id, playerData);

      // Si une réponse était enregistrée avec l'ancien ID, la transférer
      if (game.responses.has(oldPlayerId)) {
        const response = game.responses.get(oldPlayerId);
        game.responses.delete(oldPlayerId);
        game.responses.set(socket.id, response);
      }

      socket.join(gameCode);
      console.log(`✅ ${playerName} s'est reconnecté à la partie ${gameCode} (score: ${playerData.score})`);

      // Notifier tout le monde
      const players = game.getPlayers();
      io.to(gameCode).emit('game:playersUpdate', { players });

      autoSaveGames();

      callback({
        success: true,
        playerName,
        reconnected: true,
        gameStatus: game.status,
        score: playerData.score
      });
      return;
    }

    // Nouveau joueur
    // Permettre de rejoindre uniquement si la partie est en attente
    // Les joueurs existants peuvent toujours se reconnecter
    if (game.status !== 'waiting') {
      callback({ success: false, message: 'La partie a déjà commencé. Vous ne pouvez rejoindre que si vous étiez déjà inscrit.' });
      return;
    }

    game.addPlayer(socket.id, playerName);
    socket.join(gameCode);

    console.log(`✅ ${playerName} a rejoint la partie ${gameCode}`);

    // Notifier le maître et tous les joueurs
    const players = game.getPlayers();
    io.to(gameCode).emit('game:playersUpdate', { players });

    autoSaveGames(); // Sauvegarde après ajout d'un joueur

    callback({ success: true, playerName, reconnected: false, gameStatus: game.status });
  });

  // Répondre à une question
  socket.on('player:answer', ({ gameCode, answer }) => {
    const game = gameManager.getGame(gameCode);
    if (game) {
      // Vérifier si la question est fermée
      if (game.isQuestionClosed()) {
        console.log(`🚫 Réponse rejetée de ${game.players.get(socket.id)?.name} : question fermée`);
        socket.emit('player:answerRejected', { message: 'La question est fermée, vous ne pouvez plus répondre.' });
        return;
      }

      const currentQuestion = game.getCurrentQuestion();
      const player = game.players.get(socket.id);
      let isCorrect = null;

      // Validation pour QCM et Vrai/Faux (mais pas de feedback immédiat aux joueurs)
      if (currentQuestion.type === 'QCM' || currentQuestion.type === 'VraiFaux') {
        if (currentQuestion.type === 'QCM') {
          isCorrect = answer === currentQuestion.bonneReponse;
        } else if (currentQuestion.type === 'VraiFaux') {
          isCorrect = answer === currentQuestion.bonneReponse;
        }

        // Enregistrer la réponse avec la validation (pour le host et les stats)
        game.recordResponse(socket.id, answer, isCorrect);

        // Confirmer l'enregistrement SANS révéler si c'est correct (suspense)
        socket.emit('player:answerRecorded');

        // Broadcaster à tous les joueurs que ce joueur a répondu (SANS révéler si c'est correct)
        io.to(gameCode).emit('game:playerAnswered', {
          playerName: player.name,
          playerId: socket.id,
          isCorrect: null, // Masqué pour le suspense
          answer: answer,
          questionType: currentQuestion.type
        });
      } else {
        // Pour les questions libres, enregistrer sans validation
        game.recordResponse(socket.id, answer, null);

        // Confirmer l'enregistrement
        socket.emit('player:answerRecorded');

        // Broadcaster à tous les joueurs que ce joueur a répondu (sans dire si c'est correct)
        io.to(gameCode).emit('game:playerAnswered', {
          playerName: player.name,
          playerId: socket.id,
          isCorrect: null, // En attente de validation
          answer: answer,
          questionType: currentQuestion.type
        });
      }

      const responses = game.getResponsesWithPlayers();

      // Mettre à jour le maître avec les réponses
      io.to(game.host).emit('host:responsesUpdate', {
        responses,
        totalPlayers: game.players.size
      });

      autoSaveGames(); // Sauvegarde après chaque réponse (CONTINUOUS SAVING)

      // Si tous ont répondu, envoyer signal supplémentaire
      if (responses.length === game.players.size) {
        setTimeout(() => {
          io.to(game.host).emit('host:allAnswered', {
            responses,
            question: currentQuestion
          });
        }, 500);
      }
    }
  });

  // ========== DÉCONNEXION ==========

  socket.on('disconnect', () => {
    console.log('Déconnexion:', socket.id);

    // Chercher si c'était un maître ou un joueur
    gameManager.games.forEach((game, gameCode) => {
      if (game.host === socket.id) {
        // Le maître s'est déconnecté
        console.log(`⚠️  Maître déconnecté de la partie ${gameCode} (status: ${game.status})`);

        // Notifier les joueurs que le maître s'est déconnecté
        io.to(gameCode).emit('game:hostDisconnected');

        // NE PAS supprimer la partie si elle est en cours, en attente, ou terminée
        // Les parties terminées restent accessibles pour consultation/reprise
        if (game.status === 'waiting' || game.status === 'playing') {
          console.log(`📦 Partie ${gameCode} conservée pour reconnexion`);
          autoSaveGames(); // Sauvegarder l'état actuel
        } else if (game.status === 'finished') {
          // Conserver les parties terminées en mémoire pour consultation
          console.log(`📋 Partie ${gameCode} terminée - conservée pour consultation/reprise`);
          autoSaveGames(); // Sauvegarder l'état actuel
        }
      } else if (game.players.has(socket.id)) {
        // Un joueur s'est déconnecté - le marquer comme déconnecté au lieu de le supprimer
        const player = game.players.get(socket.id);
        player.connected = false;

        console.log(`⚠️  ${player.name} déconnecté de la partie ${gameCode}`);

        // Notifier les autres joueurs et le maître
        io.to(gameCode).emit('game:playersUpdate', { players: game.getPlayers() });

        autoSaveGames(); // Sauvegarder l'état avec le joueur marqué comme déconnecté
      }
    });
  });
});

// Fonction helper pour envoyer la question suivante
function sendNextQuestion(gameCode) {
  const game = gameManager.getGame(gameCode);
  if (!game) {
    console.error(`❌ sendNextQuestion: Partie ${gameCode} introuvable`);
    return;
  }

  console.log(`💬 sendNextQuestion: Partie ${gameCode}`);
  console.log(`   Index actuel: ${game.currentQuestionIndex}`);
  console.log(`   Nombre de questions: ${game.selectedQuestions.length}`);

  const question = game.getCurrentQuestion();

  if (!question) {
    // Plus de questions - fin de partie
    console.log(`✅ Fin de partie ${gameCode} - Plus de questions`);
    game.status = 'finished';
    const leaderboard = game.getLeaderboard();
    io.to(gameCode).emit('game:finished', { leaderboard });
    return;
  }

  game.startQuestion();

  // Récupérer la manche
  const manche = game.getCurrentManche();

  // Préparer la question pour les joueurs (sans la réponse)
  const questionForPlayers = {
    id: question.id,
    type: question.type,
    question: question.question,
    choix: question.choix,
    numero: game.currentQuestionIndex + 1,
    total: game.selectedQuestions.length,
    manche: manche
  };

  // Préparer la question pour le maître (avec la réponse)
  const questionForHost = {
    ...questionForPlayers,
    bonneReponse: question.bonneReponse,
    reponseReference: question.reponseReference
  };

  // Envoyer aux joueurs
  io.to(gameCode).emit('game:newQuestion', questionForPlayers);

  // Envoyer au maître avec les infos supplémentaires (directement au socket)
  console.log(`🔍 DEBUG sendNextQuestion:`);
  console.log(`   gameCode: ${gameCode}`);
  console.log(`   game.host: ${game.host}`);
  console.log(`   Socket exists: ${io.sockets.sockets.has(game.host)}`);

  const hostSocket = io.sockets.sockets.get(game.host);
  console.log(`   Socket connected: ${hostSocket?.connected}`);
  console.log(`   Socket rooms: ${hostSocket ? Array.from(hostSocket.rooms) : 'N/A'}`);

  if (hostSocket && hostSocket.connected) {
    hostSocket.emit('host:newQuestion', questionForHost);
    console.log(`📤 Question ${game.currentQuestionIndex + 1} envoyée au maître ${game.host}`);
  } else {
    console.error(`❌ Socket du maître ${game.host} introuvable ou déconnecté`);
    console.error(`   Socket exists: ${!!hostSocket}, Connected: ${hostSocket?.connected}`);
  }

  console.log(`Question ${game.currentQuestionIndex + 1} envoyée pour la partie ${gameCode}`);
}

// Fonction pour obtenir l'adresse IP locale
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Ignorer les adresses internes et IPv6
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return 'IP non détectée';
}

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const localIP = getLocalIpAddress();

server.listen(PORT, HOST, () => {
  console.log(`\n🎮 MALAKOFF QUIZ SERVEUR DÉMARRÉ 🎮`);
  console.log(`📡 Serveur en écoute sur le port ${PORT}`);
  console.log(`\n🌐 Accès LOCAL :`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`\n🌍 Accès RÉSEAU LOCAL :`);
  console.log(`   http://${localIP}:${PORT}`);
  console.log(`\n💡 Pour arrêter le serveur : Ctrl+C\n`);
});

// ========== KEEP-ALIVE MECHANISM ==========
// Empêcher le serveur de s'endormir sur les hébergeurs gratuits (Render, etc.)
const PING_INTERVAL = 30 * 1000; // 30 secondes

function keepAlive() {
  const protocol = 'http';
  const host = 'localhost';
  const url = `${protocol}://${host}:${PORT}/ping`;

  console.log(`💓 Keep-alive ping vers ${url}`);

  http.get(url, (res) => {
    console.log(`✅ Keep-alive ping status: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error(`❌ Keep-alive ping error: ${err.message}`);
  });
}

// Démarrer le ping périodique
if (process.env.NODE_ENV === 'production' || true) { // Actif même en dev pour tester
  setInterval(keepAlive, PING_INTERVAL);
  // Premier ping après quelques secondes
  setTimeout(keepAlive, 10000);
}
