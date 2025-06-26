document.addEventListener('DOMContentLoaded', () => {
    const bausteine = document.querySelectorAll('#baustein-palette .baustein');
    const dropzone = document.getElementById('programm-ablauf');
    const generateBtn = document.getElementById('generate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const copyBtn = document.getElementById('copy-btn');
    const codeOutput = document.getElementById('code-output');
    const platzhalterText = document.querySelector('.platzhalter-text');

    // Funktion zum Anzeigen/Verstecken des Platzhaltertexts
    const updatePlatzhalter = () => {
        if (dropzone.children.length > 1) { // 1 weil der Platzhaltertext selbst ein Kind ist
            platzhalterText.style.display = 'none';
        } else {
            platzhalterText.style.display = 'flex';
        }
    };

    // Drag-and-Drop für die Baustein-Palette
    bausteine.forEach(baustein => {
        baustein.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', baustein.dataset.befehl);
            e.dataTransfer.effectAllowed = 'copy';
            setTimeout(() => baustein.classList.add('dragging'), 0);
        });

        baustein.addEventListener('dragend', () => {
            baustein.classList.remove('dragging');
        });
    });

    // Dropzone-Events
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault(); // Notwendig, um ein Drop-Event zu erlauben
        dropzone.classList.add('drag-over');
        const afterElement = getDragAfterElement(dropzone, e.clientY);
        const dragging = document.querySelector('.dragging-in-zone');
        if (afterElement == null) {
            if(dragging) dropzone.appendChild(dragging);
        } else {
            if(dragging) dropzone.insertBefore(dragging, afterElement);
        }
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');

        const befehl = e.dataTransfer.getData('text/plain');
        const originalBaustein = document.querySelector(`#baustein-palette .baustein[data-befehl='${befehl}']`);
        
        // Klonen, damit der Original-Baustein in der Palette bleibt
        const neuerBaustein = originalBaustein.cloneNode(true);
        neuerBaustein.classList.remove('dragging');
        neuerBaustein.draggable = true; // Geklonte Bausteine sollen umsortierbar sein
        
        // Events für das Umsortieren hinzufügen
        addDragEventsToClone(neuerBaustein);

        // An der richtigen Position einfügen
        const afterElement = getDragAfterElement(dropzone, e.clientY);
        if (afterElement == null) {
            dropzone.appendChild(neuerBaustein);
        } else {
            dropzone.insertBefore(neuerBaustein, afterElement);
        }
        updatePlatzhalter();
    });

    // Hilfsfunktion zum Ermitteln der Einfügeposition
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.baustein:not(.dragging-in-zone)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    // Drag-Events für geklonte/umsortierbare Bausteine
    function addDragEventsToClone(clone) {
        clone.addEventListener('dragstart', (e) => {
            e.stopPropagation(); // Verhindert Konflikte
            clone.classList.add('dragging-in-zone');
            e.dataTransfer.effectAllowed = 'move';
        });

        clone.addEventListener('dragend', (e) => {
            e.stopPropagation();
            clone.classList.remove('dragging-in-zone');
        });
    }

    // Button-Events
    generateBtn.addEventListener('click', () => {
        const befehlsSequenz = Array.from(dropzone.querySelectorAll('.baustein'));
        if (befehlsSequenz.length === 0) {
            codeOutput.textContent = "// Das Programm ist leer. Füge Bausteine hinzu.";
            return;
        }

        let code = '';
        befehlsSequenz.forEach(baustein => {
            const befehl = baustein.dataset.befehl;
            let zeile = '';
            if (befehl === 'warten') {
                // Wert aus dem Input-Feld holen und Komma durch Punkt ersetzen
                const zeit = baustein.querySelector('.warten-input').value.replace(',', '.');
                zeile = `warten(${zeit});`;
            } else {
                zeile = `${befehl}();`;
            }
            code += `  ${zeile}\n`;
        });

        const finalCode = `#include "fahrfunktionen.h"

void setup() {
  Serial.begin(9600);
  Serial.println("Roboter-Auto startklar. Fahrprogramm wird ausgeführt.");

  // --- HIER KOMMEN DIE BEFEHLE REIN ---
${code}
  Serial.println("Fahrprogramm beendet.");
}

void loop() {
  // Dieser Bereich wird ignoriert und bleibt leer.
}`;
        codeOutput.textContent = finalCode;
        // Optional: Syntax-Highlighting (hier nicht implementiert)
    });

    clearBtn.addEventListener('click', () => {
        // Alle Bausteine entfernen, außer dem Platzhaltertext
        dropzone.innerHTML = '<div class="platzhalter-text">Ziehe Bausteine hierher</div>';
        codeOutput.textContent = '// Klicke auf "Arduino-Code generieren", um den Code hier anzuzeigen.';
        updatePlatzhalter(); // Stellt sicher, dass der Platzhaltertext wieder angezeigt wird.
    });
    
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(codeOutput.textContent).then(() => {
            const originalText = copyBtn.querySelector('span').textContent;
            copyBtn.querySelector('span').textContent = 'Kopiert!';
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.querySelector('span').textContent = originalText;
                copyBtn.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Fehler beim Kopieren: ', err);
            alert("Kopieren fehlgeschlagen. Bitte manuell kopieren.");
        });
    });

    // Initialen Zustand des Platzhalters setzen
    updatePlatzhalter();
});