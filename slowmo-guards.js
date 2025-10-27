// slowmo-guards.js
// Guards to keep playbackRate consistent across multiple <video> tags and replays.
// Usage: call wireVideoRateGuards() once; then call setSlowMo(true/false).

let __ms_currentRate = 1;

function __ms_videos() {
  return Array.from(document.querySelectorAll('video'));
}

function __ms_applyRateToAll() {
  __ms_videos().forEach(v => {
    try {
      v.defaultPlaybackRate = __ms_currentRate;
      v.playbackRate = __ms_currentRate;
    } catch (_) { /* some browsers lock during readyState 0 */ }
  });
}

export function setSlowMo(enabled, rate = 0.5) {
  __ms_currentRate = enabled ? rate : 1;
  __ms_applyRateToAll();
}

export function wireVideoRateGuards() {
  __ms_videos().forEach(v => {
    const onLoaded = () => {
      v.defaultPlaybackRate = __ms_currentRate;
      v.playbackRate = __ms_currentRate;
    };
    const onPlay = () => {
      if (v.playbackRate !== __ms_currentRate) {
        v.playbackRate = __ms_currentRate;
      }
    };
    const onEnded = () => {
      v.defaultPlaybackRate = __ms_currentRate;
    };

    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('play', onPlay);
    v.addEventListener('ended', onEnded);
  });
}
