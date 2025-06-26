document.addEventListener('DOMContentLoaded', () => {
    // --- DOM-Elemente ---
    const bausteinPalette = document.getElementById('baustein-palette');
    const dropzone = document.getElementById('programm-ablauf');
    const papierkorb = document.getElementById('papierkorb');
    const platzhalterText = document.querySelector('.platzhalter-text');
    
    // Buttons
    const generateBtn = document.getElementById('generate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const copyBtn = document.getElementById('copy-btn');
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    
    // Code & Beispiele
    const codeOutput = document.getElementById('code-output');
    const exampleLinks = document.querySelectorAll('.dropdown-content a');
    
    // --- Globale Zustände ---
    let draggedElement = null;

    // --- Beispiel-Programme Daten ---
    const examples = {
        quadrat: [
            { befehl: 'vorwaerts_schnell' },
            { befehl: 'warten', wert: '1.5' },
            { befehl: 'stopp' },
            { befehl: 'drehe_rechts' },
            { befehl: 'warten', wert: '0.8' },
            { befehl: 'stopp' },
            { befehl: 'vorwaerts_schnell' },
            { befehl: 'warten', wert: '1.5' },
            // ... kann vervollständigt werden
        ],
        pendel: [
            { befehl: 'vorwaerts_langsam' },
            { befehl: 'warten', wert: '2' },
            { befehl: 'stopp' },
            { befehl: 'warten', wert: '1' },
            { befehl: 'rueckwaerts' },
            { befehl: 'warten', wert: '2' },
            { befehl: 'stopp' },
        ],
        tanz: [
            { befehl: 'drehe_links' },
            { befehl: 'warten', wert: '0.5' },
            { befehl: 'drehe_rechts' },
            { befehl: 'warten', wert: '0.5' },
            { befehl: 'vorwaerts_schnell' },
            { befehl: 'warten', wert: '0.2' },
            { befehl: 'rueckwaerts' },
            { befehl: 'warten', wert: '0.2' },
            { befehl: 'stopp' },
        ]
    };

    // --- Kernfunktionen ---

    /**
     * Erstellt einen neuen Baustein im Programmbereich.
     * @param {string} befehl - Der Befehl des Bausteins (z.B. 'vorwaerts_schnell').
     * @param {string} [wert] - Der Wert für den Baustein (z.B. für 'warten').
     * @returns {HTMLElement} Das erstellte Baustein-Element.
     */
    function createBlockInZone(befehl, wert) {
        const originalBaustein = bausteinPalette.querySelector(`.baustein[data-befehl='${befehl}']`);
        const neuerBaustein = originalBaustein.cloneNode(true);
        neuerBaustein.removeAttribute('data-tooltip'); // Tooltips nur in Palette
        neuerBaustein.id = 'block-' + Date.now() + Math.random(); // Eindeutige ID
        
        // Duplizier-Icon hinzufügen und anzeigen
        const duplicateIcon = document.createElement('i');
        duplicateIcon.className = 'fa-regular fa-copy duplicate-icon';
        duplicateIcon.style.display = 'block';
        
        // Wrapper für den Inhalt, damit das Icon daneben passt
        const content = neuerBaustein.innerHTML;
        neuerBaustein.innerHTML = '';
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'baustein-content';
        contentWrapper.innerHTML = content;
        
        neuerBaustein.appendChild(contentWrapper);
        neuerBaustein.appendChild(duplicateIcon);

        // Wert für 'warten' Block setzen, falls vorhanden
        if (befehl === 'warten' && wert) {
            neuerBaustein.querySelector('.warten-input').value = wert;
        }

        addInteractionsToBlock(neuerBaustein);
        return neuerBaustein;
    }
    
    /**
     * Fügt alle notwendigen Event-Listener zu einem Baustein im Programmbereich hinzu.
     * @param {HTMLElement} block - Der Baustein, der interaktiv gemacht werden soll.
     */
    function addInteractionsToBlock(block) {
        block.draggable = true;

        // Drag-Events zum Umsortieren und Löschen
        block.addEventListener('dragstart', (e) => {
            draggedElement = block;
            setTimeout(() => {
                block.classList.add('dragging');
                papierkorb.classList.add('visible');
            }, 0);
        });

        block.addEventListener('dragend', () => {
            draggedElement.classList.remove('dragging');
            draggedElement = null;
            papierkorb.classList.remove('visible', 'drag-over');
        });

        // Duplizier-Event
        block.querySelector('.duplicate-icon').addEventListener('click', () => {
            const wert = block.dataset.befehl === 'warten' ? block.querySelector('.warten-input').value : null;
            const duplikat = createBlockInZone(block.dataset.befehl, wert);
            block.after(duplikat);
            updatePlatzhalter();
        });
    }

    /**
     * Lädt ein Programm aus einem Daten-Array in den Programmbereich.
     * @param {Array<Object>} programData - Das Array mit den Programmdaten.
     */
    function loadProgram(programData) {
        dropzone.innerHTML = ''; // Altes Programm löschen
        programData.forEach(item => {
            const block = createBlockInZone(item.befehl, item.wert);
            dropzone.appendChild(block);
        });
        updatePlatzhalter();
        generateAndHighlightCode();
    }
    
    /**
     * Aktualisiert die Sichtbarkeit des Platzhalter-Textes.
     */
    const updatePlatzhalter = () => {
        platzhalterText.style.display = dropzone.children.length > 0 ? 'none' : 'flex';
    };


    // --- Event Listeners ---

    // Drag & Drop von der Palette
    bausteinPalette.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('baustein')) {
            draggedElement = e.target;
            draggedElement.classList.add('dragging');
        }
    });
    
    bausteinPalette.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('baustein')) {
            draggedElement.classList.remove('dragging');
            draggedElement = null;
        }
    });

    // Dropzone Events (Baustein hinzufügen/umsortieren)
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(dropzone, e.clientY);
        if (draggedElement.parentElement !== dropzone) return; // Nur umsortieren
        if (afterElement == null) {
            dropzone.appendChild(draggedElement);
        } else {
            dropzone.insertBefore(draggedElement, afterElement);
        }
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        // Wenn Element aus der Palette kommt, neuen Baustein erstellen
        if (draggedElement.parentElement === bausteinPalette) {
            const befehl = draggedElement.dataset.befehl;
            const wert = befehl === 'warten' ? draggedElement.querySelector('.warten-input').value : null;
            const neuerBaustein = createBlockInZone(befehl, wert);
            
            const afterElement = getDragAfterElement(dropzone, e.clientY);
            if (afterElement == null) {
                dropzone.appendChild(neuerBaustein);
            } else {
                dropzone.insertBefore(neuerBaustein, afterElement);
            }
        }
        updatePlatzhalter();
    });

    // Papierkorb Events
    papierkorb.addEventListener('dragover', (e) => {
        e.preventDefault();
        papierkorb.classList.add('drag-over');
    });

    papierkorb.addEventListener('dragleave', () => {
        papierkorb.classList.remove('drag-over');
    });

    papierkorb.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedElement && draggedElement.parentElement === dropzone) {
            draggedElement.classList.add('ghost');
            draggedElement.addEventListener('transitionend', () => {
                draggedElement.remove();
                updatePlatzhalter();
            }, { once: true });
        }
    });

    // Button Events
    generateBtn.addEventListener('click', generateAndHighlightCode);

    clearBtn.addEventListener('click', () => {
        if (confirm("Möchtest du wirklich das gesamte Programm löschen?")) {
            dropzone.innerHTML = '';
            updatePlatzhalter();
            generateAndHighlightCode();
        }
    });
    
    saveBtn.addEventListener('click', () => {
        const programData = Array.from(dropzone.querySelectorAll('.baustein')).map(block => {
            const data = { befehl: block.dataset.befehl };
            if (data.befehl === 'warten') {
                data.wert = block.querySelector('.warten-input').value;
            }
            return data;
        });
        localStorage.setItem('roboterProgramm', JSON.stringify(programData));
        alert('Programm gespeichert!');
    });
    
    loadBtn.addEventListener('click', () => {
        const savedProgram = localStorage.getItem('roboterProgramm');
        if (savedProgram) {
            if (dropzone.children.length > 0 && !confirm("Dein aktuelles Programm wird überschrieben. Fortfahren?")) {
                return;
            }
            loadProgram(JSON.parse(savedProgram));
        } else {
            alert('Kein gespeichertes Programm gefunden.');
        }
    });

    exampleLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const exampleKey = e.target.dataset.example;
            if (examples[exampleKey]) {
                if (dropzone.children.length > 0 && !confirm("Dein aktuelles Programm wird durch das Beispiel überschrieben. Fortfahren?")) {
                    return;
                }
                loadProgram(examples[exampleKey]);
            }
        });
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(codeOutput.textContent).then(() => {
            const icon = copyBtn.querySelector('i');
            const span = copyBtn.querySelector('span');
            const originalText = span.textContent;
            
            icon.className = 'fa-solid fa-check';
            span.textContent = 'Kopiert!';
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                icon.className = 'fa-regular fa-clipboard';
                span.textContent = originalText;
                copyBtn.classList.remove('copied');
            }, 2000);
        });
    });

    // --- Hilfsfunktionen & Initialisierung ---
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.baustein:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function generateAndHighlightCode() {
        const befehlsSequenz = Array.from(dropzone.querySelectorAll('.baustein'));
        let code = '';
        if (befehlsSequenz.length > 0) {
            befehlsSequenz.forEach(baustein => {
                const befehl = baustein.dataset.befehl;
                let zeile = '';
                if (befehl === 'warten') {
                    const zeit = baustein.querySelector('.warten-input').value.replace(',', '.');
                    zeile = `warten(${zeit});`;
                } else {
                    zeile = `${befehl}();`;
                }
                code += `  ${zeile}\n`;
            });
        }
        
        const finalCode = befehlsSequenz.length > 0 ? `#include "fahrfunktionen.h"

void setup() {
  Serial.begin(9600);
  Serial.println("Roboter-Auto startklar. Fahrprogramm wird ausgeführt.");

  // --- HIER KOMMEN DIE BEFEHLE REIN ---
${code}
  Serial.println("Fahrprogramm beendet.");
}

void loop() {
  // Dieser Bereich wird ignoriert und bleibt leer.
}` : '// Das Programm ist leer. Füge Bausteine hinzu oder lade ein Beispiel.';
        
        codeOutput.textContent = finalCode;
        Prism.highlightElement(codeOutput);
    }
    
    // Initialer Zustand
    updatePlatzhalter();
    generateAndHighlightCode();
});