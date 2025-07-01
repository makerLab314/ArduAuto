// Definition der Beispiel-Programme (NEUES BEISPIEL HINZUGEFÜGT)
const EXAMPLES = {
    quadrat: [
        { type: 'kommentar', value: 'Ein Quadrat fahren' },
        { type: 'vorwaerts_schnell', value: null }, { type: 'warten', value: '1.5' }, { type: 'stopp', value: null },
        { type: 'drehe_rechts', value: null }, { type: 'warten', value: '0.8' }, { type: 'stopp', value: null },
        { type: 'vorwaerts_schnell', value: null }, { type: 'warten', value: '1.5' }, { type: 'stopp', value: null },
        { type: 'drehe_rechts', value: null }, { type: 'warten', value: '0.8' }, { type: 'stopp', value: null },
        { type: 'vorwaerts_schnell', value: null }, { type: 'warten', value: '1.5' }, { type: 'stopp', value: null },
        { type: 'drehe_rechts', value: null }, { type: 'warten', 'value': '0.8' }, { type: 'stopp', value: null },
        { type: 'vorwaerts_schnell', value: null }, { type: 'warten', 'value': '1.5' }, { type: 'stopp', value: null },
    ],
    // NEU: Beispiel für autonomes Fahren mit dem If/Else-Block
    autonom: [
        {
            type: 'if_else_abstand',
            value: '20',
            if_branch: [
                { type: 'kommentar', value: 'Hindernis nah, ausweichen!' },
                { type: 'stopp', value: null },
                { type: 'rueckwaerts', value: null },
                { type: 'warten', value: '0.5' },
                { type: 'drehe_links', value: null },
                { type: 'warten', value: '0.8' },
                { type: 'stopp', value: null },
            ],
            else_branch: [
                { type: 'kommentar', value: 'Weg ist frei, weiterfahren.' },
                { type: 'vorwaerts_langsam', value: null },
            ]
        }
    ],
    tanz: [
        { type: 'drehe_links', value: null }, { type: 'warten', value: '0.5' }, { type: 'drehe_rechts', value: null },
        { type: 'warten', value: '0.5' }, { type: 'vorwaerts_schnell', value: null }, { type: 'warten', value: '0.2' },
        { type: 'rueckwaerts', value: null }, { type: 'warten', value: '0.2' }, { type: 'stopp', value: null },
    ]
};

const RoboProgrammer = {
    els: {},
    state: [], // state ist jetzt ein Baum, keine flache Liste mehr
    history: [],
    historyIndex: -1,

    init() {
        this.cacheDOMElements();
        this.initSortable();
        this.addEventListeners();
        this.loadFromLocalStorage(); // Lädt den gespeicherten Zustand
        this.saveToHistory(true); // Speichert den initialen Zustand
        this.updateUI();
    },

    cacheDOMElements() {
        this.els = {
            paletteKategorien: document.querySelectorAll('#baustein-palette .kategorie'),
            dropzone: document.getElementById('programm-ablauf'),
            undoBtn: document.getElementById('undo-btn'),
            redoBtn: document.getElementById('redo-btn'),
            clearBtn: document.getElementById('clear-btn'),
            saveBtn: document.getElementById('save-btn'),
            loadBtn: document.getElementById('load-btn'),
            copyBtn: document.getElementById('copy-btn'),
            codeOutput: document.getElementById('code-output'),
            exampleLinks: document.querySelectorAll('.dropdown-content a'),
            loopTypeRadios: document.querySelectorAll('input[name="loop-type"]'),
            toastContainer: document.getElementById('toast-container'), // Added for completeness
        };
    },
    
    initSortable(rootElement = this.els.dropzone, stateArray = this.state) {
        // Haupt-Dropzone
        new Sortable(rootElement, {
            group: 'shared',
            animation: 150,
            handle: '.handle',
            onAdd: (evt) => this.handleBlockAdd(evt, stateArray),
            onUpdate: (evt) => this.handleBlockMove(evt, stateArray),
        });
    },

    addEventListeners() {
        this.els.undoBtn.addEventListener('click', () => this.undo());
        this.els.redoBtn.addEventListener('click', () => this.redo());
        this.els.clearBtn.addEventListener('click', () => this.clearProgram());
        this.els.saveBtn.addEventListener('click', () => this.saveToLocalStorage());
        this.els.loadBtn.addEventListener('click', () => this.loadFromLocalStorage(true));
        this.els.copyBtn.addEventListener('click', () => this.copyCode());
        
        this.els.exampleLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadExample(e.target.dataset.example);
            });
        });

        this.els.loopTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => this.generateCode());
        });

        // Tastaturkürzel
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') { e.preventDefault(); this.undo(); }
                if (e.key === 'y') { e.preventDefault(); this.redo(); }
            }
        });

        // Palette initialisieren
        this.els.paletteKategorien.forEach(kategorie => {
             // Find all .baustein elements within this kategorie
            const bausteine = kategorie.querySelectorAll('.baustein');
            new Sortable(kategorie, { // Make the container itself sortable if needed, or just its children
                group: { name: 'shared', pull: 'clone', put: false },
                sort: false, // Do not sort items within the palette itself
                draggable: '.baustein', // Specify what items are draggable
                  onStart: function (evt) {
                    // Optional: Add a class to the cloned item for styling while dragging from palette
                    evt.clone.classList.add('dragging-from-palette');
                }
            });
        });
    },

    // --- Zustands- & UI-Management ---
    
    saveToHistory(isInitial = false) {
        if (!isInitial && this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        this.history.push(JSON.parse(JSON.stringify(this.state)));
        this.historyIndex++;
        this.updateUndoRedoButtons();
    },
    
    updateUI() {
        this.renderBlocks(this.els.dropzone, this.state);
        this.generateCode();
        this.updateUndoRedoButtons();
    },
    
    // REKURSIVE Render-Funktion
    renderBlocks(container, stateArray) {
        container.innerHTML = ''; // Clear previous blocks
        stateArray.forEach((block) => { // Removed index as it's not directly used for appending
            const blockEl = this.createBlockElement(block); // Removed stateArray argument, not needed here
            container.appendChild(blockEl);
        });
    },
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.updateUI();
        }
    },

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.updateUI();
        }
    },
    
    updateUndoRedoButtons() {
        this.els.undoBtn.disabled = this.historyIndex <= 0;
        this.els.redoBtn.disabled = this.historyIndex >= this.history.length - 1;
    },

    // --- Block-Manipulation (jetzt komplexer) ---
    
    handleBlockAdd(evt, targetStateArray) {
        const type = evt.item.dataset.type;
        const newIndex = evt.newIndex;
        
        // Erstelle das neue Zustandsobjekt
        const newBlockState = {
            id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // More robust ID
            type: type
        };

        // Setze Standardwerte basierend auf dem Typ
        switch (type) {
            case 'warten': newBlockState.value = '1'; break;
            case 'fahre_bis_hindernis': newBlockState.value = '20'; break;
            case 'kommentar': newBlockState.value = ''; break;
            case 'if_else_abstand':
                newBlockState.value = '20';
                newBlockState.if_branch = [];
                newBlockState.else_branch = [];
                break;
            default: newBlockState.value = null; break;
        }

        // Füge den neuen Zustand in das Ziel-Array ein
        targetStateArray.splice(newIndex, 0, newBlockState);

        // Entferne das temporäre Element, das von Sortable.js aus der Palette gezogen wurde
        evt.item.remove(); 
        
        this.saveToHistory();
        this.updateUI(); 
    },

    handleBlockMove(evt, stateArray) {
        const [movedBlock] = stateArray.splice(evt.oldIndex, 1);
        stateArray.splice(evt.newIndex, 0, movedBlock);
        
        this.saveToHistory();
        this.updateUI(); // Re-render to reflect the move, especially if styles depend on order
    },

    findBlockAndParent(blockId, searchArray = this.state, parentArray = null) { // parentArray can be initially null
        if (!parentArray) parentArray = this.state; // Default to top-level state if no parent passed

        for (let i = 0; i < searchArray.length; i++) {
            const block = searchArray[i];
            if (block.id === blockId) {
                return { block, parent: parentArray, index: i };
            }
            if (block.type === 'if_else_abstand') {
                let found = this.findBlockAndParent(blockId, block.if_branch, block.if_branch);
                if (found) return found;
                found = this.findBlockAndParent(blockId, block.else_branch, block.else_branch);
                if (found) return found;
            }
        }
        return null;
    },

    deleteBlock(blockId) {
        const result = this.findBlockAndParent(blockId);
        if (result) {
            result.parent.splice(result.index, 1);
            this.saveToHistory();
            this.updateUI();
        }
    },

    duplicateBlock(blockId) {
        const result = this.findBlockAndParent(blockId);
        if (result) {
            const newBlock = JSON.parse(JSON.stringify(result.block)); // Deep copy
            
            const assignNewIds = (b) => {
                b.id = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                if (b.type === 'if_else_abstand') {
                    if(b.if_branch) b.if_branch.forEach(assignNewIds);
                    if(b.else_branch) b.else_branch.forEach(assignNewIds);
                }
            }
            assignNewIds(newBlock);

            result.parent.splice(result.index + 1, 0, newBlock);
            this.saveToHistory();
            this.updateUI();
        }
    },

    updateBlockValue(blockId, value) {
        const result = this.findBlockAndParent(blockId);
        if (result && result.block.value !== value) {
            result.block.value = value;
            // For textareas or inputs that might change frequently, avoid full history save on every keystroke
            // Consider debouncing or saving on 'change' event instead of 'input' if performance is an issue.
            // For now, keeping it simple:
            this.saveToHistory(); 
            this.generateCode(); // Only regenerate code, UI for this block might already be updated by direct input
        }
    },

    createBlockElement(block) { // Removed stateArray, not used
        const el = document.createElement('div');
        el.className = 'programm-block';
        el.dataset.type = block.type;
        el.dataset.id = block.id;

        let contentHTML = '';
        // Ensure block.value is treated as a string for replace, and handle null/undefined
        const strValue = String(block.value || '');
        const numValue = parseFloat(strValue.replace(',', '.'));
        // Validate only if it's supposed to be a number (e.g., for 'warten' or 'fahre_bis_hindernis')
        let isValid = true;
        if (block.type === 'warten' || block.type === 'fahre_bis_hindernis' || block.type === 'if_else_abstand') {
            isValid = !isNaN(numValue) && numValue >= 0;
        }


        switch (block.type) {
            case 'warten':
                contentHTML = `warten(<input type="text" class="warten-input ${isValid ? '' : 'invalid'}" value="${block.value || '1'}"> s);`;
                break;
            case 'fahre_bis_hindernis':
                contentHTML = `fahre_bis_hindernis(<input type="text" class="warten-input ${isValid ? '' : 'invalid'}" value="${block.value || '20'}"> cm);`;
                break;
            case 'kommentar':
                contentHTML = `<textarea class="kommentar-textarea" placeholder="Dein Kommentar...">${block.value || ''}</textarea>`;
                break;
            case 'if_else_abstand':
                contentHTML = `
                    <div class="if-else-container">
                        <div class="if-else-header">
                            WENN <code>messe_abstand_cm()</code> < <input type="text" class="warten-input ${isValid ? '' : 'invalid'}" value="${block.value || '20'}"> cm DANN
                        </div>
                        <div class="if-branch">
                            <div class="branch-header">{ <!-- DANN-Zweig --> </div>
                            <div class="nested-dropzone if-body"></div>
                        </div>
                        <div class="else-branch">
                            <div class="branch-header">} SONST { <!-- SONST-Zweig --> </div>
                            <div class="nested-dropzone else-body"></div>
                        </div>
                    </div>`;
                break;
            default:
                contentHTML = `${block.type}();`;
        }

        el.innerHTML = `
            <i class="fa-solid fa-grip-vertical handle"></i>
            <div class="content">${contentHTML}</div>
            <div class="actions">
                <button class="duplicate-btn" title="Duplizieren"><i class="fa-regular fa-copy"></i></button>
                <button class="delete-btn" title="Löschen"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;

        el.querySelector('.delete-btn').addEventListener('click', () => this.deleteBlock(block.id));
        el.querySelector('.duplicate-btn').addEventListener('click', () => this.duplicateBlock(block.id));
        
        const input = el.querySelector('.warten-input, .kommentar-textarea');
        if (input) {
            // Use 'change' for final value update to save history, 'input' for live validation
            input.addEventListener('change', () => this.updateBlockValue(block.id, input.value));
            if (input.classList.contains('warten-input')) {
                input.addEventListener('input', () => {
                    const currentNumVal = parseFloat(input.value.replace(',', '.'));
                    input.classList.toggle('invalid', isNaN(currentNumVal) || currentNumVal < 0);
                });
            }
        }
        
        if (block.type === 'if_else_abstand') {
            const ifBody = el.querySelector('.if-body');
            const elseBody = el.querySelector('.else-body');
            // Ensure block.if_branch and block.else_branch are arrays
            block.if_branch = block.if_branch || [];
            block.else_branch = block.else_branch || [];

            this.initSortable(ifBody, block.if_branch);
            this.initSortable(elseBody, block.else_branch);
            
            this.renderBlocks(ifBody, block.if_branch);
            this.renderBlocks(elseBody, block.else_branch);
        }
        return el;
    },

    clearProgram() {
        if (this.state.length > 0 && confirm("Möchtest du das gesamte Programm wirklich unwiderruflich löschen?")) {
            this.state = [];
            this.saveToHistory();
            this.updateUI();
             this.showToast('Programm gelöscht.', 'warning');
        }
    },

    loadExample(key) {
        if (this.state.length > 0 && !confirm("Dein aktuelles Programm wird durch das Beispiel ersetzt. Fortfahren?")) return;
        
        // Deep copy example to avoid modifying the original EXAMPLES object
        this.state = JSON.parse(JSON.stringify(EXAMPLES[key]));
        
        // Ensure all blocks in the example have unique IDs
        const assignNewIdsToExample = (blocks) => {
            blocks.forEach(b => {
                b.id = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                if (b.type === 'if_else_abstand') {
                    if(b.if_branch) assignNewIdsToExample(b.if_branch);
                    if(b.else_branch) assignNewIdsToExample(b.else_branch);
                }
            });
        };
        assignNewIdsToExample(this.state);

        this.saveToHistory();
        this.updateUI();
        this.showToast(`Beispiel "${key}" geladen.`, 'success');
    },

    saveToLocalStorage() {
        localStorage.setItem('roboterProgramm_v4.0_cyberLuxe', JSON.stringify(this.state)); // Use a new key for the new version
        this.showToast('Programm im Browser gespeichert!', 'success');
    },

    loadFromLocalStorage(fromButtonClick = false) {
        const saved = localStorage.getItem('roboterProgramm_v4.0_cyberLuxe');
        if (saved) {
            const savedState = JSON.parse(saved);
            if (fromButtonClick && this.state.length > 0 && !confirm("Gespeichertes Programm laden? Alle aktuellen Änderungen gehen verloren.")) return;
            this.state = savedState;
            if(fromButtonClick) {
                this.saveToHistory(); // Add loaded state to history
                this.updateUI();
                this.showToast('Programm aus Speicher geladen.', 'success');
            } else {
                // For initial load, don't show toast, just update UI after history is set in init
                 this.updateUI(); // Ensure UI reflects loaded state on initial load
            }
        } else if (fromButtonClick) {
            this.showToast('Kein gespeichertes Programm gefunden.', 'error');
        }
    },

    generateCode() {
        if (!this.els.codeOutput) return;
        
        const loopType = document.querySelector('input[name="loop-type"]:checked').value;
        let codeLines = this.generateCodeRecursive(this.state, '  ');

        if(this.state.length === 0 && (!this.state.if_branch || this.state.if_branch.length === 0) && (!this.state.else_branch || this.state.else_branch.length === 0)) {
             codeLines = "  // Programm ist leer. Ziehe Bausteine in den Programmbereich.";
        }


        const setupCode = loopType === 'setup' ? codeLines : '  // Nichts im Setup definiert (Code in loop).';
        const loopCode = loopType === 'loop' ? codeLines : '  // Nichts im Loop definiert (Code in setup).';

        const finalCode = 
`#include "fahrfunktionen.h" // Annahme: Diese Datei enthält die Roboterfunktionen

// Pin-Definitionen (Beispielhaft, anpassen falls notwendig)
// const int trigPin = D1; // Beispiel für ESP8266/NodeMCU
// const int echoPin = D2; // Beispiel für ESP8266/NodeMCU
// Annahme: HCSR04 Objekt ist global verfügbar oder wird hier initialisiert

void setup() {
  Serial.begin(9600);
  Serial.println("Roboter-Auto Cyber-Luxe Edition startklar.");
  HCSR04.begin(trigPin, echoPin); // Initialisierung des Sensors, falls verwendet

${setupCode}

  Serial.println("Setup beendet.");
}

void loop() {
${loopCode}
  // delay(100); // Kleiner Delay im Loop, falls er kontinuierlich läuft und viele Befehle hat
}`;
        this.els.codeOutput.textContent = finalCode;
        if (window.Prism) { // Check if Prism is loaded
            Prism.highlightElement(this.els.codeOutput);
        }
    },

    generateCodeRecursive(stateArray, indent) {
        if (!stateArray || stateArray.length === 0) return `${indent}// Leerer Block`;

        return stateArray.map(block => {
            const value = block.value || '';
            const strValue = String(value); // Ensure value is a string for replace
            const numValue = parseFloat(strValue.replace(',', '.'));
             let isValid = true; // Default to true for non-numeric types

            if (block.type === 'warten' || block.type === 'fahre_bis_hindernis' || block.type === 'if_else_abstand') {
                 isValid = !isNaN(numValue) && numValue >= 0;
            }

            switch (block.type) {
                case 'warten':
                    return isValid ? `${indent}warten(${numValue}); // ${value}s` : `${indent}// FEHLER: Ungültiger Wert für warten(): "${value}"`;
                case 'fahre_bis_hindernis':
                     return isValid ? `${indent}fahre_bis_hindernis(${parseInt(numValue)}); // Bis ${value}cm` : `${indent}// FEHLER: Ungültiger Wert für fahre_bis_hindernis(): "${value}"`;
                case 'kommentar':
                    return value.split('\n').map(line => `${indent}// ${line}`).join('\n');
                case 'if_else_abstand':
                    const condition = isValid ? `if (messe_abstand_cm() < ${parseInt(numValue)})` : `// FEHLER: Ungültige Bedingung für Abstand mit Wert "${value}"`;
                    const ifCode = this.generateCodeRecursive(block.if_branch || [], indent + '  ');
                    const elseCode = this.generateCodeRecursive(block.else_branch || [], indent + '  ');
                    return [
                        `${indent}${condition} {`,
                        ifCode,
                        `${indent}} else {`,
                        elseCode,
                        `${indent}}`
                    ].join('\n');
                default:
                    return `${indent}${block.type}();`;
            }
        }).join('\n');
    },

    showToast(message, type = 'info') {
        if (!this.els.toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        this.els.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => RoboProgrammer.init());
