# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Malakoff Quiz is a real-time multiplayer quiz application built with Node.js, Express, and Socket.io. The application supports three roles: game host (maître du jeu), players, and administrators. It features live WebSocket communication for synchronized gameplay across multiple clients.

## Development Commands

### Start the server
```bash
npm start
# or
node server.js
```

### Start with auto-reload (development)
```bash
npm run dev
# Uses nodemon for automatic server restart on file changes
```

### Access the application
- Main page: http://localhost:3000
- Host interface: http://localhost:3000/host
- Player interface: http://localhost:3000/player
- Admin interface: http://localhost:3000/admin

## Architecture

### Server Architecture (server.js)

The server handles four main responsibilities:
1. **HTTP Routes**: Serves static HTML pages for different user roles
2. **REST API**: Manages question CRUD operations via `/api/questions` and `/api/manches` endpoints, and game restoration via `/api/games/active`
3. **WebSocket Events**: Orchestrates real-time game flow through Socket.io
4. **Persistence**: Automatic game state saving and crash recovery (limited to 2 most recent games)

Key WebSocket events:
- `host:createGame`: Host creates a new game, receives 4-digit code; questions organized by custom manche order with Fisher-Yates shuffle within each manche
- `host:reconnectGame`: Host reconnects to an existing/restored game (returns game state; automatically resets `'finished'` status to `'playing'` to allow resumption)
- `host:endGame`: Host manually interrupts a game, setting status to `'finished'` while preserving game state for later resumption
- `player:joinGame`: Players join using game code and username (supports reconnection by name)
- `host:startGame`: Host initiates gameplay with selected questions
- `host:startQuestion`: Broadcasts current question to all players
- `host:nextQuestion`: Host requests next question; increments `currentQuestionIndex` and triggers `sendNextQuestion()` helper
- `player:answer`: Players submit answers (internally validated for QCM/VraiFaux, manual for Libre)
- `host:validateAnswer`: Host validates free-response answers
- `host:revealResults`: Reveals results to all players (QCM/VraiFaux only, stops timers and shows correct/incorrect)
- `host:showLeaderboard`: Awards points and displays rankings after each question
- `host:getQuestionsHistory`: Retrieves complete history of answered questions
- `host:getHistoricalQuestion`: Gets detailed data for a specific historical question
- `host:modifyHistoricalAnswer`: Retroactively modifies a player's answer validation
- `player:answerFeedback`: Sends feedback to player (only at reveal for QCM/VraiFaux, after validation for Libre)
- `player:answerValidated`: Notifies player when libre answer is validated by host
- `player:answerRecorded`: Confirms answer was recorded (no correctness revealed)
- `player:answerRejected`: Notifies player their answer was rejected (question closed)
- `game:playerAnswered`: Broadcasts to all players when someone answers (no correctness info for suspense)
- `game:playerAnswerValidated`: Broadcasts libre answer validation to all players
- `game:stopTimer`: Stops all player timers (triggered on results reveal)
- `game:resultsRevealed`: Broadcasts all results with correct/incorrect info to all players
- `game:hostReconnected`: Notifies all players when the host reconnects

### Game Logic (gameLogic.js)

The `GameManager` class maintains multiple concurrent game sessions using a Map of game codes to `Game` instances.

Each `Game` instance tracks:
- Host socket ID
- Players (Map of socket.id → player data with scores)
- Selected questions for the session
- Current question index and timer state
- Player responses for the current question
- Questions history (complete record of all answered questions with responses)

**Key Methods**:
- `startQuestion()`: Initializes a new question, clears responses, starts timer, sets `questionClosed` to false
- `closeQuestion()`: Marks the question as closed, no more answers will be accepted
- `isQuestionClosed()`: Returns true if the question is closed to new answers
- `recordResponse(socketId, answer, validated)`: Records a player's answer with optional validation status (true/false for QCM/VraiFaux, null for Libre)
- `calculatePoints(manche)`: Returns points based on manche (2 for M1/M2, 1 for M3/M4, 3 for M5)
- `getResponsesWithPlayers()`: Returns all responses with player info; for QCM/VraiFaux, dynamically calculates potential points for display (finds fastest correct answer and shows points before they are officially awarded)
- `autoValidateResponses()`: Called when host shows leaderboard for QCM/VraiFaux questions, officially awards points to fastest correct player only
- `manualValidate()`: Host validation for libre questions, awards points only to first validated answer
- `saveCurrentQuestionToHistory()`: Saves complete question state (responses, validations) to history, with duplicate prevention
- `getQuestionsHistory()`: Returns array of all historical questions
- `getHistoricalQuestionDetails()`: Retrieves detailed data for a specific historical question
- `modifyHistoricalAnswer()`: Retroactively changes validation status of a player's answer
- `recalculateAllScores()`: Recalculates all player scores from complete history (used after retroactive modifications)
- `endGameManually()`: Manually terminates a game, setting status to `'finished'` and saving current question to history
- `isFinished()`: Returns true only when ALL questions have been answered (`currentQuestionIndex >= selectedQuestions.length`), independent of status. This allows interrupted games (status='finished') to be resumed until completion

**Important**: Questions are dynamically loaded via `loadQuestions()` which clears the require cache to ensure fresh data after admin modifications.

### Question System (questions.js)

Questions are organized into "manches" (rounds). The file exports:
- `MANCHES`: Object mapping manche IDs to metadata (nom, rangeDebut, rangeFin)
- `questions`: Array of question objects

Each question includes:
- `id`: Unique identifier
- `manche`: Associated round (1-4)
- `type`: "QCM", "VraiFaux", or "Libre"
- Type-specific fields:
  - QCM: `choix` (array of 4 options), `bonneReponse` (letter A-D)
  - VraiFaux: `bonneReponse` ("Vrai" or "Faux")
  - Libre: `reponseReference` (reference answer for manual validation)

### Persistence System (persistence.js)

The persistence module handles crash recovery and game state preservation:

**Core Functions**:
- `saveGames(gameManager)`: Serializes active games to `game-saves.json` (limited to 2 most recent games)
- `loadGames(gameManager, Game)`: Deserializes and restores saved games on server startup
- `deleteSavedGame(gameCode)`: Removes a specific game from saves (called only when game fully completes all questions)
- `clearSaves()`: Deletes entire save file

**Save Limitations**:
- `MAX_SAVED_GAMES = 2`: Only the 2 most recent games are saved to prevent memory saturation
- Uses FIFO (First In, First Out) strategy: oldest games are automatically excluded when limit is reached
- Logging indicates when games are excluded: `⚠️ X partie(s) non sauvegardée(s) (dépassement de limite)`

**Automatic Save Triggers**:
- Server startup: Loads all saved games
- Every 30 seconds: Periodic auto-save
- Graceful shutdown: Saves on SIGINT/SIGTERM
- After critical events: Game creation, question configuration, game start, next question, answer validation, historical modifications, player joins
- After disconnections: Host or player disconnection triggers immediate save to preserve game state

**Interrupted Game Handling**:
- Games are preserved in memory and saves if status is `waiting`, `playing`, or `finished` (manually interrupted)
- Games with status `'finished'` are preserved indefinitely in memory and saves, allowing hosts to resume them later
- When host reconnects to a `'finished'` game via `host:reconnectGame`, the status is automatically reset to `'playing'` to allow continuation
- This ensures all interrupted games (crash, disconnection, or manual interruption) can be fully recovered and resumed

**Serialization**: Custom Map↔Object converters handle JavaScript Map objects for JSON compatibility. All game state is preserved including players (with `connected` status), scores, responses, history, and current question state.

### Client Architecture

Three main client applications:
- **host.js**: Manages game creation, custom manche ordering with drag-and-drop, question selection by manche, timer control (40s for QCM/VraiFaux, none for Libre), two-step results reveal, validation of free-response answers, manual game interruption, and historical review with retroactive modifications
  - **Two-Button System for QCM/VraiFaux**:
    - **Reveal Results** (🎭): First button that appears when players answer or timer expires. Stops all timers, reveals correct/incorrect to all players, but does NOT show leaderboard yet
    - **Show Leaderboard** (📊): Second button that appears AFTER reveal. Awards points and displays rankings
    - **For Libre questions**: Only "Show Leaderboard" button (no reveal step needed, manual validation)
  - **Game Restoration**: Button "🔄 Reprendre une partie" displays modal with active games (including manually interrupted ones), shows detailed information (code, status, participants with scores), and allows reconnection to any saved game
  - **Manual Game Interruption**: Button "⏹️ Terminer la partie" available during gameplay allows host to interrupt game at any time
    - Confirmation message informs host that game can be resumed later
    - Game status set to `'finished'` but preserved in memory and saves
    - Current question saved to history before interruption
    - Final leaderboard displayed
    - Game remains accessible via "🔄 Reprendre une partie" for resumption
  - **Question Selection by Manche**: Precise control over number of questions per manche
    - Each manche displays available questions count (e.g., "Manche 1 (8 questions disponibles)")
    - Numeric input allows selecting exact number of questions (0 to total available)
    - Real-time display shows "X/Y questions" (selected vs. available)
    - Questions are randomly selected from available pool for each manche
    - Selection persists across game sessions via game state
  - **History Feature**: View all answered questions, see detailed responses, modify validations retroactively. Questions are saved to history immediately when leaderboard is shown (not when moving to next question)
  - **State Preservation**: Saves and restores exact game state (screen, question, timer) when navigating to/from history
  - **Real-time Visibility**: Host sees correct/incorrect (✅/❌) for QCM/VraiFaux answers immediately, even though players don't
- **player.js**: Handles joining games, answering questions within time limits, viewing results after reveal
  - **Reconnection**: Players can rejoin a game using the same name to restore their score and progress. Works even if the game is in `playing` status
  - **Answer Feedback**: Delayed feedback for QCM/VraiFaux (only revealed when host clicks "Reveal Results"), immediate for Libre after host validation
  - **Opponent Visibility**: Completely hidden during gameplay for maximum suspense. Only visible after host reveals results
  - **Suspense System**: Players see "Réponse enregistrée" confirmation but no correctness info until reveal. No information about opponents answering
  - **Host Disconnection Handling**: When host disconnects, displays warning message "⚠️ Le maître du jeu s'est déconnecté. La partie est en pause." Players remain in the game and can wait for host reconnection instead of being kicked out
- **admin.js**: Provides comprehensive question management interface with:
  - Dashboard with statistics (total, by type, by manche)
  - Question list view with filtering by manche
  - Bulk selection capabilities (select all, select by manche, select individual)
  - Drag-and-drop reordering with visual feedback
  - Add/Edit/Delete operations with manche assignment
  - Import/Export functionality (JSON and CSV formats)

All clients use Socket.io for real-time bidirectional communication with the server.

#### Manche Ordering Feature

**Location**: Host interface (`client/host.html` lines 16-19, `client/js/host.js` lines 17-18, 297-425, `client/css/style.css` lines 821-940)

The host can customize the order in which manches are presented during gameplay. This allows for flexible game design where the traditional progression (Manche 1 → 2 → 3 → 4) can be rearranged to any desired order.

**Key Components**:

1. **State Variables** (`host.js` lines 17-18):
   ```javascript
   let mancheOrder = [1, 2, 3, 4]; // Default order, modifiable by host
   let draggedMancheIndex = null;  // Tracks drag-and-drop state
   ```

2. **UI Control** (`host.html` lines 16-19):
   - Container `#mancheOrderControl` dynamically populated by `displayMancheOrderControl()`
   - Displays reorderable list of manches with drag handles (☰) and arrow buttons
   - Located in setup screen above question selection filters
   - Includes descriptive header and instructions

3. **Reordering Methods** (`host.js`):
   - **Arrow Buttons** (lines 331-343):
     - `moveMancheUp(index)`: Swaps manche with previous position using array destructuring
     - `moveMancheDown(index)`: Swaps manche with next position
     - Buttons automatically disabled at list boundaries (first/last positions)

   - **Drag-and-Drop** (lines 358-425):
     - `initMancheDragAndDrop()`: Attaches HTML5 drag event listeners to all `.manche-order-item[draggable]` elements
     - `handleMancheDragStart()`: Records `draggedMancheIndex`, adds `.dragging` class for visual feedback
     - `handleMancheDragOver()`: Prevents default behavior, adds `.drag-over` class to valid drop zones
     - `handleMancheDragLeave()`: Removes `.drag-over` class when drag leaves element
     - `handleMancheDrop()`: Reorders `mancheOrder` array using `splice()` operations, then re-renders UI
     - Pattern follows admin.js drag-and-drop implementation (lines 510-594)

4. **Question Organization** (`host.js` lines 437-456):
   When creating a game, questions are organized by the custom manche order:
   ```javascript
   mancheOrder.forEach(mancheId => {
     // Get all selected questions from this manche
     const mancheQuestions = allQuestions
       .filter(q => q.manche === mancheId && persistentSelections.has(q.id))
       .map(q => q.id);

     // Shuffle questions within manche using Fisher-Yates
     const shuffled = shuffleArray(mancheQuestions);

     // Add to final array in manche order
     selectedQuestionIds.push(...shuffled);
   });
   ```

5. **Fisher-Yates Shuffle** (`host.js` lines 345-352):
   ```javascript
   function shuffleArray(array) {
     const shuffled = [...array];
     for (let i = shuffled.length - 1; i > 0; i--) {
       const j = Math.floor(Math.random() * (i + 1));
       [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
     }
     return shuffled;
   }
   ```
   - Questions within each manche are randomized for fairness
   - Ensures variety while maintaining manche grouping
   - Preserves the host's custom manche order

6. **CSS Styling** (`style.css` lines 821-940):
   - `.manche-order-container`: Dashed border container with light gray background, consistent with Malakoff Humanis design
   - `.manche-order-item`: White cards with smooth transitions, red border on hover
   - `.drag-handle`: Grabbable hamburger icon (☰) with `cursor: grab`, turns red on hover
   - `.manche-order-item.dragging`: Reduced opacity (0.5) during drag operation
   - `.manche-order-item.drag-over`: Red top border (3px solid) to clearly show drop zone
   - `.manche-order-btn`: Arrow buttons with red hover state, disabled styling for boundaries

**User Flow**:
1. Host opens setup screen and sees "📋 Ordre des manches" section with instructions
2. Can reorder using either method:
   - **Drag-and-drop**: Click and drag hamburger icon (☰) to new position
   - **Arrow buttons**: Click ↑/↓ for precise positioning
3. Order is immediately reflected in the UI with real-time feedback
4. When creating game, selected questions are:
   - Grouped by the custom manche order
   - Shuffled randomly within each manche
   - Presented to players in the resulting sequence

**Technical Notes**:
- Drag-and-drop uses native HTML5 Drag and Drop API (no external libraries)
- Re-initialization of event listeners required after each DOM update
- Array manipulation uses non-mutating patterns (spread operator, splice with copy)
- Consistent with existing admin interface drag-and-drop patterns

### Scoring System

Implemented in `gameLogic.js` and `server.js`:
- **Manche-based scoring**: Points awarded based on the manche (round) of the question
  - Manche 1 & 2: 2 points per correct answer
  - Manche 3 & 4: 1 point per correct answer
  - Manche 5: 3 points per correct answer
- **Winner-takes-all**: Only the fastest player with a correct answer receives points
- **Time limits**:
  - QCM and Vrai/Faux: 40 seconds to respond
  - Libre (free-response): No time limit
- Wrong answers or timeouts receive 0 points

**For QCM and Vrai/Faux questions (Two-Step Reveal System):**
1. **Answer Submission Phase**:
   - Players submit answers within 40 seconds
   - Server validates internally (correct/incorrect) but does NOT send feedback to players
   - Players only see "Réponse enregistrée" (answer recorded) confirmation
   - No information about opponents' answers or activity
   - Host sees real-time validation (✅/❌) for all answers in their interface
2. **Reveal Phase** (Host clicks "🎭 Révéler les résultats"):
   - All timers stop immediately
   - Players see their own result (✅ correct or ❌ incorrect with correct answer shown)
   - Players see all opponents' results and who got it right/wrong
   - No points awarded yet
3. **Leaderboard Phase** (Host clicks "📊 Afficher le classement"):
   - `autoValidateResponses()` awards points to fastest correct player only
   - Question saved to history
   - Leaderboard displayed showing updated scores
   - If fastest responder was wrong, second-fastest correct player gets points
   - Other correct players receive 0 points (not fast enough)

**For Libre (free-response) questions:**
- No timer - players can take as long as needed
- Host manually validates answers one by one
- Responses are displayed sorted by response time (fastest first)
- Only the first validated response receives points
- Subsequent validations mark answers as correct but award 0 points
- Direct to leaderboard (no separate reveal step)

## File Modification Patterns

### Adding/Modifying Questions

**Via Admin Interface** (recommended):
- Use http://localhost:3000/admin
- When adding questions, you must select the target manche (required field in admin form)
- The manche selector is populated dynamically from the `MANCHES` object
- Changes automatically write to `questions.js` with proper formatting
- Server clears require cache to load fresh data immediately

**Bulk operations**:
- Select all questions via the global checkbox
- Select questions by manche using per-manche checkboxes (supports full/partial/empty states)
- Delete multiple questions at once
- Reorder questions via drag-and-drop or arrow buttons

**Manual editing**:
- Edit `questions.js` directly
- Maintain the exported structure: `MANCHES` object and `questions` array
- Each question must have a `manche` field (1-4)
- If `manche` is missing, `getMancheByQuestionId()` assigns it based on ID ranges (legacy behavior)
- Restart server after manual changes

### Modifying Game Logic

When changing game flow or scoring:
1. Update `gameLogic.js` for business logic
2. Update corresponding Socket.io event handlers in `server.js`
3. Update client-side event listeners in relevant `client/js/*.js` files
4. Test with multiple browser windows (one host, multiple players)

### Adding New Question Types

1. Define type in `questions.js` schema
2. Add validation logic in `gameLogic.js` (see `checkAnswer()` method)
3. Update host UI in `client/host.html` and `client/js/host.js`
4. Update player UI in `client/player.html` and `client/js/player.js`
5. Add admin form fields in `client/admin.html` and `client/js/admin.js`

## Testing the Application

Since this is a multiplayer game, test with:
- One browser window for the host
- Multiple incognito/private windows for different players
- Check WebSocket events in browser DevTools Network tab
- Monitor server logs in terminal for real-time debugging

Common test scenario:
1. Open host interface, create game, note the 4-digit code
2. Open 2-3 player windows, join with different names using the code
3. Select questions by manche in host interface
4. Start game and verify question flow, timers, and scoring
5. For "Libre" questions, verify manual validation workflow

Test interrupted game recovery:
1. Create a game and start playing
2. Close the host browser tab (simulate disconnection)
3. Players should see warning message but remain in game
4. Reopen host interface, click "🔄 Reprendre une partie"
5. Select the interrupted game to resume
6. Close a player tab, then rejoin with same name to verify score restoration

Test manual game interruption and resumption:
1. Create a game with players and start playing
2. During gameplay, click "⏹️ Terminer la partie" (on question or leaderboard screen)
3. Confirm the interruption (message mentions game can be resumed later)
4. Verify final leaderboard is displayed with current scores
5. Click "🔄 Reprendre une partie"
6. Verify interrupted game appears in modal with status "Terminée"
7. Verify participant names and scores are displayed
8. Click "🔄 Reprendre" to resume the game
9. Verify game resumes with status automatically changed to "playing"
10. Verify you can continue from where the game was interrupted

## Important Technical Notes

- **Crash Recovery & Game Restoration**: The persistence system automatically saves game state to `game-saves.json` (limited to 2 most recent games). The system handles interrupted games intelligently:
  - **Server crashes**: Restarting automatically restores all saved games with complete state (players, scores, responses, history, current question)
  - **Host disconnection**: Games in status `waiting`, `playing`, or `finished` are preserved in memory and saved automatically. They are NOT deleted when the host disconnects, allowing the host to reconnect later
  - **Player disconnection**: Players are marked as `connected: false` instead of being removed. Their scores and progress are fully preserved, allowing seamless reconnection
  - **Manual interruption**: Host can click "⏹️ Terminer la partie" to interrupt game at any time. Game status set to `'finished'` but preserved in saves for later resumption
  - **Host reconnection**: Hosts use the "🔄 Reprendre une partie" button to view and reconnect to interrupted games. The modal displays detailed information including participant names and scores. The server automatically resets `'finished'` status to `'playing'` to allow resumption
  - **Player reconnection**: Players rejoin using the same username and game code. The system detects existing players by name, transfers their data to the new socket ID, and restores their `connected: true` status
  - **Interrupted games**: A game is considered interrupted if it hasn't completed all selected questions OR if manually interrupted by host. All interrupted games remain saved and recoverable indefinitely (until server restart)
  - **Host disconnection notification**: When the host disconnects, players see a warning message "⚠️ Le maître du jeu s'est déconnecté. La partie est en pause." instead of being kicked out. They can wait for the host to reconnect
  - **Restoration modal**: The `/api/games/active` endpoint returns all saved games with complete details including `gameCode`, `status`, `playersCount`, `players` (with names, scores, and connection status), `currentQuestion`, and `totalQuestions`

- **Retroactive Score Modification**: Hosts can view the complete history of answered questions and modify answer validations retroactively. When a historical answer is modified, all player scores are recalculated from scratch by replaying the entire game history with the new validations. This ensures score consistency.

- **Question Closing System**: After the host displays the leaderboard, questions are automatically closed:
  - `closeQuestion()` is called when host triggers `host:showLeaderboard`
  - Any subsequent answer attempts are rejected with `player:answerRejected` event
  - This prevents late submissions after results have been revealed and points awarded
  - The `questionClosed` flag is reset to `false` when a new question starts

- **Suspense and Reveal System for QCM/Vrai/Faux**: A three-phase system creates maximum suspense:
  1. **Internal Validation (Server-side only)**:
     - Server calculates if answer is correct/incorrect immediately
     - Response recorded with `validated = true/false`
     - **NO feedback sent to players** - they only see "Réponse enregistrée"
     - **NO information broadcast about opponents** - complete suspense
     - **Host sees real-time validation** (✅/❌) in their interface for monitoring
  2. **Reveal Phase** (triggered by `host:revealResults`):
     - Stops all player timers via `game:stopTimer` event
     - Identifies the fastest correct player: `responses.find(r => r.validated === true)`
     - Sends `player:answerFeedback` to each player with their result AND `isFastest` flag
     - Broadcasts `game:resultsRevealed` with all results to show opponents' performance, including `isFastest` flag for each player
     - **Points still not awarded** - this is just the reveal
  3. **Points Attribution** (triggered by `host:showLeaderboard`):
     - Calls `autoValidateResponses()` to award points to fastest correct player
     - Question saved to history immediately
     - Leaderboard broadcast to all players

- **Visual Differentiation of Fastest Player (QCM/Vrai/Faux only)**: Players see different feedback based on speed:
  - **Implementation** (server.js:522-565, player.js:215-236, 270-283, 374-403, style.css:562-709):
    - Server identifies fastest correct player during reveal phase (line 527-528 in server.js)
    - `isFastest` flag sent in both `player:answerFeedback` and `game:resultsRevealed` events
    - Fastest player receives: "✅ Bonne réponse ! ⚡ Vous êtes le plus rapide !" with golden gradient background
    - Other correct players receive: "✅ Bonne réponse, mais pas assez rapide (0 point)" with orange gradient background
    - Incorrect players receive: "❌ Mauvaise réponse" with red background (unchanged)
  - **Visual Styling**:
    - `.answer-feedback.fastest`: Gold gradient (#FFD700 → #FFA500) with dark orange text
    - `.answer-feedback.correct-but-slow`: Light orange gradient (#FFE5CC → #FFCCAA) with orange border
    - `.opponent-item.correct.fastest`: Gold border + light yellow gradient + subtle shadow
    - `.opponent-item.correct-but-slow`: Orange border + light gradient to differentiate from full incorrect
  - **Opponents Display**:
    - Fastest opponent shown as: "⚡✅ Bonne réponse (le plus rapide)" with gold styling
    - Other correct opponents: "✅ Bonne réponse (0 pt)" with orange styling
    - This clearly communicates that only the fastest player receives points
  - **Libre Questions**: No changes - manual validation by host, no speed-based differentiation

- **Permanent Game Info Panel (Host Interface Only)**: A fixed left sidebar displays game information at all times during gameplay:
  - **Implementation** (host.html:10-22, host.js:491-560, style.css:43-188):
    - Fixed left panel (280px wide, full height) with game code and player list
    - Visible on ALL host screens (waiting, question, leaderboard, history, finished)
    - Automatically shown when game is created or reconnected (`showGameInfoPanel(gameCode)`)
  - **Game Code Display**:
    - Large monospace font (2.5em, Courier New) with letter-spacing
    - Red/orange gradient background (Malakoff Humanis colors)
    - Always visible at top of panel
  - **Player Status List**:
    - Each player shows: Connection status (🟢/🔴) + Name + Score
    - Sorted by score (descending)
    - Real-time updates via `game:playersUpdate` (connection status) and `game:leaderboard` (scores)
    - Scrollable list with custom styling
  - **State Management**:
    - `currentPlayers` array maintains complete player state (id, name, score, connected)
    - `mergeLeaderboardWithPlayers()` function fuses leaderboard scores with connection status
    - Updates triggered by both `game:playersUpdate` and `game:leaderboard` events
  - **Visual Styling**:
    - Connected players: Green border-left (#28A745), light green background
    - Disconnected players: Red border-left (#E63946), light red background, reduced opacity
    - CSS class renamed to `.panel-code-display` to avoid conflict with waiting screen's `.game-code-display`
  - **Key Functions** (host.js):
    - `updateGameInfoPanel(players)`: Updates player list and count
    - `showGameInfoPanel(code)`: Displays panel with game code
    - `mergeLeaderboardWithPlayers(leaderboard)`: Merges scores from leaderboard with connection statuses from `currentPlayers`

- **History Immediate Availability**: Questions are saved to history as soon as the leaderboard is displayed:
  - `saveCurrentQuestionToHistory()` called in `host:showLeaderboard` handler
  - Duplicate prevention: checks if question already in history by `questionIndex`
  - This allows host to access history immediately after showing leaderboard
  - Previously, history was only updated when moving to next question

- **Libre Questions Validation**: For free-response questions (no changes from original):
  - Responses are recorded with `validated = null` (pending)
  - Host sees "⏳ En attente" status
  - Host manually validates each answer
  - Only then do players receive feedback
  - No separate reveal step - validation IS the reveal

- **Require Cache Management**: The server explicitly clears the require cache for `questions.js` to enable live updates without restarts. This pattern is used in API routes and game logic.

- **Manche Assignment**: Questions are explicitly assigned to manches via the `manche` field. The admin interface enforces manche selection when creating questions. The server has a fallback function `getMancheByQuestionId(id)` that auto-assigns manches based on ID ranges (1-8→Manche 1, 9-14→Manche 2, etc.), but this is legacy behavior used only when the `manche` field is missing.

- **Admin Selection UI State Management**: The admin interface maintains a `selectedQuestions` Set to track bulk selections. Three types of selection are supported:
  - Global "select all" checkbox (affects all questions)
  - Per-manche checkboxes (affects all questions in a specific manche, shows indeterminate state for partial selection)
  - Individual question checkboxes
  All selection states sync automatically via `updateSelectionUI()` and `displayMancheSelectionCheckboxes()`.

- **Disconnection Handling & Reconnection System**:
  - **Host disconnection** (server.js:767-783): When a host disconnects, games are preserved in memory regardless of status (`waiting`, `playing`, or `finished`). The game is automatically saved and preserved for reconnection. Players are notified with `game:hostDisconnected` event but remain in the game
  - **Player disconnection** (server.js:784-795): When a player disconnects, they are marked as `connected: false` instead of being removed from the game. Their score, progress, and response history are fully preserved. The disconnection triggers an automatic save
  - **Host reconnection** (server.js:376-416): Uses `host:reconnectGame` event. If game status is `'finished'`, it's automatically reset to `'playing'` to allow resumption. The server returns complete game state including `selectedQuestions`, `currentQuestion`, `questionsHistory`, player list, and game status. The host can resume from exactly where the game was interrupted
  - **Manual game interruption and resumption** (server.js:524-548, gameLogic.js:410-414):
    - Uses `host:endGame` event. Sets game status to `'finished'`, saves current question to history, broadcasts final leaderboard to all players, and triggers auto-save
    - Game remains in memory and saves for later resumption
    - **Key improvement**: `isFinished()` now checks `currentQuestionIndex >= selectedQuestions.length` instead of just checking status
    - This allows interrupted games (status='finished') to be resumed and continued until ALL questions are answered
    - When host reconnects to an interrupted game, status changes to 'playing' and gameplay continues from where it was interrupted
    - Only truly finished games (all questions answered) will show "Terminer la partie" button instead of "Question suivante"
  - **Player reconnection** (server.js:589-625): Uses `player:joinGame` with existing username. The system detects the player by name, transfers all data to the new socket ID, restores `connected: true` status, and returns the player's current score. Players can reconnect even if the game is already in `playing` status
  - **Socket ID management**: All response data and game state tied to the old socket ID is transferred to the new socket ID during reconnection, ensuring complete continuity

- **Bug Fix: Host Screen Stuck on Leaderboard**:

  **Issue**: In certain scenarios (particularly after manual game interruption and reconnection), when the host clicked "Question suivante", the next question would successfully display on players' screens but the host's screen remained stuck on the leaderboard.

  **Root Cause** (`server.js` lines 903-915):
  The `sendNextQuestion()` helper function was incorrectly using `io.to(game.host).emit()` to send the `host:newQuestion` event. The problem is that `game.host` contains a socket ID string (e.g., "abc123xyz"), but `io.to()` treats its parameter as a room name. This attempts to emit to a room named after the socket ID, which doesn't exist. The host socket is actually in the room named after the `gameCode` (e.g., "1234"), not in a room named after its own socket ID.

  **The Fix**:
  Changed from room-based emit to direct socket emit:

  ```javascript
  // BEFORE (incorrect):
  io.to(game.host).emit('host:newQuestion', questionForHost);

  // AFTER (correct):
  const hostSocket = io.sockets.sockets.get(game.host);
  if (hostSocket) {
    hostSocket.emit('host:newQuestion', questionForHost);
    console.log(`📤 Question ${game.currentQuestionIndex + 1} envoyée au maître ${game.host}`);
  } else {
    console.error(`❌ Socket du maître ${game.host} introuvable pour la partie ${gameCode}`);
  }
  ```

  **Explanation**:
  - `io.to(socketId)` incorrectly treats the socket ID as a room name, which may not exist
  - `io.sockets.sockets.get(socketId)` correctly retrieves the actual socket object
  - Direct socket emit (`hostSocket.emit()`) ensures the event reaches the intended recipient
  - Added error handling for scenarios where the socket no longer exists

  **Debug Logging Added**:

  1. **Server-side** (`server.js` lines 865-867, 910, 915):
     ```javascript
     console.log(`💬 sendNextQuestion: Partie ${gameCode}`);
     console.log(`   Index actuel: ${game.currentQuestionIndex}`);
     console.log(`   Nombre de questions: ${game.selectedQuestions.length}`);
     // ... after emit:
     console.log(`📤 Question ${game.currentQuestionIndex + 1} envoyée au maître ${game.host}`);
     ```

  2. **Host-side** (`host.js` line 521):
     ```javascript
     console.log('✅ HOST: Réception de host:newQuestion', { questionId: question.id, type: question.type });
     ```

  3. **Request logging** (`host.js` line 825):
     ```javascript
     console.log('📤 HOST: Demande de question suivante pour partie', gameCode);
     ```

  **Impact on Event Flow**:
  - **Before**: `host:newQuestion` event could be lost if `game.host` wasn't a valid room name
  - **After**: Direct socket emission guarantees delivery to the correct host socket
  - **Players**: No change - they continue receiving `game:newQuestion` via `io.to(gameCode)` which correctly targets the game room
  - **Reliability**: Significantly improved reconnection stability and screen transition consistency

  **Related Code References**:
  - Bug fix implementation: `server.js` lines 906-913
  - Event listener: `host.js` lines 520-529
  - Next question request: `host.js` lines 824-827
  - Game interruption logic: `server.js` lines 584-610
  - Reconnection logic: `server.js` lines 376-416

- **Game State Synchronization**: The host controls game flow progression. All state transitions (waiting → playing → finished) are triggered by host actions and broadcast to players. State preservation ensures the exact game state (including current screen and timer position) is maintained when navigating between screens (e.g., viewing history).

- **History Immutability**: Historical question data is preserved through deep copying of Map objects. This ensures that modifications to current game state don't affect historical records. Each historical entry contains a complete snapshot of all responses and their validation states at the time the question was completed.

- **CORS Configuration**: The Socket.io server accepts connections from any origin (`origin: "*"`). Restrict this in production deployments.

## Project Context

This application was developed for Malakoff Humanis to facilitate team quiz games. The French interface and business terminology (manches, maître du jeu) reflect this context. Admin documentation in French is available in multiple MD files (GUIDE_ADMINISTRATION.md, NOUVELLE_FONCTIONNALITE_ADMIN.md, etc.).
