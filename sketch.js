// --- p5.js Sketch ---

let canvas;
let mediaElements = []; // To store all loaded videos and images
let videos = []; // To store only video elements for easy access
let isPlaying = false;
let isSeeking = false;
let masterVideo = null; // The video with the longest duration

// Layout variables
let gridCols = 0;
let gridRows = 0;
let gridLayout = []; // Stores position and dimensions of each grid cell
let isUpdatingLayout = false; // Flag to prevent recursive layout updates

// Interaction variables
let isDragging = false;
let draggedMedia = null; // The media element being dragged
let hoveredMediaIndex = -1; // Index of media being hovered over

// Control variables
let isLooping = true;
let zoomLevel = 1.0;

// Theme and color variables
let frameRateInput;
let canvasBgColor, canvasTextColor, canvasBorderColor;
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;
const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;


// --- p5.js Setup Function ---
function setup() {
    let canvasContainer = document.getElementById('canvas-container');
    canvas = createCanvas(canvasContainer.clientWidth, canvasContainer.clientHeight);
    canvas.parent('canvas-container');
    
    // Set up drag and drop functionality for files
    canvas.drop(handleFile);
    canvas.dragOver(() => select('#canvas-container').style('border-style', 'solid'));
    canvas.dragLeave(() => select('#canvas-container').style('border-style', 'dashed'));

    // --- Control Event Listeners ---
    const playPauseBtn = select('#play-pause-btn');
    const nextFrameBtn = select('#next-frame-btn');
    const prevFrameBtn = select('#prev-frame-btn');
    const seekSlider = select('#seek-slider');
    const autoLayoutBtn = select('#auto-layout-btn');
    const clearAllBtn = select('#clear-all-btn');
    const colsInput = select('#cols-input');
    const rowsInput = select('#rows-input');
    const loopToggle = select('#loop-toggle');
    const zoomSlider = select('#zoom-slider');
    const importMediaBtn = select('#import-media-btn');
    const fileInput = select('#file-input');
    const themeToggleBtn = select('#theme-toggle-btn');
    frameRateInput = select('#framerate-input');

    // --- Initialize UI and Theme ---
    initializeTheme();

    // --- Assign Event Handlers ---
    importMediaBtn.mousePressed(() => fileInput.elt.click());
    fileInput.changed(handleFileInput);
    themeToggleBtn.mousePressed(toggleTheme);
    playPauseBtn.mousePressed(togglePlayPause);
    nextFrameBtn.mousePressed(() => stepFrame(1));
    prevFrameBtn.mousePressed(() => stepFrame(-1));
    autoLayoutBtn.mousePressed(autoLayout);
    clearAllBtn.mousePressed(clearAllMedia);
    loopToggle.changed(toggleLooping);
    zoomSlider.input(updateZoom);
    
    colsInput.input(() => updateGridLayout('cols'));
    rowsInput.input(() => updateGridLayout('rows'));

    seekSlider.mousePressed(() => isSeeking = true);
    seekSlider.mouseReleased(() => {
        isSeeking = false;
        handleSeek(); 
    });
    seekSlider.input(handleSeek);

    updateControlsState();
}

// --- p5.js Draw Loop ---
function draw() {
    background(canvasBgColor);

    updateHoveredMedia();

    if (mediaElements.length === 0 && !isDragging) {
        cursor('pointer'); // Change cursor to indicate clickability
        textAlign(CENTER, CENTER);
        textSize(24);
        noStroke();
        fill(canvasTextColor);
        // Updated text to reflect new functionality
        text('Drag & Drop or Click to Import Media', width / 2, height / 2);
        return;
    } else {
        cursor('arrow'); // Reset cursor to default
    }

    drawMediaGrid();
    
    if (isDragging && draggedMedia) {
        const { elt } = draggedMedia;
        const aspect = elt.width / elt.height;
        const previewWidth = 150; 
        const previewHeight = previewWidth / aspect;
        image(elt, mouseX - previewWidth / 2, mouseY - previewHeight / 2, previewWidth, previewHeight);
    }
    
    if (masterVideo && !isSeeking) {
        updateSliderAndTime();
    }
}

// --- Theme Management ---
function initializeTheme() {
    // If a theme is saved as 'light', use light mode.
    // Otherwise (if it's 'dark' or not set yet), default to dark mode.
    const isDarkMode = localStorage.getItem('theme') !== 'light';
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    updateThemeUI();
    updateCanvasColorScheme();
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    updateThemeUI();
    updateCanvasColorScheme();
}

function updateThemeUI() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const themeToggleBtn = select('#theme-toggle-btn');
    if (isDarkMode) {
        themeToggleBtn.html(sunIcon);
        themeToggleBtn.attribute('title', 'Switch to Light Mode');
    } else {
        themeToggleBtn.html(moonIcon);
        themeToggleBtn.attribute('title', 'Switch to Dark Mode');
    }
}

function updateCanvasColorScheme() {
    let style = getComputedStyle(document.body);
    canvasBgColor = color(style.getPropertyValue('--canvas-bg-p5').trim());
    canvasTextColor = color(style.getPropertyValue('--text-secondary').trim());
    canvasBorderColor = color(style.getPropertyValue('--canvas-border-p5').trim());
    select('#canvas-container').style('border-color', canvasBorderColor.toString('#rrggbb'));
}

// --- Core Functions ---

function clearAllMedia() {
    // Stop playback if it's running
    if (isPlaying) {
        togglePlayPause();
    }

    // Remove all media elements from the DOM
    for (let media of mediaElements) {
        media.elt.remove();
    }

    // Clear arrays
    mediaElements = [];
    videos = [];
    gridLayout = [];

    // Reset state variables
    masterVideo = null;
    hoveredMediaIndex = -1;
    isDragging = false;
    draggedMedia = null;
    isPlaying = false; // Explicitly reset playing state

    // Reset UI to initial state
    updateControlsState();
    select('#seek-slider').value(0);
    select('#timecode').html('00:00.00 / 00:00.00');
    select('#frame-counter').html('0 / 0');
    select('#play-pause-btn').html('Play');
    autoLayout(); // This will also reset grid inputs
}


function handleFileInput(event) {
    const files = event.target.files;
    for (const file of files) {
        let fileType;
        if (file.type.startsWith('video/')) fileType = 'video';
        else if (file.type.startsWith('image/')) fileType = 'image';
        else {
            console.log('Unsupported file type:', file.type);
            continue;
        }
        const fileUrl = URL.createObjectURL(file);
        const mockP5File = { type: fileType, data: fileUrl, name: file.name };
        handleFile(mockP5File);
    }
    event.target.value = '';
}

function handleFile(file) {
    let mediaEl;
    if (file.type === 'video') {
        const isFirstVideo = videos.length === 0;
        mediaEl = createVideo(file.data, () => {
             mediaEl.volume(0);
             const masterTime = masterVideo ? masterVideo.time() : 0;
             const newVideoDuration = mediaEl.duration();
             mediaEl.time(min(masterTime, newVideoDuration));
             findLongestVideo();
             if (isFirstVideo) {
                 togglePlayPause();
             } else {
                 if (isPlaying && mediaEl.time() < newVideoDuration) mediaEl.play();
                 else mediaEl.pause();
             }
             updateSliderAndTime();
        });
        videos.push(mediaEl);
    } else if (file.type === 'image') {
        mediaEl = createImg(file.data, 'image');
    } else {
        console.log('Unsupported file type:', file.type);
        select('#canvas-container').style('border-style', 'dashed');
        return;
    }

    mediaEl.hide();
    mediaElements.push({ elt: mediaEl, type: file.type, name: file.name });
    autoLayout();
    // Manually update controls state, especially for images, as findLongestVideo isn't called.
    updateControlsState();
    select('#canvas-container').style('border-style', 'dashed');
}

function findLongestVideo() {
    if (videos.length === 0) {
        masterVideo = null;
        // If there are no videos, nothing can be playing.
        if (isPlaying) {
            isPlaying = false;
            select('#play-pause-btn').html('Play');
        }
    } else {
        masterVideo = videos.reduce((a, b) => (a.duration() > b.duration() ? a : b));
    }
    updateControlsState();
}

function togglePlayPause() {
    if (!masterVideo) return;
    const masterTime = masterVideo.time();
    const duration = masterVideo.duration();
    const frameRate = parseFloat(frameRateInput.value()) || 30;
    const frameDuration = 1 / frameRate;

    if (!isPlaying && !isLooping && masterTime >= duration - frameDuration) {
        videos.forEach(v => { v.time(0); v.play(); });
        isPlaying = true;
        select('#play-pause-btn').html('Pause');
        return;
    }

    isPlaying = !isPlaying;
    if (isPlaying) {
        videos.forEach(v => { if (v.time() < v.duration()) v.play(); });
        select('#play-pause-btn').html('Pause');
    } else {
        videos.forEach(v => v.pause());
        select('#play-pause-btn').html('Play');
    }
}

function handleSeek() {
    if (!masterVideo) return;
    const duration = masterVideo.duration();
    if (isNaN(duration)) return;
    const seekTime = (select('#seek-slider').value() / 1000) * duration;
    videos.forEach(v => v.pause());
    let seekedCount = 0;
    const totalVideos = videos.length;
    const onAllSeeked = () => {
        if (isPlaying) videos.forEach(v => { if (v.time() < v.duration()) v.play(); });
    };
    if (totalVideos === 0) { onAllSeeked(); return; }
    videos.forEach(v => {
        const newTime = min(seekTime, v.duration());
        v.elt.onseeked = () => {
            seekedCount++;
            v.elt.onseeked = null; 
            if (seekedCount === totalVideos) onAllSeeked();
        };
        v.time(newTime);
    });
}

function stepFrame(direction) {
    if (!masterVideo) return;
    if (isPlaying) togglePlayPause();
    const frameRate = parseFloat(frameRateInput.value()) || 30;
    const frameDuration = 1 / frameRate;
    let newMasterTime = masterVideo.time() + (direction * frameDuration);
    videos.forEach(v => {
        const newTime = constrain(newMasterTime, 0, v.duration());
        v.time(newTime);
    });
}

function toggleLooping() { isLooping = this.checked(); }
function updateZoom() {
    zoomLevel = this.value();
    select('#zoom-display').html(`${Number(zoomLevel).toFixed(1)}x`);
}

function drawMediaGrid() {
    let cols = gridCols > 0 ? gridCols : 1;
    let rows = gridRows > 0 ? gridRows : 1;
    if (gridCols === 0 || gridRows === 0) {
        const count = mediaElements.length + (isDragging ? 1 : 0);
        const layout = calculateBestGrid(count, width / height);
        cols = layout.cols;
        rows = layout.rows;
        if (parseInt(select('#cols-input').value()) !== cols) select('#cols-input').value(cols);
        if (parseInt(select('#rows-input').value()) !== rows) select('#rows-input').value(rows);
    }
    const cellWidth = width / cols;
    const cellHeight = height / rows;
    let dropPreviewIndex = -1;
    if (isDragging) {
        const hoverCol = floor(mouseX / cellWidth);
        const hoverRow = floor(mouseY / cellHeight);
        dropPreviewIndex = hoverCol + hoverRow * cols;
    }
    gridLayout = [];
    let mediaIndex = 0;
    for (let i = 0; i < cols * rows; i++) {
        const r = floor(i / cols);
        const c = i % cols;
        if (isDragging && i === dropPreviewIndex) {
            noStroke();
            fill(canvasTextColor.toString().replace(/,1\)$/, ',0.2)')); // semi-transparent
            rect(c * cellWidth, r * cellHeight, cellWidth, cellHeight, 8);
            continue;
        }
        if (mediaIndex >= mediaElements.length) continue;
        const media = mediaElements[mediaIndex];
        const { elt } = media;
        const mediaW = elt.width;
        const mediaH = elt.height;
        if (mediaW > 0 && mediaH > 0) {
            const sW = mediaW / zoomLevel, sH = mediaH / zoomLevel;
            const sX = (mediaW - sW) / 2, sY = (mediaH - sH) / 2;
            const cellAspect = cellWidth / cellHeight, mediaAspect = sW / sH;
            let drawW, drawH;
            if (mediaAspect > cellAspect) { drawW = cellWidth; drawH = cellWidth / mediaAspect; } 
            else { drawH = cellHeight; drawW = cellHeight * mediaAspect; }
            const x = c * cellWidth + (cellWidth - drawW) / 2;
            const y = r * cellHeight + (cellHeight - drawH) / 2;
            image(elt, x, y, drawW, drawH, sX, sY, sW, sH);
            const currentPos = { x, y, w: drawW, h: drawH };
            gridLayout[mediaIndex] = currentPos;
            if (mediaIndex === hoveredMediaIndex && !isDragging) drawHoverOverlay(media, currentPos);
        }
        mediaIndex++;
    }
}

function drawHoverOverlay(media, pos) {
    const xButtonSize = 24;
    const textPadding = 6;
    push();
    textAlign(LEFT, TOP);
    textSize(12);
    const maxTextWidth = pos.w - xButtonSize - (textPadding * 3);
    let displayText = media.name;
    if (textWidth(displayText) > maxTextWidth) {
        while (textWidth(displayText + '...') > maxTextWidth && displayText.length > 0) displayText = displayText.slice(0, -1);
        displayText += '...';
    }
    const textW = textWidth(displayText) + textPadding * 2;
    const textH = 14 + textPadding * 2;
    noStroke();
    fill(0, 0, 0, 180);
    rect(pos.x, pos.y, textW, textH, 4, 0, 4, 0);
    fill(255);
    text(displayText, pos.x + textPadding, pos.y + textPadding + 2);
    pop();
    push();
    const xButtonX = pos.x + pos.w - xButtonSize;
    const xButtonY = pos.y;
    fill(0, 0, 0, 180);
    noStroke();
    rect(xButtonX, xButtonY, xButtonSize, xButtonSize, 0, 4, 0, 4);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(18);
    text('×', xButtonX + xButtonSize / 2, xButtonY + xButtonSize / 2);
    pop();
}

function updateHoveredMedia() {
    if (isDragging) { hoveredMediaIndex = -1; return; }
    hoveredMediaIndex = -1;
    for (let i = 0; i < gridLayout.length; i++) {
        const pos = gridLayout[i];
        if (pos && mouseX > pos.x && mouseX < pos.x + pos.w && mouseY > pos.y && mouseY < pos.y + pos.h) {
            hoveredMediaIndex = i;
            break;
        }
    }
}

function updateGridLayout(source) {
    if (isUpdatingLayout) return; // Prevent recursive updates
    isUpdatingLayout = true;

    const colsInput = select('#cols-input');
    const rowsInput = select('#rows-input');
    const numMedia = mediaElements.length;

    let cols = parseInt(colsInput.value());
    let rows = parseInt(rowsInput.value());

    if (numMedia === 0) {
        gridCols = !isNaN(cols) && cols > 0 ? cols : 0;
        gridRows = !isNaN(rows) && rows > 0 ? rows : 0;
        isUpdatingLayout = false;
        return;
    }

    if (source === 'cols') {
        if (!isNaN(cols) && cols > 0) {
            const newRows = Math.ceil(numMedia / cols);
            rowsInput.value(newRows);
            gridCols = cols;
            gridRows = newRows;
        } else {
            autoLayout();
        }
    } else if (source === 'rows') {
        if (!isNaN(rows) && rows > 0) {
            const newCols = Math.ceil(numMedia / rows);
            colsInput.value(newCols);
            gridCols = newCols;
            gridRows = rows;
        } else {
            autoLayout();
        }
    }

    isUpdatingLayout = false;
}

function autoLayout() {
    gridCols = 0;
    gridRows = 0;
    select('#cols-input').value('');
    select('#rows-input').value('');
}

function calculateBestGrid(n, targetAspect) {
    if (n === 0) return { cols: 1, rows: 1 };
    let bestLayout = { cols: n, rows: 1 };
    let minDiff = Infinity;
    for (let c = 1; c <= n; c++) {
        let r = Math.ceil(n / c);
        let aspect = (c / r);
        let diff = Math.abs(aspect - targetAspect);
        if (diff < minDiff) { minDiff = diff; bestLayout = { cols: c, rows: r }; }
    }
    return bestLayout;
}

function updateSliderAndTime() {
    if (!masterVideo || isSeeking) return;
    const duration = masterVideo.duration();
    let currentTime = masterVideo.time();
    if (isNaN(duration) || duration === 0) return;
    const frameRate = parseFloat(frameRateInput.value()) || 30;
    const frameDuration = 1 / frameRate;
    if (currentTime >= duration - frameDuration) {
        if (isLooping) {
            isSeeking = true;
            videos.forEach(v => v.pause());
            let seekedCount = 0;
            const totalVideos = videos.length;
            const onAllSeeked = () => {
                if (isPlaying) videos.forEach(v => v.play());
                isSeeking = false;
            };
            if (totalVideos === 0) { isSeeking = false; return; }
            videos.forEach(v => {
                v.elt.onseeked = () => {
                    seekedCount++;
                    v.elt.onseeked = null;
                    if (seekedCount === totalVideos) onAllSeeked();
                };
                v.time(0);
            });
            return;
        } else {
            if (isPlaying) togglePlayPause();
            videos.forEach(v => v.time(v.duration()));
        }
    } else if (isPlaying) {
        videos.forEach(v => {
            if (v !== masterVideo && currentTime >= v.duration() && !v.elt.paused) {
                v.pause(); v.time(v.duration());
            }
        });
    }
    const currentMasterTime = masterVideo.time();
    select('#seek-slider').value((currentMasterTime / duration) * 1000);
    select('#timecode').html(`${formatTime(currentMasterTime)} / ${formatTime(duration)}`);
    select('#frame-counter').html(`${Math.round(currentMasterTime * frameRate)} / ${Math.round(duration * frameRate)}`);
}

function formatTime(time) {
    if (isNaN(time) || time === Infinity) return "00:00.00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const hundredths = Math.floor((time % 1) * 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

function updateControlsState() {
    const hasVideo = masterVideo !== null;
    select('#play-pause-btn').elt.disabled = !hasVideo;
    select('#next-frame-btn').elt.disabled = !hasVideo;
    select('#prev-frame-btn').elt.disabled = !hasVideo;
    select('#seek-slider').elt.disabled = !hasVideo;
    select('#clear-all-btn').elt.disabled = mediaElements.length === 0;
}

function mousePressed() {
    // If no media is loaded, and the click is inside the canvas, trigger file import.
    if (mediaElements.length === 0 && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        if (mouseButton === LEFT) {
            select('#file-input').elt.click();
        }
        return; // Stop further execution for this click
    }

    if (mouseButton !== LEFT || isDragging) return;

    if (hoveredMediaIndex !== -1) {
        const pos = gridLayout[hoveredMediaIndex];
        const xButtonSize = 24;
        const xButtonX = pos.x + pos.w - xButtonSize;
        const xButtonY = pos.y;
        if (mouseX > xButtonX && mouseX < xButtonX + xButtonSize && mouseY > xButtonY && mouseY < xButtonY + xButtonSize) {
            const removedMedia = mediaElements.splice(hoveredMediaIndex, 1)[0];
            if (removedMedia.type === 'video') {
                videos = videos.filter(v => v !== removedMedia.elt);
                findLongestVideo();
            } else {
                // If an image was removed, we still need to update the controls
                updateControlsState();
            }
            removedMedia.elt.remove();
            hoveredMediaIndex = -1;
            autoLayout();
            return;
        }
    }
    
    if (hoveredMediaIndex !== -1) {
        isDragging = true;
        draggedMedia = mediaElements.splice(hoveredMediaIndex, 1)[0];
    }
}

function mouseReleased() {
    if (!isDragging || !draggedMedia) { isDragging = false; return; }
    let cols = gridCols > 0 ? gridCols : 1;
    let rows = gridRows > 0 ? gridRows : 1;
    if (gridCols === 0 || gridRows === 0) {
        const count = mediaElements.length + 1;
        const layout = calculateBestGrid(count, width / height);
        cols = layout.cols;
        rows = layout.rows;
    }
    const cellWidth = width / cols;
    const cellHeight = height / rows;
    const hoverCol = constrain(floor(mouseX / cellWidth), 0, cols - 1);
    const hoverRow = constrain(floor(mouseY / cellHeight), 0, rows - 1);
    let targetIndex = hoverCol + hoverRow * cols;
    targetIndex = min(targetIndex, mediaElements.length);
    mediaElements.splice(targetIndex, 0, draggedMedia);
    isDragging = false;
    draggedMedia = null;
}

// --- Handles keyboard shortcuts ---
function keyPressed() {
    // Prevent hotkeys from firing when typing in an input field
    if (document.activeElement.tagName === 'INPUT') {
        return;
    }

    if (keyCode === 32) { // Spacebar
        togglePlayPause();
        return false; // Prevent default browser action (e.g., scrolling)
    } else if (keyCode === LEFT_ARROW) {
        stepFrame(-1);
    } else if (keyCode === RIGHT_ARROW) {
        stepFrame(1);
    }
}

function windowResized() {
    let canvasContainer = document.getElementById('canvas-container');
    resizeCanvas(canvasContainer.clientWidth, canvasContainer.clientHeight);
    updateCanvasColorScheme();
}
