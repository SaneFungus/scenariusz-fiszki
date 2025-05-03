/**
 * Parsuje tekst scenariusza i wyodrębnia strukturę: akty, sceny i dialogi postaci
 * @param {string} text - Pełny tekst scenariusza
 * @returns {Object} - Struktura scenariusza
 */
export function parseScript(text) {
  // Przygotuj podstawową strukturę
  const characters = new Set();
  const acts = [];
  
  // Normalizacja tekstu
  text = text.replace(/\r\n/g, '\n');
  
  // Podziel tekst na linie
  const lines = text.split('\n');
  
  // Aktualny stan parsowania
  let currentAct = null;
  let currentScene = null;
  let currentSpeaker = null;
  let inDialogue = false;
  let dialogueBuffer = [];
  
  // Wzorce do rozpoznawania elementów scenariusza
  const actPattern1 = /^AKT\s+(.+)$/i;                // Klasyczny format "AKT I"
  const actPattern2 = /^#+\s*([^#]+)$/;               // Format markdown "# INTERLUDIUM"
  const scenePattern1 = /^SCENA\s+(.+)$/i;            // Klasyczny format "SCENA 1"
  const scenePattern2 = /^#{2,}\s*([^#]+)$/;          // Format markdown "## Kryptomnezja. Autor"
  const subScenePattern = /^#{3,}\s*([^#]+)$/;        // Format "### Jeden"
  const characterPattern1 = /^([A-ZĘÓĄŚŁŻŹĆŃ][A-ZĘÓĄŚŁŻŹĆŃa-zęóąśłżźćń\s]+?)[\s]*?:(.*)$/;  // Format "POSTAĆ: kwestia"
  const characterPattern2 = /^([A-ZĘÓĄŚŁŻŹĆŃ][A-ZĘÓĄŚŁŻŹĆŃ0-9\s]+)$/;  // Format "POSTAĆ" w osobnej linii
  
  // Parsuj linijka po linijce
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Jeśli pusta linia, kontynuuj
    if (!line) {
      // Jeśli byliśmy w trakcie dialogu, zakończ go
      if (inDialogue && currentSpeaker && dialogueBuffer.length > 0) {
        if (currentScene) {
          currentScene.dialogues.push({
            character: currentSpeaker,
            text: dialogueBuffer.join(' ')
          });
        }
        inDialogue = false;
        dialogueBuffer = [];
      }
      continue;
    }
    
    // Sprawdź, czy to początek aktu (format klasyczny)
    const actMatch1 = line.match(actPattern1);
    if (actMatch1) {
      const actTitle = actMatch1[1].trim();
      currentAct = {
        id: `act_${acts.length + 1}`,
        title: actTitle,
        scenes: []
      };
      acts.push(currentAct);
      currentScene = null;
      continue;
    }
    
    // Sprawdź, czy to początek aktu (format markdown)
    const actMatch2 = line.match(actPattern2);
    if (actMatch2) {
      const actTitle = actMatch2[1].trim();
      currentAct = {
        id: `act_${acts.length + 1}`,
        title: actTitle,
        scenes: []
      };
      acts.push(currentAct);
      currentScene = null;
      continue;
    }
    
    // Sprawdź, czy to początek sceny (format klasyczny)
    const sceneMatch1 = line.match(scenePattern1);
    if (sceneMatch1) {
      // Jeśli nie mamy aktu, stwórz domyślny
      if (!currentAct) {
        currentAct = {
          id: 'act_1',
          title: 'Akt I',
          scenes: []
        };
        acts.push(currentAct);
      }
      
      const sceneTitle = sceneMatch1[1].trim();
      currentScene = {
        id: `scene_${currentAct.id}_${currentAct.scenes.length + 1}`,
        title: sceneTitle,
        dialogues: []
      };
      currentAct.scenes.push(currentScene);
      continue;
    }
    
    // Sprawdź, czy to początek sceny (format markdown)
    const sceneMatch2 = line.match(scenePattern2);
    if (sceneMatch2) {
      // Jeśli nie mamy aktu, stwórz domyślny
      if (!currentAct) {
        currentAct = {
          id: 'act_1',
          title: 'Akt I',
          scenes: []
        };
        acts.push(currentAct);
      }
      
      const sceneTitle = sceneMatch2[1].trim();
      currentScene = {
        id: `scene_${currentAct.id}_${currentAct.scenes.length + 1}`,
        title: sceneTitle,
        dialogues: []
      };
      currentAct.scenes.push(currentScene);
      continue;
    }
    
    // Sprawdź, czy to podscena (traktujemy jak scenę)
    const subSceneMatch = line.match(subScenePattern);
    if (subSceneMatch) {
      // Jeśli nie mamy aktu, stwórz domyślny
      if (!currentAct) {
        currentAct = {
          id: 'act_1',
          title: 'Akt I',
          scenes: []
        };
        acts.push(currentAct);
      }
      
      const sceneTitle = subSceneMatch[1].trim();
      currentScene = {
        id: `scene_${currentAct.id}_${currentAct.scenes.length + 1}`,
        title: sceneTitle,
        dialogues: []
      };
      currentAct.scenes.push(currentScene);
      continue;
    }
    
    // Sprawdź, czy to kwestia postaci (format klasyczny)
    const characterMatch1 = line.match(characterPattern1);
    if (characterMatch1) {
      // Jeśli byliśmy w trakcie dialogu, zakończ go
      if (inDialogue && currentSpeaker && dialogueBuffer.length > 0) {
        if (currentScene) {
          currentScene.dialogues.push({
            character: currentSpeaker,
            text: dialogueBuffer.join(' ')
          });
        }
      }
      
      const character = characterMatch1[1].trim();
      const dialogue = characterMatch1[2].trim();
      
      // Dodaj postać do listy
      characters.add(character);
      
      // Jeśli nie mamy sceny, stwórz domyślną
      if (!currentScene && currentAct) {
        currentScene = {
          id: `scene_${currentAct.id}_1`,
          title: 'Scena I',
          dialogues: []
        };
        currentAct.scenes.push(currentScene);
      } else if (!currentScene) {
        // Jeśli nie mamy ani aktu ani sceny, stwórz domyślne
        currentAct = {
          id: 'act_1',
          title: 'Akt I',
          scenes: []
        };
        acts.push(currentAct);
        
        currentScene = {
          id: `scene_${currentAct.id}_1`,
          title: 'Scena I',
          dialogues: []
        };
        currentAct.scenes.push(currentScene);
      }
      
      // Dodaj kwestię do sceny
      currentSpeaker = character;
      dialogueBuffer = [dialogue];
      inDialogue = dialogue.length > 0;
      
      // Jeśli nie mamy dialogu lub jest krótki, dodaj go od razu
      if (!inDialogue || dialogue.length < 5) {
        currentScene.dialogues.push({
          character: currentSpeaker,
          text: dialogueBuffer.join(' ')
        });
        inDialogue = false;
        dialogueBuffer = [];
      }
      
      continue;
    }
    
    // Sprawdź, czy to nazwa postaci (format nowy)
    const characterMatch2 = line.match(characterPattern2);
    if (characterMatch2) {
      // Jeśli byliśmy w trakcie dialogu, zakończ go
      if (inDialogue && currentSpeaker && dialogueBuffer.length > 0) {
        if (currentScene) {
          currentScene.dialogues.push({
            character: currentSpeaker,
            text: dialogueBuffer.join(' ')
          });
        }
      }
      
      const character = characterMatch2[1].trim();
      
      // Dodaj postać do listy
      characters.add(character);
      
      // Jeśli nie mamy sceny, stwórz domyślną
      if (!currentScene && currentAct) {
        currentScene = {
          id: `scene_${currentAct.id}_1`,
          title: 'Scena I',
          dialogues: []
        };
        currentAct.scenes.push(currentScene);
      } else if (!currentScene) {
        // Jeśli nie mamy ani aktu ani sceny, stwórz domyślne
        currentAct = {
          id: 'act_1',
          title: 'Akt I',
          scenes: []
        };
        acts.push(currentAct);
        
        currentScene = {
          id: `scene_${currentAct.id}_1`,
          title: 'Scena I',
          dialogues: []
        };
        currentAct.scenes.push(currentScene);
      }
      
      // Ustaw bieżącego mówcę
      currentSpeaker = character;
      dialogueBuffer = [];
      inDialogue = true;
      
      continue;
    }
    
    // Jeśli linia nie pasuje do żadnego wzorca, a mamy aktualnego mówcę,
    // traktujemy ją jako kontynuację dialogu
    if (inDialogue && currentSpeaker) {
      dialogueBuffer.push(line);
    }
  }
  
  // Jeśli na końcu pliku jest niedokończony dialog, dodaj go
  if (inDialogue && currentSpeaker && dialogueBuffer.length > 0 && currentScene) {
    currentScene.dialogues.push({
      character: currentSpeaker,
      text: dialogueBuffer.join(' ')
    });
  }
  
  // Jeśli nie znaleziono żadnych aktów, stwórz domyślny
  if (acts.length === 0) {
    acts.push({
      id: 'act_1',
      title: 'Akt I',
      scenes: [{
        id: 'scene_act_1_1',
        title: 'Scena I',
        dialogues: []
      }]
    });
  }
  
  return {
    acts,
    characters: Array.from(characters).sort()
  };
}

/**
 * Tworzy fiszki dla wybranej postaci w wybranej scenie
 * @param {Object} script - Przetworzony scenariusz
 * @param {string} character - Wybrana postać
 * @param {string} actId - ID wybranego aktu
 * @param {string} sceneId - ID wybranej sceny
 * @returns {Array} - Lista fiszek
 */
export function createFlashcards(script, character, actId, sceneId) {
  // Znajdź wybrany akt i scenę
  const act = script.acts.find(a => a.id === actId);
  if (!act) return [];
  
  const scene = act.scenes.find(s => s.id === sceneId);
  if (!scene) return [];
  
  const flashcards = [];
  
  // Znajdź wszystkie kwestie wybranej postaci w scenie
  const characterDialogues = scene.dialogues.filter(d => d.character === character);
  
  // Jeśli nie ma kwestii, zwróć pustą tablicę
  if (characterDialogues.length === 0) return [];
  
  // Dla każdej kwestii postaci
  characterDialogues.forEach((dialogue, dialogueIndex) => {
    // Znajdź kontekst (poprzednią kwestię innej postaci)
    let context = '';
    
    // Znajdź indeks tej kwestii w oryginalnych dialogach
    const originalIndex = scene.dialogues.findIndex(d => d === dialogue);
    
    // Jeśli to nie pierwsza kwestia w scenie, dodaj kontekst
    if (originalIndex > 0) {
      // Znajdź ostatnią kwestię przed tą, która nie należy do tej postaci
      for (let i = originalIndex - 1; i >= 0; i--) {
        if (scene.dialogues[i].character !== character) {
          context = `${scene.dialogues[i].character}: ${scene.dialogues[i].text}`;
          break;
        }
      }
    }
    
    // Dla pierwszej kwestii, dodaj informację, że to początek
    if (dialogueIndex === 0) {
      context = context || 'Początek sceny';
    } else {
      // Dla kolejnych kwestii, dodaj informację o kontynuacji
      context = context || '(kontynuacja)';
    }
    
    // Podziel długą kwestię na mniejsze fragmenty (około 150 znaków)
    const maxLength = 200; // Zwiększyłem z 150 na 200 znaków
    const text = dialogue.text;
    
    if (text.length <= maxLength) {
      // Krótka kwestia - jedna fiszka
      flashcards.push({
        context,
        text,
        hint: `Kwestia ${dialogueIndex + 1} z ${characterDialogues.length}`,
        difficulty: 0
      });
    } else {
      // Długa kwestia - podziel na fragmenty
      let start = 0;
      let fragmentIndex = 0;
      
      while (start < text.length) {
        let end = Math.min(start + maxLength, text.length);
        
        // Znajdź lepsze miejsce do podziału (na końcu zdania lub po przecinku)
        if (end < text.length) {
          const periodsAfterStart = text.indexOf('.', start + maxLength * 0.7);
          const commasAfterStart = text.indexOf(',', start + maxLength * 0.7);
          
          // Preferuj podział po kropce, potem po przecinku
          if (periodsAfterStart > 0 && periodsAfterStart < end + 30) {
            end = periodsAfterStart + 1;
          } else if (commasAfterStart > 0 && commasAfterStart < end + 20) {
            end = commasAfterStart + 1;
          } else {
            // Jeśli nie znaleziono lepszego miejsca, znajdź najbliższą spację
            const lastSpace = text.lastIndexOf(' ', end);
            if (lastSpace > start) {
              end = lastSpace + 1;
            }
          }
        }
        
        // Wytnij fragment tekstu
        const fragment = text.substring(start, end).trim();
        fragmentIndex++;
        
        // Dodaj kontekst tylko dla pierwszego fragmentu
        flashcards.push({
          context: fragmentIndex === 1 ? context : '(kontynuacja)',
          text: fragment,
          hint: `Kwestia ${dialogueIndex + 1} z ${characterDialogues.length}, fragment ${fragmentIndex}`,
          difficulty: 0
        });
        
        start = end;
      }
    }
  });
  
  return flashcards;
}
