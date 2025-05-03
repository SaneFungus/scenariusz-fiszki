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
  let dialogueBuffer = [];
  
  // Wzorce do rozpoznawania elementów scenariusza
  const actPattern = /^AKT\s+(.+)$/i;
  const scenePattern = /^SCENA\s+(.+)$/i;
  const characterPattern = /^([A-ZĘÓĄŚŁŻŹĆŃ][A-ZĘÓĄŚŁŻŹĆŃa-zęóąśłżźćń\s]+?)[\s]*?:(.*)$/;
  
  // Parsuj linijka po linijce
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Jeśli pusta linia, kontynuuj
    if (!line) continue;
    
    // Sprawdź, czy to początek aktu
    const actMatch = line.match(actPattern);
    if (actMatch) {
      const actTitle = actMatch[1].trim();
      currentAct = {
        id: `act_${acts.length + 1}`,
        title: actTitle,
        scenes: []
      };
      acts.push(currentAct);
      currentScene = null;
      continue;
    }
    
    // Sprawdź, czy to początek sceny
    const sceneMatch = line.match(scenePattern);
    if (sceneMatch) {
      // Jeśli nie mamy aktu, stwórz domyślny
      if (!currentAct) {
        currentAct = {
          id: 'act_1',
          title: 'Akt I',
          scenes: []
        };
        acts.push(currentAct);
      }
      
      const sceneTitle = sceneMatch[1].trim();
      currentScene = {
        id: `scene_${currentAct.id}_${currentAct.scenes.length + 1}`,
        title: sceneTitle,
        dialogues: []
      };
      currentAct.scenes.push(currentScene);
      continue;
    }
    
    // Sprawdź, czy to kwestia postaci
    const characterMatch = line.match(characterPattern);
    if (characterMatch) {
      const character = characterMatch[1].trim();
      const dialogue = characterMatch[2].trim();
      
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
      
      // Jeśli ta kwestia ma kontynuację w kolejnych liniach, przetwórz ją
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        if (!nextLine || nextLine.match(actPattern) || nextLine.match(scenePattern) || nextLine.match(characterPattern)) {
          break;
        }
        dialogueBuffer.push(nextLine);
        j++;
      }
      
      i = j - 1; // Przeskocz przetworzone linie
      
      // Dodaj kompletną kwestię
      currentScene.dialogues.push({
        character: currentSpeaker,
        text: dialogueBuffer.join(' ')
      });
      
      continue;
    }
    
    // Jeśli linia nie pasuje do żadnego wzorca, a mamy aktualnego mówcę,
    // możemy założyć, że to kontynuacja kwestii (ale to już powinno być obsłużone wyżej)
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
  
  // Znajdź kwestie wybranej postaci w scenie
  for (let i = 0; i < scene.dialogues.length; i++) {
    const dialogue = scene.dialogues[i];
    
    // Pomiń, jeśli to nie kwestia wybranej postaci
    if (dialogue.character !== character) continue;
    
    // Znajdź poprzednią kwestię jako kontekst
    let context = '';
    if (i > 0) {
      context = `${scene.dialogues[i-1].character}: ${scene.dialogues[i-1].text}`;
    }
    
    // Podziel długą kwestię na mniejsze fragmenty (około 150 znaków)
    const maxLength = 150;
    const text = dialogue.text;
    
    if (text.length <= maxLength) {
      // Krótka kwestia - jedna fiszka
      flashcards.push({
        context,
        text,
        hint: 'Pokaż podpowiedź',
        difficulty: 0
      });
    } else {
      // Długa kwestia - podziel na fragmenty
      let start = 0;
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
        
        // Dodaj kontekst tylko dla pierwszej fiszki
        flashcards.push({
          context: start === 0 ? context : '(kontynuacja)',
          text: fragment,
          hint: 'Pokaż podpowiedź',
          difficulty: 0
        });
        
        start = end;
      }
    }
  }
  
  return flashcards;
}
