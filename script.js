// Definition der Beispiel-Programme
const EXAMPLES = {
    quadrat: [
        { type: 'kommentar', value: 'Ein Quadrat fahren: 1. Seite' },
        { type: 'vorwaerts_schnell', value: null }, { type: 'warten', value: '1.5' }, { type: 'stopp', value: null },
        { type: 'kommentar', value: 'Um 90 Grad drehen' },
        { type: 'drehe_rechts', value: null }, { type: 'warten', value: '0.8' }, { type: 'stopp', value: null },
        { type: 'kommentar', value: '2. Seite' },
        { type: 'vorwaerts_schnell', value: null }, { type: 'warten', value: '1.5' }, { type: 'stopp', value: null },
        { type: 'kommentar', value: '3. Seite' },
        { type: 'drehe_rechts', value: null }, { type: 'warten', value: '0.8' }, { type: 'stopp', value: null },
        { type: 'kommentar', value: '4. Seite' },
        { type: 'vorwaerts_schnell', value: null }, { type: 'warten', value: '1.5' }, { type: 'stopp', value: null },
    ],
    pendel: [
        { type: 'vorwaerts_langsam', value: null }, { type: 'warten', value: '2' }, { type: 'stopp', value: null },
        { type: 'warten', value: '1' },
        { type: 'rueckwaerts', value: null }, { type: 'warten', value: '2' }, { type: 'stopp', value: null },
    ],
    tanz: [
        { type: 'drehe_links', value: null }, { type: 'warten', value: '0.5' }, { type: 'drehe_rechts', value: null },
        { type: 'warten', value: '0.5' }, { type: 'vorwaerts_schnell', value: null }, { type: 'warten', value: '0.2' },
        { type: 'rueckwaerts', value: null }, { type: 'warten', value: '0.2' }, { type: 'stopp', value: null },
    ]
};

// Haupt-Logik gekapselt in einem Objekt
const RoboProgrammer = {
    els: {},
    state: [],
    history: [],
    historyIndex: -1,

    init() {
        this.cacheDOMElements();
        this.initSortable();
        this.addEventListeners();
        
        // Initialen leeren Zustand für Undo/Redo speichern
        this.saveToHistory();
        
        this.loadFromLocalStorage();
        this.updateUI();
    },

    cacheDOMElements() {
        this.els = {
            palette: document.getElementById('baustein-palette'),
            kategorien: document.querySelectorAll('#baustein-palette .kategorie'), // Wichtig für den Fix
            dropzone: document.getElementById('programm-ablauf'),
            undoBtn: document.getElementById('undo-btn'),
            redoBtn: document.getElementById('redo-btn'),
            clearBtn: document.getElementById('clear-btn'),
            saveBtn: document.getElementById('save-btn'),
            loadBtn: document.getElementById('load-btn'),
            copyBtn: document.getElementById('copy-btn'),
            codeOutput: document.getElementById('code-output'),
            exampleLinks: document.querySelectorAll('.dropdown-content a')
        };
    },
    
    initSortable() {
        // BUGFIX: Initialisiere SortableJS auf jedem einzelnen Kategorie-Container,
        // da die `.baustein`-Elemente direkte Kinder davon sind.
        this.els.kategorien.forEach(kategorie => {
            new Sortable(kategorie, {
                group: { name: 'shared', pull: 'clone', put: false },
                sort: false,
                animation: 150,
                draggable: '.baustein' // Dies ist jetzt korrekt im Kontext
            });
        });

        // Sortable für den Programm-Ablauf (Hinzufügen und Umsortieren)
        new Sortable(this.els.dropzone, {
            group: 'shared',
            animation: 150,
            handle: '.handle',
            onAdd: (evt) => this.handleBlockAdd(evt),
            onUpdate: (evt) => this.handleBlockMove(evt),
        });
    },

    addEventListeners() {
        this.els.undoBtn.addEventListener('click', () => this.undo());
        this.els.redoBtn.addEventListener('click', () => this.redo());
        this.els.clearBtn.addEventListener('click', () => this.clearProgram());
        // generateBtn wird jetzt direkt im updateUI aufgerufen, kein extra Listener nötig.
        this.els.saveBtn.addEventListener('click', () => this.saveToLocalStorage());
        this.els.loadBtn.addEventListener('click', () => this.loadFromLocalStorage(true));
        this.els.copyBtn.addEventListener('click', () => this.copyCode());
        
        this.els.exampleLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadExample(e.target.dataset.example);
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                if (e.key === 'z') { e.preventDefault(); this.undo(); }
                if (e.key === 'y') { e.preventDefault(); this.redo(); }
            }
        });
    },

    // --- Zustands- & History-Management ---
    
    saveToHistory() {
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(JSON.parse(JSON.stringify(this.state)));
        this.historyIndex++;
    },
    
    updateUI() {
        this.renderBlocks();
        this.updateUndoRedoButtons();
        this.generateCode();
    },
    
    renderBlocks() {
        this.els.dropzone.innerHTML = '';
        this.state.forEach((block, index) => {
            const blockEl = this.createBlockElement(block, index);
            this.els.dropzone.appendChild(blockEl);
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

    // --- Block-Manipulation (Kernlogik für Drag-and-Drop) ---
    
    handleBlockAdd(evt) {
        const type = evt.item.dataset.type;
        // Erstelle das neue Zustandsobjekt für den Block
        const newBlock = { 
            id: `block_${Date.now()}_${Math.random()}`, 
            type, 
            value: type === 'warten' ? '1' : (type === 'kommentar' ? '' : null) 
        };
        // Füge das Objekt an der richtigen Stelle im Zustands-Array ein
        this.state.splice(evt.newIndex, 0, newBlock);
        
        // Entferne das temporäre DOM-Element, das SortableJS erstellt hat
        evt.item.remove();
        
        this.saveToHistory();
        this.updateUI(); // Rendert die UI basierend auf dem neuen Zustand
    },

    handleBlockMove(evt) {
        // Verschiebe den Block im Zustands-Array
        const [movedBlock] = this.state.splice(evt.oldIndex, 1);
        this.state.splice(evt.newIndex, 0, movedBlock);
        
        this.saveToHistory();
        this.updateUI();
    },

    deleteBlock(index) {
        this.state.splice(index, 1);
        this.saveToHistory();
        this.updateUI();
    },

    duplicateBlock(index) {
        const originalBlock = this.state[index];
        const newBlock = JSON.parse(JSON.stringify(originalBlock));
        newBlock.id = `block_${Date.now()}_${Math.random()}`;
        this.state.splice(index + 1, 0, newBlock);
        this.saveToHistory();
        this.updateUI();
    },

    updateBlockValue(index, value) {
        if (this.state[index]) {
            this.state[index].value = value;
            this.saveToHistory();
            this.updateUI();
        }
    },

    createBlockElement(block, index) {
        const el = document.createElement('div');
        el.className = 'programm-block';
        el.dataset.type = block.type;
        el.dataset.id = block.id;

        let contentHTML = '';
        switch (block.type) {
            case 'warten':
                const numValue = parseFloat(String(block.value || '').replace(',', '.'));
                const isValid = !isNaN(numValue) && numValue >= 0;
                contentHTML = `warten(<input type="text" class="warten-input ${isValid ? '' : 'invalid'}" value="${block.value || ''}">);`;
                break;
            case 'kommentar':
                contentHTML = `<textarea class="kommentar-textarea" placeholder="Dein Kommentar...">${block.value || ''}</textarea>`;
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

        el.querySelector('.delete-btn').addEventListener('click', () => this.deleteBlock(index));
        el.querySelector('.duplicate-btn').addEventListener('click', () => this.duplicateBlock(index));
        
        const input = el.querySelector('.warten-input, .kommentar-textarea');
        if (input) {
            input.addEventListener('change', () => this.updateBlockValue(index, input.value));
            input.addEventListener('input', () => {
                 if(input.classList.contains('warten-input')) {
                    const num = parseFloat(input.value.replace(',', '.'));
                    input.classList.toggle('invalid', isNaN(num) || num < 0);
                 }
            });
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
        localStorage.setItem('roboterProgramm_v3.2', JSON.stringify(this.state));
        this.showToast('Programm im Browser gespeichert!', 'success');
    },

    loadFromLocalStorage(fromButtonClick = false) {
        const saved = localStorage.getItem('roboterProgramm_v3.2');
        if (saved) {
            const savedState = JSON.parse(saved);
            if (fromButtonClick && this.state.length > 0 && !confirm("Gespeichertes Programm laden? Alle aktuellen Änderungen gehen verloren.")) return;
            this.state = savedState;
            this.saveToHistory();
            this.updateUI();
            if(fromButtonClick) this.showToast('Programm aus Speicher geladen.', 'success');
        } else if (fromButtonClick) {
            this.showToast('Kein gespeichertes Programm gefunden.', 'error');
        }
    },

    // --- Code-Generierung & UI ---

    generateCode() {
        if (!this.els.codeOutput) return;
        if (this.state.length === 0) {
            this.els.codeOutput.textContent = "// Programm ist leer. Ziehe Bausteine in den Programmbereich.";
        } else {
            const codeLines = this.state.map(block => {
                const value = block.value || '';
                switch (block.type) {
                    case 'warten':
                        const numValue = parseFloat(value.replace(',', '.'));
                        const isValid = !isNaN(numValue) && numValue >= 0;
                        return isValid ? `  warten(${value.replace(',', '.')});` : `  // FEHLER: Ungültiger Wert für warten(): "${value}"`;
                    case 'kommentar':
                        return value.split('\n').map(line => `  // ${line}`).join('\n');
                    default:
                        return `  ${block.type}();`;
                }
            }).join('\n');
            const finalCode = `#include "fahrfunktionen.h"\n\nvoid setup() {\n  Serial.begin(9600);\n  Serial.println("Roboter-Auto startklar.");\n\n${codeLines}\n\n  Serial.println("Programm beendet.");\n}\n\nvoid loop() {\n  // Bleibt leer\n}`;
            this.els.codeOutput.textContent = finalCode;
        }
        Prism.highlightElement(this.els.codeOutput);
    },

    copyCode() {
        navigator.clipboard.writeText(this.els.codeOutput.textContent).then(() => {
            this.showToast('Code in die Zwischenablage kopiert!', 'success');
        });
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => RoboProgrammer.init());