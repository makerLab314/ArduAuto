// Definition der Beispiel-Programme mit neuer verschachtelter Struktur
const EXAMPLES = {
    autonom: [
        { id: "b1", type: 'kommentar', value: 'Fahre, bis ein Hindernis 15cm entfernt ist', children: [] },
        { id: "b2", type: 'fahre_bis_hindernis', value: '15', children: [] },
        { id: "b3", type: 'stopp', value: null, children: [] },
        { id: "b4", type: 'warten', value: '0.5', children: [] },
        { 
            id: "b5", type: 'if_abstand', 
            value: { operator: '<', value: '20'}, 
            children: [
                { id: "b6", type: 'kommentar', value: 'Hindernis ist nah, drehe um', children: [] },
                { id: "b7", type: 'drehe_links', value: null, children: [] },
                { id: "b8", type: 'warten', value: '1', children: [] },
                { id: "b9", type: 'stopp', value: null, children: [] },
            ] 
        }
    ],
    quadrat: [
        { id: "q1", type: 'vorwaerts_schnell', value: null, children: [] }, { id: "q2", type: 'warten', value: '1.5', children: [] },
        { id: "q3", type: 'drehe_rechts', value: null, children: [] }, { id: "q4", type: 'warten', value: '0.8', children: [] },
        { id: "q5", type: 'vorwaerts_schnell', value: null, children: [] }, { id: "q6", type: 'warten', value: '1.5', children: [] },
        { id: "q7", type: 'drehe_rechts', value: null, children: [] }, { id: "q8", type: 'warten', value: '0.8', children: [] },
        { id: "q9", type: 'vorwaerts_schnell', value: null, children: [] }, { id: "q10", type: 'warten', value: '1.5', children: [] },
        { id: "q11", type: 'drehe_rechts', value: null, children: [] }, { id: "q12", type: 'warten', value: '0.8', children: [] },
        { id: "q13", type: 'vorwaerts_schnell', value: null, children: [] }, { id: "q14", type: 'warten', value: '1.5', children: [] },
        { id: "q15", type: 'stopp', value: null, children: [] }
    ],
    pendel: [
        { id: "p1", type: 'vorwaerts_langsam', value: null, children: [] }, { id: "p2", type: 'warten', value: '2', children: [] },
        { id: "p3", type: 'rueckwaerts', value: null, children: [] }, { id: "p4", type: 'warten', value: '2', children: [] },
        { id: "p5", type: 'stopp', value: null, children: [] }
    ]
};

const RoboProgrammer = {
    els: {},
    state: [], // Das Programm als Baumstruktur
    history: [],
    historyIndex: -1,

    init() {
        this.cacheDOMElements();
        this.initSortable();
        this.addEventListeners();
        this.saveToHistory();
        this.loadFromLocalStorage();
        this.updateUI();
    },

    cacheDOMElements() {
        this.els = {
            kategorien: document.querySelectorAll('#baustein-palette .kategorie'),
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
        this.els.kategorien.forEach(kategorie => {
            new Sortable(kategorie, {
                group: { name: 'shared', pull: 'clone', put: false },
                sort: false,
                draggable: '.baustein'
            });
        });
        // Initialisiert nur die oberste Ebene
        this.initDropzone(this.els.dropzone);
    },

    initDropzone(dropzoneElement) {
        new Sortable(dropzoneElement, {
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
        this.recursiveRender(this.state, this.els.dropzone);
        this.els.dropzone.querySelectorAll('.nested-dropzone').forEach(nestedEl => {
            this.initDropzone(nestedEl);
        });
    },

    recursiveRender(blocks, parentElement) {
        blocks.forEach((blockData) => {
            const blockEl = this.createBlockElement(blockData);
            parentElement.appendChild(blockEl);
            // Wenn der Block Kinder hat UND ein Container-Block ist, rendere die Kinder rekursiv
            if (blockData.children && blockData.children.length >= 0 && blockData.type === 'if_abstand') {
                const nestedDropzone = blockEl.querySelector('.nested-dropzone');
                if (nestedDropzone) {
                    this.recursiveRender(blockData.children, nestedDropzone);
                }
            }
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

    // --- Block-Manipulation mit Baumstruktur ---

    findBlockAndParent(id, blocks = this.state) {
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            if (block.id === id) return { block, parentList: blocks, index: i };
            if (block.children) {
                const found = this.findBlockAndParent(id, block.children);
                if (found) return found;
            }
        }
        return null;
    },

    handleBlockAdd(evt) {
        const type = evt.item.dataset.type;
        const newIndex = evt.newIndex;
        const parentId = evt.to.dataset.parentId;

        let newBlockState;
        if (type === 'if_abstand') {
            newBlockState = { id: `block_${Date.now()}`, type, value: { operator: '<', value: '20' }, children: [] };
        } else {
            const value = type === 'fahre_bis_hindernis' ? '10' : (type === 'warten' ? '1' : null);
            newBlockState = { id: `block_${Date.now()}`, type, value, children: [] };
        }

        let targetList = this.state;
        if (parentId) {
            const parentInfo = this.findBlockAndParent(parentId);
            if (parentInfo) targetList = parentInfo.block.children;
        }

        targetList.splice(newIndex, 0, newBlockState);
        evt.item.remove();
        
        this.saveToHistory();
        this.updateUI();
    },

    handleBlockMove(evt) {
        const blockId = evt.item.dataset.id;
        const fromParentId = evt.from.dataset.parentId;
        const toParentId = evt.to.dataset.parentId;

        let fromList = fromParentId ? this.findBlockAndParent(fromParentId).block.children : this.state;
        const [movedBlock] = fromList.splice(evt.oldIndex, 1);

        let toList = toParentId ? this.findBlockAndParent(toParentId).block.children : this.state;
        toList.splice(evt.newIndex, 0, movedBlock);
        
        this.saveToHistory();
        this.updateUI();
    },

    deleteBlock(id) {
        const found = this.findBlockAndParent(id);
        if (found) {
            found.parentList.splice(found.index, 1);
            this.saveToHistory();
            this.updateUI();
        }
    },

    duplicateBlock(id) {
        const found = this.findBlockAndParent(id);
        if (found) {
            const newBlock = JSON.parse(JSON.stringify(found.block));
            const assignNewIds = (b) => {
                b.id = `block_${Date.now()}_${Math.random()}`;
                if (b.children) b.children.forEach(assignNewIds);
            };
            assignNewIds(newBlock);
            found.parentList.splice(found.index + 1, 0, newBlock);
            this.saveToHistory();
            this.updateUI();
        }
    },

    updateBlockValue(id, newValue) {
        const found = this.findBlockAndParent(id);
        if (found) {
            found.block.value = newValue;
            this.saveToHistory();
            this.generateCode();
        }
    },

    createBlockElement(block) {
        const el = document.createElement('div');
        el.className = 'programm-block';
        el.dataset.type = block.type;
        el.dataset.id = block.id;

        let contentHTML = '';
        switch(block.type) {
            case 'if_abstand':
                const op = block.value.operator;
                contentHTML = `if (Abstand 
                    <select class="if-operator">
                        <option value="<" ${op === '<' ? 'selected' : ''}><</option>
                        <option value=">" ${op === '>' ? 'selected' : ''}>></option>
                    </select> 
                    <input type="text" class="value-input" value="${block.value.value}">)`;
                break;
            case 'fahre_bis_hindernis':
            case 'warten':
                contentHTML = `${block.type}(<input type="text" class="value-input" value="${block.value || ''}">)`;
                break;
            case 'kommentar':
                 contentHTML = `<textarea class="kommentar-textarea" placeholder="Dein Kommentar...">${block.value || ''}</textarea>`;
                 break;
            default:
                contentHTML = `${block.type}();`;
        }

        el.innerHTML = `<div class="block-header">
                <i class="fa-solid fa-grip-vertical handle"></i>
                <div class="content">${contentHTML}</div>
                <div class="actions">
                    <button class="duplicate-btn" title="Duplizieren"><i class="fa-regular fa-copy"></i></button>
                    <button class="delete-btn" title="Löschen"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>`;
        
        if (block.type === 'if_abstand') {
            const nestedDropzone = document.createElement('div');
            nestedDropzone.className = 'nested-dropzone';
            nestedDropzone.dataset.parentId = block.id;
            el.appendChild(nestedDropzone);
        }

        el.querySelector('.delete-btn').addEventListener('click', () => this.deleteBlock(block.id));
        el.querySelector('.duplicate-btn').addEventListener('click', () => this.duplicateBlock(block.id));
        
        el.querySelectorAll('.value-input, .if-operator, .kommentar-textarea').forEach(input => {
            input.addEventListener('change', () => {
                let newValue;
                if (block.type === 'if_abstand') {
                    newValue = {
                        operator: el.querySelector('.if-operator').value,
                        value: el.querySelector('.value-input').value
                    };
                } else {
                    newValue = input.value;
                }
                this.updateBlockValue(block.id, newValue);
            });
        });
        
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
            this.saveToHistory();
            this.updateUI();
            if(fromButtonClick) this.showToast('Programm aus Speicher geladen.', 'success');
        } else if (fromButtonClick) {
            this.showToast('Kein gespeichertes Programm gefunden.', 'error');
        }
    },
    
    // --- Code-Generierung (rekursiv) ---
    generateCode() {
        const code = this.recursiveGenerateCode(this.state, '  ');
        const finalCode = `#include "fahrfunktionen.h"\n\nvoid setup() {\n  Serial.begin(9600);\n  Serial.println("Roboter-Auto startklar.");\n\n${code || '// Programm ist leer.'}\n\n  Serial.println("Programm beendet.");\n}\n\nvoid loop() {\n  // Bleibt leer\n}`;
        this.els.codeOutput.textContent = finalCode;
        Prism.highlightElement(this.els.codeOutput);
    },

    recursiveGenerateCode(blocks, indent) {
        return blocks.map(block => {
            let line = indent;
            const value = block.value;
            switch(block.type) {
                case 'if_abstand':
                    const condition = `if (messe_abstand_cm() ${value.operator} ${value.value}) {`;
                    const childrenCode = this.recursiveGenerateCode(block.children, indent + '  ');
                    return `${line}${condition}\n${childrenCode}\n${line}}`;
                case 'fahre_bis_hindernis':
                case 'warten':
                    line += `${block.type}(${value});`;
                    break;
                case 'kommentar':
                    return (value || '').split('\n').map(l => `${indent}// ${l}`).join('\n');
                default:
                    line += `${block.type}();`;
            }
            return line;
        }).join('\n');
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