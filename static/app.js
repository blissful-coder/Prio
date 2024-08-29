document.addEventListener('DOMContentLoaded', () => {
    const addTaskBtn = document.getElementById('add-task-btn');

    // Load existing sticky notes from the server
    fetch('/api/notes')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(notes => {
            notes.forEach(note => {
                const stickyNote = createStickyNoteElement(note);
                const container = document.getElementById(note.quadrant);
                if (container) {
                    container.appendChild(stickyNote);
                    makeDraggable(stickyNote);
                } else {
                    console.error(`Quadrant ${note.quadrant} not found for note ${note.id}`);
                }
            });
        })
        .catch(error => {
            console.error('Error loading notes:', error);
        });

    addTaskBtn.addEventListener('click', () => {
        const stickyNote = document.createElement('div');
        stickyNote.className = 'sticky-note';
        stickyNote.contentEditable = true; // Make the sticky note editable
        stickyNote.textContent = 'New Task';

        const noteData = {
            id: generateUniqueId(),
            content: stickyNote.textContent,
            x: 10,
            y: 10,
            quadrant: getCurrentQuadrantId() || 'urgent-important' // Default to a quadrant if not found
        };

        // Add sticky note to the UI
        const container = document.getElementById(noteData.quadrant);
        if (container) {
            container.appendChild(stickyNote);
            makeDraggable(stickyNote);

            // Save sticky note data to the server
            fetch('/api/notes/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(noteData)
            })
            .catch(error => {
                console.error('Error adding note:', error);
            });
        } else {
            console.error(`Quadrant ${noteData.quadrant} not found`);
        }
    });

    function makeDraggable(element) {
        let isDragging = false;
        let offsetX, offsetY;

        element.addEventListener('mousedown', (e) => {
            if (element.isContentEditable) {
                e.stopPropagation();
                return;
            }

            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;

            function onMouseMove(e) {
                if (isDragging) {
                    const newLeft = e.clientX - offsetX;
                    const newTop = e.clientY - offsetY;

                    element.style.left = `${newLeft}px`;
                    element.style.top = `${newTop}px`;

                    // Determine the new quadrant
                    const currentQuadrant = getCurrentQuadrantElement(newLeft, newTop);

                    if (currentQuadrant) {
                        currentQuadrant.appendChild(element);
                    }
                }
            }

            function onMouseUp(e) {
                if (isDragging) {
                    isDragging = false;

                    const container = getCurrentQuadrantElement(element.offsetLeft, element.offsetTop);
                    if (container) {
                        container.appendChild(element);

                        const noteData = {
                            id: element.dataset.id,
                            content: element.textContent,
                            x: parseFloat(element.style.left) || 0,
                            y: parseFloat(element.style.top) || 0,
                            quadrant: container.id
                        };

                        // Update sticky note data on the server
                        fetch('/api/notes/update', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(noteData)
                        })
                        .catch(error => {
                            console.error('Error updating note:', error);
                        });
                    } else {
                        console.error(`Container for sticky note ${element.dataset.id} not found`);
                    }

                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                }
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        element.addEventListener('dblclick', () => {
            element.contentEditable = true;
            element.focus();
        });

        element.addEventListener('blur', () => {
            element.contentEditable = false;
        });
    }

    function createStickyNoteElement(noteData) {
        const stickyNote = document.createElement('div');
        stickyNote.className = 'sticky-note';
        stickyNote.contentEditable = true;
        stickyNote.textContent = noteData.content;
        stickyNote.style.left = `${noteData.x}px`;
        stickyNote.style.top = `${noteData.y}px`;
        stickyNote.dataset.id = noteData.id;
        return stickyNote;
    }

    function generateUniqueId() {
        return 'note-' + Math.random().toString(36).substr(2, 9);
    }

    function getCurrentQuadrantId(x, y) {
        const quadrants = document.querySelectorAll('.quadrant');
        
        for (let i = 0; i < quadrants.length; i++) {
            const quad = quadrants[i];
            const rect = quad.getBoundingClientRect();
            
            // Check if the sticky note is within the bounds of this quadrant
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                return quad.id;
            }
        }
        
        return null; // Default return if not found in any quadrant
    }
    function getCurrentQuadrantElement(x, y) {
        const quadrantId = getCurrentQuadrantId(x, y);
        
        if (quadrantId) {
            return document.getElementById(quadrantId);
        }
        
        return null; // Default return if not found in any quadrant
    }
});