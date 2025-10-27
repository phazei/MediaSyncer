// --- p5.js Sketch ---

let canvas;
// State for view mode
let currentViewMode = 'grid'; // 'grid' or 'split'

// Separate media arrays for each view mode
let gridMediaElements = [];
let gridVideos = [];
let splitMediaElements = []; // Max 2 elements for left/right view
let splitVideos = [];

let isPlaying = false;
let isSeeking = false;
let masterVideo = null; // The video with the longest duration IN THE CURRENT VIEW

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
let isDraggingSlider = false; // To prevent canvas interaction when using UI sliders

// Split view interaction variables
let isDraggingSplitSlider = false;
let splitSliderPos = 0.5; // Position of the comparison slider (0 to 1)
const splitSliderHandleWidth = 32; // Increased width of the draggable area for the slider

// Control variables
let isLooping = true;
let zoomLevel = 1.0;
let panX = 0, panY = 0;
let playbackRate = 1.0; // For playback speed
const speedLevels = [0.1, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]; // Speed options

// === COMPARE: STATE ===
let comparePrimary = null;          // HTMLVideoElement
let compareOnRight = true;          // compare overlay side (true = right side, false = left side)
let compareSplitPos = 0.5;          // 0..1 shared ratio
let isDraggingCompareSplit = false;
let compareOverlayHitSize = 22;     // px size of corner hotspot
let compareDragRect = null;         // rect we started the drag in


// === A-B LOOP: STATE ===
let abStartRatio = 0.0;   // 0..1 (maps to 0..duration)
let abEndRatio = 1.0;   // 0..1 (maps to 0..duration)
let abLoopEnabled = false;

// Cached element refs
let abStartSlider, abEndSlider, abToggleBtn, abRangeReadout;


// Theme and color variables
let frameRateInput;
let canvasBgColor, canvasTextColor, canvasBorderColor, accentColor; // UPDATED: Added accentColor
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;
const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;
const speedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
const loopIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>`;
const helpIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;


// --- p5.js Setup Function ---
function setup() {
    let canvasContainer = document.getElementById('canvas-container');
    canvas = createCanvas(canvasContainer.clientWidth, canvasContainer.clientHeight);
    canvas.parent('canvas-container');

    const canvasElt = canvas.elt;
    const canvasContainerElt = select('#canvas-container');
    canvasElt.addEventListener('dragover', (e) => {
        e.preventDefault();
        canvasContainerElt.addClass('dragging-over');
    });
    canvasElt.addEventListener('dragleave', (e) => {
        e.preventDefault();
        canvasContainerElt.removeClass('dragging-over');
    });
    canvasElt.addEventListener('drop', (e) => {
        canvasContainerElt.removeClass('dragging-over');
        handleNativeDrop(e);
    });
    canvas.mouseWheel(handleMouseWheel);

    // --- Control Event Listeners ---
    const playPauseBtn = select('#play-pause-btn');
    const nextFrameBtn = select('#next-frame-btn');
    const prevFrameBtn = select('#prev-frame-btn');
    const seekSlider = select('#seek-slider');
    // === A-B LOOP: ELEMENTS ===
    abStartSlider = select('#ab-start-slider');
    abEndSlider = select('#ab-end-slider');
    abToggleBtn = select('#ab-toggle-btn');
    abRangeReadout = select('#ab-range-readout');

    const autoLayoutBtn = select('#auto-layout-btn');
    const clearGridBtn = select('#clear-grid-btn');
    const clearAllBtn = select('#clear-all-btn');
    const colsInput = select('#cols-input');
    const rowsInput = select('#rows-input');
    const loopBtn = select('#loop-btn');
    const zoomSlider = select('#zoom-slider');
    const importMediaBtn = select('#import-media-btn');
    const fileInput = select('#file-input');
    const themeToggleBtn = select('#theme-toggle-btn');
    const helpBtn = select('#help-btn');
    frameRateInput = select('#framerate-input');
    const viewModeBtn = select('#view-mode-btn');
    const compareSideBtn = select('#compare-side-btn');

    // Speed control elements
    const speedBtn = select('#speed-btn');
    const speedMenu = select('#speed-menu');
    const speedSlider = select('#speed-slider');
    const speedControlWrapper = select('#speed-control-wrapper');

    // --- Initialize UI and Theme ---
    initializeTheme();
    speedBtn.html(speedIcon);
    loopBtn.html(loopIcon);
    helpBtn.html(helpIcon);

    // --- Assign Event Handlers ---
    importMediaBtn.mousePressed(() => fileInput.elt.click());
    fileInput.changed(handleFileInput);
    themeToggleBtn.mousePressed(toggleTheme);
    playPauseBtn.mousePressed(togglePlayPause);
    nextFrameBtn.mousePressed(() => stepFrame(1));
    prevFrameBtn.mousePressed(() => stepFrame(-1));
    autoLayoutBtn.mousePressed(autoLayout);
    clearGridBtn.mousePressed(clearGridMedia);
    clearAllBtn.mousePressed(clearSplitMedia);
    loopBtn.mousePressed(toggleLooping);
    zoomSlider.input(updateZoom);
    helpBtn.mousePressed(() => window.open('https://github.com/WhatDreamsCost/MediaSyncer', '_blank'));
    viewModeBtn.mousePressed(toggleViewMode);
    compareSideBtn.mousePressed(toggleCompareSide);

    colsInput.input(() => updateGridLayout('cols'));
    rowsInput.input(() => updateGridLayout('rows'));

    seekSlider.mousePressed(() => isSeeking = true);
    seekSlider.mouseReleased(() => { isSeeking = false; handleSeek(); });
    seekSlider.input(handleSeek);

    // === A-B LOOP: LISTENERS ===
    abStartSlider.input(() => {
        abStartRatio = constrain(parseInt(abStartSlider.value()) / 1000, 0, 1);
        // A must be <= B
        if (abStartRatio > abEndRatio) {
            abEndRatio = abStartRatio;
            abEndSlider.value(Math.round(abEndRatio * 1000));
        }
        if (abLoopEnabled && isPlaying) clampPlayheadIntoAB();
        updateABReadout();
    });

    abEndSlider.input(() => {
        abEndRatio = constrain(parseInt(abEndSlider.value()) / 1000, 0, 1);
        // B must be >= A
        if (abEndRatio < abStartRatio) {
            abStartRatio = abEndRatio;
            abStartSlider.value(Math.round(abStartRatio * 1000));
        }
        if (abLoopEnabled && isPlaying) clampPlayheadIntoAB();
        updateABReadout();
    });

    abToggleBtn.mousePressed(() => {
        abLoopEnabled = !abLoopEnabled;
        abToggleBtn.html(abLoopEnabled ? 'A-B Loop: On' : 'A-B Loop: Off');
    });


    speedSlider.input(updatePlaybackSpeed);
    speedSlider.mousePressed(() => { isDraggingSlider = true; });
    zoomSlider.mousePressed(() => { isDraggingSlider = true; });

    speedBtn.mousePressed(() => speedMenu.toggleClass('visible'));

    document.body.addEventListener('click', (event) => {
        if (speedMenu.hasClass('visible') && !speedControlWrapper.elt.contains(event.target)) {
            speedMenu.removeClass('visible');
        }
    });

    if (isLooping) loopBtn.addClass('active');
    updateControlsState();

    // === A-B LOOP: INIT UI ===
    abStartSlider.value(0);
    abEndSlider.value(1000);
    updateABReadout();

}

// --- p5.js Draw Loop ---
function draw() {
    background(canvasBgColor);

    if (currentViewMode === 'grid') {
        drawGridView();
        renderCompareOverlay();
    } else {
        drawSplitView();
    }

    if (masterVideo && !isSeeking) {
        updateSliderAndTime();
    }
}

// --- View Mode Management ---

function toggleCompareSide() {
    compareOnRight = !compareOnRight;
    const btn = select('#compare-side-btn');
    if (btn) btn.html(compareOnRight ? '◑' : '◐'); //◐▶ / ◑◀
}

function toggleViewMode() {
    currentViewMode = (currentViewMode === 'grid') ? 'split' : 'grid';

    if (currentViewMode === 'split') {
        document.body.classList.add('split-view-active');
        select('#view-mode-btn').html('Grid View');
    } else {
        document.body.classList.remove('split-view-active');
        select('#view-mode-btn').html('Split View');
    }

    panX = 0;
    panY = 0;
    zoomLevel = 1.0;
    select('#zoom-slider').value(1);
    select('#zoom-display').html('1.0x');

    findLongestVideo();
    updateControlsState();
    updatePlaybackSpeed();
    // === A-B LOOP: REFRESH READOUT ON VIEW SWITCH ===
    updateABReadout();

}


// --- Theme Management ---
function initializeTheme() {
    const isDarkMode = localStorage.getItem('theme') !== 'light';
    if (isDarkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    updateThemeUI();
    updateCanvasColorScheme();
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    updateThemeUI();
    updateCanvasColorScheme();
}

function updateThemeUI() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const themeToggleBtn = select('#theme-toggle-btn');
    themeToggleBtn.html(isDarkMode ? sunIcon : moonIcon);
    themeToggleBtn.attribute('title', isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode');
}

function updateCanvasColorScheme() {
    let style = getComputedStyle(document.body);
    canvasBgColor = color(style.getPropertyValue('--canvas-bg-p5').trim());
    canvasTextColor = color(style.getPropertyValue('--text-secondary').trim());
    canvasBorderColor = color(style.getPropertyValue('--canvas-border-p5').trim());
    accentColor = color(style.getPropertyValue('--accent-primary').trim());
    select('#canvas-container').style('border-color', canvasBorderColor.toString('#rrggbb'));
}

// --- Core Functions ---

function clearGridMedia() {
    if (isPlaying && currentViewMode === 'grid') togglePlayPause();
    for (let media of gridMediaElements) {
        media.elt.remove();
    }
    gridMediaElements = [];
    gridVideos = [];
    gridLayout = [];

    // reset compare UI/state
    comparePrimary = null;          // clear selected compare video
    compareSplitPos = 0.5

    if (currentViewMode === 'grid') {
        masterVideo = null;
        updateControlsState();
        select('#seek-slider').value(0);
        select('#timecode').html('00:00.00 / 00:00.00');
        select('#frame-counter').html('0 / 0');
    }
    autoLayout();
}

function clearSplitMedia() {
    if (isPlaying && currentViewMode === 'split') togglePlayPause();
    for (let media of splitMediaElements) {
        if (media) media.elt.remove();
    }
    splitMediaElements = [];
    splitVideos = [];
    splitSliderPos = 0.5;

    if (currentViewMode === 'split') {
        masterVideo = null;
        updateControlsState();
        select('#seek-slider').value(0);
        select('#timecode').html('00:00.00 / 00:00.00');
        select('#frame-counter').html('0 / 0');
    }
}

function handleNativeDrop(event) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    const filesToProcess = files.map(createFileObject).filter(f => f);

    if (currentViewMode === 'split' && filesToProcess.length > 0) {
        if (filesToProcess.length === 1) {
            handleFile(filesToProcess[0]);
        } else {
            handleFile({ ...filesToProcess[0], targetSlot: 0 });
            handleFile({ ...filesToProcess[1], targetSlot: 1 });
        }
    } else {
        for (const fileObject of filesToProcess) {
            handleFile(fileObject);
        }
    }
}

function createFileObject(file) {
    const fileType = file.type.startsWith('video/') ? 'video' : (file.type.startsWith('image/') ? 'image' : null);
    if (!fileType) return null;
    const fileUrl = URL.createObjectURL(file);
    return { type: fileType, data: fileUrl, name: file.name };
}

function handleFileInput(event) {
    const files = Array.from(event.target.files);
    const filesToProcess = files.map(createFileObject).filter(f => f);

    if (currentViewMode === 'split' && filesToProcess.length > 0) {
        if (filesToProcess.length === 1) {
            const targetSlot = !splitMediaElements[0] ? 0 : (!splitMediaElements[1] ? 1 : 0);
            handleFile({ ...filesToProcess[0], targetSlot });
        } else {
            handleFile({ ...filesToProcess[0], targetSlot: 0 });
            handleFile({ ...filesToProcess[1], targetSlot: 1 });
        }
    } else {
        for (const fileObject of filesToProcess) {
            handleFile(fileObject);
        }
    }

    event.target.value = '';
}

function handleFile(file) {
    if (!file) return;

    let mediaEl;
    const isFirstVideoInAnyView = gridVideos.length === 0 && splitVideos.length === 0;

    const onVideoLoad = () => {
        mediaEl.volume(0);
        mediaEl.speed(playbackRate);
        const masterTime = masterVideo ? masterVideo.time() : 0;
        mediaEl.time(min(masterTime, mediaEl.duration()));
        findLongestVideo();
        if (isFirstVideoInAnyView && !isPlaying) {
            togglePlayPause();
        } else {
            if (isPlaying && mediaEl.time() < mediaEl.duration()) mediaEl.play();
            else mediaEl.pause();
        }
        updateSliderAndTime();
    };

    if (file.type === 'video') {
        mediaEl = createVideo(file.data, onVideoLoad);
    } else if (file.type === 'image') {
        mediaEl = createImg(file.data, 'image');
    } else {
        select('#canvas-container').style('border-style', 'dashed');
        return;
    }

    mediaEl.hide();
    const newMediaObject = { elt: mediaEl, type: file.type, name: file.name };

    if (currentViewMode === 'grid') {
        gridMediaElements.push(newMediaObject);
        if (file.type === 'video') gridVideos.push(mediaEl);
        autoLayout();
    } else {
        let position;
        if (file.targetSlot !== undefined) {
            position = file.targetSlot;
        } else {
            // === SPLIT POSITION RESPECTS compareOnRight ===
            const destRect = getSplitViewDestRect();
            const isLeftSide = mouseX < destRect.x + destRect.w * splitSliderPos;
            // when compareOnRight is false, we swap which slot is visually left/right
            position = compareOnRight
                ? (isLeftSide ? 0 : 1)  // normal: slot 0 = left, slot 1 = right
                : (isLeftSide ? 1 : 0); // flipped: slot 1 = left, slot 0 = right
        }

        if (splitMediaElements[position]) {
            const oldMedia = splitMediaElements[position];
            if (oldMedia.type === 'video') {
                splitVideos = splitVideos.filter(v => v !== oldMedia.elt);
            }
            oldMedia.elt.remove();
        }
        splitMediaElements[position] = newMediaObject;
        if (file.type === 'video') {
            splitVideos.push(mediaEl);
        }
    }

    findLongestVideo();
    updateControlsState();
}


function findLongestVideo() {
    const currentVideos = (currentViewMode === 'grid') ? gridVideos : splitVideos;

    if (currentVideos.length === 0) {
        masterVideo = null;
        if (isPlaying) {
            isPlaying = false;
            select('#play-pause-btn').html('Play');
        }
    } else {
        masterVideo = currentVideos.reduce((a, b) => (a.duration() > b.duration() ? a : b));
    }
    updateControlsState();
    // === A-B LOOP: UPDATE READOUT WHEN MASTER CHANGES ===
    updateABReadout();
}

function updatePlaybackSpeed() {
    playbackRate = speedLevels[parseInt(select('#speed-slider').value())];
    select('#speed-display').html(`${playbackRate.toFixed(2)}x`);
    const currentVideos = (currentViewMode === 'grid') ? gridVideos : splitVideos;
    currentVideos.forEach(video => video.speed(playbackRate));
}

function togglePlayPause() {
    if (!masterVideo) return;
    const currentVideos = (currentViewMode === 'grid') ? gridVideos : splitVideos;
    const frameDuration = 1 / (parseFloat(frameRateInput.value()) || 30);

    if (!isPlaying && !isLooping && masterVideo.time() >= masterVideo.duration() - frameDuration) {
        currentVideos.forEach(v => { v.time(0); v.play(); });
        isPlaying = true;
    } else {
        isPlaying = !isPlaying;
        if (isPlaying) currentVideos.forEach(v => { if (v.time() < v.duration()) v.play(); });
        else currentVideos.forEach(v => v.pause());
    }
    select('#play-pause-btn').html(isPlaying ? 'Pause' : 'Play');
}

function handleSeek() {
    if (!masterVideo) return;
    const currentVideos = (currentViewMode === 'grid') ? gridVideos : splitVideos;

    // === A-B LOOP: CLAMP SEEK INTO [A,B] ===
    const duration = masterVideo.duration();
    const rawSeekTime = (select('#seek-slider').value() / 1000) * duration;
    let seekTime = rawSeekTime;
    if (abLoopEnabled && isPlaying) {
        const { A, B } = getABTimes();
        seekTime = constrain(rawSeekTime, A, B);
    } else {
        seekTime = constrain(rawSeekTime, 0, duration);
    }

    currentVideos.forEach(v => v.pause());
    let seekedCount = 0;
    if (currentVideos.length === 0) {
        if (isPlaying) currentVideos.forEach(v => { if (v.time() < v.duration()) v.play(); });
        return;
    }
    currentVideos.forEach(v => {
        v.elt.onseeked = () => {
            seekedCount++;
            v.elt.onseeked = null;
            if (seekedCount === currentVideos.length && isPlaying) {
                currentVideos.forEach(v => { if (v.time() < v.duration()) v.play(); });
            }
        };
        v.time(min(seekTime, v.duration()));
    });
}


function stepFrame(direction) {
    if (!masterVideo) return;
    if (isPlaying) togglePlayPause();
    const currentVideos = (currentViewMode === 'grid') ? gridVideos : splitVideos;
    const frameDuration = 1 / (parseFloat(frameRateInput.value()) || 30);
    let newMasterTime = masterVideo.time() + (direction * frameDuration);
    currentVideos.forEach(v => v.time(constrain(newMasterTime, 0, v.duration())));
}

function toggleLooping() {
    isLooping = !isLooping;
    select('#loop-btn').toggleClass('active', isLooping);
    if (isLooping && !isPlaying && masterVideo) togglePlayPause();
}

function updateZoom() {
    zoomLevel = this.value();
    select('#zoom-display').html(`${Number(zoomLevel).toFixed(1)}x`);
    constrainPan();
}

function constrainPan() {
    const currentMedia = (currentViewMode === 'grid' ? gridMediaElements : splitMediaElements).filter(Boolean);
    if (currentMedia.length === 0) { panX = 0; panY = 0; return; }

    const refMedia = currentMedia[0].elt;
    if (refMedia.width === 0 || isNaN(refMedia.width)) { panX = 0; panY = 0; return; }

    const sW = refMedia.width / zoomLevel;
    const sH = refMedia.height / zoomLevel;
    const maxPanX = (refMedia.width - sW) / 2;
    const maxPanY = (refMedia.height - sH) / 2;

    panX = (maxPanX >= 0) ? constrain(panX, -maxPanX, maxPanX) : 0;
    panY = (maxPanY >= 0) ? constrain(panY, -maxPanY, maxPanY) : 0;
}

// --- Drawing Functions ---

// === COMPARE: RENDER OVERLAY ===
// In grid view, if a comparePrimary is selected, draw it on half of each tile
// (zoom-aware, per-tile bars, hover highlight) ===
function renderCompareOverlay() {
    if (currentViewMode !== 'grid') return;

    const rects = (typeof gridLayout !== 'undefined' && gridLayout.length)
        ? gridLayout
        : getGridRects();

    // 1) If a primary is set, paint it on LEFT or RIGHT portion of each drawn media rect
    if (comparePrimary && gridMediaElements.length > 0) {
        const prim = comparePrimary; // HTMLVideoElement

        // Source crop from the primary using the same zoom/pan model as drawMediaGrid()
        const pWnat = prim.width  || 1;
        const pHnat = prim.height || 1;
        const sW = pWnat / zoomLevel;
        const sH = pHnat / zoomLevel;
        const sXbase = (pWnat - sW) / 2 + panX;
        const sYbase = (pHnat - sH) / 2 + panY;

        const ctx = drawingContext;

        rects.forEach((r) => {
            if (!r) return;

            // local split position within THIS rect
            const localSplitX = r.x + r.w * compareSplitPos;

            // Clip to the side where compare video should appear
            let clipX = r.x, clipW = r.w;
            if (compareOnRight) {
                const rightX = Math.max(r.x, localSplitX);
                clipX = rightX;
                clipW = (r.x + r.w) - rightX;
            } else {
                const leftW = Math.max(0, (localSplitX - r.x));
                clipX = r.x;
                clipW = leftW;
            }
            if (clipW <= 0) return;

            ctx.save();
            ctx.beginPath();
            ctx.rect(clipX, r.y, clipW, r.h);
            ctx.clip();

            // Draw the primary into the SAME dest rect used for the native media (r.x,r.y,r.w,r.h)
            image(prim, r.x, r.y, r.w, r.h, sXbase, sYbase, sW, sH);
            ctx.restore();
        });

        // Per-cell split bars (synced ratio), thinner; blue on hover/drag
        rects.forEach((r) => {
            if (!r) return;
            const localSplitX = r.x + r.w * compareSplitPos;

            const isHover =
                mouseX >= r.x && mouseX <= r.x + r.w &&
                mouseY >= r.y && mouseY <= r.y + r.h &&
                Math.abs(mouseX - localSplitX) <= 8;

            if (isHover || isDraggingCompareSplit) {
                // hint cursor while on any bar
                cursor('ew-resize');
            }

            push();
            // color: hover/drag = accent; otherwise subtle white
            if (isHover || isDraggingCompareSplit) {
                accentColor.setAlpha(230);
                stroke(accentColor);
                fill(accentColor);
            } else {
                stroke(255, 255, 255, 180);
                fill(255, 255, 255, 200);
            }
            strokeWeight(1.25);
            line(localSplitX, r.y, localSplitX, r.y + r.h);

            // slim handle
            noStroke();
            // keep handle visible but small
            const handleW = 10, handlePad = 30;

            rect(localSplitX - handleW / 4, r.y + handlePad / 2, handleW / 2, handlePad, 1);
            rect(localSplitX - handleW / 4, r.y + r.h - handlePad * 1.5, handleW / 2, handlePad, 1);

            pop();
        });
    }

    // 2) Hover badges (always show, even if no primary yet) — draw LAST so they sit on top
    rects.forEach((r, i) => {
        if (!r) return;
        if (mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h) {
            push();
            noStroke();
            fill(0, 0, 0, 120);
            rect(r.x + r.w - compareOverlayHitSize, r.y + r.h - compareOverlayHitSize,
                compareOverlayHitSize, compareOverlayHitSize, 4);
            fill(255, 255, 255, 220);
            textSize(12);
            textAlign(CENTER, CENTER);
            const isPrim = !!(comparePrimary && gridMediaElements[i] && gridMediaElements[i].elt === comparePrimary);
            text(isPrim ? '✓' : '⇆', r.x + r.w - compareOverlayHitSize / 2, r.y + r.h - compareOverlayHitSize / 2);
            pop();
        }
    });

    // 3) Redraw filename + X on top so X is visible/clickable even over overlay
    if (typeof hoveredMediaIndex !== 'undefined' && hoveredMediaIndex !== -1) {
        const media = gridMediaElements[hoveredMediaIndex];
        const pos = rects[hoveredMediaIndex];
        if (media && pos && typeof drawHoverOverlay === 'function') {
            drawHoverOverlay(media, pos);
        }
    }
}


// Derive grid rects to match your grid layout
// If you already have something similar, feel free to reuse that instead.
function getGridRects() {
    const items = gridMediaElements.filter(Boolean);
    const n = items.length;
    if (n === 0) return [];

    // Use your calculateBestGrid if rows/cols are auto; else respect manual rows/cols if set
    let cols = gridCols || 0, rows = gridRows || 0;
    if (!cols || !rows) {
        const layout = calculateBestGrid(n, width / height);
        cols = layout.cols;
        rows = layout.rows;
    }

    const cellW = width / cols;
    const cellH = height / rows;

    const rects = [];
    for (let i = 0; i < n; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        rects.push({ x: c * cellW, y: r * cellH, w: cellW, h: cellH, index: i });
    }
    return rects;
}

function drawGridView() {
    if (isPanning) cursor('grabbing');
    else if (hoveredMediaIndex !== -1 && !isDragging) cursor('grab');
    else if (gridMediaElements.length === 0 && !isDragging) cursor('pointer');
    else cursor('arrow');

    updateHoveredMedia();

    if (gridMediaElements.length === 0 && !isDragging) {
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
        image(elt, mouseX - 75, mouseY - (75 / aspect) / 2, 150, 150 / aspect);
    }
}

function getSplitViewDestRect() {
    const refMedia = splitMediaElements[0] || splitMediaElements[1];
    let destRect = { x: 0, y: 0, w: width, h: height };

    if (refMedia && refMedia.elt.width > 0 && refMedia.elt.height > 0) {
        const mediaAspect = refMedia.elt.width / refMedia.elt.height;
        const canvasAspect = width / height;
        if (mediaAspect > canvasAspect) {
            destRect.w = width;
            destRect.h = width / mediaAspect;
            destRect.x = 0;
            destRect.y = (height - destRect.h) / 2;
        } else {
            destRect.h = height;
            destRect.w = height * mediaAspect;
            destRect.y = 0;
            destRect.x = (width - destRect.w) / 2;
        }
    }
    return destRect;
}

function drawSplitView() {
    const destRect = getSplitViewDestRect();
    const sliderDrawX = destRect.x + destRect.w * splitSliderPos;
    const isHoveringSlider = mouseX > sliderDrawX - splitSliderHandleWidth / 2 && mouseX < sliderDrawX + splitSliderHandleWidth / 2;
    const bothMediaLoaded = splitMediaElements[0] && splitMediaElements[1];

    if (isDraggingSplitSlider) cursor('grabbing');
    else if (isPanning) cursor('grabbing');
    else if (isHoveringSlider && bothMediaLoaded) cursor('ew-resize');
    else if (splitMediaElements.filter(Boolean).length < 2) cursor('pointer');
    else cursor('arrow');

    // map the two slots to left/right based on compareOnRight
    const A = splitMediaElements[0] || null;
    const B = splitMediaElements[1] || null;
    const leftMedia = compareOnRight ? A : B;
    const rightMedia = compareOnRight ? B : A;

    const placeholderText = "Drag & Drop or Click to Import Media";

    if (rightMedia) {
        drawMediaInSplit(rightMedia, 'right', destRect);
    }
    if (leftMedia) {
        drawMediaInSplit(leftMedia, 'left', destRect);
    }

    // left placeholder (if missing)
    if (!leftMedia) {
        textAlign(CENTER, CENTER);
        textSize(18);
        noStroke();
        fill(canvasTextColor);
        text(placeholderText, (destRect.x + sliderDrawX) / 2, destRect.y + destRect.h / 2);
    }

    // right placeholder (if missing)
    if (!rightMedia) {
        textAlign(CENTER, CENTER);
        textSize(18);
        noStroke();
        fill(canvasTextColor);
        text(placeholderText, sliderDrawX + (destRect.x + destRect.w - sliderDrawX) / 2, destRect.y + destRect.h / 2);
    }

    accentColor.setAlpha(220);
    stroke(accentColor);
    strokeWeight(2);
    line(sliderDrawX, destRect.y, sliderDrawX, destRect.y + destRect.h);
    noStroke();
    fill(accentColor);
    circle(sliderDrawX, destRect.y + destRect.h / 2, 12);
}

function drawMediaInSplit(media, side, destRect) {
    const { elt } = media;
    if (!elt || elt.width === 0 || elt.height === 0) return;

    const sW = elt.width / zoomLevel;
    const sH = elt.height / zoomLevel;
    const sX = (elt.width - sW) / 2 + panX;
    const sY = (elt.height - sH) / 2 + panY;

    if (side === 'left') {
        const dX = destRect.x;
        const dY = destRect.y;
        const dW = destRect.w * splitSliderPos;
        const dH = destRect.h;

        const sW_clipped = sW * splitSliderPos;

        if (dW > 0) image(elt, dX, dY, dW, dH, sX, sY, sW_clipped, sH);

    } else { // side === 'right'
        const dX = destRect.x + destRect.w * splitSliderPos;
        const dY = destRect.y;
        const dW = destRect.w * (1 - splitSliderPos);
        const dH = destRect.h;

        const sX_offset = sW * splitSliderPos;
        const sW_clipped = sW * (1 - splitSliderPos);

        if (dW > 0) image(elt, dX, dY, dW, dH, sX + sX_offset, sY, sW_clipped, sH);
    }
}


function drawMediaGrid() {
    let cols = gridCols > 0 ? gridCols : 1;
    let rows = gridRows > 0 ? gridRows : 1;
    if (gridCols === 0 || gridRows === 0) {
        const count = gridMediaElements.length + (isDragging ? 1 : 0);
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
        dropPreviewIndex = floor(mouseX / cellWidth) + floor(mouseY / cellHeight) * cols;
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
        if (mediaIndex >= gridMediaElements.length) continue;
        const media = gridMediaElements[mediaIndex];
        const { elt } = media;
        if (elt.width > 0 && elt.height > 0) {
            const sW = elt.width / zoomLevel;
            const sH = elt.height / zoomLevel;
            const sX = (elt.width - sW) / 2 + panX;
            const sY = (elt.height - sH) / 2 + panY;

            const cellAspect = cellWidth / cellHeight, mediaAspect = sW / sH;
            let drawW = (mediaAspect > cellAspect) ? cellWidth : cellHeight * mediaAspect;
            let drawH = (mediaAspect > cellAspect) ? cellWidth / mediaAspect : cellHeight;
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
    let displayText = media.name;
    if (textWidth(displayText) > pos.w - xButtonSize - (textPadding * 3)) {
        while (textWidth(displayText + '...') > pos.w - xButtonSize - (textPadding * 3) && displayText.length > 0) {
            displayText = displayText.slice(0, -1);
        }
        displayText += '...';
    }
    const textW = textWidth(displayText) + textPadding * 2;
    fill(0, 0, 0, 180);
    noStroke();
    rect(pos.x, pos.y, textW, 14 + textPadding * 2, 4, 0, 4, 0);
    fill(255);
    text(displayText, pos.x + textPadding, pos.y + textPadding + 2);

    const xButtonX = pos.x + pos.w - xButtonSize;
    fill(0, 0, 0, 180);
    rect(xButtonX, pos.y, xButtonSize, xButtonSize, 0, 4, 0, 4);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(18);
    text('×', xButtonX + xButtonSize / 2, pos.y + xButtonSize / 2);
    pop();
}

function updateHoveredMedia() {
    if (isDragging || isPanning || currentViewMode !== 'grid') { hoveredMediaIndex = -1; return; }
    hoveredMediaIndex = -1;
    for (let i = 0; i < gridLayout.length; i++) {
        const pos = gridLayout[i];
        if (pos && mouseX > pos.x && mouseX < pos.x + pos.w && mouseY > pos.y && mouseY < pos.y + pos.h) {
            hoveredMediaIndex = i;
            break;
        }
    }
}

// --- Layout and Control Updates ---

function updateGridLayout(source) {
    if (isUpdatingLayout) return;
    isUpdatingLayout = true;
    const numMedia = gridMediaElements.length;
    let cols = parseInt(select('#cols-input').value());
    let rows = parseInt(select('#rows-input').value());

    if (numMedia === 0) {
        gridCols = !isNaN(cols) && cols > 0 ? cols : 0;
        gridRows = !isNaN(rows) && rows > 0 ? rows : 0;
    } else if (source === 'cols' && !isNaN(cols) && cols > 0) {
        gridCols = cols;
        gridRows = Math.ceil(numMedia / cols);
        select('#rows-input').value(gridRows);
    } else if (source === 'rows' && !isNaN(rows) && rows > 0) {
        gridRows = rows;
        gridCols = Math.ceil(numMedia / rows);
        select('#cols-input').value(gridCols);
    } else {
        autoLayout();
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
        let diff = Math.abs((c / r) - targetAspect);
        if (diff < minDiff) { minDiff = diff; bestLayout = { cols: c, rows: r }; }
    }
    return bestLayout;
}

function updateSliderAndTime() {
    if (!masterVideo || isSeeking) return;
    const duration = masterVideo.duration();
    if (isNaN(duration) || duration === 0) return;
    const currentVideos = (currentViewMode === 'grid') ? gridVideos : splitVideos;
    const frameRate = parseFloat(frameRateInput.value()) || 30;

    // === AB PRE-FENCE WHILE PLAYING ===
    if (abLoopEnabled && isPlaying && masterVideo) {
        const { A, B } = getABTimes();
        const eps = (typeof epsilonForRange === 'function') ? epsilonForRange(A, B) : (B - A) / 1000 || 0.008;
        const t = masterVideo.time();
        if (t < A - eps) {
            setAllCurrentVideosTime(A);
            // don't return; let the rest update the UI
        }
    }

    // === A-B LOOP: RANGE LOOP CHECK (SEARCH FOR: RANGE LOOP CHECK) ===
    const { A, B } = getABTimes();
    const epsAB = epsilonForRange(A, B);
    const epsFull = epsilonForRange(0, duration);
    const nearEndAB = (t) => t >= (B - epsAB);
    const nearEndFull = (t) => t >= (duration - epsFull);

    // If A-B is enabled, we loop within [A,B]. Otherwise, use existing behavior.
    if (abLoopEnabled && B > A && isPlaying && nearEndAB(masterVideo.time())) {
        isSeeking = true;
        currentVideos.forEach(v => v.pause());
        let seekedCount = 0;
        if (currentVideos.length === 0) { isSeeking = false; return; }
        // AB DIRECT JUMP
        currentVideos.forEach(v => {
            v.elt.onseeked = () => {
                seekedCount++;
                v.elt.onseeked = null;
                if (seekedCount === currentVideos.length) {
                    if (isPlaying) currentVideos.forEach(v => v.play());
                    isSeeking = false;
                }
            };
            v.time(min(A, v.duration())); // jump straight to A
        });
        return;
    } else if (!abLoopEnabled && isPlaying && nearEndFull(masterVideo.time())) {
        if (isLooping) {
            isSeeking = true;
            currentVideos.forEach(v => v.pause());
            let seekedCount = 0;
            if (currentVideos.length === 0) { isSeeking = false; return; }
            currentVideos.forEach(v => {
                v.elt.onseeked = () => {
                    seekedCount++;
                    v.elt.onseeked = null;
                    if (seekedCount === currentVideos.length) {
                        if (isPlaying) currentVideos.forEach(v => v.play());
                        isSeeking = false;
                    }
                };
                v.time(0);
            });
            return;
        } else {
            if (isPlaying) togglePlayPause();
            currentVideos.forEach(v => v.time(v.duration()));
        }
    } else if (isPlaying) {
        // Existing guard to pause videos that have ended
        currentVideos.forEach(v => {
            if (v !== masterVideo && v.time() >= v.duration() && !v.elt.paused) {
                v.pause(); v.time(v.duration());
            }
        });
    }


    const currentTime = masterVideo.time();
    select('#seek-slider').value((currentTime / duration) * 1000);
    select('#timecode').html(`${formatTime(currentTime)} / ${formatTime(duration)}`);
    select('#frame-counter').html(`${Math.round(currentTime * frameRate)} / ${Math.round(duration * frameRate)}`);
}

function formatTime(time) {
    if (isNaN(time) || time === Infinity) return "00:00.00";
    return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}.${String(Math.floor((time % 1) * 100)).padStart(2, '0')}`;
}

function updateControlsState() {
    const hasGridMedia = gridMediaElements.length > 0;
    const hasSplitMedia = splitMediaElements.filter(Boolean).length > 0;
    const hasVideo = masterVideo !== null;

    select('#play-pause-btn').elt.disabled = !hasVideo;
    select('#next-frame-btn').elt.disabled = !hasVideo;
    select('#prev-frame-btn').elt.disabled = !hasVideo;
    select('#seek-slider').elt.disabled = !hasVideo;
    select('#speed-btn').elt.disabled = !hasVideo;
    select('#loop-btn').elt.disabled = !hasVideo;
    select('#clear-grid-btn').elt.disabled = !hasGridMedia;
    select('#clear-all-btn').elt.disabled = !hasSplitMedia;
}

// === A-B LOOP: HELPERS ===

function epsilonForRange(startT, endT) {
    // slider has 1000 steps: one step worth of time, with a tiny floor
    const range = Math.max(0, endT - startT);
    return Math.max(range / 1000, 0.008); // ~8ms floor to avoid spin
}

function getABTimes() {
    if (!masterVideo) return { A: 0, B: 0 };
    const duration = masterVideo.duration() || 0;
    return {
        A: duration * abStartRatio,
        B: duration * abEndRatio
    };
}

function clampPlayheadIntoAB() {
    if (!masterVideo) return;
    const { A, B } = getABTimes();
    const t = masterVideo.time();
    if (t < A) setAllCurrentVideosTime(A);
    else if (t > B) setAllCurrentVideosTime(B);
}

function setAllCurrentVideosTime(t) {
    const currentVideos = (currentViewMode === 'grid') ? gridVideos : splitVideos;
    currentVideos.forEach(v => v.time(constrain(t, 0, v.duration())));
}

function updateABReadout() {
    if (!abRangeReadout) return; // A-B LOOP: guard if elements not wired yet
    if (!masterVideo) { abRangeReadout.html('A 00:00.00 → B 00:00.00'); return; }
    const { A, B } = getABTimes();
    abRangeReadout.html(`A ${formatTime(A)} → B ${formatTime(B)}`);
}


// --- Mouse and Keyboard Interaction ---

function mousePressed() {
    if (isDraggingSlider) return;
    const currentMedia = (currentViewMode === 'grid' ? gridMediaElements : splitMediaElements);

    if (currentMedia.filter(Boolean).length === 0 && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        if (mouseButton === LEFT) select('#file-input').elt.click();
        return;
    }

    if (mouseButton === CENTER && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        isPanning = true;
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        return;
    }

    if (mouseButton !== LEFT || isDragging) return;

    if (currentViewMode === 'split') {
        const destRect = getSplitViewDestRect();
        const sliderDrawX = destRect.x + destRect.w * splitSliderPos;
        if (
            splitMediaElements[0] && splitMediaElements[1] &&
            mouseX > sliderDrawX - splitSliderHandleWidth / 2 &&
            mouseX < sliderDrawX + splitSliderHandleWidth / 2 &&
            mouseY > destRect.y && mouseY < destRect.y + destRect.h
        ) {
            isDraggingSplitSlider = true;
        }
        return;
    }

    // --- Grid view logic below ---

    // === COMPARE: PRIMARY PICKER (bottom-right corner) ===
    if (gridMediaElements.filter(Boolean).length > 0) {
        const rects = (typeof gridLayout !== 'undefined' && gridLayout.length) ? gridLayout : getGridRects();
        for (let i = 0; i < rects.length; i++) {
            const r = rects[i];
            if (!r) continue;
            if (!gridMediaElements[i]) continue;

            // bottom-right hotspot
            const hx = r.x + r.w - compareOverlayHitSize;
            const hy = r.y + r.h - compareOverlayHitSize;
            if (mouseX >= hx && mouseX <= r.x + r.w && mouseY >= hy && mouseY <= r.y + r.h) {
                const item = gridMediaElements[i];
                if (item && item.type === 'video') {
                    const vid = item.elt; // HTMLVideoElement
                    comparePrimary = (comparePrimary === vid) ? null : vid;
                    return; // don't start drag-reorder underneath
                }
            }
        }
    }

    // === COMPARE: START DRAG PER-CELL SPLIT BAR ===
    if (comparePrimary) {
        const rects = (typeof gridLayout !== 'undefined' && gridLayout.length) ? gridLayout : getGridRects();
        for (let i = 0; i < rects.length; i++) {
            const r = rects[i];
            if (!r) continue;
            if (mouseX < r.x || mouseX > r.x + r.w || mouseY < r.y || mouseY > r.y + r.h) continue;

            const localSplitX = r.x + r.w * compareSplitPos;
            if (Math.abs(mouseX - localSplitX) <= 8) {
                isDraggingCompareSplit = true;
                compareDragRect = r;
                return;
            }
        }
    }


    // --- Delete button / drag-reorder ---
    if (hoveredMediaIndex !== -1) {
        const pos = gridLayout[hoveredMediaIndex];
        const xButtonSize = 24;
        if (
            mouseX > pos.x + pos.w - xButtonSize && mouseX < pos.x + pos.w &&
            mouseY > pos.y && mouseY < pos.y + xButtonSize
        ) {
            const removedMedia = gridMediaElements.splice(hoveredMediaIndex, 1)[0];
            if (removedMedia.type === 'video') gridVideos = gridVideos.filter(v => v !== removedMedia.elt);
            removedMedia.elt.remove();
            findLongestVideo();
            updateControlsState();
            hoveredMediaIndex = -1;
            autoLayout();
            return;
        }
    }
    if (hoveredMediaIndex !== -1) {
        isDragging = true;
        draggedMedia = gridMediaElements.splice(hoveredMediaIndex, 1)[0];
    }
}

function mouseDragged() {
    if (isDraggingSlider) return;

    if (isPanning) {
        panX -= (mouseX - lastMouseX);
        panY -= (mouseY - lastMouseY);
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        constrainPan();
        return false;
    }

    // === COMPARE: DRAG PER-CELL SPLIT BAR ===
    if (isDraggingCompareSplit) {
        // use the rect we started in; if missing, fall back to rect under mouse
        let r = compareDragRect;
        if (!r) {
            const rects = (typeof gridLayout !== 'undefined' && gridLayout.length) ? gridLayout : getGridRects();
            for (let i = 0; i < rects.length; i++) {
                const R = rects[i];
                if (R && mouseX >= R.x && mouseX <= R.x + R.w && mouseY >= R.y && mouseY <= R.y + R.h) { r = R; break; }
            }
        }
        if (r) {
            const local = (mouseX - r.x) / r.w;
            compareSplitPos = constrain(local, 0.02, 0.98);
        }
        return;
    }

    // --- Split view slider (unchanged) ---
    if (isDraggingSplitSlider) {
        const destRect = getSplitViewDestRect();
        splitSliderPos = constrain((mouseX - destRect.x) / destRect.w, 0, 1);
    }
}

function mouseReleased() {
    isDraggingSlider = false;
    isPanning = false;

    // === COMPARE: STOP DRAG PER-CELL SPLIT BAR ===
    isDraggingCompareSplit = false;
    compareDragRect = null;

    // --- Split view slider ---
    isDraggingSplitSlider = false;

    // --- Drop reordering back in place ---
    if (currentViewMode === 'grid' && isDragging && draggedMedia) {
        let cols = gridCols > 0 ? gridCols : calculateBestGrid(gridMediaElements.length + 1, width / height).cols;
        const cellWidth = width / cols;
        const cellHeight = height / (Math.ceil((gridMediaElements.length + 1) / cols));
        const targetIndex = min(floor(mouseX / cellWidth) + floor(mouseY / cellHeight) * cols, gridMediaElements.length);
        gridMediaElements.splice(targetIndex, 0, draggedMedia);
    }
    isDragging = false;
    draggedMedia = null;
    updateControlsState();
}

function handleMouseWheel(event) {
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        const currentMedia = (currentViewMode === 'grid' ? gridMediaElements : splitMediaElements).filter(Boolean);
        if (currentMedia.length === 0) return;

        const oldZoom = zoomLevel;
        zoomLevel = constrain(zoomLevel - (event.deltaY > 0 ? 0.1 : -0.1) * oldZoom, 1, 5);

        const refMedia = currentMedia[0].elt;
        if (refMedia.width > 0) {
            const mouseWorldX = (panX + (refMedia.width - refMedia.width / oldZoom) / 2) + (mouseX / width) * (refMedia.width / oldZoom);
            const mouseWorldY = (panY + (refMedia.height - refMedia.height / oldZoom) / 2) + (mouseY / height) * (refMedia.height / oldZoom);
            // FIXED: Use refMedia.width and refMedia.height instead of undefined variables
            panX = mouseWorldX - (mouseX / width) * (refMedia.width / zoomLevel) - (refMedia.width - refMedia.width / zoomLevel) / 2;
            panY = mouseWorldY - (mouseY / height) * (refMedia.height / zoomLevel) - (refMedia.height - refMedia.height / zoomLevel) / 2;
        }

        constrainPan();
        select('#zoom-slider').value(zoomLevel);
        select('#zoom-display').html(`${Number(zoomLevel).toFixed(1)}x`);
        return false;
    }
}

function keyPressed() {
    if (document.activeElement.tagName === 'INPUT') return;
    if (keyCode === 32) { togglePlayPause(); return false; }
    if (keyCode === LEFT_ARROW) stepFrame(-1);
    if (keyCode === RIGHT_ARROW) stepFrame(1);
}

function windowResized() {
    let canvasContainer = document.getElementById('canvas-container');
    resizeCanvas(canvasContainer.clientWidth, canvasContainer.clientHeight);
    updateCanvasColorScheme();
}
