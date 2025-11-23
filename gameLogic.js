// ============================================
// GAME LOGIC - Logique métier du quiz
// ============================================

// Fonction pour charger les questions (recharge à chaque fois pour éviter le cache)
function loadQuestions() {
  // Supprimer le cache pour forcer le rechargement
  delete require.cache[require.resolve('./questions')];
  return require('./questions');
}

class Game {
  constructor(gameCode) {
    this.gameCode = gameCode;
    this.host = null;
    this.players = new Map(); // Map de socket.id -> player object
    this.status = 'waiting'; // waiting, playing, finished
    this.selectedQuestions = [];
    this.currentQuestionIndex = 0;
    this.responses = new Map(); // Map de socket.id -> response data
    this.questionStartTime = null;
    this.questionsHistory = []; // Historique de toutes les questions avec leurs réponses
  }

  // Ajouter le maître du jeu
  setHost(socketId) {
    this.host = socketId;
  }

  // Ajouter un joueur
  addPlayer(socketId, playerName) {
    this.players.set(socketId, {
      id: socketId,
      name: playerName,
      score: 0,
      connected: true
    });
  }

  // Retirer un joueur
  removePlayer(socketId) {
    this.players.delete(socketId);
  }

  // Obtenir la liste des joueurs
  getPlayers() {
    return Array.from(this.players.values());
  }

  // Sélectionner les questions pour la partie
  selectQuestions(questionIds) {
    const questions = loadQuestions(); // Charger les questions fraîches
    this.selectedQuestions = questionIds.map(id => 
      questions.find(q => q.id === id)
    ).filter(q => q !== undefined);
    
    console.log(`🎯 Questions sélectionnées: ${this.selectedQuestions.length} sur ${questionIds.length} demandées`);
    
    // Debug: afficher les questions sélectionnées
    if (this.selectedQuestions.length === 0) {
      console.error('⚠️ AUCUNE QUESTION TROUVÉE ! IDs demandés:', questionIds);
      console.error('⚠️ Questions disponibles:', questions.map(q => q.id));
    }
  }

  // Démarrer la partie
  startGame() {
    this.status = 'playing';
    this.currentQuestionIndex = 0;
  }

  // Obtenir la question courante
  getCurrentQuestion() {
    if (this.currentQuestionIndex >= this.selectedQuestions.length) {
      return null;
    }
    return this.selectedQuestions[this.currentQuestionIndex];
  }

  // Obtenir la manche de la question courante
  getCurrentManche() {
    const question = this.getCurrentQuestion();
    if (!question) return null;
    
    const questions = loadQuestions();
    const { MANCHES } = require('./questions');
    
    return MANCHES[question.manche] || null;
  }

  // Démarrer une nouvelle question
  startQuestion() {
    this.responses.clear();
    this.questionStartTime = Date.now();
    this.questionClosed = false; // Réinitialiser le flag pour la nouvelle question
  }

  // Fermer la question (plus de réponses acceptées)
  closeQuestion() {
    this.questionClosed = true;
  }

  // Vérifier si la question est fermée
  isQuestionClosed() {
    return this.questionClosed === true;
  }

  // Enregistrer une réponse
  recordResponse(socketId, answer, validated = null) {
    const responseTime = Date.now() - this.questionStartTime;
    this.responses.set(socketId, {
      answer: answer,
      time: responseTime,
      validated: validated // null = en attente, true = validée, false = refusée
    });
  }

  // Calculer les points en fonction de la manche
  calculatePoints(manche) {
    // Manche 1 et 2 : 2 points
    // Manche 3 et 4 : 1 point
    // Manche 5 : 3 points
    if (manche === 1 || manche === 2) {
      return 2;
    } else if (manche === 3 || manche === 4) {
      return 1;
    } else if (manche === 5) {
      return 3;
    }
    return 0;
  }

  // Valider automatiquement les réponses (QCM et Vrai/Faux)
  autoValidateResponses() {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) return;

    // Trouver toutes les réponses correctes
    const correctResponses = [];
    this.responses.forEach((response, socketId) => {
      let isCorrect = false;

      if (currentQuestion.type === 'QCM') {
        isCorrect = response.answer === currentQuestion.bonneReponse;
      } else if (currentQuestion.type === 'VraiFaux') {
        isCorrect = response.answer === currentQuestion.bonneReponse;
      }

      response.validated = isCorrect;

      if (isCorrect) {
        correctResponses.push({ socketId, time: response.time });
      } else {
        response.points = 0;
      }
    });

    // Si au moins une bonne réponse, attribuer les points au plus rapide
    if (correctResponses.length > 0) {
      // Trier par temps de réponse (le plus rapide en premier)
      correctResponses.sort((a, b) => a.time - b.time);

      // Le plus rapide gagne les points
      const fastest = correctResponses[0];
      const points = this.calculatePoints(currentQuestion.manche);
      const player = this.players.get(fastest.socketId);
      if (player) {
        player.score += points;
        this.responses.get(fastest.socketId).points = points;
      }

      // Les autres bonnes réponses obtiennent 0 points
      for (let i = 1; i < correctResponses.length; i++) {
        this.responses.get(correctResponses[i].socketId).points = 0;
      }
    }
  }

  // Validation manuelle d'une réponse (pour réponse libre)
  manualValidate(socketId, isValid) {
    const response = this.responses.get(socketId);
    if (!response) return;

    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) return;

    response.validated = isValid;

    // Calculer et attribuer les points
    if (isValid) {
      // Vérifier si quelqu'un a déjà été validé (et donc gagné les points)
      let alreadyValidated = false;
      this.responses.forEach((r, id) => {
        if (id !== socketId && r.validated === true && r.points > 0) {
          alreadyValidated = true;
        }
      });

      // Seul le premier validé (le plus rapide) gagne les points
      if (!alreadyValidated) {
        const points = this.calculatePoints(currentQuestion.manche);
        const player = this.players.get(socketId);
        if (player) {
          player.score += points;
          response.points = points;
        }
      } else {
        // Bonne réponse mais pas le plus rapide
        response.points = 0;
      }
    } else {
      response.points = 0;
    }
  }

  // Obtenir toutes les réponses avec infos joueurs
  getResponsesWithPlayers() {
    const results = [];
    const currentQuestion = this.getCurrentQuestion();

    this.responses.forEach((response, socketId) => {
      const player = this.players.get(socketId);
      if (player) {
        results.push({
          playerId: socketId,
          playerName: player.name,
          answer: response.answer,
          time: response.time,
          validated: response.validated,
          points: response.points || 0
        });
      }
    });

    // Trier par temps de réponse (le plus rapide en premier)
    results.sort((a, b) => a.time - b.time);

    // Pour les questions QCM et VraiFaux, calculer les points potentiels si pas encore attribués
    if (currentQuestion && (currentQuestion.type === 'QCM' || currentQuestion.type === 'VraiFaux')) {
      // Trouver le plus rapide avec une bonne réponse
      const fastestCorrect = results.find(r => r.validated === true);

      if (fastestCorrect && fastestCorrect.points === 0) {
        // Les points n'ont pas encore été attribués via autoValidateResponses()
        // Calculer et afficher les points potentiels
        const points = this.calculatePoints(currentQuestion.manche);

        results.forEach(r => {
          if (r.playerId === fastestCorrect.playerId) {
            r.points = points; // Afficher les points pour le gagnant
          } else {
            r.points = 0; // Confirmer 0 points pour les autres
          }
        });
      }
    }

    return results;
  }

  // Obtenir le classement
  getLeaderboard() {
    const sortedPlayers = Array.from(this.players.values())
      .sort((a, b) => b.score - a.score);

    let currentRank = 1;
    let previousScore = null;

    return sortedPlayers.map((player, index) => {
      // Si le score change par rapport au joueur précédent, mettre à jour le rang
      if (previousScore !== null && player.score < previousScore) {
        currentRank = index + 1;
      }
      // Sinon, on garde le même rang (égalité)

      previousScore = player.score;

      return {
        rank: currentRank,
        name: player.name,
        score: player.score
      };
    });
  }

  // Sauvegarder la question actuelle dans l'historique avant de passer à la suivante
  saveCurrentQuestionToHistory() {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) return;

    // Vérifier si cette question n'a pas déjà été sauvegardée
    const alreadySaved = this.questionsHistory.some(
      item => item.questionIndex === this.currentQuestionIndex
    );

    if (alreadySaved) {
      console.log(`⚠️ Question ${this.currentQuestionIndex} déjà dans l'historique, pas de doublon`);
      return;
    }

    const questionData = {
      questionIndex: this.currentQuestionIndex,
      question: currentQuestion,
      responses: new Map(this.responses), // Copie profonde de la Map
      timestamp: Date.now()
    };

    this.questionsHistory.push(questionData);
    console.log(`📝 Question ${this.currentQuestionIndex} sauvegardée dans l'historique`);
  }

  // Passer à la question suivante
  nextQuestion() {
    // Sauvegarder l'état actuel avant de passer à la suivante
    this.saveCurrentQuestionToHistory();

    this.currentQuestionIndex++;
    if (this.currentQuestionIndex >= this.selectedQuestions.length) {
      this.status = 'finished';
      return false;
    }
    return true;
  }

  // Obtenir l'historique complet des questions
  getQuestionsHistory() {
    return this.questionsHistory.map((item, index) => ({
      questionIndex: item.questionIndex,
      questionNumber: item.questionIndex + 1,
      question: item.question,
      responsesCount: item.responses.size,
      timestamp: item.timestamp
    }));
  }

  // Obtenir les détails d'une question de l'historique
  getHistoricalQuestionDetails(questionIndex) {
    const historyItem = this.questionsHistory.find(h => h.questionIndex === questionIndex);
    if (!historyItem) return null;

    const responses = [];
    historyItem.responses.forEach((response, socketId) => {
      const player = this.players.get(socketId);
      if (player) {
        responses.push({
          playerId: socketId,
          playerName: player.name,
          answer: response.answer,
          time: response.time,
          validated: response.validated,
          points: response.points || 0
        });
      }
    });

    responses.sort((a, b) => a.time - b.time);

    return {
      question: historyItem.question,
      responses: responses
    };
  }

  // Modifier rétroactivement une réponse (validation seulement, les points seront recalculés)
  modifyHistoricalAnswer(questionIndex, playerId, newValidation) {
    const historyItem = this.questionsHistory.find(h => h.questionIndex === questionIndex);
    if (!historyItem) return false;

    const response = historyItem.responses.get(playerId);
    if (!response) return false;

    // Appliquer la nouvelle validation (les points seront recalculés par recalculateAllScores)
    response.validated = newValidation;

    return true;
  }

  // Recalculer tous les scores depuis zéro à partir de l'historique
  // - QCM/VraiFaux : winner-takes-all (seul le premier joueur correct reçoit les points)
  // - Libre : tous les joueurs validés reçoivent des points
  recalculateAllScores() {
    // Réinitialiser tous les scores
    this.players.forEach(player => {
      player.score = 0;
    });

    // Réinitialiser tous les points dans l'historique
    this.questionsHistory.forEach(historyItem => {
      historyItem.responses.forEach(response => {
        response.points = 0;
      });
    });

    // Recalculer à partir de l'historique
    this.questionsHistory.forEach(historyItem => {
      const points = this.calculatePoints(historyItem.question.manche);
      const questionType = historyItem.question.type;

      if (questionType === 'Libre') {
        // Questions Libre : tous les joueurs validés reçoivent des points
        historyItem.responses.forEach((response, socketId) => {
          if (response.validated) {
            const player = this.players.get(socketId);
            if (player) {
              player.score += points;
              response.points = points;
            }
          }
        });
      } else {
        // QCM et VraiFaux : winner-takes-all (le plus rapide avec bonne réponse gagne)
        const sortedResponses = Array.from(historyItem.responses.entries())
          .sort((a, b) => a[1].responseTime - b[1].responseTime);

        let winnerFound = false;
        for (const [socketId, response] of sortedResponses) {
          if (response.validated && !winnerFound) {
            // Premier joueur correct = gagnant
            const player = this.players.get(socketId);
            if (player) {
              player.score += points;
              response.points = points;
              winnerFound = true;
            }
          } else {
            // Les autres ne reçoivent pas de points (même si validés)
            response.points = 0;
          }
        }
      }
    });
  }

  // Vérifier si la partie est terminée (toutes les questions ont été répondues)
  isFinished() {
    // La partie est vraiment terminée seulement si toutes les questions ont été répondues
    // Cela permet de reprendre une partie interrompue manuellement (status='finished')
    return this.currentQuestionIndex >= this.selectedQuestions.length;
  }

  // Terminer manuellement la partie (appelée par le maître du jeu)
  endGameManually() {
    // Sauvegarder la question actuelle dans l'historique si elle est en cours
    if (this.status === 'playing' && this.getCurrentQuestion()) {
      this.saveCurrentQuestionToHistory();
    }

    this.status = 'finished';
    return true;
  }

  // Obtenir les statistiques de la partie
  getGameStats() {
    return {
      totalQuestions: this.selectedQuestions.length,
      currentQuestion: this.currentQuestionIndex + 1,
      totalPlayers: this.players.size,
      status: this.status
    };
  }
}

// Gestion des parties actives
class GameManager {
  constructor() {
    this.games = new Map(); // Map de gameCode -> Game
  }

  // Générer un code de partie unique
  generateGameCode() {
    let code;
    do {
      code = Math.floor(1000 + Math.random() * 9000).toString();
    } while (this.games.has(code));
    return code;
  }

  // Créer une nouvelle partie
  createGame(hostSocketId) {
    const gameCode = this.generateGameCode();
    const game = new Game(gameCode);
    game.setHost(hostSocketId);
    this.games.set(gameCode, game);
    return { gameCode, game };
  }

  // Obtenir une partie
  getGame(gameCode) {
    return this.games.get(gameCode);
  }

  // Supprimer une partie
  deleteGame(gameCode) {
    this.games.delete(gameCode);
  }

  // Obtenir toutes les questions disponibles
  getAllQuestions() {
    return loadQuestions();
  }
}

module.exports = { GameManager, Game };
