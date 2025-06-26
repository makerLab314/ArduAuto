// Definition der Beispiel-Programme
const EXAMPLES = {
    quadrat: [
        { type: 'kommentar', value: 'Ein Quadrat fahren: 1. Seite' },
        { type: 'vorwaerts_schnell', value: null }, { type: 'warten', value: '1.5' }, { type: 'stopp', value: null },
        { type: 'kommentar', value: 'Um 90 Grad drehen' },
        { type: 'drehe_rechts', value: null }, { type: 'warten', value: '0.8' }, { type: 'stopp', value: null },
        { type: 'kommentar', value: '2. Seite' },
        { type: 'vorwaerts_schnell', value: null }, { type: 'warten', value: '1.5' }, { type: 'stopp', value: null },
        // ... kann vervollständigt werden
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
    // DOM-Elemente
    els: {},
    // Programm-Zustand
    state: [],
    history: [],
    historyIndex: -1,

    init() {
        this.cacheDOMElements();
        this.initSortable();
        this.addEventListeners();
        this.loadFromLocalStorage();
        this.update();
    },

    cacheDOMElements() {
        this.els.palette = document.getElementById('baustein-palette');
        this.els.dropzone = document.getElementById('programm-ablauf');
        this.els.undoBtn = document.getElementById('undo-btn');
        this.els.redoBtn = document.getElementById('redo-btn');
        this.els.generateBtn = document.getElementById('generate-btn');
        this.els.clearBtn = document.getElementById('clear-btn');
        this.els.saveBtn = document.getElementById('save-btn');
        this.els.loadBtn = document.getElementById('load-btn');
        this.els.copyBtn = document.getElementById('copy-btn');
        this.els.codeOutput = document.getElementById('code-output');
        this.els.exampleLinks = document.querySelectorAll('.dropdown-content a');
    },
    
    initSortable() {
        // Sortable für die Baustein-Palette (Klonen)
        new Sortable(this.els.palette, {
            group: { name: 'shared', pull: 'clone', put: false },
            sort: false,
            animation: 150,
        });

        // Sortable für den Programm-Ablauf
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
        this.els.generateBtn.addEventListener('click', () => this.generateCode());
        this.els.saveBtn.addEventListener('click', () => this.saveToLocalStorage());
        this.els.loadBtn.addEventListener('click', () => this.loadFromLocalStorage(true));
        this.els.copyBtn.addEventListener('click', () => this.copyCode());
        
        this.els.exampleLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadExample(e.target.dataset.example);
            });
        });

        // Tastatur-Shortcuts für Undo/Redo
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undo(); }
            if (e.ctrlKey && e.key === 'y') { e.preventDefault(); this.redo(); }
        });
    },

    // --- Zustands- & History-Management ---
    
    update(options = { saveHistory: true }) {
        if (options.saveHistory) {
            this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push(JSON.parse(JSON.stringify(this.state)));
            this.historyIndex++;
        }
        this.render();
        this.updateUndoRedoButtons();
        this.generateCode();
    },
    
    render() {
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
            this.update({ saveHistory: false });
        }
    },

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.update({ saveHistory: false });
        }
    },
    
    updateUndoRedoButtons() {
        this.els.undoBtn.disabled = this.historyIndex <= 0;
        this.els.redoBtn.disabled = this.historyIndex >= this.history.length - 1;
    },

    // --- Block-Manipulation ---
    
    handleBlockAdd(evt) {
        const type = evt.item.dataset.type;
        const newBlock = { id: `block_${Date.now()}`, type, value: type === 'warten' ? '1' : null };
        this.state.splice(evt.newIndex, 0, newBlock);
        evt.item.remove(); // Entfernt den geklonten Platzhalter
        this.update();
    },

    handleBlockMove(evt) {
        const [movedBlock] = this.state.splice(evt.oldIndex, 1);
        this.state.splice(evt.newIndex, 0, movedBlock);
        this.update();
    },

    deleteBlock(index) {
        this.state.splice(index, 1);
        this.update();
    },

    duplicateBlock(index) {
        const originalBlock = this.state[index];
        const newBlock = JSON.parse(JSON.stringify(originalBlock));
        newBlock.id = `block_${Date.now()}`;
        this.state.splice(index + 1, 0, newBlock);
        this.update();
    },

    updateBlockValue(index, value) {
        this.state[index].value = value;
        // Für Werteänderungen wollen wir die History nicht für jeden Tastendruck speichern,
        // daher ein "debounced" Update oder Update bei "change"-Event
        this.update();
    },

    createBlockElement(block, index) {
        const el = document.createElement('div');
        el.className = 'programm-block';
        el.dataset.type = block.type;
        el.dataset.id = block.id;

        let contentHTML = '';
        switch (block.type) {
            case 'warten':
                const numValue = parseFloat(block.value);
                const isValid = !isNaN(numValue) && numValue >= 0;
                contentHTML = `warten(<input type="text" class="warten-input ${isValid ? '' : 'invalid'}" value="${block.value}">);`;
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

        // Event Listeners für den spezifischen Block
        el.querySelector('.delete-btn').addEventListener('click', () => this.deleteBlock(index));
        el.querySelector('.duplicate-btn').addEventListener('click', () => this.duplicateBlock(index));
        
        const input = el.querySelector('.warten-input, .kommentar-textarea');
        if (input) {
            input.addEventListener('change', () => this.updateBlockValue(index, input.value));
            input.addEventListener('input', () => { // Live-Validierung
                 if(input.classList.contains('warten-input')) {
                    const num = parseFloat(input.value);
                    input.classList.toggle('invalid', isNaN(num) || num < 0);
                 }
            });
        }
        return el;
    },

    // --- Programm-Aktionen ---

    clearProgram() {
        if (this.state.length > 0 && confirm("Möchtest du wirklich das gesamte Programm löschen?")) {
            this.state = [];
            this.update();
        }
    },

    loadExample(key) {
        if (this.state.length > 0 && !confirm("Dein aktuelles Programm wird durch das Beispiel überschrieben. Fortfahren?")) return;
        this.state = JSON.parse(JSON.stringify(EXAMPLES[key])); // Tiefe Kopie
        this.update();
        this.showToast(`Beispiel "${key}" geladen.`, 'success');
    },

    saveToLocalStorage() {
        localStorage.setItem('roboterProgramm_v3', JSON.stringify(this.state));
        this.showToast('Programm gespeichert!', 'success');
    },

    loadFromLocalStorage(fromButtonClick = false) {
        const saved = localStorage.getItem('roboterProgramm_v3');
        if (saved) {
            const savedState = JSON.parse(saved);
            if (fromButtonClick && this.state.length > 0 && !confirm("Gespeichertes Programm laden? Dein aktuelles Programm wird überschrieben.")) return;
            this.state = savedState;
            this.update();
            if(fromButtonClick) this.showToast('Programm aus Speicher geladen.', 'success');
        } else if (fromButtonClick) {
            this.showToast('Kein gespeichertes Programm gefunden.', 'error');
        }
    },

    // --- Code-Generierung & UI ---

    generateCode() {
        if (this.state.length === 0) {
            this.els.codeOutput.textContent = "// Programm ist leer.";
            Prism.highlightElement(this.els.codeOutput);
            return;
        }

        const codeLines = this.state.map(block => {
            switch (block.type) {
                case 'warten':
                    const numValue = parseFloat(block.value);
                    const isValid = !isNaN(numValue) && numValue >= 0;
                    return isValid ? `  warten(${block.value.replace(',', '.')});` : `  // FEHLER: Ungültiger Wert für warten(): ${block.value}`;
                case 'kommentar':
                    return `  // ${block.value || ''}`;
                default:
                    return `  ${block.type}();`;
            }
        }).join('\n');

        const finalCode = `#include "fahrfunktionen.h"\n\nvoid setup() {\n  Serial.begin(9600);\n  Serial.println("Roboter-Auto startklar.");\n\n${codeLines}\n\n  Serial.println("Programm beendet.");\n}\n\nvoid loop() {\n  // Bleibt leer\n}`;
        this.els.codeOutput.textContent = finalCode;
        Prism.highlightElement(this.els.codeOutput);
    },

    copyCode() {
        navigator.clipboard.writeText(this.els.codeOutput.textContent).then(() => {
            this.showToast('Code in die Zwischenablage kopiert!', 'success');
        });
    },

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.getElementById('toast-container').appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

// Startet die Anwendung, sobald die Seite geladen ist.
document.addEventListener('DOMContentLoaded', () => RoboProgrammer.init());