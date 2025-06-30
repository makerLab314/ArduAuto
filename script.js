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

            // If the slider is active and corresponds to this block, update it
            if (this.currentTimeInput && this.currentTimeInput.closest('.programm-block')?.dataset.id === blockId) {
                const numericValue = parseFloat(String(value).replace(',', '.')) || 0;
                this.updateSliderFromValue(numericValue);
            }
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

            // Show time slider on click for relevant inputs
            if (input.classList.contains('warten-input') && (block.type === 'warten' /*|| block.type === 'another_time_block'*/)) {
                input.addEventListener('click', (e) => {
                    // Prevent click from propagating to document listener if slider is already open for this input
                    if (this.timeSliderElement && this.timeSliderElement.style.display === 'flex' && this.currentTimeInput === e.target) {
                        // Potentially allow click on input to also close, or do nothing
                        // For now, let document click handle closing if it's not this input.
                        return;
                    }
                    this.showTimeSlider(e.target);
                });
                input.addEventListener('focus', (e) => { // Also show on focus for accessibility / keyboard nav
                    this.showTimeSlider(e.target);
                });
            }
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
  HCSR04.begin(trigPin, echoPin);

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

    // --- Time Slider Logic ---
    currentTimeInput: null, // Reference to the input field being edited
    timeSliderElement: null,
    timeSliderThumb: null,
    timeSliderText: null,
    isDraggingSlider: false,
    sliderRadius: 90, // half of track width (180px / 2) - thumb/border considerations might adjust this

    initTimeSlider() {
        if (!this.timeSliderElement) {
            this.timeSliderElement = document.createElement('div');
            this.timeSliderElement.className = 'time-slider-popup';
            this.timeSliderElement.innerHTML = `
                <div class="time-slider-track">
                    <!-- Markers will be added here by JS -->
                </div>
                <div class="time-slider-thumb"></div>
                <div class="time-slider-center-text">
                    0.00 <span>seconds</span>
                </div>
            `;
            document.body.appendChild(this.timeSliderElement);
            this.timeSliderThumb = this.timeSliderElement.querySelector('.time-slider-thumb');
            this.timeSliderText = this.timeSliderElement.querySelector('.time-slider-center-text');
            const trackElement = this.timeSliderElement.querySelector('.time-slider-track');

            // Add markers
            const maxValue = 60; // Max seconds for one full circle
            const trackRadius = 90; // Outer radius of the track div (180px / 2)
            const trackBorderWidth = 10; // As defined in CSS for .time-slider-track border
            // Effective radius for marker placement (center of the visible track border)
            const markerPlacementRadius = trackRadius - (trackBorderWidth / 2);

            for (let s = 0; s < maxValue; s += 0.5) {
                const marker = document.createElement('div');
                const isZeroMark = (s === 0);
                marker.className = 'time-slider-marker ' + (isZeroMark ? 'zero' : 'half-second');

                const angleDeg = (s / maxValue * 360) - 90; // -90 to make 0s at 12 o'clock

                // The marker's own height is its length (15px for zero, 8px for half-second)
                // The marker's own width is its thickness (3px for zero, 1px for half-second)
                const markerLength = isZeroMark ? 15 : 8;
                const markerThickness = isZeroMark ? 3 : 1;

                // Style the marker itself (size is from CSS, but we need for calculations)
                marker.style.width = `${markerThickness}px`;
                marker.style.height = `${markerLength}px`;

                // Position the marker's top-left corner at the center of the track element.
                // Then use transforms to move and rotate it.
                // The trackElement is 180x180. Its center is (90,90).
                // The popup is 200x200. Its center is (100,100). Markers are added to trackElement.
                marker.style.position = 'absolute';
                marker.style.left = `calc(50% - ${markerThickness / 2}px)`; // Center the marker horizontally
                marker.style.top = `calc(50% - ${markerLength / 2}px)`;   // Center the marker vertically

                // Now, apply transforms:
                // 1. Rotate it to the correct angle.
                // 2. Translate it outwards along its new Y-axis (which was its original Y-axis before rotation)
                //    by `markerPlacementRadius`.
                // The CSS transform-origin for .time-slider-marker is `0 50%` (left edge, vertical center).
                // Let's change it or work with it.
                // If we use `transform-origin: center center` for the marker itself:
                marker.style.transformOrigin = 'center center';
                // Translate its center to the markerPlacementRadius, then rotate.
                // translateY pushes it "up" relative to its own orientation.
                // We want to push it radially from the main circle's center.

                // Simpler:
                // 1. Place marker at center of track div.
                // 2. Set its transform-origin to `center bottom` (center of its bottom edge).
                // 3. Translate it UP by `markerPlacementRadius`. This puts its bottom edge on the circle.
                // 4. Rotate it by `angleDeg`.
                marker.style.transformOrigin = `${markerThickness/2}px ${markerLength}px`; // Center bottom
                marker.style.transform = `translate(0, -${markerPlacementRadius}px) rotate(${angleDeg}deg)`;

                // The above is if the marker was "standing up" and we moved its base.
                // Our CSS has transform-origin: 0 50% (left side, vertical middle of the line)
                // And the marker's "length" is its CSS height.
                // Let's use the CSS defined origin.
                // marker.style.left = '50%'; // Place left edge at horizontal center
                // marker.style.top = `calc(50% - ${markerThickness / 2}px)`; // Vertically center its thickness
                // marker.style.transform = `translateX(${markerPlacementRadius}px) rotate(${angleDeg}deg)`;
                // This should rotate around the point (50%, 50% of its own height)
                // and that point should be on the markerPlacementRadius circle.

                // Recalculate with CSS origin `0 50%` (left edge, vertical center of the line)
                // The marker has width (thickness) and height (length).
                // We want the point (0, markerLength/2) of the marker to be at `markerPlacementRadius` at `angleDeg`.
                const originXOffset = 0; // from its own left
                const originYOffset = markerLength / 2; // from its own top

                // Calculate position for the marker's top-left corner
                const rotationRad = angleDeg * Math.PI / 180;
                const markerTopLeftX = (trackElement.offsetWidth / 2) + markerPlacementRadius * Math.cos(rotationRad) - originXOffset * Math.cos(rotationRad) + originYOffset * Math.sin(rotationRad);
                const markerTopLeftY = (trackElement.offsetHeight / 2) + markerPlacementRadius * Math.sin(rotationRad) - originYOffset * Math.cos(rotationRad) - originXOffset * Math.sin(rotationRad);

                marker.style.left = `${markerTopLeftX - markerThickness/2}px`; // Adjust because origin is left, but visually we want center of thickness
                marker.style.top = `${markerTopLeftY}px`; // This is the top for the origin point.
                // This is getting complicated. Let's use absolute positioning and direct rotation.

                // Final simplified marker positioning:
                // Markers are children of .time-slider-track (180x180). Center is (90,90).
                // CSS for marker: position:absolute, transform-origin: 0 50% (left edge, vertical center)
                // The marker's visual "line" is its height.
                // We want the marker's origin point to sit on the `markerPlacementRadius` circle.
                // And the marker should be rotated to be radial.

                const finalAngleDeg = angleDeg + 90; // Add 90 because line is vertical (height), rotation is from horizontal X-axis

                // Position the marker's origin point (its left-center)
                const originX = (trackElement.offsetWidth / 2) + markerPlacementRadius * Math.cos(finalAngleDeg * Math.PI / 180);
                const originY = (trackElement.offsetHeight / 2) + markerPlacementRadius * Math.sin(finalAngleDeg * Math.PI / 180);

                // Set the marker's top-left based on its origin
                // marker.style.left = `${originX}px`; // This is where its left edge should be
                // marker.style.top = `${originY - (markerLength / 2)}px`; // Adjust for vertical centering of origin

                // Correct approach: Position the div, then rotate it.
                // Div is `markerThickness` wide, `markerLength` high.
                // Place its top-left corner.
                // The line should extend inwards/outwards from the `markerPlacementRadius`.
                // Let's say marker line is centered on `markerPlacementRadius`.
                const lineCenterX = (trackElement.offsetWidth / 2) + markerPlacementRadius * Math.cos(angleDeg * Math.PI / 180);
                const lineCenterY = (trackElement.offsetHeight / 2) + markerPlacementRadius * Math.sin(angleDeg * Math.PI / 180);

                marker.style.left = `${lineCenterX - markerThickness / 2}px`;
                marker.style.top = `${lineCenterY - markerLength / 2}px`;
                marker.style.transform = `rotate(${angleDeg + 90}deg)`; // +90 because line is vertical, rotate around its center

                trackElement.appendChild(marker);
            }

            this.timeSliderThumb.addEventListener('mousedown', (e) => {
                this.isDraggingSlider = true;
                this.timeSliderThumb.style.cursor = 'grabbing';
                // Prevent text selection while dragging
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!this.isDraggingSlider || !this.currentTimeInput) return;
                this.handleSliderDrag(e);
            });

            document.addEventListener('mouseup', (e) => {
                if (this.isDraggingSlider) {
                    this.isDraggingSlider = false;
                    this.timeSliderThumb.style.cursor = 'pointer';
                    // Optional: Snap to a value or finalize
                }
            });

            // Close slider if clicked outside
            document.addEventListener('click', (e) => {
                if (this.timeSliderElement && this.timeSliderElement.style.display === 'flex') {
                    if (!this.timeSliderElement.contains(e.target) && e.target !== this.currentTimeInput) {
                        this.hideTimeSlider();
                    }
                }
            });
        }
    },

    showTimeSlider(inputElement) {
        this.initTimeSlider(); // Ensure it's created
        this.currentTimeInput = inputElement;
        const rect = inputElement.getBoundingClientRect();

        const sliderWidth = 200; // Width of .time-slider-popup
        const sliderHeight = 200; // Height of .time-slider-popup

        // Calculate desired centered position
        let left = rect.left + window.scrollX + (rect.width / 2) - (sliderWidth / 2);
        let top = rect.bottom + window.scrollY + 10; // 10px below the input field

        // Adjust if going off-screen vertically
        if (top + sliderHeight > window.innerHeight + window.scrollY) {
            top = rect.top + window.scrollY - sliderHeight - 10; // Position above input
        }
        // Adjust if going off-screen horizontally
        if (left + sliderWidth > window.innerWidth + window.scrollX) {
            left = window.innerWidth + window.scrollX - sliderWidth - 5; // 5px padding from right edge
        }
        if (left < 5) { // 5px padding from left edge
            left = 5;
        }

        this.timeSliderElement.style.top = `${top}px`;
        this.timeSliderElement.style.left = `${left}px`;
        this.timeSliderElement.style.display = 'flex';

        let value = parseFloat(String(inputElement.value).replace(',', '.')) || 0;
        if (value < 0) value = 0;
        this.updateSliderFromValue(value);
    },

    hideTimeSlider() {
        if (this.timeSliderElement) {
            this.timeSliderElement.style.display = 'none';
        }
        this.currentTimeInput = null;
    },

    updateSliderFromValue(seconds) {
        // Max value for slider, e.g., 60 seconds for a full circle
        const maxValue = 60;
        let angle = (seconds % maxValue) / maxValue * 360; // Angle in degrees

        // Correct for 0 degrees being at 3 o'clock, we want 12 o'clock
        angle = (angle - 90 + 360) % 360;


        const thumbRadius = this.sliderRadius - 10; // Center of the track (180/2 - 10 border)
        const x = thumbRadius * Math.cos(angle * Math.PI / 180);
        const y = thumbRadius * Math.sin(angle * Math.PI / 180);

        // Thumb position is relative to slider center (100,100 for a 200x200 slider)
        // and thumb is 30x30, so offset by half its size (15) to center it.
        this.timeSliderThumb.style.left = `${100 + x - 15}px`;
        this.timeSliderThumb.style.top = `${100 + y - 15}px`;

        const displaySeconds = seconds.toFixed(2);
        this.timeSliderText.innerHTML = `${displaySeconds} <span>seconds</span>`;

        if (this.currentTimeInput) {
             // Update input field if it's not already the source of this change
            if (parseFloat(String(this.currentTimeInput.value).replace(',', '.')) !== seconds) {
                 this.currentTimeInput.value = displaySeconds.replace('.', ','); // Use comma for German locale
            }
        }
    },

    handleSliderDrag(event) {
        const sliderRect = this.timeSliderElement.getBoundingClientRect();
        const centerX = sliderRect.left + sliderRect.width / 2;
        const centerY = sliderRect.top + sliderRect.height / 2;

        const deltaX = event.clientX - centerX;
        const deltaY = event.clientY - centerY;

        let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI); // Angle in degrees
        angle = (angle + 90 + 360) % 360; // Adjust so 0 degrees is at 12 o'clock

        const maxValue = 60; // Max seconds for one full circle
        let value = (angle / 360) * maxValue;

        // Add support for multiple rotations if needed, or cap at maxValue
        // For now, simple 0-60 seconds mapping

        // Snapping logic
        const snapInterval = 0.5; // Snap every 0.5 seconds
        const zeroSnapThreshold = 0.25; // Larger threshold for snapping to 0

        if (value < zeroSnapThreshold || value > maxValue - zeroSnapThreshold) {
            value = 0;
        } else {
            value = Math.round(value / snapInterval) * snapInterval;
        }

        value = parseFloat(value.toFixed(2)); // Ensure two decimal places

        this.updateSliderFromValue(value);

        // Update the input field directly
        if (this.currentTimeInput) {
            const blockId = this.currentTimeInput.closest('.programm-block')?.dataset.id;
            if (blockId) {
                // We call updateBlockValue which will also save to history
                this.updateBlockValue(blockId, value.toString().replace('.', ','));
            } else {
                 // Fallback if no blockId (e.g. if slider used elsewhere)
                this.currentTimeInput.value = value.toString().replace('.', ',');
            }
        }
    },

    copyCode() {
        const codeToCopy = this.els.codeOutput.textContent;
        navigator.clipboard.writeText(codeToCopy).then(() => {
            const originalButtonText = this.els.copyBtn.innerHTML;
            this.els.copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Kopiert!</span>';
            this.els.copyBtn.classList.add('copied');
            this.showToast('Code in die Zwischenablage kopiert!', 'success');

            setTimeout(() => {
                this.els.copyBtn.innerHTML = originalButtonText;
                this.els.copyBtn.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Fehler beim Kopieren des Codes: ', err);
            this.showToast('Fehler beim Kopieren.', 'error');
        });
    },
    showToast(message, type = 'info') { /* ... unverändert ... */ }
};

document.addEventListener('DOMContentLoaded', () => RoboProgrammer.init());
