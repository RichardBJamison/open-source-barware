(function () {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  var VID_KEY = "osb_vid";
  var SEEN_KEY = "osb_seen";
  var SESSION_KEY = "osb_session_pv";
  var lastDownloadTrack = { file: "", ts: 0 };

  function getVid() {
    try {
      var vid = localStorage.getItem(VID_KEY);
      if (!vid) {
        vid =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : "v-" + Date.now() + "-" + Math.random().toString(16).slice(2);
        localStorage.setItem(VID_KEY, vid);
      }
      return vid;
    } catch (_) {
      return "anon";
    }
  }

  function sendJson(url, payload) {
    var body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      var blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    }
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
      keepalive: true,
    }).catch(function () {});
  }

  function publishDownloadCount(total) {
    if (typeof total !== "number" || total < 0) return;
    window.dispatchEvent(
      new CustomEvent("osb-download-count", {
        detail: { total: total },
      })
    );
  }

  function trackDownload(file, label) {
    var now = Date.now();
    if (lastDownloadTrack.file === file && now - lastDownloadTrack.ts < 1500) {
      return;
    }
    lastDownloadTrack = { file: file, ts: now };

    fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vid: getVid(),
        file: file,
        label: label || file,
        path: window.location.pathname || "/",
      }),
      keepalive: true,
    })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        if (data && typeof data.count === "number") {
          publishDownloadCount(data.count);
        }
      })
      .catch(function () {});
  }

  function utmParam(name) {
    try {
      return new URLSearchParams(window.location.search).get(name) || "";
    } catch (_) {
      return "";
    }
  }

  function trackPageview() {
    var path = window.location.pathname || "/";
    if (path.indexOf("/analytics") === 0) return;

    var vid = getVid();
    var returning = false;
    var sessionPageviews = 1;

    try {
      returning = !!localStorage.getItem(SEEN_KEY);
      localStorage.setItem(SEEN_KEY, "1");
      sessionPageviews =
        parseInt(sessionStorage.getItem(SESSION_KEY) || "0", 10) + 1;
      sessionStorage.setItem(SESSION_KEY, String(sessionPageviews));
    } catch (_) {}

    sendJson("/api/track", {
      page: document.title || path,
      path: path,
      title: document.title || "",
      referrer: document.referrer || "",
      vid: vid,
      returning: returning,
      sessionPageviews: sessionPageviews,
      screen:
        window.screen && window.screen.width
          ? window.screen.width + "x" + window.screen.height
          : "",
      viewport: window.innerWidth + "x" + window.innerHeight,
      lang: navigator.language || "",
      connection:
        navigator.connection && navigator.connection.effectiveType
          ? navigator.connection.effectiveType
          : "",
      loadTime: Math.round(
        performance && performance.now ? performance.now() : 0
      ),
      utm_source: utmParam("utm_source"),
      utm_medium: utmParam("utm_medium"),
      utm_campaign: utmParam("utm_campaign"),
      utm_term: utmParam("utm_term"),
      utm_content: utmParam("utm_content"),
    });
  }

  window.osbTrackDownload = trackDownload;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trackPageview);
  } else {
    trackPageview();
  }

  document.addEventListener(
    "click",
    function (e) {
      var target = e.target;
      if (!target || !target.closest) return;
      var link = target.closest("a[href]");
      if (!link) return;
      if (link.hasAttribute("data-osb-no-track")) return;

      var href = link.getAttribute("href") || "";
      if (!href) return;

      var isZip = href.indexOf(".zip") !== -1;
      var isDownloadAttr = link.hasAttribute("download");
      if (!isZip && !isDownloadAttr) return;

      trackDownload(href, (link.textContent || "").trim().slice(0, 120));
    },
    true
  );
})();