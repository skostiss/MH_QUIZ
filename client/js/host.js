// ============================================
// HOST.JS - Logique du maître du jeu
// ============================================

const socket = io();

// Variables globales
let gameCode = null;
let selectedQuestionIds = [];
let allQuestions = [];
let manches = {};
let currentQuestion = null;
let timer = null;
let timerSeconds = 40;
let currentMancheFilter = 'all';
let persistentSelections = new Set(); // Pour persister les sélections entre les filtres
let mancheOrder = [1, 2, 3, 4, 5]; // Ordre des manches (modifiable par le host)
let draggedMancheIndex = null; // Pour le glisser-déposer des manches
let currentPlayers = []; // État actuel des joueurs avec connexion et scores

// Références aux éléments DOM
const screens = {
    setup: document.getElementById('setupScreen'),
    waiting: document.getElementById('waitingScreen'),
    question: document.getElementById('questionScreen'),
    leaderboard: document.getElementById('leaderboardScreen'),
    finished: document.getElementById('finishedScreen'),
    history: document.getElementById('historyScreen'),
    restore: document.getElementById('restoreScreen')
};

let currentHistoryQuestionIndex = null;
let savedGameState = null; // Pour sauvegarder l'état avant d'aller dans l'historique

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadManches();
    await loadQuestions();
    setupEventListeners();
});

// ============================================
// CHARGEMENT DES MANCHES
// ============================================

async function loadManches() {
    try {
        const response = await fetch('/api/manches');
        manches = await response.json();
        console.log('Manches chargées:', manches);
        // Afficher le contrôle d'ordre des manches
        // Afficher le contrôle d'ordre des manches (qui sert aussi de filtre)
        displayMancheOrderControl();
    } catch (error) {
        console.error('Erreur chargement manches:', error);
    }
}

function filterByManche(mancheId) {
    currentMancheFilter = mancheId;
    // Rafraîchir l'affichage pour mettre à jour la classe active
    displayMancheOrderControl();
    displayQuestionsSelection();
}

// ============================================
// CHARGEMENT DES QUESTIONS
// ============================================

async function loadQuestions() {
    try {
        const response = await fetch('/api/questions');
        allQuestions = await response.json();
        // Maintenant que les questions sont chargées, afficher le contrôle (qui sert de filtre)
        displayMancheOrderControl();
        displayQuestionsSelection();
    } catch (error) {
        console.error('Erreur chargement questions:', error);
        alert('Erreur lors du chargement des questions');
    }
}

function displayQuestionsSelection() {
    const container = document.getElementById('questionsSelection');
    container.innerHTML = '';

    // Filtrer les questions selon la manche sélectionnée
    const filteredQuestions = currentMancheFilter === 'all'
        ? allQuestions
        : allQuestions.filter(q => q.manche === currentMancheFilter);

    if (filteredQuestions.length === 0) {
        container.innerHTML = '<p>Aucune question dans cette manche.</p>';
        return;
    }

    // Grouper par manche
    const groupedByManche = {};
    filteredQuestions.forEach(q => {
        if (!groupedByManche[q.manche]) {
            groupedByManche[q.manche] = [];
        }
        groupedByManche[q.manche].push(q);
    });

    // Afficher chaque manche
    Object.keys(groupedByManche).sort((a, b) => a - b).forEach(mancheId => {
        const manche = manches[mancheId];
        const mancheQuestions = groupedByManche[mancheId];

        // Calculer le nombre de questions sélectionnées dans cette manche
        const selectedInManche = mancheQuestions.filter(q => persistentSelections.has(q.id)).length;
        const totalInManche = mancheQuestions.length;

        const mancheSection = document.createElement('div');
        mancheSection.className = 'manche-section-host';
        mancheSection.innerHTML = `
            <h3 class="manche-title-host">🎯 ${manche.nom} <span class="manche-count-host" id="manche-count-${mancheId}">(${selectedInManche}/${totalInManche} questions)</span></h3>
        `;

        mancheQuestions.forEach(q => {
            const div = document.createElement('div');
            div.className = 'question-checkbox';

            const typeClass = q.type.toLowerCase().replace('/', '');
            const typeLabel = q.type === 'VraiFaux' ? 'Vrai/Faux' : q.type;

            // Vérifier si cette question est dans les sélections persistantes
            const isChecked = persistentSelections.has(q.id);

            div.innerHTML = `
                <input type="checkbox" id="q${q.id}" value="${q.id}" class="question-check" data-manche="${mancheId}" ${isChecked ? 'checked' : ''}>
                <div class="question-info">
                    <span class="question-type ${typeClass}">${typeLabel}</span>
                    <div>${q.question}</div>
                </div>
            `;

            mancheSection.appendChild(div);
        });

        container.appendChild(mancheSection);
    });

    // Ajouter des event listeners pour mettre à jour les sélections persistantes et la case "Tout sélectionner"
    document.querySelectorAll('.question-check').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const questionId = parseInt(e.target.value);
            if (e.target.checked) {
                persistentSelections.add(questionId);
            } else {
                persistentSelections.delete(questionId);
            }
            updateSelectAllCheckbox();
            updateMancheCounts();
        });
    });

    // Mettre à jour l'état de "Tout sélectionner"
    updateSelectAllCheckbox();
}

// Fonction pour mettre à jour les compteurs de chaque manche
function updateMancheCounts() {
    // Parcourir toutes les manches affichées
    Object.keys(manches).forEach(mancheId => {
        const countElement = document.getElementById(`manche-count-${mancheId}`);
        if (!countElement) return;

        // Compter les questions sélectionnées dans cette manche
        const mancheQuestions = allQuestions.filter(q => q.manche === parseInt(mancheId));
        const selectedInManche = mancheQuestions.filter(q => persistentSelections.has(q.id)).length;
        const totalInManche = mancheQuestions.length;

        countElement.textContent = `(${selectedInManche}/${totalInManche} questions)`;
    });

    // Mettre à jour aussi les filtres (ordre des manches)
    displayMancheOrderControl();
}

// Fonction pour tout sélectionner/désélectionner
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const questionCheckboxes = document.querySelectorAll('.question-check');

    questionCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
        const questionId = parseInt(checkbox.value);

        if (selectAllCheckbox.checked) {
            persistentSelections.add(questionId);
        } else {
            persistentSelections.delete(questionId);
        }
    });

    // Mettre à jour les compteurs de manches
    updateMancheCounts();
}

// Fonction pour mettre à jour la case "Tout sélectionner"
function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const questionCheckboxes = document.querySelectorAll('.question-check');

    if (questionCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        return;
    }

    const allChecked = Array.from(questionCheckboxes).every(cb => cb.checked);
    const noneChecked = Array.from(questionCheckboxes).every(cb => !cb.checked);

    selectAllCheckbox.checked = allChecked;
    selectAllCheckbox.indeterminate = !allChecked && !noneChecked;
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    console.log('🟢 setupEventListeners() appelé');

    // Créer la partie
    document.getElementById('createGameBtn').addEventListener('click', createGame);

    // Lancer la partie
    document.getElementById('startGameBtn').addEventListener('click', startGame);

    // Révéler les résultats
    document.getElementById('revealResultsBtn').addEventListener('click', revealResults);

    // Afficher le classement
    document.getElementById('showLeaderboardBtn').addEventListener('click', showLeaderboard);

    // Question suivante
    document.getElementById('nextQuestionBtn').addEventListener('click', nextQuestion);

    // Tout sélectionner
    document.getElementById('selectAllCheckbox').addEventListener('change', toggleSelectAll);

    // Voir l'historique
    document.getElementById('viewHistoryBtn').addEventListener('click', viewHistory);

    // Retour depuis l'historique
    document.getElementById('backFromHistory').addEventListener('click', () => {
        restoreGameState();
    });

    // Fermer le modal
    document.getElementById('closeModal').addEventListener('click', closeQuestionModal);

    // Reprendre une partie
    document.getElementById('restoreGameBtn').addEventListener('click', showRestoreGameScreen);

    // Retour depuis l'écran de restauration
    document.getElementById('backFromRestore').addEventListener('click', () => showScreen('setup'));

    // Terminer la partie manuellement (depuis l'écran question)
    // Bouton "Interrompre la partie" (Sidebar)
    const interruptBtn = document.getElementById('interruptGameBtn');
    console.log('🔴 Bouton interruptGameBtn trouvé:', interruptBtn);
    if (interruptBtn) {
        interruptBtn.addEventListener('click', () => {
            console.log('🔴 Clic sur interruptGameBtn détecté!');
            interruptGame();
        });
        console.log('🔴 Event listener attaché à interruptGameBtn');
    } else {
        console.error('🔴 ERREUR: Bouton interruptGameBtn introuvable!');
    }
}

// ============================================
// ORDRE DES MANCHES
// ============================================

function displayMancheOrderControl() {
    const container = document.getElementById('mancheOrderControl');
    if (!container) return;

    // Calculer les totaux pour "Toutes les questions"
    const totalSelected = persistentSelections.size;
    const totalQuestions = allQuestions.length;

    let html = `
        <h3>📋 Ordre des manches & Filtres</h3>
        <p>Cliquez pour filtrer, glissez pour réorganiser.</p>
        <div class="manche-order-list">
            <!-- Item statique pour "Toutes les questions" -->
            <div class="manche-order-item static-item ${currentMancheFilter === 'all' ? 'active' : ''}" 
                 onclick="filterByManche('all')">
                <span class="manche-order-number">📚</span>
                <span class="manche-order-label">Toutes les questions</span>
                <span class="manche-count-badge">${totalSelected}/${totalQuestions}</span>
            </div>
    `;

    html += mancheOrder.map((mancheId, index) => {
        const manche = manches[mancheId];
        if (!manche) return '';

        // Calculer les totaux pour cette manche
        const mancheQuestions = allQuestions.filter(q => q.manche === manche.id);
        const totalInManche = mancheQuestions.length;
        const selectedInManche = mancheQuestions.filter(q => persistentSelections.has(q.id)).length;

        return `
            <div class="manche-order-item ${currentMancheFilter === manche.id ? 'active' : ''}" 
                 draggable="true" 
                 data-index="${index}"
                 onclick="filterByManche(${manche.id})">
                <span class="drag-handle" onclick="event.stopPropagation()">☰</span>
                <span class="manche-order-number">${index + 1}.</span>
                <span class="manche-order-label">${manche.nom}</span>
                <span class="manche-count-badge">${selectedInManche}/${totalInManche}</span>
                <div class="manche-order-controls" onclick="event.stopPropagation()">
                    <button class="manche-order-btn" onclick="moveMancheUp(${index})" ${index === 0 ? 'disabled' : ''}>↑</button>
                    <button class="manche-order-btn" onclick="moveMancheDown(${index})" ${index === mancheOrder.length - 1 ? 'disabled' : ''}>↓</button>
                </div>
            </div>
        `;
    }).join('');

    html += `</div>`;
    container.innerHTML = html;

    // Initialiser le glisser-déposer après le rendu
    initMancheDragAndDrop();
}

window.moveMancheUp = function (index) {
    if (index > 0) {
        [mancheOrder[index], mancheOrder[index - 1]] = [mancheOrder[index - 1], mancheOrder[index]];
        displayMancheOrderControl();
    }
};

window.moveMancheDown = function (index) {
    if (index < mancheOrder.length - 1) {
        [mancheOrder[index], mancheOrder[index + 1]] = [mancheOrder[index + 1], mancheOrder[index]];
        displayMancheOrderControl();
    }
};

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ============================================
// GLISSER-DÉPOSER DES MANCHES
// ============================================

function initMancheDragAndDrop() {
    const items = document.querySelectorAll('.manche-order-item[draggable]');

    items.forEach(item => {
        item.addEventListener('dragstart', handleMancheDragStart);
        item.addEventListener('dragend', handleMancheDragEnd);
        item.addEventListener('dragover', handleMancheDragOver);
        item.addEventListener('drop', handleMancheDrop);
        item.addEventListener('dragleave', handleMancheDragLeave);
    });
}

function handleMancheDragStart(e) {
    draggedMancheIndex = parseInt(this.dataset.index);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleMancheDragEnd(e) {
    this.classList.remove('dragging');
    // Retirer la classe drag-over de tous les éléments
    document.querySelectorAll('.manche-order-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleMancheDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }

    e.dataTransfer.dropEffect = 'move';

    const targetIndex = parseInt(this.dataset.index);
    if (targetIndex !== draggedMancheIndex) {
        this.classList.add('drag-over');
    }

    return false;
}

function handleMancheDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleMancheDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    const targetIndex = parseInt(this.dataset.index);

    if (draggedMancheIndex !== null && draggedMancheIndex !== targetIndex) {
        // Retirer la manche de sa position d'origine
        const draggedManche = mancheOrder[draggedMancheIndex];
        mancheOrder.splice(draggedMancheIndex, 1);

        // Insérer la manche à la nouvelle position
        mancheOrder.splice(targetIndex, 0, draggedManche);

        // Rafraîchir l'affichage
        displayMancheOrderControl();
        initMancheDragAndDrop(); // Ré-attacher les événements
    }

    return false;
}

// ============================================
// CRÉER UNE PARTIE
// ============================================

function createGame() {
    if (persistentSelections.size === 0) {
        alert('Veuillez sélectionner au moins une question');
        return;
    }

    // Construire l'array de questions dans l'ordre des manches
    // avec mélange aléatoire des questions au sein de chaque manche
    selectedQuestionIds = [];

    mancheOrder.forEach(mancheId => {
        // Récupérer toutes les questions de cette manche qui sont sélectionnées
        const mancheQuestions = allQuestions
            .filter(q => q.manche === mancheId && persistentSelections.has(q.id))
            .map(q => q.id);

        // Mélanger les questions de cette manche
        const shuffled = shuffleArray(mancheQuestions);

        // Ajouter au tableau final
        selectedQuestionIds.push(...shuffled);
    });

    console.log('Questions organisées par ordre de manches:', mancheOrder);
    console.log('Questions finales:', selectedQuestionIds);

    // Créer la partie
    socket.emit('host:createGame', (response) => {
        gameCode = response.gameCode;

        // Configurer les questions
        socket.emit('host:configureQuestions', { gameCode, questionIds: selectedQuestionIds });

        // Afficher l'écran d'attente
        document.getElementById('gameCode').textContent = gameCode;

        // Afficher le panneau d'informations permanent
        showGameInfoPanel(gameCode);

        showScreen('waiting');
    });
}

// ============================================
// LANCER LA PARTIE
// ============================================

function startGame() {
    socket.emit('host:startGame', { gameCode });
}

// ============================================
// GESTION DES ÉCRANS
// ============================================

function showScreen(screenName) {
    console.log(`🔄 HOST: Changement d'écran vers "${screenName}"`);

    // Re-query all screen elements to ensure they exist
    const allScreens = {
        setup: document.getElementById('setupScreen'),
        waiting: document.getElementById('waitingScreen'),
        question: document.getElementById('questionScreen'),
        leaderboard: document.getElementById('leaderboardScreen'),
        finished: document.getElementById('finishedScreen'),
        history: document.getElementById('historyScreen'),
        restore: document.getElementById('restoreScreen')
    };

    // Remove 'active' class from all screens
    Object.values(allScreens).forEach(screen => {
        if (screen) {
            screen.classList.remove('active');
        }
    });

    // Add 'active' class to target screen
    const targetScreen = allScreens[screenName];
    if (targetScreen) {
        targetScreen.classList.add('active');
        console.log(`✅ HOST: Écran "${screenName}" activé`);
    } else {
        console.error(`❌ HOST: Écran "${screenName}" introuvable dans le DOM!`);
    }
}

// ============================================
// PANNEAU D'INFORMATIONS PERMANENT
// ============================================

function updateGameInfoPanel(players) {
    // Mettre à jour le compteur de joueurs
    const panelPlayerCount = document.getElementById('panelPlayerCount');
    if (panelPlayerCount) {
        panelPlayerCount.textContent = players.length;
    }

    // Mettre à jour la liste des joueurs avec statut de connexion
    const panelPlayersList = document.getElementById('panelPlayersList');
    if (panelPlayersList) {
        if (players.length === 0) {
            panelPlayersList.innerHTML = '<p class="empty-state">Aucun joueur</p>';
        } else {
            // Trier les joueurs par score décroissant
            const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

            panelPlayersList.innerHTML = sortedPlayers.map(p => {
                const statusIcon = p.connected ? '🟢' : '🔴';
                const statusClass = p.connected ? 'connected' : 'disconnected';
                return `
                    <div class="player-status-item ${statusClass}">
                        <span class="status-icon">${statusIcon}</span>
                        <span class="player-name">${p.name}</span>
                        <span class="player-score">(${p.score} pts)</span>
                    </div>
                `;
            }).join('');
        }
    }
}

function showGameInfoPanel(code) {
    const panel = document.getElementById('gameInfoPanel');
    const panelGameCode = document.getElementById('panelGameCode');

    if (panel && panelGameCode) {
        panelGameCode.textContent = code;
        panel.style.display = 'flex';
    }
}

function hideGameInfoPanel() {
    const panel = document.getElementById('gameInfoPanel');
    if (panel) {
        panel.style.display = 'none';
    }
}

function mergeLeaderboardWithPlayers(leaderboard) {
    // Fusionner les scores du leaderboard avec l'état de connexion actuel
    // leaderboard = [{rank, name, score}]
    // currentPlayers = [{id, name, score, connected}]

    return leaderboard.map(lb => {
        // Trouver le joueur correspondant dans currentPlayers
        const existingPlayer = currentPlayers.find(p => p.name === lb.name);

        return {
            id: existingPlayer?.id || null,
            name: lb.name,
            score: lb.score, // Score mis à jour du leaderboard
            connected: existingPlayer ? existingPlayer.connected : true // Conserver le statut de connexion
        };
    });
}

// ============================================
// ÉVÉNEMENTS SOCKET - JOUEURS
// ============================================

socket.on('game:playersUpdate', ({ players }) => {
    const count = players.length;

    // Sauvegarder l'état actuel des joueurs
    currentPlayers = players;

    // Mise à jour de l'écran d'attente (comportement existant)
    const playerCountElem = document.getElementById('playerCount');
    if (playerCountElem) {
        playerCountElem.textContent = count;
    }

    const playersList = document.getElementById('playersList');
    if (playersList) {
        if (count === 0) {
            playersList.innerHTML = '<p class="empty-state">En attente des joueurs...</p>';
        } else {
            playersList.innerHTML = players.map(p => `
                <div class="player-item">
                    <span>👤</span>
                    <span>${p.name}</span>
                </div>
            `).join('');
        }
    }

    // Activer le bouton de lancement
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        startBtn.disabled = count === 0;
    }

    // NOUVEAU : Mise à jour du panneau permanent sur TOUS les écrans
    updateGameInfoPanel(players);
});

// ============================================
// ÉVÉNEMENTS SOCKET - JEU
// ============================================

socket.on('game:started', () => {
    console.log('Partie démarrée !');
});

socket.on('host:newQuestion', (question) => {
    console.log('✅ HOST: Réception de host:newQuestion', { questionId: question.id, type: question.type });
    currentQuestion = question;
    showScreen('question'); // ✅ Afficher l'écran AVANT de manipuler le DOM
    displayQuestion(question);
    // Ne démarrer le timer que pour QCM et VraiFaux
    if (question.type === 'QCM' || question.type === 'VraiFaux') {
        startTimer();
    }
});

socket.on('host:responsesUpdate', ({ responses, totalPlayers }) => {
    displayResponses(responses, totalPlayers);

    // Afficher le bouton approprié dès qu'au moins une réponse est enregistrée
    if (responses.length > 0) {
        if (currentQuestion && (currentQuestion.type === 'QCM' || currentQuestion.type === 'VraiFaux')) {
            document.getElementById('revealResultsBtn').style.display = 'block';
        } else {
            document.getElementById('showLeaderboardBtn').style.display = 'block';
        }
    }
});

socket.on('host:allAnswered', ({ responses, question }) => {
    stopTimer();
    const totalPlayersCount = responses.totalPlayers || currentPlayers.length;
    displayResponses(responses, totalPlayersCount);

    // Afficher le bouton approprié selon le type de question
    if (currentQuestion && (currentQuestion.type === 'QCM' || currentQuestion.type === 'VraiFaux')) {
        document.getElementById('revealResultsBtn').style.display = 'block';
    } else {
        document.getElementById('showLeaderboardBtn').style.display = 'block';
    }
});

socket.on('game:finished', ({ leaderboard }) => {
    displayFinalLeaderboard(leaderboard);
    showScreen('finished');
});

socket.on('game:stopTimer', () => {
    console.log('Timer arrêté');
    stopTimer();
});

// ============================================
// AFFICHAGE DE LA QUESTION
// ============================================

function displayQuestion(question) {
    // Arrêter le timer précédent s'il existe
    stopTimer();

    // Mise à jour du header
    document.getElementById('currentGameCode').textContent = gameCode;
    document.getElementById('questionNumber').textContent = question.numero;
    document.getElementById('totalQuestions').textContent = question.total;

    // Afficher la manche
    if (question.manche) {
        const mancheDisplay = document.getElementById('mancheDisplay');
        const mancheName = document.getElementById('mancheName');
        mancheName.textContent = question.manche.nom;
        mancheDisplay.style.display = 'flex';
    }

    // Texte de la question
    document.getElementById('questionText').textContent = question.question;

    // Masquer tous les types de réponses
    document.getElementById('qcmChoices').style.display = 'none';
    document.getElementById('vraiFauxChoices').style.display = 'none';

    // Restaurer la structure HTML de base pour #correctAnswer (au cas où elle aurait été écrasée)
    document.getElementById('correctAnswer').innerHTML =
        'Bonne réponse : <strong id="correctAnswerText">-</strong>';

    // Afficher le type approprié
    if (question.type === 'QCM') {
        displayQCMChoices(question);
        document.getElementById('correctAnswerText').textContent = `Réponse ${question.bonneReponse}`;
    } else if (question.type === 'VraiFaux') {
        displayVraiFauxChoices(question);
        document.getElementById('correctAnswerText').textContent = question.bonneReponse;
    } else if (question.type === 'Libre') {
        // Changer le label et mettre à jour le contenu sans détruire la structure
        const correctAnswerDiv = document.getElementById('correctAnswer');
        correctAnswerDiv.childNodes[0].textContent = 'Réponse de référence : ';
        document.getElementById('correctAnswerText').textContent = question.reponseReference;
    }

    // Gérer l'affichage du timer selon le type de question
    const timerDisplay = document.getElementById('timer');
    if (question.type === 'Libre') {
        // Masquer le timer pour les questions libres
        timerDisplay.style.visibility = 'hidden';
    } else {
        // Afficher le timer pour QCM et VraiFaux
        timerDisplay.style.visibility = 'visible';
    }

    // Réinitialiser l'affichage des réponses
    document.getElementById('responsesList').innerHTML =
        '<p class="empty-state">En attente des réponses...</p>';
    document.getElementById('responsesCount').textContent = '0';

    // Cacher les deux boutons au début
    document.getElementById('revealResultsBtn').style.display = 'none';
    document.getElementById('showLeaderboardBtn').style.display = 'none';

    // Pour les questions Libres, afficher immédiatement le bouton "Afficher le classement"
    // (pas de révélation nécessaire car validation manuelle)
    if (question.type === 'Libre') {
        document.getElementById('showLeaderboardBtn').style.display = 'block';
    }
    // Pour QCM/VraiFaux, le bouton "Révéler les résultats" apparaîtra quand les réponses arrivent
}

function displayQCMChoices(question) {
    const container = document.getElementById('qcmChoices');
    const letters = ['A', 'B', 'C', 'D'];

    container.innerHTML = question.choix.map((choix, index) => {
        const letter = letters[index];
        const isCorrect = letter === question.bonneReponse;
        return `
            <div class="choice ${isCorrect ? 'correct' : ''}">
                ${letter}. ${choix}
            </div>
        `;
    }).join('');

    container.style.display = 'grid';
}

function displayVraiFauxChoices(question) {
    const container = document.getElementById('vraiFauxChoices');
    container.innerHTML = `
        <div class="choice ${question.bonneReponse === 'Vrai' ? 'correct' : ''}">
            Vrai
        </div>
        <div class="choice ${question.bonneReponse === 'Faux' ? 'correct' : ''}">
            Faux
        </div>
    `;
    container.style.display = 'grid';
}

// ============================================
// AFFICHAGE DES RÉPONSES
// ============================================

function displayResponses(responses, totalPlayers) {
    const container = document.getElementById('responsesList');
    document.getElementById('responsesCount').textContent = responses.length;
    document.getElementById('totalPlayersCount').textContent = totalPlayers;

    if (responses.length === 0) {
        container.innerHTML = '<p class="empty-state">En attente des réponses...</p>';
        return;
    }

    container.innerHTML = responses.map(r => {
        let statusClass = 'pending';
        let statusText = '⏳ En attente';
        let actions = '';

        if (r.validated === true) {
            statusClass = 'correct';
            statusText = `✅ Correct (+${r.points} points)`;
        } else if (r.validated === false) {
            statusClass = 'incorrect';
            statusText = '❌ Incorrect';
        }

        // Pour les réponses libres non validées, afficher les boutons
        if (currentQuestion.type === 'Libre' && r.validated === null) {
            actions = `
                <div class="response-actions">
                    <button class="btn-validate" onclick="validateAnswer('${r.playerId}', true)">
                        ✓ Valider
                    </button>
                    <button class="btn-reject" onclick="validateAnswer('${r.playerId}', false)">
                        ✗ Refuser
                    </button>
                </div>
            `;
        }

        return `
            <div class="response-item ${statusClass}">
                <div class="response-header">
                    <span>${r.playerName}</span>
                    <span>${(r.time / 1000).toFixed(1)}s</span>
                </div>
                <div class="response-answer">${r.answer}</div>
                <div>${statusText}</div>
                ${actions}
            </div>
        `;
    }).join('');
}

// Fonction globale pour la validation (appelée depuis le HTML)
window.validateAnswer = function (playerId, isValid) {
    socket.emit('host:validateAnswer', { gameCode, playerId, isValid });
};

// ============================================
// TIMER
// ============================================

function startTimer() {
    timerSeconds = 40;
    updateTimerDisplay();

    timer = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();

        if (timerSeconds <= 0) {
            stopTimer();
            timerSeconds = 0;
            updateTimerDisplay();

            // Afficher le bouton approprié même si personne n'a répondu
            if (currentQuestion && (currentQuestion.type === 'QCM' || currentQuestion.type === 'VraiFaux')) {
                document.getElementById('revealResultsBtn').style.display = 'block';
            } else {
                document.getElementById('showLeaderboardBtn').style.display = 'block';
            }
        }
    }, 1000);
}

function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

function updateTimerDisplay() {
    document.getElementById('timer').textContent = timerSeconds;
}

// ============================================
// RÉVÉLATION DES RÉSULTATS
// ============================================

function revealResults() {
    // Arrêter le timer du host
    stopTimer();

    // Envoyer la révélation des résultats (arrête les timers des players et affiche les résultats)
    socket.emit('host:revealResults', { gameCode });

    // Cacher le bouton "Révéler les résultats"
    document.getElementById('revealResultsBtn').style.display = 'none';

    // Afficher le bouton "Afficher le classement"
    document.getElementById('showLeaderboardBtn').style.display = 'block';

    console.log('🎭 Résultats révélés, en attente de l\'affichage du classement');
}

// ============================================
// CLASSEMENT
// ============================================

function showLeaderboard() {
    socket.emit('host:showLeaderboard', { gameCode });
    showScreen('leaderboard');
}

socket.on('game:leaderboard', ({ leaderboard, currentQuestion, totalQuestions, isFinished }) => {
    displayLeaderboard(leaderboard);

    // Mettre à jour le panneau d'informations avec les scores rafraîchis
    const mergedPlayers = mergeLeaderboardWithPlayers(leaderboard);
    currentPlayers = mergedPlayers; // Sauvegarder l'état mis à jour
    updateGameInfoPanel(mergedPlayers);

    const nextBtn = document.getElementById('nextQuestionBtn');

    if (isFinished) {
        // Cas où la partie est déjà marquée comme terminée par le serveur
        nextBtn.style.display = 'none';
    } else {
        // Partie en cours
        nextBtn.style.display = 'block';


        // Vérifier si c'est la dernière question
        // currentQuestion est l'index (0-based) de la question qui vient d'être jouée
        if (currentQuestion + 1 >= totalQuestions) {
            nextBtn.innerHTML = '<i class="ph ph-trophy"></i> Voir le classement général';
            nextBtn.classList.remove('btn-primary');
            nextBtn.classList.add('btn-success'); // Optionnel : changer la couleur pour marquer la fin
        } else {
            nextBtn.textContent = 'Question suivante';
            nextBtn.classList.add('btn-primary');
            nextBtn.classList.remove('btn-success');
        }
    }
});

function displayLeaderboard(leaderboard) {
    const container = document.getElementById('leaderboardContent');

    container.innerHTML = leaderboard.map(player => {
        const rankClass = `rank-${player.rank}`;
        const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
        const medal = medals[player.rank] || '';

        return `
            <div class="leaderboard-item ${rankClass}">
                <div class="leaderboard-rank">${medal || player.rank}</div>
                <div class="leaderboard-name">${player.name}</div>
                <div class="leaderboard-score">${player.score} pts</div>
            </div>
        `;
    }).join('');
}

// ============================================
// QUESTION SUIVANTE
// ============================================

function nextQuestion() {
    console.log('📤 HOST: Demande de question suivante pour partie', gameCode);
    socket.emit('host:nextQuestion', { gameCode });
}

// ============================================
// TERMINER LA PARTIE MANUELLEMENT
// ============================================

function interruptGame() {
    console.log('Tentative d\'interruption de partie');

    if (!gameCode) {
        alert("Erreur : Aucun code de partie actif. Impossible d'interrompre la partie.");
        return;
    }

    const confirmation = confirm(
        "Êtes-vous sûr de vouloir interrompre la partie maintenant ?\n\n" +
        "La progression sera sauvegardée.\n\n" +
        "💡 Vous pourrez reprendre cette partie plus tard via le bouton '🔄 Reprendre une partie'."
    );

    if (confirmation) {
        console.log('Interruption confirmée pour:', gameCode);
        // Arrêter le timer s'il est en cours
        stopTimer();

        // Envoyer la commande au serveur avec callback pour confirmer la réception
        socket.emit('host:endGame', { gameCode }, (response) => {
            console.log('Réponse du serveur:', response);
            if (response && response.success) {
                alert("Partie interrompue et sauvegardée.");
                window.location.reload();
            } else {
                alert("Erreur lors de l'interruption de la partie.");
            }
        });

        // Timeout de secours si le serveur ne répond pas
        setTimeout(() => {
            console.log('Timeout - rechargement de la page');
            window.location.reload();
        }, 3000);
    }
}

// ============================================
// FIN DE PARTIE
// ============================================

function displayFinalLeaderboard(leaderboard) {
    const container = document.getElementById('finalLeaderboard');

    container.innerHTML = leaderboard.map(player => {
        const rankClass = `rank-${player.rank}`;
        const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
        const medal = medals[player.rank] || '';

        return `
            <div class="leaderboard-item ${rankClass}">
                <div class="leaderboard-rank">${medal || player.rank}</div>
                <div class="leaderboard-name">${player.name}</div>
                <div class="leaderboard-score">${player.score} pts</div>
            </div>
        `;
    }).join('');
}

// ============================================
// HISTORIQUE DES QUESTIONS
// ============================================

function viewHistory() {
    // Sauvegarder l'état actuel de la partie
    const currentScreen = Object.keys(screens).find(key =>
        screens[key].classList.contains('active')
    );

    // Sauvegarder si le timer était actif avant d'arrêter
    const timerWasActive = timer !== null;

    savedGameState = {
        screen: currentScreen,
        currentQuestion: currentQuestion,
        timerSeconds: timerSeconds,
        timerWasActive: timerWasActive
    };

    console.log('État sauvegardé:', savedGameState);

    // Arrêter le timer pendant la consultation de l'historique
    if (timerWasActive) {
        stopTimer();
    }

    // Demander l'historique au serveur
    socket.emit('host:getQuestionsHistory', { gameCode });
    showScreen('history');
}

socket.on('host:questionsHistory', ({ history }) => {
    displayHistoryList(history);
});

function displayHistoryList(history) {
    const container = document.getElementById('historyList');

    if (history.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune question dans l\'historique.</p>';
        return;
    }

    container.innerHTML = history.map(item => `
        <div class="history-item" onclick="viewQuestionDetails(${item.questionIndex})">
            <div class="history-item-header">
                <span class="history-question-number">
                    <i class="ph ph-question"></i> Question ${item.questionNumber}
                </span>
                <span class="history-responses-count">
                    <i class="ph ph-users"></i> ${item.responsesCount} réponses
                </span>
            </div>
            <div class="history-question-text">${item.question.question}</div>
            <div class="history-item-footer">
                <span class="click-hint">
                    <i class="ph ph-pencil-simple"></i> Cliquer pour voir et corriger
                </span>
                <span class="history-arrow"><i class="ph ph-caret-right"></i></span>
            </div>
        </div>
    `).join('');
}

window.viewQuestionDetails = function (questionIndex) {
    currentHistoryQuestionIndex = questionIndex;
    socket.emit('host:getHistoricalQuestion', { gameCode, questionIndex });
};

socket.on('host:historicalQuestionDetails', ({ questionIndex, question, responses }) => {
    displayQuestionDetailsModal(questionIndex, question, responses);
});

function displayQuestionDetailsModal(questionIndex, question, responses) {
    const modal = document.getElementById('questionDetailsModal');
    const title = document.getElementById('modalQuestionTitle');
    const questionText = document.getElementById('modalQuestionText');
    const responsesList = document.getElementById('modalResponsesList');

    title.textContent = `Question ${questionIndex + 1}`;
    questionText.innerHTML = `
        <p><strong>${question.question}</strong></p>
        ${question.type === 'QCM' ? `<p>Type: QCM - Bonne réponse: ${question.bonneReponse}</p>` : ''}
        ${question.type === 'VraiFaux' ? `<p>Type: Vrai/Faux - Bonne réponse: ${question.bonneReponse}</p>` : ''}
        ${question.type === 'Libre' ? `<p>Type: Libre - Référence: ${question.reponseReference}</p>` : ''}
    `;

    responsesList.innerHTML = responses.map(r => {
        let statusClass = r.validated ? 'correct' : 'incorrect';
        let statusText = r.validated ? '✅ Validée' : '❌ Refusée';
        let pointsText = `${r.points} pts`;

        return `
            <div class="response-item-modal ${statusClass}">
                <div class="response-header">
                    <span class="response-player">${r.playerName}</span>
                    <span class="response-time">${(r.time / 1000).toFixed(1)}s</span>
                </div>
                <div class="response-answer">${r.answer}</div>
                <div class="response-footer">
                    <span class="response-status">${statusText} - ${pointsText}</span>
                    <div class="response-actions">
                        ${r.validated ?
                `<button class="btn-modify-answer" onclick="modifyAnswer(${questionIndex}, '${r.playerId}', false)">❌ Refuser</button>` :
                `<button class="btn-modify-answer" onclick="modifyAnswer(${questionIndex}, '${r.playerId}', true)">✅ Valider</button>`
            }
                    </div>
                </div>
            </div>
        `;
    }).join('');

    modal.style.display = 'flex';
}

window.modifyAnswer = function (questionIndex, playerId, newValidation) {
    socket.emit('host:modifyHistoricalAnswer', { gameCode, questionIndex, playerId, newValidation });
};

socket.on('host:leaderboardUpdated', ({ leaderboard }) => {
    // Mettre à jour le classement affiché
    displayLeaderboard(leaderboard);

    // Mettre à jour le panneau d'informations (sidebar) avec les scores rafraîchis
    const mergedPlayers = mergeLeaderboardWithPlayers(leaderboard);
    currentPlayers = mergedPlayers;
    updateGameInfoPanel(mergedPlayers);
});

function closeQuestionModal() {
    document.getElementById('questionDetailsModal').style.display = 'none';
}

function restoreGameState() {
    if (!savedGameState) {
        // Aucun état sauvegardé, retour au classement par défaut
        showScreen('leaderboard');
        return;
    }

    console.log('Restauration de l\'état:', savedGameState);

    // Restaurer l'écran
    showScreen(savedGameState.screen);

    // Si on était sur l'écran de question, restaurer le timer
    if (savedGameState.screen === 'question' && savedGameState.currentQuestion) {
        currentQuestion = savedGameState.currentQuestion;
        timerSeconds = savedGameState.timerSeconds;
        updateTimerDisplay();

        // Redémarrer le timer s'il était actif et qu'il reste du temps
        if (savedGameState.timerWasActive && timerSeconds > 0) {
            resumeTimer();
        }
    }

    // Réinitialiser l'état sauvegardé
    savedGameState = null;
}

// Reprendre le timer avec les secondes restantes (sans réinitialiser à 40)
function resumeTimer() {
    if (timer) return; // Ne pas démarrer si déjà actif

    timer = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();

        if (timerSeconds <= 0) {
            stopTimer();
            timerSeconds = 0;
            updateTimerDisplay();

            // Afficher le bouton approprié même si personne n'a répondu
            if (currentQuestion && (currentQuestion.type === 'QCM' || currentQuestion.type === 'VraiFaux')) {
                document.getElementById('revealResultsBtn').style.display = 'block';
            } else {
                document.getElementById('showLeaderboardBtn').style.display = 'block';
            }
        }
    }, 1000);
}

// ============================================
// RESTAURATION DE PARTIE
// ============================================

async function showRestoreGameScreen() {
    showScreen('restore');
    const message = document.getElementById('restoreGameMessage');
    const container = document.getElementById('activeGamesList');

    message.textContent = 'Chargement des parties actives...';
    container.innerHTML = '';

    try {
        const response = await fetch('/api/games/active');
        // Inverser l'ordre pour avoir les plus récentes en premier
        const activeGames = (await response.json()).reverse();

        if (activeGames.length === 0) {
            message.textContent = 'Aucune partie en cours à restaurer.';
            return;
        }

        message.textContent = `${activeGames.length} partie(s) trouvée(s) :`;

        container.innerHTML = activeGames.map(game => {
            const statusText = {
                'waiting': 'En attente',
                'playing': 'En cours',
                'finished': 'Terminée'
            }[game.status] || game.status;

            // Formater la liste des joueurs avec leurs scores
            let playersInfo = '';
            if (game.players && game.players.length > 0) {
                // Trier les joueurs par score décroissant
                const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);

                playersInfo = `
                    <div class="game-players-list">
                        <strong>Participants :</strong><br>
                        ${sortedPlayers.map(p => {
                    const connectedIcon = p.connected ? '🟢' : '🔴';
                    return `<span class="player-score-item">${connectedIcon} ${p.name} (${p.score} pts)</span>`;
                }).join(', ')}
                    </div>
                `;
            } else {
                playersInfo = `<div class="game-players-list"><em>Aucun participant</em></div>`;
            }

            return `
                <div class="active-game-item" data-code="${game.gameCode}">
                    <div class="game-item-header">
                        <strong>Code: ${game.gameCode}</strong>
                        <span class="game-status status-${game.status}">${statusText}</span>
                    </div>
                    <div class="game-item-info">
                        <span>👥 ${game.playersCount} joueur(s)</span>
                        <span>❓ Question ${game.currentQuestion} / ${game.totalQuestions}</span>
                    </div>
                    ${playersInfo}
                </div>
            `;
        }).join('');

        // Ajouter les écouteurs d'événements sur les éléments créés
        document.querySelectorAll('.active-game-item').forEach(item => {
            item.addEventListener('click', () => {
                const gameCode = item.dataset.code;
                restoreGame(gameCode);
            });
        });

    } catch (error) {
        console.error('Erreur:', error);
        message.textContent = 'Erreur lors du chargement des parties.';
    }
}

// Gestionnaire pour le bouton "Reprendre une partie"
document.getElementById('restoreGameBtn').addEventListener('click', showRestoreGameScreen);

// Gestionnaire pour le bouton "Retour" de l'écran de restauration
document.getElementById('backFromRestore').addEventListener('click', () => {
    showScreen('setup');
});

function restoreGame(restoredGameCode) {
    console.log('Restauration de la partie:', restoredGameCode);

    socket.emit('host:reconnectGame', { gameCode: restoredGameCode }, (response) => {
        if (response.success) {
            const gameInfo = response.gameInfo;
            gameCode = restoredGameCode;
            document.getElementById('gameCode').textContent = gameCode;
            showGameInfoPanel(gameCode);

            // Restaurer l'état local
            currentQuestion = gameInfo.currentQuestionIndex;
            totalQuestions = gameInfo.totalQuestions;

            // Mettre à jour l'affichage selon l'état
            if (gameInfo.status === 'waiting') {
                showScreen('waitingScreen');
                updatePlayersList(gameInfo.players);
            } else if (gameInfo.status === 'playing') {
                // Si une question est en cours
                // Note: Idéalement, le serveur devrait nous dire exactement où on en est
                // Pour l'instant, on suppose qu'on va au classement ou à la question suivante
                showScreen('leaderboard');

                // Demander le classement actuel
                socket.emit('host:showLeaderboard', { gameCode });
            } else if (gameInfo.status === 'finished') {
                // Partie terminée
                showScreen('finished');
            }

            alert(`Reconnexion réussie à la partie ${gameCode} !\n${gameInfo.players.length} joueur(s) présent(s).`);
        } else {
            alert('Erreur : ' + response.message);
        }
    });
};

// Événement lorsque le maître se reconnecte
socket.on('game:hostReconnected', () => {
    console.log('Le maître du jeu s\'est reconnecté');
});

// ============================================
// GESTION DES ERREURS
// ============================================

socket.on('connect_error', (error) => {
    console.error('Erreur de connexion:', error);
    alert('Impossible de se connecter au serveur');
});

socket.on('error', (error) => {
    console.error('Erreur:', error);
    alert('Une erreur est survenue');
});
