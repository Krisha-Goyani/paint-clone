document.addEventListener('DOMContentLoaded', function() {
    // Canvas setup
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    function resizeCanvas() {
        const container = document.querySelector('.container');
        const containerWidth = container.clientWidth - 40;
        canvas.width = containerWidth;
        
        // Make canvas height responsive
        const viewportHeight = window.innerHeight;
        const toolbarHeight = document.querySelector('.toolbar').offsetHeight;
        const actionButtonsHeight = document.querySelector('.action-buttons').offsetHeight;
        const padding = 40; // Total vertical padding
        
        canvas.height = Math.max(300, viewportHeight - toolbarHeight - actionButtonsHeight - padding);
        
        // Load saved canvas data after resize
        loadCanvasFromLocalStorage();
    }
    
    // Initialize canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Tool state
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let selectedTool = 'brush';
    let brushSize = 10;
    let fillColor = '#000000';
    let strokeColor = '#000000';
    
    // History for undo/redo
    let history = [];
    let historyIndex = -1;
    const maxHistorySteps = 50;
    
    // Save current state to history
    function saveState() {
        // Remove any redo states
        if (historyIndex < history.length - 1) {
            history = history.slice(0, historyIndex + 1);
        }
        
        // Add current state to history
        const state = canvas.toDataURL();
        history.push(state);
        if (history.length > maxHistorySteps) {
            history.shift();
        }
        historyIndex = history.length - 1;
        
        // Save to localStorage
        saveCanvasToLocalStorage();
    }
    
    // Initialize with a blank state
    function initializeCanvas() {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveState();
    }
    
    // Check if there's existing data
    if (localStorage.getItem('canvasData')) {
        loadCanvasFromLocalStorage();
    } else {
        initializeCanvas();
    }
    
    // Undo function
    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            const img = new Image();
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                saveCanvasToLocalStorage();
            };
            img.src = history[historyIndex];
        }
    }
    
    // Redo function
    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            const img = new Image();
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                saveCanvasToLocalStorage();
            };
            img.src = history[historyIndex];
        }
    }
    
    // Drawing functions
    function startDrawing(e) {
        isDrawing = true;
        [lastX, lastY] = getCoordinates(e);
        
        // For single click dots
        ctx.beginPath();
        ctx.arc(lastX, lastY, brushSize / 2, 0, Math.PI * 2);
        
        if (selectedTool === 'brush') {
            ctx.fillStyle = strokeColor;
        } else if (selectedTool === 'eraser') {
            ctx.fillStyle = fillColor;
        }
        
        ctx.fill();
    }
    
    function draw(e) {
        if (!isDrawing) return;
        
        const [currentX, currentY] = getCoordinates(e);
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (selectedTool === 'brush') {
            ctx.strokeStyle = strokeColor;
        } else if (selectedTool === 'eraser') {
            ctx.strokeStyle = '#FFFFFF'; // Use white for eraser
        }
        
        ctx.stroke();
        [lastX, lastY] = [currentX, currentY];
    }
    
    function stopDrawing() {
        if (isDrawing) {
            isDrawing = false;
            saveState();
        }
    }
    
    function getCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;    // relationship bitmap vs. element for X
        const scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y

        if (e.type.includes('touch')) {
            return [
                (e.touches[0].clientX - rect.left) * scaleX,
                (e.touches[0].clientY - rect.top) * scaleY
            ];
        } else {
            return [
                (e.clientX - rect.left) * scaleX,
                (e.clientY - rect.top) * scaleY
            ];
        }
    }
    
    // Fill canvas function
    function fillCanvas() {
        ctx.fillStyle = fillColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveState();
    }
    
    // Clear canvas function
    function clearCanvas() {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveState();
    }
    
    // Local storage functions
    function saveCanvasToLocalStorage() {
        localStorage.setItem('canvasData', canvas.toDataURL());
    }
    
    function loadCanvasFromLocalStorage() {
        const savedCanvas = localStorage.getItem('canvasData');
        if (savedCanvas) {
            const img = new Image();
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = savedCanvas;
        }
    }
    
    // Color picker functionality
    function setupColorPicker(type) {
        const pickerCanvas = document.getElementById(`${type}-color-canvas`);
        const pickerCtx = pickerCanvas.getContext('2d');
        const colorInput = document.getElementById(`${type}-color-input`);
        const rInput = document.getElementById(`${type}-r`);
        const gInput = document.getElementById(`${type}-g`);
        const bInput = document.getElementById(`${type}-b`);
        
        // Create gradient
        const gradient = pickerCtx.createLinearGradient(0, 0, pickerCanvas.width, 0);
        const hueSteps = 12;
        for (let i = 0; i <= hueSteps; i++) {
            const hue = (i / hueSteps) * 360;
            gradient.addColorStop(i / hueSteps, `hsl(${hue}, 100%, 50%)`);
        }
        pickerCtx.fillStyle = gradient;
        pickerCtx.fillRect(0, 0, pickerCanvas.width, pickerCanvas.height / 2);
        
        // Create brightness gradient
        const brightnessGradient = pickerCtx.createLinearGradient(0, pickerCanvas.height / 2, 0, pickerCanvas.height);
        brightnessGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        brightnessGradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
        pickerCtx.fillStyle = brightnessGradient;
        pickerCtx.fillRect(0, pickerCanvas.height / 2, pickerCanvas.width, pickerCanvas.height / 2);
        
        // Update color inputs
        function updateColorInputs(hex) {
            colorInput.value = hex;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            rInput.value = r;
            gInput.value = g;
            bInput.value = b;
        }
        
        // Handle canvas click
        pickerCanvas.addEventListener('click', function(e) {
            const rect = pickerCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const pixel = pickerCtx.getImageData(x, y, 1, 1).data;
            const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
            
            if (type === 'fill') {
                fillColor = hex;
            } else {
                strokeColor = hex;
            }
            
            updateColorInputs(hex);
            document.querySelector(`#${type}-color-picker .color-option-picker`).style.backgroundColor = hex;
            document.querySelector(`#${type}-color-picker .color-option-picker`).setAttribute('data-color', hex);
        });
        
        // Handle color input change
        colorInput.addEventListener('input', function() {
            const hex = this.value;
            if (type === 'fill') {
                fillColor = hex;
            } else {
                strokeColor = hex;
            }
            
            updateColorInputs(hex);
            document.querySelector(`#${type}-color-picker .color-option`).style.backgroundColor = hex;
            document.querySelector(`#${type}-color-picker .color-option`).setAttribute('data-color', hex);
        });
        
        // Handle RGB inputs
        function handleRGBInput() {
            const r = Math.min(255, Math.max(0, parseInt(rInput.value) || 0));
            const g = Math.min(255, Math.max(0, parseInt(gInput.value) || 0));
            const b = Math.min(255, Math.max(0, parseInt(bInput.value) || 0));
            const hex = rgbToHex(r, g, b);
            
            if (type === 'fill') {
                fillColor = hex;
            } else {
                strokeColor = hex;
            }
            
            colorInput.value = hex;
            document.querySelector(`#${type}-color-picker .color-option`).style.backgroundColor = hex;
            document.querySelector(`#${type}-color-picker .color-option`).setAttribute('data-color', hex);
        }
        
        rInput.addEventListener('input', handleRGBInput);
        gInput.addEventListener('input', handleRGBInput);
        bInput.addEventListener('input', handleRGBInput);
    }
    
    // Initialize color pickers
    setupColorPicker('fill');
    setupColorPicker('stroke');
    
    // Helper function to convert RGB to HEX
    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.min(255, Math.max(0, x)).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
    
    // Update recently used colors
    function updateRecentColors(type, color) {
        const colorOptions = document.getElementById(`${type}-colors`);
        const colorElements = Array.from(colorOptions.querySelectorAll('.color-option'));
        
        // Check if color already exists in recent colors
        let existingIndex = -1;
        for (let i = 0; i < colorElements.length; i++) {
            if (colorElements[i].getAttribute('data-color').toLowerCase() === color.toLowerCase()) {
                existingIndex = i;
                break;
            }
        }
        
        if (existingIndex === -1) {
            // Create a new color element
            const newColor = document.createElement('div');
            newColor.className = 'color-option';
            newColor.style.backgroundColor = color;
            newColor.setAttribute('data-color', color);
            
            // Remove the first (oldest) color
            if (colorElements.length >= 5) {
                colorOptions.removeChild(colorElements[0]);
            }
            
            // Add the new color to the end
            colorOptions.appendChild(newColor);
            
            // Add event listener to the new color
            newColor.addEventListener('click', function() {
                if (type === 'fill') {
                    fillColor = color;
                } else {
                    strokeColor = color;
                }
                
                colorOptions.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
            });
        }
        
        // Update selected color
        colorOptions.querySelectorAll('.color-option').forEach(c => {
            if (c.getAttribute('data-color').toLowerCase() === color.toLowerCase()) {
                c.classList.add('selected');
            } else {
                c.classList.remove('selected');
            }
        });
    }
    
    // Event Listeners
    // Canvas events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
    
    // Color option events
    document.querySelectorAll('.color-option').forEach(colorOption => {
        colorOption.addEventListener('click', function() {
            const color = this.getAttribute('data-color');
            const toolSection = this.closest('.tool-section');
            const isFillSection = toolSection.querySelector('#fill-colors') !== null;
            
            if (isFillSection) {
                fillColor = color;
                // Update selected state in fill section
                toolSection.querySelectorAll('.color-option').forEach(c => {
                    c.classList.remove('selected');
                });
                this.classList.add('selected');
                updateRecentColors('fill', color);
            } else {
                strokeColor = color;
                selectedTool = 'brush';
                canvas.className = 'brush-tool';
                // Update selected state in stroke section
                toolSection.querySelectorAll('.color-option').forEach(c => {
                    c.classList.remove('selected');
                });
                this.classList.add('selected');
                updateRecentColors('stroke', color);
            }
        });
    });
    
    // Color picker toggle
    document.querySelectorAll('.color-picker .color-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            const pickerId = this.parentElement.id;
            const popupId = pickerId === 'fill-color-picker' ? 'fill-picker-popup' : 'stroke-picker-popup';
            
            // Close all popups first
            document.querySelectorAll('.color-picker-popup').forEach(popup => {
                popup.classList.remove('active');
            });
            
            // Open this popup
            document.getElementById(popupId).classList.add('active');
        });
    });
    
    // Close picker when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.color-picker-popup') && !e.target.closest('.color-picker .color-option')) {
            document.querySelectorAll('.color-picker-popup').forEach(popup => {
                popup.classList.remove('active');
            });
        }
    });
    
    // Button events
    document.getElementById('fill-apply').addEventListener('click', function() {
        fillCanvas();
        updateRecentColors('fill', fillColor);
    });
    
    document.getElementById('stroke-apply').addEventListener('click', function() {
        selectedTool = 'brush';
        updateRecentColors('stroke', strokeColor);
    });
    
    document.getElementById('clear-canvas').addEventListener('click', clearCanvas);
    
    document.getElementById('eraser').addEventListener('click', function() {
        selectedTool = 'eraser';
        canvas.className = 'eraser-tool';
        
        // Remove selected state from stroke colors
        document.querySelectorAll('#stroke-colors .color-option, .permanent-colors .color-option').forEach(c => {
            c.classList.remove('selected');
        });
    });
    
    document.getElementById('undo').addEventListener('click', undo);
    document.getElementById('redo').addEventListener('click', redo);
    
    // Brush size events
    const brushSizeInput = document.getElementById('brush-size');
    const brushSizeValue = document.getElementById('brush-size-value');
    
    brushSizeInput.addEventListener('input', function() {
        brushSize = parseInt(this.value);
        brushSizeValue.textContent = brushSize + ' px';
    });
    
    // Initialize brush size display
    brushSizeValue.textContent = brushSizeInput.value + ' px';
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl+Z for undo
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            undo();
        }
        // Ctrl+Y for redo
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            redo();
        }
    });
    
    // Save initial state
    if (history.length === 0) {
        saveState();
    }
    
    // Add this function to create the gradient icon
    function createColorPickerIcon(type) {
        const iconCanvas = document.createElement('canvas');
        iconCanvas.width = 25;  // Match the icon size
        iconCanvas.height = 25;
        const ctx = iconCanvas.getContext('2d');
        
        // Create rainbow gradient
        const gradient = ctx.createLinearGradient(0, 0, iconCanvas.width, 0);
        gradient.addColorStop(0, '#ff0000');    // Red
        gradient.addColorStop(0.17, '#ff00ff'); // Magenta
        gradient.addColorStop(0.34, '#0000ff'); // Blue
        gradient.addColorStop(0.51, '#00ffff'); // Cyan
        gradient.addColorStop(0.68, '#00ff00'); // Green
        gradient.addColorStop(0.85, '#ffff00'); // Yellow
        gradient.addColorStop(1, '#ff0000');    // Red
        
        // Fill background with gradient
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, iconCanvas.width, iconCanvas.height);
        
        // Set the icon background
        const colorPicker = document.querySelector(`#${type}-color-picker .color-option`);
        colorPicker.style.backgroundImage = `url(${iconCanvas.toDataURL()})`;
    }
    
    // Initialize color picker icons
    createColorPickerIcon('fill');
    createColorPickerIcon('stroke');
}); 