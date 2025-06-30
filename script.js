// Definition der Beispiel-Programme
const EXAMPLES = {
    quadrat: [ /* ... (wie gehabt) ... */ ],
    autonom: [ /* ... (wie gehabt) ... */ ],
    tanz: [ /* ... (wie gehabt) ... */ ]
};

const RoboProgrammer = {
    els: {},
    state: [],
    history: [],
    historyIndex: -1,

    // --- Time Slider Logic (New SVG Morphing Approach) ---
    currentTimeInput: null,
    timeSliderElement: null,    // The main popup div
    svgEl: null,                // The <svg> element
    trackRingPathEl: null,      // <path> for the main track ring (with gap)
    thumbAndDentPathEl: null,   // <path> for the thumb/dent that morphs
    timeSliderText: null,       // The div for text display "0.00 seconds"

    isDraggingSlider: false,        // True if a drag operation is active
    isAnimatingInteraction: false,  // True if a press-in/pop-out animation is running
    isDented: false,                // True if the slider is currently in "dented" state
    interactionProgress: 0,       // 0 for thumb, 1 for full dent
    currentSliderValue: 0,        // Current value in seconds (0-60)

    // Bound event handlers for dynamic add/remove (wird später verwendet)
    boundHandleDocumentDrag: null,
    boundHandleDocumentDragEnd: null,

    // Geometry constants
    svgCenter: 100,               // Center of the 200x200 SVG viewBox
    trackOuterRadius: 90,         // Visual outer edge of the track for calculations
    trackStrokeWidth: 10,         // The visual thickness of the track ring
    thumbRadius: 7,               // Radius of the thumb circle part of thumbAndDentPath when interactionProgress = 0
    dentMaxAmplitude: 8,          // Max inward depth of the dent when interactionProgress = 1
    thumbSegmentAngleWidthRad: Math.PI / 4.5, // Angular width thumb/dent segment occupies (40 degrees)

    get trackEffectiveRadius() { // Centerline of the visual track stroke
        return this.trackOuterRadius - (this.trackStrokeWidth / 2);
    },

    init() {
        this.cacheDOMElements();
        this.initSortable();
        this.addEventListeners(); // Basis-Listener, nicht für Slider-Drag
        this.loadFromLocalStorage();
        this.saveToHistory(true);
        this.updateUI(); // Rendert Blöcke etc.
    },

    cacheDOMElements() { /* ... (wie gehabt, ohne Slider-spezifische Elemente hier) ... */
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
    
    initSortable(rootElement = this.els.dropzone, stateArray = this.state) { /* ... (wie gehabt) ... */ },
    addEventListeners() { /* ... (wie gehabt, ohne Slider-Drag-Listener hier) ... */
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
    saveToHistory(isInitial = false) { /* ... (wie gehabt) ... */ },
    updateUI() { /* ... (wie gehabt) ... */ },
    renderBlocks(container, stateArray) { /* ... (wie gehabt) ... */ },
    undo() { /* ... (wie gehabt) ... */ },
    redo() { /* ... (wie gehabt) ... */ },
    updateUndoRedoButtons() { /* ... (wie gehabt) ... */ },
    handleBlockAdd(evt, targetStateArray) { /* ... (wie gehabt) ... */ },
    handleBlockMove(evt, stateArray) { /* ... (wie gehabt) ... */ },
    findBlockAndParent(blockId, searchArray = this.state, parentArray = this.state) { /* ... (wie gehabt) ... */ },
    deleteBlock(blockId) { /* ... (wie gehabt) ... */ },
    duplicateBlock(blockId) { /* ... (wie gehabt) ... */ },
    
    updateBlockValue(blockId, value) { // value is the new string value from input
        const result = this.findBlockAndParent(blockId);
        if (result && result.block.value !== value) {
            const oldValueString = result.block.value;
            result.block.value = value;
            this.saveToHistory();
            this.generateCode();

            const newNumericValue = parseFloat(String(value).replace(',', '.')) || 0;
            // Clamp or validate: const clampedNewValue = Math.max(0, Math.min(60, newNumericValue));

            if (this.timeSliderElement && this.timeSliderElement.style.display === 'flex' &&
                this.currentTimeInput && this.currentTimeInput.closest('.programm-block')?.dataset.id === blockId) {
                const oldValueNumeric = parseFloat(String(oldValueString).replace(',', '.')) || 0;
                // TODO: Call a future animateSliderToValue(newNumericValue, oldValueNumeric, 300);
                // For now, just update state directly for static view
                this.drawSliderState(newNumericValue, 0); // Show thumb at new value
            } else if (this.currentTimeInput && this.currentTimeInput.closest('.programm-block')?.dataset.id === blockId) {
                 // Slider for this block but not visible. Update its text for when it might be shown.
                if(this.timeSliderText) this.timeSliderText.innerHTML = `${newNumericValue.toFixed(2)} <span>seconds</span>`;
                this.currentSliderValue = newNumericValue; // Update internal state
            }
        }
    },

    createBlockElement(block, stateArray) { /* ... (wie gehabt, inkl. Listener für Time-Slider-Öffnen) ... */
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
    clearProgram() { /* ... (wie gehabt) ... */ },
    loadExample(key) { /* ... (wie gehabt) ... */ },
    saveToLocalStorage() { /* ... (wie gehabt) ... */ },
    loadFromLocalStorage(fromButtonClick = false) { /* ... (wie gehabt) ... */ },
    generateCode() { /* ... (wie gehabt) ... */ },
    generateCodeRecursive(stateArray, indent) { /* ... (wie gehabt) ... */ },

    // --- Time Slider SVG Methods ---
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

            const maxValue = 60;
            const markerPlacementRadius = this.trackEffectiveRadius;
            for (let s = 0; s < maxValue; s += 0.5) {
                const marker = document.createElement('div');
                const isZeroMark = (s === 0);
                marker.className = 'time-slider-marker ' + (isZeroMark ? 'zero' : 'half-second');
                const angleDeg = (s / maxValue * 360) - 90;
                const markerLength = isZeroMark ? 15 : 8;
                const markerThickness = isZeroMark ? 3 : 1;
                const lineCenterX = this.svgCenter + markerPlacementRadius * Math.cos(angleDeg * Math.PI / 180);
                const lineCenterY = this.svgCenter + markerPlacementRadius * Math.sin(angleDeg * Math.PI / 180);
                marker.style.width = `${markerThickness}px`;
                marker.style.height = `${markerLength}px`;
                marker.style.left = `${lineCenterX - markerThickness / 2}px`;
                marker.style.top = `${lineCenterY - markerLength / 2}px`;
                marker.style.transform = `rotate(${angleDeg + 90}deg)`;
                const markerLine = document.createElement('span'); // For animation
                markerLine.className = 'marker-line';
                marker.appendChild(markerLine);
                marker.dataset.angleRad = (((angleDeg + 90) * Math.PI / 180) + 2 * Math.PI) % (2*Math.PI); // Store math angle (0@3)
                this.timeSliderElement.appendChild(marker);
            }

            this.currentSliderValue = 0; // Default
            this.interactionProgress = 0; // Start with thumb
            this.isDented = false;
            this.drawSliderState(this.currentSliderValue, this.interactionProgress);

            // Event listeners for drag will be added in a later step
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

        this.currentSliderValue = value;
        this.interactionProgress = 0; // Always show thumb initially
        this.isDented = false;
        this.drawSliderState(this.currentSliderValue, this.interactionProgress);
    },

    hideTimeSlider() {
        if (this.timeSliderElement) this.timeSliderElement.style.display = 'none';
        this.currentTimeInput = null;
    },

    _describeArc(cx, cy, r, startAngleRad, endAngleRad, sweepFlag = 1) {
        const startX = cx + r * Math.cos(startAngleRad);
        const startY = cy + r * Math.sin(startAngleRad);
        const endX = cx + r * Math.cos(endAngleRad);
        const endY = cy + r * Math.sin(endAngleRad);
        let angleDiff = endAngleRad - startAngleRad;
        if (sweepFlag === 0 && angleDiff > 0 && Math.abs(angleDiff) < 2*Math.PI - 0.01) angleDiff -= 2 * Math.PI;
        if (sweepFlag === 1 && angleDiff < 0 && Math.abs(angleDiff) < 2*Math.PI - 0.01) angleDiff += 2 * Math.PI;
        const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;
        return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
    },

    drawSliderState(value, interactionProgress = 0) {
        if (!this.trackRingPathEl || !this.thumbAndDentPathEl) return;

        this.currentSliderValue = value;
        this.interactionProgress = interactionProgress; // Store for external access if needed

        const mathValueAngle = (((value / 60) * 360 - 90 + 360) % 360) * Math.PI / 180;

        const halfSegmentRad = this.thumbSegmentAngleWidthRad / 2;
        const R_track_outer = this.trackOuterRadius;
        const R_track_inner = this.trackOuterRadius - this.trackStrokeWidth;
        const R_thumb_centerline = this.trackEffectiveRadius;

        const gapStartAngleRad = mathValueAngle - halfSegmentRad;
        const gapEndAngleRad = mathValueAngle + halfSegmentRad;

        let trackPathD = "";
        trackPathD += this._describeArc(this.svgCenter, this.svgCenter, R_track_outer, gapEndAngleRad, gapStartAngleRad, 1).substring(1);
        trackPathD += ` L ${this.svgCenter + R_track_inner * Math.cos(gapStartAngleRad)} ${this.svgCenter + R_track_inner * Math.sin(gapStartAngleRad)}`;
        trackPathD += this._describeArc(this.svgCenter, this.svgCenter, R_track_inner, gapStartAngleRad, gapEndAngleRad, 0).substring(1);
        trackPathD += ` Z`;
        this.trackRingPathEl.setAttribute('d', trackPathD);

        let thumbDentPathD = "";
        const progress = interactionProgress;

        const p1x_outer = this.svgCenter + R_track_outer * Math.cos(gapStartAngleRad);
        const p1y_outer = this.svgCenter + R_track_outer * Math.sin(gapStartAngleRad);
        const p2x_outer = this.svgCenter + R_track_outer * Math.cos(gapEndAngleRad);
        const p2y_outer = this.svgCenter + R_track_outer * Math.sin(gapEndAngleRad);
        const p3x_inner = this.svgCenter + R_track_inner * Math.cos(gapEndAngleRad);
        const p3y_inner = this.svgCenter + R_track_inner * Math.sin(gapEndAngleRad);
        const p4x_inner = this.svgCenter + R_track_inner * Math.cos(gapStartAngleRad);
        const p4y_inner = this.svgCenter + R_track_inner * Math.sin(gapStartAngleRad);

        // --- Outer curve (P1 to P2) ---
        const thumbOuterApexRadius = R_thumb_centerline + this.thumbRadius;
        const thumbCtrlOuterX = this.svgCenter + thumbOuterApexRadius * Math.cos(mathValueAngle);
        const thumbCtrlOuterY = this.svgCenter + thumbOuterApexRadius * Math.sin(mathValueAngle);

        const dentOuterApexRadius = R_track_outer - this.dentMaxAmplitude; // Dent goes inward from outer track
        const dentCtrlOuterX = this.svgCenter + dentOuterApexRadius * Math.cos(mathValueAngle);
        const dentCtrlOuterY = this.svgCenter + dentOuterApexRadius * Math.sin(mathValueAngle);

        const currentCtrlOuterX = thumbCtrlOuterX * (1 - progress) + dentCtrlOuterX * progress;
        const currentCtrlOuterY = thumbCtrlOuterY * (1 - progress) + dentCtrlOuterY * progress;

        thumbDentPathD = `M ${p1x_outer} ${p1y_outer} Q ${currentCtrlOuterX} ${currentCtrlOuterY} ${p2x_outer} ${p2y_outer}`;

        // --- Inner curve (P3 to P4, connecting to P2 and P1) ---
        thumbDentPathD += ` L ${p3x_inner} ${p3y_inner}`;

        const thumbInnerApexRadius = R_thumb_centerline - this.thumbRadius;
        const thumbCtrlInnerX = this.svgCenter + thumbInnerApexRadius * Math.cos(mathValueAngle);
        const thumbCtrlInnerY = this.svgCenter + thumbInnerApexRadius * Math.sin(mathValueAngle);

        // For dent, inner curve is just part of R_track_inner. Control point on R_track_inner.
        const dentCtrlInnerX = this.svgCenter + R_track_inner * Math.cos(mathValueAngle);
        const dentCtrlInnerY = this.svgCenter + R_track_inner * Math.sin(mathValueAngle);

        const currentCtrlInnerX = thumbCtrlInnerX * (1 - progress) + dentCtrlInnerX * progress;
        const currentCtrlInnerY = thumbCtrlInnerY * (1 - progress) + dentCtrlInnerY * progress;

        thumbDentPathD += ` Q ${currentCtrlInnerX} ${currentCtrlInnerY} ${p4x_inner} ${p4y_inner}`;
        thumbDentPathD += ` Z`;

        this.thumbAndDentPathEl.setAttribute('d', thumbDentPathD);

        const globalTransform = `rotate(-90 ${this.svgCenter} ${this.svgCenter})`;
        this.trackRingPathEl.setAttribute('transform', globalTransform);
        this.thumbAndDentPathEl.setAttribute('transform', globalTransform);

        if (this.timeSliderText) this.timeSliderText.innerHTML = `${value.toFixed(2)} <span>seconds</span>`;
        if (this.currentTimeInput && parseFloat(String(this.currentTimeInput.value).replace(',', '.')) !== value) {
            this.currentTimeInput.value = value.toFixed(2).replace('.', ',');
        }
    },

    // Placeholder for future animation logic

    // ANIMATION LOGIC
    animateInteractionProgress(targetProgress, duration) {
        if (this.isAnimatingInteraction && targetProgress === this.interactionProgress) return; // Already at or animating to target
        this.isAnimatingInteraction = true;

        const startProgress = this.interactionProgress;
        const startTime = performance.now();

        const animateStep = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            let progressOfAnimation = Math.min(elapsedTime / duration, 1);
            progressOfAnimation = 1 - Math.pow(1 - progressOfAnimation, 3); // Ease-out cubic

            this.interactionProgress = startProgress + (targetProgress - startProgress) * progressOfAnimation;
            this.drawSliderState(this.currentSliderValue, this.interactionProgress);

            if (progressOfAnimation < 1) {
                requestAnimationFrame(animateStep);
            } else {
                this.interactionProgress = targetProgress; // Ensure final value
                this.isDented = (targetProgress === 1);
                this.isAnimatingInteraction = false;
                // If drag started and press-in is complete, actual dragging of dent can occur via mousemove
            }
        };
        requestAnimationFrame(animateStep);
    },

    animateSliderToValue(targetValue, currentValue, totalDuration) { // For manual input
        if (!this.timeSliderElement || this.timeSliderElement.style.display !== 'flex' || this.isAnimatingInteraction) {
            this.currentSliderValue = targetValue;
            this.interactionProgress = 0;
            this.drawSliderState(targetValue, 0);
            return;
        }
        this.isAnimatingInteraction = true;
        if (this.isDented || this.interactionProgress !== 0) {
            this.interactionProgress = 0;
            this.isDented = false;
        }
        this.currentSliderValue = currentValue;
        this.drawSliderState(currentValue, 0);

        const durationPerPhase = totalDuration / 2;
        const animatePhase = (startVal, endVal, phaseDuration, onComplete) => {
            const startTime = performance.now();
            const frame = (currentTime) => {
                const elapsedTime = currentTime - startTime;
                let progress = Math.min(elapsedTime / phaseDuration, 1);
                progress = 0.5 - 0.5 * Math.cos(progress * Math.PI); // Ease in-out
                const animatedValue = startVal + (endVal - startVal) * progress;
                this.drawSliderState(animatedValue, 0);
                if (progress < 1) { requestAnimationFrame(frame); }
                else { this.drawSliderState(endVal, 0); if (onComplete) onComplete(); }
            };
            requestAnimationFrame(frame);
        };
        animatePhase(currentValue, 0, durationPerPhase, () => {
            animatePhase(0, targetValue, durationPerPhase, () => {
                this.currentSliderValue = targetValue;
                this.interactionProgress = 0;
                this.isAnimatingInteraction = false;
                this.drawSliderState(targetValue, 0);
            });
        });
    },

    // EVENT HANDLING
    handleDragStart(e) {
        if (e.type === 'mousedown' && e.button !== 0) return;
        if (this.isAnimatingInteraction) return;
        this.isDraggingSlider = true;
        if (this.thumbAndDentPathEl) this.thumbAndDentPathEl.style.cursor = 'grabbing';
        // Angle calculation for initial bump position if needed, though it forms at currentSliderValue
        // const coords = this._getEventCoordinates(e); // Not strictly needed if bump forms at current value
        this.animateInteractionProgress(1, 200); // Target progress 1 (dent), 200ms
        e.preventDefault();
        document.addEventListener('mousemove', this.boundHandleDocumentDrag);
        document.addEventListener('touchmove', this.boundHandleDocumentDrag, { passive: false });
        document.addEventListener('mouseup', this.boundHandleDocumentDragEnd);
        document.addEventListener('touchend', this.boundHandleDocumentDragEnd);
    },

    handleDocumentDrag(event) { /* ... TBI ... */ }, // Will be filled in next step
    handleDocumentDragEnd() { /* ... TBI ... */ },   // Will be filled in later step

    copyCode() { /* ... (wie gehabt) ... */ },
    showToast(message, type = 'info') { /* ... (wie gehabt) ... */ }
};
// Füge die restlichen Methoden (saveToHistory etc.) hier ein, wenn sie nicht oben sind.
// (Annahme: Die obigen RoboProgrammer Methoden sind zusätzlich zu den bestehenden)
RoboProgrammer.saveToHistory = function(isInitial = false) { if (!isInitial && this.historyIndex < this.history.length - 1) { this.history = this.history.slice(0, this.historyIndex + 1); } this.history.push(JSON.parse(JSON.stringify(this.state))); this.historyIndex++; this.updateUndoRedoButtons();};
RoboProgrammer.updateUI = function() { this.renderBlocks(this.els.dropzone, this.state); this.generateCode(); this.updateUndoRedoButtons();};
RoboProgrammer.renderBlocks = function(container, stateArray) { container.innerHTML = ''; stateArray.forEach((block, index) => { const blockEl = this.createBlockElement(block, stateArray); container.appendChild(blockEl); });};
RoboProgrammer.undo = function() { if (this.historyIndex > 0) { this.historyIndex--; this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex])); this.updateUI(); }};
RoboProgrammer.redo = function() { if (this.historyIndex < this.history.length - 1) { this.historyIndex++; this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex])); this.updateUI(); }};
RoboProgrammer.updateUndoRedoButtons = function() { this.els.undoBtn.disabled = this.historyIndex <= 0; this.els.redoBtn.disabled = this.historyIndex >= this.history.length - 1;};
RoboProgrammer.handleBlockAdd = function(evt, targetStateArray) { const type = evt.item.dataset.type; const newIndex = evt.newIndex; const newBlockState = { id: `block_${Date.now()}_${Math.random()}`, type: type }; switch (type) { case 'warten': newBlockState.value = '1'; break; case 'fahre_bis_hindernis': newBlockState.value = '20'; break; case 'kommentar': newBlockState.value = ''; break; case 'if_else_abstand': newBlockState.value = '20'; newBlockState.if_branch = []; newBlockState.else_branch = []; break; default: newBlockState.value = null; break; } targetStateArray.splice(newIndex, 0, newBlockState); evt.item.remove(); this.saveToHistory(); this.updateUI(); };
RoboProgrammer.handleBlockMove = function(evt, stateArray) { const [movedBlock] = stateArray.splice(evt.oldIndex, 1); stateArray.splice(evt.newIndex, 0, movedBlock); this.saveToHistory(); this.updateUI(); };
RoboProgrammer.findBlockAndParent = function(blockId, searchArray = this.state, parentArray = this.state) { for (let i = 0; i < searchArray.length; i++) { const block = searchArray[i]; if (block.id === blockId) return { block, parent: parentArray, index: i }; if (block.type === 'if_else_abstand') { let found = this.findBlockAndParent(blockId, block.if_branch, block.if_branch); if (found) return found; found = this.findBlockAndParent(blockId, block.else_branch, block.else_branch); if (found) return found; } } return null; };
RoboProgrammer.deleteBlock = function(blockId) { const result = this.findBlockAndParent(blockId); if (result) { result.parent.splice(result.index, 1); this.saveToHistory(); this.updateUI(); } };
RoboProgrammer.duplicateBlock = function(blockId) { const result = this.findBlockAndParent(blockId); if (result) { const newBlock = JSON.parse(JSON.stringify(result.block)); const assignNewIds = (b) => { b.id = `block_${Date.now()}_${Math.random()}`; if (b.type === 'if_else_abstand') { b.if_branch.forEach(assignNewIds); b.else_branch.forEach(assignNewIds); }}; assignNewIds(newBlock); result.parent.splice(result.index + 1, 0, newBlock); this.saveToHistory(); this.updateUI(); } };
RoboProgrammer.clearProgram = function() { if (this.state.length > 0 && confirm("Möchtest du das gesamte Programm wirklich unwiderruflich löschen?")) { this.state = []; this.saveToHistory(); this.updateUI(); }};
RoboProgrammer.loadExample = function(key) { if (this.state.length > 0 && !confirm("Dein aktuelles Programm wird durch das Beispiel ersetzt. Fortfahren?")) return; this.state = JSON.parse(JSON.stringify(EXAMPLES[key])); this.saveToHistory(); this.updateUI(); this.showToast(`Beispiel "${key}" geladen.`, 'success');};
RoboProgrammer.saveToLocalStorage = function() { localStorage.setItem('roboterProgramm_v4.0', JSON.stringify(this.state)); this.showToast('Programm im Browser gespeichert!', 'success');};
RoboProgrammer.loadFromLocalStorage = function(fromButtonClick = false) { const saved = localStorage.getItem('roboterProgramm_v4.0'); if (saved) { const savedState = JSON.parse(saved); if (fromButtonClick && this.state.length > 0 && !confirm("Gespeichertes Programm laden? Alle aktuellen Änderungen gehen verloren.")) return; this.state = savedState; if(fromButtonClick) { this.saveToHistory(); this.updateUI(); this.showToast('Programm aus Speicher geladen.', 'success'); }} else if (fromButtonClick) { this.showToast('Kein gespeichertes Programm gefunden.', 'error'); }};
RoboProgrammer.generateCode = function() { if (!this.els.codeOutput) return; const loopType = document.querySelector('input[name="loop-type"]:checked').value; let codeLines = this.generateCodeRecursive(this.state, '  '); if(this.state.length === 0) codeLines = "// Programm ist leer..."; const setupCode = loopType === 'setup' ? codeLines : '// Nichts im Setup.'; const loopCode = loopType === 'loop' ? codeLines : '// Bleibt leer...'; const finalCode = `#include "fahrfunktionen.h"\n\nvoid setup() {\n  Serial.begin(9600);\n  Serial.println("Roboter-Auto startklar.");\n  HCSR04.begin(trigPin, echoPin);\n\n${setupCode}\n\n  Serial.println("Setup beendet.");\n}\n\nvoid loop() {\n${loopCode}\n}`; this.els.codeOutput.textContent = finalCode; if (window.Prism) Prism.highlightElement(this.els.codeOutput); };
RoboProgrammer.generateCodeRecursive = function(stateArray, indent) { return stateArray.map(block => { const value = block.value || ''; const numValue = parseFloat(String(value).replace(',', '.')); const isValid = !isNaN(numValue) && numValue >= 0; switch (block.type) { case 'warten': return isValid ? `${indent}warten(${value.replace(',', '.')});` : `${indent}// FEHLER: warten()`; case 'fahre_bis_hindernis': return isValid ? `${indent}fahre_bis_hindernis(${parseInt(numValue)});` : `${indent}// FEHLER: fahre_bis_hindernis()`; case 'kommentar': return value.split('\n').map(line => `${indent}// ${line}`).join('\n'); case 'if_else_abstand': const condition = isValid ? `if (messe_abstand_cm() < ${parseInt(numValue)})` : `// FEHLER: if`; const ifCode = this.generateCodeRecursive(block.if_branch, indent + '  '); const elseCode = this.generateCodeRecursive(block.else_branch, indent + '  '); return [`${indent}${condition} {`, ifCode, `${indent}} else {`, elseCode, `${indent}}`].filter(line => line.trim() !== '').join('\n'); default: return `${indent}${block.type}();`; }}).join('\n'); };
RoboProgrammer.copyCode = function() { const codeToCopy = this.els.codeOutput.textContent; navigator.clipboard.writeText(codeToCopy).then(() => { const btn = this.els.copyBtn; const original = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Kopiert!</span>'; btn.classList.add('copied'); this.showToast('Code kopiert!', 'success'); setTimeout(() => { btn.innerHTML = original; btn.classList.remove('copied'); }, 2000); }).catch(err => { console.error('Kopierfehler: ', err); this.showToast('Fehler Kopieren.', 'error');}); };
RoboProgrammer.showToast = function(message, type = 'info') { const container = document.getElementById('toast-container'); const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.textContent = message; container.appendChild(toast); setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000); };


document.addEventListener('DOMContentLoaded', () => RoboProgrammer.init());
