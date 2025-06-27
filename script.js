// Definition der Beispiel-Programme mit neuer verschachtelter Struktur
const EXAMPLES = {
    autonom: [
        { type: 'fahre_bis_hindernis', value: '15', children: [] },
        { type: 'stopp', value: null, children: [] },
        { type: 'drehe_links', value: null, children: [] },
        { type: 'warten', value: '1', children: [] },
        { type: 'kommentar', value: 'Jetzt prüfen, ob rechts frei ist', children: [] },
        { type: 'drehe_rechts', value: null, children: [] },
        { type: 'warten', value: '1', children: [] },
        { 
            type: 'if_abstand', 
            value: { operator: '>', value: '30'}, 
            children: [
                { type: 'kommentar', value: 'Weg ist frei, weiterfahren', children: [] },
                { type: 'vorwaerts_schnell', value: null, children: [] },
                { type: 'warten', value: '2', children: [] },
            ] 
        }
    ],
    //... (andere Beispiele bleiben flach)
};

const RoboProgrammer = {
    els: {},
    state: [], // Wird jetzt zu einer Baumstruktur
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
        // ... (unverändert zu V3.3)
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

    /** Initialisiert SortableJS für eine gegebene Dropzone (auch für verschachtelte) */
    initDropzone(dropzoneElement) {
        new Sortable(dropzoneElement, {
            group: 'shared',
            animation: 150,
            handle: '.handle',
            onAdd: (evt) => this.handleBlockAdd(evt),
            onUpdate: (evt) => this.handleBlockMove(evt),
        });
    },

    addEventListeners() { /* ... unverändert zu V3.3 ... */ },

    // --- Zustands- & History-Management (rekursive Helfer) ---
    
    saveToHistory() { /* ... unverändert zu V3.3 ... */ },
    
    updateUI() {
        this.renderBlocks();
        this.updateUndoRedoButtons();
        this.generateCode();
    },
    
    renderBlocks() {
        this.els.dropzone.innerHTML = '';
        this.recursiveRender(this.state, this.els.dropzone);
        // Nach dem Rendern alle (auch die neuen) verschachtelten Dropzones initialisieren
        this.els.dropzone.querySelectorAll('.nested-dropzone').forEach(nestedEl => {
            this.initDropzone(nestedEl);
        });
    },

    /** Rendert Blöcke rekursiv in ihre Elternelemente */
    recursiveRender(blocks, parentElement) {
        blocks.forEach((blockData, index) => {
            const blockEl = this.createBlockElement(blockData);
            parentElement.appendChild(blockEl);
            if (blockData.children && blockData.children.length > 0) {
                const nestedDropzone = blockEl.querySelector('.nested-dropzone');
                if (nestedDropzone) {
                    this.recursiveRender(blockData.children, nestedDropzone);
                }
            }
        });
    },

    undo() { /* ... unverändert zu V3.3 ... */ },
    redo() { /* ... unverändert zu V3.3 ... */ },
    updateUndoRedoButtons() { /* ... unverändert zu V3.3 ... */ },

    // --- Block-Manipulation (stark überarbeitet für Baumstruktur) ---

    /** Findet einen Block und seine Elter-Liste anhand der ID */
    findBlockAndParent(id, blocks = this.state, parent = null) {
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            if (block.id === id) return { block, parentList: blocks, index: i };
            if (block.children) {
                const found = this.findBlockAndParent(id, block.children, block);
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

        // 1. Block aus alter Position entfernen
        let fromList = fromParentId ? this.findBlockAndParent(fromParentId).block.children : this.state;
        const [movedBlock] = fromList.splice(evt.oldIndex, 1);

        // 2. Block an neuer Position einfügen
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
            // Rekursiv neue IDs für alle Kinder vergeben
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
            this.generateCode(); // Schnelleres Update, nur Code neu generieren
        }
    },

    createBlockElement(block) {
        const el = document.createElement('div');
        el.className = 'programm-block';
        el.dataset.type = block.type;
        el.dataset.id = block.id;

        let contentHTML;
        if (block.type === 'if_abstand') {
            const op = block.value.operator;
            contentHTML = `if (Abstand 
                <select class="if-operator">
                    <option value="<" ${op === '<' ? 'selected' : ''}><</option>
                    <option value=">" ${op === '>' ? 'selected' : ''}>></option>
                </select> 
                <input type="text" class="value-input" value="${block.value.value}">)`;
        } else if (block.type === 'fahre_bis_hindernis' || block.type === 'warten') {
            contentHTML = `${block.type}(<input type="text" class="value-input" value="${block.value || ''}">)`;
        } else {
            // ... (wie gehabt für andere Blöcke)
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
        
        el.querySelectorAll('.value-input, .if-operator').forEach(input => {
            input.addEventListener('change', () => {
                let newValue;
                if (block.type === 'if_abstand') {
                    newValue = {
                        operator: el.querySelector('.if-operator').value,
                        value: el.querySelector('.value-input').value
                    };
                } else {
                    newValue = el.querySelector('.value-input').value;
                }
                this.updateBlockValue(block.id, newValue);
            });
        });
        
        return el;
    },

    // --- Programm-Aktionen ---
    clearProgram() { /* ... unverändert zu V3.3 ... */ },
    loadExample(key) { /* ... unverändert zu V3.3 ... */ },
    saveToLocalStorage() { /* ... unverändert zu V3.3, nutzt 'roboterProgramm_v4.0' ... */ },
    loadFromLocalStorage() { /* ... unverändert zu V3.3, nutzt 'roboterProgramm_v4.0' ... */ },
    
    // --- Code-Generierung (jetzt rekursiv!) ---

    generateCode() {
        const code = this.recursiveGenerateCode(this.state, '  ');
        const finalCode = `#include "fahrfunktionen.h"\n\nvoid setup() {\n  Serial.begin(9600);\n  Serial.println("Roboter-Auto startklar.");\n\n${code}\n  Serial.println("Programm beendet.");\n}\n\nvoid loop() {\n  // Bleibt leer\n}`;
        this.els.codeOutput.textContent = finalCode;
        Prism.highlightElement(this.els.codeOutput);
    },

    recursiveGenerateCode(blocks, indent) {
        return blocks.map(block => {
            let line = indent;
            switch(block.type) {
                case 'if_abstand':
                    const condition = `if (messe_abstand_cm() ${block.value.operator} ${block.value.value}) {`;
                    const childrenCode = this.recursiveGenerateCode(block.children, indent + '  ');
                    return `${line}${condition}\n${childrenCode}\n${line}}`;
                case 'fahre_bis_hindernis':
                case 'warten':
                    line += `${block.type}(${block.value});`;
                    break;
                case 'kommentar':
                    line += `// ${block.value || ''}`;
                    break;
                default:
                    line += `${block.type}();`;
            }
            return line;
        }).join('\n');
    },

    copyCode() { /* ... unverändert zu V3.3 ... */ },
    showToast() { /* ... unverändert zu V3.3 ... */ },
};

document.addEventListener('DOMContentLoaded', () => RoboProgrammer.init());