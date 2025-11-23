// ============================================
// PLAYER.JS - Logique du joueur (VERSION DEBUG)
// ============================================

console.log('✅ player.js chargé');

const socket = io();
console.log('✅ Socket.io initialisé');

// Variables globales
let playerName = '';
let gameCode = '';
let currentQuestion = null;
let hasAnswered = false;
let timeExpired = false;
let opponentsAnswers = new Map(); // Map de playerId -> {playerName, isCorrect, answer}
let currentScore = 0; // Score actuel du joueur

// Références aux éléments DOM
const screens = {
    join: document.getElementById('joinScreen'),
    waiting: document.getElementById('waitingScreen'),
    question: document.getElementById('questionScreen'),
    result: document.getElementById('resultScreen'),
    leaderboard: document.getElementById('leaderboardScreen'),
    finished: document.getElementById('finishedScreen')
};

console.log('✅ Références DOM créées', screens);

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM chargé, installation des event listeners');
    setupEventListeners();
});

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    console.log('✅ setupEventListeners appelé');

    const joinForm = document.getElementById('joinForm');
    console.log('Form trouvé:', joinForm);

    // Formulaire de connexion
    joinForm.addEventListener('submit', (e) => {
        console.log('✅ Formulaire soumis !');
        e.preventDefault();
        console.log('✅ Comportement par défaut empêché');
        joinGame();
    });

    // Bouton pour réponse libre
    document.getElementById('submitFreeAnswer').addEventListener('click', submitFreeAnswer);

    // Enter pour soumettre réponse libre
    document.getElementById('freeAnswerInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitFreeAnswer();
        }
    });

    console.log('✅ Event listeners installés');
}

// ============================================
// REJOINDRE UNE PARTIE
// ============================================

function joinGame() {
    console.log('✅ joinGame() appelé');

    playerName = document.getElementById('playerName').value.trim();
    gameCode = document.getElementById('gameCode').value.trim();

    console.log('Nom:', playerName, 'Code:', gameCode);

    if (!playerName || !gameCode) {
        console.log('❌ Champs vides');
        showError('Veuillez remplir tous les champs');
        return;
    }

    console.log('✅ Émission du signal player:joinGame');
    socket.emit('player:joinGame', { gameCode, playerName }, (response) => {
        console.log('✅ Réponse reçue:', response);
        if (response.success) {
            console.log('✅ Succès ! Changement d\'écran');
            document.getElementById('displayPlayerName').textContent = playerName;

            // Afficher un message différent selon si c'est une reconnexion ou non
            if (response.reconnected) {
                console.log('🔄 Reconnexion détectée');
                showSuccess('Reconnexion réussie ! Vous retrouvez votre partie en cours.');

                // Restaurer le score du joueur
                if (response.score !== undefined) {
                    updateScoreDisplay(response.score);
                }

                // Si la partie est déjà en cours, rester en attente
                if (response.gameStatus === 'playing') {
                    showScreen('waiting');
                } else {
                    showScreen('waiting');
                }
            } else {
                // Nouveau joueur : initialiser le score à 0
                updateScoreDisplay(0);
                showScreen('waiting');
            }
        } else {
            console.log('❌ Échec:', response.message);
            showError(response.message);
        }
    });
}

function showError(message) {
    console.log('Affichage erreur:', message);
    const errorDiv = document.getElementById('joinError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

function showSuccess(message) {
    console.log('Affichage succès:', message);
    const errorDiv = document.getElementById('joinError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.style.background = 'var(--success-color)';

    setTimeout(() => {
        errorDiv.style.display = 'none';
        errorDiv.style.background = ''; // Reset to default
    }, 4000);
}

// ============================================
// MISE À JOUR DU SCORE
// ============================================

function updateScoreDisplay(score) {
    currentScore = score;
    const scoreElement = document.getElementById('currentScoreValue');
    if (scoreElement) {
        scoreElement.textContent = `${score} pts`;
    }
}

// ============================================
// GESTION DES ÉCRANS
// ============================================

function showScreen(screenName) {
    console.log('Changement d\'écran vers:', screenName);
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
    console.log('✅ Écran changé');
}

// ============================================
// ÉVÉNEMENTS SOCKET - SALLE D'ATTENTE
// ============================================

socket.on('game:playersUpdate', ({ players }) => {
    console.log('Mise à jour joueurs:', players);
    document.getElementById('waitingPlayersCount').textContent = players.length;

    const container = document.getElementById('waitingPlayersList');
    container.innerHTML = players.map(p => `
        <div class="player-item">
            <span>👤</span>
            <span>${p.name}</span>
        </div>
    `).join('');
});

// ============================================
// ÉVÉNEMENTS SOCKET - JEU
// ============================================

socket.on('game:started', () => {
    console.log('La partie commence !');
});

socket.on('game:newQuestion', (question) => {
    console.log('Nouvelle question:', question);
    currentQuestion = question;
    hasAnswered = false;
    opponentsAnswers.clear(); // Réinitialiser les réponses des adversaires
    displayQuestion(question);
    showScreen('question');
});

socket.on('game:playerAnswered', ({ playerName: oppName, playerId, isCorrect, answer, questionType }) => {
    console.log('Un joueur a répondu:', oppName);

    // NE RIEN afficher : suspense total jusqu'à la révélation des résultats
    // Les réponses des adversaires ne seront affichées que lors de game:resultsRevealed
});

socket.on('game:playerAnswerValidated', ({ playerName: oppName, playerId, isCorrect, answer }) => {
    console.log('Réponse validée pour:', oppName, isCorrect);

    // Mettre à jour le statut de la réponse
    if (oppName !== playerName) {
        opponentsAnswers.set(playerId, {
            playerName: oppName,
            isCorrect: isCorrect,
            answer: answer
        });
        updateOpponentsDisplay();
    }
});

socket.on('player:answerRecorded', () => {
    console.log('Réponse enregistrée');
    hasAnswered = true;
    const feedback = document.getElementById('answerFeedback');
    feedback.innerHTML = '<p>⏳ Réponse enregistrée. En attente de validation...</p>';
    feedback.className = 'answer-feedback waiting';
    feedback.style.display = 'block';
});

socket.on('player:answerFeedback', ({ isCorrect, correctAnswer, isFastest }) => {
    console.log('Feedback reçu:', isCorrect, 'Fastest?', isFastest);
    hasAnswered = true;
    const feedback = document.getElementById('answerFeedback');

    if (isCorrect) {
        if (isFastest) {
            // Joueur le plus rapide - gagne les points
            feedback.innerHTML = '<p>✅ Bonne réponse !</p><p class="fastest-indicator">⚡ Vous êtes le plus rapide !</p>';
            feedback.className = 'answer-feedback correct fastest';
        } else {
            // Bonne réponse mais pas assez rapide - 0 point
            feedback.innerHTML = '<p>✅ Bonne réponse, mais pas assez rapide (0 point)</p>';
            feedback.className = 'answer-feedback correct-but-slow';
        }
    } else {
        feedback.innerHTML = `<p>❌ Mauvaise réponse</p><p class="correct-answer">Réponse correcte : ${correctAnswer}</p>`;
        feedback.className = 'answer-feedback incorrect';
    }

    feedback.style.display = 'block';
});

socket.on('player:answerValidated', ({ isCorrect }) => {
    console.log('Réponse validée:', isCorrect);
    const feedback = document.getElementById('answerFeedback');

    if (isCorrect) {
        feedback.innerHTML = '<p>✅ Réponse validée par le maître du jeu !</p>';
        feedback.className = 'answer-feedback correct';
    } else {
        feedback.innerHTML = '<p>❌ Réponse refusée par le maître du jeu</p>';
        feedback.className = 'answer-feedback incorrect';
    }

    feedback.style.display = 'block';
});

socket.on('player:answerRejected', ({ message }) => {
    console.log('Réponse rejetée:', message);
    const feedback = document.getElementById('answerFeedback');
    feedback.innerHTML = `<p>🚫 ${message}</p>`;
    feedback.className = 'answer-feedback incorrect';
    feedback.style.display = 'block';
});

socket.on('game:stopTimer', () => {
    console.log('Timer arrêté par le maître du jeu');
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timeExpired = true;
});

socket.on('game:resultsRevealed', ({ responses, fastestCorrectPlayerId }) => {
    console.log('Résultats révélés!', responses, 'Fastest:', fastestCorrectPlayerId);

    // Mettre à jour les réponses des adversaires avec les vrais résultats
    responses.forEach(r => {
        if (r.playerName !== playerName) {
            opponentsAnswers.set(r.playerId, {
                playerName: r.playerName,
                isCorrect: r.isCorrect,
                answer: r.answer,
                isFastest: r.isFastest || false
            });
        }
    });

    // Rafraîchir l'affichage avec les résultats
    updateOpponentsDisplay();
});

socket.on('game:leaderboard', ({ leaderboard, currentQuestion, totalQuestions, isFinished }) => {
    console.log('Classement:', leaderboard);

    // Mettre à jour le score affiché en haut de l'écran
    const myData = leaderboard.find(p => p.name === playerName);
    if (myData) {
        updateScoreDisplay(myData.score);
    }

    displayLeaderboard(leaderboard);

    if (isFinished) {
        setTimeout(() => {
            displayFinalResults(leaderboard);
        }, 3000);
    } else {
        showScreen('leaderboard');
        setTimeout(() => {
        }, 5000);
    }
});

socket.on('game:finished', ({ leaderboard, manuallyEnded }) => {
    console.log('Partie terminée');

    // Afficher un message si la partie a été terminée manuellement par le maître du jeu
    if (manuallyEnded) {
        showSuccess('⏹️ Le maître du jeu a mis fin à la partie. Voici le classement final !');
    }

    displayFinalResults(leaderboard);
});

// ============================================
// AFFICHAGE DE LA QUESTION
// ============================================

function displayQuestion(question) {
    document.getElementById('questionNumber').textContent = question.numero;
    document.getElementById('totalQuestions').textContent = question.total;
    document.getElementById('questionText').textContent = question.question;

    // Afficher la manche
    if (question.manche) {
        const mancheDisplay = document.getElementById('mancheDisplayPlayer');
        const mancheName = document.getElementById('mancheNamePlayer');
        mancheName.textContent = question.manche.nom;
        mancheDisplay.style.display = 'flex';
    } else {
        document.getElementById('mancheDisplayPlayer').style.display = 'none';
    }

    // Réinitialiser les états
    hasAnswered = false;
    timeExpired = false;

    document.getElementById('qcmAnswers').style.display = 'none';
    document.getElementById('vraiFauxAnswers').style.display = 'none';
    document.getElementById('libreAnswer').style.display = 'none';
    document.getElementById('answerFeedback').style.display = 'none';
    document.getElementById('opponentsAnswers').style.display = 'none';
    document.getElementById('opponentsList').innerHTML = '';

    if (question.type === 'QCM') {
        displayQCMAnswers(question);
    } else if (question.type === 'VraiFaux') {
        displayVraiFauxAnswers(question);
    } else if (question.type === 'Libre') {
        displayFreeAnswer();
    }

    // Ne démarrer le timer que pour QCM et VraiFaux
    if (question.type === 'QCM' || question.type === 'VraiFaux') {
        document.getElementById('timer').style.visibility = 'visible';
        startTimer(40);
    } else {
        // Pour les questions Libres, masquer le timer
        document.getElementById('timer').style.visibility = 'hidden';
    }
}

function updateOpponentsDisplay() {
    const container = document.getElementById('opponentsList');
    const opponentsDiv = document.getElementById('opponentsAnswers');

    if (opponentsAnswers.size === 0) {
        opponentsDiv.style.display = 'none';
        return;
    }

    opponentsDiv.style.display = 'block';

    const html = Array.from(opponentsAnswers.values()).map(opp => {
        let statusIcon = '✓';
        let statusClass = 'answered';
        let statusText = 'A répondu';

        // Si les résultats ont été révélés (isCorrect n'est plus null)
        if (opp.isCorrect === true) {
            if (opp.isFastest) {
                // Joueur le plus rapide - a gagné les points
                statusIcon = '⚡✅';
                statusClass = 'correct fastest';
                statusText = 'Bonne réponse (le plus rapide)';
            } else {
                // Bonne réponse mais trop lent - 0 point
                statusIcon = '✅';
                statusClass = 'correct-but-slow';
                statusText = 'Bonne réponse (0 pt)';
            }
        } else if (opp.isCorrect === false) {
            statusIcon = '❌';
            statusClass = 'incorrect';
            statusText = 'Mauvaise réponse';
        }

        return `
            <div class="opponent-item ${statusClass}">
                <span class="opponent-name">${opp.playerName}</span>
                <span class="opponent-status">${statusIcon} ${statusText}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

function displayQCMAnswers(question) {
    const container = document.getElementById('qcmAnswers');
    const letters = ['A', 'B', 'C', 'D'];

    container.innerHTML = question.choix.map((choix, index) => {
        const letter = letters[index];
        return `
            <div class="answer-choice" data-answer="${letter}">
                ${letter}. ${choix}
            </div>
        `;
    }).join('');

    container.querySelectorAll('.answer-choice').forEach(choice => {
        choice.addEventListener('click', () => {
            if (!hasAnswered) {
                selectAnswer(choice.dataset.answer);
            }
        });
    });

    container.style.display = 'grid';
}

function displayVraiFauxAnswers(question) {
    const container = document.getElementById('vraiFauxAnswers');

    container.innerHTML = `
        <div class="answer-choice" data-answer="Vrai">
            Vrai
        </div>
        <div class="answer-choice" data-answer="Faux">
            Faux
        </div>
    `;

    container.querySelectorAll('.answer-choice').forEach(choice => {
        choice.addEventListener('click', () => {
            if (!hasAnswered) {
                selectAnswer(choice.dataset.answer);
            }
        });
    });

    container.style.display = 'grid';
}

function displayFreeAnswer() {
    const container = document.getElementById('libreAnswer');
    const input = document.getElementById('freeAnswerInput');

    input.value = '';
    input.disabled = false;
    document.getElementById('submitFreeAnswer').disabled = false;

    container.style.display = 'block';
}

function selectAnswer(answer) {
    if (hasAnswered || timeExpired) return;

    document.querySelectorAll('.answer-choice').forEach(c => {
        c.classList.remove('selected');
        c.classList.add('disabled');
    });

    const selectedChoice = document.querySelector(`.answer-choice[data-answer="${answer}"]`);
    if (selectedChoice) {
        selectedChoice.classList.add('selected');
    }

    socket.emit('player:answer', { gameCode, answer });
}

function submitFreeAnswer() {
    if (hasAnswered || timeExpired) return;

    const input = document.getElementById('freeAnswerInput');
    const answer = input.value.trim();

    if (!answer) {
        alert('Veuillez saisir une réponse');
        return;
    }

    input.disabled = true;
    document.getElementById('submitFreeAnswer').disabled = true;

    socket.emit('player:answer', { gameCode, answer });
}

let timerInterval = null;

function startTimer(seconds) {
    let remaining = seconds;
    updateTimerDisplay(remaining);

    if (timerInterval) {
        clearInterval(timerInterval);
    }

    timerInterval = setInterval(() => {
        remaining--;
        updateTimerDisplay(remaining);

        if (remaining <= 0) {
            clearInterval(timerInterval);
            timeExpired = true;

            // Désactiver tous les choix
            document.querySelectorAll('.answer-choice').forEach(c => {
                c.classList.add('disabled');
            });

            // Désactiver l'input pour réponse libre
            const freeInput = document.getElementById('freeAnswerInput');
            const submitBtn = document.getElementById('submitFreeAnswer');
            if (freeInput) freeInput.disabled = true;
            if (submitBtn) submitBtn.disabled = true;

            // Afficher un message si pas encore répondu
            if (!hasAnswered) {
                document.getElementById('answerFeedback').innerHTML = '<p>⏰ Temps écoulé !</p>';
                document.getElementById('answerFeedback').style.display = 'block';
            }
        }
    }, 1000);
}

function updateTimerDisplay(seconds) {
    document.getElementById('timer').textContent = seconds;
}

function displayLeaderboard(leaderboard) {
    const container = document.getElementById('leaderboardContent');
    const myRank = leaderboard.find(p => p.name === playerName);

    container.innerHTML = leaderboard.map(player => {
        const rankClass = `rank-${player.rank}`;
        const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
        const medal = medals[player.rank] || '';
        const isMe = player.name === playerName;

        return `
            <div class="leaderboard-item ${rankClass} ${isMe ? 'highlight' : ''}">
                <div class="leaderboard-rank">${medal || player.rank}</div>
                <div class="leaderboard-name">${player.name}${isMe ? ' (Vous)' : ''}</div>
                <div class="leaderboard-score">${player.score} pts</div>
            </div>
        `;
    }).join('');

    if (myRank) {
        document.getElementById('playerRank').innerHTML = `
            <p>Vous êtes <strong>${myRank.rank}${getRankSuffix(myRank.rank)}</strong> avec <strong>${myRank.score} points</strong></p>
        `;
    }
}

function getRankSuffix(rank) {
    if (rank === 1) return 'er';
    return 'ème';
}

function displayFinalResults(leaderboard) {
    const myRank = leaderboard.find(p => p.name === playerName);

    let title = '🏆 Partie terminée !';
    let message = 'Merci d\'avoir participé !';

    if (myRank) {
        if (myRank.rank === 1) {
            title = '🥇 Champion !';
            message = 'Félicitations, vous avez gagné !';
        } else if (myRank.rank <= 3) {
            title = '🥈 Bravo !';
            message = 'Belle performance !';
        }
    }

    document.getElementById('finalTitle').textContent = title;

    if (myRank) {
        document.getElementById('finalRank').innerHTML = `
            <h2>Vous êtes ${myRank.rank}${getRankSuffix(myRank.rank)}</h2>
            <p class="score">${myRank.score} points</p>
        `;
    }

    const container = document.getElementById('finalLeaderboard');
    container.innerHTML = leaderboard.map(player => {
        const rankClass = `rank-${player.rank}`;
        const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
        const medal = medals[player.rank] || '';
        const isMe = player.name === playerName;

        return `
            <div class="leaderboard-item ${rankClass}">
                <div class="leaderboard-rank">${medal || player.rank}</div>
                <div class="leaderboard-name">${player.name}${isMe ? ' (Vous)' : ''}</div>
                <div class="leaderboard-score">${player.score} pts</div>
            </div>
        `;
    }).join('');

    showScreen('finished');
}

socket.on('game:hostDisconnected', () => {
    showWarning('⚠️ Le maître du jeu s\'est déconnecté. La partie est en pause. Le maître peut se reconnecter pour continuer.');
    // Ne pas renvoyer à l'accueil - permettre au joueur de rester et attendre la reconnexion
});

// ============================================
// EVENT: GAME INTERRUPTED
// ============================================
socket.on('game:interrupted', ({ gameCode }) => {
    console.log('Game interrupted, code:', gameCode);
    showWarning('⏸️ Partie interrompue par le maître. En attente de reprise.');
    // Stay on waiting screen to await host reconnection
    showScreen('waiting');
});

function showWarning(message) {
    console.log('Affichage avertissement:', message);
    const warningDiv = document.createElement('div');
    warningDiv.className = 'warning-message';
    warningDiv.textContent = message;
    warningDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: orange; color: white; padding: 20px; border-radius: 10px; z-index: 10000; max-width: 400px; text-align: center; box-shadow: 0 4px 8px rgba(0,0,0,0.2);';
    document.body.appendChild(warningDiv);

    setTimeout(() => {
        warningDiv.remove();
    }, 5000);
}

socket.on('connect_error', (error) => {
    console.error('Erreur de connexion:', error);
    showError('Impossible de se connecter au serveur');
});

socket.on('error', (error) => {
    console.error('Erreur:', error);
    showError('Une erreur est survenue');
});

console.log('✅ player.js complètement chargé et prêt');
