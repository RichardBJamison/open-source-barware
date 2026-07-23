/**
 * Doodle Bug corner robot.
 *
 * The robot is a quiet visual signature only. It does not open, close,
 * move around the page, follow the pointer, or intercept page controls.
 */
(function () {
  "use strict";

  if (window.__doodleBugCornerRobotLoaded) return;
  window.__doodleBugCornerRobotLoaded = true;

  var config = window.ROBOT_CHAT_CONFIG || {};
  var robotSrc = config.robotSrc || "./robot/chatbot-robot.png";

  function build() {
    if (document.getElementById("sj-chatbot")) return;

    var style = document.createElement("style");
    style.id = "doodle-bug-corner-robot-styles";
    style.textContent =
      "#sj-chatbot{" +
      "position:fixed;left:18px;bottom:14px;z-index:20;pointer-events:none;" +
      "width:112px;height:112px;display:grid;place-items:end start;" +
      "}" +
      "#sj-chatbot .sj-corner-robot{" +
      "display:block;width:112px;height:112px;object-fit:contain;" +
      "filter:drop-shadow(0 10px 18px rgba(23,35,63,.28));" +
      "}" +
      "@media (max-width:640px){#sj-chatbot{left:10px;bottom:10px;width:78px;height:78px;}#sj-chatbot .sj-corner-robot{width:78px;height:78px;}}" +
      "@media (prefers-reduced-motion:reduce){#sj-chatbot .sj-corner-robot{transition:none;}}";
    document.head.appendChild(style);

    var root = document.createElement("div");
    root.id = "sj-chatbot";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = '<img class="sj-corner-robot" src="' + robotSrc + '" alt="" width="112" height="112" draggable="false" />';
    document.body.appendChild(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build, { once: true });
  } else {
    build();
  }
})();
