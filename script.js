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
    state: [],
    history: [],
    historyIndex: -1,

    init() {
        this.cacheDOMElements();
        this.initSortable();
        this.addEventListeners();
        this.loadFromLocalStorage();
        this.saveToHistory(true);
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

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') { e.preventDefault(); this.undo(); }
                if (e.key === 'y') { e.preventDefault(); this.redo(); }
            }
        });

        this.els.paletteKategorien.forEach(kategorie => {
            new Sortable(kategorie, {
                group: { name: 'shared', pull: 'clone', put: false },
                sort: false,
                draggable: '.baustein'
            });
        });
    },
    
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
    
    handleBlockAdd(evt, targetStateArray) {
        const type = evt.item.dataset.type;
        const newIndex = evt.newIndex;
        const newBlockState = {
            id: `block_${Date.now()}_${Math.random()}`,
            type: type
        };
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
        targetStateArray.splice(newIndex, 0, newBlockState);
        evt.item.remove();
        this.saveToHistory();
        this.updateUI();
    },

    handleBlockMove(evt, stateArray) {
        const [movedBlock] = stateArray.splice(evt.oldIndex, 1);
        stateArray.splice(evt.newIndex, 0, movedBlock);
        this.saveToHistory();
        this.updateUI();
    },

    findBlockAndParent(blockId, searchArray = this.state, parentArray = this.state) {
        for (let i = 0; i < searchArray.length; i++) {
            const block = searchArray[i];
            if (block.id === blockId) return { block, parent: parentArray, index: i };
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
            const newBlock = JSON.parse(JSON.stringify(result.block));
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
            const oldValueString = result.block.value;
            result.block.value = value;
            this.saveToHistory();
            this.generateCode();
            const newNumericValue = parseFloat(String(value).replace(',', '.')) || 0;
            if (this.timeSliderElement && this.timeSliderElement.style.display === 'flex' &&
                this.currentTimeInput && this.currentTimeInput.closest('.programm-block')?.dataset.id === blockId) {
                const oldValueNumeric = parseFloat(String(oldValueString).replace(',', '.')) || 0;
                // This will be replaced by SVG animation call if we re-implement manual input animation
                this.updateSliderFromValue(newNumericValue);
                this.updateThumbVisualPosition(newNumericValue); // For current div-based baseline
            } else if (this.currentTimeInput && this.currentTimeInput.closest('.programm-block')?.dataset.id === blockId) {
                this.updateSliderFromValue(newNumericValue);
                this.updateThumbVisualPosition(newNumericValue);
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
            case 'warten': contentHTML = `warten(<input type="text" class="warten-input ${isValid ? '' : 'invalid'}" value="${block.value || ''}"> s);`; break;
            case 'fahre_bis_hindernis': contentHTML = `fahre_bis_hindernis(<input type="text" class="warten-input ${isValid ? '' : 'invalid'}" value="${block.value || ''}"> cm);`; break;
            case 'kommentar': contentHTML = `<textarea class="kommentar-textarea" placeholder="Dein Kommentar...">${block.value || ''}</textarea>`; break;
            case 'if_else_abstand':
                contentHTML = `
                    <div class="if-else-container">
                        <div class="if-else-header">
                            WENN <code>messe_abstand_cm()</code> < <input type="text" class="warten-input ${isValid ? '' : 'invalid'}" value="${block.value || ''}"> cm DANN
                        </div>
                        <div class="if-branch"><div class="branch-header">{ // DANN-Zweig</div><div class="nested-dropzone if-body"></div></div>
                        <div class="else-branch"><div class="branch-header">} SONST { // SONST-Zweig</div><div class="nested-dropzone else-body"></div></div>
                    </div>`;
                break;
            default: contentHTML = `${block.type}();`;
        }
        el.innerHTML = `<i class="fa-solid fa-grip-vertical handle"></i><div class="content">${contentHTML}</div><div class="actions"><button class="duplicate-btn" title="Duplizieren"><i class="fa-regular fa-copy"></i></button><button class="delete-btn" title="Löschen"><i class="fa-solid fa-trash-can"></i></button></div>`;
        el.querySelector('.delete-btn').addEventListener('click', () => this.deleteBlock(block.id));
        el.querySelector('.duplicate-btn').addEventListener('click', () => this.duplicateBlock(block.id));
        const input = el.querySelector('.warten-input, .kommentar-textarea');
        if (input) {
            input.addEventListener('change', () => this.updateBlockValue(block.id, input.value));
            input.addEventListener('input', () => { if (input.classList.contains('warten-input')) { const num = parseFloat(input.value.replace(',', '.')); input.classList.toggle('invalid', isNaN(num) || num < 0); }});
            if (input.classList.contains('warten-input') && block.type === 'warten') {
                input.addEventListener('click', (e) => { if (this.timeSliderElement && this.timeSliderElement.style.display === 'flex' && this.currentTimeInput === e.target) return; this.showTimeSlider(e.target); });
                input.addEventListener('focus', (e) => this.showTimeSlider(e.target));
            }
        }
        if (block.type === 'if_else_abstand') {
            const ifBody = el.querySelector('.if-body'); const elseBody = el.querySelector('.else-body');
            this.initSortable(ifBody, block.if_branch); this.initSortable(elseBody, block.else_branch);
            this.renderBlocks(ifBody, block.if_branch); this.renderBlocks(elseBody, block.else_branch);
        }
        return el;
    },

    clearProgram() { if (this.state.length > 0 && confirm("Möchtest du das gesamte Programm wirklich unwiderruflich löschen?")) { this.state = []; this.saveToHistory(); this.updateUI(); }},
    loadExample(key) { if (this.state.length > 0 && !confirm("Dein aktuelles Programm wird durch das Beispiel ersetzt. Fortfahren?")) return; this.state = JSON.parse(JSON.stringify(EXAMPLES[key])); this.saveToHistory(); this.updateUI(); this.showToast(`Beispiel "${key}" geladen.`, 'success'); },
    saveToLocalStorage() { localStorage.setItem('roboterProgramm_v4.0', JSON.stringify(this.state)); this.showToast('Programm im Browser gespeichert!', 'success'); },
    loadFromLocalStorage(fromButtonClick = false) { const saved = localStorage.getItem('roboterProgramm_v4.0'); if (saved) { const savedState = JSON.parse(saved); if (fromButtonClick && this.state.length > 0 && !confirm("Gespeichertes Programm laden? Alle aktuellen Änderungen gehen verloren.")) return; this.state = savedState; if(fromButtonClick) { this.saveToHistory(); this.updateUI(); this.showToast('Programm aus Speicher geladen.', 'success'); }} else if (fromButtonClick) { this.showToast('Kein gespeichertes Programm gefunden.', 'error'); }},
    generateCode() { if (!this.els.codeOutput) return; const loopType = document.querySelector('input[name="loop-type"]:checked').value; let codeLines = this.generateCodeRecursive(this.state, '  '); if(this.state.length === 0) codeLines = "// Programm ist leer..."; const setupCode = loopType === 'setup' ? codeLines : '// Nichts im Setup.'; const loopCode = loopType === 'loop' ? codeLines : '// Bleibt leer...'; const finalCode = `#include "fahrfunktionen.h"\n\nvoid setup() {\n  Serial.begin(9600);\n  Serial.println("Roboter-Auto startklar.");\n  HCSR04.begin(trigPin, echoPin);\n\n${setupCode}\n\n  Serial.println("Setup beendet.");\n}\n\nvoid loop() {\n${loopCode}\n}`; this.els.codeOutput.textContent = finalCode; Prism.highlightElement(this.els.codeOutput); },
    generateCodeRecursive(stateArray, indent) { return stateArray.map(block => { const value = block.value || ''; const numValue = parseFloat(String(value).replace(',', '.')); const isValid = !isNaN(numValue) && numValue >= 0; switch (block.type) { case 'warten': return isValid ? `${indent}warten(${value.replace(',', '.')});` : `${indent}// FEHLER: warten()`; case 'fahre_bis_hindernis': return isValid ? `${indent}fahre_bis_hindernis(${parseInt(numValue)});` : `${indent}// FEHLER: fahre_bis_hindernis()`; case 'kommentar': return value.split('\n').map(line => `${indent}// ${line}`).join('\n'); case 'if_else_abstand': const condition = isValid ? `if (messe_abstand_cm() < ${parseInt(numValue)})` : `// FEHLER: if`; const ifCode = this.generateCodeRecursive(block.if_branch, indent + '  '); const elseCode = this.generateCodeRecursive(block.else_branch, indent + '  '); return [`${indent}${condition} {`, ifCode, `${indent}} else {`, elseCode, `${indent}}`].filter(line => line.trim() !== '').join('\n'); default: return `${indent}${block.type}();`; }}).join('\n'); },

    // --- Time Slider Logic (New SVG Morphing Approach) ---
    currentTimeInput: null,
    timeSliderElement: null,
    svgEl: null,
    trackRingPathEl: null,
    thumbAndDentPathEl: null,
    timeSliderText: null,
    isDraggingSlider: false, // Will be used for SVG drag
    isDented: false,
    interactionProgress: 0, // 0 for thumb, 1 for full dent
    currentSliderValue: 0,

    // Geometry constants
    svgCenter: 100,
    trackOuterRadius: 90,
    trackStrokeWidth: 10,
    thumbRadius: 7,
    dentMaxAmplitude: 8,
    thumbSegmentAngleWidthRad: Math.PI / 4.5,

    get trackEffectiveRadius() {
        return this.trackOuterRadius - (this.trackStrokeWidth / 2);
    },

    _getEventCoordinates(ev) {
        if (ev.touches && ev.touches.length > 0) {
            return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
        }
        return { x: ev.clientX, y: ev.clientY };
    },

    initTimeSlider() {
        if (!this.timeSliderElement) {
            this.timeSliderElement = document.createElement('div');
            this.timeSliderElement.className = 'time-slider-popup';

            this.timeSliderElement.innerHTML = `
                <svg class="time-slider-svg-morphing" viewBox="0 0 200 200" width="200" height="200">
                    <path id="trackRingPath" class="track-ring-path"></path>
                    <path id="thumbAndDentPath" class="thumb-dent-path"></path>
                </svg>
                <div class="time-slider-center-text">
                    0.00 <span>seconds</span>
                </div>
            `;
            document.body.appendChild(this.timeSliderElement);

            this.svgEl = this.timeSliderElement.querySelector('.time-slider-svg-morphing');
            this.trackRingPathEl = this.timeSliderElement.querySelector('#trackRingPath');
            this.thumbAndDentPathEl = this.timeSliderElement.querySelector('#thumbAndDentPath');
            this.timeSliderText = this.timeSliderElement.querySelector('.time-slider-center-text');

            // Create markers (these are still divs, appended to timeSliderElement)
            const maxValue = 60;
            const markerPlacementRadius = this.trackEffectiveRadius; // Uses new getter
            for (let s = 0; s < maxValue; s += 0.5) {
                const marker = document.createElement('div');
                const isZeroMark = (s === 0);
                marker.className = 'time-slider-marker ' + (isZeroMark ? 'zero' : 'half-second');
                const angleDeg = (s / maxValue * 360) - 90;
                const markerLength = isZeroMark ? 15 : 8;
                const markerThickness = isZeroMark ? 3 : 1;

                // Positioning relative to popup center (this.svgCenter)
                const lineCenterX = this.svgCenter + markerPlacementRadius * Math.cos(angleDeg * Math.PI / 180);
                const lineCenterY = this.svgCenter + markerPlacementRadius * Math.sin(angleDeg * Math.PI / 180);

                marker.style.width = `${markerThickness}px`;
                marker.style.height = `${markerLength}px`;
                marker.style.left = `${lineCenterX - markerThickness / 2}px`;
                marker.style.top = `${lineCenterY - markerLength / 2}px`;
                marker.style.transform = `rotate(${angleDeg + 90}deg)`;
                this.timeSliderElement.appendChild(marker);
            }

            // Initial draw of the SVG slider state
            this.drawSliderState(this.currentSliderValue, 0); // Show thumb at 0s, not dented

            // Event listeners for SVG path interaction
            this.boundHandleDragStart = this.handleDragStart.bind(this); // Event 'e' will be passed directly

            this.thumbAndDentPathEl.addEventListener('mousedown', this.boundHandleDragStart);
            this.thumbAndDentPathEl.addEventListener('touchstart', this.boundHandleDragStart, { passive: false });

            // Document level listeners for move and end will be dynamically added in handleDragStart
            // and removed in handleDocumentDragEnd. We need to store bound versions of them.
            this.boundHandleDocumentDrag = this.handleDocumentDrag.bind(this);
            this.boundHandleDocumentDragEnd = this.handleDocumentDragEnd.bind(this);

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
        this.initTimeSlider();
        this.currentTimeInput = inputElement;
        const rect = inputElement.getBoundingClientRect();
        const sliderWidth = 200; const sliderHeight = 200;
        let left = rect.left + window.scrollX + (rect.width / 2) - (sliderWidth / 2);
        let top = rect.bottom + window.scrollY + 10;
        if (top + sliderHeight > window.innerHeight + window.scrollY) top = rect.top + window.scrollY - sliderHeight - 10;
        if (left + sliderWidth > window.innerWidth + window.scrollX) left = window.innerWidth + window.scrollX - sliderWidth - 5;
        if (left < 5) left = 5;
        this.timeSliderElement.style.top = `${top}px`;
        this.timeSliderElement.style.left = `${left}px`;
        this.timeSliderElement.style.display = 'flex';
        let value = parseFloat(String(inputElement.value).replace(',', '.')) || 0;
        if (value < 0) value = 0;
        this.updateSliderFromValue(value);
    },

    hideTimeSlider() {
        if (this.timeSliderElement) this.timeSliderElement.style.display = 'none';
        this.currentTimeInput = null;
    },

    // Helper to describe an arc segment for path d attribute
    // Angles are Math angles (0 @ 3 o'clock), sweepFlag: 1 for clockwise
    _describeArc(cx, cy, r, startAngleRad, endAngleRad, sweepFlag = 1) {
        const startX = cx + r * Math.cos(startAngleRad);
        const startY = cy + r * Math.sin(startAngleRad);
        const endX = cx + r * Math.cos(endAngleRad);
        const endY = cy + r * Math.sin(endAngleRad);

        let angleDiff = endAngleRad - startAngleRad;
        if (sweepFlag === 0 && angleDiff > 0) angleDiff -= 2 * Math.PI; // Ensure correct diff for counter-clockwise short arc
        if (sweepFlag === 1 && angleDiff < 0) angleDiff += 2 * Math.PI; // Ensure correct diff for clockwise short arc

        const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;

        return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
    },

    drawSliderState(value, interactionProgress = 0) {
        if (!this.trackRingPathEl || !this.thumbAndDentPathEl) return;

        this.currentSliderValue = value;
        this.interactionProgress = interactionProgress;

        const mathValueAngle = (((value / 60) * 360 - 90 + 360) % 360) * Math.PI / 180;

        const halfSegmentRad = this.thumbSegmentAngleWidthRad / 2;
        const R_track_outer = this.trackOuterRadius;
        const R_track_inner = this.trackOuterRadius - this.trackStrokeWidth;
        const R_thumb_centerline = this.trackEffectiveRadius;

        // --- 1. Draw #trackRingPath (the main ring with a gap) ---
        const gapStartAngleRad = mathValueAngle - halfSegmentRad;
        const gapEndAngleRad = mathValueAngle + halfSegmentRad;

        let trackPathD = "";
        // Outer arc part 1 (after gap to before gap) - this is the main visible part of the ring
        trackPathD += this._describeArc(this.svgCenter, this.svgCenter, R_track_outer, gapEndAngleRad, gapStartAngleRad, 1).substring(1); // Start with M from describeArc
        // Line to inner arc start (at gapStartAngle)
        trackPathD += ` L ${this.svgCenter + R_track_inner * Math.cos(gapStartAngleRad)} ${this.svgCenter + R_track_inner * Math.sin(gapStartAngleRad)}`;
        // Inner arc part 1 (from gapStartAngle to gapEndAngle, effectively reversed direction for hole)
        trackPathD += this._describeArc(this.svgCenter, this.svgCenter, R_track_inner, gapStartAngleRad, gapEndAngleRad, 0).substring(1); // sweep 0
        trackPathD += ` Z`;
        this.trackRingPathEl.setAttribute('d', trackPathD);

        // --- 2. Draw #thumbAndDentPath ---
        let thumbDentPathD = "";
        const progress = interactionProgress; // Alias

        // Define the 4 corner points of the segment in the track ring (where thumb/dent sits)
        // P1: Outer start, P2: Outer end, P3: Inner end, P4: Inner start
        const p1x = this.svgCenter + R_track_outer * Math.cos(gapStartAngleRad);
        const p1y = this.svgCenter + R_track_outer * Math.sin(gapStartAngleRad);
        const p2x = this.svgCenter + R_track_outer * Math.cos(gapEndAngleRad);
        const p2y = this.svgCenter + R_track_outer * Math.sin(gapEndAngleRad);
        const p3x = this.svgCenter + R_track_inner * Math.cos(gapEndAngleRad);
        const p3y = this.svgCenter + R_track_inner * Math.sin(gapEndAngleRad);
        const p4x = this.svgCenter + R_track_inner * Math.cos(gapStartAngleRad);
        const p4y = this.svgCenter + R_track_inner * Math.sin(gapStartAngleRad);

        // --- Outer curve of the segment (P1 to P2) ---
        // Control point for "thumb" state (convex outwards)
        // Scheitelpunkt des Daumen-Außenbogens liegt auf R_thumb_centerline + this.thumbRadius
        const thumbOuterApexRadius = R_thumb_centerline + this.thumbRadius;
        const thumbCtrlOuterX = this.svgCenter + thumbOuterApexRadius * Math.cos(mathValueAngle);
        const thumbCtrlOuterY = this.svgCenter + thumbOuterApexRadius * Math.sin(mathValueAngle);

        // Control point for "dent" state (concave inwards)
        const dentOuterApexRadius = R_track_outer - this.dentMaxAmplitude;
        const dentCtrlOuterX = this.svgCenter + dentOuterApexRadius * Math.cos(mathValueAngle);
        const dentCtrlOuterY = this.svgCenter + dentOuterApexRadius * Math.sin(mathValueAngle);

        // Interpolated control point for the outer quadratic Bezier curve
        const currentCtrlOuterX = thumbCtrlOuterX * (1 - progress) + dentCtrlOuterX * progress;
        const currentCtrlOuterY = thumbCtrlOuterY * (1 - progress) + dentCtrlOuterY * progress;

        thumbDentPathD = `M ${p1x} ${p1y} Q ${currentCtrlOuterX} ${currentCtrlOuterY} ${p2x} ${p2y}`;

        // --- Inner curve of the segment (P3 to P4, but drawn from P2 via L to P3) ---
        thumbDentPathD += ` L ${p3x} ${p3y}`;

        // Control point for "thumb" state (inner part of thumb circle)
        const thumbInnerApexRadius = R_thumb_centerline - this.thumbRadius;
        const thumbCtrlInnerX = this.svgCenter + thumbInnerApexRadius * Math.cos(mathValueAngle);
        const thumbCtrlInnerY = this.svgCenter + thumbInnerApexRadius * Math.sin(mathValueAngle);

        // Control point for "dent" state (part of the inner track ring)
        // For the dent, the inner curve is just an arc along R_track_inner.
        // A Bezier Q needs a control point. For an arc, it's more complex.
        // Let's simplify: the inner control point for dent is on R_track_inner (flat).
        const dentCtrlInnerX = this.svgCenter + R_track_inner * Math.cos(mathValueAngle);
        const dentCtrlInnerY = this.svgCenter + R_track_inner * Math.sin(mathValueAngle);

        const currentCtrlInnerX = thumbCtrlInnerX * (1 - progress) + dentCtrlInnerX * progress;
        const currentCtrlInnerY = thumbCtrlInnerY * (1 - progress) + dentCtrlInnerY * progress;

        thumbDentPathD += ` Q ${currentCtrlInnerX} ${currentCtrlInnerY} ${p4x} ${p4y}`;
        thumbDentPathD += ` Z`;

        this.thumbAndDentPathEl.setAttribute('d', thumbDentPathD);

        const globalTransform = `rotate(-90 ${this.svgCenter} ${this.svgCenter})`;
        this.trackRingPathEl.setAttribute('transform', globalTransform);
        this.thumbAndDentPathEl.setAttribute('transform', globalTransform);

        if (this.timeSliderText) {
            this.timeSliderText.innerHTML = `${value.toFixed(2)} <span>seconds</span>`;
        }
        // Update input field if it's the current one
        if (this.currentTimeInput && parseFloat(String(this.currentTimeInput.value).replace(',', '.')) !== value) {
            this.currentTimeInput.value = value.toFixed(2).replace('.', ',');
        }
    },

    // The old updateSliderFromValue and handleSliderDrag are effectively replaced by drawSliderState
    // and new event handlers that will call drawSliderState.
    // For now, to prevent errors if they are called from somewhere else (e.g. updateBlockValue):
    updateSliderFromValue(seconds) { // This is called by manual input change in updateBlockValue
        if (!this.timeSliderElement || this.timeSliderElement.style.display !== 'flex') {
            if(this.timeSliderText) this.timeSliderText.innerHTML = `${seconds.toFixed(2)} <span>seconds</span>`;
            // Potentially update this.currentSliderValue if slider not visible but value changes
            this.currentSliderValue = seconds;
            return;
        }
        // If visible, redraw with current interaction progress (likely 0 if not dragging)
        this.drawSliderState(seconds, this.interactionProgress);
    },

    // New drag start handler for SVG
    handleDragStart(e) { // Receives raw event 'e'
        if (e.type === 'mousedown' && e.button !== 0) return;
        if (this.isAnimatingInteraction) return;

        this.isDraggingSlider = true;
        // Cursor style for thumbAndDentPathEl is set in CSS as grab/grabbing
        if (this.thumbAndDentPathEl) this.thumbAndDentPathEl.style.cursor = 'grabbing';


        // The value (angle) of the slider does not change during this "press-in" animation.
        // The dent forms at the current position of the thumb.
        // We need to determine the angle of the click to correctly orient future dent movement if drag starts immediately.
        const coords = this._getEventCoordinates(e);
        const svgRect = this.svgEl.getBoundingClientRect();
        const clickX = coords.x - svgRect.left;
        const clickY = coords.y - svgRect.top;
        const deltaX = clickX - this.svgCenter;
        const deltaY = clickY - this.svgCenter;
        this.initialDragAngleRad = Math.atan2(deltaY, deltaX); // Store initial angle for context if needed
        // Though currentSliderValue should reflect the thumb's position.

        this.animateInteractionProgress(1, 200);

        e.preventDefault();

        // Add document level listeners for dragging and drag end
        document.addEventListener('mousemove', this.boundHandleDocumentDrag);
        document.addEventListener('touchmove', this.boundHandleDocumentDrag, { passive: false });
        document.addEventListener('mouseup', this.boundHandleDocumentDragEnd);
        document.addEventListener('touchend', this.boundHandleDocumentDragEnd);
    },

    animateInteractionProgress(targetProgress, duration) {
        if (this.isAnimatingInteraction) return; // Should not happen if logic is correct
        this.isAnimatingInteraction = true;

        const startProgress = this.interactionProgress;
        const startTime = performance.now();

        const animateStep = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            let progressOfAnimation = Math.min(elapsedTime / duration, 1);
            // Ease-out cubic: progress = 1 - Math.pow(1 - progress, 3);
            // Ease-in-out cubic: progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            progressOfAnimation = 1 - Math.pow(1 - progressOfAnimation, 3);


            this.interactionProgress = startProgress + (targetProgress - startProgress) * progressOfAnimation;
            this.drawSliderState(this.currentSliderValue, this.interactionProgress);

            if (progressOfAnimation < 1) {
                requestAnimationFrame(animateStep);
            } else {
                this.interactionProgress = targetProgress; // Ensure final value
                this.isDented = (targetProgress === 1);
                this.isAnimatingInteraction = false;
                // If we just finished "pressing in" (targetProgress was 1), and drag is still on,
                // then actual dragging of the dent begins.
                // If we just finished "releasing" (targetProgress was 0), then we are done.
            }
        };
        requestAnimationFrame(animateStep);
    },

    handleDocumentDrag(event) { // Receives raw event 'event'
        if (!this.isDraggingSlider || !this.timeSliderElement || !this.isDented) {
            return;
        }
        const coords = this._getEventCoordinates(event); // Extract coordinates

        const sliderRect = this.svgEl.getBoundingClientRect();
        const clickXRelCenter = coords.x - sliderRect.left - this.svgCenter;
        const clickYRelCenter = coords.y - sliderRect.top - this.svgCenter;

        let angleRad = Math.atan2(clickYRelCenter, clickXRelCenter); // Math angle (0 @ 3 o'clock)

        // Convert math angle to value (0-60s, 0s @ 12 o'clock)
        let visualAngleDeg = (angleRad * 180 / Math.PI + 90 + 360) % 360;

        const maxValue = 60;
        let value = (visualAngleDeg / 360) * maxValue;

        // Snapping logic
        const snapInterval = 0.5;
        const zeroSnapThreshold = 0.25;
        if (value < zeroSnapThreshold || value > maxValue - zeroSnapThreshold) {
            value = 0;
        } else {
            value = Math.round(value / snapInterval) * snapInterval;
        }
        this.currentSliderValue = parseFloat(value.toFixed(2));

        // Redraw with dent active at the new value
        // interactionProgress should be 1 (full dent) while dragging
        this.drawSliderState(this.currentSliderValue, 1);

        // Indicator line animation logic
        const mathAngleOfDent = (((this.currentSliderValue / 60) * 360 - 90 + 360) % 360) * Math.PI / 180;
        const bumpInfluenceWidthRad = Math.PI / 8;

        this.timeSliderElement.querySelectorAll('.time-slider-marker').forEach(markerEl => {
            const markerAngleRadStored = markerEl.dataset.angleRad;
            if (typeof markerAngleRadStored === 'undefined') return;
            const markerAngleRad = parseFloat(markerAngleRadStored);

            let angleDiff = mathAngleOfDent - markerAngleRad;
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

    handleDocumentDragEnd() {
        if (this.isDraggingSlider) {
            this.isDraggingSlider = false;
            if (this.thumbAndDentPathEl) this.thumbAndDentPathEl.style.cursor = 'grab';

            // Start animation to morph dent back to thumb
            if (this.isDented) { // Only if it was dented
                this.animateInteractionProgress(0, 200); // Animate to progress 0 (thumb)
            }

            // Remove document-level listeners
            document.removeEventListener('mousemove', this.boundHandleDocumentDrag);
            document.removeEventListener('touchmove', this.boundHandleDocumentDrag);
            document.removeEventListener('mouseup', this.boundHandleDocumentDragEnd);
            document.removeEventListener('touchend', this.boundHandleDocumentDragEnd);

            // Clear any bumping classes from markers (might be better in animateInteractionProgress end)
            if (this.timeSliderElement) {
                this.timeSliderElement.querySelectorAll('.time-slider-marker.bumping').forEach(m => m.classList.remove('bumping'));
            }
        }
    },

    copyCode() { const codeToCopy = this.els.codeOutput.textContent; navigator.clipboard.writeText(codeToCopy).then(() => { const btn = this.els.copyBtn; const original = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Kopiert!</span>'; btn.classList.add('copied'); this.showToast('Code kopiert!', 'success'); setTimeout(() => { btn.innerHTML = original; btn.classList.remove('copied'); }, 2000); }).catch(err => { console.error('Kopierfehler: ', err); this.showToast('Fehler Kopieren.', 'error');}); },
    showToast(message, type = 'info') { const container = document.getElementById('toast-container'); const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.textContent = message; container.appendChild(toast); setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000); }
};

document.addEventListener('DOMContentLoaded', () => RoboProgrammer.init());
