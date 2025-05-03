<script>
  import { onMount } from 'svelte';
  import { parseScript, createFlashcards } from './lib/parseScenes';

  // Stan aplikacji
  let script = null;
  let characters = [];
  let acts = [];
  let scenes = [];
  let selectedCharacter = '';
  let selectedAct = '';
  let selectedScene = '';
  let flashcards = [];
  let currentCardIndex = 0;
  let mode = 'upload'; // 'upload', 'select', 'learn'
  let difficultCards = new Set();
  let showOnlyDifficult = false;
  let displayedCards = [];
  let scriptName = '';
  let isFlipped = false;
  let savedScripts = [];

  // Załadowanie zapisanych scenariuszy
  onMount(() => {
    // Sprawdź, czy są zapisane skrypty
    const saved = localStorage.getItem('savedScripts');
    if (saved) {
      savedScripts = JSON.parse(saved);
    }
  });

  // Obsługa wgrania pliku
  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    scriptName = file.name.replace(/\.[^/.]+$/, "");
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      processScript(text);
    };
    reader.readAsText(file);
  }

  function processScript(text) {
    script = parseScript(text);
    characters = script.characters;
    acts = script.acts;
    scenes = [];
    selectedCharacter = characters.length > 0 ? characters[0] : '';
    selectedAct = '';
    selectedScene = '';
    mode = 'select';
    
    // Jeśli jest tylko jeden akt, wybierz go automatycznie
    if (acts.length === 1) {
      selectedAct = acts[0].id;
      updateScenes();
    }
  }

  function updateScenes() {
    if (selectedAct) {
      scenes = script.acts.find(a => a.id === selectedAct)?.scenes || [];
      selectedScene = scenes.length > 0 ? scenes[0].id : '';
    } else {
      scenes = [];
      selectedScene = '';
    }
  }

  function startLearning() {
    if (!selectedCharacter || !selectedAct || !selectedScene) {
      alert('Wybierz postać, akt i scenę');
      return;
    }
    
    flashcards = createFlashcards(script, selectedCharacter, selectedAct, selectedScene);
    currentCardIndex = 0;
    difficultCards = new Set();
    showOnlyDifficult = false;
    updateDisplayedCards();
    mode = 'learn';
    
    // Zapisz skrypt jeśli jeszcze nie jest zapisany
    saveScriptIfNew();
  }

  function saveScriptIfNew() {
    if (!scriptName) return;
    
    // Sprawdź czy skrypt już istnieje
    const exists = savedScripts.some(s => s.name === scriptName);
    if (!exists) {
      savedScripts = [...savedScripts, { 
        name: scriptName, 
        date: new Date().toISOString(),
        script: script
      }];
      localStorage.setItem('savedScripts', JSON.stringify(savedScripts));
    }
  }

  function loadSavedScript(index) {
    const savedScript = savedScripts[index];
    scriptName = savedScript.name;
    script = savedScript.script;
    characters = script.characters;
    acts = script.acts;
    selectedCharacter = characters.length > 0 ? characters[0] : '';
    selectedAct = '';
    selectedScene = '';
    updateScenes();
    mode = 'select';
  }

  function deleteSavedScript(index) {
    if (confirm('Czy na pewno chcesz usunąć ten scenariusz?')) {
      savedScripts = savedScripts.filter((_, i) => i !== index);
      localStorage.setItem('savedScripts', JSON.stringify(savedScripts));
    }
  }

  function updateDisplayedCards() {
    if (showOnlyDifficult) {
      displayedCards = flashcards.filter((_, index) => difficultCards.has(index));
    } else {
      displayedCards = flashcards;
    }
    
    if (displayedCards.length === 0) {
      showOnlyDifficult = false;
      displayedCards = flashcards;
    }
    
    // Upewnij się, że indeks jest poprawny
    if (currentCardIndex >= displayedCards.length) {
      currentCardIndex = 0;
    }
  }

  function nextCard() {
    isFlipped = false;
    if (currentCardIndex < displayedCards.length - 1) {
      currentCardIndex++;
    } else {
      // Opcjonalnie: zapętlenie
      currentCardIndex = 0;
    }
  }

  function prevCard() {
    isFlipped = false;
    if (currentCardIndex > 0) {
      currentCardIndex--;
    } else {
      // Opcjonalnie: przejdź na koniec
      currentCardIndex = displayedCards.length - 1;
    }
  }

  function markDifficult() {
    // Znajdź oryginalny indeks w pełnej liście fiszek
    const originalIndex = flashcards.findIndex(fc => 
      fc === displayedCards[currentCardIndex]);
    
    if (difficultCards.has(originalIndex)) {
      difficultCards.delete(originalIndex);
    } else {
      difficultCards.add(originalIndex);
    }
    
    // Zapisz trudne fiszki w localStorage
    saveDifficultCards();
  }

  function toggleShowDifficult() {
    showOnlyDifficult = !showOnlyDifficult;
    updateDisplayedCards();
  }

  function saveDifficultCards() {
    if (!scriptName || !selectedCharacter || !selectedScene) return;
    
    const key = `difficult_${scriptName}_${selectedCharacter}_${selectedScene}`;
    localStorage.setItem(key, JSON.stringify(Array.from(difficultCards)));
  }

  function loadDifficultCards() {
    if (!scriptName || !selectedCharacter || !selectedScene) return;
    
    const key = `difficult_${scriptName}_${selectedCharacter}_${selectedScene}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      difficultCards = new Set(JSON.parse(saved));
    } else {
      difficultCards = new Set();
    }
  }

  function goBack() {
    if (mode === 'select') {
      mode = 'upload';
    } else if (mode === 'learn') {
      mode = 'select';
    }
  }

  function toggleFlip() {
    isFlipped = !isFlipped;
  }

  // Efekt przy zmianie wybranego aktu
  $: if (selectedAct) {
    updateScenes();
  }
</script>

<main>
  <header>
    <h1>Fiszki do nauki tekstu</h1>
    {#if mode !== 'upload'}
      <button class="back-button" on:click={goBack}>Wróć</button>
    {/if}
  </header>

  {#if mode === 'upload'}
    <div class="upload-container">
      <div class="upload-section">
        <h2>Wgraj nowy scenariusz</h2>
        <p>Wgraj swój scenariusz w formacie tekstowym (.txt)</p>
        <label class="file-upload">
          <input type="file" accept=".txt" on:change={handleFileUpload} />
          <span>Wybierz plik</span>
        </label>
      </div>

      {#if savedScripts.length > 0}
        <div class="saved-scripts">
          <h2>Zapisane scenariusze</h2>
          <ul>
            {#each savedScripts as saved, i}
              <li>
                <div class="script-info">
                  <strong>{saved.name}</strong>
                  <small>{new Date(saved.date).toLocaleDateString()}</small>
                </div>
                <div class="script-actions">
                  <button on:click={() => loadSavedScript(i)}>Wczytaj</button>
                  <button class="delete" on:click={() => deleteSavedScript(i)}>Usuń</button>
                </div>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>

  {:else if mode === 'select'}
    <div class="selection">
      <h2>Wybierz swoją rolę i scenę</h2>
      
      {#if characters.length > 0}
        <div class="select-group">
          <label for="character">Postać:</label>
          <select id="character" bind:value={selectedCharacter}>
            {#each characters as character}
              <option value={character}>{character}</option>
            {/each}
          </select>
        </div>
      {:else}
        <p class="error">Nie znaleziono postaci w scenariuszu.</p>
      {/if}

      {#if acts.length > 0}
        <div class="select-group">
          <label for="act">Akt:</label>
          <select id="act" bind:value={selectedAct}>
            <option value="">Wybierz akt</option>
            {#each acts as act}
              <option value={act.id}>{act.title}</option>
            {/each}
          </select>
        </div>
      {:else}
        <p class="error">Nie znaleziono aktów w scenariuszu.</p>
      {/if}

      {#if scenes.length > 0}
        <div class="select-group">
          <label for="scene">Scena:</label>
          <select id="scene" bind:value={selectedScene}>
            <option value="">Wybierz scenę</option>
            {#each scenes as scene}
              <option value={scene.id}>{scene.title}</option>
            {/each}
          </select>
        </div>
      {:else if selectedAct}
        <p class="error">Nie znaleziono scen w wybranym akcie.</p>
      {/if}

      <button 
        class="start-button" 
        on:click={startLearning} 
        disabled={!selectedCharacter || !selectedAct || !selectedScene}>
        Rozpocznij naukę
      </button>
    </div>

  {:else if mode === 'learn'}
    {#if displayedCards.length > 0}
      <div class="learning-controls">
        <button class:active={showOnlyDifficult} on:click={toggleShowDifficult}>
          {showOnlyDifficult ? 'Pokaż wszystkie' : 'Tylko trudne'}
        </button>
        <span class="progress">
          {currentCardIndex + 1} / {displayedCards.length}
        </span>
      </div>

      <!-- Karta z tekstem -->
      <div class="flashcard-container">
        <div class="flashcard" class:flipped={isFlipped} on:click={toggleFlip}>
          <div class="flashcard-front">
            <div class="context">{displayedCards[currentCardIndex].context}</div>
            <div class="text">{displayedCards[currentCardIndex].text}</div>
          </div>
          <div class="flashcard-back">
            <div class="hint">{displayedCards[currentCardIndex].hint}</div>
          </div>
        </div>

        <!-- Wskaźnik trudności -->
        <div class="difficulty-marker">
          {#if difficultCards.has(flashcards.indexOf(displayedCards[currentCardIndex]))}
            <span class="difficult">Trudne</span>
          {/if}
        </div>
      </div>

      <!-- Przyciski nawigacji -->
      <div class="navigation">
        <button on:click={prevCard}>⬅️ Poprzednia</button>
        <button on:click={markDifficult}>
          {difficultCards.has(flashcards.indexOf(displayedCards[currentCardIndex])) 
            ? 'Usuń oznaczenie trudne' 
            : 'Oznacz jako trudne'}
        </button>
        <button on:click={nextCard}>Następna ➡️</button>
      </div>
    {:else}
      <p class="error">Nie znaleziono żadnych fiszek dla wybranej postaci i sceny.</p>
      <button on:click={goBack}>Wróć do wyboru</button>
    {/if}
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    background-color: #f5f5f5;
    color: #333;
  }

  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    min-height: 100vh;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
  }

  h1 {
    font-size: 1.8rem;
    color: #3A5E85;
    margin: 0;
  }

  h2 {
    font-size: 1.4rem;
    color: #3A5E85;
    margin-bottom: 20px;
  }

  .upload-container {
    display: flex;
    flex-direction: column;
    gap: 30px;
  }

  .upload-section {
    background: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .file-upload {
    display: inline-block;
    padding: 12px 20px;
    background-color: #3A5E85;
    color: white;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  .file-upload:hover {
    background-color: #2c4c6e;
  }

  .file-upload input {
    display: none;
  }

  .saved-scripts {
    background: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .saved-scripts ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .saved-scripts li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 0;
    border-bottom: 1px solid #eee;
  }

  .saved-scripts li:last-child {
    border-bottom: none;
  }

  .script-info {
    display: flex;
    flex-direction: column;
  }

  .script-actions {
    display: flex;
    gap: 10px;
  }

  .selection {
    background: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .select-group {
    margin-bottom: 20px;
  }

  .select-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: bold;
  }

  select {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 5px;
    background-color: white;
    font-size: 16px;
  }

  .start-button {
    display: block;
    width: 100%;
    padding: 15px;
    background-color: #3A5E85;
    color: white;
    border: none;
    border-radius: 5px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.3s;
    margin-top: 20px;
  }

  .start-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  .start-button:not(:disabled):hover {
    background-color: #2c4c6e;
  }

  .learning-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .learning-controls button {
    padding: 8px 16px;
    background-color: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 5px;
    cursor: pointer;
  }

  .learning-controls button.active {
    background-color: #3A5E85;
    color: white;
  }

  .progress {
    font-weight: bold;
  }

  .flashcard-container {
    position: relative;
    perspective: 1000px;
    margin-bottom: 20px;
  }

  .flashcard {
    position: relative;
    width: 100%;
    height: 300px;
    transition: transform 0.6s;
    transform-style: preserve-3d;
    cursor: pointer;
  }

  .flashcard.flipped {
    transform: rotateY(180deg);
  }

  .flashcard-front, .flashcard-back {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    background: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
  }

  .flashcard-back {
    transform: rotateY(180deg);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .context {
    font-style: italic;
    color: #666;
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid #eee;
  }

  .text {
    font-size: 1.3rem;
    line-height: 1.5;
    flex-grow: 1;
  }

  .hint {
    font-size: 1.2rem;
    color: #3A5E85;
  }

  .difficulty-marker {
    position: absolute;
    top: 10px;
    right: 10px;
  }

  .difficult {
    background-color: #e74c3c;
    color: white;
    padding: 5px 10px;
    border-radius: 3px;
    font-size: 12px;
  }

  .navigation {
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }

  .navigation button {
    flex: 1;
    padding: 15px;
    background-color: #3A5E85;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  .navigation button:hover {
    background-color: #2c4c6e;
  }

  .back-button {
    padding: 8px 16px;
    background-color: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 5px;
    cursor: pointer;
  }

  .error {
    color: #e74c3c;
    background-color: #fdf3f2;
    padding: 15px;
    border-radius: 5px;
    margin-bottom: 20px;
  }

  @media (max-width: 600px) {
    main {
      padding: 15px;
    }

    h1 {
      font-size: 1.5rem;
    }

    .navigation {
      flex-direction: column;
    }

    .flashcard {
      height: 250px;
    }

    .text {
      font-size: 1.1rem;
    }
  }
</style>
