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

        // Palette initialisieren (unverändert)
        this.els.paletteKategorien.forEach(kategorie => {
            new Sortable(kategorie, {
                group: { name: 'shared', pull: 'clone', put: false },
                sort: false,
                draggable: '.baustein'
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
        container.innerHTML = '';
        stateArray.forEach((block, index) => {
            const blockEl = this.createBlockElement(block, stateArray);
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
            id: `block_${Date.now()}_${Math.random()}`,
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

        // Entferne das temporäre Element
        evt.item.remove();
        
        this.saveToHistory();
        this.updateUI(); // Da die DOM-Struktur komplex ist, rendern wir sicherheitshalber alles neu.
    },

    handleBlockMove(evt, stateArray) {
        // Verschiebe das Element im Zustands-Array
        const [movedBlock] = stateArray.splice(evt.oldIndex, 1);
        stateArray.splice(evt.newIndex, 0, movedBlock);
        
        this.saveToHistory();
        this.updateUI();
    },

    // REKURSIVE Suchfunktion, um einen Block und sein Eltern-Array zu finden
    findBlockAndParent(blockId, searchArray = this.state, parentArray = this.state) {
        for (let i = 0; i < searchArray.length; i++) {
            const block = searchArray[i];
            if (block.id === blockId) {
                return { block, parent: parentArray, index: i };
            }
            // Rekursiver Abstieg in die If/Else-Zweige
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
            // Tiefenkopie des Blocks erstellen
            const newBlock = JSON.parse(JSON.stringify(result.block));
            
            // Rekursive Funktion zur Vergabe neuer IDs
            const assignNewIds = (b) => {
                b.id = `block_${Date.now()}_${Math.random()}`;
                if (b.type === 'if_else_abstand') {
                    b.if_branch.forEach(assignNewIds);
                    b.else_branch.forEach(assignNewIds);
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
            this.saveToHistory();
            // Nur Code neu generieren, kein komplettes UI-Update nötig
            this.generateCode();
        }
    },

    createBlockElement(block, stateArray) {
        const el = document.createElement('div');
        el.className = 'programm-block';
        el.dataset.type = block.type;
        el.dataset.id = block.id;

        let contentHTML = '';
        const numValue = parseFloat(String(block.value || '').replace(',', '.'));
        const isValid = !isNaN(numValue) && numValue >= 0;

        switch (block.type) {
            case 'warten':
                contentHTML = `warten(<input type="text" class="warten-input ${isValid ? '' : 'invalid'}" value="${block.value || ''}"> s);`;
                break;
            case 'fahre_bis_hindernis':
                contentHTML = `fahre_bis_hindernis(<input type="text" class="warten-input ${isValid ? '' : 'invalid'}" value="${block.value || ''}"> cm);`;
                break;
            case 'kommentar':
                contentHTML = `<textarea class="kommentar-textarea" placeholder="Dein Kommentar...">${block.value || ''}</textarea>`;
                break;
            case 'if_else_abstand':
                contentHTML = `
                    <div class="if-else-container">
                        <div class="if-else-header">
                            WENN <code>messe_abstand_cm()</code> < <input type="text" class="warten-input ${isValid ? '' : 'invalid'}" value="${block.value || ''}"> cm DANN
                        </div>
                        <div class="if-branch">
                            <div class="branch-header">{ // DANN-Zweig</div>
                            <div class="nested-dropzone if-body"></div>
                        </div>
                        <div class="else-branch">
                            <div class="branch-header">} SONST { // SONST-Zweig</div>
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
            input.addEventListener('change', () => this.updateBlockValue(block.id, input.value));
            input.addEventListener('input', () => {
                if (input.classList.contains('warten-input')) {
                    const num = parseFloat(input.value.replace(',', '.'));
                    input.classList.toggle('invalid', isNaN(num) || num < 0);
                }
            });
        }
        
        // Wenn es ein If/Else-Block ist, initialisiere seine inneren Dropzones
        if (block.type === 'if_else_abstand') {
            const ifBody = el.querySelector('.if-body');
            const elseBody = el.querySelector('.else-body');
            this.initSortable(ifBody, block.if_branch);
            this.initSortable(elseBody, block.else_branch);
            // Rendere die Kinder rekursiv
            this.renderBlocks(ifBody, block.if_branch);
            this.renderBlocks(elseBody, block.else_branch);
        }

        return el;
    },

    // --- Programm-Aktionen ---

    clearProgram() {
        if (this.state.length > 0 && confirm("Möchtest du das gesamte Programm wirklich unwiderruflich löschen?")) {
            this.state = [];
            this.saveToHistory();
            this.updateUI();
        }
    },

    loadExample(key) {
        if (this.state.length > 0 && !confirm("Dein aktuelles Programm wird durch das Beispiel ersetzt. Fortfahren?")) return;
        this.state = JSON.parse(JSON.stringify(EXAMPLES[key]));
        this.saveToHistory();
        this.updateUI();
        this.showToast(`Beispiel "${key}" geladen.`, 'success');
    },

    saveToLocalStorage() {
        localStorage.setItem('roboterProgramm_v4.0', JSON.stringify(this.state));
        this.showToast('Programm im Browser gespeichert!', 'success');
    },

    loadFromLocalStorage(fromButtonClick = false) {
        const saved = localStorage.getItem('roboterProgramm_v4.0');
        if (saved) {
            const savedState = JSON.parse(saved);
            if (fromButtonClick && this.state.length > 0 && !confirm("Gespeichertes Programm laden? Alle aktuellen Änderungen gehen verloren.")) return;
            this.state = savedState;
            // Wichtig: Beim ersten Laden nicht in die History pushen, das macht init()
            if(fromButtonClick) {
                this.saveToHistory();
                this.updateUI();
                this.showToast('Programm aus Speicher geladen.', 'success');
            }
        } else if (fromButtonClick) {
            this.showToast('Kein gespeichertes Programm gefunden.', 'error');
        }
    },

    // --- Code-Generierung (jetzt rekursiv) ---

    generateCode() {
        if (!this.els.codeOutput) return;
        
        const loopType = document.querySelector('input[name="loop-type"]:checked').value;
        let codeLines = this.generateCodeRecursive(this.state, '  ');

        if(this.state.length === 0) {
            codeLines = "// Programm ist leer. Ziehe Bausteine in den Programmbereich.";
        }

        const setupCode = loopType === 'setup' ? codeLines : '// Nichts im Setup.';
        const loopCode = loopType === 'loop' ? codeLines : '// Bleibt leer, Programm läuft nur einmal im Setup.';

        const finalCode = 
`#include "fahrfunktionen.h"

void setup() {
  Serial.begin(9600);
  Serial.println("Roboter-Auto startklar.");

${setupCode}

  Serial.println("Setup beendet.");
}

void loop() {
${loopCode}
}`;
        this.els.codeOutput.textContent = finalCode;
        Prism.highlightElement(this.els.codeOutput);
    },

    generateCodeRecursive(stateArray, indent) {
        return stateArray.map(block => {
            const value = block.value || '';
            const numValue = parseFloat(String(value).replace(',', '.'));
            const isValid = !isNaN(numValue) && numValue >= 0;

            switch (block.type) {
                case 'warten':
                    return isValid ? `${indent}warten(${value.replace(',', '.')});` : `${indent}// FEHLER: Ungültiger Wert für warten(): "${value}"`;
                case 'fahre_bis_hindernis':
                     return isValid ? `${indent}fahre_bis_hindernis(${parseInt(numValue)});` : `${indent}// FEHLER: Ungültiger Wert für fahre_bis_hindernis(): "${value}"`;
                case 'kommentar':
                    return value.split('\n').map(line => `${indent}// ${line}`).join('\n');
                case 'if_else_abstand':
                    const condition = isValid ? `if (messe_abstand_cm() < ${parseInt(numValue)})` : `// FEHLER: Ungültige Bedingung mit Wert "${value}"`;
                    const ifCode = this.generateCodeRecursive(block.if_branch, indent + '  ');
                    const elseCode = this.generateCodeRecursive(block.else_branch, indent + '  ');
                    return [
                        `${indent}${condition} {`,
                        ifCode,
                        `${indent}} else {`,
                        elseCode,
                        `${indent}}`
                    ].filter(line => line.trim() !== '').join('\n'); // Leere Zweige ausfiltern
                default:
                    return `${indent}${block.type}();`;
            }
        }).join('\n');
    },

    // --- Hilfsfunktionen (unverändert) ---
    copyCode() { /* ... unverändert von der letzten Version ... */ },
    showToast(message, type = 'info') { /* ... unverändert ... */ }
};

document.addEventListener('DOMContentLoaded', () => RoboProgrammer.init());