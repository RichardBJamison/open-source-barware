/* Open Source Barware — Chrome program client */

const SETUP_FLOW = [
  "welcome",
  "name_bar",
  "voice_walk",
  "reconcile",
  "build_bar",
  "map_review",
  "first_count",
];

const STEP_LABELS = {
  welcome: "Start",
  name_bar: "Name",
  voice_walk: "Walk",
  build_bar: "Review",
  reconcile: "Reconcile",
  map_review: "Review",
  first_count: "Count",
};

const CATEGORY_KEYWORDS = {
  vodka: ["vodka", "stoli", "tito's", "titos", "ketel", "absolut", "grey goose", "smirnoff"],
  gin: ["gin", "tanqueray", "hendricks", "bombay", "beefeater"],
  rum: ["rum", "bacardi", "captain", "malibu", "kraken", "myers", "appleton", "mount gay", "don q", "plantation", "flor de cana", "pyrat"],
  tequila: ["tequila", "patron", "casamigos", "don julio", "espolon", "hornitos"],
  whiskey: ["whiskey", "whisky", "bourbon", "rye", "jack daniels", "jameson", "makers mark", "bulleit", "woodford"],
  scotch: ["scotch", "glenfiddich", "macallan", "glenlivet", "johnnie walker"],
  cognac: ["cognac", "brandy", "hennessy", "remy martin"],
  liqueur: ["liqueur", "amaretto", "kahlua", "baileys", "campari", "aperol"],
  beer: ["beer", "ipa", "lager", "ale", "stout", "porter", "lite", "light", "heineken", "corona", "modelo", "miller", "coors", "budweiser", "bud light", "dos equis", "pacifico", "tecate", "anchor", "stella", "white claw"],
  wine: ["wine", "cabernet", "merlot", "pinot", "chardonnay", "prosecco", "champagne"],
  mixer: ["soda", "juice", "tonic", "syrup", "grenadine", "bitters", "vermouth"],
};

let setupListenersBound = false;
let homeListenersBound = false;
let barState = { id: "", name: "", stations: [] };
let walkParsed = false;
let countParsed = false;
let editingStationId = null;
let allBars = [];

const WALK_NOTES_EXTENSIONS = new Set(["txt", "text", "md", "markdown", "rtf", "note"]);
const WALK_NOTES_ACCEPT_LABEL = ".txt · .md · .markdown · .rtf";
const BOTTLE_SIZES = ["12oz", "16oz", "24oz", "50ml", "200ml", "375ml", "750ml", "1L", "1.75L"];
let walkReviewListenersBound = false;
let walkParseTimer = null;
let countParseTimer = null;
let lastParsedWalkText = "";
let lastParsedCountText = "";
let walkReviewBars = [];
let walkParsedBarCount = 1;
let reconcileRenameBars = [];
let reconcileRenameIndex = 0;
/** @type {"append" | "replace"} */
let walkFileUploadMode = "append";
/** @type {"append" | "replace"} */
let countFileUploadMode = "append";

const WALK_BAR_MARKER_WORDS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

function walkNotesExtension(filename) {
  const parts = (filename || "").split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function isAcceptedWalkNotesFile(file) {
  if (!file) return false;
  const ext = walkNotesExtension(file.name);
  if (WALK_NOTES_EXTENSIONS.has(ext)) return true;
  const type = (file.type || "").toLowerCase();
  return type.startsWith("text/") || type === "application/rtf";
}

function normalizeUploadedWalkNotes(text, filename) {
  const ext = walkNotesExtension(filename);
  if (ext !== "rtf" && !text.trimStart().startsWith("{\\rtf")) return text;
  return text
    .replace(/\\par[d]?\b/gi, "\n")
    .replace(/\\line\b/gi, "\n")
    .replace(/\\tab\b/gi, "\t")
    .replace(/\\'[0-9a-f]{2}/gi, " ")
    .replace(/\\[a-z]+-?\d*\s?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function walkTextStartsWithBarMarker(text) {
  const words = walkNormalizeText(text)
    .split(/\s+/)
    .map((w) => w.replace(/^[,;:()"']+|[,;:()"']+$/g, ""))
    .filter(Boolean);
  for (let i = 0; i < Math.min(words.length, 6); i++) {
    if (walkMatchBar(words, i)) return true;
  }
  return false;
}

function barNumberFromWalkFilename(filename) {
  const m = (filename || "").match(/bar[-_\s]?(\d{1,2})/i);
  return m ? parseInt(m[1], 10) : null;
}

function walkBarMarkerPrefix(n) {
  const word = WALK_BAR_MARKER_WORDS[n - 1] || String(n);
  return `Bar ${word}.`;
}

function ensureWalkBarMarker(text, filename, fileIndex, totalFiles) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (walkTextStartsWithBarMarker(trimmed)) return trimmed;
  const fromFile = barNumberFromWalkFilename(filename);
  const n = fromFile ?? (totalFiles > 1 || fileIndex > 1 ? fileIndex : null);
  if (!n) return trimmed;
  return `${walkBarMarkerPrefix(n)}\n${trimmed}`;
}

function countParsedWalkBars(text) {
  if (!text?.trim()) return 0;
  const { bars } = parseWalkText(text);
  return bars.length || (text.trim() ? 1 : 0);
}

function getWalkFileInput() {
  const input = document.getElementById("voiceNotesFile");
  if (input) input.multiple = true;
  return input;
}

function openWalkFilePicker(mode = "append") {
  walkFileUploadMode = mode;
  const input = getWalkFileInput();
  if (!input) return;
  input.value = "";
  input.click();
}

function uid() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function guessCategory(name) {
  const lower = name.toLowerCase();
  const priority = ["beer", "wine", "mixer"];
  for (const category of priority) {
    for (const kw of CATEGORY_KEYWORDS[category]) {
      if (lower.includes(kw)) return category;
    }
  }
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (priority.includes(category)) continue;
    for (const kw of keywords) {
      if (lower.includes(kw)) return category;
    }
  }
  return "spirits";
}

function guessStationType(name) {
  const lower = name.toLowerCase().trim();
  if (lower.includes("back")) return "back-bar";
  if (lower === "point" || lower.endsWith(" point")) return "well";
  if (lower.includes("main bar") || lower.includes("service bar")) return "well";
  if (lower.includes("well")) return "well";
  if (lower.includes("wine") || lower.includes("beer") || lower.includes("walk") || lower.includes("cooler")) {
    return "walk-in";
  }
  if (lower.includes("storage") || lower.includes("dry")) return "storage";
  return "back-bar";
}

function stationBadgeClass(type) {
  const map = {
    well: "badge-well",
    "back-bar": "badge-backbar",
    backbar: "badge-backbar",
    storage: "badge-storage",
    "walk-in": "badge-walkin",
  };
  return map[type] || "badge-backbar";
}

function stationBadgeLabel(type) {
  if (type === "back-bar" || type === "backbar") return "back bar";
  return (type || "station").replace("-", " ");
}

const OSB = {
  async getState() {
    const r = await fetch("/api/state");
    return r.json();
  },

  async getBar(seed = false, barId = null) {
    const qs = new URLSearchParams();
    if (seed) qs.set("seed", "true");
    if (barId) qs.set("bar_id", barId);
    const q = qs.toString();
    const r = await fetch(`/api/bar${q ? `?${q}` : ""}`);
    return r.json();
  },

  async saveBar(bar) {
    const r = await fetch("/api/bar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bar),
    });
    if (!r.ok) throw new Error("Could not save bar map");
    return r.json();
  },

  async resetTemplates() {
    const r = await fetch("/api/bar/reset-templates", { method: "POST" });
    if (!r.ok) throw new Error("Could not reset templates");
    return r.json();
  },

  async hardReset() {
    const r = await fetch("/api/hard-reset", { method: "POST" });
    if (!r.ok) throw new Error("Could not reset the program");
    barState = null;
    allBars = [];
    resetCoachingClientState();
    return r.json();
  },

  async listBars() {
    const r = await fetch("/api/bars");
    return r.json();
  },

  async createBar(name, startSetup = true) {
    const r = await fetch("/api/bars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, start_setup: startSetup }),
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error || "Could not create bar");
    }
    return r.json();
  },

  async switchBar(barId) {
    const r = await fetch("/api/bars/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bar_id: barId }),
    });
    if (!r.ok) throw new Error("Could not switch bar");
    return r.json();
  },

  async startBarSetup(barId) {
    const r = await fetch("/api/bars/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bar_id: barId }),
    });
    if (!r.ok) throw new Error("Could not start bar setup");
    return r.json();
  },

  async selectSetupBar(barId) {
    const r = await fetch("/api/bars/select-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bar_id: barId }),
    });
    if (!r.ok) throw new Error("Could not select bar");
    return r.json();
  },

  async deleteBar(barId) {
    const r = await fetch(`/api/bars/${encodeURIComponent(barId)}`, { method: "DELETE" });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error || "Could not delete bar");
    }
    return r.json();
  },

  async saveConfig(patch) {
    const r = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return r.json();
  },

  async skipAi() {
    const r = await fetch("/api/setup/skip-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    return r.json();
  },

  async advancePhase(phase) {
    const r = await fetch("/api/phase/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase }),
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error || "Cannot advance");
    }
    return r.json();
  },

  async goPhase(phase) {
    const r = await fetch("/api/phase/go", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase }),
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error || "Cannot go to that step");
    }
    return r.json();
  },

  async uploadVoiceNotes(text) {
    const r = await fetch("/api/setup/voice-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return r.json();
  },

  async uploadCountNotes(text) {
    const r = await fetch("/api/setup/count-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error || "Could not save count notes");
    }
    return r.json();
  },

  async processInventoryCycle() {
    const r = await fetch("/api/count/process-cycle", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error || "Could not process inventory cycle");
    }
    return r.json();
  },

  async reconcile() {
    const r = await fetch("/api/setup/reconcile", { method: "POST" });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error || "Reconcile failed");
    }
    return r.json();
  },

  async approveMap() {
    const r = await fetch("/api/setup/approve-map", { method: "POST" });
    return r.json();
  },

  async getMetrics(window, from, to) {
    const q = new URLSearchParams({ window });
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const r = await fetch(`/api/metrics?${q}`);
    return r.json();
  },

  async getInHouse(category = "all") {
    const q = new URLSearchParams({ category });
    const r = await fetch(`/api/in-house?${q}`);
    return r.json();
  },

  async getAnalytics() {
    const r = await fetch("/api/analytics");
    if (!r.ok) throw new Error("Could not load analytics");
    return r.json();
  },

  async getPosLog() {
    const r = await fetch("/api/pos/log");
    return r.json();
  },

  async uploadPosLog({ label, note, file, text, inputType = "pos" }) {
    const type = inputType === "invoice" ? "invoice" : "pos";
    const defaultLabel = type === "invoice" ? "Invoice drop" : "POS drop";
    if (text?.trim() && !file) {
      const r = await fetch("/api/pos/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label || defaultLabel, note, text, input_type: type }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Upload failed");
      }
      return r.json();
    }
    const fd = new FormData();
    fd.append("label", label || defaultLabel);
    fd.append("input_type", type);
    if (note) fd.append("note", note);
    fd.append("file", file);
    const r = await fetch("/api/pos/log", { method: "POST", body: fd });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error || "Upload failed");
    }
    return r.json();
  },

  async beginNextCount() {
    const r = await fetch("/api/cycle/begin-next-count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error || "Could not start next count");
    }
    return r.json();
  },

  async parseInvoice({ imageFile, text, useAi = false }) {
    if (imageFile) {
      const fd = new FormData();
      fd.append("image", imageFile);
      const r = await fetch("/api/inputs/invoice/parse", { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Invoice photo parse failed");
      return data;
    }
    const r = await fetch("/api/inputs/invoice/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, use_ai: useAi }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "Invoice parse failed");
    return data;
  },

  async saveParsedInvoice({ invoice, label, note }) {
    const r = await fetch("/api/inputs/invoice/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice, label, note }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "Could not save parsed invoice");
    return data;
  },

  async deletePosLog(entryId) {
    const r = await fetch(`/api/pos/log/${entryId}`, { method: "DELETE" });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error || "Could not delete POS entry");
    }
    return r.json();
  },
};

function renderStepIndicator(phases, current) {
  const el = document.getElementById("stepIndicator");
  if (!el) return;
  const setupPhases = phases.filter(
    (p) => p.id !== "butterfly" && p.id !== "welcome"
  );
  const idx = setupPhases.findIndex((p) => p.id === current);
  const curIdx = current === "welcome" ? -1 : idx;

  el.innerHTML = setupPhases
    .map((p, i) => {
      const label = STEP_LABELS[p.id] || p.label;
      const isActive = p.id === current;
      const isDone = curIdx >= 0 && i < curIdx;
      let nodeCls = "step-node";
      if (isActive) nodeCls += " active";
      else if (isDone) nodeCls += " done";

      const pipe =
        i < setupPhases.length - 1
          ? `<div class="step-pipe${isDone ? " done" : isActive ? " half" : ""}"><span class="step-rivet"></span></div>`
          : "";

      const inner = isDone
        ? `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
        : String(i + 1);

      return `
        <div class="step-item">
          <button type="button" class="${nodeCls}" data-phase="${p.id}" title="${label}">
            ${inner}
          </button>
          <span class="step-label${isActive ? " active" : isDone ? " done" : ""}">${label}</span>
        </div>
        ${pipe}
      `;
    })
    .join("");

  el.querySelectorAll("[data-phase]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await persistBar();
        await OSB.goPhase(btn.dataset.phase);
        setStatus("");
        await initSetup();
      } catch (e) {
        setStatus(e.message);
      }
    });
  });
}

function renderPhaseRail(phases, current) {
  const el = document.getElementById("phaseRail");
  if (!el) return;
  const idx = phases.findIndex((p) => p.id === current);
  el.innerHTML = phases
    .filter((p) => p.id !== "butterfly")
    .map((p, i) => {
      let cls = "phase-pill phase-pill-btn";
      if (p.id === current) cls += " active";
      else if (i < idx) cls += " done";
      const label = STEP_LABELS[p.id] || p.label;
      return `<button type="button" class="${cls}" data-phase="${p.id}">${label}</button>`;
    })
    .join("");
}

function showOnly(id) {
  document.querySelectorAll("[data-step]").forEach((n) => {
    n.classList.toggle("hidden", n.dataset.step !== id);
  });
}

function setStatus(msg, id = "status") {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function showCountBanner(message, variant = "info") {
  const el = document.getElementById("countBanner");
  if (!el) {
    setStatus(message);
    return;
  }
  el.className = `count-banner count-banner--${variant}`;
  el.textContent = message;
  el.classList.remove("hidden");
  if (variant === "error") {
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function hideCountBanner() {
  document.getElementById("countBanner")?.classList.add("hidden");
}

function showProcessOverlay(title, sub) {
  const overlay = document.getElementById("processOverlay");
  if (!overlay) return;
  const titleEl = document.getElementById("processOverlayTitle");
  const subEl = document.getElementById("processOverlaySub");
  if (titleEl) titleEl.textContent = title || "Running inventory math…";
  if (subEl) subEl.textContent = sub || "Locking your cycle and opening home base.";
  overlay.classList.remove("hidden");
}

function hideProcessOverlay() {
  document.getElementById("processOverlay")?.classList.add("hidden");
}

function sortedStations() {
  return [...barState.stations].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function sortedStationsFor(bar = barState) {
  return [...(bar?.stations || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function allBottles() {
  return sortedStations().flatMap((s) =>
    (s.bottles || []).map((b) => ({ ...b, stationId: s.id, stationName: s.name }))
  );
}

function allBottlesForReview() {
  const bars = walkReviewBars.length > 1 ? walkReviewBars : barState ? [barState] : [];
  return bars.flatMap((bar) =>
    sortedStationsFor(bar).flatMap((s) =>
      (s.bottles || []).map((b) => ({
        ...b,
        stationId: s.id,
        stationName: s.name,
        barId: bar.id,
        barName: bar.name?.trim() || "Bar",
      }))
    )
  );
}

async function refreshWalkReviewBars() {
  const listed = await OSB.listBars();
  const summaries = listed.bars || [];
  if (summaries.length <= 1) {
    walkReviewBars = barState ? [barState] : [];
    return;
  }
  const currentId = barState?.id;
  walkReviewBars = [];
  for (const summary of summaries) {
    walkReviewBars.push(normalizeBar(await OSB.getBar(false, summary.id)));
  }
  if (currentId) {
    barState = walkReviewBars.find((b) => b.id === currentId) || walkReviewBars[0];
  }
}

async function withBarContext(barId, fn) {
  if (!barId || barState?.id === barId) return fn();
  await OSB.selectSetupBar(barId);
  barState = normalizeBar(await OSB.getBar(false, barId));
  try {
    return await fn();
  } finally {
    await refreshWalkReviewBars();
    if (barState?.id) await OSB.selectSetupBar(barState.id);
  }
}

function bottleCount() {
  return allBottles().length;
}

function extractSizeFromRaw(raw) {
  const trimmed = raw.trim();
  let name = trimmed;
  let size = "750ml";
  let size_verified = false;
  const patterns = [
    [/\b1\.?75\s*l?\b|\bhalf\s*gallon\b|\bhandle\b/i, "1.75L"],
    [/\b1\s*l(?:iter|itre)?\b|\bleader\b|\blitre\b/i, "1L"],
    [/\b24\s*oz\b/i, "24oz"],
    [/\b16\s*oz\b/i, "16oz"],
    [/\b12\s*oz\b/i, "12oz"],
    [/\b750\b|\bseven\s*fifty\b|\b7\s*fifty\b|\b7\/50\b/i, "750ml"],
    [/\b375\b|\bsplit\b/i, "375ml"],
    [/\b200\b/i, "200ml"],
    [/\b50\s*ml\b/i, "50ml"],
    [/\b(?:\.75|0\.75)\b/i, "750ml"],
  ];
  for (const [re, sz] of patterns) {
    if (re.test(name)) {
      size = sz;
      size_verified = true;
      name = name.replace(re, " ").replace(/\s+/g, " ").trim();
      break;
    }
  }
  return { name: name || trimmed, size, size_verified, raw_heard: trimmed };
}

function sizeOptions(selected) {
  return BOTTLE_SIZES.map((s) => `<option value="${s}"${s === selected ? " selected" : ""}>${s}</option>`).join("");
}

function stationOptions(selectedId) {
  return sortedStations()
    .map((s) => `<option value="${s.id}"${s.id === selectedId ? " selected" : ""}>${escapeHtml(s.name)}</option>`)
    .join("");
}

function findBottleRecord(bottleId, stationId) {
  const station = barState.stations.find((s) => s.id === stationId);
  return station?.bottles?.find((b) => b.id === bottleId) ?? null;
}

function moveBottle(bottleId, fromStationId, toStationId) {
  if (fromStationId === toStationId) return;
  const from = barState.stations.find((s) => s.id === fromStationId);
  const to = barState.stations.find((s) => s.id === toStationId);
  if (!from || !to) return;
  const idx = (from.bottles || []).findIndex((b) => b.id === bottleId);
  if (idx < 0) return;
  const [bottle] = from.bottles.splice(idx, 1);
  if (!to.bottles) to.bottles = [];
  to.bottles.push(bottle);
}

const WELL_STATION_ROLES = ["primary", "service", "point", "patio", "secondary", "rear", "front", "large", "small"];

const WALK_STATION_WORD_NUMS = {
  one: 1, two: 2, too: 2, to: 2, three: 3, four: 4, for: 4,
  five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function normalizeWalkStationLabel(label) {
  if (!label) return label;
  const parts = label.trim().split(/\s+/);
  if (parts[0]?.toLowerCase() !== "well") return label;
  const numRaw = parts[1];
  const numWord = WALK_STATION_WORD_NUMS[numRaw?.toLowerCase?.() ?? numRaw];
  const num = numWord ?? (/^\d+$/.test(String(numRaw)) ? parseInt(numRaw, 10) : null);
  if (!num) return label;
  let role = "Primary";
  for (let i = 2; i < parts.length; i++) {
    const low = parts[i].toLowerCase();
    if (low === "row" || low === "bro") break;
    if (WELL_STATION_ROLES.includes(low)) {
      role = low.charAt(0).toUpperCase() + low.slice(1);
      break;
    }
  }
  return `Well ${num} ${role}`;
}

function wellsByOrder(stations = sortedStations()) {
  return stations.filter((s) => s.type === "well");
}

function parseWalkStationIntent(label) {
  if (!label) return null;
  const lower = label.toLowerCase().trim();
  const wellM = lower.match(
    /^well\s+(one|two|too|to|three|four|for|five|six|seven|eight|nine|ten|\d{1,2})\b(?:\s+(\w+))?/
  );
  if (wellM) {
    const idx = WALK_STATION_WORD_NUMS[wellM[1]] ?? parseInt(wellM[1], 10);
    let role = null;
    const tail = lower.slice(wellM[0].length).trim();
    const roleInTail = tail.match(/^(primary|secondary|service|point|patio|rear|front|large|small)\b/);
    if (roleInTail) role = roleInTail[1];
    else if (wellM[2] && WELL_STATION_ROLES.includes(wellM[2])) role = wellM[2];
    return { kind: "well", wellIndex: idx, role };
  }
  if (/^back\s+bar/.test(lower)) {
    const qual = lower.replace(/^back\s+bar\s*/, "").split(/\s+/).filter((w) => w !== "row")[0] || "";
    return { kind: "back-bar", qualifier: qual };
  }
  if (/beer\s+cooler/.test(lower)) return { kind: "beer-cooler" };
  if (/patio\s+cooler/.test(lower)) return { kind: "patio-cooler" };
  if (/wine\s+(wall|cooler|rack|cellar)/.test(lower)) return { kind: "wine" };
  if (/liquor\s+room/.test(lower)) return { kind: "liquor-room" };
  if (/speed\s*rail|\brail\b/.test(lower)) return { kind: "speed-rail" };
  if (/^(cooler|walk[\s-]?in|store\s*room|storage)\b/.test(lower)) return { kind: "storage" };
  return { kind: "unknown" };
}

function resolveWalkStation(label, stations = barState.stations) {
  if (!label) return null;
  const ordered = [...stations].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const normLabel = normalizeWalkStationLabel(label).toLowerCase();
  const key = label.trim().toLowerCase();

  const exactNorm = ordered.find((s) => normalizeWalkStationLabel(s.name).toLowerCase() === normLabel);
  if (exactNorm) return exactNorm;

  const exactName = ordered.find((s) => s.name.toLowerCase() === key);
  if (exactName) return exactName;

  const intent = parseWalkStationIntent(label);
  if (!intent) return null;

  if (intent.kind === "well" && intent.wellIndex) {
    if (intent.role) {
      const roleTarget = `well ${intent.wellIndex} ${intent.role}`;
      const byRole = ordered.find((s) => {
        const sn = normalizeWalkStationLabel(s.name).toLowerCase();
        return sn === roleTarget || sn.startsWith(`${roleTarget} `);
      });
      if (byRole) return byRole;
    }
    const wells = wellsByOrder(ordered);
    const byIndex = wells[intent.wellIndex - 1];
    if (byIndex) return byIndex;
  }

  if (intent.kind === "back-bar") {
    const backBars = ordered.filter((s) => s.type === "back-bar" || s.type === "backbar");
    if (!backBars.length) return null;
    const qual = (intent.qualifier || "").toLowerCase();
    if (qual) {
      const match = backBars.find((s) => {
        const n = s.name.toLowerCase();
        if (qual === "main" && n.includes("main")) return true;
        if ((qual === "top" || qual === "shelf") && (n.includes("top") || n.includes("shelf"))) return true;
        if (qual === "point" && n.includes("point")) return true;
        if (qual === "service" && n.includes("service")) return true;
        return n.includes(qual);
      });
      if (match) return match;
    }
    return backBars[0];
  }

  if (intent.kind === "beer-cooler") {
    return (
      ordered.find(
        (s) =>
          (s.type === "walk-in" || s.type === "walkin") &&
          /beer|cooler/i.test(s.name) &&
          !/wine|patio/i.test(s.name)
      ) ?? ordered.find((s) => /beer\s+cooler/i.test(s.name))
    );
  }

  if (intent.kind === "patio-cooler") {
    return ordered.find((s) => /patio/i.test(s.name) && /cooler/i.test(s.name));
  }

  if (intent.kind === "wine") {
    return ordered.find((s) => (s.type === "walk-in" || s.type === "walkin") && /wine/i.test(s.name));
  }

  if (intent.kind === "liquor-room") {
    return ordered.find((s) => s.type === "storage" || /liquor\s*room/i.test(s.name));
  }

  if (intent.kind === "speed-rail") {
    return ordered.find((s) => /speed|rail/i.test(s.name));
  }

  if (intent.kind === "storage") {
    return ordered.find((s) => s.type === "storage" || /liquor\s*room|storage|store/i.test(s.name));
  }

  return null;
}

function stationIdByName(name) {
  const key = (name || "").trim().toLowerCase();
  if (!key) return null;

  const resolved = resolveWalkStation(name);
  if (resolved) return resolved.id;

  const normalized = normalizeWalkStationLabel(name).toLowerCase();
  const exact = sortedStations().find(
    (s) => s.name.toLowerCase() === key || s.name.toLowerCase() === normalized
  );
  if (exact) return exact.id;

  const norm = key.replace(/[^a-z0-9]/g, "");
  if (norm.length < 4) return null;
  const fuzzy = sortedStations().find((s) => {
    const sk = s.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const sn = normalizeWalkStationLabel(s.name).toLowerCase().replace(/[^a-z0-9]/g, "");
    return sk === norm || sn === norm;
  });
  return fuzzy?.id ?? null;
}

function stationIdsInCountScope(stationLabel) {
  const ids = new Set();
  if (!stationLabel) return [];
  const normalized = normalizeWalkStationLabel(stationLabel);
  for (const s of sortedStations()) {
    if (normalizeWalkStationLabel(s.name) === normalized) ids.add(s.id);
    if (s.name.toLowerCase() === stationLabel.trim().toLowerCase()) ids.add(s.id);
  }
  const direct = stationIdByName(stationLabel);
  if (direct) ids.add(direct);
  return [...ids];
}

function walkUnverifiedCount() {
  const bottles = walkReviewBars.length > 1 ? allBottlesForReview() : allBottles();
  return bottles.filter((b) => !b.size_verified).length;
}

function walkReviewIsComplete() {
  const status = barState.setup?.walk_review_status;
  if (status === "complete" || status === "skipped" || status === "imported") return true;
  if (bottleCount() === 0) return false;
  return walkUnverifiedCount() === 0;
}

function scrollToFirstUnverifiedWalkRow() {
  const row = document.querySelector("#walkReviewBody tr.size-unverified, #walkReviewBody tr.row-flagged");
  if (!row) return false;
  row.scrollIntoView({ behavior: "smooth", block: "center" });
  row.classList.add("walk-row-pulse");
  window.setTimeout(() => row.classList.remove("walk-row-pulse"), 1600);
  return true;
}

function updateWalkContinueButton() {
  const btn = document.getElementById("btnWalkContinue");
  if (!btn) return;
  const ready = walkReviewIsComplete();
  const remaining = walkUnverifiedCount();
  btn.classList.toggle("btn-walk-gated", !ready);
  btn.setAttribute("aria-disabled", ready ? "false" : "true");
  if (ready) {
    btn.textContent = "Continue to reconcile →";
  } else if (bottleCount() === 0) {
    btn.textContent = "Parse my notes to continue";
  } else {
    btn.textContent =
      remaining === 1
        ? "1 size still needs OK"
        : `${remaining} sizes still need OK`;
  }
}

function updateWalkReviewProgress() {
  const el = document.getElementById("walkReviewProgress");
  if (!el) return;
  const bottles = allBottles();
  const verified = bottles.filter((b) => b.size_verified).length;
  const remaining = bottles.length - verified;
  el.textContent =
    bottles.length === 0
      ? "No bottles yet — upload notes or add manually."
      : remaining
        ? `${verified} of ${bottles.length} sizes reviewed — ${remaining} still need the OK checkbox`
        : `${verified} of ${bottles.length} sizes reviewed — ready to continue`;
}

function setReviewPath(path) {
  document.querySelectorAll("[data-review-path]").forEach((btn) => {
    const active = btn.dataset.reviewPath === path;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.getElementById("walkReviewScreen")?.classList.toggle("hidden", path !== "screen");
  document.getElementById("walkReviewSpreadsheet")?.classList.toggle("hidden", path !== "spreadsheet");
}

function renderWalkReview() {
  const body = document.getElementById("walkReviewBody");
  const barHead = document.getElementById("walkColBarHead");
  if (!body) return;
  const multi = walkReviewBars.length > 1;
  barHead?.classList.toggle("hidden", !multi);

  const bottles = multi ? allBottlesForReview() : allBottles();
  const colSpan = multi ? 7 : 6;
  if (!bottles.length) {
    body.innerHTML = `<tr><td colspan="${colSpan}" class="bottle-empty">Upload notes to populate this table.</td></tr>`;
    updateWalkReviewProgress();
    return;
  }
  const flaggedFirst = [...bottles].sort((a, b) => {
    const au = a.size_verified ? 1 : 0;
    const bu = b.size_verified ? 1 : 0;
    if (au !== bu) return au - bu;
    const af = (a.parse_flags || []).length ? 0 : 1;
    const bf = (b.parse_flags || []).length ? 0 : 1;
    return af - bf;
  });
  body.innerHTML = flaggedFirst
    .map((b) => {
      const flags = b.parse_flags || [];
      const raw = b.raw_heard || b.name;
      const rawCell = flags.length
        ? `${escapeHtml(raw)}<div class="parse-flag">⚑ ${escapeHtml(flags.join("; "))}</div>`
        : escapeHtml(raw);
      const unverified = !b.size_verified ? " size-unverified" : "";
      const flaggedCls = flags.length ? " row-flagged" : "";
      const barCell = multi
        ? `<td class="walk-col-bar">${escapeHtml(b.barName || "Bar")}</td>`
        : "";
      const barAttr = b.barId ? ` data-bar="${b.barId}"` : "";
      const stationOpts = multi
        ? stationOptionsForBar(b.barId, b.stationId)
        : stationOptions(b.stationId);
      return `
        <tr class="${unverified}${flaggedCls}" data-bottle="${b.id}" data-station="${b.stationId}"${barAttr}>
          ${barCell}
          <td class="raw-heard">${rawCell}</td>
          <td><input type="text" class="review-name" value="${escapeHtml(b.name)}" data-bottle="${b.id}" data-station="${b.stationId}"${barAttr} /></td>
          <td><select class="review-station" data-bottle="${b.id}" data-station="${b.stationId}"${barAttr}>${stationOpts}</select></td>
          <td><select class="review-size" data-bottle="${b.id}" data-station="${b.stationId}"${barAttr}>${sizeOptions(b.size || "750ml")}</select></td>
          <td class="size-verified-cell"><input type="checkbox" class="review-verified" data-bottle="${b.id}" data-station="${b.stationId}"${barAttr} ${b.size_verified ? "checked" : ""} title="Size confirmed" /></td>
          <td><button type="button" class="row-delete" data-del-review="${b.id}" data-station="${b.stationId}"${barAttr} title="Remove row">×</button></td>
        </tr>
      `;
    })
    .join("");
  updateWalkReviewProgress();
}

function stationOptionsForBar(barId, selectedId) {
  const bar = walkReviewBars.find((b) => b.id === barId) || barState;
  return sortedStationsFor(bar)
    .map((s) => `<option value="${s.id}"${s.id === selectedId ? " selected" : ""}>${escapeHtml(s.name)}</option>`)
    .join("");
}

async function setWalkReviewStatus(status) {
  if (!barState.setup) barState.setup = {};
  barState.setup.walk_review_status = status;
  await persistBar({ walk_review_status: status });
  updateWalkContinueButton();
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const vals = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (vals[i] ?? "").trim();
    });
    return row;
  });
}

function csvEscape(val) {
  const s = String(val ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadWalkCsv() {
  const headers = ["bottle_id", "station", "what_we_heard", "product_name", "size", "size_verified", "category"];
  const rows = allBottles().map((b) =>
    [
      b.id,
      b.stationName,
      b.raw_heard || b.name,
      b.name,
      b.size || "750ml",
      b.size_verified ? "yes" : "no",
      b.category || "spirits",
    ]
      .map(csvEscape)
      .join(",")
  );
  const csv = `\uFEFF${headers.join(",")}\n${rows.join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${(barState.name || "bar").replace(/[^\w\-]+/g, "_")}_walk_correction.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus("Correction sheet downloaded — edit and import when ready.");
}

async function importWalkCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length) throw new Error("That file looks empty — keep the header row from our download.");
  let updated = 0;
  for (const row of rows) {
    const bottleId = row.bottle_id;
    if (!bottleId) continue;
    const existing = allBottles().find((b) => b.id === bottleId);
    if (!existing) continue;
    const bottle = findBottleRecord(bottleId, existing.stationId);
    if (!bottle) continue;
    if (row.product_name) bottle.name = row.product_name;
    if (row.what_we_heard) bottle.raw_heard = row.what_we_heard;
    if (row.size && BOTTLE_SIZES.includes(row.size)) bottle.size = row.size;
    if (row.category) bottle.category = row.category;
    const verified = (row.size_verified || "").toLowerCase();
    bottle.size_verified = ["yes", "y", "1", "true"].includes(verified);
    const targetStation = stationIdByName(row.station);
    if (targetStation && targetStation !== existing.stationId) {
      moveBottle(bottleId, existing.stationId, targetStation);
    }
    updated++;
  }
  if (!updated) throw new Error("No matching rows — use our download template and keep bottle_id values.");
  await setWalkReviewStatus("imported");
  renderWalkReview();
  updateWalkSummary();
  setStatus(`Imported ${updated} rows. Check anything we missed, then continue.`);
}

function bindWalkReviewListeners() {
  if (walkReviewListenersBound) return;
  walkReviewListenersBound = true;

  document.querySelectorAll("[data-review-path]").forEach((btn) => {
    btn.addEventListener("click", () => setReviewPath(btn.dataset.reviewPath));
  });

  document.getElementById("btnDownloadWalkCsv")?.addEventListener("click", downloadWalkCsv);
  document.getElementById("btnImportWalkCsv")?.addEventListener("click", () => {
    document.getElementById("walkCsvFile")?.click();
  });
  document.getElementById("walkCsvFile")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importWalkCsv(await file.text());
    } catch (err) {
      setStatus(err.message);
    }
    e.target.value = "";
  });

  document.getElementById("btnMarkSizesReviewed")?.addEventListener("click", async () => {
    const rows = walkReviewBars.length > 1 ? allBottlesForReview() : allBottles();
    for (const b of rows) {
      await withBarContext(b.barId, async () => {
        const bottle = findBottleRecord(b.id, b.stationId);
        if (bottle) bottle.size_verified = true;
        await persistBar();
      });
    }
    await refreshWalkReviewBars();
    await setWalkReviewStatus("complete");
    renderWalkReview();
    setStatus("Sizes marked reviewed — you can continue when ready.");
  });

  document.getElementById("btnWalkReviewSkip")?.addEventListener("click", async () => {
    const ok = window.confirm(
      "Continue with our best guess?\n\nNames and sizes may be wrong — you'll need to fix them in Step 5 Review or your first count. Only do this if you're stuck."
    );
    if (!ok) return;
    await setWalkReviewStatus("skipped");
    setStatus("Continuing with defaults — fix in Review step when you can.");
  });

  document.getElementById("walkReviewTable")?.addEventListener("change", async (e) => {
    const t = e.target;
    const bottleId = t.dataset.bottle;
    const stationId = t.dataset.station;
    const barId = t.dataset.bar || barState?.id;
    if (!bottleId || !stationId) return;

    await withBarContext(barId, async () => {
      if (t.classList.contains("review-station")) {
        moveBottle(bottleId, stationId, t.value);
        await persistBar();
        await refreshWalkReviewBars();
        renderWalkReview();
        return;
      }

      const bottle = findBottleRecord(bottleId, stationId);
      if (!bottle) return;

      if (t.classList.contains("review-name")) bottle.name = t.value.trim() || bottle.name;
      if (t.classList.contains("review-size")) {
        bottle.size = t.value;
        bottle.size_verified = true;
      }
      if (t.classList.contains("review-verified")) bottle.size_verified = t.checked;
      if (bottle.parse_flags?.length) {
        bottle.parse_flags = [];
        const row = t.closest("tr");
        row?.classList.remove("row-flagged");
        row?.querySelector(".parse-flag")?.remove();
      }

      await persistBar();
    });
    await refreshWalkReviewBars();
    if (walkUnverifiedCount() === 0 && barState.setup?.walk_review_status === "pending") {
      await setWalkReviewStatus("complete");
    } else {
      updateWalkReviewProgress();
      updateWalkContinueButton();
    }
    const row = t.closest("tr");
    if (row && t.classList.contains("review-verified")) {
      row.classList.toggle("size-unverified", !t.checked);
    }
  });

  document.getElementById("walkReviewTable")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-del-review]");
    if (!btn) return;
    const barId = btn.dataset.bar || barState?.id;
    await withBarContext(barId, async () => {
      const station = barState.stations.find((s) => s.id === btn.dataset.station);
      if (!station?.bottles) return;
      station.bottles = station.bottles.filter((b) => b.id !== btn.dataset.delReview);
      await persistBar();
    });
    await refreshWalkReviewBars();
    renderWalkReview();
    updateWalkSummary();
    updateWalkContinueButton();
  });
}

function normalizeBar(bar) {
  if (!bar) return { id: "", name: "", stations: [] };
  return {
    id: bar.id || "",
    name: bar.name || bar.bar_name || "",
    stations: bar.stations || [],
    setup: bar.setup,
  };
}

async function persistBar(extra = {}) {
  const payload = {
    bar_id: barState.id,
    name: barState.name,
    stations: sortedStations(),
    ...extra,
  };
  if (barState.setup?.walk_review_status && !extra.walk_review_status) {
    payload.walk_review_status = barState.setup.walk_review_status;
  }
  const res = await OSB.saveBar(payload);
  if (res.bar) barState = normalizeBar(res.bar);
}

function barStatusLabel(bar) {
  if (bar.first_count_complete) return "Live";
  if (bar.map_approved) return "Needs first count";
  if (bar.bottle_count > 0 || bar.station_count > 0) return "In setup";
  if (bar.name) return "Named";
  return "New";
}

async function confirmDeleteBar(bar, barsCount) {
  const label = bar.name?.trim() || "Unnamed bar";
  const onlyBar = barsCount <= 1;
  const msg = onlyBar
    ? `Delete "${label}"? This is your only bar — a fresh starter bar will be created.`
    : `Delete "${label}"? This removes its stations and inventory map. This cannot be undone.`;
  return window.confirm(msg);
}

function renderBarsList(containerId, bars, activeId, { onSelect, onSetup, onDelete } = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!bars.length) {
    el.innerHTML = `<p class="bars-empty">No bars yet — name your first one below.</p>`;
    return;
  }
  el.innerHTML = bars
    .map((b) => {
      const active = b.id === activeId ? " active" : "";
      const status = barStatusLabel(b);
      const meta = `${b.station_count || 0} stations · ${b.bottle_count || 0} bottles`;
      const setupBtn =
        onSetup && !b.first_count_complete
          ? `<button type="button" class="btn btn-ghost btn-sm" data-setup-bar="${b.id}">Resume setup</button>`
          : "";
      const deleteBtn = onDelete
        ? `<button type="button" class="btn btn-ghost btn-sm bar-delete-btn" data-delete-bar="${b.id}" title="Delete bar">Delete</button>`
        : "";
      return `
        <div class="bar-card-row">
          <button type="button" class="bar-card${active}" data-bar-id="${b.id}">
            <span class="bar-card-name">${escapeHtml(b.name || "Unnamed bar")}</span>
            <span class="bar-card-meta">${meta} · ${status}</span>
          </button>
          <div class="bar-card-actions">${setupBtn}${deleteBtn}</div>
        </div>
      `;
    })
    .join("");

  el.querySelectorAll("[data-bar-id]").forEach((btn) => {
    btn.addEventListener("click", () => onSelect?.(btn.dataset.barId));
  });
  el.querySelectorAll("[data-setup-bar]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onSetup?.(btn.dataset.setupBar);
    });
  });
  el.querySelectorAll("[data-delete-bar]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const bar = bars.find((x) => x.id === btn.dataset.deleteBar);
      if (!bar) return;
      if (!(await confirmDeleteBar(bar, bars.length))) return;
      await onDelete?.(btn.dataset.deleteBar);
    });
  });
}

async function saveWalkDraft() {
  const text = document.getElementById("voiceNotes")?.value?.trim();
  if (text) await OSB.uploadVoiceNotes(text);
  await persistBar();
}

const COUNT_LEVEL_WORDS = {
  one: 1,
  two: 2,
  too: 2,
  to: 2,
  three: 3,
  four: 4,
  for: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  full: 1,
  zero: 0,
  none: 0,
  out: 0,
  half: 0.5,
};

function parseCountLevel(fragment) {
  const t = fragment.toLowerCase().replace(/[.,;:]+/g, " ").trim();
  if (!t) return null;
  if (/\b(point\s*five|point\s*5|0\.5|\.5|half)\b/.test(t)) return 0.5;
  const pointTenth = t.match(/\bpoint\s*(\d)\b/);
  if (pointTenth) return parseInt(pointTenth[1], 10) / 10;
  const dotInPhrase = t.match(/\b\.(\d)\b/);
  if (dotInPhrase) return parseInt(dotInPhrase[1], 10) / 10;
  const fracInPhrase = t.match(/\b(\d+)\/(\d+)\b/);
  if (fracInPhrase) {
    const den = parseInt(fracInPhrase[2], 10);
    if (den > 0) return Math.min(99, parseInt(fracInPhrase[1], 10) / den);
  }
  if (/\bzero\b|\bnone\b|\bout\b/.test(t)) return 0;
  for (const [word, val] of Object.entries(COUNT_LEVEL_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(t)) return val;
  }
  const num = t.match(/\b(\d+(?:\.\d+)?)\b/);
  if (num) return Math.min(99, parseFloat(num[1]));
  return null;
}

function countLevelOf(token) {
  const t = (token || "").replace(/[.,;:!?]+$/, "").toLowerCase();
  if (!t) return null;
  if (t === "half" || t === "0.5" || t === ".5") return 0.5;
  const dotTenth = t.match(/^\.(\d{1,2})$/);
  if (dotTenth) {
    const digits = dotTenth[1];
    if (digits.length === 1) return parseInt(digits, 10) / 10;
    return parseInt(digits, 10) / 100;
  }
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const den = parseInt(frac[2], 10);
    if (den > 0) return Math.min(99, parseInt(frac[1], 10) / den);
  }
  if (COUNT_LEVEL_WORDS[t] !== undefined) {
    const v = COUNT_LEVEL_WORDS[t];
    if (v > 2) return null;
    return v;
  }
  const num = t.match(/^(\d+(?:\.\d+)?)$/);
  if (num) {
    const v = parseFloat(num[1]);
    if (v > 2) return null;
    return Math.min(2, v);
  }
  return null;
}

function countMatchQuantity(words, i) {
  const w = words[i];
  const next = (words[i + 1] || "").replace(/[.,]/g, "");
  const num = WALK_WORD_NUMS[w] ?? (/^\d{1,2}$/.test(w) ? parseInt(w, 10) : null);
  if (num && num <= 12 && (next === "bottles" || next === "bottle")) {
    return { qty: parseInt(num, 10), consumed: 2 };
  }
  return null;
}

function countLevelAt(words, i) {
  const w = words[i]?.replace(/[.,;:!?]+$/, "").toLowerCase();
  const w2 = words[i + 1]?.replace(/[.,;:!?]+$/, "").toLowerCase();
  if (w === "point" && w2) {
    const combined = parseCountLevel(`point ${w2}`);
    if (combined !== null) return { level: combined, consumed: 2 };
  }
  const single = countLevelOf(w);
  if (single !== null) return { level: single, consumed: 1 };
  return null;
}

function bottleNameInLine(line, bottleName) {
  const lineL = line.toLowerCase();
  const nameL = (bottleName || "").toLowerCase().trim();
  if (!nameL) return false;
  if (lineL.includes(nameL)) return true;
  const tokens = nameL.split(/\s+/).filter((tok) => tok.length > 2);
  if (!tokens.length) return lineL.includes(nameL.split(" ")[0]);
  const hits = tokens.filter((tok) => lineL.includes(tok)).length;
  return hits >= Math.ceil(tokens.length * 0.55);
}

function normalizeCountName(s) {
  return (s || "").toLowerCase().replace(/[''`´]/g, "'").trim();
}

function scoreCountBottleMatch(spokenName, bottle) {
  const spoken = normalizeCountName(spokenName);
  const name = normalizeCountName(bottle.name);
  if (!spoken || !name) return 0;
  const spokenHasCase = /\bcase\b/.test(spoken);
  const nameHasCase = /\bcase\b/.test(name);
  const spokenHasSpare = /\bspare\b/.test(spoken);
  const nameHasSpare = /\bspare\b/.test(name);
  if (spokenHasCase && !nameHasCase) return 0;
  if (spokenHasSpare && !nameHasSpare) return 0;
  if (!spokenHasCase && nameHasCase) return 0;
  if (!spokenHasSpare && nameHasSpare && !spokenHasCase) return 0;
  if (spoken === name) return 200;
  if (spoken.includes(name) || name.includes(spoken)) return 150 + name.length;
  const spokenTokens = spoken.split(/\s+/).filter((tok) => tok.length > 1);
  const nameTokens = name.split(/\s+/).filter((tok) => tok.length > 2);
  if (spokenTokens.length === 1 && nameTokens.length) {
    const head = spokenTokens[0].replace(/['’]s$/, "");
    if (name.startsWith(head) || nameTokens[0] === head || nameTokens[0].startsWith(head)) {
      return 120 + head.length;
    }
  }
  if (spokenTokens.length >= 2 && nameTokens.length >= 2) {
    const allSpokenInName = spokenTokens.every((tok) => name.includes(tok));
    if (allSpokenInName) return 130 + spokenTokens.length * 12;
    const allNameInSpoken = nameTokens.every((tok) => spoken.includes(tok));
    if (allNameInSpoken) return 125 + nameTokens.length * 10;
  }
  if (!nameTokens.length) return spoken.includes(name.split(" ")[0]) ? 80 : 0;
  const hits = nameTokens.filter((tok) => spoken.includes(tok)).length;
  const spokenHits = spokenTokens.filter((tok) => name.includes(tok)).length;
  const bestHits = Math.max(hits, spokenHits);
  if (bestHits < 1) return 0;
  if (spokenTokens.length <= 2 && bestHits >= 1) return 70 + bestHits * 15;
  if (bestHits < Math.ceil(nameTokens.length * 0.55)) return 0;
  return 60 + bestHits * 10;
}

function findCountBottleMatch(spokenName, stationLabel) {
  return findCountBottleMatchScored(spokenName, stationLabel)?.bottle ?? null;
}

function parseCountText(rawText) {
  const words = walkNormalizeText(rawText)
    .split(/\s+/)
    .map((w) => w.replace(/^[,;:()"']+|[,;:()"']+$/g, ""))
    .filter(Boolean);

  const entries = [];
  let currentStation = null;
  let buf = [];

  function flushEntry(level) {
    const name = countCleanName(buf.join(" "));
    if (name && name.length > 1) {
      entries.push({ name, station: currentStation, level: level ?? null });
    }
    buf = [];
  }

  let pendingQty = 1;

  let i = 0;
  while (i < words.length) {
    const st = walkMatchStation(words, i);
    if (st) {
      if (buf.length) flushEntry(null);
      currentStation = st.label;
      pendingQty = 1;
      i += st.consumed;
      continue;
    }
    const q = countMatchQuantity(words, i);
    if (q) {
      pendingQty = q.qty;
      i += q.consumed;
      continue;
    }
    const w = words[i];
    const isOneInName =
      w === "one" &&
      buf.length >= 1 &&
      words[i + 1] &&
      !walkMatchStation(words, i + 1) &&
      countLevelOf(words[i + 1]?.replace(/[.,;:!?]+$/, "").toLowerCase()) === null;
    if (isOneInName) {
      buf.push(words[i]);
      i += 1;
      continue;
    }
    const lv = countLevelAt(words, i);
    if (lv) {
      let name = countCleanName(buf.join(" "));
      if (name && name.length > 1) {
        let level = lv.level;
        if (/\bcase\b/i.test(name)) {
          const normalized = normalizeCaseCountEntry(name, level);
          name = normalized.name;
          level = normalized.level;
        } else if (/\bspare\b/i.test(name)) {
          const spareM = name.match(/^(.+?)\s+spare$/i);
          if (spareM) name = `Spare ${walkTitleCase(walkCleanName(spareM[1]))}`;
          else name = walkTitleCase(name);
        }
        const isCase = /\bcase\b/i.test(name);
        const copies = isCase ? 1 : Math.max(1, Math.min(pendingQty, 12));
        if (isCase && pendingQty > 1 && level === 1) level = pendingQty;
        for (let c = 0; c < copies; c += 1) {
          entries.push({ name, station: currentStation, level });
        }
      }
      buf = [];
      pendingQty = 1;
      i += lv.consumed;
      continue;
    }
    buf.push(words[i]);
    i += 1;
  }
  if (buf.length) flushEntry(null);
  return entries;
}

const COUNT_MATCH_MIN_SCORE = 85;
/** Minor misses are OK — finish unlocks at this many unresolved gaps or fewer. */
const COUNT_GAP_TOLERANCE = 2;
const WALK_SINGLE_BAR_WARN_BOTTLES = 95;
let countDismissedSurpriseKeys = new Set();
let countShowFullMap = false;

function findSameNameOnOtherStations(bottle) {
  const spoken = walkCleanName(bottle.name || "");
  if (!spoken || spoken.length < 2) return [];
  const hits = [];
  for (const b of allBottles()) {
    if (b.stationId === bottle.stationId) continue;
    if (scoreCountBottleMatch(spoken, b) >= COUNT_MATCH_MIN_SCORE) hits.push(b);
  }
  return hits;
}

function buildMissingFromCountCoaching(bottle) {
  const others = findSameNameOnOtherStations(bottle);
  if (!others.length) return null;
  const otherStations = [...new Set(others.map((b) => b.stationName))];
  const otherList = otherStations.join(otherStations.length > 1 ? ", " : "");
  const here = bottle.stationName || "this station";
  return `${bottle.name} was also found on ${otherList} — did you mean the ${here} version?`;
}

function findCountBottleMatchScored(spokenName, stationLabel) {
  const clean = walkCleanName(spokenName);
  if (!clean || clean.length < 2) return null;
  const stationId = stationLabel ? stationIdByName(stationLabel) : null;
  let best = null;
  let bestScore = 0;
  let bestInStation = null;
  let bestInStationScore = 0;

  for (const b of allBottles()) {
    const score = scoreCountBottleMatch(clean, b);
    if (stationId && b.stationId === stationId && score > bestInStationScore) {
      bestInStationScore = score;
      bestInStation = b;
    }
    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  }

  if (stationId) {
    if (bestInStation && bestInStationScore >= COUNT_MATCH_MIN_SCORE) {
      return { bottle: bestInStation, score: bestInStationScore, inStation: true };
    }
    return null;
  }
  if (best && bestScore >= COUNT_MATCH_MIN_SCORE) {
    return { bottle: best, score: bestScore, inStation: false };
  }
  return null;
}

function countEntryKey(entry) {
  return `${entry.station || ""}|${normalizeCountName(entry.name)}|${entry.level ?? ""}`;
}

function getActiveCountParsed() {
  return (lastCountParsed || []).filter((e) => !countDismissedSurpriseKeys.has(countEntryKey(e)));
}

function countUnresolvedGaps(report) {
  if (!report) return 0;
  return (report.surprises?.length || 0) + (report.notInCount?.length || 0);
}

function canFinishCount(report) {
  if (!countParsed) return false;
  if (!report?.hasIssues) return true;
  return countUnresolvedGaps(report) <= COUNT_GAP_TOLERANCE;
}

function buildCountDiagnosis(report) {
  const mapTotal = allBottles().length;
  const missing = report?.notInCount?.length || 0;
  if (missing < 10 || mapTotal < 12) return null;
  const pct = mapTotal ? Math.round((missing / mapTotal) * 100) : 0;
  if (missing > 25 || pct >= 35) {
    return `Your map has ${mapTotal} bottles but only ${report.matched?.length || 0} matched in the count. That usually means the wrong walk file (multiple bars pasted into one bar) or the wrong count file. Use one walk + one count per bar.`;
  }
  return null;
}

function removeBottleFromMap(bottleId, stationId) {
  const station = barState.stations.find((s) => s.id === stationId);
  if (!station?.bottles) return false;
  const before = station.bottles.length;
  station.bottles = station.bottles.filter((b) => b.id !== bottleId);
  return station.bottles.length < before;
}

function reconcileCountToMap(parsedEntries) {
  const matched = [];
  const notInCount = [];
  const surprises = [];
  const mapUsed = new Map();
  const countedStationIds = new Set();

  for (const entry of parsedEntries) {
    if (entry.station) {
      for (const sid of stationIdsInCountScope(entry.station)) countedStationIds.add(sid);
    }
    if (entry.level === null) {
      surprises.push({
        entry,
        reason: "no_level",
        message: `We heard "${entry.name}" but no level — say the tenths or "full".`,
      });
      continue;
    }
    const scored = findCountBottleMatchScored(entry.name, entry.station);
    if (!scored) {
      surprises.push({
        entry,
        reason: "not_on_map",
        message: `"${entry.name}" at ${entry.level} — not on your approved map. Shelf changed? Reconcile the map first.`,
      });
      continue;
    }
    const hit = scored.bottle;
    const key = `${hit.stationId}:${hit.id}`;
    if (mapUsed.has(key)) {
      surprises.push({
        entry,
        reason: "extra_on_shelf",
        similarTo: hit,
        message: `Another "${entry.name}" at ${entry.level} — map only has one ${hit.name}. Possible new bottle; reconcile your map.`,
      });
      continue;
    }
    mapUsed.set(key, entry.level);
    matched.push({
      entry,
      bottle: hit,
      level: entry.level,
      crossStation: !scored.inStation && entry.station,
    });
  }

  for (const b of allBottles()) {
    const key = `${b.stationId}:${b.id}`;
    if (mapUsed.has(key)) continue;
    if (b.count_matched && b.count_variance === "matched") continue;
    if (countedStationIds.size && !countedStationIds.has(b.stationId)) continue;
    const coachingHint = buildMissingFromCountCoaching(b);
    notInCount.push({
      bottle: b,
      message: `${b.name} — on your map but not in this count.`,
      coachingHint,
    });
  }

  const stationBuckets = buildStationReconcileBuckets({
    matched,
    notInCount,
    surprises,
    countedStationIds,
  });

  return {
    matched,
    notInCount,
    surprises,
    countedStationIds: [...countedStationIds],
    stationBuckets,
    hasIssues: surprises.length > 0 || notInCount.length > 0,
    needsMapReconcile: surprises.some((s) => s.reason !== "no_level"),
    summary: buildCountReconcileSummary(matched, notInCount, surprises, countedStationIds.size),
  };
}

function buildStationReconcileBuckets({ matched, notInCount, surprises, countedStationIds }) {
  const buckets = new Map();

  function ensure(stationName, stationId = null) {
    const key = stationId || stationName || "unknown";
    if (!buckets.has(key)) {
      buckets.set(key, {
        stationName: stationName || "Unknown station",
        stationId,
        matched: [],
        missing: [],
        surprises: [],
        mapTotal: 0,
      });
    }
    return buckets.get(key);
  }

  for (const sid of countedStationIds) {
    const st = sortedStations().find((s) => s.id === sid);
    if (st) {
      const bucket = ensure(st.name, st.id);
      bucket.mapTotal = (st.bottles || []).length;
    }
  }

  for (const m of matched) {
    const label = m.entry.station || m.bottle.stationName;
    const sid = m.entry.station ? stationIdByName(m.entry.station) : m.bottle.stationId;
    ensure(label, sid).matched.push(m);
  }

  for (const s of surprises) {
    const label = s.entry.station || "Unknown station";
    const sid = s.entry.station ? stationIdByName(s.entry.station) : null;
    ensure(label, sid).surprises.push(s);
  }

  for (const m of notInCount) {
    const bucket = ensure(m.bottle.stationName, m.bottle.stationId);
    bucket.missing.push(m);
    if (!bucket.mapTotal) {
      const st = sortedStations().find((s) => s.id === m.bottle.stationId);
      bucket.mapTotal = (st?.bottles || []).length;
    }
  }

  return [...buckets.values()].sort((a, b) => a.stationName.localeCompare(b.stationName));
}

function buildCountReconcileSummary(matched, notInCount, surprises, stationsCounted = 0) {
  const parts = [`${matched.length} matched`];
  if (stationsCounted) parts.push(`${stationsCounted} station${stationsCounted === 1 ? "" : "s"} in this count`);
  if (notInCount.length) parts.push(`${notInCount.length} missing from those stations`);
  if (surprises.length) parts.push(`${surprises.length} to reconcile on the map`);
  return parts.join(" · ");
}

let lastCountReconcile = null;
let lastCountParsed = [];

function resetCoachingClientState() {
  walkParsed = false;
  countParsed = false;
  lastCountReconcile = null;
  lastCountParsed = [];
  countDismissedSurpriseKeys = new Set();
  countShowFullMap = false;
}

function clearCountReconcileReport() {
  lastCountReconcile = null;
  const el = document.getElementById("countReconcileReport");
  if (el) {
    el.classList.add("hidden");
    el.innerHTML = "";
  }
}

function resetCountForReupload() {
  clearCountReconcileReport();
  setCountView(false);
  setCountEntryOpen(true);
  const notes = document.getElementById("countNotes");
  notes?.focus();
  notes?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  updateFirstCountDoneButton();
  setStatus("Edit your count notes below, then upload or paste again.");
}

function updateFirstCountDoneButton() {
  const btn = document.getElementById("btnFirstCountDone");
  const navBtn = document.getElementById("btnTallyFinish");
  const lead = document.getElementById("countTallyLead");
  const navHint = document.getElementById("countNavHint");

  function apply(label, enabled, hint, leadText) {
    if (btn) {
      btn.disabled = !enabled;
      btn.textContent = label;
    }
    if (navBtn) {
      navBtn.disabled = !enabled;
      navBtn.textContent = enabled ? "Open admin →" : label;
    }
    if (navHint && hint) navHint.textContent = hint;
    if (lead && leadText) lead.textContent = leadText;
  }

  const hasText = Boolean(getCountNotesText());

  if (!countParsed && !hasText) {
    apply(
      "Process your count first",
      false,
      "Paste count → Process → admin opens automatically.",
      "Paste your count above, then click Process."
    );
    return;
  }

  if (!countParsed && hasText) {
    apply(
      "Process & open admin",
      true,
      "Count pasted — click Process to finish.",
      "Click Process to match your count and open admin."
    );
    return;
  }

  const matched = lastCountReconcile?.matched?.length ?? 0;

  if (lastCountReconcile?.hasIssues) {
    const gaps = countUnresolvedGaps(lastCountReconcile);
    if (!canFinishCount(lastCountReconcile)) {
      apply(
        `Fix ${gaps} gap${gaps === 1 ? "" : "s"} first`,
        false,
        `Fix ${gaps} gap${gaps === 1 ? "" : "s"} in the table, then Process again.`,
        `${matched} matched — fix gaps below, then click Open admin.`
      );
      return;
    }
    apply(
      gaps > 0 ? `Open admin (${gaps} minor gap${gaps === 1 ? "" : "s"})` : "Open admin →",
      true,
      gaps > 0 ? `${gaps} minor gap${gaps === 1 ? "" : "s"} noted — open admin when ready.` : "Golden — click Open admin or Process again.",
      gaps > 0
        ? `${matched} matched · ${gaps} minor gap${gaps === 1 ? "" : "s"} — ready to lock.`
        : `Golden — ${matched} matched. Click Open admin to lock your baseline.`
    );
    return;
  }

  apply(
    "Open admin →",
    true,
    "Golden — admin opens on Process automatically.",
    `Golden — ${matched} matched. Click Open admin to lock your baseline.`
  );
}

async function runInventoryPipeline() {
  if (!countParsed) {
    showCountBanner("Paste your count in the box first, then click Process.", "error");
    setStatus("Paste your count, then click Process.");
    document.getElementById("btnProcessCount")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (lastCountReconcile?.hasIssues && !canFinishCount(lastCountReconcile)) {
    const gaps = countUnresolvedGaps(lastCountReconcile);
    const msg = `${gaps} gap${gaps === 1 ? "" : "s"} blocking admin — fix the table below (up to ${COUNT_GAP_TOLERANCE} minor misses OK). Wrong count file? Use the Twin Well test kit for a golden run.`;
    showCountBanner(msg, "error");
    setStatus(msg);
    document.getElementById("countReviewTable")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const processBtn = document.getElementById("btnProcessCount");
  const tallyBtn = document.getElementById("btnTallyFinish");
  const finishBtn = document.getElementById("btnFirstCountDone");
  if (processBtn) {
    processBtn.disabled = true;
    processBtn.textContent = "Processing…";
  }
  if (tallyBtn) tallyBtn.disabled = true;
  if (finishBtn) finishBtn.disabled = true;

  showProcessOverlay("Running inventory math…", "Locking your cycle — spreadsheets and analytics loading next.");
  showCountBanner("Processing — opening admin panel…", "success");

  try {
    await persistBar();
    const result = await OSB.processInventoryCycle();
    const skus = result.analytics?.bottle_count ?? result.in_house_count ?? 0;
    const cycleNum = result.cycle_number ?? 1;
    const movers = result.week_over_week?.length || result.velocity?.length || 0;
    const msg =
      (result.cycles_total || 0) >= 2
        ? `Cycle ${cycleNum} processed — ${skus} in stock · ${movers} week-over-week changes. Opening admin…`
        : `Cycle ${cycleNum} locked — ${skus} SKUs · spreadsheets, analytics, and in-house inventory ready. Opening admin…`;
    showProcessOverlay("Cycle locked", msg);
    setStatus(msg);
    window.setTimeout(() => {
      window.location.replace("/home");
    }, 500);
  } catch (e) {
    hideProcessOverlay();
    const msg = e?.message || "Could not process cycle — try again.";
    showCountBanner(msg, "error");
    setStatus(msg);
    window.alert(`Inventory cycle could not close:\n\n${msg}`);
    if (processBtn) {
      processBtn.disabled = false;
      processBtn.textContent = "Process & open admin";
    }
    updateFirstCountDoneButton();
    updateCountStickyBar();
    throw e;
  }
}

async function finishFirstCount() {
  await handleProcessCountClick();
}

const COUNT_COMPARISON_HEADERS = [
  "station",
  "status",
  "map_product",
  "map_size",
  "map_par_level",
  "count_heard",
  "count_level",
  "action_required",
];

function buildCountComparisonRows(report) {
  if (!report) return [];
  const rows = [];
  const statusOrder = {
    not_on_map: 0,
    extra_on_shelf: 1,
    no_level: 2,
    missing_from_count: 3,
    matched: 4,
  };

  for (const s of report.surprises || []) {
    const status = s.reason === "extra_on_shelf" ? "extra_on_shelf" : s.reason || "not_on_map";
    rows.push({
      station: s.entry.station || s.similarTo?.stationName || "",
      status,
      map_product: s.similarTo?.name || "",
      map_size: s.similarTo?.size || "",
      map_par_level: s.similarTo?.par_level ?? "",
      count_heard: s.entry.name || "",
      count_level: s.entry.level ?? "",
      action_required:
        status === "extra_on_shelf"
          ? "Possible extra bottle on shelf — add to map in Review or fix count."
          : status === "no_level"
            ? "Say the level (tenths or full) and re-upload."
            : "Not on your walk map — add in Review or fix the name.",
    });
  }

  for (const m of report.notInCount || []) {
    const b = m.bottle;
    const action = m.coachingHint
      ? `${m.coachingHint} Re-count this station with the station name in your dictation.`
      : "On map from walk — not in your count. Re-count or remove from map.";
    rows.push({
      station: b.stationName || "",
      status: "missing_from_count",
      map_product: b.name || "",
      map_size: b.size || "",
      map_par_level: b.par_level ?? 1,
      count_heard: "",
      count_level: "",
      action_required: action,
    });
  }

  for (const m of report.matched || []) {
    const action = m.crossStation
      ? `Matched across stations — verify ${m.bottle.stationName}.`
      : "Levels line up — verify in table if needed.";
    rows.push({
      station: m.entry.station || m.bottle.stationName || "",
      status: "matched",
      map_product: m.bottle.name || "",
      map_size: m.bottle.size || "",
      map_par_level: m.bottle.par_level ?? 1,
      count_heard: m.entry.name || "",
      count_level: m.level ?? "",
      action_required: action,
    });
  }

  rows.sort((a, b) => {
    const st = (a.station || "").localeCompare(b.station || "");
    if (st !== 0) return st;
    return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
  });
  return rows;
}

function buildCountComparisonPlainText(report) {
  const rows = buildCountComparisonRows(report);
  const barName = barState.name?.trim() || "Your Bar";
  const lines = [
    `${barName} — Map vs Count Comparison`,
    report?.summary || "",
    "",
    "Walk map (1st input) vs your count (2nd input) — line by line",
    "",
  ];
  for (const r of rows) {
    lines.push(
      `▸ ${r.station} [${r.status}]`,
      `  Map:    ${r.map_product || "—"} ${r.map_size || ""} (par ${r.map_par_level ?? "—"})`,
      `  Count:  ${r.count_heard || "—"} @ ${r.count_level !== "" ? r.count_level : "—"}`,
      `  Action: ${r.action_required}`,
      ""
    );
  }
  return lines.join("\n").trim();
}

function countComparisonActionsHtml() {
  return `
    <div class="count-comparison-downloads">
      <p class="box-label count-comparison-label">Map vs count — download line-by-line comparison</p>
      <p class="count-comparison-hint">Walk map (first input) compared to your count (second input). Take this to the floor to reconcile.</p>
      <div class="map-download-grid map-download-grid-audit">
        <button class="btn btn-ghost btn-sm count-export-btn" type="button" data-format="csv">Comparison (.csv)</button>
        <button class="btn btn-ghost btn-sm count-export-btn" type="button" data-format="xlsx">Comparison (.xlsx)</button>
        <button class="btn btn-ghost btn-sm count-export-btn" type="button" data-format="xml">Comparison (.xml)</button>
        <button class="btn btn-ghost btn-sm" type="button" id="btnCountComparisonPrint">Print report</button>
        <button class="btn btn-ghost btn-sm" type="button" id="btnCountComparisonCopy">Copy report</button>
      </div>
    </div>`;
}

function buildCountComparisonPrintHtml(report) {
  const rows = buildCountComparisonRows(report);
  const barName = barState.name?.trim() || "Your Bar";
  const bodyRows = rows
    .map(
      (r) => `
    <tr class="status-${escapeHtml(r.status)}">
      <td>${escapeHtml(r.station)}</td>
      <td>${escapeHtml(r.status)}</td>
      <td>${escapeHtml(r.map_product)}</td>
      <td>${escapeHtml(r.map_size)}</td>
      <td>${escapeHtml(String(r.map_par_level ?? ""))}</td>
      <td>${escapeHtml(r.count_heard)}</td>
      <td>${escapeHtml(String(r.count_level ?? ""))}</td>
      <td>${escapeHtml(r.action_required)}</td>
    </tr>`
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(barName)} — Count Comparison</title>
<style>
  body { font-family: Georgia, serif; margin: 20px; color: #111; font-size: 11px; }
  h1 { font-size: 1.2rem; }
  .meta { color: #444; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 5px 6px; text-align: left; vertical-align: top; }
  th { background: #eee; font-size: 10px; text-transform: uppercase; }
  tr.status-matched td { background: #f8fff8; }
  tr.status-missing_from_count td { background: #fff8f0; }
  tr.status-not_on_map td, tr.status-extra_on_shelf td { background: #fff0f0; }
</style></head><body>
  <h1>${escapeHtml(barName)} — Map vs Count</h1>
  <p class="meta">${escapeHtml(report?.summary || "")}<br/>Walk map (setup) vs live count — reconcile gaps before locking baseline.</p>
  <table>
    <thead><tr>
      <th>Station</th><th>Status</th><th>Map product</th><th>Size</th><th>Par</th>
      <th>You said</th><th>Your level</th><th>Action</th>
    </tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body></html>`;
}

async function downloadCountComparison(format, btn) {
  if (!lastCountReconcile) {
    setStatus("Upload and parse a count first.");
    return false;
  }
  const rows = buildCountComparisonRows(lastCountReconcile);
  if (!rows.length) {
    setStatus("Nothing to export — check your count notes.");
    return false;
  }
  try {
    const r = await fetch("/api/export/count-comparison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format,
        bar_name: barState.name?.trim() || "bar",
        summary: lastCountReconcile.summary || "",
        rows,
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || `Download failed (${r.status})`);
    }
    const blob = await r.blob();
    const disp = r.headers.get("Content-Disposition") || "";
    const match = disp.match(/filename="?([^";]+)"?/i);
    const ext = format.includes("xlsx") ? "xlsx" : format === "xml" ? "xml" : "csv";
    const filename = match?.[1] || `count-comparison.${ext}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (btn) showMapToolkitFeedback(`✓ Downloaded ${filename}`, btn, "✓ Downloaded");
    else setStatus(`Downloaded ${filename}`);
    return true;
  } catch (e) {
    setStatus(e.message || "Download failed.");
    return false;
  }
}

function renderCountReconcileReport(report) {
  lastCountReconcile = report;
  const el = document.getElementById("countReconcileReport");
  if (!el) {
    updateFirstCountDoneButton();
    return;
  }

  if (!report?.matched?.length && !report?.surprises?.length && !report?.notInCount?.length) {
    el.classList.add("hidden");
    el.innerHTML = "";
    updateFirstCountDoneButton();
    return;
  }

  if (!report.hasIssues && report.matched.length) {
    el.classList.remove("hidden");
    el.innerHTML = `
      <div class="count-reconcile-ok">
        <strong>Golden — count matches your map.</strong>
        <span>${escapeHtml(report.summary)} — review levels below, then lock your baseline.</span>
      </div>
      <div class="coaching-reconcile-trio coaching-reconcile-trio--ok">
        <div class="coaching-reconcile-col">
          <p class="coaching-reconcile-label">What we have</p>
          <p>Your approved walk map — names, stations, sizes.</p>
        </div>
        <div class="coaching-reconcile-col">
          <p class="coaching-reconcile-label">What you gave us</p>
          <p>${report.matched.length} bottles counted with levels that line up.</p>
        </div>
        <div class="coaching-reconcile-col">
          <p class="coaching-reconcile-label">What we need</p>
          <p>Quick scan of levels in the table, then finish.</p>
        </div>
      </div>
      ${countComparisonActionsHtml()}`;
    updateFirstCountDoneButton();
    return;
  }

  const actionCount = report.surprises.length + report.notInCount.length;
  const mapTotal = allBottles().length;
  const stationsCounted = report.countedStationIds?.length || 0;
  const diagnosis = buildCountDiagnosis(report);

  let html = `
    <div class="count-reconcile-alert">
      <p class="count-reconcile-head"><strong>Fix gaps below — then finish</strong></p>
      ${diagnosis ? `<p class="count-diagnosis-banner">${escapeHtml(diagnosis)}</p>` : ""}
      <div class="coaching-reconcile-trio">
        <div class="coaching-reconcile-col">
          <p class="coaching-reconcile-label">What we have</p>
          <p>Approved map: <strong>${mapTotal} bottles</strong> across your stations. This is Pass 1 — your contract.</p>
        </div>
        <div class="coaching-reconcile-col">
          <p class="coaching-reconcile-label">What you gave us</p>
          <p>Your count: <strong>${report.matched.length} matched</strong>${stationsCounted ? ` across ${stationsCounted} station${stationsCounted === 1 ? "" : "s"}` : ""}. ${escapeHtml(report.summary)}</p>
        </div>
        <div class="coaching-reconcile-col coaching-reconcile-col--need">
          <p class="coaching-reconcile-label">What we need</p>
          <p><strong>${actionCount} gap${actionCount === 1 ? "" : "s"}</strong> — use the <strong>Fix</strong> column in the table below. Up to ${COUNT_GAP_TOLERANCE} minor misses can stay and you can still finish.</p>
        </div>
      </div>
      <div class="count-reconcile-actions">
        <button type="button" class="btn btn-ghost btn-sm" id="btnRecountInline">Edit &amp; re-upload count</button>
        <button type="button" class="btn btn-ghost btn-sm" id="btnGoReconcileMap">Open full map editor →</button>
      </div>
      ${countComparisonActionsHtml()}
    </div>`;

  if (report.stationBuckets?.length) {
    html += `<div class="count-reconcile-stations">`;
    for (const bucket of report.stationBuckets) {
      const done = bucket.matched.length;
      const total = bucket.mapTotal || done + bucket.missing.length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      const needsWork = bucket.surprises.length + bucket.missing.length;
      html += `
      <div class="count-reconcile-station${needsWork ? " count-reconcile-station-needs" : ""}">
        <div class="count-reconcile-station-head">
          <span class="count-reconcile-station-name">${escapeHtml(bucket.stationName)}</span>
          <span class="count-reconcile-station-score">${done}/${total} matched (${pct}%)</span>
        </div>`;

      if (bucket.surprises.length) {
        html += `<p class="count-reconcile-station-label">Add or fix on your map</p><ul class="count-reconcile-list">`;
        for (const s of bucket.surprises) {
          html += `<li class="count-reconcile-surprise">
            <span>${escapeHtml(s.message)}</span>
            <span class="count-reconcile-meta">Heard: "${escapeHtml(s.entry.name)}" · level ${s.entry.level ?? "?"}</span>
          </li>`;
        }
        html += `</ul>`;
      }

      if (bucket.missing.length) {
        html += `<p class="count-reconcile-station-label">On your map — not in this count</p><ul class="count-reconcile-list">`;
        for (const m of bucket.missing) {
          html += `<li class="count-reconcile-missing">${escapeHtml(m.message)}`;
          if (m.coachingHint) {
            html += `<span class="count-reconcile-coaching">${escapeHtml(m.coachingHint)}</span>`;
          }
          html += `</li>`;
        }
        html += `</ul>`;
      }

      if (bucket.matched.length && !bucket.surprises.length && !bucket.missing.length) {
        html += `<p class="count-reconcile-station-ok">✓ This station lines up — levels applied below.</p>`;
      }

      html += `</div>`;
    }
    html += `</div>`;
  }

  html += `<p class="count-reconcile-foot">
    <strong>Your move:</strong> Fix each row in the table — set a level, remove a bottle that's gone, or add one you missed.
    Up to ${COUNT_GAP_TOLERANCE} small gaps can remain when you finish.
  </p>`;
  el.classList.remove("hidden");
  el.innerHTML = html;
  el.querySelector("#btnRecountInline")?.addEventListener("click", () => resetCountForReupload());
  updateFirstCountDoneButton();
}

function applyCountReconcileToBottles(reconcile) {
  const matchedKeys = new Set();
  let matched = 0;
  const bottles = allBottles();

  for (const b of bottles) {
    const bottle = findBottleRecord(b.id, b.stationId);
    if (bottle && !bottle.count_manual_resolved) {
      bottle.count_matched = false;
      bottle.count_variance = null;
    }
  }

  for (const { bottle: hit, level } of reconcile.matched) {
    const bottle = findBottleRecord(hit.id, hit.stationId);
    if (!bottle) continue;
    const key = `${hit.stationId}:${hit.id}`;
    bottle.current_level = level;
    bottle.count_matched = true;
    bottle.count_variance = "matched";
    bottle.count_manual_resolved = false;
    if (!matchedKeys.has(key)) {
      matchedKeys.add(key);
      matched += 1;
    }
  }

  for (const m of reconcile.notInCount) {
    const bottle = findBottleRecord(m.bottle.id, m.bottle.stationId);
    if (bottle) bottle.count_variance = "missing";
  }

  return { matched, matchedKeys };
}

async function refreshCountReconcileAfterFix() {
  const parsed = getActiveCountParsed();
  const reconcile = reconcileCountToMap(parsed);
  reconcile.comparisonRows = buildCountComparisonRows(reconcile);
  applyCountReconcileToBottles(reconcile);
  renderCountReconcileReport(reconcile);
  renderCountReview();
  updateCountSummary();
  updateFirstCountDoneButton();
  await persistBar();
}

function addBottleFromCountSurprise(surprise) {
  const entry = surprise.entry;
  const sid = entry.station ? stationIdByName(entry.station) : null;
  const station = sid ? barState.stations.find((s) => s.id === sid) : sortedStations()[0];
  if (!station) return null;
  if (!station.bottles) station.bottles = [];
  const bottle = {
    id: uid(),
    name: walkTitleCase(countCleanName(entry.name)),
    raw_heard: entry.name,
    category: guessCategory(entry.name),
    size: /beer|corona|modelo|heineken|bud|claw/i.test(entry.name) ? "12oz" : "750ml",
    size_verified: true,
    par_level: 1.0,
    current_level: entry.level ?? 1.0,
    count_matched: true,
    count_variance: "matched",
    count_manual_resolved: true,
  };
  station.bottles.push(bottle);
  countDismissedSurpriseKeys.add(countEntryKey(entry));
  return bottle;
}

function parseCountNotes(text) {
  const matchedKeys = new Set();
  let matched = 0;

  countDismissedSurpriseKeys = new Set();
  countShowFullMap = false;

  for (const b of allBottles()) {
    const bottle = findBottleRecord(b.id, b.stationId);
    if (bottle) {
      bottle.count_matched = false;
      bottle.count_variance = null;
      bottle.count_manual_resolved = false;
    }
  }

  const parsed = parseCountText(text);
  lastCountParsed = parsed;
  const reconcile = reconcileCountToMap(getActiveCountParsed());
  reconcile.comparisonRows = buildCountComparisonRows(reconcile);
  renderCountReconcileReport(reconcile);

  const applied = applyCountReconcileToBottles(reconcile);
  matched = applied.matched;
  for (const k of applied.matchedKeys) matchedKeys.add(k);

  for (const line of text.split(/\n+/).map((l) => l.trim()).filter(Boolean)) {
    const level = parseCountLevel(line);
    if (level === null) continue;
    for (const b of allBottles()) {
      if (!bottleNameInLine(line, b.name)) continue;
      const bottle = findBottleRecord(b.id, b.stationId);
      if (!bottle) continue;
      const key = `${b.stationId}:${b.id}`;
      if (matchedKeys.has(key)) continue;
      bottle.current_level = level;
      bottle.count_matched = true;
      bottle.count_variance = "matched";
      matchedKeys.add(key);
      matched += 1;
    }
  }

  return { matched, reconcile, parsed };
}

function setCountView(parsed) {
  countParsed = parsed;
  // Keep count entry + Process button visible — hiding caused "dead button" reports.
  document.getElementById("countParsed")?.classList.toggle("hidden", !parsed);
  if (parsed) {
    updateCountSummary();
    renderCountReview();
  }
  updateFirstCountDoneButton();
  updateCountStickyBar();
}

function updateCountSummary() {
  const el = document.getElementById("countSummaryText");
  if (!el) return;
  const bottles = allBottles();
  const total = bottles.length;
  const r = lastCountReconcile;

  if (r && !r.hasIssues && (r.matched?.length || 0) > 0) {
    el.textContent = `Golden — ${r.matched.length} matched on your map. Levels are locked; finish when ready.`;
    return;
  }

  const matched = r?.matched?.length ?? bottles.filter((b) => b.count_matched).length;
  let text = `${matched} of ${total} bottles matched in your count`;
  if (r?.hasIssues) {
    text += ` — ${r.surprises.length} surprise(s), ${r.notInCount.length} missing. Reconcile before finishing.`;
  } else if (!countParsed) {
    text += ". Paste notes, then click Process.";
  } else {
    text += ". Review levels below.";
  }
  el.textContent = text;
}

function countGapFixButtonsForMissing(b) {
  const level = b.current_level ?? 1;
  return `
    <div class="count-gap-fix-actions">
      <input type="number" class="count-level-input count-gap-level" step="0.1" min="0" max="99" value="${level}" data-bottle="${b.id}" data-station="${b.stationId}" aria-label="Level for ${escapeHtml(b.name)}" />
      <button type="button" class="btn btn-secondary btn-sm btn-count-fix" data-count-fix="mark-counted" data-bottle="${b.id}" data-station="${b.stationId}">Counted</button>
      <button type="button" class="btn btn-ghost btn-sm btn-count-fix" data-count-fix="remove-map" data-bottle="${b.id}" data-station="${b.stationId}">Not on shelf</button>
    </div>`;
}

function countGapFixButtonsForSurprise(s, idx) {
  if (s.reason === "no_level") {
    return `<span class="count-gap-hint">Re-upload with a level (e.g. "one" or "point five").</span>`;
  }
  if (s.reason === "not_on_map") {
    return `
      <div class="count-gap-fix-actions">
        <button type="button" class="btn btn-secondary btn-sm btn-count-fix" data-count-fix="add-surprise" data-surprise-idx="${idx}">Add to map</button>
        <button type="button" class="btn btn-ghost btn-sm btn-count-fix" data-count-fix="dismiss-surprise" data-surprise-idx="${idx}">Misheard — ignore</button>
      </div>`;
  }
  if (s.reason === "extra_on_shelf") {
    return `
      <div class="count-gap-fix-actions">
        <button type="button" class="btn btn-secondary btn-sm btn-count-fix" data-count-fix="add-surprise" data-surprise-idx="${idx}">Add duplicate</button>
        <button type="button" class="btn btn-ghost btn-sm btn-count-fix" data-count-fix="dismiss-surprise" data-surprise-idx="${idx}">Ignore count</button>
      </div>`;
  }
  return "";
}

function renderCountReview() {
  const body = document.getElementById("countReviewBody");
  const toolbar = document.getElementById("countReviewToolbar");
  if (!body) return;
  const bottles = allBottles();
  const reconcile = lastCountReconcile;
  const hasIssues = reconcile?.hasIssues;
  const showAll = !hasIssues || countShowFullMap;

  if (toolbar) {
    toolbar.classList.toggle("hidden", !hasIssues);
    const toggleBtn = toolbar.querySelector("#btnToggleCountMap");
    if (toggleBtn) {
      toggleBtn.textContent = showAll ? "Show gaps only" : "Show full map";
    }
  }

  if (!bottles.length) {
    body.innerHTML = `<tr><td colspan="6" class="bottle-empty">No bottles on your map — go back to Review.</td></tr>`;
    return;
  }

  if (hasIssues && !showAll) {
    const rows = [];
    for (let i = 0; i < (reconcile.surprises || []).length; i++) {
      const s = reconcile.surprises[i];
      const status =
        s.reason === "not_on_map"
          ? '<span class="report-flag">heard, not on map</span>'
          : s.reason === "extra_on_shelf"
            ? '<span class="report-warn">extra count</span>'
            : '<span class="report-warn">no level</span>';
      rows.push(`
        <tr class="count-gap-row" data-gap="surprise" data-surprise-idx="${i}">
          <td>${escapeHtml(s.entry.name)}</td>
          <td>${escapeHtml(s.entry.station || "—")}</td>
          <td>—</td>
          <td>${s.entry.level ?? "—"}</td>
          <td>${status}</td>
          <td>${countGapFixButtonsForSurprise(s, i)}</td>
        </tr>`);
    }
    for (const m of reconcile.notInCount || []) {
      const b = m.bottle;
      rows.push(`
        <tr class="count-gap-row" data-gap="missing" data-bottle="${b.id}" data-station="${b.stationId}">
          <td>${escapeHtml(b.name)}</td>
          <td>${escapeHtml(b.stationName)}</td>
          <td>${b.par_level ?? 1}</td>
          <td>—</td>
          <td><span class="report-flag">not in count</span></td>
          <td>${countGapFixButtonsForMissing(b)}</td>
        </tr>`);
    }
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="6" class="bottle-empty">No gaps — you're good to finish.</td></tr>`;
      return;
    }
    body.innerHTML = rows.join("");
    return;
  }

  body.innerHTML = bottles
    .map((b) => {
      const level = b.current_level ?? 1;
      let status;
      if (b.count_variance === "missing") {
        status = '<span class="report-flag">not in count</span>';
      } else if (b.count_matched) {
        status = '<span class="report-ok">from notes</span>';
      } else {
        status = '<span class="report-warn">set level</span>';
      }
      const fixCell = hasIssues && b.count_variance === "missing" ? countGapFixButtonsForMissing(b) : "";
      return `
        <tr data-bottle="${b.id}" data-station="${b.stationId}">
          <td>${escapeHtml(b.name)}</td>
          <td>${escapeHtml(b.stationName)}</td>
          <td>${b.par_level ?? 1}</td>
          <td><input type="number" class="count-level-input" step="0.1" min="0" max="99" value="${level}" data-bottle="${b.id}" data-station="${b.stationId}" /></td>
          <td>${status}</td>
          <td>${fixCell}</td>
        </tr>`;
    })
    .join("");
}

async function processCountNotes(text, { closeCycle = true } = {}) {
  hideCountBanner();
  if (!text?.trim()) {
    showCountBanner("Paste your count in the box first, then click Process.", "error");
    setStatus(`Paste your count below, then click Process.`);
    return { ok: false, reason: "empty" };
  }
  const { matched, reconcile } = parseCountNotes(text);
  await OSB.uploadCountNotes(text);
  await persistBar();
  lastParsedCountText = text.trim();
  setCountView(true);

  if (reconcile?.hasIssues && !canFinishCount(reconcile)) {
    const gaps = countUnresolvedGaps(reconcile);
    const msg = `${gaps} gap${gaps === 1 ? "" : "s"} — ${reconcile.surprises.length} surprise(s), ${reconcile.notInCount.length} missing. Fix the table below, then Process again.`;
    hideProcessOverlay();
    showCountBanner(msg, "error");
    setStatus(`Matched ${matched} — ${reconcile.surprises.length} surprise(s), ${reconcile.notInCount.length} missing. Fix gaps, then Process again.`);
    document.getElementById("countReviewTable")?.scrollIntoView({ behavior: "smooth", block: "center" });
    updateCountStickyBar();
    window.alert(
      `Count has ${gaps} gap${gaps === 1 ? "" : "s"} — admin cannot open yet.\n\n` +
        `Matched ${matched} of ${allBottles().length} bottles.\n` +
        `Fix gaps in the table below, or paste the correct count file from the test kit.\n\n` +
        `(Wrong walk + count combo is the #1 cause.)`
    );
    return { ok: false, reason: "gaps", gaps };
  }

  if (!closeCycle) {
    if (matched) {
      showCountBanner(`Matched ${matched} bottles — click Open admin when ready.`, "info");
      setStatus(`Matched ${matched} bottles — click Process when ready to lock the cycle.`);
    }
    return { ok: true, preview: true };
  }

  if (matched) {
    showCountBanner(`Golden — ${matched} matched. Running inventory math…`, "success");
    setStatus(`Golden — ${matched} matched. Running inventory math…`);
  }
  await runInventoryPipeline();
  return { ok: true };
}

async function saveCountDraft() {
  const text = document.getElementById("countNotes")?.value?.trim();
  if (text) await OSB.uploadCountNotes(text);
  await persistBar();
}

function setCountEntryOpen(open) {
  const panel = document.getElementById("countEntryPanel");
  const btn = document.getElementById("btnEnterCount");
  if (panel) panel.classList.toggle("hidden", !open);
  if (btn) btn.textContent = open ? "Hide count entry" : "Enter your count";
}

async function initCountStep(data) {
  const countNotes = document.getElementById("countNotes");
  const notesText = data.state?.count_notes_text || "";
  if (countNotes) countNotes.value = notesText;
  setCountEntryOpen(true);
  if (notesText.trim()) {
    const result = parseCountNotes(notesText);
    if (result?.reconcile) renderCountReconcileReport(result.reconcile);
    setCountView(true);
  } else {
    setCountView(false);
  }
  updateFirstCountDoneButton();
}

async function switchWalkBar(barId) {
  await saveWalkDraft();
  await OSB.selectSetupBar(barId);
  walkParsed = false;
  setStatus("");
  await initSetup();
}

async function initWalkStep(data) {
  allBars = data.bars || [];

  const voiceNotes = document.getElementById("voiceNotes");
  if (voiceNotes) voiceNotes.value = data.state?.voice_notes_text || "";

  fillManualStationSelect();
  await refreshWalkReviewBars();
  const hasBottles =
    walkReviewBars.length > 1
      ? allBottlesForReview().length > 0
      : bottleCount() > 0;
  setWalkView(hasBottles);
  if (hasBottles) {
    renderWalkReview();
    updateWalkSummary();
  }
  updateWalkContinueButton();
  bindWalkReviewListeners();
}

async function loadAllBarsForRename() {
  const listed = await OSB.listBars();
  const summaries = listed.bars || [];
  const bars = [];
  for (const summary of summaries) {
    bars.push(normalizeBar(await OSB.getBar(false, summary.id)));
  }
  return bars;
}

async function processWalkNotes(text) {
  if (!text?.trim()) {
    setStatus(`Paste your walk notes below, or choose a ${WALK_NOTES_ACCEPT_LABEL} file.`);
    return;
  }

  const { bars: barGroups } = parseWalkText(text);
  walkParsedBarCount = Math.max(1, barGroups.length);
  let totalAdded = 0;
  let listed = await OSB.listBars();
  let registryBars = listed.bars || [];
  const resumeId = registryBars[0]?.id;

  while (registryBars.length < barGroups.length) {
    const group = barGroups[registryBars.length];
    await OSB.createBar(group.label, false);
    listed = await OSB.listBars();
    registryBars = listed.bars || [];
  }

  for (let i = 0; i < barGroups.length; i++) {
    const group = barGroups[i];
    const barId = registryBars[i]?.id;
    if (!barId) continue;

    await OSB.selectSetupBar(barId);
    barState = normalizeBar(await OSB.getBar(false, barId));
    barState.name = group.label;
    barState.stations = [];

    totalAdded += applyWalkEntriesToBar(group.entries);

    if (!barState.setup) barState.setup = {};
    barState.setup.walk_review_status = "pending";
    await persistBar({ walk_review_status: "pending" });
  }

  if (resumeId) {
    await OSB.selectSetupBar(resumeId);
    barState = normalizeBar(await OSB.getBar(false, resumeId));
  }
  allBars = (await OSB.listBars()).bars || [];

  await OSB.uploadVoiceNotes(text);
  lastParsedWalkText = text.trim();
  await refreshWalkReviewBars();
  setWalkView(true);
  renderWalkReview();
  updateWalkSummary();
  updateWalkContinueButton();
  let statusMsg = totalAdded
    ? `Parsed ${totalAdded} draft rows across ${barGroups.length} bar(s) — review names and sizes before you continue.`
    : "Notes saved — add bottles manually, then review before you continue.";
  if (barGroups.length === 1 && totalAdded > WALK_SINGLE_BAR_WARN_BOTTLES) {
    statusMsg += ` Warning: ${totalAdded} bottles on one bar — did you paste multiple bars into one walk? Split by bar marker (Bar one, Bar two…).`;
  }
  setStatus(statusMsg);
}

async function readWalkFilesFromInput(fileList, { startBarIndex = 1 } = {}) {
  const files = Array.from(fileList || []);
  const parts = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!isAcceptedWalkNotesFile(file)) {
      const ext = walkNotesExtension(file.name);
      if (ext === "pdf") {
        throw new Error("PDF isn't supported — export as Markdown or .txt from your notes app.");
      }
      throw new Error(`Unsupported file type. Use ${WALK_NOTES_ACCEPT_LABEL}.`);
    }
    const raw = await file.text();
    const normalized = normalizeUploadedWalkNotes(raw, file.name);
    const barIndex = startBarIndex + i;
    parts.push(ensureWalkBarMarker(normalized, file.name, barIndex, files.length));
  }
  return parts.join("\n\n");
}

function getCountFileInput() {
  const input = document.getElementById("countNotesFile");
  if (input) input.multiple = true;
  return input;
}

function openCountFilePicker(mode = "append") {
  countFileUploadMode = mode;
  const input = getCountFileInput();
  if (!input) return;
  input.value = "";
  input.click();
}

async function readCountFilesFromInput(fileList) {
  const files = Array.from(fileList || []);
  const parts = [];
  for (const file of files) {
    if (!isAcceptedWalkNotesFile(file)) {
      const ext = walkNotesExtension(file.name);
      if (ext === "pdf") {
        throw new Error("PDF isn't supported — export as Markdown or .txt from your notes app.");
      }
      throw new Error(`Unsupported file type. Use ${WALK_NOTES_ACCEPT_LABEL}.`);
    }
    const raw = await file.text();
    parts.push(normalizeUploadedWalkNotes(raw, file.name));
  }
  return parts.join("\n\n");
}

async function ingestCountFiles(fileList, mode = "append") {
  const countNotes = document.getElementById("countNotes");
  const existing =
    mode === "append" && countNotes?.value?.trim() ? countNotes.value.trim() : "";
  const newText = await readCountFilesFromInput(fileList);
  const combined = existing ? `${existing}\n\n${newText}` : newText;
  if (countNotes) countNotes.value = combined;
  setCountEntryOpen(true);
  await handleProcessCountClick();
  const added = Array.from(fileList || []).length;
  if (added > 1) {
    setStatus(`Added ${added} count files — merged and parsed. Upload more anytime.`);
  } else if (existing) {
    setStatus("Count file added — merged with your previous upload.");
  }
}

async function ingestWalkFiles(fileList, mode = "append") {
  const voiceNotes = document.getElementById("voiceNotes");
  const existing =
    mode === "append" && voiceNotes?.value?.trim() ? voiceNotes.value.trim() : "";
  const startBarIndex = existing ? countParsedWalkBars(existing) + 1 : 1;
  const newText = await readWalkFilesFromInput(fileList, { startBarIndex });
  const combined = existing ? `${existing}\n\n${newText}` : newText;
  if (voiceNotes) voiceNotes.value = combined;
  await processWalkNotes(combined);
  const added = Array.from(fileList || []).length;
  if (added > 1) {
    setStatus(`Added ${added} files — merged into your walk. Upload more anytime.`);
  } else if (existing) {
    setStatus("File added — merged with your previous upload.");
  }
}

function scheduleWalkParse() {
  clearTimeout(walkParseTimer);
  walkParseTimer = window.setTimeout(async () => {
    const text = document.getElementById("voiceNotes")?.value?.trim() || "";
    if (text.length < 24 || text === lastParsedWalkText) return;
    try {
      await processWalkNotes(text);
    } catch (e) {
      setStatus(e.message);
    }
  }, 700);
}

function scheduleCountParse() {
  clearTimeout(countParseTimer);
  countParseTimer = window.setTimeout(() => {
    const text = document.getElementById("countNotes")?.value?.trim() || "";
    if (text.length < 12) return;
    setStatus("Count ready — click Process & open admin when you're set.");
    updateCountStickyBar();
  }, 400);
}

let processClickInFlight = false;

function getCountNotesText() {
  return document.getElementById("countNotes")?.value?.trim() || "";
}

function updateCountStickyBar() {
  const hint = document.getElementById("countStickyHint");
  const stickyBtn = document.getElementById("btnProcessSticky");
  if (!hint || !stickyBtn) return;
  const text = getCountNotesText();
  if (!text) {
    hint.textContent = "Paste your count above, then click Process.";
    stickyBtn.disabled = false;
    stickyBtn.textContent = "Process & open admin";
    return;
  }
  if (lastCountReconcile?.hasIssues && !canFinishCount(lastCountReconcile)) {
    const gaps = countUnresolvedGaps(lastCountReconcile);
    hint.textContent = `${gaps} gap${gaps === 1 ? "" : "s"} blocking — fix the table or use the matching count file from the test kit.`;
    stickyBtn.disabled = false;
    stickyBtn.textContent = `Process blocked (${gaps} gaps)`;
    return;
  }
  if (countParsed) {
    hint.textContent = "Golden match — Process locks your cycle and opens admin.";
    stickyBtn.disabled = false;
    stickyBtn.textContent = "Process & open admin →";
    return;
  }
  hint.textContent = "Count pasted — click Process to match against your map.";
  stickyBtn.disabled = false;
  stickyBtn.textContent = "Process & open admin";
}

async function handleProcessCountClick() {
  if (processClickInFlight) return;
  const text = getCountNotesText();
  if (!text) {
    showCountBanner("Paste your count in the box first, then click Process.", "error");
    setStatus("Paste your count in the box first, then click Process.");
    document.getElementById("countNotes")?.focus();
    return;
  }

  processClickInFlight = true;
  const buttons = [
    document.getElementById("btnProcessCount"),
    document.getElementById("btnProcessSticky"),
    document.getElementById("btnFirstCountDone"),
    document.getElementById("btnTallyFinish"),
  ].filter(Boolean);
  for (const b of buttons) {
    b.disabled = true;
    if (b.id === "btnProcessCount" || b.id === "btnProcessSticky") b.textContent = "Processing…";
  }
  showProcessOverlay("Matching your count…", "Checking bottles against your approved map.");

  try {
    const result = await processCountNotes(text, { closeCycle: true });
    if (result?.ok === false && result.reason === "gaps") {
      hideProcessOverlay();
      return;
    }
    if (result?.ok === false) {
      hideProcessOverlay();
      return;
    }
  } catch (e) {
    hideProcessOverlay();
    const msg = e?.message || "Process failed — try again.";
    showCountBanner(msg, "error");
    setStatus(msg);
    window.alert(`Process could not finish:\n\n${msg}`);
  } finally {
    processClickInFlight = false;
    updateCountStickyBar();
    for (const b of buttons) {
      if (b.id === "btnProcessCount" || b.id === "btnProcessSticky") {
        b.textContent = "Process & open admin";
      }
      b.disabled = false;
    }
    updateFirstCountDoneButton();
  }
}

async function saveBarDisplayName(barId, name) {
  if (!barId || !name) return;
  await OSB.saveBar({ bar_id: barId, name });
  if (barState?.id === barId) barState.name = name;
}

function defaultBarLabel(barId) {
  const idx = allBars.findIndex((b) => b.id === barId);
  return idx >= 0 ? `Bar ${idx + 1}` : "Bar 1";
}

function syncReconcileRenameDraftFromInput() {
  const input = document.getElementById("reconcileBarRenameActive");
  if (!input || !reconcileRenameBars.length) return;
  const row = reconcileRenameBars[reconcileRenameIndex];
  if (!row) return;
  row.name = input.value.trim() || row.name;
}

function updateReconcileBarRenameStepper() {
  const stepper = document.getElementById("reconcileBarRenameStepper");
  const counter = document.getElementById("reconcileBarRenameCounter");
  const slot = document.getElementById("reconcileBarRenameSlot");
  const input = document.getElementById("reconcileBarRenameActive");
  const prev = document.getElementById("btnReconcileBarPrev");
  const next = document.getElementById("btnReconcileBarNext");
  const dots = document.getElementById("reconcileBarRenameDots");
  if (!stepper || !input || !reconcileRenameBars.length) return;

  const total = reconcileRenameBars.length;
  const row = reconcileRenameBars[reconcileRenameIndex];
  if (!row) return;

  counter.textContent = `Bar ${reconcileRenameIndex + 1} of ${total}`;
  slot.textContent = row.defaultLabel || `Bar ${reconcileRenameIndex + 1}`;
  input.value = row.name;
  input.dataset.barId = row.id;
  input.placeholder = "e.g. River Room, Garden Terrace, The Cellar";

  if (prev) prev.disabled = reconcileRenameIndex === 0;
  if (next) {
    next.textContent =
      reconcileRenameIndex >= total - 1 ? "All bars named ✓" : "Next bar →";
  }

  if (dots) {
    dots.innerHTML = reconcileRenameBars
      .map((b, i) => {
        const active = i === reconcileRenameIndex ? " active" : "";
        const named = b.name && b.name !== b.defaultLabel ? " named" : "";
        return `<button type="button" class="reconcile-bar-dot${active}${named}" data-reconcile-dot="${i}" aria-label="Bar ${i + 1}">${i + 1}</button>`;
      })
      .join("");
    dots.querySelectorAll("[data-reconcile-dot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        syncReconcileRenameDraftFromInput();
        reconcileRenameIndex = parseInt(btn.dataset.reconcileDot, 10) || 0;
        updateReconcileBarRenameStepper();
      });
    });
  }
}

function renderReconcileBarRename(bars) {
  const wrap = document.getElementById("reconcileBarRename");
  const list = document.getElementById("reconcileBarRenameList");
  const stepper = document.getElementById("reconcileBarRenameStepper");
  const hint = document.getElementById("reconcileBarRenameHint");
  if (!wrap || !list) return;

  const rows = bars?.length ? bars : allBars;
  const multi = rows.length > 1;
  wrap.classList.toggle("hidden", !multi);
  if (!multi) {
    list.innerHTML = "";
    stepper?.classList.add("hidden");
    reconcileRenameBars = [];
    return;
  }

  if (hint) {
    hint.textContent = `Your walk created ${rows.length} bars — name each one before you continue. Use Next bar to step through.`;
  }

  reconcileRenameBars = rows.map((b, i) => {
    const defaultLabel = `Bar ${i + 1}`;
    const current = b.name?.trim();
    const name =
      current && !/^bar\s*\d+$/i.test(current) ? current : defaultLabel;
    return { id: b.id, name, defaultLabel };
  });
  reconcileRenameIndex = 0;

  list.innerHTML = "";
  list.classList.add("hidden");
  stepper?.classList.remove("hidden");
  updateReconcileBarRenameStepper();
}

async function saveReconcileBarNames() {
  syncReconcileRenameDraftFromInput();
  const rows = reconcileRenameBars.length
    ? reconcileRenameBars
    : Array.from(document.querySelectorAll(".reconcile-bar-name-input")).map((input) => ({
        id: input.dataset.barId,
        name: input.value.trim(),
      }));

  for (const row of rows) {
    const name = row.name?.trim();
    const barId = row.id;
    if (!barId || !name) continue;
    await saveBarDisplayName(barId, name);
    if (barState?.id === barId) await OSB.saveConfig({ bar_name: name });
  }
  allBars = (await OSB.listBars()).bars || [];
  await refreshWalkReviewBars();
}

function renderBuildBarTabs(bars, activeId) {
  const el = document.getElementById("buildBarTabs");
  if (!el) return;

  if (!bars.length) {
    el.innerHTML = `<span class="build-bar-tab active">Bar 1</span>`;
    return;
  }

  el.innerHTML = bars
    .map((b) => {
      const label = b.name?.trim() || "Unnamed bar";
      const active = b.id === activeId ? " active" : "";
      return `<button type="button" class="build-bar-tab${active}" data-tab-bar="${b.id}">${escapeHtml(label)}</button>`;
    })
    .join("");

  el.querySelectorAll("[data-tab-bar]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (btn.dataset.tabBar === barState.id) return;
      try {
        await persistBar();
        await OSB.selectSetupBar(btn.dataset.tabBar);
        setStatus("");
        await initSetup();
      } catch (e) {
        setStatus(e.message);
      }
    });
  });
}

function renderStationList() {
  const el = document.getElementById("stationList");
  if (!el) return;
  const stations = sortedStations();

  el.innerHTML = stations
    .map((station, i) => {
      const isEditing = editingStationId === station.id;
      const nameCell = isEditing
        ? `<input class="station-edit-input" data-edit-id="${station.id}" value="${escapeHtml(station.name)}" />`
        : `<button type="button" class="station-name-btn" data-rename="${station.id}">${escapeHtml(station.name)}</button>`;

      return `
        <div class="station-card" data-station-id="${station.id}">
          <div class="station-reorder">
            <button type="button" class="reorder-btn" data-move-up="${station.id}" ${i === 0 ? "disabled" : ""} aria-label="Move up">▲</button>
            <button type="button" class="reorder-btn" data-move-down="${station.id}" ${i === stations.length - 1 ? "disabled" : ""} aria-label="Move down">▼</button>
          </div>
          <div class="station-card-body">${nameCell}</div>
          <span class="station-badge ${stationBadgeClass(station.type)}">${stationBadgeLabel(station.type)}</span>
          <button type="button" class="station-remove" data-remove="${station.id}" aria-label="Remove">×</button>
        </div>
      `;
    })
    .join("");

  el.querySelectorAll("[data-rename]").forEach((btn) => {
    btn.addEventListener("click", () => {
      editingStationId = btn.dataset.rename;
      renderStationList();
      const input = el.querySelector(`[data-edit-id="${editingStationId}"]`);
      input?.focus();
      input?.select();
    });
  });

  el.querySelectorAll(".station-edit-input").forEach((input) => {
    const commit = () => {
      const id = input.dataset.editId;
      const station = barState.stations.find((s) => s.id === id);
      if (station && input.value.trim()) {
        station.name = input.value.trim();
        station.type = guessStationType(station.name);
      }
      editingStationId = null;
      renderStationList();
    };
    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") commit();
      if (e.key === "Escape") {
        editingStationId = null;
        renderStationList();
      }
    });
  });

  el.querySelectorAll("[data-move-up]").forEach((btn) => {
    btn.addEventListener("click", () => moveStation(btn.dataset.moveUp, -1));
  });
  el.querySelectorAll("[data-move-down]").forEach((btn) => {
    btn.addEventListener("click", () => moveStation(btn.dataset.moveDown, 1));
  });
  el.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => removeStation(btn.dataset.remove));
  });
}

function moveStation(id, dir) {
  const stations = sortedStations();
  const idx = stations.findIndex((s) => s.id === id);
  const target = idx + dir;
  if (target < 0 || target >= stations.length) return;
  [stations[idx], stations[target]] = [stations[target], stations[idx]];
  stations.forEach((s, i) => {
    s.order = i;
  });
  barState.stations = stations;
  renderStationList();
}

function removeStation(id) {
  barState.stations = sortedStations().filter((s) => s.id !== id);
  barState.stations.forEach((s, i) => {
    s.order = i;
  });
  renderStationList();
}

function addStation() {
  const name = document.getElementById("newStationName")?.value?.trim();
  const type = document.getElementById("newStationType")?.value || "back-bar";
  if (!name) return;
  barState.stations.push({
    id: uid(),
    name,
    type,
    order: barState.stations.length,
    bottles: [],
  });
  document.getElementById("newStationName").value = "";
  renderStationList();
}

/* ── Walk parser: size-delimited segmentation ─────────────────────────────────
 * In a bar-walk dictation each bottle entry ENDS with its size ("Tito's 750",
 * "Ketel One liter"). Sizes are the delimiters — not commas or periods, which
 * dictation rarely produces. Station phrases ("well two", "row three",
 * "back bar shelf") mark where the walker moved and group what follows.
 */

const WALK_WORD_NUMS = {
  one: "1", two: "2", too: "2", to: "2", three: "3", four: "4", for: "4",
  five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
};

function walkNormalizeText(text) {
  let t = " " + String(text).replace(/\r/g, "\n") + " ";
  t = t.toLowerCase();
  t = t.replace(/\bleader\b/g, "liter"); // most common dictation mishear
  t = t.replace(/\blitre\b/g, "liter");
  t = t.replace(/\bseven\s+fifty\b/g, "750");
  t = t.replace(/\bseven\s+50\b/g, "750");
  t = t.replace(/\b7\s+fifty\b/g, "750");
  t = t.replace(/\b7\/50\b/g, "750");
  t = t.replace(/\b75[43]\b/g, "750"); // "750" + stray syllable collisions
  t = t.replace(/\b7\/5[43]\b/g, "750");
  t = t.replace(/\b(\d{1,4})750\b/g, "$1 750"); // "666750" glued numbers
  t = t.replace(/\brow\s+(\d)\/(\d)\b/g, "row $1"); // "row 2/2" → row 2
  t = t.replace(/\b(\d)\/(\d)\b/g, " $1/$2 "); // keep fractions as tokens
  return t;
}

const WALK_SIZE_PATTERNS = [
  [/^1\.75\s*l?$/, "1.75L"],
  [/^handle$/, "1.75L"],
  [/^24\s*oz$/, "24oz"],
  [/^16\s*oz$/, "16oz"],
  [/^12\s*oz$/, "12oz"],
  [/^12oz$/, "12oz"],
  [/^(?:\.75|0\.75)$/, "750ml"],
  [/^750(?:ml)?$/, "750ml"],
  [/^375(?:ml)?$/, "375ml"],
  [/^200(?:ml)?$/, "200ml"],
  [/^50ml$/, "50ml"],
  [/^liter$/, "1L"],
  [/^1l$/, "1L"],
  [/^l$/, "1L"], // bare "L" right after a name = liter
];

function walkSizeOf(token) {
  const t = token.replace(/[.,;:!?]+$/, "");
  for (const [re, sz] of WALK_SIZE_PATTERNS) {
    if (re.test(t)) return sz;
  }
  return null;
}

const WALK_BAR_RES =
  /^(bar)\s+(one|two|too|to|three|four|for|five|six|seven|eight|nine|ten|\d{1,2})\b/;

function walkMatchBar(words, i) {
  const windowText = words.slice(i, i + 3).join(" ");
  const m = windowText.match(WALK_BAR_RES);
  if (m && windowText.startsWith(m[0])) {
    const numWord = WALK_WORD_NUMS[m[2]] ?? m[2];
    const key = String(numWord);
    const label = `Bar ${numWord}`;
    return { key, label, consumed: m[0].trim().split(/\s+/).length };
  }
  return null;
}

const WALK_STATION_RES = [
  /^(well)\s+(one|two|too|to|three|four|for|five|six|seven|eight|nine|ten|\d{1,2})(\s+(primary|secondary|service|point|patio|rear|front|large|small))?(\s+(row|bro)\s+(one|two|too|three|four|five|\d{1,2}))?(\s+(top|bottom|back|front)\s+(left|right|center)(\s+corner)?)?/,
  /^(row|bro)\s+(one|two|too|three|four|five|six|seven|\d{1,2})/,
  /^(next)\s+(row|shelf)/,
  /^(wine)\s+(wall|cooler|rack|cellar)/,
  /^(back\s+bar)(\s+(main|top\s+shelf|shelf|wall|point|service))?/,
  /^(patio)\s+cooler/,
  /^(front|back)\s+wall(\s+(left|right|center)\s+side)?/,
  /^(bar)\s+(left|right)\s+side(\s+top\s+shelf)?/,
  /^(top|bottom|glass)\s+shelf/,
  /^(center|middle)\s+bar(\s+front\s+section)?/,
  /^(rear|front)\s+row(\s+(one|two|three|\d{1,2}))?/,
  /^(speed\s*rail|rail)\b/,
  /^(beer)\s+cooler/,
  /^(cooler|walk[\s-]?in|liquor\s+room|store\s*room|storage)\b/,
];

function walkTitleCase(s) {
  return s.replace(/(^|[\s-])(\S)/g, (m, pre, c) => pre + c.toUpperCase());
}

function walkMatchStation(words, i) {
  const windowText = words.slice(i, i + 8).join(" ");
  for (const re of WALK_STATION_RES) {
    const m = windowText.match(re);
    if (m && windowText.startsWith(m[0])) {
      let label = m[0]
        .trim()
        .split(/\s+/)
        .map((w) => (w === "bro" ? "row" : (WALK_WORD_NUMS[w] ?? w)))
        .join(" ");
      label = normalizeWalkStationLabel(walkTitleCase(label));
      return { label, consumed: m[0].trim().split(/\s+/).length };
    }
  }
  return null;
}

function walkMatchQuantity(words, i) {
  const w = words[i];
  const next = (words[i + 1] || "").replace(/[.,]/g, "");
  const num = WALK_WORD_NUMS[w] ?? (/^\d{1,2}$/.test(w) ? w : null);
  if (num && (next === "bottles" || next === "bottle")) {
    return { qty: parseInt(num, 10), consumed: 2 };
  }
  if ((w === "a" || w === "one") && next === "case") return { qty: 12, consumed: 2 };
  return null;
}

function walkCleanName(s) {
  return s
    .replace(/\b(the|a|an|of|and)\b/g, " ")
    .replace(/[.,]+/g, " ")
    .replace(/^0\d+\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function countCleanName(s) {
  return walkCleanName(s)
    .replace(/^(?:bottle|bottles)\s+/i, "")
    .replace(/\s+(?:bottle|bottles)$/i, "")
    .replace(/\beach\s+one\b/gi, "")
    .trim();
}

const CASE_QTY_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function normalizeCaseCountEntry(rawName, level) {
  const lower = (rawName || "").toLowerCase().trim();
  const mQty = lower.match(/^(.+?)\s+case\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})$/);
  if (mQty) {
    const qty = CASE_QTY_WORDS[mQty[2]] ?? parseInt(mQty[2], 10);
    return { name: `Case ${walkTitleCase(walkCleanName(mQty[1]))}`, level: qty || level };
  }
  const mCase = lower.match(/^(.+?)\s+case$/);
  if (mCase) {
    return { name: `Case ${walkTitleCase(walkCleanName(mCase[1]))}`, level };
  }
  const mLead = lower.match(/^case\s+(.+?)\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})$/);
  if (mLead) {
    const qty = CASE_QTY_WORDS[mLead[2]] ?? parseInt(mLead[2], 10);
    return { name: `Case ${walkTitleCase(walkCleanName(mLead[1]))}`, level: qty || level };
  }
  if (/^case\s+/i.test(rawName)) {
    return { name: walkTitleCase(countCleanName(rawName)), level };
  }
  return { name: rawName, level };
}

function parseWalkText(rawText) {
  const words = walkNormalizeText(rawText)
    .split(/\s+/)
    .map((w) => w.replace(/^[,;:()"']+|[,;:()"']+$/g, ""))
    .filter(Boolean);

  const entries = [];
  const stationsSeen = [];
  const barBuckets = new Map();
  let currentStation = null;
  let currentBarKey = "1";
  let currentBarLabel = "Bar 1";
  let buf = [];
  let qty = 1;

  function ensureBarBucket() {
    if (!barBuckets.has(currentBarKey)) {
      barBuckets.set(currentBarKey, {
        key: currentBarKey,
        label: currentBarLabel,
        entries: [],
        stations: [],
      });
    }
    return barBuckets.get(currentBarKey);
  }

  function mkEntry(name, size, sizeVerified, flags = []) {
    const entry = {
      name: walkTitleCase(name),
      size,
      size_verified: sizeVerified,
      station: currentStation,
      barKey: currentBarKey,
      barLabel: currentBarLabel,
      qty,
      raw_heard: name,
      flags,
    };
    entries.push(entry);
    const bucket = ensureBarBucket();
    bucket.entries.push(entry);
    if (currentStation && !bucket.stations.includes(currentStation)) {
      bucket.stations.push(currentStation);
    }
    return entry;
  }

  function flushUnsized() {
    const name = walkCleanName(buf.join(" "));
    if (name && name.length > 1) {
      const isBeerStation = /beer\s+cooler/i.test(currentStation || "");
      const defaultSize = isBeerStation ? "12oz" : "750ml";
      const flag =
        name.split(" ").length <= 8
          ? "no size heard — verify"
          : "could not split — edit this one";
      mkEntry(name, defaultSize, false, [flag]);
    }
    buf = [];
    qty = 1;
  }

  ensureBarBucket();

  let i = 0;
  while (i < words.length) {
    const barHit = walkMatchBar(words, i);
    if (barHit) {
      if (buf.length) flushUnsized();
      currentBarKey = barHit.key;
      currentBarLabel = barHit.label;
      currentStation = null;
      ensureBarBucket();
      i += barHit.consumed;
      continue;
    }
    const st = walkMatchStation(words, i);
    if (st) {
      if (buf.length) flushUnsized();
      currentStation = st.label;
      if (!stationsSeen.includes(st.label)) stationsSeen.push(st.label);
      const bucket = ensureBarBucket();
      if (!bucket.stations.includes(st.label)) bucket.stations.push(st.label);
      i += st.consumed;
      continue;
    }
    const q = walkMatchQuantity(words, i);
    if (q) {
      qty = q.qty;
      i += q.consumed;
      continue;
    }
    const size = walkSizeOf(words[i]);
    if (size) {
      const name = walkCleanName(buf.join(" "));
      if (name) {
        const flags = name.split(" ").length > 6 ? ["long name — may be two bottles"] : [];
        const entry = mkEntry(name, size, true, flags);
        const after = words.slice(i + 1);
        const packQty = after.length >= 2 ? walkMatchQuantity(after, 0) : null;
        if (packQty && packQty.qty >= 2 && packQty.qty <= 24) {
          entry.qty = packQty.qty;
          i += 1 + packQty.consumed;
        } else {
          i += 1;
        }
      } else if (entries.length) {
        entries[entries.length - 1].flags.push("extra size heard nearby — check size");
        i += 1;
      } else {
        i += 1;
      }
      buf = [];
      qty = 1;
      continue;
    }
    buf.push(words[i]);
    i += 1;
  }
  if (buf.length) flushUnsized();

  const bars = Array.from(barBuckets.values()).sort(
    (a, b) => parseInt(a.key, 10) - parseInt(b.key, 10)
  );

  return { entries, stations: stationsSeen, bars };
}

function walkFindOrCreateStation(label) {
  if (!label) return sortedStations()[0] ?? null;

  const resolved = resolveWalkStation(label);
  if (resolved) return resolved;

  const key = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (key.length >= 4) {
    const exact = barState.stations.find((s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, "") === key);
    if (exact) return exact;
  }

  const intent = parseWalkStationIntent(label);
  let type = "well";
  if (intent?.kind === "back-bar") type = "back-bar";
  else if (intent?.kind === "beer-cooler" || intent?.kind === "patio-cooler" || intent?.kind === "wine") type = "walk-in";
  else if (intent?.kind === "liquor-room" || intent?.kind === "storage") type = "storage";
  else if (/shelf|wall|back bar|center/i.test(label)) type = "back-bar";

  const found = {
    id: uid(),
    name: label,
    type,
    order: barState.stations.length,
    bottles: [],
  };
  barState.stations.push(found);
  return found;
}

function applyWalkEntriesToBar(entries) {
  let added = 0;
  for (const e of entries) {
    const station = walkFindOrCreateStation(e.station);
    if (!station) continue;
    if (!station.bottles) station.bottles = [];
    const exists = station.bottles.some(
      (b) => b.name.toLowerCase() === e.name.toLowerCase() && b.size === e.size
    );
    if (exists) continue;
    const par = Math.max(1, Math.min(e.qty || 1, 48));
    station.bottles.push({
      id: uid(),
      name: e.name,
      raw_heard: e.raw_heard,
      category: guessCategory(e.name),
      size: e.size,
      size_verified: e.size_verified,
      parse_flags: e.flags || [],
      par_level: par,
      current_level: par,
      cost: 0,
    });
    added += 1;
  }
  return added;
}

function parseVoiceNotes(text) {
  const { entries } = parseWalkText(text);
  return applyWalkEntriesToBar(entries);
}

function fillManualStationSelect() {
  const sel = document.getElementById("manualBottleStation");
  if (!sel) return;
  sel.innerHTML = sortedStations()
    .map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`)
    .join("");
}

function renderBottleGroups(containerId, editable = false) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const stations = sortedStations();

  el.innerHTML = stations
    .map((station) => {
      const bottles = station.bottles || [];
      const rows =
        bottles.length > 0
          ? bottles
              .map((b) => {
                const removeBtn = `<button type="button" class="bottle-remove" data-del-bottle="${b.id}" data-station="${station.id}">×</button>`;
                if (editable) {
                  return `
                    <div class="bottle-row editable" data-bottle="${b.id}">
                      <input class="bottle-edit-name" data-field="name" data-bottle="${b.id}" data-station="${station.id}" value="${escapeHtml(b.name)}" />
                      <select class="bottle-edit-cat" data-field="category" data-bottle="${b.id}" data-station="${station.id}">
                        ${categoryOptions(b.category)}
                      </select>
                      <input class="bottle-edit-par" type="number" step="0.5" min="0" data-field="par_level" data-bottle="${b.id}" data-station="${station.id}" value="${b.par_level ?? 1}" />
                      ${removeBtn}
                    </div>
                  `;
                }
                return `
                  <div class="bottle-row">
                    <span class="bottle-name">${escapeHtml(b.name)}</span>
                    <span class="bottle-cat">${escapeHtml(b.category)}</span>
                    <span class="bottle-size">${escapeHtml(b.size || "750ml")}</span>
                    ${removeBtn}
                  </div>
                `;
              })
              .join("")
          : `<div class="bottle-empty">No bottles assigned</div>`;

      return `
        <div class="bottle-group">
          <div class="bottle-group-head">
            <span class="bottle-group-title">${escapeHtml(station.name)}</span>
            <span class="station-badge ${stationBadgeClass(station.type)}">${stationBadgeLabel(station.type)}</span>
            <span class="bottle-group-count">${bottles.length} bottle${bottles.length !== 1 ? "s" : ""}</span>
          </div>
          <div class="bottle-group-body">${rows}</div>
        </div>
      `;
    })
    .join("");

  el.querySelectorAll("[data-del-bottle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const station = barState.stations.find((s) => s.id === btn.dataset.station);
      if (station?.bottles) {
        station.bottles = station.bottles.filter((b) => b.id !== btn.dataset.delBottle);
        renderBottleGroups(containerId, editable);
        updateWalkSummary();
      }
    });
  });

  if (editable) {
    el.querySelectorAll("[data-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const station = barState.stations.find((s) => s.id === input.dataset.station);
        const bottle = station?.bottles?.find((b) => b.id === input.dataset.bottle);
        if (!bottle) return;
        const field = input.dataset.field;
        if (field === "par_level") bottle.par_level = parseFloat(input.value) || 0;
        else bottle[field] = input.value;
      });
    });
  }
}

function categoryOptions(selected) {
  const cats = ["spirits", "vodka", "gin", "rum", "tequila", "whiskey", "scotch", "cognac", "liqueur", "beer", "wine", "mixer"];
  return cats.map((c) => `<option value="${c}"${c === selected ? " selected" : ""}>${c}</option>`).join("");
}

function updateWalkSummary() {
  const el = document.getElementById("parseSummaryText");
  if (!el) return;
  const multi = walkReviewBars.length > 1;
  const bottles = multi ? allBottlesForReview() : allBottles();
  const count = bottles.length;
  const withBottles = new Set(bottles.map((b) => b.stationId)).size;
  const barNote = multi ? ` across ${walkReviewBars.length} bars` : "";
  el.textContent = `Found ${count} bottles across ${withBottles} stations${barNote}`;
}

function setReconcileNextEnabled(enabled) {
  const btn = document.getElementById("btnReconcileNext");
  if (btn) btn.disabled = !enabled;
}

function setReconcileToolkitVisible(visible) {
  const btn = document.getElementById("btnOpenReconcileToolkit");
  const nav = document.getElementById("reconcileNav");
  if (btn) btn.classList.toggle("hidden", !visible);
  if (nav) nav.classList.toggle("has-toolkit", visible);
}

function reconcileAuditStats(stations = sortedStations()) {
  let flagged = 0;
  let unverified = 0;
  let withBottles = 0;
  stations.forEach((s) => {
    const bottles = s.bottles || [];
    if (bottles.length) withBottles += 1;
    bottles.forEach((b) => {
      if (b.parse_flags && b.parse_flags.length) flagged += 1;
      if (!b.size_verified) unverified += 1;
    });
  });
  return {
    stations: stations.length,
    withBottles,
    bottles: bottleCount(),
    flagged,
    unverified,
  };
}

function renderStationAuditReport(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const stations = sortedStations().filter((s) => (s.bottles || []).length > 0);
  const stats = reconcileAuditStats(sortedStations());
  let html = `
    <div class="reconcile-stat-row">
      <span><strong>${stats.stations}</strong> stations</span>
      <span><strong>${stats.withBottles}</strong> with bottles</span>
      <span><strong>${stats.bottles}</strong> bottles</span>
      <span><strong>${stats.flagged}</strong> flagged</span>
      <span><strong>${stats.unverified}</strong> sizes to confirm</span>
    </div>`;
  if (!stats.bottles) {
    html += `<div class="report-empty">No bottles mapped yet. Walk the bar or add bottles, then run reconciliation.</div>`;
    el.innerHTML = html;
    return;
  }
  for (const s of stations) {
    const bottles = s.bottles || [];
    html += `<div class="report-station">
      <div class="report-station-head"><span>${escapeHtml(s.name)}</span><span class="report-count">${bottles.length}</span></div>`;
    html += `<table class="report-table"><thead><tr><th>Bottle</th><th>Size</th><th>Category</th><th>Status</th></tr></thead><tbody>`;
    for (const b of bottles) {
      let status;
      let cls;
      if (b.parse_flags && b.parse_flags.length) {
        status = `⚑ ${escapeHtml(b.parse_flags.join("; "))}`;
        cls = "report-flag";
      } else if (!b.size_verified) {
        status = "size unconfirmed";
        cls = "report-warn";
      } else {
        status = "✓ verified";
        cls = "report-ok";
      }
      html += `<tr><td>${escapeHtml(b.name)}</td><td>${escapeHtml(b.size || "750ml")}</td><td>${escapeHtml(b.category || "spirits")}</td><td class="${cls}">${status}</td></tr>`;
    }
    html += `</tbody></table></div>`;
  }
  el.innerHTML = html;
}

let reviewEditorListenersBound = false;

function fillReviewAddStationSelect() {
  const sel = document.getElementById("reviewAddStation");
  if (!sel) return;
  sel.innerHTML = sortedStations()
    .map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`)
    .join("");
}

function fillReviewAddSizeSelect() {
  const sel = document.getElementById("reviewAddSize");
  if (!sel) return;
  sel.innerHTML = sizeOptions("750ml");
}

function toggleReviewAddBox(show) {
  document.getElementById("reviewAddBox")?.classList.toggle("hidden", !show);
  if (show) {
    fillReviewAddStationSelect();
    fillReviewAddSizeSelect();
  }
}

async function addReviewBottle() {
  const name = document.getElementById("reviewAddName")?.value?.trim();
  const stationId = document.getElementById("reviewAddStation")?.value;
  const size = document.getElementById("reviewAddSize")?.value || "750ml";
  const category = document.getElementById("reviewAddCategory")?.value || "spirits";
  if (!name || !stationId) {
    setStatus("Enter a product name and pick a station.");
    return;
  }
  const station = barState.stations.find((s) => s.id === stationId);
  if (!station) return;
  if (!station.bottles) station.bottles = [];
  station.bottles.push({
    id: uid(),
    name,
    raw_heard: name,
    category,
    size,
    size_verified: true,
    par_level: 1.0,
    current_level: 1.0,
    cost: 0,
  });
  document.getElementById("reviewAddName").value = "";
  await persistBar();
  toggleReviewAddBox(false);
  await renderReview();
  setStatus(`Added ${name} to ${station.name}.`);
}

function isMapToolkitOpen() {
  const modal = document.getElementById("mapToolkitModal");
  return modal && !modal.classList.contains("hidden");
}

let mapToolkitTriggerId = null;

function mapToolkitTriggers() {
  return Array.from(document.querySelectorAll("[aria-controls='mapToolkitModal']"));
}

function setMapToolkitOpen(open, triggerId = mapToolkitTriggerId) {
  const modal = document.getElementById("mapToolkitModal");
  if (modal) modal.classList.toggle("hidden", !open);
  if (open && triggerId) mapToolkitTriggerId = triggerId;
  mapToolkitTriggers().forEach((btn) => {
    btn.setAttribute(
      "aria-expanded",
      open && btn.id === mapToolkitTriggerId ? "true" : "false"
    );
  });
  document.body.style.overflow = open ? "hidden" : "";
  if (open) renderMapDigitalView();
}

function buildMapPlainText() {
  const barName = barState.name?.trim() || "Your Bar";
  const lines = [`${barName} — inventory map`, ""];
  for (const s of sortedStations().filter((st) => (st.bottles || []).length)) {
    lines.push(`▸ ${s.name}`);
    for (const b of s.bottles || []) {
      lines.push(`  ${b.name} · ${b.size || "750ml"}`);
    }
    lines.push("  _ missed entry — speak or write");
    lines.push("  _ missed entry — speak or write");
    lines.push("");
  }
  return lines.join("\n").trim();
}

function showMapToolkitFeedback(message, btn, doneLabel) {
  const el = document.getElementById("mapToolkitFeedback");
  if (el) {
    el.textContent = message;
    el.classList.remove("hidden");
  }
  if (btn) {
    if (!btn.dataset.defaultLabel) {
      const inner = btn.querySelector("#btnMapCopyLabel");
      btn.dataset.defaultLabel = inner ? inner.textContent.trim() : btn.textContent.trim();
    }
    btn.classList.add("btn-map-action-done");
    const label = btn.querySelector("#btnMapCopyLabel");
    if (doneLabel && label) label.textContent = doneLabel;
    else if (doneLabel) btn.textContent = doneLabel;
    window.setTimeout(() => {
      btn.classList.remove("btn-map-action-done");
      if (label) label.textContent = btn.dataset.defaultLabel;
      else btn.textContent = btn.dataset.defaultLabel;
      el?.classList.add("hidden");
    }, 2800);
  }
  setStatus(message);
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through */
    }
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

async function copyMapToClipboard() {
  await persistBar();
  const text = buildMapPlainText();
  if (!text.trim()) {
    setStatus("Nothing on your map yet — add bottles first.");
    return false;
  }
  const ok = await copyTextToClipboard(text);
  const btn = document.getElementById("btnMapCopy");
  if (ok) {
    showMapToolkitFeedback("✓ Copied — paste into Notes on your phone.", btn, "✓ Copied to clipboard");
    return true;
  }
  setStatus("Could not copy — select and copy from the digital view below.");
  return false;
}

function renderMapDigitalView() {
  const el = document.getElementById("mapDigitalView");
  if (!el) return;
  const stations = sortedStations().filter((s) => (s.bottles || []).length);
  if (!stations.length) {
    el.innerHTML = `<p class="map-digital-blank">No bottles on your map yet — add products above, then come back here.</p>`;
    return;
  }
  el.innerHTML = stations
    .map((s) => {
      const bottles = s.bottles || [];
      const bottleRows = bottles
        .map(
          (b) => `
        <div class="map-digital-bottle">
          <span>${escapeHtml(b.name)}</span>
          <span class="map-digital-meta">${escapeHtml(b.size || "750ml")}</span>
        </div>`
        )
        .join("");
      const blanks = [1, 2]
        .map(
          () =>
            `<div class="map-digital-blank">Missed entry — speak it here, add in editor when back</div>`
        )
        .join("");
      return `
      <div class="map-digital-station">
        <div class="map-digital-station-name">${escapeHtml(s.name)} <span class="map-digital-meta">(${bottles.length})</span></div>
        ${bottleRows}
        ${blanks}
      </div>`;
    })
    .join("");
}

function buildMapPrintHtml() {
  const barName = barState.name?.trim() || "Your Bar";
  const stations = sortedStations().filter((s) => (s.bottles || []).length);
  const stationBlocks = stations
    .map((s) => {
      const rows = (s.bottles || [])
        .map(
          (b) =>
            `<tr><td>${escapeHtml(b.name)}</td><td>${escapeHtml(b.size || "750ml")}</td><td class="blank"></td><td class="blank"></td></tr>`
        )
        .join("");
      const blanks = [1, 2]
        .map(() => `<tr class="spacer"><td class="blank"></td><td class="blank"></td><td class="blank"></td><td class="blank"></td></tr>`)
        .join("");
      const adds = [1, 2, 3]
        .map(
          (n) =>
            `<tr class="add-row"><td>Missed entry ${n} — speak or write:</td><td class="blank"></td><td class="blank"></td><td class="blank"></td></tr>`
        )
        .join("");
      return `
      <section class="station">
        <h2>${escapeHtml(s.name)}</h2>
        <table>
          <thead><tr><th>Product</th><th>Size</th><th>Level</th><th>Notes</th></tr></thead>
          <tbody>${rows}${blanks}${adds}</tbody>
        </table>
      </section>`;
    })
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(barName)} — Walk Sheet</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, serif; margin: 24px; color: #111; }
  h1 { font-size: 1.4rem; margin-bottom: 4px; }
  .lead { font-size: 0.9rem; color: #444; margin-bottom: 20px; max-width: 640px; }
  .station { page-break-inside: avoid; margin-bottom: 22px; }
  h2 { font-size: 1.05rem; border-bottom: 2px solid #333; padding-bottom: 4px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
  th { background: #eee; }
  td.blank { min-height: 28px; height: 28px; }
  tr.spacer td { height: 22px; }
  tr.add-row td { font-style: italic; color: #555; }
  @media print { body { margin: 12px; } }
</style></head><body>
  <h1>${escapeHtml(barName)} — Inventory Walk Sheet</h1>
  <p class="lead">Hand this to your barback. Walk station by station. Write levels in tenths. Use blank and ADD rows for bottles you find on the shelf.</p>
  ${stationBlocks || "<p>No bottles mapped yet.</p>"}
</body></html>`;
}

function printMapSheet() {
  const html = buildMapPrintHtml();
  const win = window.open("", "_blank");
  if (!win) {
    setStatus("Allow pop-ups to print — then choose Save as PDF or your printer.");
    return false;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  const triggerPrint = () => {
    try {
      win.print();
    } catch {
      setStatus("Print window opened — use File → Print or Save as PDF.");
    }
  };
  win.addEventListener("load", triggerPrint);
  window.setTimeout(triggerPrint, 400);
  return true;
}

async function downloadMapExport(format, btn) {
  await persistBar();
  const href = `/api/export/bottles?format=${encodeURIComponent(format)}`;
  try {
    const r = await fetch(href);
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || `Download failed (${r.status})`);
    }
    const blob = await r.blob();
    const disp = r.headers.get("Content-Disposition") || "";
    const match = disp.match(/filename="?([^";]+)"?/i);
    const ext = format.includes("xlsx") ? "xlsx" : format === "xml" ? "xml" : "csv";
    const filename = match?.[1] || `map-${format}.${ext}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (btn) {
      const defaultLabel = btn.dataset.defaultLabel || btn.textContent;
      if (!btn.dataset.defaultLabel) btn.dataset.defaultLabel = defaultLabel;
      showMapToolkitFeedback(`✓ Downloaded ${filename}`, btn, "✓ Downloaded");
    } else {
      setStatus(`Downloaded ${filename}`);
    }
    return true;
  } catch (e) {
    setStatus(e.message || "Download failed.");
    return false;
  }
}

function renderReviewEditor() {
  const el = document.getElementById("bottleGroupsReview");
  if (!el) return;
  const bottles = allBottles();

  let rows = "";
  if (!bottles.length) {
    rows = `<tr><td colspan="5" class="bottle-empty">No bottles yet — use + Add bottle below.</td></tr>`;
  } else {
    rows = bottles
      .map(
        (b) => `
      <tr data-bottle="${b.id}" data-station="${b.stationId}">
        <td><input type="text" class="review-name" value="${escapeHtml(b.name)}" data-bottle="${b.id}" data-station="${b.stationId}" /></td>
        <td><select class="review-station" data-bottle="${b.id}" data-station="${b.stationId}">${stationOptions(b.stationId)}</select></td>
        <td><select class="review-size" data-bottle="${b.id}" data-station="${b.stationId}">${sizeOptions(b.size || "750ml")}</select></td>
        <td><select class="review-cat" data-bottle="${b.id}" data-station="${b.stationId}">${categoryOptions(b.category)}</select></td>
        <td class="review-delete-cell"><button type="button" class="row-delete" data-del-review="${b.id}" data-station="${b.stationId}" title="Remove bottle">×</button></td>
      </tr>`
      )
      .join("");
  }

  el.innerHTML = `
    <div class="review-editor-toolbar">
      <p class="review-editor-hint"><strong>${bottles.length}</strong> bottles — edit names, move stations, change sizes, or delete rows. Saves automatically.</p>
      <button type="button" class="btn btn-ghost btn-sm" id="btnReviewAddBottle">+ Add bottle</button>
    </div>
    <div class="walk-review-table-wrap review-editor-table-wrap">
      <table class="walk-review-table" id="reviewEditTable">
        <thead>
          <tr>
            <th>Product name</th>
            <th>Station</th>
            <th>Size</th>
            <th>Category</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="reviewEditBody">${rows}</tbody>
      </table>
    </div>`;
}

function bindReviewEditorListeners() {
  if (reviewEditorListenersBound) return;
  reviewEditorListenersBound = true;

  document.getElementById("bottleGroupsReview")?.addEventListener("click", async (e) => {
    if (e.target.closest("#btnReviewAddBottle")) {
      toggleReviewAddBox(true);
      return;
    }
    const delBtn = e.target.closest("[data-del-review]");
    if (!delBtn) return;
    const section = document.querySelector('[data-step="map_review"]');
    if (section?.classList.contains("hidden")) return;
    const station = barState.stations.find((s) => s.id === delBtn.dataset.station);
    if (!station?.bottles) return;
    station.bottles = station.bottles.filter((b) => b.id !== delBtn.dataset.delReview);
    await persistBar();
    await renderReview();
    setStatus("Bottle removed.");
  });

  document.getElementById("bottleGroupsReview")?.addEventListener("change", async (e) => {
    const section = document.querySelector('[data-step="map_review"]');
    if (section?.classList.contains("hidden")) return;
    const t = e.target;
    const bottleId = t.dataset.bottle;
    const stationId = t.dataset.station;
    if (!bottleId || !stationId) return;

    if (t.classList.contains("review-station")) {
      moveBottle(bottleId, stationId, t.value);
      await persistBar();
      await renderReview();
      return;
    }

    const bottle = findBottleRecord(bottleId, stationId);
    if (!bottle) return;

    if (t.classList.contains("review-name")) bottle.name = t.value.trim() || bottle.name;
    if (t.classList.contains("review-size")) {
      bottle.size = t.value;
      bottle.size_verified = true;
    }
    if (t.classList.contains("review-cat")) bottle.category = t.value;
    if (bottle.parse_flags?.length) bottle.parse_flags = [];

    await persistBar();
    const statsEl = document.getElementById("reviewStats");
    if (statsEl) {
      const cats = new Set(allBottles().map((b) => b.category));
      const activeStations = sortedStations().filter((s) => (s.bottles || []).length).length;
      statsEl.innerHTML = `
        <div class="stat-card"><div class="stat-num">${activeStations}</div><div class="stat-lbl">Stations</div></div>
        <div class="stat-card"><div class="stat-num">${bottleCount()}</div><div class="stat-lbl">Bottles</div></div>
        <div class="stat-card"><div class="stat-num">${cats.size}</div><div class="stat-lbl">Categories</div></div>`;
    }
    const hint = document.querySelector(".review-editor-hint");
    if (hint) {
      hint.innerHTML = `<strong>${bottleCount()}</strong> bottles — edit names, move stations, change sizes, or delete rows. Saves automatically.`;
    }
  });

  document.getElementById("btnReviewAddConfirm")?.addEventListener("click", () => addReviewBottle());
}

async function renderReview() {
  barState = normalizeBar(await OSB.getBar());
  const nameEl = document.getElementById("reviewBarName");
  if (nameEl) nameEl.textContent = barState.name || "your bar";

  const statsEl = document.getElementById("reviewStats");
  if (statsEl) {
    const cats = new Set(allBottles().map((b) => b.category));
    const activeStations = sortedStations().filter((s) => (s.bottles || []).length).length;
    statsEl.innerHTML = `
      <div class="stat-card"><div class="stat-num">${activeStations}</div><div class="stat-lbl">Stations</div></div>
      <div class="stat-card"><div class="stat-num">${bottleCount()}</div><div class="stat-lbl">Bottles</div></div>
      <div class="stat-card"><div class="stat-num">${cats.size}</div><div class="stat-lbl">Categories</div></div>
    `;
  }
  renderReviewEditor();
  fillReviewAddStationSelect();
  bindReviewEditorListeners();
  if (isMapToolkitOpen()) renderMapDigitalView();
}

function renderReconcilePreview() {
  const el = document.getElementById("reconcilePreview");
  if (!el) return;
  el.innerHTML = `
    <div class="reconcile-stat-row">
      <span><strong>${sortedStations().length}</strong> stations</span>
      <span><strong>${bottleCount()}</strong> bottles mapped</span>
    </div>
    <p class="field-hint">Run reconciliation to build the full audit report.</p>
  `;
  setReconcileNextEnabled(false);
  setReconcileToolkitVisible(false);
}

async function runReconciliation({ quiet = false } = {}) {
  if (!quiet) setStatus("Reconciling your walk…");
  await persistBar();
  const result = await OSB.reconcile();
  renderStationAuditReport("reconcilePreview");
  const renameBars = await loadAllBarsForRename();
  renderReconcileBarRename(renameBars.length ? renameBars : allBars);
  setReconcileToolkitVisible(true);
  const rb = document.getElementById("btnReconcile");
  if (rb) rb.textContent = "Re-run reconciliation";
  setReconcileNextEnabled(true);
  if (!quiet) {
    setStatus("Report ready — audit below, then Print / Download MAP for CSV, Excel, or XML.");
  }
  return result;
}

async function initReconcileStep(data) {
  allBars = data.bars || [];
  await refreshWalkReviewBars();
  const renameBars = await loadAllBarsForRename();
  renderReconcileBarRename(renameBars.length ? renameBars : allBars);

  if (bottleCount() === 0 && !data.state?.voice_notes_count) {
    renderReconcilePreview();
    return;
  }
  if (data.state?.has_draft_map) {
    renderStationAuditReport("reconcilePreview");
    setReconcileToolkitVisible(true);
    const rb = document.getElementById("btnReconcile");
    if (rb) rb.textContent = "Re-run reconciliation";
    setReconcileNextEnabled(true);
    return;
  }
  try {
    await runReconciliation({ quiet: true });
    setStatus("Reconciliation complete — audit your map below, then continue.");
  } catch (e) {
    renderReconcilePreview();
    setStatus(e.message);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setWalkView(parsed) {
  walkParsed = parsed;
  document.getElementById("walkUnparsed")?.classList.toggle("hidden", parsed);
  document.getElementById("walkParsed")?.classList.toggle("hidden", !parsed);
  if (parsed) {
    updateWalkSummary();
    renderWalkReview();
    updateWalkContinueButton();
  }
}

function toggleManual(show) {
  document.getElementById("manualAddBox")?.classList.toggle("hidden", !show);
  if (show) fillManualStationSelect();
}

function addManualBottle() {
  const name = document.getElementById("manualBottleName")?.value?.trim();
  const stationId = document.getElementById("manualBottleStation")?.value;
  const category = document.getElementById("manualBottleCategory")?.value || "spirits";
  if (!name || !stationId) return;
  const station = barState.stations.find((s) => s.id === stationId);
  if (!station) return;
  if (!station.bottles) station.bottles = [];
  station.bottles.push({
    id: uid(),
    name,
    raw_heard: name,
    category,
    size: "750ml",
    size_verified: true,
    par_level: 1.0,
    current_level: 1.0,
    cost: 0,
  });
  document.getElementById("manualBottleName").value = "";
  if (!barState.setup) barState.setup = {};
  if (!barState.setup.walk_review_status) barState.setup.walk_review_status = "pending";
  setWalkView(true);
  toggleManual(true);
  renderWalkReview();
  updateWalkContinueButton();
}

/* ── Setup (caterpillar) ── */

async function initSetup() {
  const data = await OSB.getState();
  if (data.phase === "butterfly" && !data.config.setup_bar_id) {
    window.location.href = "/home";
    return;
  }

  renderStepIndicator(data.phases, data.phase);
  renderPhaseRail(data.phases, data.phase);
  showOnly(data.phase);

  const cfg = data.config;
  const cycleEl = document.getElementById("cycleMode");
  if (cycleEl) {
    cycleEl.value =
      cfg.cycle?.mode === "monthly" || cfg.cycle?.interval_days === 30 ? "monthly" : "weekly";
  }

  const voiceNotes = document.getElementById("voiceNotes");
  if (voiceNotes && data.state?.voice_notes_text) voiceNotes.value = data.state.voice_notes_text;

  barState = normalizeBar(await OSB.getBar(false));
  if (cfg.bar_name && !barState.name) barState.name = cfg.bar_name;

  if (data.phase === "build_bar") {
    allBars = data.bars || [];
    renderBuildBarTabs(allBars, barState.id || cfg.setup_bar_id);
    renderStationList();
  }
  if (data.phase === "voice_walk") {
    await initWalkStep(data);
  }
  if (data.phase === "reconcile") await initReconcileStep(data);
  if (data.phase === "map_review") {
    if (!data.state?.has_draft_map && bottleCount() > 0) {
      try {
        await runReconciliation({ quiet: true });
      } catch (e) {
        setStatus(e.message);
      }
    }
    await renderReview();
  }
  if (data.phase === "first_count") {
    await initCountStep(data);
    updateFirstCountDoneButton();
    updateCountStickyBar();
  }

  if (data.phase === "welcome") refreshWelcomeAiPanel(cfg);

  fillReviewAddSizeSelect();
  bindWalkReviewListeners();

  if (setupListenersBound) return;
  setupListenersBound = true;

  document.body.addEventListener("click", async (e) => {
    const goBtn = e.target.closest("[data-go]");
    if (!goBtn || document.body.dataset.app !== "setup") return;
    try {
      await persistBar();
      await OSB.goPhase(goBtn.dataset.go);
      setStatus("");
      await initSetup();
    } catch (err) {
      setStatus(err.message);
    }
  });

  document.body.addEventListener("click", async (e) => {
    const rBtn = e.target.closest("[data-hard-reset]");
    if (!rBtn || document.body.dataset.app !== "setup") return;
    const ok = window.confirm(
      "Hard reset wipes this bar and all setup progress and returns you to Welcome.\n\nYour current data is backed up automatically. Continue?"
    );
    if (!ok) return;
    try {
      rBtn.disabled = true;
      resetCoachingClientState();
      await OSB.hardReset();
      setStatus("");
      await initSetup();
    } catch (err) {
      rBtn.disabled = false;
      setStatus(err.message);
    }
  });

  document.getElementById("btnWelcomeNext")?.addEventListener("click", async () => {
    await OSB.skipAi();
    await OSB.advancePhase("name_bar");
    await initSetup();
  });

  document.getElementById("btnWelcomeSkipAi")?.addEventListener("click", async () => {
    const keyInput = document.getElementById("welcomeApiKey");
    if (keyInput) keyInput.value = "";
    await OSB.skipAi();
    await OSB.advancePhase("name_bar");
    await initSetup();
  });

  document.getElementById("btnWelcomeSaveAi")?.addEventListener("click", async () => {
    const provider = document.getElementById("welcomeAiProvider")?.value;
    const key = document.getElementById("welcomeApiKey")?.value?.trim();
    if (!provider || !key) {
      setStatus("Select a provider and paste an API key — or use Skip / Begin without AI.");
      return;
    }
    const res = await OSB.saveConfig({ ai_provider: provider, ai_api_key: key });
    if (res.error) {
      setStatus(res.error);
      return;
    }
    const keyInput = document.getElementById("welcomeApiKey");
    if (keyInput) keyInput.value = "";
    await OSB.advancePhase("name_bar");
    await initSetup();
  });

  document.getElementById("btnNameContinue")?.addEventListener("click", async () => {
    const cycleMode =
      document.getElementById("cycleMode")?.value === "monthly" ? "monthly" : "weekly";
    await OSB.saveConfig({
      cycle:
        cycleMode === "monthly"
          ? { mode: "monthly", anchor: "first-of-month", interval_days: 30 }
          : { mode: "weekly", anchor_day: "monday", interval_days: 7 },
    });

    const listed = await OSB.listBars();
    if (!listed.bars?.length) {
      await OSB.createBar("", true);
    }

    await OSB.advancePhase("voice_walk");
    await initSetup();
  });

  document.getElementById("btnDeleteBar")?.addEventListener("click", async () => {
    if (!barState.id) return;
    const bar = { id: barState.id, name: barState.name || defaultBarLabel(barState.id) };
    if (!(await confirmDeleteBar(bar, allBars.length || 1))) return;
    try {
      await OSB.deleteBar(barState.id);
      setStatus(allBars.length <= 1 ? "Bar deleted — fresh starter created." : "Bar deleted.");
      await initSetup();
    } catch (e) {
      setStatus(e.message);
    }
  });

  document.getElementById("btnCreateAdditionalBar")?.addEventListener("click", async () => {
    try {
      await persistBar();
      const nextNum = (allBars.length || 0) + 1;
      await OSB.createBar(`Bar ${nextNum}`, true);
      barState = normalizeBar(await OSB.getBar(false));
      editingStationId = null;
      const data = await OSB.getState();
      allBars = data.bars || [];
      renderBuildBarTabs(allBars, barState.id);
      renderStationList();
      setStatus(`Bar ${nextNum} created — add stations or return to the walk step.`);
    } catch (e) {
      setStatus(e.message);
    }
  });

  document.getElementById("btnAddStation")?.addEventListener("click", () => addStation());
  document.getElementById("newStationName")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addStation();
  });

  document.getElementById("btnResetTemplates")?.addEventListener("click", async () => {
    if (!confirm("Replace your station list with the starter templates? Bottles on matching names are kept.")) return;
    try {
      const res = await OSB.resetTemplates();
      barState = normalizeBar(res.bar);
      editingStationId = null;
      renderStationList();
      setStatus("Starter templates restored.");
    } catch (e) {
      setStatus(e.message);
    }
  });

  document.getElementById("btnBuildContinue")?.addEventListener("click", async () => {
    if (sortedStations().length === 0) {
      setStatus("Your walk should have created at least one station — add one if needed.");
      return;
    }
    const name = barState.name?.trim() || defaultBarLabel(barState.id);
    barState.name = name;
    if (!barState.setup) barState.setup = {};
    barState.setup.stations_reviewed = true;
    await persistBar({ stations_reviewed: true });
    await OSB.saveConfig({ bar_name: name });
    await OSB.advancePhase("map_review");
    await initSetup();
  });

  document.getElementById("voiceNotes")?.addEventListener("input", scheduleWalkParse);

  document.getElementById("btnUploadFiles")?.addEventListener("click", () => {
    openWalkFilePicker("append");
  });

  document.getElementById("btnAddMoreWalkFiles")?.addEventListener("click", () => {
    openWalkFilePicker("append");
  });

  document.getElementById("btnReplaceWalkFiles")?.addEventListener("click", () => {
    const ok = window.confirm(
      "Replace all walk notes with a new upload? Your current draft map will be rebuilt from the new files."
    );
    if (!ok) return;
    const voiceNotes = document.getElementById("voiceNotes");
    if (voiceNotes) voiceNotes.value = "";
    lastParsedWalkText = "";
    openWalkFilePicker("replace");
  });

  document.getElementById("btnParsePasted")?.addEventListener("click", async () => {
    const text = document.getElementById("voiceNotes")?.value?.trim();
    if (!text) {
      setStatus("Paste your walk notes in the box first, or use Upload files here.");
      return;
    }
    try {
      await processWalkNotes(text);
    } catch (e) {
      setStatus(e.message);
    }
  });

  document.getElementById("voiceNotesFile")?.addEventListener("change", async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    try {
      await ingestWalkFiles(files, walkFileUploadMode);
    } catch (err) {
      setStatus(err.message || `Could not read that file — try ${WALK_NOTES_ACCEPT_LABEL}.`);
    }
    e.target.value = "";
    walkFileUploadMode = "append";
  });

  document.getElementById("btnReparse")?.addEventListener("click", () => {
    openWalkFilePicker("append");
  });

  document.getElementById("btnVoiceDraft")?.addEventListener("click", async () => {
    try {
      await saveWalkDraft();
      setStatus(`Draft saved for ${barState.name || "this bar"}.`);
    } catch (e) {
      setStatus(e.message);
    }
  });

  document.getElementById("btnToggleManual")?.addEventListener("click", () => {
    const box = document.getElementById("manualAddBox");
    toggleManual(box?.classList.contains("hidden"));
  });
  document.getElementById("btnToggleManual2")?.addEventListener("click", () => toggleManual(true));
  document.getElementById("btnManualBottle")?.addEventListener("click", () => addManualBottle());

  document.getElementById("btnWalkContinue")?.addEventListener("click", async () => {
    if (!walkReviewIsComplete()) {
      const remaining = walkUnverifiedCount();
      if (remaining && scrollToFirstUnverifiedWalkRow()) {
        setStatus(
          remaining === 1
            ? "1 row still needs the OK checkbox — we scrolled to it. Or use “I've checked every size” / Continue with defaults."
            : `${remaining} rows still need the OK checkbox — we scrolled to the first one.`
        );
      } else {
        setStatus("Upload or paste notes, or add bottles manually, then review before continuing.");
      }
      return;
    }
    const text = document.getElementById("voiceNotes")?.value?.trim();
    if (text) await OSB.uploadVoiceNotes(text);
    await refreshWalkReviewBars();
    const totalBottles =
      walkReviewBars.length > 1 ? allBottlesForReview().length : bottleCount();
    if (totalBottles === 0 && !text) {
      setStatus("Upload notes or add at least one bottle before continuing.");
      return;
    }
    await persistBar();

    await OSB.advancePhase("reconcile");
    await initSetup();
  });

  document.getElementById("reconcileBarRenameActive")?.addEventListener("input", () => {
    syncReconcileRenameDraftFromInput();
  });

  document.getElementById("reconcileBarRenameActive")?.addEventListener(
    "change",
    async (e) => {
      try {
        syncReconcileRenameDraftFromInput();
        const barId = e.target.dataset.barId;
        const name = e.target.value.trim();
        if (barId && name) await saveBarDisplayName(barId, name);
      } catch (err) {
        setStatus(err.message);
      }
    }
  );

  document.getElementById("btnReconcileBarPrev")?.addEventListener("click", () => {
    syncReconcileRenameDraftFromInput();
    if (reconcileRenameIndex > 0) {
      reconcileRenameIndex -= 1;
      updateReconcileBarRenameStepper();
    }
  });

  document.getElementById("btnReconcileBarNext")?.addEventListener("click", () => {
    syncReconcileRenameDraftFromInput();
    if (reconcileRenameIndex < reconcileRenameBars.length - 1) {
      reconcileRenameIndex += 1;
      updateReconcileBarRenameStepper();
    }
  });

  document.getElementById("btnReconcileNext")?.addEventListener("click", async () => {
    try {
      await saveReconcileBarNames();
    } catch (err) {
      setStatus(err.message);
    }
  });

  document.getElementById("btnReconcile")?.addEventListener("click", async () => {
    try {
      await runReconciliation();
    } catch (e) {
      setStatus(e.message);
      setReconcileNextEnabled(false);
    }
  });

  document.getElementById("btnOpenMapToolkit")?.addEventListener("click", () => {
    setMapToolkitOpen(!isMapToolkitOpen(), "btnOpenMapToolkit");
    setStatus("");
  });

  document.getElementById("btnOpenReconcileToolkit")?.addEventListener("click", () => {
    setMapToolkitOpen(!isMapToolkitOpen(), "btnOpenReconcileToolkit");
    setStatus("");
  });

  document.getElementById("btnMapModalClose")?.addEventListener("click", () => setMapToolkitOpen(false));
  document.getElementById("btnMapModalCloseBackdrop")?.addEventListener("click", () => setMapToolkitOpen(false));

  document.getElementById("btnMapCopy")?.addEventListener("click", async () => {
    await copyMapToClipboard();
  });

  document.getElementById("btnMapPrint")?.addEventListener("click", async () => {
    await persistBar();
    const btn = document.getElementById("btnMapPrint");
    if (printMapSheet()) {
      showMapToolkitFeedback("Print dialog opening — choose printer or Save as PDF.", btn, "Opening print…");
    }
  });

  document.querySelectorAll(".map-export-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const format = e.currentTarget.dataset.format;
      if (!format) return;
      await downloadMapExport(format, e.currentTarget);
    });
  });

  document.getElementById("btnMapDigitalAdd")?.addEventListener("click", () => {
    setMapToolkitOpen(false);
    toggleReviewAddBox(true);
    document.getElementById("reviewAddName")?.focus();
    document.getElementById("reviewAddBox")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setStatus("Add a missed product — it lands in the map and every download updates.");
  });

  document.getElementById("btnApproveMap")?.addEventListener("click", async () => {
    await persistBar();
    await OSB.approveMap();
    await OSB.advancePhase("first_count");
    await initSetup();
  });

  document.getElementById("btnCountReminders")?.addEventListener("click", () => {
    const panel = document.getElementById("countRemindersPanel");
    const btn = document.getElementById("btnCountReminders");
    if (!panel || !btn) return;
    const show = panel.classList.contains("hidden");
    panel.classList.toggle("hidden", !show);
    btn.setAttribute("aria-expanded", show ? "true" : "false");
    btn.textContent = show ? "Hide best practices" : "Best practices";
  });

  document.getElementById("btnEnterCount")?.addEventListener("click", () => {
    const panel = document.getElementById("countEntryPanel");
    const reminders = document.getElementById("countRemindersPanel");
    const reminderBtn = document.getElementById("btnCountReminders");
    if (!panel) return;
    const open = panel.classList.contains("hidden");
    setCountEntryOpen(open);
    if (open) {
      reminders?.classList.add("hidden");
      if (reminderBtn) {
        reminderBtn.setAttribute("aria-expanded", "false");
        reminderBtn.textContent = "Best practices";
      }
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      document.getElementById("countNotes")?.focus();
    }
    setStatus("");
  });

  document.getElementById("countNotes")?.addEventListener("input", scheduleCountParse);

  document.getElementById("btnUploadCountFiles")?.addEventListener("click", () => {
    openCountFilePicker("append");
  });

  document.getElementById("btnUploadCount")?.addEventListener("click", () => {
    openCountFilePicker("append");
  });

  document.getElementById("btnProcessCount")?.addEventListener("click", () => handleProcessCountClick());
  document.getElementById("btnProcessSticky")?.addEventListener("click", () => handleProcessCountClick());

  document.getElementById("btnAddMoreCountFiles")?.addEventListener("click", () => {
    openCountFilePicker("append");
  });

  document.getElementById("btnReplaceCountFiles")?.addEventListener("click", () => {
    const ok = window.confirm(
      "Replace all count notes with a new upload? Your current count draft will be rebuilt from the new files."
    );
    if (!ok) return;
    const countNotes = document.getElementById("countNotes");
    if (countNotes) countNotes.value = "";
    lastParsedCountText = "";
    clearCountReconcileReport();
    openCountFilePicker("replace");
  });

  document.getElementById("countNotesFile")?.addEventListener("change", async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    try {
      await ingestCountFiles(files, countFileUploadMode);
    } catch (err) {
      setStatus(err.message || `Could not read that file — try ${WALK_NOTES_ACCEPT_LABEL}.`);
    }
    e.target.value = "";
    countFileUploadMode = "append";
  });

  document.getElementById("btnRecount")?.addEventListener("click", () => {
    openCountFilePicker("append");
  });



  document.getElementById("countReviewTable")?.addEventListener("change", async (e) => {
    const input = e.target.closest(".count-level-input");
    if (!input) return;
    const bottle = findBottleRecord(input.dataset.bottle, input.dataset.station);
    if (!bottle) return;
    bottle.current_level = parseFloat(input.value) || 0;
    updateFirstCountDoneButton();
  });

  document.getElementById("countReviewTable")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-count-fix]");
    if (!btn) return;
    const action = btn.dataset.countFix;

    if (action === "mark-counted") {
      const bottle = findBottleRecord(btn.dataset.bottle, btn.dataset.station);
      if (!bottle) return;
      const row = btn.closest("tr");
      const levelInput = row?.querySelector(".count-gap-level, .count-level-input");
      bottle.current_level = parseFloat(levelInput?.value) || bottle.current_level || 1;
      bottle.count_matched = true;
      bottle.count_variance = "matched";
      bottle.count_manual_resolved = true;
      await refreshCountReconcileAfterFix();
      setStatus(`Marked ${bottle.name} as counted at ${bottle.current_level}.`);
      return;
    }

    if (action === "remove-map") {
      const bottle = findBottleRecord(btn.dataset.bottle, btn.dataset.station);
      const name = bottle?.name || "Bottle";
      if (!removeBottleFromMap(btn.dataset.bottle, btn.dataset.station)) return;
      await refreshCountReconcileAfterFix();
      setStatus(`Removed ${name} from your map — not on shelf.`);
      return;
    }

    if (action === "dismiss-surprise") {
      const idx = parseInt(btn.dataset.surpriseIdx, 10);
      const surprise = lastCountReconcile?.surprises?.[idx];
      if (!surprise) return;
      countDismissedSurpriseKeys.add(countEntryKey(surprise.entry));
      await refreshCountReconcileAfterFix();
      setStatus(`Ignored "${surprise.entry.name}" from your count notes.`);
      return;
    }

    if (action === "add-surprise") {
      const idx = parseInt(btn.dataset.surpriseIdx, 10);
      const surprise = lastCountReconcile?.surprises?.[idx];
      if (!surprise) return;
      const added = addBottleFromCountSurprise(surprise);
      if (!added) {
        setStatus("Could not add bottle — pick a station in the map editor.");
        return;
      }
      await refreshCountReconcileAfterFix();
      setStatus(`Added ${added.name} to your map at level ${added.current_level}.`);
    }
  });

  document.getElementById("btnToggleCountMap")?.addEventListener("click", () => {
    countShowFullMap = !countShowFullMap;
    renderCountReview();
  });

  document.getElementById("countReconcileReport")?.addEventListener("click", async (e) => {
    const exportBtn = e.target.closest(".count-export-btn");
    if (exportBtn) {
      await downloadCountComparison(exportBtn.dataset.format || "csv", exportBtn);
      return;
    }
    if (e.target.closest("#btnCountComparisonPrint")) {
      if (!lastCountReconcile) return;
      const html = buildCountComparisonPrintHtml(lastCountReconcile);
      const win = window.open("", "_blank");
      if (!win) {
        setStatus("Allow pop-ups to print the comparison report.");
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      window.setTimeout(() => {
        try {
          win.print();
        } catch {
          setStatus("Print window opened — use File → Print or Save as PDF.");
        }
      }, 400);
      return;
    }
    if (e.target.closest("#btnCountComparisonCopy")) {
      if (!lastCountReconcile) return;
      const text = buildCountComparisonPlainText(lastCountReconcile);
      const ok = await copyTextToClipboard(text);
      const btn = document.getElementById("btnCountComparisonCopy");
      if (ok) showMapToolkitFeedback("✓ Copied — paste into Notes or email.", btn, "✓ Copied");
      else setStatus("Could not copy — download CSV instead.");
      return;
    }
    if (!e.target.closest("#btnGoReconcileMap")) return;
    await persistBar();
    await OSB.advancePhase("map_review");
    await initSetup();
    setStatus("Review your map — add surprises, remove what's gone, then come back to Count.");
  });

  document.getElementById("btnFirstCountDone")?.addEventListener("click", () => finishFirstCount());
  document.getElementById("btnTallyFinish")?.addEventListener("click", () => finishFirstCount());
  document.getElementById("btnEditCount")?.addEventListener("click", () => resetCountForReupload());
}

/* ── Home base (butterfly) ── */

function apiStatusLabel(status) {
  const map = {
    "not-started": "Off — program runs without it",
    connected: "On — invoice photos enabled",
    skipped: "Off — type numbers yourself",
    "needs-key": "Off — paste key to enable photos",
  };
  return map[status] || status || "Unknown";
}

function refreshWelcomeAiPanel(cfg) {
  const statusEl = document.getElementById("welcomeAiStatus");
  const provEl = document.getElementById("welcomeAiProvider");
  if (!statusEl && !provEl) return;
  const connected = cfg?.api_connection_status === "connected" || cfg?.ai_api_key_set;
  if (statusEl) {
    if (connected) {
      const prov = cfg?.ai_provider || "AI";
      statusEl.innerHTML = `<span class="invoice-ai-ok">Connected (${escapeHtml(prov)})</span> — invoice photos will work in All inputs. You can still skip and add more keys later in Settings.`;
    } else if (cfg?.api_connection_status === "skipped") {
      statusEl.textContent = "AI skipped — the full program still runs. Add a key later in Settings if you want invoice photos.";
    } else {
      statusEl.textContent = "Leave the key blank to run the full program without AI. Connect only for invoice photos.";
    }
  }
  if (provEl && cfg?.ai_provider) provEl.value = cfg.ai_provider;
}

function apiStatusClass(status) {
  if (status === "connected") return "status-badge ok";
  if (status === "skipped") return "status-badge warn";
  return "status-badge muted";
}

function switchAdminView(name) {
  document.querySelectorAll(".admin-view").forEach((v) => {
    v.classList.toggle("hidden", v.dataset.view !== name);
    v.classList.toggle("active", v.dataset.view === name);
  });
  document.querySelectorAll(".sidebar-link").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === name);
  });
}

function fillMetricsSelect(selectEl, windows, value) {
  if (!selectEl) return;
  selectEl.innerHTML = (windows || [])
    .map((w) => `<option value="${w}">${w.replace(/_/g, " ")}</option>`)
    .join("");
  if (value) selectEl.value = value;
}

async function loadMetrics() {
  const windowSel = document.getElementById("metricsWindow");
  const from = document.getElementById("metricsFrom")?.value || "";
  const to = document.getElementById("metricsTo")?.value || "";
  const m = await OSB.getMetrics(windowSel?.value || "current_cycle", from, to);

  const grid = document.getElementById("metricsGrid");
  if (!grid) return;

  const s = m.summary || {};
  grid.innerHTML = `
    <div class="metric metric-hero"><div class="num">${s.bottle_count ?? "—"}</div><div class="lbl">SKUs on map</div></div>
    <div class="metric metric-hero"><div class="num">${s.station_count ?? "—"}</div><div class="lbl">Stations</div></div>
    <div class="metric"><div class="num">${s.total_units ?? "—"}</div><div class="lbl">Units on hand</div></div>
    <div class="metric${s.items_below_par > 0 ? " metric-warn" : ""}"><div class="num">${s.items_below_par ?? "—"}</div><div class="lbl">Below par</div></div>
    <div class="metric metric-accent"><div class="num">${m.cycles_total ?? m.cycles_in_window ?? "—"}</div><div class="lbl">Cycles logged</div></div>
    <div class="metric"><div class="num">${s.pos_uploads ?? "—"}</div><div class="lbl">POS drops</div></div>
  `;

  let analytics = null;
  try {
    analytics = await OSB.getAnalytics();
  } catch {
    analytics = null;
  }
  renderDashboardHero(m, analytics);

  const bounds = document.getElementById("metricsBounds");
  if (bounds && m.bounds) {
    const last = m.last_inventory_at ? ` · Last count ${m.last_inventory_at.slice(0, 10)}` : "";
    bounds.textContent = `Window: ${m.bounds.period_start} → ${m.bounds.period_end}${last}`;
  }

  const notes = document.getElementById("metricsNotes");
  if (notes) notes.textContent = s.notes || "";

  renderFirstWeekPanel(m.first_week);
}

function renderDashboardHero(metrics, analytics) {
  const hero = document.getElementById("dashboardHero");
  if (!hero) return;
  const cycles = metrics?.cycles_total ?? metrics?.cycles_in_window ?? 0;
  const bottles = metrics?.summary?.bottle_count ?? analytics?.bottle_count ?? 0;
  const value = analytics?.total_value ?? 0;
  const barName = analytics?.bar_name || "Your bar";

  if (!cycles && !bottles) {
    hero.classList.add("hidden");
    return;
  }

  hero.classList.remove("hidden");
  const cycleLabel = cycles ? `Cycle ${cycles}` : "Cycle 1";
  document.getElementById("dashboardHeroCycle")?.replaceChildren(document.createTextNode(cycleLabel));
  document.getElementById("dashboardHeroTitle")?.replaceChildren(
    document.createTextNode(`${barName} — inventory live`)
  );
  const sub = analytics?.last_count_at
    ? `Last count ${analytics.last_count_at.slice(0, 10)} · ${bottles} SKUs tracked`
    : `${bottles} SKUs on your map — spreadsheets and analytics ready`;
  document.getElementById("dashboardHeroSub")?.replaceChildren(document.createTextNode(sub));

  const statsEl = document.getElementById("dashboardHeroStats");
  if (statsEl) {
    const wow = analytics?.week_over_week?.length ?? 0;
    statsEl.innerHTML = `
      <div class="dashboard-hero-stat"><span class="dashboard-hero-stat-num">${bottles}</span><span class="dashboard-hero-stat-lbl">SKUs</span></div>
      <div class="dashboard-hero-stat"><span class="dashboard-hero-stat-num">$${value.toFixed(0)}</span><span class="dashboard-hero-stat-lbl">Est. value</span></div>
      <div class="dashboard-hero-stat"><span class="dashboard-hero-stat-num">${analytics?.below_par ?? metrics?.summary?.items_below_par ?? 0}</span><span class="dashboard-hero-stat-lbl">Below par</span></div>
      <div class="dashboard-hero-stat"><span class="dashboard-hero-stat-num">${wow || "—"}</span><span class="dashboard-hero-stat-lbl">WoW changes</span></div>
    `;
  }
}

function renderFirstWeekPanel(firstWeek) {
  const summary = document.getElementById("firstWeekSummary");
  const grid = document.getElementById("firstWeekGrid");
  if (!summary || !grid) return;
  if (!firstWeek) {
    summary.textContent = "Complete your first count to lock the week-one baseline.";
    grid.innerHTML = "";
    return;
  }
  const s = firstWeek.summary || {};
  const cats = firstWeek.categories || {};
  summary.textContent = `Cycle ${firstWeek.cycle_number || 1} locked ${(firstWeek.completed_at || "").slice(0, 10)} · ${firstWeek.period_start} → ${firstWeek.period_end}`;
  grid.innerHTML = `
    <div class="metric"><div class="num">${s.bottles ?? "—"}</div><div class="lbl">Bottles counted</div></div>
    <div class="metric"><div class="num">${s.stations ?? "—"}</div><div class="lbl">Stations</div></div>
    <div class="metric"><div class="num">${cats.liquor?.sku_count ?? "—"}</div><div class="lbl">Liquor SKUs</div></div>
    <div class="metric"><div class="num">${cats.beer?.sku_count ?? "—"}</div><div class="lbl">Beer SKUs</div></div>
    <div class="metric"><div class="num">${cats.wine?.sku_count ?? "—"}</div><div class="lbl">Wine SKUs</div></div>
    <div class="metric"><div class="num">${s.below_par ?? "—"}</div><div class="lbl">Below par at lock</div></div>
  `;
}

const ANALYTICS_COLORS = ["#B87333", "#4ECDC4", "#722F37", "#D4A847", "#8B5E3C", "#6B9B8A"];

function costGaugeSvg(costPct) {
  const clamped = Math.min(Math.max(costPct, 0), 60);
  const startAngle = Math.PI;
  const needleAngle = startAngle - (clamped / 60) * Math.PI;
  const cx = 140;
  const cy = 130;
  const radius = 100;
  const innerRadius = 70;

  function arcPath(startDeg, endDeg) {
    const s1 = startAngle - (startDeg / 60) * Math.PI;
    const e1 = startAngle - (endDeg / 60) * Math.PI;
    const x1 = cx + radius * Math.cos(s1);
    const y1 = cy - radius * Math.sin(s1);
    const x2 = cx + radius * Math.cos(e1);
    const y2 = cy - radius * Math.sin(e1);
    const x3 = cx + innerRadius * Math.cos(e1);
    const y3 = cy - innerRadius * Math.sin(e1);
    const x4 = cx + innerRadius * Math.cos(s1);
    const y4 = cy - innerRadius * Math.sin(s1);
    const largeArc = endDeg - startDeg > 30 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  }

  const nx = cx + 85 * Math.cos(needleAngle);
  const ny = cy - 85 * Math.sin(needleAngle);
  const zone =
    costPct <= 18
      ? { text: "Low", color: "#D4A847" }
      : costPct <= 24
        ? { text: "Target", color: "#4ECDC4" }
        : costPct <= 32
          ? { text: "Warning", color: "#D4A847" }
          : { text: "Danger", color: "#722F37" };

  return `
    <div class="analytics-gauge-wrap">
      <svg viewBox="0 0 280 160" class="analytics-gauge-svg" aria-hidden="true">
        <path d="${arcPath(32, 60)}" fill="#722F37" opacity="0.7" />
        <path d="${arcPath(24, 32)}" fill="#D4A847" opacity="0.7" />
        <path d="${arcPath(18, 24)}" fill="#4ECDC4" opacity="0.8" />
        <path d="${arcPath(0, 18)}" fill="#D4A847" opacity="0.4" />
        <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="var(--cream)" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="${cx}" cy="${cy}" r="6" fill="var(--copper)" />
        <text x="${cx}" y="${cy + 25}" text-anchor="middle" fill="var(--cream)" font-size="22" font-family="serif">${costPct.toFixed(1)}%</text>
      </svg>
      <span class="analytics-zone-label" style="color:${zone.color}">${zone.text} Zone</span>
    </div>`;
}

function horizontalBars(items, valueKey = "value") {
  if (!items?.length) return `<p class="field-hint">No data yet.</p>`;
  const max = Math.max(...items.map((i) => i[valueKey] || 0), 1);
  return items
    .map((item, i) => {
      const pct = Math.round(((item[valueKey] || 0) / max) * 100);
      const color = ANALYTICS_COLORS[i % ANALYTICS_COLORS.length];
      const label = item.name || item.label || "";
      const val = item[valueKey] ?? 0;
      const display = typeof val === "number" && valueKey === "value" && val > 10 ? `$${val.toFixed(0)}` : val;
      return `
        <div class="analytics-bar-row">
          <span class="analytics-bar-label">${escapeHtml(label)}</span>
          <div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${pct}%;background:${color}"></div></div>
          <span class="analytics-bar-val">${display}</span>
        </div>`;
    })
    .join("");
}

function donutLegend(items) {
  if (!items?.length) return "";
  const total = items.reduce((s, i) => s + (i.value || 0), 0) || 1;
  let angle = 0;
  const stops = items
    .map((item, i) => {
      const slice = ((item.value || 0) / total) * 360;
      const color = ANALYTICS_COLORS[i % ANALYTICS_COLORS.length];
      const start = angle;
      angle += slice;
      return `${color} ${start}deg ${angle}deg`;
    })
    .join(", ");
  const legend = items
    .slice(0, 6)
    .map(
      (item, i) => `
      <div class="analytics-legend-item">
        <span class="analytics-legend-dot" style="background:${ANALYTICS_COLORS[i % ANALYTICS_COLORS.length]}"></span>
        <span>${escapeHtml(item.name)}</span>
        <span class="analytics-legend-count">${item.value}</span>
      </div>`
    )
    .join("");
  return `
    <div class="analytics-donut-wrap">
      <div class="analytics-donut" style="background:conic-gradient(${stops})"></div>
      <div class="analytics-legend">${legend}</div>
    </div>`;
}

async function loadAnalytics() {
  const root = document.getElementById("analyticsRoot");
  if (!root) return;
  try {
    const a = await OSB.getAnalytics();
    if (!a.bottle_count) {
      root.innerHTML = `<p class="field-hint">No inventory data yet — finish your first count to see analytics.</p>`;
      return;
    }

    const alerts = (a.variance_alerts || [])
      .map(
        (item) => `
      <div class="analytics-alert-row">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span class="field-hint">${escapeHtml(item.category)}</span>
        </div>
        <div class="analytics-alert-meta">
          <span class="text-wine">${item.current.toFixed(1)} / ${item.par.toFixed(1)}</span>
          <span class="field-hint">-${item.deficit.toFixed(1)} deficit</span>
        </div>
      </div>`
      )
      .join("");

    const velocity = (a.velocity || [])
      .map(
        (item) => `
      <div class="analytics-velocity-row">
        <span>${escapeHtml(item.name)}</span>
        <span class="${item.direction === "down" ? "text-wine" : "text-patina"}">
          ${item.direction === "down" ? "↓" : "↑"} ${Math.abs(item.change).toFixed(2)}
        </span>
      </div>`
      )
      .join("");

    const trends = (a.trend_data || [])
      .map(
        (t) => `
      <div class="analytics-trend-row">
        <span>${escapeHtml(t.date)}</span>
        <span>${t.items} items</span>
        <span>avg ${t.avg_level}</span>
      </div>`
      )
      .join("");

    const wowRows = (a.week_over_week || []).slice(0, 14);
    const wowTable =
      wowRows.length > 0
        ? `<table class="analytics-wow-table"><thead><tr><th>Product</th><th>Station</th><th>Was</th><th>Now</th><th>Δ</th></tr></thead><tbody>${wowRows
            .map(
              (item) => `
          <tr>
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td class="field-hint">${escapeHtml(item.station)}</td>
            <td>${item.previous_level.toFixed(2)}</td>
            <td>${item.current_level.toFixed(2)}</td>
            <td class="${item.change < 0 ? "analytics-wow-change--down" : item.change > 0 ? "analytics-wow-change--up" : ""}">${item.change >= 0 ? "+" : ""}${item.change.toFixed(2)}</td>
          </tr>`
            )
            .join("")}</tbody></table>`
        : `<p class="field-hint">Process a second count to see week-over-week reconciliation.</p>`;

    const velocityPills = (a.velocity || [])
      .slice(0, 10)
      .map(
        (item) => `
      <span class="velocity-pill velocity-pill--${item.direction === "down" ? "down" : "up"}">
        ${escapeHtml(item.name)}
        <strong>${item.direction === "down" ? "↓" : "↑"} ${Math.abs(item.change).toFixed(2)}</strong>
      </span>`
      )
      .join("");

    root.innerHTML = `
      <div class="analytics-grid">
        <div class="panel analytics-panel analytics-panel--hero">
          <div class="analytics-panel-head">
            <h2>${escapeHtml(a.bar_name || "Your bar")}</h2>
            <span class="analytics-total">$${(a.total_value || 0).toFixed(0)} on hand</span>
          </div>
          <p class="field-hint" style="margin-bottom:14px;">${a.bottle_count || 0} SKUs · ${a.station_count || 0} stations · Cycle ${a.cycles_total || 1}${a.below_par ? ` · <span class="text-wine">${a.below_par} below par</span>` : ""}</p>
          ${horizontalBars(a.category_values)}
        </div>
        <div class="panel analytics-panel">
          <h2>Beverage cost %</h2>
          ${costGaugeSvg(a.beverage_cost_pct || 0)}
          <p class="field-hint">Target: 18–24% for spirits programs</p>
        </div>
        <div class="panel analytics-panel">
          <h2>Category mix</h2>
          ${donutLegend(a.category_distribution)}
        </div>
        <div class="panel analytics-panel">
          <h2>Variance alerts</h2>
          ${alerts || `<p class="field-hint analytics-ok">All items at or above par</p>`}
        </div>
        <div class="panel analytics-panel">
          <h2>Velocity</h2>
          <div class="velocity-pills-wrap">${velocityPills || `<p class="field-hint">Need 2+ cycles for movers.</p>`}</div>
        </div>
        <div class="panel analytics-panel">
          <h2>Count trends</h2>
          ${trends || `<p class="field-hint">Complete a count to see trends.</p>`}
        </div>
        <div class="panel analytics-panel analytics-panel-wide">
          <h2>Week over week — reconciliation</h2>
          ${wowTable}
        </div>
      </div>`;
  } catch (e) {
    root.innerHTML = `<p class="status">${escapeHtml(e.message)}</p>`;
  }
}

let workbookSheet = "count-sheet";
let workbookData = null;
let brandingLogoData = "";

function renderWorkbookTable(headers, rows, { numericFrom = 2 } = {}) {
  if (!rows.length) return `<p class="field-hint workbook-empty">No rows to show.</p>`;
  return `
    <div class="workbook-table-wrap scroll-panel">
      <table class="workbook-table review-table">
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows
            .map(
              (cells, ri) =>
                `<tr class="${ri % 2 ? "workbook-row-alt" : ""}">${cells
                  .map((c, ci) => {
                    const cls = ci >= numericFrom ? " workbook-num" : "";
                    return `<td class="${cls.trim()}">${c}</td>`;
                  })
                  .join("")}</tr>`
            )
            .join("")}
        </tbody>
      </table>
      <p class="workbook-row-count">${rows.length} row${rows.length === 1 ? "" : "s"}</p>
    </div>`;
}

function renderWorkbookStatCards(items) {
  return `
    <div class="workbook-stat-grid">
      ${items
        .map(
          ([label, value, accent]) =>
            `<div class="workbook-stat${accent ? ` workbook-stat--${accent}` : ""}"><span class="workbook-stat-num">${value}</span><span class="workbook-stat-lbl">${label}</span></div>`
        )
        .join("")}
    </div>`;
}

function renderWorkbookSheet(sheet, data) {
  if (!data?.product_rows?.length) {
    return `<p class="field-hint">No inventory data — finish your first count.</p>`;
  }

  if (sheet === "dashboard") {
    const lastCount = data.last_count_at ? escapeHtml(data.last_count_at.slice(0, 10)) : "Never";
    return `
      ${renderWorkbookStatCards([
        ["SKUs on map", String(data.bottle_count || 0), "copper"],
        ["Stations", String(data.station_count || 0), ""],
        ["Est. value", `$${(data.total_value || 0).toFixed(0)}`, "patina"],
        ["Below par", String(data.below_par || 0), data.below_par > 0 ? "warn" : ""],
        ["Cycles", String(data.cycles_total || 0), "accent"],
        ["WoW rows", String((data.week_over_week || []).length), ""],
      ])}
      <div class="workbook-meta-bar">
        <span><strong>${escapeHtml(data.bar_name || "Bar")}</strong></span>
        <span>${escapeHtml(data.cycle_label || "Inventory cycle")}</span>
        <span>Last count ${lastCount}</span>
      </div>`;
  }

  if (sheet === "product-master") {
    return renderWorkbookTable(
      ["Product", "Category", "Station", "Size", "Cost", "Pour", "Cost %"],
      data.product_rows.map((r) => [
        escapeHtml(r.name),
        escapeHtml(r.category),
        escapeHtml(r.station),
        escapeHtml(r.size),
        r.cost ? `$${r.cost.toFixed(2)}` : "—",
        r.pour_cost ? `$${r.pour_cost.toFixed(2)}` : "—",
        r.cost_pct ? `${r.cost_pct.toFixed(1)}%` : "—",
      ])
    );
  }

  if (sheet === "count-sheet") {
    const belowPar = data.product_rows.filter((r) => r.current_level < r.par_level).length;
    const rows = data.product_rows
      .map((r, ri) => {
        const under = r.current_level < r.par_level;
        return `<tr class="${under ? "row-flag" : ri % 2 ? "workbook-row-alt" : ""}" data-bottle-id="${escapeHtml(r.id || "")}" data-station-id="${escapeHtml(r.station_id || "")}">
          <td>${escapeHtml(r.station)}</td>
          <td><strong>${escapeHtml(r.name)}</strong></td>
          <td>${escapeHtml(r.size)}</td>
          <td class="workbook-num">${r.current_level.toFixed(1)}</td>
          <td class="workbook-num workbook-par-cell">
            <input type="number" class="workbook-par-input" step="0.5" min="0" data-par-bottle="${escapeHtml(r.id || "")}" data-par-station="${escapeHtml(r.station_id || "")}" value="${r.par_level.toFixed(1)}" aria-label="PAR for ${escapeHtml(r.name)}" />
          </td>
          <td class="workbook-num ${under ? "cell-neg" : ""}">${under ? "Below" : "OK"}</td>
        </tr>`;
      })
      .join("");
    return `
      <div class="workbook-par-lead">
        <p><strong>Set PARs across every SKU.</strong> This is the column your Excel system runs on — variance, below-par alerts, and next week's order list all pull from here.</p>
        <p class="field-hint">${data.product_rows.length} products · ${belowPar} below par right now</p>
      </div>
      <div class="workbook-table-wrap scroll-panel">
        <table class="workbook-table review-table workbook-par-table">
          <thead><tr><th>Station</th><th>Product</th><th>Size</th><th>Current</th><th>PAR</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="workbook-row-count">${data.product_rows.length} rows — edit PAR, then Save</p>
      </div>
      <div class="workbook-par-actions">
        <button type="button" class="btn btn-primary" id="btnSaveWorkbookPars">Save PAR changes</button>
        <span id="workbookParStatus" class="field-hint"></span>
      </div>`;
  }

  if (sheet === "week-over-week") {
    const rows = data.week_over_week || [];
    if (!rows.length) {
      return `<p class="field-hint workbook-empty">Need 2 processed counts to show week-over-week reconciliation.</p>`;
    }
    return `
      <p class="workbook-sheet-lead">${rows.length} reconciliation rows — same math you get after Process.</p>
      <div class="workbook-table-wrap scroll-panel">
        <table class="workbook-table review-table">
          <thead><tr><th>Product</th><th>Station</th><th>Previous</th><th>Current</th><th>Change</th></tr></thead>
          <tbody>
            ${rows
              .map((r, ri) => {
                const ch = r.change;
                const chCls = ch < 0 ? "cell-neg" : ch > 0 ? "cell-pos" : "";
                return `<tr class="${ri % 2 ? "workbook-row-alt" : ""}">
                  <td><strong>${escapeHtml(r.name)}</strong></td>
                  <td>${escapeHtml(r.station)}</td>
                  <td class="workbook-num">${r.previous_level.toFixed(2)}</td>
                  <td class="workbook-num">${r.current_level.toFixed(2)}</td>
                  <td class="workbook-num ${chCls}">${ch >= 0 ? "+" : ""}${ch.toFixed(2)}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
        <p class="workbook-row-count">${rows.length} rows</p>
      </div>`;
  }

  if (sheet === "variance" || sheet === "order-generator") {
    const varianceRows = data.product_rows
      .map((r) => {
        const v = r.current_level - r.par_level;
        const pct = r.par_level ? (v / r.par_level) * 100 : 0;
        const status = v > 0.05 ? "over" : v < -0.05 ? "under" : "at";
        return { ...r, variance: v, variancePct: pct, status };
      })
      .sort((a, b) => a.variance - b.variance);

    const filtered =
      sheet === "order-generator"
        ? varianceRows.filter((r) => r.status === "under")
        : varianceRows;

    if (!filtered.length) {
      return `<p class="field-hint">All products at or above par — no orders needed.</p>`;
    }

    if (sheet === "order-generator") {
      return renderWorkbookTable(
        ["Product", "Station", "Current", "Par", "Need"],
        filtered.map((r) => [
          escapeHtml(r.name),
          escapeHtml(r.station),
          r.current_level.toFixed(2),
          r.par_level.toFixed(2),
          `+${(r.par_level - r.current_level).toFixed(2)}`,
        ])
      );
    }

    return renderWorkbookTable(
      ["Product", "Station", "Current", "Par", "Variance", "Var %", "Status"],
      filtered.map((r) => [
        escapeHtml(r.name),
        escapeHtml(r.station),
        r.current_level.toFixed(2),
        r.par_level.toFixed(2),
        `${r.variance >= 0 ? "+" : ""}${r.variance.toFixed(2)}`,
        `${r.variancePct >= 0 ? "+" : ""}${r.variancePct.toFixed(0)}%`,
        r.status === "over" ? "Over" : r.status === "under" ? "Under" : "At par",
      ])
    );
  }

  return "";
}

async function loadSpreadsheets() {
  const content = document.getElementById("workbookContent");
  if (!content) return;
  try {
    workbookData = await OSB.getAnalytics();
    content.innerHTML = renderWorkbookSheet(workbookSheet, workbookData);
    bindWorkbookParSave();
  } catch (e) {
    content.innerHTML = `<p class="status">${escapeHtml(e.message)}</p>`;
  }
}

async function saveWorkbookPars() {
  const status = document.getElementById("workbookParStatus");
  const inputs = document.querySelectorAll(".workbook-par-input");
  if (!inputs.length) return;
  const parMap = new Map();
  inputs.forEach((inp) => {
    const key = `${inp.dataset.parStation}:${inp.dataset.parBottle}`;
    parMap.set(key, parseFloat(inp.value) || 0);
  });
  try {
    const bar = await OSB.getBar(false);
    let updated = 0;
    for (const station of bar.stations || []) {
      for (const bottle of station.bottles || []) {
        const key = `${station.id}:${bottle.id}`;
        if (parMap.has(key)) {
          bottle.par_level = parMap.get(key);
          updated += 1;
        }
      }
    }
    await OSB.saveBar({ stations: bar.stations });
    if (status) status.textContent = `Saved PAR on ${updated} products.`;
    workbookData = await OSB.getAnalytics();
    const content = document.getElementById("workbookContent");
    if (content && workbookSheet === "count-sheet") {
      content.innerHTML = renderWorkbookSheet(workbookSheet, workbookData);
      bindWorkbookParSave();
    }
    await loadMetrics();
    await loadAnalytics();
  } catch (e) {
    if (status) status.textContent = e.message || "Could not save PARs.";
  }
}

function bindWorkbookParSave() {
  document.getElementById("btnSaveWorkbookPars")?.addEventListener("click", () => saveWorkbookPars());
}

function businessInitials(name) {
  const parts = (name || "OSB").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "OSB";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function applyBranding(cfg) {
  const b = cfg?.branding || {};
  const businessName = b.business_name || "";
  const address = b.business_address || "";
  const panelTitle = b.panel_title || "";
  const logo = b.logo_data_url || "";
  brandingLogoData = logo;

  const welcome = document.getElementById("sidebarWelcome");
  const bizNameEl = document.getElementById("sidebarBusinessName");
  const bizAddrEl = document.getElementById("sidebarBusinessAddress");
  const markLabel = document.getElementById("sidebarMarkLabel");
  const logoImg = document.getElementById("sidebarLogoImg");
  const markDefault = document.getElementById("sidebarMarkDefault");

  const displayTitle = panelTitle || businessName || cfg?.bar_name || "Welcome back";
  if (welcome) welcome.textContent = panelTitle ? "Your panel" : businessName ? "Welcome back" : "Welcome back";
  if (bizNameEl) {
    bizNameEl.textContent = businessName || cfg?.bar_name || "";
    bizNameEl.classList.toggle("hidden", !(businessName || cfg?.bar_name));
  }
  if (bizAddrEl) {
    bizAddrEl.textContent = address;
    bizAddrEl.classList.toggle("hidden", !address);
  }
  if (markLabel) {
    markLabel.textContent = businessInitials(businessName || cfg?.bar_name || "OSB");
    markLabel.classList.toggle("hidden", !!logo);
  }
  if (logoImg && markDefault) {
    if (logo) {
      logoImg.src = logo;
      logoImg.alt = businessName || "Business logo";
      logoImg.classList.remove("hidden");
      markDefault.classList.add("hidden");
    } else {
      logoImg.removeAttribute("src");
      logoImg.classList.add("hidden");
      markDefault.classList.remove("hidden");
    }
  }
  updateBrandPreview();
}

function updateBrandPreview() {
  const name = document.getElementById("settBusinessName")?.value?.trim() || "Your business name";
  const address = document.getElementById("settBusinessAddress")?.value?.trim() || "Address line";
  const previewName = document.getElementById("brandPreviewName");
  const previewAddr = document.getElementById("brandPreviewAddress");
  const previewInitials = document.getElementById("brandPreviewInitials");
  const previewLogo = document.getElementById("brandPreviewLogo");
  if (previewName) previewName.textContent = name;
  if (previewAddr) previewAddr.textContent = address;
  if (previewInitials) {
    previewInitials.textContent = businessInitials(name);
    previewInitials.classList.toggle("hidden", !!brandingLogoData);
  }
  if (previewLogo) {
    if (brandingLogoData) {
      previewLogo.src = brandingLogoData;
      previewLogo.classList.remove("hidden");
    } else {
      previewLogo.removeAttribute("src");
      previewLogo.classList.add("hidden");
    }
  }
}

function readLogoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    if (file.size > 250_000) {
      reject(new Error("Image too large — use a file under 250KB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

async function loadInHouse() {
  const cat = document.getElementById("inhouseCategory")?.value || "all";
  const data = await OSB.getInHouse(cat);
  const note = document.getElementById("inhouseNote");
  if (note) note.textContent = data.note || "";

  const totals = document.getElementById("inhouseTotals");
  if (totals && data.totals) {
    const t = data.totals;
    totals.innerHTML = `
      <div class="metric"><div class="num">${data.item_count ?? 0}</div><div class="lbl">Products shown</div></div>
      <div class="metric"><div class="num">${t.bottles ?? 0}</div><div class="lbl">Total SKUs</div></div>
      <div class="metric"><div class="num">${t.total_units ?? 0}</div><div class="lbl">Units on hand</div></div>
      <div class="metric"><div class="num">${t.below_par ?? 0}</div><div class="lbl">Below par</div></div>
    `;
  }

  const table = document.getElementById("inhouseTable");
  if (!table) return;
  const items = data.items || [];
  if (!items.length) {
    table.innerHTML = `<p class="field-hint">No inventory lines yet — finish your first count.</p>`;
    return;
  }
  table.innerHTML = `
    <div class="workbook-table-wrap scroll-panel inhouse-table-wrap">
      <table class="workbook-table review-table">
        <thead><tr><th>Product</th><th>Station</th><th>Category</th><th>Level</th><th>Par</th></tr></thead>
        <tbody>
          ${items
            .map(
              (it, ri) => `
            <tr class="${it.below_par ? "row-flag" : ri % 2 ? "workbook-row-alt" : ""}">
              <td><strong>${escapeHtml(it.name)}</strong> <span class="field-hint">${escapeHtml(it.size || "")}</span></td>
              <td>${escapeHtml(it.station_name || "")}</td>
              <td>${escapeHtml(it.category || "")}</td>
              <td class="workbook-num">${escapeHtml(String(it.current_level ?? ""))}</td>
              <td class="workbook-num">${escapeHtml(String(it.par_level ?? ""))}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
      <p class="workbook-row-count">${items.length} products on shelf</p>
    </div>
  `;
}

let inputsLogFilter = "all";
let pendingInvoiceParse = null;

function refreshInvoiceAiStatus(cfg) {
  const el = document.getElementById("invoiceAiStatus");
  if (!el) return;
  const connected = cfg?.api_connection_status === "connected" || cfg?.ai_api_key_set;
  if (connected) {
    const prov = cfg?.ai_provider || "AI";
    el.innerHTML = `<span class="invoice-ai-ok">Optional AI on (${escapeHtml(prov)})</span> — invoice photos will be read. Text paste and typing still work without AI.`;
  } else {
    el.innerHTML = `Invoice photos need optional AI — <a href="#" data-goto="settings" class="invoice-ai-link">connect in Settings</a> or type/paste numbers yourself. The rest of the program runs without AI.`;
  }
}

function renderInvoiceParsePreview(invoice) {
  const box = document.getElementById("invoiceParsePreview");
  if (!box || !invoice) return;
  const lines = invoice.lines || [];
  if (!lines.length) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }
  const rows = lines
    .map(
      (ln, i) => `<tr class="${i % 2 ? "workbook-row-alt" : ""}">
        <td><strong>${escapeHtml(ln.product || "")}</strong></td>
        <td>${escapeHtml(ln.size || "")}</td>
        <td class="workbook-num">${ln.qty ?? ""}</td>
        <td class="workbook-num">${ln.unit_cost != null ? `$${Number(ln.unit_cost).toFixed(2)}` : "—"}</td>
        <td class="workbook-num">${ln.extended != null ? `$${Number(ln.extended).toFixed(2)}` : "—"}</td>
      </tr>`
    )
    .join("");
  box.classList.remove("hidden");
  box.innerHTML = `
    <div class="invoice-parse-head">
      <strong>${escapeHtml(invoice.vendor || "Parsed invoice")}</strong>
      <span class="field-hint">${escapeHtml(invoice.invoice_number || "")} ${escapeHtml(invoice.invoice_date || "")} · ${lines.length} lines · ${escapeHtml(invoice.parse_source || "")}</span>
    </div>
    <div class="workbook-table-wrap scroll-panel">
      <table class="workbook-table review-table">
        <thead><tr><th>Product</th><th>Size</th><th>Qty</th><th>Unit</th><th>Extended</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="actions">
      <button type="button" class="btn btn-primary" id="btnSaveParsedInvoice">Save to input log →</button>
      <button type="button" class="btn btn-ghost" id="btnDiscardInvoiceParse">Discard</button>
    </div>`;
  document.getElementById("btnSaveParsedInvoice")?.addEventListener("click", savePendingInvoiceParse);
  document.getElementById("btnDiscardInvoiceParse")?.addEventListener("click", () => {
    pendingInvoiceParse = null;
    box.classList.add("hidden");
    box.innerHTML = "";
  });
}

async function savePendingInvoiceParse() {
  if (!pendingInvoiceParse) return;
  const label = document.getElementById("invoiceLabel")?.value?.trim();
  const note = document.getElementById("invoiceNote")?.value?.trim();
  try {
    await OSB.saveParsedInvoice({
      invoice: pendingInvoiceParse,
      label: label || pendingInvoiceParse.vendor,
      note,
    });
    pendingInvoiceParse = null;
    document.getElementById("invoiceParsePreview")?.classList.add("hidden");
    document.getElementById("invoicePhoto").value = "";
    document.getElementById("invoicePaste").value = "";
    setStatus("Parsed invoice saved to input log.", "invoiceParseStatus");
    await loadInputsHub();
    await loadMetrics();
  } catch (e) {
    setStatus(e.message, "invoiceParseStatus");
  }
}

function inputTypeLabel(type) {
  return type === "invoice" ? "Invoice" : "POS";
}

function inputTypeClass(type) {
  return type === "invoice" ? "inputs-log-pill--invoice" : "inputs-log-pill--pos";
}

async function refreshInputsCyclePanel() {
  const status = document.getElementById("inputsCycleStatus");
  const badge = document.getElementById("inputsCycleBadge");
  if (!status) return;
  try {
    const data = await OSB.getState();
    const cycles = data.state?.cycles_count ?? 0;
    const next = cycles + 1;
    const barName = data.config?.bar_name || data.bar?.name || "your bar";
    if (badge) badge.textContent = cycles ? `Cycle ${next} input` : "First cycle input";
    status.textContent =
      cycles === 0
        ? `${barName} — finish your first count from setup, then return here each week.`
        : `${barName} — ${cycles} cycle${cycles === 1 ? "" : "s"} completed. Ready for cycle ${next}.`;
  } catch (e) {
    status.textContent = e.message || "Could not load cycle status.";
  }
}

async function loadInputsHub() {
  await refreshInputsCyclePanel();
  const data = await OSB.getState();
  refreshInvoiceAiStatus(data.config);
  await loadInputsLog();
}

async function loadInputsLog() {
  const list = document.getElementById("inputsLogList");
  if (!list) return;
  const data = await OSB.getPosLog();
  let entries = data.entries || [];
  if (inputsLogFilter !== "all") {
    entries = entries.filter((e) => (e.input_type || "pos") === inputsLogFilter);
  }
  if (!entries.length) {
    const hint =
      inputsLogFilter === "invoice"
        ? "No invoices staged yet — upload a vendor drop above."
        : inputsLogFilter === "pos"
          ? "No POS drops yet — upload a terminal receipt above."
          : "No inputs staged yet — add POS, invoices, or start your next count above.";
    list.innerHTML = `<p class="field-hint">${hint}</p>`;
    return;
  }
  list.innerHTML = entries
    .map((e) => {
      const type = e.input_type || "pos";
      const parsed = e.parsed_invoice;
      const parsedNote = parsed?.line_count
        ? `<span class="field-hint">${parsed.line_count} line items parsed (${escapeHtml(parsed.parse_source || "")})</span>`
        : "";
      return `
    <div class="bar-list-item inputs-log-item" data-pos-id="${escapeHtml(e.id)}">
      <div>
        <span class="inputs-log-pill ${inputTypeClass(type)}">${inputTypeLabel(type)}</span>
        <strong>${escapeHtml(e.label || inputTypeLabel(type))}</strong>
        <span class="field-hint">${escapeHtml((e.uploaded_at || "").slice(0, 16))} · ${escapeHtml(e.original_name || e.filename || "")}</span>
        ${e.note ? `<span class="field-hint">${escapeHtml(e.note)}</span>` : ""}
        ${parsedNote}
      </div>
      <button type="button" class="btn btn-ghost btn-sm btn-pos-delete" data-id="${escapeHtml(e.id)}">Remove</button>
    </div>`;
    })
    .join("");
}

async function loadPosLog() {
  await loadInputsHub();
}

function renderApiBadge(status) {
  const badge = document.getElementById("apiStatusBadge");
  if (!badge) return;
  badge.textContent = apiStatusLabel(status);
  badge.className = apiStatusClass(status);
}

async function populateSettings(cfg) {
  const barEl = document.getElementById("settBarName");
  if (barEl) barEl.value = cfg.bar_name || "";

  const b = cfg.branding || {};
  const bizName = document.getElementById("settBusinessName");
  if (bizName) bizName.value = b.business_name || "";
  const bizAddr = document.getElementById("settBusinessAddress");
  if (bizAddr) bizAddr.value = b.business_address || "";
  const panelTitle = document.getElementById("settPanelTitle");
  if (panelTitle) panelTitle.value = b.panel_title || "";
  brandingLogoData = b.logo_data_url || "";
  applyBranding(cfg);

  const labelEl = document.getElementById("settCycleLabel");
  if (labelEl) labelEl.value = cfg.cycle?.label || "Inventory cycle";

  const daysEl = document.getElementById("settCycleDays");
  if (daysEl) daysEl.value = cfg.cycle?.interval_days || 7;

  const anchorEl = document.getElementById("settAnchorDay");
  if (anchorEl) anchorEl.value = cfg.cycle?.anchor_day || "monday";

  const tzEl = document.getElementById("settTimezone");
  if (tzEl) tzEl.value = cfg.cycle?.timezone || "America/New_York";

  fillMetricsSelect(
    document.getElementById("settMetricsWindow"),
    cfg.metrics_windows,
    cfg.metrics_default_window
  );

  const provEl = document.getElementById("settAiProvider");
  if (provEl) provEl.value = cfg.ai_provider || "";

  renderApiBadge(cfg.api_connection_status);
}

function fillBarSwitcher(bars, activeId) {
  const sel = document.getElementById("barSwitcher");
  if (!sel) return;
  sel.innerHTML = bars
    .map(
      (b) =>
        `<option value="${b.id}"${b.id === activeId ? " selected" : ""}>${escapeHtml(b.name || "Unnamed bar")}</option>`
    )
    .join("");
}

async function refreshHomeBars() {
  const listed = await OSB.listBars();
  allBars = listed.bars || [];
  fillBarSwitcher(allBars, listed.active_bar_id);
  renderBarsList("settingsBarsList", allBars, listed.active_bar_id, {
    onSelect: async (barId) => {
      await OSB.switchBar(barId);
      await refreshHomeBars();
      const data = await OSB.getState();
      const cfg = data.config;
      document.getElementById("settBarName").value = cfg.bar_name || "";
      setStatus("Active bar switched.", "settingsStatus");
    },
    onSetup: async (barId) => {
      await OSB.startBarSetup(barId);
      window.location.href = "/";
    },
    onDelete: async (barId) => {
      try {
        const res = await OSB.deleteBar(barId);
        setStatus(
          res.replaced_with_fresh ? "Bar deleted — fresh starter created." : "Bar deleted.",
          "settingsStatus"
        );
        await refreshHomeBars();
        const data = await OSB.getState();
        document.getElementById("settBarName").value = data.config.bar_name || "";
        await loadMetrics();
      } catch (e) {
        setStatus(e.message, "settingsStatus");
      }
    },
  });
}

async function initHome() {
  const data = await OSB.getState();
  if (data.phase !== "butterfly") {
    window.location.href = "/";
    return;
  }
  // Only block home when a different bar is actively in caterpillar setup
  if (
    data.config.setup_bar_id &&
    data.config.setup_bar_id !== data.config.active_bar_id
  ) {
    window.location.href = "/";
    return;
  }

  const cfg = data.config;
  const cycleText =
    cfg.cycle?.mode === "monthly"
      ? `${cfg.cycle?.label || "Inventory cycle"} · monthly, starts on the 1st`
      : `${cfg.cycle?.label || "Inventory cycle"} · weekly, starts Monday`;

  document.getElementById("sidebarCycleLabel")?.replaceChildren(document.createTextNode(cycleText));
  await refreshHomeBars();

  fillMetricsSelect(
    document.getElementById("metricsWindow"),
    cfg.metrics_windows,
    cfg.metrics_default_window
  );

  await populateSettings(cfg);
  refreshInvoiceAiStatus(cfg);
  await loadMetrics();

  if (homeListenersBound) return;
  homeListenersBound = true;

  document.querySelectorAll(".sidebar-link").forEach((btn) => {
    btn.addEventListener("click", async () => {
      switchAdminView(btn.dataset.view);
      if (btn.dataset.view === "spreadsheets") await loadSpreadsheets();
      if (btn.dataset.view === "analytics") await loadAnalytics();
      if (btn.dataset.view === "inhouse") await loadInHouse();
      if (btn.dataset.view === "inputs") await loadInputsHub();
    });
  });

  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      switchAdminView(btn.dataset.goto);
      if (btn.dataset.goto === "spreadsheets") await loadSpreadsheets();
      if (btn.dataset.goto === "analytics") await loadAnalytics();
      if (btn.dataset.goto === "inhouse") await loadInHouse();
    });
  });

  document.getElementById("workbookTabs")?.addEventListener("click", async (e) => {
    const tab = e.target.closest(".workbook-tab");
    if (!tab) return;
    workbookSheet = tab.dataset.sheet || "dashboard";
    document.querySelectorAll(".workbook-tab").forEach((b) => {
      b.classList.toggle("active", b === tab);
    });
    const content = document.getElementById("workbookContent");
    if (content && workbookData) {
      content.innerHTML = renderWorkbookSheet(workbookSheet, workbookData);
      bindWorkbookParSave();
    } else {
      await loadSpreadsheets();
    }
  });

  document.getElementById("metricsWindow")?.addEventListener("change", loadMetrics);

  document.getElementById("inhouseCategory")?.addEventListener("change", loadInHouse);

  document.getElementById("btnPosUpload")?.addEventListener("click", async () => {
    const label = document.getElementById("posLabel")?.value?.trim();
    const note = document.getElementById("posNote")?.value?.trim();
    const file = document.getElementById("posFile")?.files?.[0];
    const text = document.getElementById("posPaste")?.value?.trim();
    if (!file && !text) {
      setStatus("Choose a POS file or paste receipt text.", "posStatus");
      return;
    }
    try {
      await OSB.uploadPosLog({ label, note, file, text, inputType: "pos" });
      document.getElementById("posFile").value = "";
      document.getElementById("posPaste").value = "";
      document.getElementById("posLabel").value = "";
      document.getElementById("posNote").value = "";
      setStatus("POS drop saved.", "posStatus");
      await loadInputsHub();
      await loadMetrics();
    } catch (e) {
      setStatus(e.message, "posStatus");
    }
  });

  document.querySelector('.admin-view[data-view="inputs"]')?.addEventListener("click", (e) => {
    const link = e.target.closest(".invoice-ai-link[data-goto]");
    if (link) {
      e.preventDefault();
      switchAdminView("settings");
    }
  });

  document.getElementById("btnInvoiceParse")?.addEventListener("click", async () => {
    const photo = document.getElementById("invoicePhoto")?.files?.[0];
    const file = document.getElementById("invoiceFile")?.files?.[0];
    const text = document.getElementById("invoicePaste")?.value?.trim();
    const statusEl = "invoiceParseStatus";
    const btn = document.getElementById("btnInvoiceParse");
    if (!photo && !file && !text) {
      setStatus("Add a phone photo, file, or paste invoice text first.", statusEl);
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Parsing…";
    }
    setStatus(photo ? "Sending photo to AI…" : "Parsing line items…", statusEl);
    try {
      let parseText = text;
      if (!photo && file && !text) {
        parseText = await file.text();
      }
      const res = await OSB.parseInvoice({
        imageFile: photo || null,
        text: parseText,
        useAi: !photo && !!parseText,
      });
      pendingInvoiceParse = res.invoice;
      if (!pendingInvoiceParse?.lines?.length) {
        throw new Error("No line items found — try a clearer photo or paste the invoice text.");
      }
      renderInvoiceParsePreview(pendingInvoiceParse);
      setStatus(
        `Parsed ${pendingInvoiceParse.lines.length} lines (${pendingInvoiceParse.parse_source || "ok"}) — review below, then Save.`,
        statusEl
      );
    } catch (e) {
      setStatus(e.message, statusEl);
      pendingInvoiceParse = null;
      document.getElementById("invoiceParsePreview")?.classList.add("hidden");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Parse with AI →";
      }
    }
  });

  document.getElementById("btnInvoiceUpload")?.addEventListener("click", async () => {
    const label = document.getElementById("invoiceLabel")?.value?.trim();
    const note = document.getElementById("invoiceNote")?.value?.trim();
    const file = document.getElementById("invoiceFile")?.files?.[0];
    const text = document.getElementById("invoicePaste")?.value?.trim();
    if (!file && !text) {
      setStatus("Choose an invoice file or paste invoice text.", "posStatus");
      return;
    }
    try {
      await OSB.uploadPosLog({ label, note, file, text, inputType: "invoice" });
      document.getElementById("invoiceFile").value = "";
      document.getElementById("invoicePaste").value = "";
      document.getElementById("invoiceLabel").value = "";
      document.getElementById("invoiceNote").value = "";
      setStatus("Invoice saved.", "posStatus");
      await loadInputsHub();
      await loadMetrics();
    } catch (e) {
      setStatus(e.message, "posStatus");
    }
  });

  document.getElementById("btnBeginNextInventory")?.addEventListener("click", async () => {
    const ok = window.confirm(
      "Start your next weekly inventory?\n\nYou'll go to Count (step 5) to paste your new count. Your station map and PARs stay the same — only the count is new.\n\nClick OK to open the count screen."
    );
    if (!ok) return;
    try {
      const res = await OSB.beginNextCount();
      setStatus(`Opening count for cycle ${res.next_cycle_number || ""}…`, "inputsCycleMsg");
      window.location.href = "/setup";
    } catch (e) {
      setStatus(e.message, "inputsCycleMsg");
    }
  });

  document.getElementById("inputsLogFilters")?.addEventListener("click", async (e) => {
    const btn = e.target.closest(".inputs-log-filter");
    if (!btn) return;
    inputsLogFilter = btn.dataset.logFilter || "all";
    document.querySelectorAll(".inputs-log-filter").forEach((b) => {
      b.classList.toggle("active", b === btn);
    });
    await loadInputsLog();
  });

  document.getElementById("inputsLogList")?.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-pos-delete");
    if (!btn) return;
    if (!window.confirm("Remove this POS drop?")) return;
    try {
      await OSB.deletePosLog(btn.dataset.id);
      await loadPosLog();
      await loadMetrics();
      setStatus("Input removed.", "posStatus");
    } catch (err) {
      setStatus(err.message, "posStatus");
    }
  });

  document.getElementById("barSwitcher")?.addEventListener("change", async (e) => {
    await OSB.switchBar(e.target.value);
    await refreshHomeBars();
    const fresh = await OSB.getState();
    document.getElementById("settBarName").value = fresh.config.bar_name || "";
    await loadMetrics();
    await loadAnalytics();
    await loadSpreadsheets();
    await loadInHouse();
    await loadPosLog();
  });

  document.getElementById("btnAddBar")?.addEventListener("click", async () => {
    const name = window.prompt("Name for the new bar:", "e.g. Patio Bar");
    if (!name?.trim()) return;
    try {
      await OSB.createBar(name.trim(), true);
      window.location.href = "/";
    } catch (e) {
      setStatus(e.message, "settingsStatus");
    }
  });

  document.getElementById("btnSaveCustomizations")?.addEventListener("click", async () => {
    await OSB.saveConfig({
      bar_name: document.getElementById("settBarName")?.value?.trim(),
      metrics_default_window: document.getElementById("settMetricsWindow")?.value,
      cycle: {
        label: document.getElementById("settCycleLabel")?.value?.trim(),
        interval_days: parseInt(document.getElementById("settCycleDays")?.value || "7", 10),
        anchor_day: document.getElementById("settAnchorDay")?.value,
        timezone: document.getElementById("settTimezone")?.value?.trim(),
      },
    });
    const fresh = await OSB.getState();
    const d = fresh.config.cycle?.interval_days || 7;
    const cycleText = `${fresh.config.cycle?.label || "Inventory cycle"} · every ${d} day${d === 1 ? "" : "s"}`;
    document.getElementById("sidebarCycleLabel")?.replaceChildren(document.createTextNode(cycleText));
    await refreshHomeBars();
    applyBranding(fresh.config);
    setStatus("Customizations saved.", "settingsStatus");
  });

  ["settBusinessName", "settBusinessAddress", "settPanelTitle"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", updateBrandPreview);
  });

  document.getElementById("settBusinessLogo")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      brandingLogoData = await readLogoFile(file);
      updateBrandPreview();
      applyBranding({
        branding: {
          business_name: document.getElementById("settBusinessName")?.value?.trim(),
          logo_data_url: brandingLogoData,
        },
        bar_name: document.getElementById("settBarName")?.value?.trim(),
      });
    } catch (err) {
      setStatus(err.message, "settingsStatus");
      e.target.value = "";
    }
  });

  document.getElementById("btnClearLogo")?.addEventListener("click", () => {
    brandingLogoData = "";
    const fileInput = document.getElementById("settBusinessLogo");
    if (fileInput) fileInput.value = "";
    updateBrandPreview();
    applyBranding({
      branding: { logo_data_url: "" },
      bar_name: document.getElementById("settBarName")?.value?.trim(),
    });
  });

  document.getElementById("btnSaveBranding")?.addEventListener("click", async () => {
    const res = await OSB.saveConfig({
      branding: {
        business_name: document.getElementById("settBusinessName")?.value?.trim(),
        business_address: document.getElementById("settBusinessAddress")?.value?.trim(),
        panel_title: document.getElementById("settPanelTitle")?.value?.trim(),
        logo_data_url: brandingLogoData,
      },
    });
    if (res.error) {
      setStatus(res.error, "settingsStatus");
      return;
    }
    const fresh = await OSB.getState();
    applyBranding(fresh.config);
    setStatus("Business profile saved — sidebar updated.", "settingsStatus");
  });

  document.getElementById("btnSaveApi")?.addEventListener("click", async () => {
    const provider = document.getElementById("settAiProvider")?.value;
    const key = document.getElementById("settApiKey")?.value?.trim();
    if (!provider || !key) {
      setStatus("Select a provider and paste an API key.", "settingsStatus");
      return;
    }
    const res = await OSB.saveConfig({ ai_provider: provider, ai_api_key: key });
    document.getElementById("settApiKey").value = "";
    renderApiBadge(res.config?.api_connection_status);
    setStatus("API connection saved on this machine.", "settingsStatus");
  });

  document.getElementById("btnClearApi")?.addEventListener("click", async () => {
    const res = await OSB.saveConfig({ clear_api_key: true, ai_provider: "" });
    document.getElementById("settApiKey").value = "";
    document.getElementById("settAiProvider").value = "";
    renderApiBadge(res.config?.api_connection_status);
    setStatus("API key removed.", "settingsStatus");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.app === "setup") {
    initSetup().catch((err) => setStatus(err.message || "Setup failed to load."));
  }
  if (document.body.dataset.app === "home") initHome();
});