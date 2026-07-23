/**
 * FCR hero boomerang — continuous cruise, no stops.
 * Pre-baked forward+reverse MP4. Constant 0.65x; at either end of the
 * full cycle, snap back and keep going (no hold, no soft slow zone).
 */
(function () {
  var v = document.getElementById("fcr-hero-video");
  if (!v) return;

  var CRUISE = 0.65;
  var D = 0;
  var ready = false;

  v.muted = true;
  v.defaultMuted = true;
  v.setAttribute("muted", "");
  v.setAttribute("playsinline", "");
  v.setAttribute("webkit-playsinline", "");
  v.setAttribute("autoplay", "");
  v.playsInline = true;
  v.controls = false;
  v.removeAttribute("controls");
  v.loop = false;
  v.removeAttribute("loop");
  v.preload = "auto";

  function setRate(rate) {
    try {
      v.playbackRate = rate;
    } catch (e) {
      try {
        v.playbackRate = Math.max(0.0625, rate);
      } catch (e2) {}
    }
  }

  function play() {
    try {
      v.muted = true;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  function restart() {
    try {
      v.currentTime = 0.02;
    } catch (e) {}
    setRate(CRUISE);
    play();
  }

  function onTick() {
    if (!ready || D <= 0) return;
    if (v.paused) play();

    var t = v.currentTime || 0;
    // Hit end of reverse half → immediately return to start
    if (t >= D - 0.04) {
      restart();
      return;
    }
    setRate(CRUISE);
  }

  function onEnded() {
    restart();
  }

  function setup() {
    if (ready) return;
    D = v.duration || 0;
    if (!D || !isFinite(D)) return;
    ready = true;
    v.loop = false;
    try {
      if (v.currentTime > 0.15) v.currentTime = 0;
    } catch (e) {}
    setRate(CRUISE);
    play();
  }

  v.addEventListener("timeupdate", onTick);
  v.addEventListener("ended", onEnded);

  function frame() {
    onTick();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  if (v.readyState >= 1) setup();
  else v.addEventListener("loadedmetadata", setup);

  v.addEventListener("loadeddata", play);
  v.addEventListener("canplay", function () {
    v.classList.add("ready");
    if (!ready) setup();
    play();
  });
  v.addEventListener("canplaythrough", play, { once: true });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) play();
  });
  window.addEventListener("pageshow", play);

  var unlock = function () {
    play();
    if (!ready && v.readyState >= 1) setup();
    document.removeEventListener("touchstart", unlock, true);
    document.removeEventListener("scroll", unlock, true);
    document.removeEventListener("click", unlock, true);
  };
  document.addEventListener("touchstart", unlock, { capture: true, passive: true });
  document.addEventListener("scroll", unlock, { capture: true, passive: true });
  document.addEventListener("click", unlock, { capture: true, passive: true });

  setTimeout(play, 400);
  setTimeout(function () {
    play();
    if (!ready && v.readyState >= 1) setup();
  }, 1200);
})();
