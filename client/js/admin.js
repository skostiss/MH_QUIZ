// Variables globales
let questions = [];
let manches = {};
let selectedQuestions = new Set();
let currentMancheFilter = 'all'; // Filtre par manche

// Charger les données au démarrage
document.addEventListener('DOMContentLoaded', () => {
    loadManches();
    loadQuestions();
    populateMancheSelect();
});

// Charger les manches
async function loadManches() {
    try {
        const response = await fetch('/api/manches');
        manches = await response.json();
        console.log('Manches chargées:', manches);
        displayMancheFilters();
        updateMancheStats();
        populateMancheSelect();
    } catch (error) {
        console.error('Erreur lors du chargement des manches:', error);
    }
}

// Peupler le select de manches dans le formulaire d'ajout
function populateMancheSelect() {
    const select = document.getElementById('questionManche');
    if (!select) return;

    // Garder l'option par défaut
    let html = '<option value="">Sélectionnez une manche</option>';

    // Ajouter chaque manche
    Object.values(manches).forEach(manche => {
        html += `<option value="${manche.id}">🎯 ${manche.nom}</option>`;
    });

    select.innerHTML = html;
}

// Charger les questions depuis le serveur
async function loadQuestions() {
    try {
        const response = await fetch('/api/questions');
        questions = await response.json();
        updateStats();
        displayQuestions();
    } catch (error) {
        showAlert('Erreur lors du chargement des questions', 'error');
    }
}

// Afficher les filtres par manche
function displayMancheFilters() {
    const container = document.getElementById('mancheFilters');
    if (!container) return;

    let html = `
        <button class="manche-filter ${currentMancheFilter === 'all' ? 'active' : ''}" onclick="filterByManche('all')">
            📚 Toutes les questions
        </button>
    `;

    Object.values(manches).forEach(manche => {
        const count = questions.filter(q => q.manche === manche.id).length;
        html += `
            <button class="manche-filter ${currentMancheFilter === manche.id ? 'active' : ''}"
                    onclick="filterByManche(${manche.id})">
                🎯 ${manche.nom} (${count})
            </button>
        `;
    });

    container.innerHTML = html;
    displayMancheSelectionCheckboxes();
}

// Afficher les cases à cocher de sélection par manche
function displayMancheSelectionCheckboxes() {
    const container = document.getElementById('mancheSelectionContainer');
    if (!container) return;

    let html = '';

    Object.values(manches).forEach(manche => {
        const mancheQuestions = questions.filter(q => q.manche === manche.id);
        const mancheSelectedCount = mancheQuestions.filter(q => selectedQuestions.has(q.id)).length;
        const allSelected = mancheQuestions.length > 0 && mancheSelectedCount === mancheQuestions.length;
        const someSelected = mancheSelectedCount > 0 && mancheSelectedCount < mancheQuestions.length;

        html += `
            <label style="flex: 1; min-width: 200px;">
                <input type="checkbox"
                       id="selectManche${manche.id}"
                       ${allSelected ? 'checked' : ''}
                       ${someSelected ? 'class="indeterminate"' : ''}
                       onchange="toggleSelectManche(${manche.id})"
                       ${mancheQuestions.length === 0 ? 'disabled' : ''}>
                <span>🎯 ${manche.nom} (${mancheQuestions.length})</span>
            </label>
        `;
    });

    container.innerHTML = html;

    // Appliquer l'état indéterminé aux checkboxes
    Object.values(manches).forEach(manche => {
        const checkbox = document.getElementById(`selectManche${manche.id}`);
        if (checkbox) {
            const mancheQuestions = questions.filter(q => q.manche === manche.id);
            const mancheSelectedCount = mancheQuestions.filter(q => selectedQuestions.has(q.id)).length;
            const someSelected = mancheSelectedCount > 0 && mancheSelectedCount < mancheQuestions.length;
            checkbox.indeterminate = someSelected;
        }
    });
}

// Filtrer par manche
function filterByManche(mancheId) {
    currentMancheFilter = mancheId;
    displayMancheFilters();
    displayQuestions();
}

// Mettre à jour les statistiques globales
function updateStats() {
    document.getElementById('totalQuestions').textContent = questions.length;
    document.getElementById('qcmCount').textContent = questions.filter(q => q.type === 'QCM').length;
    document.getElementById('vraiFauxCount').textContent = questions.filter(q => q.type === 'VraiFaux').length;
    document.getElementById('libreCount').textContent = questions.filter(q => q.type === 'Libre').length;
    updateMancheStats();
}

// Mettre à jour les statistiques par manche
function updateMancheStats() {
    Object.values(manches).forEach(manche => {
        const count = questions.filter(q => q.manche === manche.id).length;
        const element = document.getElementById(`manche${manche.id}Count`);
        if (element) {
            element.textContent = count;
        }
    });
}

// Afficher la liste des questions (groupées par manche)
function displayQuestions() {
    const container = document.getElementById('questionsList');
    
    if (questions.length === 0) {
        container.innerHTML = '<p>Aucune question pour le moment. Commencez par en ajouter une !</p>';
        return;
    }
    
    let html = '';
    
    // Filtrer les questions selon la manche sélectionnée
    const filteredQuestions = currentMancheFilter === 'all' 
        ? questions 
        : questions.filter(q => q.manche === currentMancheFilter);
    
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
        
        html += `
            <div class="manche-section">
                <h3 class="manche-title">🎯 ${manche.nom} <span class="manche-count">(${mancheQuestions.length} questions)</span></h3>
                <div class="manche-questions">
        `;
        
        mancheQuestions.forEach((q, localIndex) => {
            const globalIndex = questions.findIndex(question => question.id === q.id);
            html += `
                <div class="question-item ${selectedQuestions.has(q.id) ? 'selected' : ''}" draggable="true" data-id="${q.id}" data-index="${globalIndex}">
                    <div class="question-item-content">
                        <input type="checkbox" class="question-checkbox" ${selectedQuestions.has(q.id) ? 'checked' : ''} onchange="toggleQuestionSelection(${q.id})">
                        <span class="drag-handle">☰</span>
                        <span class="question-order">#${q.id}</span>
                        
                        <div class="reorder-buttons">
                            <button class="btn-reorder" onclick="moveQuestion(${globalIndex}, 'top')" ${globalIndex === 0 ? 'disabled' : ''} title="Monter tout en haut">⇈</button>
                            <button class="btn-reorder" onclick="moveQuestion(${globalIndex}, 'up')" ${globalIndex === 0 ? 'disabled' : ''} title="Monter d'une position">↑</button>
                            <button class="btn-reorder" onclick="moveQuestion(${globalIndex}, 'down')" ${globalIndex === questions.length - 1 ? 'disabled' : ''} title="Descendre d'une position">↓</button>
                            <button class="btn-reorder" onclick="moveQuestion(${globalIndex}, 'bottom')" ${globalIndex === questions.length - 1 ? 'disabled' : ''} title="Descendre tout en bas">⇊</button>
                        </div>
                        
                        <div style="flex: 1;">
                            <div class="question-item-header">
                                <div>
                                    <span class="question-type-badge">${q.type}</span>
                                    <span class="manche-badge">Manche ${mancheId}</span>
                                    <h3>${q.question}</h3>
                                    ${q.type === 'QCM' ? `<p><strong>Choix:</strong> ${q.choix.join(' | ')}<br><strong>Réponse:</strong> ${q.bonneReponse}</p>` : ''}
                                    ${q.type === 'VraiFaux' ? `<p><strong>Réponse:</strong> ${q.bonneReponse}</p>` : ''}
                                    ${q.type === 'Libre' ? `<p><strong>Réponse attendue:</strong> ${q.reponseReference}</p>` : ''}
                                </div>
                                <div class="question-actions">
                                    <button class="btn-icon btn-edit" onclick="editQuestion(${q.id})">✏️ Modifier</button>
                                    <button class="btn-icon btn-delete" onclick="deleteQuestion(${q.id})">🗑️ Supprimer</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    updateSelectionUI();
    initDragAndDrop();
}

// Changer d'onglet
function switchTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(section => section.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// Alterner les champs selon le type
function toggleFields(prefix) {
    const type = document.getElementById(prefix === 'add' ? 'questionType' : 'editQuestionType').value;
    const qcm = document.getElementById(`${prefix}QcmFields`);
    const vraiFaux = document.getElementById(`${prefix}VraiFauxFields`);
    const libre = document.getElementById(`${prefix}LibreFields`);
    
    qcm.classList.remove('active');
    vraiFaux.classList.remove('active');
    libre.classList.remove('active');
    
    if (type === 'QCM') qcm.classList.add('active');
    else if (type === 'VraiFaux') vraiFaux.classList.add('active');
    else if (type === 'Libre') libre.classList.add('active');
}

// Ajouter une question
async function addQuestion(event) {
    event.preventDefault();

    const manche = parseInt(document.getElementById('questionManche').value);
    const type = document.getElementById('questionType').value;
    const question = document.getElementById('questionText').value;

    if (!manche) {
        showAlert('Veuillez sélectionner une manche', 'error');
        return;
    }

    const newQuestion = { manche, type, question };
    
    if (type === 'QCM') {
        const choixA = document.getElementById('choixA').value;
        const choixB = document.getElementById('choixB').value;
        const choixC = document.getElementById('choixC').value;
        const choixD = document.getElementById('choixD').value;
        const bonneReponse = document.querySelector('input[name="correctAnswer"]:checked')?.value;
        
        if (!choixA || !choixB || !choixC || !choixD || !bonneReponse) {
            showAlert('Veuillez remplir tous les choix et sélectionner la bonne réponse', 'error');
            return;
        }
        
        newQuestion.choix = [choixA, choixB, choixC, choixD];
        newQuestion.bonneReponse = bonneReponse;
    } else if (type === 'VraiFaux') {
        const bonneReponse = document.querySelector('input[name="vraiFauxAnswer"]:checked')?.value;
        if (!bonneReponse) {
            showAlert('Veuillez sélectionner la bonne réponse', 'error');
            return;
        }
        newQuestion.bonneReponse = bonneReponse;
    } else if (type === 'Libre') {
        const reponseReference = document.getElementById('reponseReference').value;
        if (!reponseReference) {
            showAlert('Veuillez entrer la réponse de référence', 'error');
            return;
        }
        newQuestion.reponseReference = reponseReference;
    }
    
    try {
        const response = await fetch('/api/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newQuestion)
        });
        
        if (response.ok) {
            const data = await response.json();
            showAlert(`Question ajoutée avec succès dans la manche "${manches[data.question.manche]?.nom}" !`, 'success');
            document.getElementById('addQuestionForm').reset();
            toggleFields('add');
            loadQuestions();
            switchTab('list');
        } else {
            showAlert('Erreur lors de l\'ajout de la question', 'error');
        }
    } catch (error) {
        showAlert('Erreur de connexion au serveur', 'error');
    }
}

// Éditer une question
function editQuestion(id) {
    const question = questions.find(q => q.id === id);
    if (!question) return;
    
    document.getElementById('editQuestionId').value = question.id;
    document.getElementById('editQuestionType').value = question.type;
    document.getElementById('editQuestionText').value = question.question;
    
    // Afficher la manche en lecture seule
    const mancheInfo = manches[question.manche];
    document.getElementById('editMancheInfo').textContent = `Manche: ${mancheInfo?.nom || 'Inconnue'}`;
    
    toggleFields('edit');
    
    if (question.type === 'QCM') {
        document.getElementById('editChoixA').value = question.choix[0];
        document.getElementById('editChoixB').value = question.choix[1];
        document.getElementById('editChoixC').value = question.choix[2];
        document.getElementById('editChoixD').value = question.choix[3];
        document.querySelector(`input[name="editCorrectAnswer"][value="${question.bonneReponse}"]`).checked = true;
    } else if (question.type === 'VraiFaux') {
        document.querySelector(`input[name="editVraiFauxAnswer"][value="${question.bonneReponse}"]`).checked = true;
    } else if (question.type === 'Libre') {
        document.getElementById('editReponseReference').value = question.reponseReference;
    }
    
    document.getElementById('editModal').classList.add('active');
}

// Sauvegarder les modifications
async function saveEdit(event) {
    event.preventDefault();
    
    const id = parseInt(document.getElementById('editQuestionId').value);
    const type = document.getElementById('editQuestionType').value;
    const question = document.getElementById('editQuestionText').value;
    
    const updatedQuestion = { id, type, question };
    
    if (type === 'QCM') {
        updatedQuestion.choix = [
            document.getElementById('editChoixA').value,
            document.getElementById('editChoixB').value,
            document.getElementById('editChoixC').value,
            document.getElementById('editChoixD').value
        ];
        updatedQuestion.bonneReponse = document.querySelector('input[name="editCorrectAnswer"]:checked')?.value;
    } else if (type === 'VraiFaux') {
        updatedQuestion.bonneReponse = document.querySelector('input[name="editVraiFauxAnswer"]:checked')?.value;
    } else if (type === 'Libre') {
        updatedQuestion.reponseReference = document.getElementById('editReponseReference').value;
    }
    
    try {
        const response = await fetch(`/api/questions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedQuestion)
        });
        
        if (response.ok) {
            showAlert('Question modifiée avec succès !', 'success');
            closeEditModal();
            loadQuestions();
        } else {
            showAlert('Erreur lors de la modification', 'error');
        }
    } catch (error) {
        showAlert('Erreur de connexion au serveur', 'error');
    }
}

// Supprimer une question
async function deleteQuestion(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette question ?')) return;
    
    try {
        const response = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            showAlert('Question supprimée avec succès !', 'success');
            loadQuestions();
        } else {
            showAlert('Erreur lors de la suppression', 'error');
        }
    } catch (error) {
        showAlert('Erreur de connexion au serveur', 'error');
    }
}

// Fermer le modal
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
}

// Afficher une alerte
function showAlert(message, type) {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    container.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}

// Export JSON
function exportJSON() {
    const dataStr = JSON.stringify(questions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    downloadFile(blob, 'questions.json');
    showAlert('Export JSON réussi !', 'success');
}

// Export CSV
function exportCSV() {
    let csv = 'ID,Manche,Type,Question,Choix A,Choix B,Choix C,Choix D,Bonne Réponse\n';
    questions.forEach(q => {
        const mancheNom = manches[q.manche]?.nom || '';
        const row = [
            q.id,
            `"${mancheNom}"`,
            q.type,
            `"${q.question.replace(/"/g, '""')}"`,
            q.type === 'QCM' ? `"${q.choix[0]}"` : '',
            q.type === 'QCM' ? `"${q.choix[1]}"` : '',
            q.type === 'QCM' ? `"${q.choix[2]}"` : '',
            q.type === 'QCM' ? `"${q.choix[3]}"` : '',
            q.bonneReponse || q.reponseReference || ''
        ];
        csv += row.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadFile(blob, 'questions.csv');
    showAlert('Export CSV réussi !', 'success');
}

// Import JSON
async function importJSON() {
    const file = document.getElementById('importFile').files[0];
    if (!file) {
        showAlert('Veuillez sélectionner un fichier', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedQuestions = JSON.parse(e.target.result);
            const response = await fetch('/api/questions/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(importedQuestions)
            });
            
            if (response.ok) {
                showAlert('Import réussi !', 'success');
                loadQuestions();
            } else {
                showAlert('Erreur lors de l\'import', 'error');
            }
        } catch (error) {
            showAlert('Fichier JSON invalide', 'error');
        }
    };
    reader.readAsText(file);
}

// Télécharger un fichier
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ========== DRAG & DROP ==========
let draggedElement = null;

function initDragAndDrop() {
    const items = document.querySelectorAll('.question-item');
    
    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragleave', handleDragLeave);
    });
}

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.question-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    if (this !== draggedElement) {
        this.classList.add('drag-over');
    }
    
    return false;
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedElement !== this) {
        const draggedIndex = parseInt(draggedElement.dataset.index);
        const targetIndex = parseInt(this.dataset.index);
        
        const draggedQuestion = questions[draggedIndex];
        questions.splice(draggedIndex, 1);
        questions.splice(targetIndex, 0, draggedQuestion);
        
        saveQuestionOrder();
        displayQuestions();
    }
    
    return false;
}

// Sauvegarder le nouvel ordre des questions
async function saveQuestionOrder() {
    try {
        const response = await fetch('/api/questions/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questions)
        });
        
        if (response.ok) {
            showAlert('Ordre des questions sauvegardé !', 'success');
            loadQuestions(); // Recharger pour mettre à jour les manches
        } else {
            showAlert('Erreur lors de la sauvegarde de l\'ordre', 'error');
        }
    } catch (error) {
        showAlert('Erreur de connexion au serveur', 'error');
    }
}

// ========== SÉLECTION MULTIPLE ==========

function toggleQuestionSelection(id) {
    if (selectedQuestions.has(id)) {
        selectedQuestions.delete(id);
    } else {
        selectedQuestions.add(id);
    }
    updateSelectionUI();
    displayQuestions();
}

function toggleSelectAll() {
    const checkbox = document.getElementById('selectAllCheckbox');

    if (checkbox.checked) {
        questions.forEach(q => selectedQuestions.add(q.id));
    } else {
        selectedQuestions.clear();
    }

    updateSelectionUI();
    displayQuestions();
}

function toggleSelectManche(mancheId) {
    const mancheQuestions = questions.filter(q => q.manche === mancheId);
    const checkbox = document.getElementById(`selectManche${mancheId}`);

    if (checkbox.checked) {
        // Sélectionner toutes les questions de cette manche
        mancheQuestions.forEach(q => selectedQuestions.add(q.id));
    } else {
        // Désélectionner toutes les questions de cette manche
        mancheQuestions.forEach(q => selectedQuestions.delete(q.id));
    }

    updateSelectionUI();
    displayQuestions();
}

function updateSelectionUI() {
    const count = selectedQuestions.size;
    const bulkActions = document.getElementById('bulkActions');
    const selectedCountSpan = document.getElementById('selectedCount');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');

    selectedCountSpan.textContent = count;

    if (count > 0) {
        bulkActions.classList.add('active');
    } else {
        bulkActions.classList.remove('active');
    }

    if (count === questions.length && questions.length > 0) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else if (count > 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }

    // Mettre à jour les cases à cocher par manche
    displayMancheSelectionCheckboxes();
}

function clearSelection() {
    selectedQuestions.clear();
    updateSelectionUI();
    displayQuestions();
}

async function deleteSelected() {
    if (selectedQuestions.size === 0) return;
    
    const count = selectedQuestions.size;
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${count} question(s) ?`)) return;
    
    try {
        const deletePromises = Array.from(selectedQuestions).map(id => 
            fetch(`/api/questions/${id}`, { method: 'DELETE' })
        );
        
        await Promise.all(deletePromises);
        
        showAlert(`${count} question(s) supprimée(s) avec succès !`, 'success');
        selectedQuestions.clear();
        loadQuestions();
    } catch (error) {
        showAlert('Erreur lors de la suppression', 'error');
    }
}

// ========== RÉORGANISATION AVEC BOUTONS ==========

function moveQuestion(currentIndex, direction) {
    let newIndex = currentIndex;
    
    switch(direction) {
        case 'up':
            newIndex = currentIndex - 1;
            break;
        case 'down':
            newIndex = currentIndex + 1;
            break;
        case 'top':
            newIndex = 0;
            break;
        case 'bottom':
            newIndex = questions.length - 1;
            break;
    }
    
    if (newIndex < 0 || newIndex >= questions.length) return;
    if (newIndex === currentIndex) return;
    
    const question = questions[currentIndex];
    questions.splice(currentIndex, 1);
    questions.splice(newIndex, 0, question);
    
    saveQuestionOrder();
    displayQuestions();
}
