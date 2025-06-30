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

    updateBlockValue(blockId, value) { // Parameter 'value' is the new string value from input
        const result = this.findBlockAndParent(blockId);
        if (result && result.block.value !== value) { // Check if actual change from model's current value
            const oldValueString = result.block.value; // Model's current value before update
            result.block.value = value; // Update state model with the new string value
            this.saveToHistory();
            this.generateCode();

            const newNumericValue = parseFloat(String(value).replace(',', '.')) || 0;
            // Clamp or validate newNumericValue if needed. For now, assume it's valid (e.g. 0-60).
            // const clampedNewValue = Math.max(0, Math.min(60, newNumericValue));


            // If the time slider is visible AND it's for the block being changed:
            if (this.timeSliderElement && this.timeSliderElement.style.display === 'flex' &&
                this.currentTimeInput && this.currentTimeInput.closest('.programm-block')?.dataset.id === blockId) {

                const oldValueNumeric = parseFloat(String(oldValueString).replace(',', '.')) || 0;
                // Animate slider to this newNumericValue
                this.animateSliderToValue(newNumericValue, oldValueNumeric, 300); // 300ms duration
            } else if (this.currentTimeInput && this.currentTimeInput.closest('.programm-block')?.dataset.id === blockId) {
                // Slider is for this block but not visible.
                // If we simply call updateSliderFromValue, it updates text.
                // If we call updateThumbVisualPosition, it moves the static thumb.
                // This is probably fine, as it will be in the correct spot when next shown.
                this.updateSliderFromValue(newNumericValue);
                this.updateThumbVisualPosition(newNumericValue);
                 // Also update internal angle state
                const maxValue = 60;
                let finalDisplayAngleDeg = (newNumericValue / maxValue) * 360;
                this.currentBumpAngleRad = ((finalDisplayAngleDeg - 90 + 360) % 360) * Math.PI / 180;
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
            this.timeSliderElement.className = 'time-slider-popup'; // Stays 200x200

            // New SVG structure
            this.timeSliderElement.innerHTML = `
                <svg class="time-slider-svg" viewBox="0 0 200 200" width="200" height="200">
                    <path class="time-slider-track-path" fill="none" stroke-linecap="round"></path>
                    <circle class="time-slider-thumb-visual" r="7" style="cursor: grab;"></circle>
                </svg>
                <div class="time-slider-center-text">
                    0.00 <span>seconds</span>
                </div>
            `;
            document.body.appendChild(this.timeSliderElement);

            this.svgEl = this.timeSliderElement.querySelector('.time-slider-svg');
            this.trackPathEl = this.timeSliderElement.querySelector('.time-slider-track-path');
            this.thumbVisualEl = this.timeSliderElement.querySelector('.time-slider-thumb-visual');
            this.timeSliderText = this.timeSliderElement.querySelector('.time-slider-center-text');

            // Store SVG center and radii for path/thumb calculations
            this.svgViewBoxSize = 200;
            this.svgCenter = this.svgViewBoxSize / 2; // 100
            this.trackOuterRadius = 90;
            this.trackStrokeWidth = 10; // This will be set in CSS
            this.trackEffectiveRadius = this.trackOuterRadius - (this.trackStrokeWidth / 2); // 85 - for path generation and thumb travel

            // Initial static track path drawing (simple circle ring)
            this.drawStaticTrackPath();

            // Initial thumb positioning (e.g., at 0 seconds / 12 o'clock)
            this.updateThumbVisualPosition(0);

            // Marker creation - now append to this.timeSliderElement (the popup)
            const maxValue = 60;
            const markerPlacementRadius = this.trackEffectiveRadius;

            for (let s = 0; s < maxValue; s += 0.5) {
                const marker = document.createElement('div');
                const isZeroMark = (s === 0);
                marker.className = 'time-slider-marker ' + (isZeroMark ? 'zero' : 'half-second');
                const angleDeg = (s / maxValue * 360) - 90;
                const markerLength = isZeroMark ? 15 : 8;
                const markerThickness = isZeroMark ? 3 : 1;
                marker.style.width = `${markerThickness}px`;
                marker.style.height = `${markerLength}px`;

                const lineCenterX = this.svgCenter + markerPlacementRadius * Math.cos(angleDeg * Math.PI / 180);
                const lineCenterY = this.svgCenter + markerPlacementRadius * Math.sin(angleDeg * Math.PI / 180);
                marker.style.left = `${lineCenterX - markerThickness / 2}px`;
                marker.style.top = `${lineCenterY - markerLength / 2}px`;
                // Rotation is now applied to the marker div itself
                marker.style.transform = `rotate(${angleDeg + 90}deg)`;

                // Store the marker's own objective angle (0 @ 3 o'clock) for proximity checks
                const mathAngleRad = ((angleDeg + 90) * Math.PI / 180); // Convert visual angle back to math angle
                marker.dataset.angleRad = mathAngleRad;

                const markerLine = document.createElement('span');
                markerLine.className = 'marker-line';
                marker.appendChild(markerLine);

                this.timeSliderElement.appendChild(marker); // Append to popup
            }

            // Helper to get coordinates for mouse and touch events
            const getEventCoordinates = (ev) => {
                if (ev.touches && ev.touches.length > 0) {
                    return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
                }
                return { x: ev.clientX, y: ev.clientY };
            };

            const handleDragStart = (e) => {
                // Allow only main mouse button for mousedown, or any touch for touchstart
                if (e.type === 'mousedown' && e.button !== 0) return;
                if (this.isAnimatingFlush) return;

                this.isDraggingSlider = true;
                if (this.thumbVisualEl) this.thumbVisualEl.style.cursor = 'grabbing';

                const coords = getEventCoordinates(e);
                const svgRect = this.svgEl.getBoundingClientRect();
                const clickX = coords.x - svgRect.left;
                const clickY = coords.y - svgRect.top;
                const deltaX = clickX - this.svgCenter;
                const deltaY = clickY - this.svgCenter;
                let angleRad = Math.atan2(deltaY, deltaX);

                this.animateTrackToBump(angleRad, 200);

                e.preventDefault(); // Important for touch to prevent scrolling/zooming
            };

            const handleDocumentDrag = (e) => {
                if (!this.isDraggingSlider || !this.currentTimeInput || !this.isThumbFlushed) return;
                // Prevent scrolling during touch drag
                if (e.type === 'touchmove') {
                    e.preventDefault();
                }
                this.handleSliderDrag(getEventCoordinates(e)); // Pass extracted coords
            };

            const handleDocumentDragEnd = (e) => {
                if (this.isDraggingSlider) {
                    this.isDraggingSlider = false;
                    if (this.thumbVisualEl) this.thumbVisualEl.style.cursor = 'pointer';

                    if (this.isThumbFlushed) {
                        let finalDisplayAngleDeg = (this.currentBumpAngleRad * 180 / Math.PI);
                        finalDisplayAngleDeg = (finalDisplayAngleDeg + 90 + 360) % 360;
                        const finalValue = parseFloat(((finalDisplayAngleDeg / 360) * 60).toFixed(2));

                        this.updateThumbVisualPosition(finalValue);
                        this.animateTrackToStatic(200);
                    }
                    if (this.timeSliderElement) { // Ensure element exists
                        this.timeSliderElement.querySelectorAll('.time-slider-marker.bumping').forEach(m => m.classList.remove('bumping'));
                    }
                }
            };

            // Event listeners:
            this.thumbVisualEl.addEventListener('mousedown', handleDragStart);
            this.thumbVisualEl.addEventListener('touchstart', handleDragStart, { passive: false });

            document.addEventListener('mousemove', handleDocumentDrag);
            document.addEventListener('touchmove', handleDocumentDrag, { passive: false });

            document.addEventListener('mouseup', handleDocumentDragEnd);
            document.addEventListener('touchend', handleDocumentDragEnd);

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

    // Method to draw the static circular track path
    drawStaticTrackPath() {
        if (!this.trackPathEl) return;
        // Describes a circle path for the stroke to be applied on
        // Path: Move to top of circle, Arc to almost same spot to make a full circle
        const radius = this.trackEffectiveRadius;
        const center = this.svgCenter;
        // M x,y A rx,ry x-axis-rotation large-arc-flag sweep-flag x,y
        const d = `M ${center},${center - radius} A ${radius},${radius} 0 1 1 ${center - 0.01},${center - radius} Z`;
        this.trackPathEl.setAttribute('d', d);
    },

    // Method to update the visual thumb's position
    updateThumbVisualPosition(seconds) {
        if (!this.thumbVisualEl || typeof seconds !== 'number') return;
        const maxValue = 60;
        // Calculate angle: 0 seconds = -PI/2 (12 o'clock)
        const angleRad = ((seconds % maxValue) / maxValue * 2 * Math.PI) - (Math.PI / 2);

        const x = this.svgCenter + this.trackEffectiveRadius * Math.cos(angleRad);
        const y = this.svgCenter + this.trackEffectiveRadius * Math.sin(angleRad);

        this.thumbVisualEl.setAttribute('cx', String(x));
        this.thumbVisualEl.setAttribute('cy', String(y));
    },

    generateBumpedPathD(bumpAngleRad, currentAmplitude, bumpWidthRad = Math.PI / 4) {
        if (!this.trackPathEl) return "";
        const points = [];
        const numSegments = 72; // e.g., every 5 degrees
        const baseRadius = this.trackEffectiveRadius; // 85px

        // Compensate for the visual rotation applied during plotting when determining bump's logical center
        const effectiveBumpCenterRad = bumpAngleRad + (Math.PI / 2);

        for (let i = 0; i <= numSegments; i++) {
            const segmentAngleRad = (i / numSegments) * 2 * Math.PI; // This is Math Angle (0 @ 3 o'clock)

            let R = baseRadius;
            // Calculate angular distance to bump center (handle wrapping)
            // Both segmentAngleRad and effectiveBumpCenterRad are Math Angles.
            let angleDiff = segmentAngleRad - effectiveBumpCenterRad;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            if (Math.abs(angleDiff) < bumpWidthRad) {
                // Cosine bell shape for the bump/dent
                const normalizedDistance = Math.abs(angleDiff) / bumpWidthRad; // 0 at center, 1 at edge of bump
                const radialOffset = currentAmplitude * Math.pow(Math.cos(normalizedDistance * Math.PI / 2), 2);
                R -= radialOffset; // Subtract for an inward dent
            }

            const x = this.svgCenter + R * Math.cos(segmentAngleRad - Math.PI / 2); // Adjust for 12 o'clock start
            const y = this.svgCenter + R * Math.sin(segmentAngleRad - Math.PI / 2); // Adjust for 12 o'clock start
            points.push(`${x},${y}`);
        }
        return `M ${points[0]} L ${points.slice(1).join(' L ')} Z`;
    },

    animateTrackToBump(targetAngleRad, duration) {
        if (!this.trackPathEl) return;
        this.isAnimatingFlush = true;
        const startTime = performance.now();
        // Track Path Animation
        const startTrackAmplitude = 0;
        const endTrackAmplitude = 8; // Max dent depth
        this.currentBumpAngleRad = targetAngleRad; // Store for dragging

        // Thumb Visual Animation
        const startThumbR = parseFloat(this.thumbVisualEl.getAttribute('r')) || 7;
        const endThumbR = 2; // Shrink to this radius
        const startThumbOpacity = parseFloat(this.thumbVisualEl.style.opacity || 1);
        const endThumbOpacity = 0;
        this.thumbVisualEl.style.opacity = startThumbOpacity; // Ensure it's visible at start of JS anim

        const animateStep = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            let progress = Math.min(elapsedTime / duration, 1);
            progress = 1 - Math.pow(1 - progress, 3); // Ease-out

            // Animate Track Path
            const currentTrackAmplitude = startTrackAmplitude + (endTrackAmplitude - startTrackAmplitude) * progress;
            const d = this.generateBumpedPathD(targetAngleRad, currentTrackAmplitude);
            this.trackPathEl.setAttribute('d', d);

            // Animate Thumb Visual
            const currentThumbR = startThumbR + (endThumbR - startThumbR) * progress;
            const currentThumbOpacity = startThumbOpacity + (endThumbOpacity - startThumbOpacity) * progress;
            this.thumbVisualEl.setAttribute('r', currentThumbR);
            this.thumbVisualEl.style.opacity = currentThumbOpacity;

            if (progress < 1) {
                requestAnimationFrame(animateStep);
            } else {
                this.isAnimatingFlush = false;
                this.isThumbFlushed = true;
                this.currentBumpAmplitude = endTrackAmplitude;
                this.thumbVisualEl.style.opacity = 0; // Ensure it's fully hidden
            }
        };
        requestAnimationFrame(animateStep);
    },

    animateTrackToStatic(duration) {
        if (!this.trackPathEl || typeof this.currentBumpAmplitude === 'undefined' || this.currentBumpAmplitude === 0) {
            this.isThumbFlushed = false; // Ensure state is correct even if no animation runs
            return;
        }
        this.isAnimatingFlush = true; // Use the same flag to prevent conflicting animations
        const startTime = performance.now();
        // Track Path Animation
        const startTrackAmplitude = this.currentBumpAmplitude;
        const endTrackAmplitude = 0;
        const bumpAngleForAnimation = this.currentBumpAngleRad; // Keep bump at last angle while it flattens

        // Thumb Visual Animation (reappear)
        const startThumbR = parseFloat(this.thumbVisualEl.getAttribute('r')) || 2; // Should be small from flush anim
        const endThumbR = 7; // Default radius
        const startThumbOpacity = parseFloat(this.thumbVisualEl.style.opacity) || 0;
        const endThumbOpacity = 1;
        // cx, cy for thumbVisualEl are already set by updateThumbVisualPosition in mouseup

        const animateStep = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            let progress = Math.min(elapsedTime / duration, 1);
            progress = 1 - Math.pow(1 - progress, 3); // Ease-out

            // Animate Track Path to flat
            const currentTrackAmplitude = startTrackAmplitude + (endTrackAmplitude - startTrackAmplitude) * progress;
            const d = this.generateBumpedPathD(bumpAngleForAnimation, currentTrackAmplitude);
            this.trackPathEl.setAttribute('d', d);

            // Animate Thumb Visual to reappear
            const currentThumbR = startThumbR + (endThumbR - startThumbR) * progress;
            const currentThumbOpacity = startThumbOpacity + (endThumbOpacity - startThumbOpacity) * progress;
            this.thumbVisualEl.setAttribute('r', currentThumbR);
            this.thumbVisualEl.style.opacity = currentThumbOpacity;

            if (progress < 1) {
                requestAnimationFrame(animateStep);
            } else {
                this.drawStaticTrackPath(); // Ensure track is perfectly flat
                this.thumbVisualEl.setAttribute('r', endThumbR); // Ensure thumb is correct size
                this.thumbVisualEl.style.opacity = endThumbOpacity; // Ensure thumb is fully visible
                this.isAnimatingFlush = false;
                this.isThumbFlushed = false;
                this.currentBumpAmplitude = 0;
            }
        };
        requestAnimationFrame(animateStep);
    },

    animateSliderToValue(targetValue, currentValue, duration) {
        if (!this.timeSliderElement || this.timeSliderElement.style.display !== 'flex' || this.isAnimatingFlush) {
            // If slider not visible, or an animation is already running, just update thumb to final spot.
            this.updateThumbVisualPosition(targetValue);
            this.updateSliderFromValue(targetValue); // Update text
            // Ensure internal angle is also set for future interactions
            const maxValue = 60;
            let finalDisplayAngleDeg = (targetValue / maxValue) * 360;
            this.currentBumpAngleRad = ((finalDisplayAngleDeg - 90 + 360) % 360) * Math.PI / 180;
            this.currentBumpAmplitude = 0;
            this.isThumbFlushed = false;
            this.drawStaticTrackPath();
            if(this.thumbVisualEl) this.thumbVisualEl.classList.remove('flushing');
            return;
        }

        this.isAnimatingFlush = true; // Use this flag to block other interactions

        // Ensure slider is in a "thumb visible, track flat" state before starting glide animation
        if (this.isThumbFlushed || this.currentBumpAmplitude > 0) {
            this.drawStaticTrackPath(); // Flatten track immediately
            this.currentBumpAmplitude = 0;
            this.isThumbFlushed = false;
            if(this.thumbVisualEl) {
                this.thumbVisualEl.style.opacity = 1;
                this.thumbVisualEl.setAttribute('r', '7'); // Default radius
                // Position thumb at the 'currentValue' from which animation will start
                this.updateThumbVisualPosition(currentValue);
            }
        } else {
            // If thumb was already visible, ensure it's at the correct starting position for the animation
             if(this.thumbVisualEl) {
                this.updateThumbVisualPosition(currentValue);
             }
        }


        const startTime = performance.now();
        const animate = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            let progress = Math.min(elapsedTime / duration, 1);
            progress = 0.5 - 0.5 * Math.cos(progress * Math.PI); // Ease in-out

            const animatedValue = currentValue + (targetValue - currentValue) * progress;

            this.updateThumbVisualPosition(animatedValue); // Move the thumb
            this.updateSliderFromValue(animatedValue);    // Update text

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.updateThumbVisualPosition(targetValue); // Ensure final position
                this.updateSliderFromValue(targetValue);
                this.isAnimatingFlush = false;
                // Update internal angle for future interactions
                const maxValue = 60;
                let finalDisplayAngleDeg = (targetValue / maxValue) * 360;
                this.currentBumpAngleRad = ((finalDisplayAngleDeg - 90 + 360) % 360) * Math.PI / 180;
            }
        };
        requestAnimationFrame(animate);
    },

    showTimeSlider(inputElement) {
        this.initTimeSlider(); // Ensures SVG structure is ready, calls drawStaticTrackPath and updateThumbVisualPosition(0)
        this.currentTimeInput = inputElement;

        // Reset to initial visual state before showing
        this.isThumbFlushed = false;
        this.isAnimatingFlush = false; // Reset animation lock
        this.currentBumpAmplitude = 0; // No bump initially
        if (this.thumbVisualEl) {
            this.thumbVisualEl.classList.remove('flushing'); // Ensure thumb is visible
        }
        // Ensure track is drawn flat; initTimeSlider calls drawStaticTrackPath, but if re-showing, good to be sure.
        this.drawStaticTrackPath();


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

        this.updateSliderFromValue(value); // Update text display
        this.updateThumbVisualPosition(value); // Position visible SVG thumb

        // Set initial currentBumpAngleRad for state consistency if needed before first drag.
        // The mousedown event calculates a fresh angle anyway for the flush animation.
        const maxValue = 60;
        let initialDisplayAngleDeg = (value / maxValue) * 360; // Angle in degrees, 0s at 0deg (maps to 12 o'clock)
        // Convert this display/value angle to the Math angle (radians, 0 @ 3 o'clock)
        this.currentBumpAngleRad = ((initialDisplayAngleDeg - 90 + 360) % 360) * Math.PI / 180;
    },

    hideTimeSlider() {
        if (this.timeSliderElement) {
            this.timeSliderElement.style.display = 'none';
        }
        this.currentTimeInput = null;
    },

    updateSliderFromValue(seconds) {
        // This function now primarily updates the text display.
        // Visual thumb (SVG circle) is updated by updateThumbVisualPosition.
        // Bumped track is updated by handleSliderDrag calling generateBumpedPathD.
        if (!this.timeSliderText) return;

        const displaySeconds = seconds.toFixed(2);
        this.timeSliderText.innerHTML = `${displaySeconds} <span>seconds</span>`;

        // The part that updated the old div thumb is removed.
        // this.timeSliderThumb.style.left = ...
        // this.timeSliderThumb.style.top = ...

        if (this.currentTimeInput) {
             // Update input field if it's not already the source of this change
            if (parseFloat(String(this.currentTimeInput.value).replace(',', '.')) !== seconds) {
                 this.currentTimeInput.value = displaySeconds.replace('.', ','); // Use comma for German locale
            }
        }
    },

    handleSliderDrag(coords) { // Changed 'event' to 'coords'
        if (!this.isDraggingSlider || !this.timeSliderElement || !this.isThumbFlushed) return;

        const sliderRect = this.svgEl.getBoundingClientRect(); // Use SVG rect
        const centerX = sliderRect.left + this.svgCenter;
        const centerY = sliderRect.top + this.svgCenter;

        // Use coords.x and coords.y from getEventCoordinates
        const deltaX = coords.x - centerX;
        const deltaY = coords.y - centerY;
        let angleRad = Math.atan2(deltaY, deltaX); // Radians, 0 @ 3 o'clock

        // Update track path with new bump position
        this.currentBumpAngleRad = angleRad;
        if (typeof this.currentBumpAmplitude === 'undefined') { // Safety for if flush hasn't fully set amplitude
            this.currentBumpAmplitude = 8; // Default from animateTrackToBump
        }
        const newPathD = this.generateBumpedPathD(this.currentBumpAngleRad, this.currentBumpAmplitude);
        if (this.trackPathEl) this.trackPathEl.setAttribute('d', newPathD);

        // Convert angle to slider value (0-60 seconds) for snapping and display
        let displayAngleDeg = (angleRad * 180 / Math.PI); // Convert to degrees
        displayAngleDeg = (displayAngleDeg + 90 + 360) % 360; // Shift origin to 12 o'clock for value calc

        const maxValue = 60;
        let value = (displayAngleDeg / 360) * maxValue;

        // Snapping logic
        const snapInterval = 0.5;
        const zeroSnapThreshold = 0.25;

        let snapped = false;
        if (value < zeroSnapThreshold || value > maxValue - zeroSnapThreshold) {
            value = 0;
            snapped = true;
        } else {
            const originalValue = value;
            value = Math.round(value / snapInterval) * snapInterval;
            if (value !== originalValue) snapped = true;
        }
        value = parseFloat(value.toFixed(2));

        // If snapped, update the bump's visual angle to the snapped angle
        if (snapped) {
            let newDisplayAngleDegForSnap = (value / maxValue) * 360;
            // Convert this display angle (0 @ 12 o'clock) back to Math angle (0 @ 3 o'clock) for generateBumpedPathD
            this.currentBumpAngleRad = ((newDisplayAngleDegForSnap - 90) * Math.PI / 180);
            const snappedPathD = this.generateBumpedPathD(this.currentBumpAngleRad, this.currentBumpAmplitude);
            if (this.trackPathEl) this.trackPathEl.setAttribute('d', snappedPathD);
        }

        this.updateSliderFromValue(value); // Update text display

        // Update the input field directly
        if (this.currentTimeInput) {
            const blockId = this.currentTimeInput.closest('.programm-block')?.dataset.id;
            if (blockId) {
                this.updateBlockValue(blockId, value.toString().replace('.', ','));
            } else {
                this.currentTimeInput.value = value.toString().replace('.', ',');
            }
        }

        // Indicator line animation logic
        const bumpInfluenceWidthRad = Math.PI / 8; // Angular width of bump's influence (reduced for more localized reaction)

        this.timeSliderElement.querySelectorAll('.time-slider-marker').forEach(markerEl => {
            const markerAngleRadStored = markerEl.dataset.angleRad;
            if (typeof markerAngleRadStored === 'undefined') return;
            const markerAngleRad = parseFloat(markerAngleRadStored);

            let angleDiff = this.currentBumpAngleRad - markerAngleRad;
            // Normalize angle difference to be between -PI and PI
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            if (Math.abs(angleDiff) < (bumpInfluenceWidthRad / 2)) {
                if (!markerEl.classList.contains('bumping')) {
                    markerEl.classList.add('bumping');
                }
            } else {
                if (markerEl.classList.contains('bumping')) {
                    markerEl.classList.remove('bumping');
                }
            }
        });
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
