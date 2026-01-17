# MediaSyncer

![Screenshot 2025-07-02 124307](https://github.com/user-attachments/assets/9074581b-7e9d-4e74-a854-e77e5df22b8b)

A browser-based media player designed for synchronized playback of multiple videos. It is ideal for comparing different render iterations, AI video generations, or multi-camera footage. Easily drag and drop media to rearrange them on a grid or view them in a side-by-side split view.

Use online for free here (or download the release for local version):  
https://phazei.github.io/MediaSyncer/

## ✨ Features

### 📺 View Modes
*   **Grid View:** Auto-arranges multiple videos. Drag and drop to reorder tiles.
*   **Split View:** Classic A/B comparison with a sliding divider.
*   **Smart Zoom:** Videos seamlessly transition from "fitting" the container to "filling" it before zooming into the pixels.

### ⚖️ Advanced Comparison (New!)
*   **Reference Overlay:** Select any video in the grid as a "Primary" reference. It will be overlaid on top of *every* other video cell.
*   **Per-Cell Wiper:** When a Primary reference is active, every cell gets its own slider handle, allowing you to check differences across the entire grid simultaneously.
*   **Swap Sides:** Toggle the comparison overlay between the left or right side of the cell.

### 🔊 Dynamic Audio (New!)
*   **Hover-to-Hear:** Audio plays dynamically from the video currently under your mouse cursor.
*   **Audio Lock:** Click the Speaker icon on a video to "Lock" the audio to that specific file, regardless of where your mouse moves.
*   **Master Volume:** Global volume slider and Mute toggle.

### ⏱️ Playback Control
*   **A-B Looping:** Set specific Start (A) and End (B) points to loop a specific segment of the timeline.
*   **Variable Speed:** Playback from 0.1x up to 2.0x speed.
*   **Frame Stepping:** Precise frame-by-frame navigation.
*   **Individual Pause:** Pause specific videos while the rest of the grid continues playing.

---

## ⌨️ Controls & Hotkeys

| Key / Action | Function |
| :--- | :--- |
| **SPACEBAR** | Play / Pause |
| **Left Arrow** | Previous Frame |
| **Right Arrow** | Next Frame |
| **Scroll Wheel** | Zoom In / Out |
| **Middle Click + Drag** | Pan Image (when zoomed) |
| **Click + Drag File** | Reorder grid tiles |
| **Double Click Slider** | Reset Slider |

### On-Screen UI
*   **✓ Badge:** Sets the video as the "Primary" reference for comparison.
*   **🔊 Badge:** Locks the audio source to this video.
*   **× Button:** Removes the video from the grid.
*   **Play/Pause Overlay:** Individually pause a specific video without stopping the Master timeline.

---

## 📝 Usage Notes

**Comparison Mode:**
To use the advanced comparison in Grid View, hover over a video and click the **⇆** (Swap) icon in the bottom right corner. It will turn green (**✓**), indicating it is now the Primary Reference. You will see a vertical wipe bar appear on all other videos.

**Performance:**
This tool is built on p5.js and renders video frames to a canvas for synchronization. It is very lightweight but does not handle multiple large files well. Don't expect it to work smoothly for running a bunch of 4K videos in sync. It is optimized for comparing lightweight AI generations or proxy files.

## 🔄 Recent Updates

*   **v0.4 Update**
    *   **Audio System:** Added Master Volume, Hover-to-hear, and Audio Locking.
    *   **Comparison Overlays:** Added the ability to overlay a reference video onto all grid cells with individual wipers.
    *   **A-B Looping:** Added timeline sliders to loop specific sections.
    *   **Dark Mode:** Improved UI with theme toggling.
    *   **Smarter Zooming:** Implemented `smoothstep` interpolation for better aspect ratio handling during zooms.

![Screenshot 2025-07-03 002009](https://github.com/user-attachments/assets/bcbfbb5c-bb56-4f9d-8ec5-5f6b8d875114)


[![Original Project](https://img.shields.io/badge/Based%20on-MediaSyncer-blue)](https://github.com/WhatDreamsCost/MediaSyncer)
Special thanks to **WhatDreamsCost** for the original codebase that inspired this tool.

---
