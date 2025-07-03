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
let isPanning = false;
let lastMouseX = 0, lastMouseY = 0;
let isDraggingSlider = false; // To prevent canvas interaction when using sliders

// Control variables
let isLooping = true;
let zoomLevel = 1.0;
let panX = 0, panY = 0;
let playbackRate = 1.0; // For playback speed
const speedLevels = [0.1, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]; // Speed options

// Theme and color variables
let frameRateInput;
let canvasBgColor, canvasTextColor, canvasBorderColor;
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;
const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;
const speedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
const loopIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>`;
// NEW: Help icon
const helpIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;


// --- p5.js Setup Function ---
function setup() {
    let canvasContainer = document.getElementById('canvas-container');
    canvas = createCanvas(canvasContainer.clientWidth, canvasContainer.clientHeight);
    canvas.parent('canvas-container');
    
    canvas.drop(handleFile);
    canvas.dragOver(() => select('#canvas-container').style('border-style', 'solid'));
    canvas.dragLeave(() => select('#canvas-container').style('border-style', 'dashed'));
    canvas.mouseWheel(handleMouseWheel);

    // --- Control Event Listeners ---
    const playPauseBtn = select('#play-pause-btn');
    const nextFrameBtn = select('#next-frame-btn');
    const prevFrameBtn = select('#prev-frame-btn');
    const seekSlider = select('#seek-slider');
    const autoLayoutBtn = select('#auto-layout-btn');
    const clearAllBtn = select('#clear-all-btn');
    const colsInput = select('#cols-input');
    const rowsInput = select('#rows-input');
    const loopBtn = select('#loop-btn');
    const zoomSlider = select('#zoom-slider');
    const importMediaBtn = select('#import-media-btn');
    const fileInput = select('#file-input');
    const themeToggleBtn = select('#theme-toggle-btn');
    const helpBtn = select('#help-btn'); // NEW
    frameRateInput = select('#framerate-input');

    // Speed control elements
    const speedBtn = select('#speed-btn');
    const speedMenu = select('#speed-menu');
    const speedSlider = select('#speed-slider');
    const speedControlWrapper = select('#speed-control-wrapper');

    // --- Initialize UI and Theme ---
    initializeTheme();
    speedBtn.html(speedIcon); // Inject speed icon
    loopBtn.html(loopIcon); // Inject loop icon
    helpBtn.html(helpIcon); // NEW: Inject help icon

    // --- Assign Event Handlers ---
    importMediaBtn.mousePressed(() => fileInput.elt.click());
    fileInput.changed(handleFileInput);
    themeToggleBtn.mousePressed(toggleTheme);
    playPauseBtn.mousePressed(togglePlayPause);
    nextFrameBtn.mousePressed(() => stepFrame(1));
    prevFrameBtn.mousePressed(() => stepFrame(-1));
    autoLayoutBtn.mousePressed(autoLayout);
    clearAllBtn.mousePressed(clearAllMedia);
    loopBtn.mousePressed(toggleLooping);
    zoomSlider.input(updateZoom);
    // NEW: Help button link
    helpBtn.mousePressed(() => {
        window.open('https://github.com/WhatDreamsCost/MediaSyncer', '_blank');
    });
    
    colsInput.input(() => updateGridLayout('cols'));
    rowsInput.input(() => updateGridLayout('rows'));

    seekSlider.mousePressed(() => isSeeking = true);
    seekSlider.mouseReleased(() => {
        isSeeking = false;
        handleSeek(); 
    });
    seekSlider.input(handleSeek);

    // Speed control event listeners
    speedSlider.input(updatePlaybackSpeed);
    
    // Added listeners to sliders to prevent canvas dragging
    speedSlider.mousePressed(() => { isDraggingSlider = true; });
    zoomSlider.mousePressed(() => { isDraggingSlider = true; });
    
    // Toggles the speed menu visibility when the button is clicked
    speedBtn.mousePressed(() => {
        speedMenu.toggleClass('visible');
    });

    // Listener to close menu when clicking anywhere outside of it
    document.body.addEventListener('click', (event) => {
        if (!speedMenu.hasClass('visible')) {
            return;
        }
        if (!speedControlWrapper.elt.contains(event.target)) {
            speedMenu.removeClass('visible');
        }
    });

    // Set initial active state for loop button
    if (isLooping) {
        loopBtn.addClass('active');
    }

    updateControlsState();
}

// --- p5.js Draw Loop ---
function draw() {
    background(canvasBgColor);

    if (isPanning) {
        cursor('grabbing');
    } else if (hoveredMediaIndex !== -1 && !isDragging) {
        cursor('grab');
    } else if (mediaElements.length === 0 && !isDragging) {
        cursor('pointer');
    } else {
        cursor('arrow');
    }

    updateHoveredMedia();

    if (mediaElements.length === 0 && !isDragging) {
        textAlign(CENTER, CENTER);
        textSize(24);
        noStroke();
        fill(canvasTextColor);
        text('Drag & Drop or Click to Import Media', width / 2, height / 2);
        return;
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
    if (isPlaying) {
        togglePlayPause();
    }
    for (let media of mediaElements) {
        media.elt.remove();
    }
    mediaElements = [];
    videos = [];
    gridLayout = [];
    masterVideo = null;
    hoveredMediaIndex = -1;
    isDragging = false;
    draggedMedia = null;
    isPlaying = false;
    
    panX = 0;
    panY = 0;
    zoomLevel = 1.0;
    select('#zoom-slider').value(1);
    select('#zoom-display').html('1.0x');
    
    playbackRate = 1.0;
    select('#speed-slider').value(4);
    select('#speed-display').html('1.00x');

    // Reset loop state
    isLooping = true;
    select('#loop-btn').addClass('active');

    updateControlsState();
    select('#seek-slider').value(0);
    select('#timecode').html('00:00.00 / 00:00.00');
    select('#frame-counter').html('0 / 0');
    select('#play-pause-btn').html('Play');
    autoLayout();
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
             mediaEl.speed(playbackRate); // Set initial speed
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
    updateControlsState();
    select('#canvas-container').style('border-style', 'dashed');
}

function findLongestVideo() {
    if (videos.length === 0) {
        masterVideo = null;
        if (isPlaying) {
            isPlaying = false;
            select('#play-pause-btn').html('Play');
        }
    } else {
        masterVideo = videos.reduce((a, b) => (a.duration() > b.duration() ? a : b));
    }
    updateControlsState();
}

// Function to handle playback speed changes
function updatePlaybackSpeed() {
    const sliderValue = parseInt(select('#speed-slider').value());
    playbackRate = speedLevels[sliderValue];
    
    select('#speed-display').html(`${playbackRate.toFixed(2)}x`);
    
    for (const video of videos) {
        video.speed(playbackRate);
    }
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

// Toggles looping state and starts playback if paused
function toggleLooping() {
    isLooping = !isLooping;
    const loopBtn = select('#loop-btn');
    if (isLooping) {
        loopBtn.addClass('active');
        // If looping is turned on and the video isn't playing, start it.
        if (!isPlaying && masterVideo) {
            togglePlayPause();
        }
    } else {
        loopBtn.removeClass('active');
    }
}

function updateZoom() {
    zoomLevel = this.value();
    select('#zoom-display').html(`${Number(zoomLevel).toFixed(1)}x`);
    constrainPan();
}

function constrainPan() {
    if (mediaElements.length === 0) {
        panX = 0;
        panY = 0;
        return;
    }
    const refMedia = mediaElements[0].elt;
    const mediaW = refMedia.width;
    const mediaH = refMedia.height;

    if (mediaW === 0 || isNaN(mediaW)) {
        panX = 0;
        panY = 0;
        return;
    }

    const sW = mediaW / zoomLevel;
    const sH = mediaH / zoomLevel;
    const maxPanX = (mediaW - sW) / 2;
    const maxPanY = (mediaH - sH) / 2;

    if (maxPanX >= 0) {
        panX = constrain(panX, -maxPanX, maxPanX);
    } else {
        panX = 0;
    }
    if (maxPanY >= 0) {
        panY = constrain(panY, -maxPanY, maxPanY);
    } else {
        panY = 0;
    }
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
            fill(canvasTextColor.toString().replace(/,1\)$/, ',0.2)'));
            rect(c * cellWidth, r * cellHeight, cellWidth, cellHeight, 8);
            continue;
        }
        if (mediaIndex >= mediaElements.length) continue;
        const media = mediaElements[mediaIndex];
        const { elt } = media;
        const mediaW = elt.width;
        const mediaH = elt.height;
        if (mediaW > 0 && mediaH > 0) {
            const sW = mediaW / zoomLevel;
            const sH = mediaH / zoomLevel;
            const sX = (mediaW - sW) / 2 + panX;
            const sY = (mediaH - sH) / 2 + panY;
            
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
    if (isDragging || isPanning) { hoveredMediaIndex = -1; return; }
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
    if (isUpdatingLayout) return;
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
    select('#speed-btn').elt.disabled = !hasVideo;
    select('#loop-btn').elt.disabled = !hasVideo;
    select('#clear-all-btn').elt.disabled = mediaElements.length === 0;
}

function mousePressed() {
    if (isDraggingSlider) return;

    if (mediaElements.length === 0 && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        if (mouseButton === LEFT) {
            select('#file-input').elt.click();
        }
        return;
    }
    
    if (mouseButton === CENTER && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        isPanning = true;
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        return;
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

function mouseDragged() {
    // Prevent canvas panning while dragging a UI slider
    if (isDraggingSlider) {
        return;
    }
    if (isPanning) {
        panX -= (mouseX - lastMouseX);
        panY -= (mouseY - lastMouseY);
        
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        
        constrainPan();
        return false;
    }
}

function mouseReleased() {
    // Reset slider dragging flag on any mouse release
    isDraggingSlider = false;

    if (isPanning) {
        isPanning = false;
        return;
    }

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

function handleMouseWheel(event) {
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        const zoomSpeed = 0.1;
        const oldZoom = zoomLevel;
        
        if (event.deltaY > 0) {
            zoomLevel -= zoomSpeed * oldZoom;
        } else {
            zoomLevel += zoomSpeed * oldZoom;
        }

        const zoomSlider = select('#zoom-slider');
        const minZoom = parseFloat(zoomSlider.elt.min);
        const maxZoom = parseFloat(zoomSlider.elt.max);
        zoomLevel = constrain(zoomLevel, minZoom, maxZoom);

        if (mediaElements.length > 0) {
            const refMedia = mediaElements[0].elt;
            const mediaW = refMedia.width;
            const mediaH = refMedia.height;
            if (mediaW > 0) {
                const mouseWorldX = (panX + (mediaW - mediaW / oldZoom) / 2) + (mouseX / width) * (mediaW / oldZoom);
                const mouseWorldY = (panY + (mediaH - mediaH / oldZoom) / 2) + (mouseY / height) * (mediaH / oldZoom);
                
                panX = mouseWorldX - (mouseX / width) * (mediaW / zoomLevel) - (mediaW - mediaW / zoomLevel) / 2;
                panY = mouseWorldY - (mouseY / height) * (mediaH / zoomLevel) - (mediaH - mediaH / zoomLevel) / 2;
            }
        }


        constrainPan();
        
        zoomSlider.value(zoomLevel);
        select('#zoom-display').html(`${Number(zoomLevel).toFixed(1)}x`);
        
        return false;
    }
}


function keyPressed() {
    if (document.activeElement.tagName === 'INPUT') {
        return;
    }
    if (keyCode === 32) { // Spacebar
        togglePlayPause();
        return false;
    } else if (keyCode === LEFT_ARROW) {
        stepFrame(-1);
    } else if (keyCode === RIGHT_ARROW) {
        stepFrame(1);
    }
}

function windowResized() {
    let canvasContainer = document.getElementById('canvas-container');
    resizeCanvas(canvasContainer.clientWidth, canvasContainer.clientHeight);
    updateCanvasColorScheme()
}