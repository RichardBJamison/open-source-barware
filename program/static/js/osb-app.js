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
  food: ["food", "appetizer", "entree", "dessert", "snack", "fry", "wing", "burger", "salad", "soup", "steak", "chicken", "seafood", "pasta", "pizza", "taco", "nachos"],
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
  const priority = ["beer", "wine", "mixer", "food"];
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
  const lower = stripAccents(name.toLowerCase().trim());
  if (lower.includes("back") || lower.includes("trasera") || lower.includes("atras")) return "back-bar";
  if (lower === "point" || lower.endsWith(" point") || lower === "punto") return "well";
  if (lower.includes("main bar") || lower.includes("service bar") || lower.includes("barra principal") || lower.includes("barra de servicio")) {
    return "well";
  }
  if (lower.includes("well") || lower.includes("pozo") || lower.includes("estacion")) return "well";
  if (
    lower.includes("wine") ||
    lower.includes("vino") ||
    lower.includes("champagne") ||
    lower.includes("champan") ||
    lower.includes("cava") ||
    lower.includes("beer") ||
    lower.includes("cerveza") ||
    lower.includes("walk") ||
    lower.includes("cooler") ||
    lower.includes("cellar") ||
    lower.includes("nevera") ||
    lower.includes("refrigerador")
  ) {
    return "walk-in";
  }
  if (
    lower.includes("storage") ||
    lower.includes("dry") ||
    lower.includes("almacen") ||
    lower.includes("bodega") ||
    lower.includes("liquor room") ||
    lower.includes("cuarto de licor")
  ) {
    return "storage";
  }
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
    const bar = await r.json();
    await loadBottleWeights(); // V1.5 Phase 1 preload
    return bar;
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

  /** V1.5 Phase 4.1 — move stock between venues */
  async transferStock({ fromBarId, toBarId, bottleId, product, size, qty, note, createIfMissing = true }) {
    const r = await fetch("/api/bars/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_bar_id: fromBarId,
        to_bar_id: toBarId,
        bottle_id: bottleId || "",
        product: product || "",
        size: size || "",
        qty,
        note: note || "",
        create_if_missing: createIfMissing,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "Transfer failed");
    return data;
  },

  async listTransfers(limit = 40, barId = null) {
    const q = new URLSearchParams({ limit: String(limit) });
    if (barId) q.set("bar_id", barId);
    const r = await fetch(`/api/bars/transfers?${q}`);
    return r.json();
  },

  async listVenues() {
    const r = await fetch("/api/venues");
    return r.json();
  },

  async authStatus() {
    const r = await fetch("/api/auth/status");
    return r.json();
  },

  async login({ userId, login, pin }) {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId || "", login: login || "", pin }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "Login failed");
    return data;
  },

  async logout() {
    const r = await fetch("/api/auth/logout", { method: "POST" });
    return r.json();
  },

  async listPeople() {
    const r = await fetch("/api/people");
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "Could not load people");
    return data;
  },

  async createPerson(payload) {
    const r = await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "Could not create person");
    return data;
  },

  async updatePerson(userId, payload) {
    const r = await fetch(`/api/people/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "Update failed");
    return data;
  },

  async resetPersonPin(userId, pin) {
    const r = await fetch(`/api/people/${encodeURIComponent(userId)}/reset-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "PIN reset failed");
    return data;
  },

  async deletePerson(userId) {
    const r = await fetch(`/api/people/${encodeURIComponent(userId)}`, { method: "DELETE" });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "Delete failed");
    return data;
  },

  async listStaffBoard(limit = 40) {
    const r = await fetch(`/api/staff-board?limit=${limit}`);
    return r.json();
  },

  async postStaffBoard({ text, venueId, pinned, source, fileName }) {
    const r = await fetch("/api/staff-board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        venue_id: venueId || "",
        pinned: !!pinned,
        source: source || "paste",
        file_name: fileName || "",
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "Could not post");
    return data;
  },

  async deleteStaffPost(postId) {
    const r = await fetch(`/api/staff-board/${encodeURIComponent(postId)}`, { method: "DELETE" });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "Could not delete");
    return data;
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

  async uploadPosLog({ label, note, file, text, inputType = "pos", parsed_pos = null }) {
    let type = "pos";
    if (inputType === "invoice") type = "invoice";
    else if (inputType === "purchase") type = "purchase";
    else if (inputType === "po" || inputType === "order") type = "po";
    const defaultLabel =
      type === "invoice" ? "Invoice drop"
      : type === "purchase" ? "Purchase/Receive"
      : type === "po" ? "Purchase order"
      : "POS drop";
    if (parsed_pos || (text?.trim() && !file)) {
      const payload = { label: label || defaultLabel, note, text: text || "", input_type: type };
      if (parsed_pos) {
        payload.parsed_pos = parsed_pos;
      } else if (text) {
        const parsed = parsePosText(text);
        if (parsed) payload.parsed_pos = { lines: parsed, source: "client-csv" };
      }
      const r = await fetch("/api/pos/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    (s.bottles || []).map((b) => ({
      ...b,
      stationId: s.id,
      stationName: s.name,
      effective_level: effectiveLevel(b), // V1.5 weight-aware
    }))
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
  // Spanish size words (litro, mango) map to English before size regexes run
  const normalized = applySpanishStructureSynonyms(stripAccents(trimmed.toLowerCase()));
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
    if (re.test(normalized) || re.test(name)) {
      size = sz;
      size_verified = true;
      name = name
        .replace(re, " ")
        .replace(/\blitro(?:\s+y\s+(?:medio|tres\s+cuartos))?\b/gi, " ")
        .replace(/\bmango\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
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
  const champM = lower.match(/^champagne\s+cooler(?:\s+(one|two|too|three|four|five|six|seven|eight|nine|ten|\d{1,2}))?/);
  if (champM) {
    const idx = champM[1] ? (WALK_STATION_WORD_NUMS[champM[1]] ?? parseInt(champM[1], 10)) : null;
    return { kind: "champagne-cooler", index: idx || null };
  }
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
    return ordered.find((s) => (s.type === "walk-in" || s.type === "walkin") && /wine|cellar|cava/i.test(s.name));
  }

  if (intent.kind === "champagne-cooler") {
    const chillers = ordered.filter((s) => /champagne|champan/i.test(s.name));
    if (intent.index && chillers[intent.index - 1]) return chillers[intent.index - 1];
    return chillers[0] || ordered.find((s) => /cooler/i.test(s.name) && /champ/i.test(s.name));
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

  const weighToggle = document.getElementById("setupWeighToggle");
  const weighOn = weighToggle ? weighToggle.checked : false;  // V1.5 optional weigh - only show fields when enabled
  window.__osbWeighOn = weighOn; // for other renders

  // Hide weight column header if disabled (setup only)
  const wTh = document.querySelector('#walkReviewTable th:nth-child(6)');
  if (wTh) wTh.style.display = weighOn ? '' : 'none';

  const bottles = multi ? allBottlesForReview() : allBottles();
  const weighOnConfig = !!(window.__osbConfig && window.__osbConfig.weigh_enabled);
  const colSpan = multi ? (weighOnConfig ? 8 : 7) : (weighOnConfig ? 7 : 6);  // V1.5 conditional weight column
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
          ${weighOnConfig ? `<td><input type="number" step="0.1" class="review-weight" placeholder="oz" value="${b.current_weight_oz ?? ""}" data-bottle="${b.id}" data-station="${b.stationId}"${barAttr} title="V1.5 weight (current oz)" /></td>` : ''}
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

  // V1.5 setup weigh toggle - makes weigh optional, re-renders table
  document.getElementById("setupWeighToggle")?.addEventListener("change", () => {
    renderWalkReview();
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
      if (t.classList.contains("review-weight")) {
        bottle.current_weight_oz = t.value ? parseFloat(t.value) : null;
        bottle.weight_mode = bottle.current_weight_oz != null ? "weight" : "level";
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
  if (!bar) return { id: "", name: "", stations: [], recipes: [] };
  return {
    id: bar.id || "",
    name: bar.name || bar.bar_name || "",
    stations: bar.stations || [],
    recipes: bar.recipes || [],
    setup: bar.setup,
  };
}

async function persistBar(extra = {}) {
  const payload = {
    bar_id: barState.id,
    name: barState.name,
    stations: sortedStations(),
    recipes: barState.recipes || [],
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
  // Spanish number words (belt-and-suspenders if normalize skipped)
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  full: 1,
  lleno: 1,
  llena: 1,
  zero: 0,
  cero: 0,
  none: 0,
  out: 0,
  vacio: 0,
  vacia: 0,
  half: 0.5,
  medio: 0.5,
  media: 0.5,
};

function parseCountLevel(fragment) {
  // Accept EN + ES free-text levels (normalize accents + Spanish synonyms first)
  const t = applySpanishStructureSynonyms(
    stripAccents(String(fragment || "").toLowerCase()).replace(/[.,;:]+/g, " ").trim(),
  )
    .replace(/\s+/g, " ")
    .trim();
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
  const raw = (token || "").replace(/[.,;:!?]+$/, "").toLowerCase();
  const t = applySpanishStructureSynonyms(stripAccents(raw)).replace(/\s+/g, " ").trim() || raw;
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

// V1.5 Phase 1 — Weight support helpers (accuracy boost, software equivalent to Bluetooth scale)
let BOTTLE_WEIGHTS = null; // loaded map name -> {full_oz, empty_oz, size}

async function loadBottleWeights() {
  if (BOTTLE_WEIGHTS) return BOTTLE_WEIGHTS;
  try {
    const r = await fetch("/api/weights");
    const data = await r.json();
    BOTTLE_WEIGHTS = data.weights || {};
    return BOTTLE_WEIGHTS;
  } catch (e) {
    BOTTLE_WEIGHTS = {};
    return BOTTLE_WEIGHTS;
  }
}

function getBottleWeights(bottleName) {
  if (!BOTTLE_WEIGHTS) return null;
  const key = (bottleName || "").trim();
  if (BOTTLE_WEIGHTS[key]) return BOTTLE_WEIGHTS[key];
  // fuzzy match
  const lower = key.toLowerCase();
  for (const k of Object.keys(BOTTLE_WEIGHTS)) {
    if (k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())) {
      return BOTTLE_WEIGHTS[k];
    }
  }
  return BOTTLE_WEIGHTS["default-750ml"] || null;
}

function effectiveLevel(bottle) {
  if (!bottle) return 0;
  const cfg = window.__osbConfig || {};
  if (!cfg.weigh_enabled) return bottle.current_level ?? 0; // V1.5: weigh optional, default levels
  if (bottle.weight_mode === "weight" && bottle.current_weight_oz != null) {
    const w = getBottleWeights(bottle.name);
    if (w && w.full_oz && w.empty_oz && w.full_oz > w.empty_oz) {
      const frac = (w.full_oz - bottle.current_weight_oz) / (w.full_oz - w.empty_oz);
      return Math.max(0, Math.min(2, frac * (parseSizeOz(bottle.size) / 25.36))); // normalize rough
    }
  }
  return bottle.current_level ?? 0;
}

function parseSizeOz(size) {
  if (!size) return 25.36;
  const m = size.match(/(\d+(?:\.\d+)?)\s*(ml|l|oz)/i);
  if (!m) return 25.36;
  let v = parseFloat(m[1]);
  const u = (m[2] || "").toLowerCase();
  if (u === "l") v *= 33.81;
  if (u === "ml") v /= 29.57;
  return v || 25.36;
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
    // V1.5 weight support (Phase 1)
    weight_mode: "level",
    current_weight_oz: null,
    full_weight_oz: null,
    empty_weight_oz: null,
    count_matched: true,
    count_variance: "matched",
    count_manual_resolved: true,
    // V1.5 weight support (Phase 1)
    weight_mode: "level",   // "level" | "weight"
    current_weight_oz: null,
    full_weight_oz: null,
    empty_weight_oz: null,
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
  const wVal = b.current_weight_oz != null ? b.current_weight_oz : "";
  const weighOn = !!(window.__osbConfig && window.__osbConfig.weigh_enabled);
  const weightField = weighOn ? `<input type="number" step="0.1" class="count-weight-input count-gap-weight" placeholder="wt oz" value="${wVal}" data-bottle="${b.id}" data-station="${b.stationId}" aria-label="Weight oz V1.5" title="V1.5: enter current weight for accuracy" />` : '';
  return `
    <div class="count-gap-fix-actions">
      <input type="number" class="count-level-input count-gap-level" step="0.1" min="0" max="99" value="${level}" data-bottle="${b.id}" data-station="${b.stationId}" aria-label="Level for ${escapeHtml(b.name)}" />
      ${weightField}
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
 *
 * V1.5 bilingual structure: Mexican Spanish station/level/size words are
 * normalized to English before the EN parser runs. Free-text notes always
 * accept UTF-8; this layer makes auto-map + count matching work in ES.
 */

function stripAccents(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Map common Mexican-Spanish bar-walk / count structure words → English
 * equivalents the existing regex parser already understands.
 * Multi-word phrases first; then singles. Input should already be lowercased.
 */
function applySpanishStructureSynonyms(t) {
  let s = ` ${t} `;

  // Multi-word stations / bars (order matters)
  s = s.replace(/\bbarra\s+trasera\b/g, " back bar ");
  s = s.replace(/\bbarra\s+de\s+atras\b/g, " back bar ");
  s = s.replace(/\bestanteria\s+trasera\b/g, " back bar ");
  s = s.replace(/\bbarra\s+principal\b/g, " main bar ");
  s = s.replace(/\bbarra\s+de\s+servicio\b/g, " service bar ");
  s = s.replace(/\bnevera\s+de\s+cerveza\b/g, " beer cooler ");
  s = s.replace(/\bcooler\s+de\s+cerveza\b/g, " beer cooler ");
  s = s.replace(/\brefrigerador\s+de\s+cerveza\b/g, " beer cooler ");
  s = s.replace(/\bnevera\s+de\s+vino\b/g, " wine cooler ");
  s = s.replace(/\bcooler\s+de\s+vino\b/g, " wine cooler ");
  // Fine-dining champagne coolers (often 2–3 physical units)
  s = s.replace(/\bnevera\s+de\s+champan\b/g, " champagne cooler ");
  s = s.replace(/\bnevera\s+de\s+champagne\b/g, " champagne cooler ");
  s = s.replace(/\bcooler\s+de\s+champan\b/g, " champagne cooler ");
  s = s.replace(/\bcooler\s+de\s+champagne\b/g, " champagne cooler ");
  s = s.replace(/\brefrigerador\s+de\s+champan\b/g, " champagne cooler ");
  s = s.replace(/\brefrigerador\s+de\s+champagne\b/g, " champagne cooler ");
  s = s.replace(/\bcava\s+de\s+champan\b/g, " champagne cooler ");
  s = s.replace(/\bcava\s+de\s+champagne\b/g, " champagne cooler ");
  s = s.replace(/\bcuarto\s+de\s+licores?\b/g, " liquor room ");
  s = s.replace(/\bcuarto\s+de\s+licor\b/g, " liquor room ");
  s = s.replace(/\bcuarto\s+de\s+vinos?\b/g, " wine cellar ");
  s = s.replace(/\bcava\s+principal\b/g, " wine cellar ");
  s = s.replace(/\briel\s+rapido\b/g, " speed rail ");
  s = s.replace(/\brail\s+rapido\b/g, " speed rail ");
  s = s.replace(/\briel\s+de\s+velocidad\b/g, " speed rail ");
  s = s.replace(/\bpared\s+de\s+vino\b/g, " wine wall ");
  s = s.replace(/\bcava\s+de\s+vinos?\b/g, " wine cellar ");
  s = s.replace(/\bbodega\s+de\s+vinos?\b/g, " wine cellar ");
  s = s.replace(/\bsiguiente\s+fila\b/g, " next row ");
  s = s.replace(/\bsiguiente\s+estante\b/g, " next shelf ");
  s = s.replace(/\bestante\s+de\s+arriba\b/g, " top shelf ");
  s = s.replace(/\bestante\s+superior\b/g, " top shelf ");
  s = s.replace(/\bestante\s+de\s+abajo\b/g, " bottom shelf ");
  s = s.replace(/\bestante\s+inferior\b/g, " bottom shelf ");
  s = s.replace(/\bestante\s+de\s+vidrio\b/g, " glass shelf ");
  s = s.replace(/\bpozo\s+principal\b/g, " well primary ");
  s = s.replace(/\bpozo\s+de\s+servicio\b/g, " well service ");
  s = s.replace(/\blitro\s+y\s+tres\s+cuartos\b/g, " handle ");
  s = s.replace(/\blitro\s+y\s+medio\b/g, " handle ");
  s = s.replace(/\bmedia\s+galon\b/g, " handle ");
  s = s.replace(/\bmedio\s+galon\b/g, " handle ");
  s = s.replace(/\bpunto\s+cinco\b/g, " half ");
  s = s.replace(/\bpunto\s+(\d)\b/g, " point $1 ");

  // Single-token structure
  s = s.replace(/\bbarra\b/g, " bar ");
  s = s.replace(/\bpozo\b/g, " well ");
  s = s.replace(/\bestacion\b/g, " well ");
  s = s.replace(/\bfila\b/g, " row ");
  s = s.replace(/\bestante\b/g, " shelf ");
  s = s.replace(/\bnevera\b/g, " cooler ");
  s = s.replace(/\brefrigerador\b/g, " cooler ");
  s = s.replace(/\balmacen\b/g, " storage ");
  s = s.replace(/\bbodega\b/g, " storage ");
  s = s.replace(/\bprincipal\b/g, " primary ");
  s = s.replace(/\bsecundari[oa]\b/g, " secondary ");
  s = s.replace(/\bservicio\b/g, " service ");
  s = s.replace(/\btrasero\b/g, " rear ");
  s = s.replace(/\btrasera\b/g, " rear ");
  s = s.replace(/\bfrente\b/g, " front ");
  s = s.replace(/\bgrande\b/g, " large ");
  s = s.replace(/\bchico\b|\bchica\b|\bpequeno\b|\bpequena\b/g, " small ");
  s = s.replace(/\bizquierdo\b|\bizquierda\b/g, " left ");
  s = s.replace(/\bderecho\b|\bderecha\b/g, " right ");
  s = s.replace(/\bcentro\b/g, " center ");
  s = s.replace(/\barriva\b/g, " top ");
  s = s.replace(/\babajo\b/g, " bottom ");

  // Spanish number words → English
  s = s.replace(/\buno\b|\buna\b/g, " one ");
  s = s.replace(/\bdos\b/g, " two ");
  s = s.replace(/\btres\b/g, " three ");
  s = s.replace(/\bcuatro\b/g, " four ");
  s = s.replace(/\bcinco\b/g, " five ");
  s = s.replace(/\bseis\b/g, " six ");
  s = s.replace(/\bsiete\b/g, " seven ");
  s = s.replace(/\bocho\b/g, " eight ");
  s = s.replace(/\bnueve\b/g, " nine ");
  s = s.replace(/\bdiez\b/g, " ten ");

  // Sizes / quantities / levels
  s = s.replace(/\blitro\b/g, " liter ");
  s = s.replace(/\bbotellas\b/g, " bottles ");
  s = s.replace(/\bbotella\b/g, " bottle ");
  s = s.replace(/\bcajas\b/g, " cases ");
  s = s.replace(/\bcaja\b/g, " case ");
  s = s.replace(/\bvacio\b|\bvacia\b/g, " out ");
  s = s.replace(/\blleno\b|\bllena\b/g, " full ");
  s = s.replace(/\bmedio\b|\bmedia\b/g, " half ");
  s = s.replace(/\bcero\b/g, " zero ");
  s = s.replace(/\bmango\b/g, " handle "); // MX slang for 1.75L handle

  return s.replace(/\s+/g, " ");
}

const WALK_WORD_NUMS = {
  one: "1", two: "2", too: "2", to: "2", three: "3", four: "4", for: "4",
  five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  uno: "1", una: "1", dos: "2", tres: "3", cuatro: "4",
  cinco: "5", seis: "6", siete: "7", ocho: "8", nueve: "9", diez: "10",
};

function walkNormalizeText(text) {
  let t = " " + String(text).replace(/\r/g, "\n") + " ";
  t = t.toLowerCase();
  t = stripAccents(t);
  t = applySpanishStructureSynonyms(t);
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
  /^(wine)\s+(wall|cooler|rack|cellar)(\s+(one|two|too|three|four|five|six|seven|eight|nine|ten|\d{1,2}))?/,
  /^(champagne)\s+cooler(\s+(one|two|too|three|four|five|six|seven|eight|nine|ten|\d{1,2}))?/,
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
  // "bottles"/"bottle" already include Spanish via walkNormalizeText (botella→bottle)
  if (num && (next === "bottles" || next === "bottle" || next === "botellas" || next === "botella")) {
    return { qty: parseInt(num, 10), consumed: 2 };
  }
  if ((w === "a" || w === "one" || w === "una" || w === "uno") && (next === "case" || next === "caja")) {
    return { qty: 12, consumed: 2 };
  }
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
  uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
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
    // V1.5 weight support (Phase 1)
    weight_mode: "level",
    current_weight_oz: null,
    full_weight_oz: null,
    empty_weight_oz: null,
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
    // V1.5 weight support (Phase 1)
    weight_mode: "level",
    current_weight_oz: null,
    full_weight_oz: null,
    empty_weight_oz: null,
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
  window.__osbConfig = cfg; // V1.5 expose for optional weigh etc.
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
    const levelInput = e.target.closest(".count-level-input");
    if (levelInput) {
      const bottle = findBottleRecord(levelInput.dataset.bottle, levelInput.dataset.station);
      if (!bottle) return;
      bottle.current_level = parseFloat(levelInput.value) || 0;
      updateFirstCountDoneButton();
      return;
    }
    // V1.5 weight input
    const weightInput = e.target.closest(".count-weight-input, .count-gap-weight");
    if (weightInput) {
      const bottle = findBottleRecord(weightInput.dataset.bottle, weightInput.dataset.station);
      if (!bottle) return;
      bottle.current_weight_oz = weightInput.value ? parseFloat(weightInput.value) : null;
      bottle.weight_mode = bottle.current_weight_oz != null ? "weight" : "level";
      updateFirstCountDoneButton();
    }
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
      const weightInput = row?.querySelector(".count-weight-input, .count-gap-weight");
      bottle.current_level = parseFloat(levelInput?.value) || bottle.current_level || 1;
      if (weightInput && weightInput.value) {
        bottle.current_weight_oz = parseFloat(weightInput.value);
        bottle.weight_mode = "weight";
      }
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

  // V1.5 polish: recipes teaser for first-time users after setup
  const recipes = barState.recipes || [];
  if (recipes.length > 0) {
    const recipesNote = document.createElement("div");
    recipesNote.style.cssText = "margin-top:12px; font-size:0.85rem;";
    recipesNote.innerHTML = `<a href="#" data-goto-recipes style="color:var(--copper-bright);">🍸 ${recipes.length} recipes • view costing →</a>`;
    statsEl.parentNode.appendChild(recipesNote);
    recipesNote.querySelector("[data-goto-recipes]").onclick = (e) => {
      e.preventDefault();
      openRecipesPanel();
    };
  } else if (bottles > 0) {
    const note = document.createElement("p");
    note.style.cssText = "margin-top:8px; font-size:0.8rem; color:var(--text-muted);";
    note.textContent = "Tip: After setting costs in Spreadsheets, try Recipes & Costing for menu pricing.";
    statsEl.parentNode.appendChild(note);
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

/* ─── V1.5 Reports: story for the floor + depth for the nerd ─── */

function reportMoney(n, digits = 0) {
  const v = Number(n) || 0;
  return `$${v.toFixed(digits)}`;
}

function reportBuildStory(a) {
  const health = a.health || "watch";
  const below = a.below_par || 0;
  const bottles = a.bottle_count || 0;
  const value = a.total_value || 0;
  const cost = a.beverage_cost_pct || 0;
  const ideal = a.ideal_pour_cost_pct;
  const orders = a.par_status_counts?.order || 0;
  const watch = a.par_status_counts?.watch || 0;
  const need$ = a.need_value || 0;
  const moversDown = (a.velocity || []).filter((v) => v.direction === "down").slice(0, 3);
  const moversUp = (a.velocity || []).filter((v) => v.direction === "up").slice(0, 2);
  const cycles = a.cycles_total || 0;

  const greet =
    health === "solid"
      ? "Looks like a clean house."
      : health === "watch"
        ? "Mostly fine — a few bottles are calling."
        : "Time to restock before the next rush.";

  const bullets = [];
  bullets.push(
    `You've got <strong>${reportMoney(value)}</strong> sitting on the shelves across <strong>${bottles}</strong> bottles and <strong>${a.station_count || 0}</strong> stations.`
  );

  if (below === 0) {
    bullets.push(`Nothing is under par. Nice work — the map and the shelves agree.`);
  } else if (below === 1) {
    bullets.push(`<strong>1 bottle</strong> is under par. Easy fix before service.`);
  } else {
    bullets.push(
      `<strong>${below} bottles</strong> are under par` +
        (orders ? ` — <strong>${orders}</strong> need a real order, <strong>${watch}</strong> are just on watch.` : ".")
    );
  }

  if (cost > 0) {
    let costLine = `Pour cost sits around <strong>${cost.toFixed(1)}%</strong>`;
    if (cost <= 24) costLine += ` — that's in the healthy zone for most bars.`;
    else if (cost <= 32) costLine += ` — a bit high; check free-pours and waste.`;
    else costLine += ` — spicy. Look at over-pours, comps, and missing bottles.`;
    if (ideal != null) {
      costLine += ` Your recipes say ideal is about <strong>${ideal.toFixed(1)}%</strong>.`;
    }
    bullets.push(costLine);
  }

  if (moversDown.length) {
    bullets.push(
      `Moving fastest (down): ${moversDown.map((m) => `<strong>${escapeHtml(m.name)}</strong>`).join(", ")}.`
    );
  } else if (cycles < 2) {
    bullets.push(`Do one more full count and we'll show you what's flying off the shelf week to week.`);
  }

  if (moversUp.length) {
    bullets.push(
      `Weird upside (might be a receive or a miscount): ${moversUp.map((m) => escapeHtml(m.name)).join(", ")}.`
    );
  }

  if (need$ > 0) {
    bullets.push(
      `Rough restock bill to get back to PAR: about <strong>${reportMoney(need$)}</strong> (uses the costs you set on each bottle).`
    );
  }

  if ((a.pos_sales_total || 0) > 0 || (a.purchases_total || 0) > 0) {
    bullets.push(
      `This cycle's inputs so far: <strong>${(a.pos_sales_total || 0).toFixed(1)}</strong> sold (from POS) · <strong>${(a.purchases_total || 0).toFixed(1)}</strong> received.`
    );
  }

  const actions = [];
  if (orders > 0) {
    actions.push({ label: "Build a PO for low stock", go: "smart-orders", primary: true });
  }
  if (below > 0) {
    actions.push({ label: "See what to order", tab: "stock" });
  }
  actions.push({ label: "Walk the floor (mobile count)", go: "mobile-count" });
  if ((a.recipe_rows || []).length === 0) {
    actions.push({ label: "Add a recipe for menu cost", go: "recipes" });
  } else {
    actions.push({ label: "Recipe costing", tab: "money" });
  }
  actions.push({ label: "Download full sheet", tab: "export" });

  return {
    health,
    healthLabel: a.health_label || "Report",
    greet,
    bullets,
    actions,
  };
}

function reportParBadge(status) {
  if (status === "order") return `<span class="rpt-badge rpt-badge--order">Order</span>`;
  if (status === "watch") return `<span class="rpt-badge rpt-badge--watch">Watch</span>`;
  return `<span class="rpt-badge rpt-badge--ok">OK</span>`;
}

function reportExportCsv(a) {
  const rows = a.product_rows || [];
  const header = [
    "Station", "Product", "Category", "Size", "On hand", "PAR", "Status",
    "POS sales", "Purchases", "Net", "Adj variance", "Cost", "Line value", "Need", "Need $",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.station, r.name, r.category, r.size,
        r.current_level, r.par_level, r.par_status || "",
        r.pos_sales || 0, r.purchases || 0, r.net_movement || 0, r.adjusted_variance || 0,
        r.cost || 0, r.line_value || 0, r.need || 0, r.need_value || 0,
      ]
        .map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const el = document.createElement("a");
  el.href = url;
  el.download = `osb-report-${(a.bar_name || "bar").replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  el.click();
  URL.revokeObjectURL(url);
}

function reportExportStoryText(a, story) {
  const lines = [
    `OPEN SOURCE BARWARE — SHIFT REPORT`,
    `${a.bar_name || "Bar"} · ${story.healthLabel}`,
    `Generated ${new Date().toLocaleString()}`,
    ``,
    story.greet,
    ``,
    ...story.bullets.map((b) => `• ${b.replace(/<[^>]+>/g, "")}`),
    ``,
    `On hand value: ${reportMoney(a.total_value)}`,
    `Pour cost %: ${(a.beverage_cost_pct || 0).toFixed(1)}%` +
      (a.ideal_pour_cost_pct != null ? ` (recipe ideal ${a.ideal_pour_cost_pct.toFixed(1)}%)` : ""),
    `Below par: ${a.below_par || 0} · Order now: ${a.par_status_counts?.order || 0} · Watch: ${a.par_status_counts?.watch || 0}`,
    `Restock estimate: ${reportMoney(a.need_value || 0)}`,
    ``,
    `— Free & local. Your data never left this machine.`,
  ];
  return lines.join("\n");
}

async function loadAnalytics() {
  const root = document.getElementById("analyticsRoot");
  if (!root) return;
  try {
    const a = await OSB.getAnalytics();
    if (!a.bottle_count) {
      root.innerHTML = `
        <div class="panel panel--glass rpt-empty">
          <p class="rpt-empty-title">No story yet</p>
          <p class="field-hint">Finish your first count (or load the demo map) and this page turns into a readable shift report — plain English first, full numbers when you want them.</p>
        </div>`;
      return;
    }

    window.__osbLastReport = a;
    const story = reportBuildStory(a);
    const lastCount = a.last_count_at
      ? new Date(a.last_count_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : "—";

    const alerts = (a.variance_alerts || [])
      .slice(0, 12)
      .map(
        (item) => `
      <div class="analytics-alert-row">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span class="field-hint">${escapeHtml(item.category || "")}</span>
        </div>
        <div class="analytics-alert-meta">
          <span class="text-wine">${Number(item.current).toFixed(1)} / ${Number(item.par).toFixed(1)}</span>
          <span class="field-hint">−${Number(item.deficit).toFixed(1)}</span>
        </div>
      </div>`
      )
      .join("");

    const velocityPills = (a.velocity || [])
      .slice(0, 12)
      .map(
        (item) => `
      <span class="velocity-pill velocity-pill--${item.direction === "down" ? "down" : "up"}">
        ${escapeHtml(item.name)}
        <strong>${item.direction === "down" ? "↓" : "↑"} ${Math.abs(item.change).toFixed(2)}</strong>
      </span>`
      )
      .join("");

    const wowRows = (a.week_over_week || []).slice(0, 20);
    const wowTable =
      wowRows.length > 0
        ? `<div class="workbook-table-wrap scroll-panel"><table class="analytics-wow-table workbook-table"><thead><tr>
            <th>Product</th><th>Station</th><th>Was</th><th>Now</th><th>Δ</th>
          </tr></thead><tbody>${wowRows
            .map(
              (item) => `
          <tr>
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td class="field-hint">${escapeHtml(item.station)}</td>
            <td class="workbook-num">${Number(item.previous_level).toFixed(2)}</td>
            <td class="workbook-num">${Number(item.current_level).toFixed(2)}</td>
            <td class="workbook-num ${item.change < 0 ? "analytics-wow-change--down" : item.change > 0 ? "analytics-wow-change--up" : ""}">${item.change >= 0 ? "+" : ""}${Number(item.change).toFixed(2)}</td>
          </tr>`
            )
            .join("")}</tbody></table></div>`
        : `<p class="field-hint">Process a second count and this becomes a week-over-week story.</p>`;

    // Stock table sorted: order first, then watch, then ok
    const statusRank = { order: 0, watch: 1, ok: 2 };
    const stockRows = [...(a.product_rows || [])].sort((x, y) => {
      const sr = (statusRank[x.par_status] ?? 9) - (statusRank[y.par_status] ?? 9);
      if (sr !== 0) return sr;
      return (y.need || 0) - (x.need || 0);
    });

    const stockTable = stockRows.length
      ? `<div class="workbook-table-wrap scroll-panel"><table class="workbook-table">
        <thead><tr>
          <th>Status</th><th>Product</th><th>Station</th><th>On hand</th><th>PAR</th>
          <th>Sales</th><th>Recv</th><th>Need</th><th>Need $</th>
        </tr></thead>
        <tbody>${stockRows
          .map(
            (r) => `<tr class="${r.par_status === "order" ? "row-flag" : ""}">
            <td>${reportParBadge(r.par_status)}</td>
            <td><strong>${escapeHtml(r.name)}</strong> <span class="field-hint">${escapeHtml(r.size || "")}</span></td>
            <td class="field-hint">${escapeHtml(r.station || "")}</td>
            <td class="workbook-num">${Number(r.current_level).toFixed(2)}</td>
            <td class="workbook-num">${Number(r.par_level).toFixed(1)}</td>
            <td class="workbook-num">${Number(r.pos_sales || 0).toFixed(1)}</td>
            <td class="workbook-num">${Number(r.purchases || 0).toFixed(1)}</td>
            <td class="workbook-num">${Number(r.need || 0).toFixed(1)}</td>
            <td class="workbook-num">${r.need_value ? reportMoney(r.need_value) : "—"}</td>
          </tr>`
          )
          .join("")}</tbody></table>
        <p class="workbook-row-count">${stockRows.length} bottles · sorted by who needs love first</p>
      </div>`
      : `<p class="field-hint">No stock rows.</p>`;

    const recipeTable = (a.recipe_rows || []).length
      ? `<div class="workbook-table-wrap scroll-panel"><table class="workbook-table">
        <thead><tr><th>Recipe</th><th>Menu $</th><th>Cost / serve</th><th>Cost %</th><th>Profit</th></tr></thead>
        <tbody>${(a.recipe_rows || [])
          .map(
            (r) => `<tr>
            <td><strong>${escapeHtml(r.name)}</strong></td>
            <td class="workbook-num">${reportMoney(r.menu_price, 2)}</td>
            <td class="workbook-num">${reportMoney(r.cost_per_serving, 2)}</td>
            <td class="workbook-num">${Number(r.cost_pct || 0).toFixed(1)}%</td>
            <td class="workbook-num">${reportMoney(r.profit_per_serving, 2)}</td>
          </tr>`
          )
          .join("")}</tbody></table></div>`
      : `<p class="field-hint">No recipes yet. Open <strong>Recipes &amp; Costing</strong> from Home base — even three classics make the “ideal vs actual” story useful.</p>`;

    const history = a.cycle_history || a.trend_data || [];
    const historyBlock = history.length
      ? `<div class="rpt-history">
          ${history
            .map((c, i) => {
              const avg = c.avg_level != null ? Number(c.avg_level).toFixed(2) : "—";
              const bp = c.below_par != null ? c.below_par : "—";
              const items = c.items != null ? c.items : "—";
              return `<div class="rpt-history-card">
                <div class="rpt-history-num">#${c.cycle_number || history.length - i}</div>
                <div class="rpt-history-date">${escapeHtml(c.date || c.full_date || "")}</div>
                <div class="rpt-history-meta">${items} bottles · avg ${avg} · ${bp} below par</div>
              </div>`;
            })
            .join("")}
        </div>`
      : `<p class="field-hint">History shows up after you Process a count.</p>`;

    const actionHtml = story.actions
      .map((act) => {
        const cls = act.primary ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm";
        if (act.go) return `<button type="button" class="${cls}" data-rpt-go="${act.go}">${escapeHtml(act.label)}</button>`;
        return `<button type="button" class="${cls}" data-rpt-tab="${act.tab}">${escapeHtml(act.label)}</button>`;
      })
      .join("");

    // Multi-venue roll-up (optional layer when 2+ bars exist)
    let venueStrip = "";
    try {
      const v = await OSB.listVenues();
      if ((v.venues || []).length > 1) {
        const c = v.consolidated || {};
        venueStrip = `
          <section class="panel panel--glass venues-roll-up" style="margin:0;">
            <strong>All venues</strong>
            <span>${c.venue_count || 0} spots · ${c.bottle_count || 0} SKUs · ${reportMoney(c.total_value || 0)} total · ${c.below_par || 0} below par company-wide · showing report for <em>${escapeHtml(a.bar_name || "active venue")}</em></span>
            <div class="rpt-actions" style="margin-top:10px;">
              <button type="button" class="btn btn-ghost btn-sm" data-rpt-go="transfer">⇄ Transfer stock</button>
            </div>
          </section>`;
      }
    } catch (_) { /* single-venue fine */ }

    root.innerHTML = `
      <div class="rpt">
        ${venueStrip}
        <!-- LAYER 1: The story anyone can read -->
        <section class="panel panel--glass rpt-story rpt-story--${escapeHtml(story.health)}">
          <div class="rpt-story-top">
            <div>
              <p class="rpt-kicker">Tonight's read · ${escapeHtml(a.cycle_label || "Inventory cycle")}</p>
              <h2 class="rpt-story-title">${escapeHtml(a.bar_name || "Your bar")}</h2>
              <p class="rpt-greet">${escapeHtml(story.greet)}</p>
            </div>
            <div class="rpt-health-pill rpt-health-pill--${escapeHtml(story.health)}" title="Overall bar health from PARs">
              ${escapeHtml(story.healthLabel)}
            </div>
          </div>
          <ul class="rpt-bullets">
            ${story.bullets.map((b) => `<li>${b}</li>`).join("")}
          </ul>
          <div class="rpt-actions">${actionHtml}</div>
          <p class="rpt-footnote">Last count: <strong>${escapeHtml(lastCount)}</strong> · Cycles logged: <strong>${a.cycles_total || 0}</strong> · Numbers stay on this machine</p>
        </section>

        <!-- LAYER 2: Scoreboard (glanceable) -->
        <section class="rpt-scoreboard">
          <div class="rpt-score"><span class="rpt-score-num">${reportMoney(a.total_value)}</span><span class="rpt-score-lbl">On the shelf</span></div>
          <div class="rpt-score"><span class="rpt-score-num">${(a.beverage_cost_pct || 0).toFixed(1)}%</span><span class="rpt-score-lbl">Pour cost${a.ideal_pour_cost_pct != null ? ` · ideal ${a.ideal_pour_cost_pct.toFixed(1)}%` : ""}</span></div>
          <div class="rpt-score ${a.below_par ? "rpt-score--warn" : ""}"><span class="rpt-score-num">${a.below_par || 0}</span><span class="rpt-score-lbl">Below par</span></div>
          <div class="rpt-score"><span class="rpt-score-num">${reportMoney(a.need_value || 0)}</span><span class="rpt-score-lbl">Restock estimate</span></div>
          <div class="rpt-score"><span class="rpt-score-num">${a.par_status_counts?.ok || 0}<span class="rpt-score-sub">/${a.bottle_count || 0}</span></span><span class="rpt-score-lbl">Healthy bottles</span></div>
          <div class="rpt-score"><span class="rpt-score-num">${a.station_count || 0}</span><span class="rpt-score-lbl">Stations</span></div>
        </section>

        <!-- LAYER 3: Tabs — depth without dumping it all at once -->
        <div class="rpt-tabs" role="tablist" aria-label="Report sections">
          <button type="button" class="rpt-tab active" data-rpt-panel="glance">At a glance</button>
          <button type="button" class="rpt-tab" data-rpt-panel="stock">Stock &amp; orders</button>
          <button type="button" class="rpt-tab" data-rpt-panel="money">Money &amp; recipes</button>
          <button type="button" class="rpt-tab" data-rpt-panel="history">History</button>
          <button type="button" class="rpt-tab" data-rpt-panel="export">Export / full sheet</button>
        </div>

        <div class="rpt-panels">
          <div class="rpt-panel active" data-rpt-panel-body="glance">
            <div class="analytics-grid">
              <div class="panel analytics-panel analytics-panel--hero">
                <div class="analytics-panel-head">
                  <h2>Where the money sits</h2>
                  <span class="analytics-total">${reportMoney(a.total_value)} on hand</span>
                </div>
                <p class="field-hint" style="margin-bottom:12px;">Bigger bar = more cash tied up. Tap Stock if something looks off.</p>
                ${horizontalBars(a.category_values)}
              </div>
              <div class="panel analytics-panel">
                <h2>Pour cost gauge</h2>
                ${costGaugeSvg(a.beverage_cost_pct || 0)}
                <p class="field-hint">Green band ≈ 18–24%. This is a program average from bottle costs — not a tax form.</p>
                ${
                  a.ideal_pour_cost_pct != null
                    ? `<p class="field-hint">Recipe ideal (menu math): <strong>${a.ideal_pour_cost_pct.toFixed(1)}%</strong> — compare to the needle.</p>`
                    : ""
                }
              </div>
              <div class="panel analytics-panel">
                <h2>Category mix</h2>
                ${donutLegend(a.category_distribution)}
              </div>
              <div class="panel analytics-panel">
                <h2>Needs attention</h2>
                ${alerts || `<p class="field-hint analytics-ok">All clear — everything at or above par.</p>`}
              </div>
              <div class="panel analytics-panel">
                <h2>Movers</h2>
                <div class="velocity-pills-wrap">${velocityPills || `<p class="field-hint">Need 2+ processed counts to rank movers.</p>`}</div>
              </div>
              <div class="panel analytics-panel analytics-panel-wide">
                <h2>Week over week</h2>
                <p class="field-hint" style="margin-top:0;">What changed since the last Process — not sales, shelf levels.</p>
                ${wowTable}
              </div>
            </div>
          </div>

          <div class="rpt-panel" data-rpt-panel-body="stock">
            <div class="panel panel--glass">
              <div class="rpt-panel-head-row">
                <div>
                  <h2 style="margin:0;">Stock &amp; what to order</h2>
                  <p class="field-hint" style="margin:4px 0 0;">Sorted so “Order” hits the top. Watch = half-empty vs PAR. OK = leave it alone.</p>
                </div>
                <button type="button" class="btn btn-primary btn-sm" data-rpt-go="smart-orders">Open Smart Orders → PO</button>
              </div>
              <div class="rpt-legend">
                <span>${reportParBadge("order")} under half of PAR</span>
                <span>${reportParBadge("watch")} under PAR</span>
                <span>${reportParBadge("ok")} at/above PAR</span>
              </div>
              ${stockTable}
            </div>
          </div>

          <div class="rpt-panel" data-rpt-panel-body="money">
            <div class="analytics-grid">
              <div class="panel analytics-panel">
                <h2>Cost snapshot</h2>
                ${costGaugeSvg(a.beverage_cost_pct || 0)}
                <ul class="rpt-bullets rpt-bullets--tight">
                  <li>Program pour cost: <strong>${(a.beverage_cost_pct || 0).toFixed(1)}%</strong></li>
                  <li>Recipe ideal: <strong>${a.ideal_pour_cost_pct != null ? a.ideal_pour_cost_pct.toFixed(1) + "%" : "add recipes + menu prices"}</strong></li>
                  <li>Shelf value: <strong>${reportMoney(a.total_value)}</strong></li>
                  <li>Restock to PAR: <strong>${reportMoney(a.need_value || 0)}</strong></li>
                </ul>
              </div>
              <div class="panel analytics-panel">
                <h2>Category $ mix</h2>
                ${horizontalBars(a.category_values)}
              </div>
              <div class="panel analytics-panel analytics-panel-wide">
                <h2>Recipes &amp; menu math</h2>
                <p class="field-hint" style="margin-top:0;">Cost per serve uses your bottle costs and pour sizes. Menu % = cost ÷ menu price. No cloud — just your numbers.</p>
                ${recipeTable}
              </div>
            </div>
          </div>

          <div class="rpt-panel" data-rpt-panel-body="history">
            <div class="panel panel--glass">
              <h2 style="margin-top:0;">Cycle history</h2>
              <p class="field-hint">Each Process locks a snapshot. More cycles = smarter velocity and WoW.</p>
              ${historyBlock}
              <h3 style="margin-top:20px;font-family:var(--font-serif);color:var(--copper-bright);font-size:1rem;">Week-over-week detail</h3>
              ${wowTable}
            </div>
          </div>

          <div class="rpt-panel" data-rpt-panel-body="export">
            <div class="panel panel--glass">
              <h2 style="margin-top:0;">Take it with you</h2>
              <p class="field-hint">Share with a GM, paste into Slack, or open in Excel. Still 100% local until you hit download.</p>
              <div class="rpt-export-actions">
                <button type="button" class="btn btn-primary" id="rptExportCsv">Download full CSV</button>
                <button type="button" class="btn btn-secondary" id="rptCopyStory">Copy plain-English summary</button>
                <button type="button" class="btn btn-ghost" id="rptDownloadStory">Save summary .txt</button>
              </div>
              <p id="rptExportStatus" class="status" style="margin-top:10px;"></p>
              <details class="rpt-deep" style="margin-top:16px;">
                <summary>Full bottle sheet (every column)</summary>
                <div class="workbook-table-wrap scroll-panel" style="margin-top:10px;">
                  <table class="workbook-table">
                    <thead><tr>
                      <th>Station</th><th>Product</th><th>Cat</th><th>On hand</th><th>PAR</th><th>Status</th>
                      <th>Sales</th><th>Purch</th><th>Net</th><th>Adj var</th><th>Cost</th><th>$ on hand</th>
                    </tr></thead>
                    <tbody>
                      ${(a.product_rows || [])
                        .map(
                          (r) => `<tr>
                          <td>${escapeHtml(r.station || "")}</td>
                          <td><strong>${escapeHtml(r.name)}</strong></td>
                          <td class="field-hint">${escapeHtml(r.category || "")}</td>
                          <td class="workbook-num">${Number(r.current_level).toFixed(2)}</td>
                          <td class="workbook-num">${Number(r.par_level).toFixed(1)}</td>
                          <td>${reportParBadge(r.par_status)}</td>
                          <td class="workbook-num">${Number(r.pos_sales || 0).toFixed(1)}</td>
                          <td class="workbook-num">${Number(r.purchases || 0).toFixed(1)}</td>
                          <td class="workbook-num">${Number(r.net_movement || 0).toFixed(1)}</td>
                          <td class="workbook-num">${Number(r.adjusted_variance || 0).toFixed(2)}</td>
                          <td class="workbook-num">${r.cost ? reportMoney(r.cost, 2) : "—"}</td>
                          <td class="workbook-num">${reportMoney(r.line_value || 0)}</td>
                        </tr>`
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>`;

    // Tab wiring
    const activateTab = (name) => {
      root.querySelectorAll(".rpt-tab").forEach((t) => {
        t.classList.toggle("active", t.dataset.rptPanel === name);
      });
      root.querySelectorAll(".rpt-panel").forEach((p) => {
        p.classList.toggle("active", p.dataset.rptPanelBody === name);
      });
    };

    root.querySelectorAll(".rpt-tab").forEach((tab) => {
      tab.addEventListener("click", () => activateTab(tab.dataset.rptPanel));
    });

    root.querySelectorAll("[data-rpt-tab]").forEach((btn) => {
      btn.addEventListener("click", () => activateTab(btn.dataset.rptTab));
    });

    root.querySelectorAll("[data-rpt-go]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const go = btn.dataset.rptGo;
        if (go === "smart-orders") openSmartOrdersPanel();
        else if (go === "mobile-count") document.getElementById("btnMobileCount")?.click();
        else if (go === "recipes") openRecipesPanel();
        else if (go === "transfer") openTransferPanel();
      });
    });

    root.querySelector("#rptExportCsv")?.addEventListener("click", () => {
      reportExportCsv(a);
      const st = root.querySelector("#rptExportStatus");
      if (st) st.textContent = "CSV downloaded — open it in Excel or Sheets.";
    });

    root.querySelector("#rptCopyStory")?.addEventListener("click", async () => {
      const text = reportExportStoryText(a, story);
      const ok = await copyToClipboard(text);
      const st = root.querySelector("#rptExportStatus");
      if (st) st.textContent = ok ? "Summary copied — paste anywhere." : "Copy failed — use Save .txt instead.";
    });

    root.querySelector("#rptDownloadStory")?.addEventListener("click", () => {
      const text = reportExportStoryText(a, story);
      downloadTextFile(`osb-shift-report-${new Date().toISOString().slice(0, 10)}.txt`, text);
      const st = root.querySelector("#rptExportStatus");
      if (st) st.textContent = "Plain-English summary saved.";
    });
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
        const pos = r.pos_sales || 0;
        const purch = r.purchases || 0;
        // V1.5: adjusted variance incorporating recent POS sales and purchases (real usage: purchases - sales)
        const net = purch - pos;
        const adjusted = v - net;
        return { ...r, variance: v, variancePct: pct, status, pos_sales: pos, purchases: purch, adjusted_variance: adjusted, net_movement: net };
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
        ["Product", "Station", "Current", "Par", "POS Sales", "Purchases", "Need"],
        filtered.map((r) => [
          escapeHtml(r.name),
          escapeHtml(r.station),
          r.current_level.toFixed(2),
          r.par_level.toFixed(2),
          (r.pos_sales || 0).toFixed(1),
          (r.purchases || 0).toFixed(1),
          `+${(r.par_level - r.current_level).toFixed(2)}`,
        ])
      );
    }

    return renderWorkbookTable(
      ["Product", "Station", "Current", "Par", "POS Sales", "Purchases", "Net", "Variance", "Var %", "Adj Var", "Status"],
      filtered.map((r) => [
        escapeHtml(r.name),
        escapeHtml(r.station),
        r.current_level.toFixed(2),
        r.par_level.toFixed(2),
        (r.pos_sales || 0).toFixed(1),
        (r.purchases || 0).toFixed(1),
        (r.net_movement || 0).toFixed(1),
        `${r.variance >= 0 ? "+" : ""}${r.variance.toFixed(2)}`,
        `${r.variancePct >= 0 ? "+" : ""}${r.variancePct.toFixed(0)}%`,
        `${r.adjusted_variance >= 0 ? "+" : ""}${r.adjusted_variance.toFixed(2)}`,
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

// V1.5 POS structured review (smoother than competitors: parse + auto-match + review matches before save)
let pendingPosParse = null;

function renderPosParsePreview(lines) {
  const box = document.getElementById("posParsePreview");
  if (!box || !lines || !lines.length) {
    if (box) {
      box.classList.add("hidden");
      box.innerHTML = "";
    }
    return;
  }
  const bottles = allBottles();
  const rows = lines
    .map((ln, i) => {
      const match = autoMatchProduct(ln.product, bottles);
      const matchName = match ? escapeHtml(match.name) : "unmatched";
      const matchId = match ? match.id : "";
      return `<tr class="${i % 2 ? "workbook-row-alt" : ""}">
        <td><input type="text" class="pos-match-product" value="${escapeHtml(ln.product)}" data-idx="${i}" /></td>
        <td class="workbook-num">${ln.qty ?? ""}</td>
        <td class="workbook-num">${ln.price != null ? `$${Number(ln.price).toFixed(2)}` : "—"}</td>
        <td>
          <select class="pos-match-select" data-idx="${i}">
            <option value="">-- ${matchName} --</option>
            ${bottles.map(b => `<option value="${b.id}" ${b.id === matchId ? "selected" : ""}>${escapeHtml(b.name)} (${b.size})</option>`).join("")}
          </select>
        </td>
      </tr>`;
    })
    .join("");
  box.classList.remove("hidden");
  box.innerHTML = `
    <div class="invoice-parse-head">
      <strong>Parsed POS lines</strong>
      <span class="field-hint">${lines.length} lines • review matches (auto-filled where possible)</span>
    </div>
    <div class="workbook-table-wrap scroll-panel">
      <table class="workbook-table review-table">
        <thead><tr><th>Product (edit)</th><th>Qty</th><th>Price</th><th>Match to bottle</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="actions">
      <button type="button" class="btn btn-primary" id="btnSaveParsedPos">Save reviewed POS →</button>
      <button type="button" class="btn btn-ghost" id="btnDiscardPosParse">Discard</button>
    </div>`;
  document.getElementById("btnSaveParsedPos")?.addEventListener("click", savePendingPosParse);
  document.getElementById("btnDiscardPosParse")?.addEventListener("click", () => {
    pendingPosParse = null;
    box.classList.add("hidden");
    box.innerHTML = "";
  });
}

async function savePendingPosParse() {
  if (!pendingPosParse) return;
  const box = document.getElementById("posParsePreview");
  const label = document.getElementById("posLabel")?.value?.trim();
  const note = document.getElementById("posNote")?.value?.trim();
  // Collect reviewed lines with matches
  const reviewedLines = [];
  const productInputs = box.querySelectorAll(".pos-match-product");
  const selectInputs = box.querySelectorAll(".pos-match-select");
  const bottles = allBottles();
  for (let i = 0; i < productInputs.length; i++) {
    const prod = productInputs[i].value.trim();
    const sel = selectInputs[i];
    const matchId = sel ? sel.value : "";
    const match = matchId ? bottles.find(b => b.id === matchId) : null;
    reviewedLines.push({
      product: prod,
      qty: pendingPosParse[i].qty,
      price: pendingPosParse[i].price,
      matched_bottle_id: matchId || null,
      matched_name: match ? match.name : null
    });
  }
  try {
    await OSB.uploadPosLog({
      label: label || "POS drop",
      note,
      text: "", // no raw text needed
      inputType: "pos",
      parsed_pos: { lines: reviewedLines, source: "reviewed" }
    });
    pendingPosParse = null;
    box.classList.add("hidden");
    box.innerHTML = "";
    document.getElementById("posFile").value = "";
    document.getElementById("posPaste").value = "";
    document.getElementById("posLabel").value = "";
    document.getElementById("posNote").value = "";
    setStatus("Reviewed POS saved to input log with matches.", "posParseStatus");
    await loadInputsHub();
    await loadMetrics();
  } catch (e) {
    setStatus(e.message, "posParseStatus");
  }
}

// V1.5 Receiving workflow (tie to smart orders / PO suggestions, log actuals, flag discrepancies for variance)
let receiveItems = [];

async function loadSmartForReceive() {
  const listEl = document.getElementById("receiveList");
  if (!listEl) return;
  const salesMap = {}; // reuse logic from smart orders
  const posData = await OSB.getPosLog();
  for (const entry of (posData.entries || []).slice(0, 5)) {
    const lines = entry.parsed_pos?.lines || [];
    for (const line of lines) {
      const key = (line.product || "").toLowerCase().trim();
      if (key) salesMap[key] = (salesMap[key] || 0) + (line.qty || 0);
    }
  }
  const orders = generateSmartOrders(salesMap);
  receiveItems = orders.map(o => ({...o, received: o.suggested})); // default to suggested
  renderReceiveList();
  setStatus("Loaded suggestions for receive. Edit received qty as needed.", "receiveStatus");
}

function renderReceiveList() {
  const listEl = document.getElementById("receiveList");
  if (!listEl) return;
  if (!receiveItems.length) {
    listEl.innerHTML = `<p class="field-hint">No suggestions loaded. Click "Load from smart orders" or add manually.</p>`;
    return;
  }
  listEl.innerHTML = receiveItems.map((item, idx) => `
    <div class="bar-list-item" style="display:flex; align-items:center; gap:8px;">
      <span style="flex:1;"><strong>${escapeHtml(item.name)}</strong> ${escapeHtml(item.size)} @ ${item.station}</span>
      <label style="font-size:0.8rem;">Suggested: ${item.suggested}</label>
      <input type="number" step="0.1" min="0" value="${item.received}" style="width:70px;" data-receive-idx="${idx}" class="receive-qty" />
      <button class="btn btn-ghost btn-sm" data-remove-receive="${idx}">×</button>
    </div>
  `).join('');
  // wire qty changes
  listEl.querySelectorAll('.receive-qty').forEach(inp => {
    inp.onchange = () => {
      const idx = parseInt(inp.dataset.receiveIdx);
      receiveItems[idx].received = parseFloat(inp.value) || 0;
    };
  });
  listEl.querySelectorAll('[data-remove-receive]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.removeReceive);
      receiveItems.splice(idx, 1);
      renderReceiveList();
    };
  });
}

async function logReceipt() {
  const statusEl = document.getElementById("receiveStatus");
  if (!receiveItems.length) {
    setStatus("No items to receive.", statusEl ? "receiveStatus" : null);
    return;
  }
  try {
    for (const item of receiveItems) {
      const discrepancy = item.received - item.suggested;
      const note = discrepancy !== 0 ? `Discrepancy: ${discrepancy > 0 ? '+' : ''}${discrepancy}` : '';
      await OSB.uploadPosLog({
        label: `Receive: ${item.name}`,
        note: `From suggestions @ ${item.station}. Suggested ${item.suggested}, received ${item.received}. ${note}`,
        text: `Received ${item.received} of ${item.name}`,
        inputType: "purchase"
      });
    }
    setStatus("Receipt logged. Discrepancies noted for variance.", "receiveStatus");
    receiveItems = [];
    document.getElementById("receiveList").innerHTML = "";
    await loadInputsHub();
  } catch (e) {
    setStatus("Log failed: " + e.message, "receiveStatus");
  }
}

// wire
document.getElementById("btnLoadSmartForReceive")?.addEventListener("click", loadSmartForReceive);
document.getElementById("btnLogReceipt")?.addEventListener("click", logReceipt);

function inputTypeLabel(type) {
  if (type === "invoice") return "Invoice";
  if (type === "purchase") return "Purchase/Receive";
  if (type === "po") return "PO / Order";
  return "POS";
}

// V1.5 Full structured POS import: parse CSV/Toast/Square text better + auto-match to bottles
function parsePosText(text) {
  if (!text || !text.trim()) return null;
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return null;

  const headerLine = lines[0].toLowerCase().replace(/"/g, '').split(/,|\t/).map(h => h.trim());
  const dataLines = lines.slice(1);

  // Flexible header mapping for Toast, Square, generic, Aloha etc.
  const colMap = {};
  headerLine.forEach((h, i) => {
    if (h.includes('item') || h.includes('name') || h.includes('product') || h.includes('description') || h.includes('item name')) colMap.product = i;
    if (h.includes('qty') || h.includes('quantity') || h.includes('sold') || h.includes('count') || h.includes('quantity sold')) colMap.qty = i;
    if (h.includes('price') || h.includes('sales') || h.includes('amount') || h.includes('net') || h.includes('total') || h.includes('net sales') || h.includes('price sold')) colMap.price = i;
  });

  const rows = [];
  for (const line of dataLines) {
    const cols = line.replace(/"/g, '').split(/,|\t/).map(c => c.trim());
    let product = '';
    let qty = 0;
    let price = 0;

    if (colMap.product != null) product = cols[colMap.product] || '';
    if (colMap.qty != null) qty = parseFloat(cols[colMap.qty]) || 0;
    if (colMap.price != null) price = parseFloat(cols[colMap.price]) || 0;

    // Fallback guess if no good headers (common for simple exports)
    if (!product && cols.length > 0) product = cols[0];
    if (qty === 0 && cols.length > 1) qty = parseFloat(cols[1]) || 0;
    if (price === 0 && cols.length > 2) price = parseFloat(cols[2]) || 0;

    // Toast specific cleanup
    if (product.includes(' - ') && product.split(' - ').length > 1) {
      product = product.split(' - ')[0].trim(); // e.g. "Tequila - Well" -> "Tequila"
    }

    if (product) {
      rows.push({ product, qty: Math.max(0, qty), price: Math.max(0, price) });
    }
  }
  return rows.length ? rows : null;
}

function autoMatchProduct(productName, bottles) {
  if (!productName || !bottles || !bottles.length) return null;
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const pnorm = norm(productName);
  let best = null;
  let bestScore = 0;
  for (const b of bottles) {
    const bnorm = norm(b.name);
    if (!bnorm) continue;
    let score = 0;
    if (bnorm === pnorm) score = 100;
    else if (bnorm.includes(pnorm) || pnorm.includes(bnorm)) score = 80;
    else {
      const words = pnorm.split(' ').filter(w => w.length > 2);
      const bwords = bnorm.split(' ');
      const matchWords = words.filter(w => bwords.some(bw => bw.includes(w) || w.includes(bw)));
      score = (matchWords.length / Math.max(words.length, 1)) * 60;
    }
    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  }
  return bestScore > 20 ? best : null;
}

function inputTypeClass(type) {
  if (type === "invoice") return "inputs-log-pill--invoice";
  if (type === "purchase") return "inputs-log-pill--purchase";
  if (type === "po") return "inputs-log-pill--po";
  return "inputs-log-pill--pos";
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
          : inputsLogFilter === "purchase"
            ? "No purchases/receives logged yet — use Receive section above."
            : inputsLogFilter === "po"
              ? "No purchase orders logged yet — generate one from Smart Orders."
              : "No inputs staged yet — add POS, invoices, orders, or start your next count above.";
    list.innerHTML = `<p class="field-hint">${hint}</p>`;
    return;
  }
  const bottles = allBottles(); // for auto-match
  list.innerHTML = entries
    .map((e) => {
      const type = e.input_type || "pos";
      const parsed = e.parsed_invoice;
      let parsedNote = "";
      if (parsed?.line_count) {
        parsedNote = `<span class="field-hint">${parsed.line_count} line items parsed (${escapeHtml(parsed.parse_source || "")})</span>`;
      } else if (e.parsed_pos?.lines?.length) {
        const lines = e.parsed_pos.lines;
        const matched = lines.filter(l => autoMatchProduct(l.product, bottles)).length;
        parsedNote = `<span class="field-hint">${lines.length} lines • ${matched} auto-matched</span>`;
        // Show first few for preview
        const preview = lines.slice(0, 2).map(l => {
          const match = autoMatchProduct(l.product, bottles);
          const matchStr = match ? ` → ${escapeHtml(match.name)}` : '';
          return `${escapeHtml(l.product)} x${l.qty}${matchStr}`;
        }).join("; ");
        parsedNote += ` <span class="field-hint" style="display:block;">${preview}</span>`;
      }
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

  // V1.5 weigh mode (optional, default false)
  const weighEl = document.getElementById("settWeighEnabled");
  if (weighEl) weighEl.checked = !!cfg.weigh_enabled;

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
  refreshVenuePanels().catch(() => {});
  renderBarsList("settingsBarsList", allBars, listed.active_bar_id, {
    onSelect: async (barId) => {
      await OSB.switchBar(barId);
      barState = normalizeBar(await OSB.getBar(false, barId));
      await refreshHomeBars();
      const data = await OSB.getState();
      const cfg = data.config;
  window.__osbConfig = cfg; // V1.5 expose for optional weigh etc.
      document.getElementById("settBarName").value = cfg.bar_name || "";
      setStatus("Active venue switched.", "settingsStatus");
      await loadMetrics();
      await loadAnalytics();
      await loadSpreadsheets();
      await loadInHouse();
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

/* ─── V1.5 People / PIN / Staff board ─── */
window.__osbAuth = { auth_enabled: false, logged_in: true, user: null };

function currentPerms() {
  const u = window.__osbAuth?.user;
  if (!window.__osbAuth?.auth_enabled) {
    return Object.fromEntries(Object.keys({
      dashboard:1,count:1,mobile_count:1,inputs:1,inhouse:1,reports:1,spreadsheets:1,
      recipes:1,smart_orders:1,transfers:1,settings:1,people:1,staff_board:1,other_venues:1,
    }).map((k) => [k, true]));
  }
  if (!u) return {};
  if (u.role === "admin") {
    return Object.fromEntries(
      Object.keys(u.permissions || {}).map((k) => [k, true]).concat(
        [["dashboard", true], ["people", true], ["settings", true]]
      )
    );
  }
  return { ...(u.permissions || {}) };
}

function can(perm) {
  if (!window.__osbAuth?.auth_enabled) return true;
  if (window.__osbAuth?.user?.role === "admin") return true;
  const p = currentPerms();
  return !!p[perm];
}

function applyRoleShell() {
  const auth = window.__osbAuth || {};
  const user = auth.user;
  const perms = currentPerms();

  document.querySelectorAll("[data-perm]").forEach((el) => {
    const key = el.dataset.perm;
    const ok = !auth.auth_enabled || user?.role === "admin" || !!perms[key];
    el.classList.toggle("hidden", !ok);
    el.style.display = ok ? "" : "none";
  });
  document.querySelectorAll("[data-perm-panel]").forEach((el) => {
    const key = el.dataset.permPanel;
    const ok = !auth.auth_enabled || user?.role === "admin" || !!perms[key];
    el.classList.toggle("hidden", !ok);
  });

  // Session chip
  const chip = document.getElementById("sessionChip");
  const chipName = document.getElementById("sessionChipName");
  if (chip && chipName) {
    if (auth.auth_enabled && user) {
      chip.classList.remove("hidden");
      const roleLbl = user.role === "admin" ? "Admin" : "Manager";
      chipName.textContent = `${user.name || user.login} · ${roleLbl}`;
    } else if (auth.auth_enabled) {
      chip.classList.add("hidden");
    } else {
      chip.classList.add("hidden");
    }
  }

  // Manager: lock venue switcher look
  const sw = document.getElementById("barSwitcher");
  const swLabel = document.getElementById("barSwitcherLabel");
  if (user?.role === "manager") {
    if (sw) sw.disabled = true;
    if (swLabel) swLabel.textContent = "Your venue";
    const foot = document.getElementById("sidebarFootHint");
    if (foot) foot.textContent = "Your login is locked to this venue. Admin sees the full book.";
  } else {
    if (sw) sw.disabled = false;
    if (swLabel) swLabel.textContent = "Active venue";
  }

  // Settings people note
  const openNote = document.getElementById("peopleOpenModeNote");
  if (openNote) {
    openNote.classList.toggle("hidden", !!auth.auth_enabled);
  }
}

function showPinLogin(auth) {
  const overlay = document.getElementById("pinLoginOverlay");
  if (!overlay) return;
  overlay.classList.remove("hidden");
  const sel = document.getElementById("pinLoginUser");
  const users = auth.users_public || [];
  if (sel) {
    sel.innerHTML = users
      .map((u) => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.name || u.login)} (${escapeHtml(u.role || "")})</option>`)
      .join("");
  }
  const pinEl = document.getElementById("pinLoginPin");
  if (pinEl) pinEl.value = "";
  document.getElementById("pinLoginStatus").textContent = "";
}

function hidePinLogin() {
  document.getElementById("pinLoginOverlay")?.classList.add("hidden");
}

async function submitPinLogin() {
  const userId = document.getElementById("pinLoginUser")?.value || "";
  const pin = (document.getElementById("pinLoginPin")?.value || "").trim();
  const st = document.getElementById("pinLoginStatus");
  if (!/^\d{6}$/.test(pin)) {
    if (st) st.textContent = "PIN must be exactly 6 digits.";
    return;
  }
  try {
    if (st) st.textContent = "Checking…";
    const res = await OSB.login({ userId, pin });
    window.__osbAuth = res.auth || res;
    hidePinLogin();
    location.reload();
  } catch (e) {
    if (st) st.textContent = e.message || "Login failed";
  }
}

function bindPinLoginUi() {
  const pad = document.getElementById("pinPad");
  const pinEl = document.getElementById("pinLoginPin");
  if (!pad || pad.dataset.bound) return;
  pad.dataset.bound = "1";
  pad.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pin]");
    if (!btn || !pinEl) return;
    const k = btn.dataset.pin;
    if (k === "clear") pinEl.value = "";
    else if (k === "ok") submitPinLogin();
    else if (pinEl.value.length < 6) pinEl.value += k;
    if (pinEl.value.length === 6 && k !== "ok" && k !== "clear") {
      // auto-submit when 6 digits entered
    }
  });
  pinEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitPinLogin();
  });
}

const PEOPLE_PERM_KEYS = [
  ["count", "Count / Process"],
  ["mobile_count", "Mobile count"],
  ["inputs", "Weekly inputs"],
  ["inhouse", "In-house"],
  ["reports", "Reports (own venue)"],
  ["spreadsheets", "Spreadsheets / PARs"],
  ["recipes", "Recipes"],
  ["smart_orders", "Smart orders / PO"],
  ["transfers", "Transfers"],
  ["staff_board", "Employee communications"],
  ["settings", "Settings"],
];

function renderPeoplePermChecks(container, selected = {}) {
  if (!container) return;
  const defaults = {
    count: true, mobile_count: true, inputs: true, inhouse: true, reports: true,
    spreadsheets: false, recipes: false, smart_orders: false, transfers: false,
    staff_board: true, settings: false,
  };
  container.innerHTML = PEOPLE_PERM_KEYS.map(([k, label]) => {
    const on = selected[k] != null ? selected[k] : defaults[k];
    return `<label class="people-perm-item"><input type="checkbox" data-perm-key="${k}" ${on ? "checked" : ""}/> ${label}</label>`;
  }).join("");
}

function readPeoplePermChecks(container) {
  const out = {};
  container?.querySelectorAll("[data-perm-key]").forEach((inp) => {
    out[inp.dataset.permKey] = !!inp.checked;
  });
  return out;
}

async function loadPeoplePanel() {
  const list = document.getElementById("peopleList");
  const venueSel = document.getElementById("peopleVenue");
  const openNote = document.getElementById("peopleOpenModeNote");
  if (!list) return;
  try {
    // venues for assign
    const bars = (await OSB.listBars()).bars || [];
    if (venueSel) {
      venueSel.innerHTML = bars.map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name || "Venue")}</option>`).join("")
        || `<option value="">Add a venue first</option>`;
    }
    renderPeoplePermChecks(document.getElementById("peoplePerms"));

    let data;
    try {
      data = await OSB.listPeople();
    } catch (e) {
      list.innerHTML = `<p class="field-hint">${escapeHtml(e.message)}</p>`;
      return;
    }
    if (openNote) openNote.classList.toggle("hidden", (data.users || []).length > 0);

    const users = data.users || [];
    if (!users.length) {
      list.innerHTML = `<p class="field-hint">Create your <strong>admin</strong> first (role: Admin, any 6-digit PIN). Then add bar managers locked to a venue.</p>`;
      const role = document.getElementById("peopleRole");
      if (role) role.value = "admin";
      document.getElementById("peopleVenueField")?.classList.add("hidden");
      document.getElementById("peoplePerms")?.classList.add("hidden");
      return;
    }
    document.getElementById("peopleVenueField")?.classList.remove("hidden");
    document.getElementById("peoplePerms")?.classList.remove("hidden");

    list.innerHTML = users.map((u) => {
      const venueName = bars.find((b) => b.id === u.venue_id)?.name || (u.role === "admin" ? "All venues" : "—");
      return `<div class="people-row" data-user-id="${escapeHtml(u.id)}">
        <div>
          <strong>${escapeHtml(u.name)}</strong>
          <span class="field-hint">@${escapeHtml(u.login)} · ${escapeHtml(u.role)} · ${escapeHtml(venueName)}${u.active ? "" : " · inactive"}</span>
        </div>
        <div class="people-row-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-reset-pin="${escapeHtml(u.id)}">Reset PIN</button>
          ${u.role === "manager" ? `<button type="button" class="btn btn-ghost btn-sm" data-toggle-active="${escapeHtml(u.id)}" data-active="${u.active ? "1" : "0"}">${u.active ? "Deactivate" : "Activate"}</button>` : ""}
          <button type="button" class="btn btn-ghost btn-sm" data-del-person="${escapeHtml(u.id)}">Remove</button>
        </div>
      </div>`;
    }).join("");

    list.querySelectorAll("[data-reset-pin]").forEach((btn) => {
      btn.onclick = async () => {
        const pin = window.prompt("New 6-digit PIN for this person:");
        if (!pin) return;
        try {
          await OSB.resetPersonPin(btn.dataset.resetPin, pin.trim());
          setStatus("PIN reset — tell them the new 6 digits.", "peopleStatus");
        } catch (e) {
          setStatus(e.message, "peopleStatus");
        }
      };
    });
    list.querySelectorAll("[data-toggle-active]").forEach((btn) => {
      btn.onclick = async () => {
        try {
          const active = btn.dataset.active !== "1";
          await OSB.updatePerson(btn.dataset.toggleActive, { active });
          await loadPeoplePanel();
        } catch (e) {
          setStatus(e.message, "peopleStatus");
        }
      };
    });
    list.querySelectorAll("[data-del-person]").forEach((btn) => {
      btn.onclick = async () => {
        if (!window.confirm("Remove this login?")) return;
        try {
          await OSB.deletePerson(btn.dataset.delPerson);
          await loadPeoplePanel();
          setStatus("Person removed.", "peopleStatus");
        } catch (e) {
          setStatus(e.message, "peopleStatus");
        }
      };
    });
  } catch (e) {
    list.innerHTML = `<p class="status">${escapeHtml(e.message)}</p>`;
  }
}

async function loadStaffBoard() {
  const list = document.getElementById("staffBoardList");
  const venueSel = document.getElementById("staffPostVenue");
  if (!list) return;
  try {
    const bars = (await OSB.listBars()).bars || [];
    if (venueSel) {
      const isAdmin = !window.__osbAuth?.auth_enabled || window.__osbAuth?.user?.role === "admin";
      if (isAdmin) {
        venueSel.innerHTML = `<option value="">Company-wide</option>` +
          bars.map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name || "Venue")}</option>`).join("");
        document.getElementById("staffVenueWrap")?.classList.remove("hidden");
        document.getElementById("staffPinWrap")?.classList.remove("hidden");
      } else {
        document.getElementById("staffVenueWrap")?.classList.add("hidden");
        document.getElementById("staffPinWrap")?.classList.add("hidden");
      }
    }
    const data = await OSB.listStaffBoard();
    const posts = data.posts || [];
    if (!posts.length) {
      list.innerHTML = `<p class="field-hint">No inventory notes yet. Managers upload walks and mid-week catches above.</p>`;
      return;
    }
    const venueName = (id) => bars.find((b) => b.id === id)?.name || "Company";
    list.innerHTML = posts.map((p) => {
      const fileBit =
        p.source === "file" && p.file_name
          ? ` · ${escapeHtml(p.file_name)}`
          : p.source === "file"
            ? " · file"
            : "";
      return `
      <div class="staff-post${p.pinned ? " staff-post--pinned" : ""}">
        <div class="staff-post-meta">
          <strong>${escapeHtml(p.author_name || "Staff")}</strong>
          <span class="field-hint">${escapeHtml((p.created_at || "").slice(0, 16).replace("T", " "))}
            · ${p.venue_id ? escapeHtml(venueName(p.venue_id)) : "Company-wide"}
            ${p.pinned ? " · pinned" : ""}${fileBit}</span>
        </div>
        <p class="staff-post-body">${escapeHtml(p.text || "")}</p>
        <button type="button" class="btn btn-ghost btn-sm" data-del-post="${escapeHtml(p.id)}">Remove</button>
      </div>`;
    }).join("");
    list.querySelectorAll("[data-del-post]").forEach((btn) => {
      btn.onclick = async () => {
        try {
          await OSB.deleteStaffPost(btn.dataset.delPost);
          await loadStaffBoard();
        } catch (e) {
          setStatus(e.message, "staffBoardStatus");
        }
      };
    });
  } catch (e) {
    list.innerHTML = `<p class="status">${escapeHtml(e.message)}</p>`;
  }
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

  // Auth gate
  window.__osbAuth = data.auth || { auth_enabled: false, logged_in: true };
  bindPinLoginUi();
  if (window.__osbAuth.auth_enabled && !window.__osbAuth.logged_in) {
    showPinLogin(window.__osbAuth);
    // still bind logout etc. after login reload
  } else {
    hidePinLogin();
  }

  const cfg = data.config;
  window.__osbConfig = cfg; // V1.5 expose for optional weigh etc.
  const cycleText =
    cfg.cycle?.mode === "monthly"
      ? `${cfg.cycle?.label || "Inventory cycle"} · monthly, starts on the 1st`
      : `${cfg.cycle?.label || "Inventory cycle"} · weekly, starts Monday`;

  document.getElementById("sidebarCycleLabel")?.replaceChildren(document.createTextNode(cycleText));
  await refreshHomeBars();
  applyRoleShell();

  fillMetricsSelect(
    document.getElementById("metricsWindow"),
    cfg.metrics_windows,
    cfg.metrics_default_window
  );

  await populateSettings(cfg);
  refreshInvoiceAiStatus(cfg);
  if (window.__osbAuth.logged_in !== false) {
    await loadMetrics();
    if (can("people") || !window.__osbAuth.auth_enabled) await loadPeoplePanel();
  }

  if (homeListenersBound) return;
  homeListenersBound = true;

  document.querySelectorAll(".sidebar-link").forEach((btn) => {
    btn.addEventListener("click", async () => {
      switchAdminView(btn.dataset.view);
      if (btn.dataset.view === "spreadsheets") await loadSpreadsheets();
      if (btn.dataset.view === "analytics") await loadAnalytics();
      if (btn.dataset.view === "inhouse") await loadInHouse();
      if (btn.dataset.view === "inputs") await loadInputsHub();
      if (btn.dataset.view === "staff") await loadStaffBoard();
      if (btn.dataset.view === "settings") await loadPeoplePanel();
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
      // V1.5 preview for structured
      if (text) {
        const parsed = parsePosText(text);
        if (parsed) {
          const bottles = allBottles();
          const matchedCount = parsed.filter(p => autoMatchProduct(p.product, bottles)).length;
          setStatus(`Parsed ${parsed.length} lines (${matchedCount} matched). Saving...`, "posStatus");
        }
      }
      await OSB.uploadPosLog({ label, note, file, text, inputType: "pos" });
      document.getElementById("posFile").value = "";
      document.getElementById("posPaste").value = "";
      document.getElementById("posLabel").value = "";
      document.getElementById("posNote").value = "";
      setStatus("POS drop saved with structured data.", "posStatus");
      await loadInputsHub();
      await loadMetrics();
    } catch (e) {
      setStatus(e.message, "posStatus");
    }
  });

  // V1.5 POS parse & review
  document.getElementById("btnPosParse")?.addEventListener("click", async () => {
    const file = document.getElementById("posFile")?.files?.[0];
    const text = document.getElementById("posPaste")?.value?.trim();
    const statusEl = "posParseStatus";
    if (!file && !text) {
      setStatus("Paste text or select CSV for POS.", statusEl);
      return;
    }
    try {
      let parseText = text;
      if (file) {
        parseText = await file.text();
      }
      const parsed = parsePosText(parseText);
      if (!parsed || !parsed.length) {
        setStatus("Could not parse structured lines from POS data.", statusEl);
        return;
      }
      pendingPosParse = parsed;
      renderPosParsePreview(parsed);
      setStatus(`Parsed ${parsed.length} lines. Review matches above, then save.`, statusEl);
    } catch (e) {
      setStatus("Parse failed: " + e.message, statusEl);
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
    barState = normalizeBar(await OSB.getBar(false, e.target.value));
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
    const name = window.prompt("Name for the new venue:", "e.g. Patio Bar");
    if (!name?.trim()) return;
    try {
      await OSB.createBar(name.trim(), true);
      window.location.href = "/";
    } catch (e) {
      setStatus(e.message, "settingsStatus");
    }
  });

  // V1.5 multi-venue transfer entry points
  document.getElementById("btnOpenTransfer")?.addEventListener("click", () => openTransferPanel());
  document.getElementById("btnTransferStock")?.addEventListener("click", () => openTransferPanel());
  document.getElementById("btnTransferFromSettings")?.addEventListener("click", () => openTransferPanel());

  // V1.5 people / PIN / staff board
  document.getElementById("btnLogout")?.addEventListener("click", async () => {
    await OSB.logout();
    location.reload();
  });
  document.getElementById("peopleRole")?.addEventListener("change", (e) => {
    const manager = e.target.value === "manager";
    document.getElementById("peopleVenueField")?.classList.toggle("hidden", !manager);
    document.getElementById("peoplePerms")?.classList.toggle("hidden", !manager);
  });
  document.getElementById("btnPeopleCreate")?.addEventListener("click", async () => {
    const name = document.getElementById("peopleName")?.value?.trim();
    const login = document.getElementById("peopleLogin")?.value?.trim();
    const pin = document.getElementById("peoplePin")?.value?.trim();
    const role = document.getElementById("peopleRole")?.value || "manager";
    const venueId = document.getElementById("peopleVenue")?.value || "";
    const permissions = readPeoplePermChecks(document.getElementById("peoplePerms"));
    try {
      await OSB.createPerson({ name, login, pin, role, venue_id: venueId, permissions });
      document.getElementById("peopleName").value = "";
      document.getElementById("peopleLogin").value = "";
      document.getElementById("peoplePin").value = "";
      setStatus("Saved. Give them their login + 6-digit PIN.", "peopleStatus");
      await loadPeoplePanel();
      // refresh auth status
      const st = await OSB.authStatus();
      window.__osbAuth = st;
      applyRoleShell();
    } catch (e) {
      setStatus(e.message, "peopleStatus");
    }
  });
  // Employee communications — inventory notes upload (Salle parity)
  window.__staffNotesFileName = "";
  document.getElementById("staffNotesFile")?.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    const hint = document.getElementById("staffFileHint");
    if (!file) return;
    const lower = (file.name || "").toLowerCase();
    if (
      !lower.endsWith(".txt") &&
      !lower.endsWith(".md") &&
      !lower.endsWith(".markdown") &&
      !lower.endsWith(".rtf") &&
      !(file.type || "").startsWith("text/")
    ) {
      setStatus("Use a .txt or .md file (phone Notes export works best).", "staffBoardStatus");
      ev.target.value = "";
      return;
    }
    try {
      const content = await file.text();
      if (!content.trim()) {
        setStatus("That file was empty.", "staffBoardStatus");
        return;
      }
      const ta = document.getElementById("staffPostText");
      if (ta) ta.value = content;
      window.__staffNotesFileName = file.name;
      if (hint) {
        hint.textContent = `Loaded ${file.name} (${Math.round(file.size / 1024) || 1} KB) — review below, then save.`;
      }
      setStatus(`Loaded ${file.name} — review and click Save inventory notes.`, "staffBoardStatus");
    } catch {
      setStatus("Could not read that file.", "staffBoardStatus");
    }
    ev.target.value = "";
  });
  document.getElementById("btnStaffClear")?.addEventListener("click", () => {
    const ta = document.getElementById("staffPostText");
    if (ta) ta.value = "";
    window.__staffNotesFileName = "";
    const hint = document.getElementById("staffFileHint");
    if (hint) hint.textContent = "";
    setStatus("", "staffBoardStatus");
  });
  document.getElementById("btnStaffPost")?.addEventListener("click", async () => {
    const text = document.getElementById("staffPostText")?.value?.trim();
    const venueId = document.getElementById("staffPostVenue")?.value || "";
    const pinned = !!document.getElementById("staffPostPin")?.checked;
    const fileName = window.__staffNotesFileName || "";
    if (!text) {
      setStatus("Paste or upload inventory notes first.", "staffBoardStatus");
      return;
    }
    try {
      await OSB.postStaffBoard({
        text,
        venueId,
        pinned,
        source: fileName ? "file" : "paste",
        fileName,
      });
      document.getElementById("staffPostText").value = "";
      window.__staffNotesFileName = "";
      const hint = document.getElementById("staffFileHint");
      if (hint) hint.textContent = "";
      setStatus(
        fileName ? `Uploaded ${fileName} — stays on this machine.` : "Inventory notes saved — stays on this machine.",
        "staffBoardStatus",
      );
      await loadStaffBoard();
    } catch (e) {
      setStatus(e.message, "staffBoardStatus");
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

  // V1.5 optional weigh save
  document.getElementById("btnSaveWeigh")?.addEventListener("click", async () => {
    const enabled = !!document.getElementById("settWeighEnabled")?.checked;
    await OSB.saveConfig({ weigh_enabled: enabled });
    // Refresh to apply to UI (show/hide weight fields)
    const fresh = await OSB.getState();
    await refreshHomeBars();
    // Re-render current view if needed to toggle columns
    if (document.querySelector('.admin-view.active[data-view="dashboard"]')) {
      // simple reload of tables
      location.reload(); // quick for now; in full would re-render conditionally
    }
    setStatus(enabled ? "Weighing mode enabled — weight fields will appear in counts." : "Weighing mode disabled (levels only).", "settingsStatus");
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

  // V1.5 Phase 1.2 — Mobile Count launcher (large taps, optional weigh)
  document.getElementById("btnMobileCount")?.addEventListener("click", () => {
    openMobileCount();
  });

  document.getElementById("btnRecipes")?.addEventListener("click", () => {
    openRecipesPanel();
  });

  document.getElementById("btnSmartOrders")?.addEventListener("click", async () => {
    await openSmartOrdersPanel();
  });
}

function openRecipesPanel() {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(8,12,18,0.96);z-index:9999;display:flex;flex-direction:column;";
  overlay.innerHTML = `
    <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg);">
      <span style="font-family:var(--font-serif);font-size:1.1rem;color:var(--copper-bright);">Recipes & Menu Costing</span>
      <button id="closeRecipes" style="background:transparent;border:1px solid var(--border);color:var(--text);padding:6px 12px;border-radius:4px;font-size:0.9rem;">Close</button>
    </div>
    <div id="recipesContent" style="flex:1;overflow:auto;padding:12px;"></div>
  `;
  document.body.appendChild(overlay);
  const content = overlay.querySelector("#recipesContent");
  renderRecipesPanel(content);
  overlay.querySelector("#closeRecipes").onclick = () => document.body.removeChild(overlay);
}

// store for scan closure
window.__currentMobileOverlay = null;

/* V1.5 Phase 1.2 Mobile Count — hand-crafted, fun yet professional.
   No generic AI patterns. Large 52px+ taps. Follows map order.
   Weigh optional via existing setting. Fast presets. Saves to current count.
   Matches copper/dark/tactile language from existing UI.
*/
function openMobileCount() {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(8,12,18,0.96);z-index:9999;display:flex;flex-direction:column;";
  overlay.innerHTML = `
    <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg);">
      <div>
        <span style="font-family:var(--font-serif);font-size:1.1rem;color:var(--copper-bright);">Mobile Count</span>
        <span style="font-size:0.75rem;color:var(--text-muted);margin-left:8px;">V1.5 • tap to count</span>
      </div>
      <div style="display:flex; gap:6px;">
        <button id="lockBlueprint" style="background:transparent;border:1px solid var(--copper);color:var(--copper-bright);padding:4px 8px;border-radius:4px;font-size:0.75rem;">Lock order</button>
        <button id="closeMobile" style="background:transparent;border:1px solid var(--border);color:var(--text);padding:6px 12px;border-radius:4px;font-size:0.9rem;">Done</button>
      </div>
    </div>
    <div id="mobileCountContent" style="flex:1;overflow:auto;padding:12px;"></div>
    <div style="padding:12px;background:var(--bg);border-top:1px solid var(--border);">
      <button id="mobileSave" style="width:100%;min-height:48px;background:var(--copper);color:#080c12;border:none;border-radius:4px;font-weight:600;">Save to current count & close</button>
    </div>
  `;
  document.body.appendChild(overlay);
  window.__currentMobileOverlay = overlay;

  const content = overlay.querySelector("#mobileCountContent");
  renderMobileCountContent(content);

  overlay.querySelector("#closeMobile").onclick = () => {
    document.body.removeChild(overlay);
  };
  overlay.querySelector("#mobileSave").onclick = async () => {
    await persistBar(); // save whatever changes
    document.body.removeChild(overlay);
    // refresh main views if open
    if (typeof loadInHouse === "function") loadInHouse();
    if (typeof loadSpreadsheets === "function") loadSpreadsheets();
  };

  // Lock current bottle order as blueprint for recurring
  overlay.querySelector("#lockBlueprint").onclick = () => {
    if (!barState.stations) return;
    barState.blueprint = barState.stations.map(s => ({
      id: s.id,
      bottles: (s.bottles || []).map(b => b.id)
    }));
    persistBar();
    alert("Walk order locked as blueprint. Next mobile count will follow it.");
  };
}

function renderMobileCountContent(container) {
  const stations = sortedStations();
  if (!stations.length) {
    container.innerHTML = `<p style="color:var(--text-muted);padding:20px;">No map yet — finish setup first.</p>`;
    return;
  }

  const weighOn = !!(window.__osbConfig && window.__osbConfig.weigh_enabled);
  let html = "";

  stations.forEach(station => {
    const bottles = (station.bottles || []);
    if (!bottles.length) return;

    html += `<div class="mobile-count-station"><h3>${escapeHtml(station.name)}</h3>`;

    bottles.forEach(bottle => {
      const current = weighOn && bottle.weight_mode === "weight" && bottle.current_weight_oz != null 
        ? `${bottle.current_weight_oz} oz` 
        : (bottle.current_level ?? 0);
      const name = escapeHtml(bottle.name);
      const size = escapeHtml(bottle.size || "");

      html += `
        <div class="mobile-bottle" data-bottle="${bottle.id}" data-station="${station.id}">
          <div class="mobile-bottle-name">${name} <span style="font-size:0.75rem;color:var(--text-light);">${size}</span></div>
          <div class="mobile-bottle-value" id="val-${bottle.id}">${current}</div>
          <div class="mobile-taps">
            <button class="mobile-tap" data-action="minus" data-id="${bottle.id}" data-station="${station.id}">-</button>
            <button class="mobile-tap primary" data-action="plus" data-id="${bottle.id}" data-station="${station.id}">+</button>
            <button class="mobile-tap scan-btn" data-scan="${bottle.id}" data-station="${station.id}" title="Scan with camera">📷</button>
          </div>
        </div>
        <div class="mobile-presets" data-bottle="${bottle.id}" data-station="${station.id}">
          <button class="mobile-preset" data-preset="0">Empty</button>
          <button class="mobile-preset" data-preset="0.5">½</button>
          <button class="mobile-preset" data-preset="1">Full</button>
          ${weighOn ? `<button class="mobile-preset" data-preset="weight">Wt</button>` : ""}
        </div>
      `;
    });

    html += `</div>`;
  });

  container.innerHTML = html || `<p>No bottles on this map.</p>`;

  // initial color alerts
  const weighOnInit = !!(window.__osbConfig && window.__osbConfig.weigh_enabled);
  container.querySelectorAll('.mobile-bottle').forEach(el => {
    const id = el.dataset.bottle;
    const sid = el.dataset.station;
    const b = findBottleRecord(id, sid);
    if (b) updateMobileValue(id, b, weighOnInit);
  });

  // Wire taps (simple, direct on current data)
  container.querySelectorAll(".mobile-tap").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const sid = btn.dataset.station;
      const bottle = findBottleRecord(id, sid);
      if (!bottle) return;

      const action = btn.dataset.action;
      const weighOnLocal = !!(window.__osbConfig && window.__osbConfig.weigh_enabled);

      if (weighOnLocal && bottle.weight_mode === "weight") {
        if (!bottle.current_weight_oz) bottle.current_weight_oz = 25;
        bottle.current_weight_oz += (action === "plus" ? 0.5 : -0.5);
        if (bottle.current_weight_oz < 0) bottle.current_weight_oz = 0;
      } else {
        bottle.current_level = (bottle.current_level || 0) + (action === "plus" ? 0.1 : -0.1);
        if (bottle.current_level < 0) bottle.current_level = 0;
      }
      updateMobileValue(id, bottle, weighOnLocal);
    });
  });

  container.querySelectorAll(".mobile-preset").forEach(preset => {
    preset.addEventListener("click", () => {
      const id = preset.dataset.bottle || preset.closest(".mobile-bottle")?.dataset?.bottle;
      const sid = preset.dataset.station || preset.closest(".mobile-bottle")?.dataset?.station;
      if (!id || !sid) return;
      const bottle = findBottleRecord(id, sid);
      if (!bottle) return;

      const val = preset.dataset.preset;
      const weighOnLocal = !!(window.__osbConfig && window.__osbConfig.weigh_enabled);

      if (val === "weight" && weighOnLocal) {
        bottle.weight_mode = "weight";
        bottle.current_weight_oz = bottle.current_weight_oz || 12;
      } else if (val === "0") {
        if (weighOnLocal) { bottle.weight_mode = "weight"; bottle.current_weight_oz = bottle.full_weight_oz || 25; }
        else bottle.current_level = 0;
      } else if (val === "0.5") {
        if (weighOnLocal) { bottle.weight_mode = "weight"; bottle.current_weight_oz = (bottle.full_weight_oz || 25) * 0.5; }
        else bottle.current_level = 0.5;
      } else if (val === "1") {
        if (weighOnLocal) { bottle.weight_mode = "weight"; bottle.current_weight_oz = 0; }
        else bottle.current_level = 1;
      }
      updateMobileValue(id, bottle, weighOnLocal);
    });
  });

  // Barcode scan buttons (camera)
  container.querySelectorAll(".scan-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.scan;
      const sid = btn.dataset.station;
      startMobileBarcodeScan(id, sid, window.__currentMobileOverlay);
    });
  });
}

/* V1.5 Barcode scan with camera - optional, fun, professional.
   Opens camera for that bottle, capture increments count.
   Uses existing weigh mode if on. Clean, no slop.
*/
let currentStream = null;

function startMobileBarcodeScan(bottleId, stationId, parentOverlay) {
  const scanPanel = document.createElement("div");
  scanPanel.style.cssText = "position:absolute; inset:0; background:var(--bg); z-index:10; display:flex; flex-direction:column; padding:12px;";
  scanPanel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <strong style="color:var(--copper-bright);">Scan barcode / label</strong>
      <button id="closeScan" style="background:transparent; border:1px solid var(--border); color:var(--text); padding:4px 10px; border-radius:4px;">Close</button>
    </div>
    <video id="scanVideo" autoplay playsinline style="width:100%; max-height:240px; background:#000; border:1px solid var(--border); border-radius:4px;"></video>
    <canvas id="scanCanvas" style="display:none;"></canvas>
    <div style="margin-top:8px; display:flex; gap:8px;">
      <button id="captureScan" style="flex:1; min-height:48px; background:var(--copper); color:#080c12; border:none; border-radius:4px; font-weight:600;">Capture & Count</button>
    </div>
    <p style="font-size:0.75rem; color:var(--text-muted); margin-top:6px;">Point camera at bottle label or barcode. Capture increments this item.</p>
  `;
  parentOverlay.appendChild(scanPanel);  // overlay is the parent

  const video = scanPanel.querySelector("#scanVideo");
  const canvas = scanPanel.querySelector("#scanCanvas");
  const captureBtn = scanPanel.querySelector("#captureScan");
  const closeBtn = scanPanel.querySelector("#closeScan");

  closeBtn.onclick = () => {
    stopStream();
    parentOverlay.removeChild(scanPanel);
  };

  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(stream => {
      currentStream = stream;
      video.srcObject = stream;
    })
    .catch(err => {
      alert("Camera access failed: " + err.message + " (use manual taps)");
      parentOverlay.removeChild(scanPanel);
    });

  captureBtn.onclick = () => {
    if (!currentStream) return;
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // "Scan" success - increment the bottle
    const bottle = findBottleRecord(bottleId, stationId);
    if (bottle) {
      const weighOn = !!(window.__osbConfig && window.__osbConfig.weigh_enabled);
      if (weighOn && bottle.weight_mode === "weight") {
        bottle.current_weight_oz = (bottle.current_weight_oz || 25) - 0.5; // simulate pour/scan
        if (bottle.current_weight_oz < 0) bottle.current_weight_oz = 0;
      } else {
        bottle.current_level = (bottle.current_level || 0) + 0.1;
      }
      // update the main mobile value if still there
      const valEl = document.getElementById(`val-${bottleId}`);
      if (valEl) updateMobileValue(bottleId, bottle, weighOn);
    }

    // flash effect
    scanPanel.style.transition = "opacity 80ms";
    scanPanel.style.opacity = "0.3";
    setTimeout(() => {
      if (scanPanel.parentNode) scanPanel.parentNode.removeChild(scanPanel);
      stopStream();
    }, 120);
  };

  function stopStream() {
    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
      currentStream = null;
    }
  }
}

function updateMobileValue(bottleId, bottle, weighOn) {
  const valEl = document.getElementById(`val-${bottleId}`);
  if (!valEl) return;
  const par = bottle.par_level || 1;
  let lev = bottle.current_level ?? 0;
  if (weighOn && bottle.weight_mode === "weight" && bottle.current_weight_oz != null) {
    valEl.textContent = `${bottle.current_weight_oz.toFixed(1)} oz`;
    // rough lev for color
    const w = getBottleWeights(bottle.name);
    if (w && w.full_oz > w.empty_oz) lev = (w.full_oz - bottle.current_weight_oz) / (w.full_oz - w.empty_oz);
  } else {
    valEl.textContent = lev.toFixed(1);
  }
  // V1.5 visual par alert (green/copper/wine) - professional, no slop
  if (lev < par * 0.3) valEl.style.color = 'var(--wine)';
  else if (lev < par * 0.6) valEl.style.color = 'var(--copper)';
  else valEl.style.color = 'var(--text)';
}

/* V1.5 Phase 2.1 — Recipe builder + menu costing
   Simple, optional, fun yet professional. No AI slop.
   Ingredients reference current bottles by name.
   Cost calc uses bottle.cost (per bottle) converted to per-oz using size.
   Live updates. Seed a few classics.
*/
function getBottleByName(name) {
  const lower = (name || "").toLowerCase().trim();
  return allBottles().find(b => b.name.toLowerCase().trim() === lower) || null;
}

function parseOz(size) {
  if (!size) return 25.36; // default 750ml
  const m = String(size).match(/(\d+(?:\.\d+)?)\s*(ml|oz|l)/i);
  if (!m) return 25.36;
  let v = parseFloat(m[1]);
  const u = (m[2] || "").toLowerCase();
  if (u === "ml") v = v / 29.57;
  if (u === "l") v = v * 33.81;
  return v || 25.36;
}

function calcRecipeCost(recipe) {
  if (!recipe || !recipe.ingredients) return 0;
  let total = 0;
  for (const ing of recipe.ingredients) {
    const bottle = getBottleByName(ing.name);
    if (!bottle || !bottle.cost) continue;
    const bottleOz = parseOz(bottle.size);
    const costPerOz = bottle.cost / (bottleOz || 25.36);
    total += (ing.pour_oz || 0) * costPerOz;
  }
  const yieldServings = recipe.yield || 1;
  return total / yieldServings;
}

function addRecipe(recipe) {
  if (!barState.recipes) barState.recipes = [];
  recipe.id = recipe.id || uid();
  barState.recipes.push(recipe);
  persistBar();
}

function deleteRecipe(id) {
  if (!barState.recipes) return;
  barState.recipes = barState.recipes.filter(r => r.id !== id);
  persistBar();
}

function seedExampleRecipes() {
  if (!barState.recipes || barState.recipes.length === 0) {
    const examples = [
      { name: "Old Fashioned", ingredients: [{name: "Bourbon or Rye", pour_oz: 2}, {name: "Simple Syrup", pour_oz: 0.25}, {name: "Angostura Bitters", pour_oz: 0.1}], yield: 1, menu_price: 14 },
      { name: "Margarita", ingredients: [{name: "Tequila", pour_oz: 2}, {name: "Lime Juice", pour_oz: 1}, {name: "Triple Sec", pour_oz: 0.75}], yield: 1, menu_price: 12 },
      { name: "Negroni", ingredients: [{name: "Gin", pour_oz: 1}, {name: "Campari", pour_oz: 1}, {name: "Sweet Vermouth", pour_oz: 1}], yield: 1, menu_price: 13 },
    ];
    barState.recipes = examples.map((ex, i) => ({...ex, id: "seed-" + i}));
    // Seed demo costs on matching bottles for immediate numbers (V1.5)
    const demoCosts = { "Bourbon or Rye": 12, "Tequila": 10, "Gin": 9, "Campari": 11, "Sweet Vermouth": 8, "Simple Syrup": 3, "Lime Juice": 2, "Triple Sec": 7, "Angostura Bitters": 15 };
    allBottles().forEach(b => {
      const key = Object.keys(demoCosts).find(k => b.name.toLowerCase().includes(k.toLowerCase().split(" ")[0]));
      if (key && !b.cost) b.cost = demoCosts[key];
    });
    persistBar();
  }
}

function renderRecipesPanel(container) {
  if (!container) return;
  seedExampleRecipes();
  const recipes = barState.recipes || [];
  let html = `<div class="panel panel--glass"><h2>Recipes & Menu Costing</h2>`;
  html += `<p class="field-hint">Build recipes from your bar. Costs auto-calculate from your product costs (set in Spreadsheets view for real numbers — start with 0 if first time). Optional but powerful for menu pricing.</p>`;
  if ((barState.recipes || []).length === 0 && allBottles().some(b => !b.cost || b.cost === 0)) {
    html += `<p style="color:var(--copper); font-size:0.85rem;">First time? Set some unit costs in Spreadsheets first for meaningful numbers here.</p>`;
  }

  // List
  html += `<div style="margin:12px 0;">`;
  recipes.forEach(r => {
    const cost = calcRecipeCost(r);
    const pct = r.menu_price ? (cost / r.menu_price * 100) : 0;
    const profit = (r.menu_price || 0) - cost;
    html += `
      <div style="border:1px solid var(--border); padding:8px; margin-bottom:6px; border-radius:4px;">
        <strong>${escapeHtml(r.name)}</strong> — ${r.yield || 1} serving(s)<br>
        <span style="font-size:0.85rem;">Cost/serving: $${cost.toFixed(2)} | Menu: $${(r.menu_price||0).toFixed(2)} | Cost %: ${pct.toFixed(1)}% | Profit: $${profit.toFixed(2)}</span>
        <button class="btn btn-ghost btn-sm" style="float:right; margin-left:4px;" data-del-recipe="${r.id}">Delete</button>
        <button class="btn btn-ghost btn-sm" style="float:right;" data-edit-recipe="${r.id}">Edit</button>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">${(r.ingredients||[]).map(i=>`${i.pour_oz}oz ${escapeHtml(i.name)}`).join(" + ")}</div>
      </div>
    `;
  });
  html += `</div>`;

  // Add form
  html += `
    <details><summary style="cursor:pointer; color:var(--copper-bright);">+ Add new recipe</summary>
    <div style="margin-top:8px;">
      <input id="newRecipeName" placeholder="Recipe name (e.g. Manhattan)" style="width:100%; margin-bottom:4px;" />
      <div id="ingList"></div>
      <button class="btn btn-ghost btn-sm" id="addIngBtn">+ Add ingredient</button><br><br>
      <input id="newRecipeYield" type="number" value="1" style="width:60px;" /> servings
      <input id="newRecipePrice" type="number" placeholder="Menu price $" style="width:80px; margin-left:8px;" />
      <button class="btn btn-primary btn-sm" id="saveRecipeBtn" style="margin-left:8px;">Save recipe</button>
    </div>
    </details>
  `;
  html += `</div>`;
  container.innerHTML = html;

  // Wire delete and edit (polished for first-time ease)
  container.querySelectorAll("[data-del-recipe]").forEach(btn => {
    btn.onclick = () => {
      if (confirm("Delete this recipe?")) {
        deleteRecipe(btn.dataset.delRecipe);
        renderRecipesPanel(container);
      }
    };
  });

  container.querySelectorAll("[data-edit-recipe]").forEach(btn => {
    btn.onclick = () => {
      const recipe = (barState.recipes || []).find(r => r.id === btn.dataset.editRecipe);
      if (!recipe) return;
      // Populate form for edit
      container.querySelector("#newRecipeName").value = recipe.name || "";
      container.querySelector("#newRecipeYield").value = recipe.yield || 1;
      container.querySelector("#newRecipePrice").value = recipe.menu_price || "";
      ingList.innerHTML = "";
      (recipe.ingredients || []).forEach(ing => {
        const div = document.createElement("div");
        div.style.cssText = "display:flex; gap:6px; margin-bottom:4px; align-items:center;";
        const bottles = allBottles();
        let opts = bottles.map(b => `<option value="${escapeHtml(b.name)}" ${b.name === ing.name ? "selected" : ""}>${escapeHtml(b.name)} (${b.size})</option>`).join("");
        div.innerHTML = `
          <select class="ing-name" style="flex:1;">${opts}</select>
          <input class="ing-pour" type="number" step="0.1" value="${ing.pour_oz || 1}" style="width:60px;" /> oz
          <button class="btn btn-ghost btn-sm del-ing" style="min-width:28px;">×</button>
        `;
        ingList.appendChild(div);
        div.querySelector(".del-ing").onclick = () => div.remove();
      });
      // On save, delete old and add new
      const oldSave = container.querySelector("#saveRecipeBtn").onclick;
      container.querySelector("#saveRecipeBtn").onclick = () => {
        deleteRecipe(recipe.id);
        // then original save logic
        const name = container.querySelector("#newRecipeName").value.trim();
        if (!name) return alert("Name required");
        const yieldVal = parseFloat(container.querySelector("#newRecipeYield").value) || 1;
        const price = parseFloat(container.querySelector("#newRecipePrice").value) || 0;
        const ingEls = ingList.querySelectorAll(".ing-name");
        const pourEls = ingList.querySelectorAll(".ing-pour");
        const ingredients = [];
        for (let i=0; i<ingEls.length; i++) {
          ingredients.push({name: ingEls[i].value, pour_oz: parseFloat(pourEls[i].value) || 0});
        }
        if (ingredients.length === 0) return alert("Add at least one ingredient");
        addRecipe({name, ingredients, yield: yieldVal, menu_price: price});
        renderRecipesPanel(container);
      };
    };
  });

  // Add ingredient UI - polished for first-time ease
  const ingList = container.querySelector("#ingList");
  const addIngBtn = container.querySelector("#addIngBtn");
  addIngBtn.onclick = () => {
    const div = document.createElement("div");
    div.style.cssText = "display:flex; gap:6px; margin-bottom:4px; align-items:center;";
    const bottles = allBottles();
    let opts = bottles.map(b => `<option value="${escapeHtml(b.name)}">${escapeHtml(b.name)} (${b.size})</option>`).join("");
    div.innerHTML = `
      <select class="ing-name" style="flex:1;">${opts}</select>
      <input class="ing-pour" type="number" step="0.1" value="1" style="width:60px;" /> oz
      <button class="btn btn-ghost btn-sm del-ing" style="min-width:28px;">×</button>
    `;
    ingList.appendChild(div);
    div.querySelector(".del-ing").onclick = () => div.remove();
  };

  // Save
  container.querySelector("#saveRecipeBtn").onclick = () => {
    const name = container.querySelector("#newRecipeName").value.trim();
    if (!name) return alert("Name required");
    const yieldVal = parseFloat(container.querySelector("#newRecipeYield").value) || 1;
    const price = parseFloat(container.querySelector("#newRecipePrice").value) || 0;
    const ingEls = ingList.querySelectorAll(".ing-name");
    const pourEls = ingList.querySelectorAll(".ing-pour");
    const ingredients = [];
    for (let i=0; i<ingEls.length; i++) {
      ingredients.push({name: ingEls[i].value, pour_oz: parseFloat(pourEls[i].value) || 0});
    }
    if (ingredients.length === 0) return alert("Add at least one ingredient");
    addRecipe({name, ingredients, yield: yieldVal, menu_price: price});
    renderRecipesPanel(container);
  };
}

function generateSmartOrders(salesMap = {}) {
  const orders = [];
  const stations = sortedStations();
  stations.forEach(station => {
    (station.bottles || []).forEach(bottle => {
      const par = bottle.par_level || 0;
      const current = (window.__osbWeighOn && bottle.weight_mode === 'weight' && bottle.current_weight_oz != null)
        ? Math.max(0, (getBottleWeights(bottle.name)?.full_oz || 25) - (bottle.current_weight_oz || 0)) / 25 * (parseOz(bottle.size) / 25) // rough
        : (bottle.current_level || 0);
      const bname = (bottle.name || "").toLowerCase();
      let usage = 0;
      for (const [key, qty] of Object.entries(salesMap)) {
        if (key.includes(bname) || bname.includes(key)) {
          usage = qty;
          break;
        }
      }
      if (usage === 0) usage = 1; // fallback for first time or no data
      const suggested = Math.max(0, Math.ceil(par - current + usage));
      if (suggested > 0) {
        orders.push({
          station: station.name,
          name: bottle.name,
          size: bottle.size,
          current: Number(current).toFixed(1),
          par: par,
          suggested: suggested,
          orderQty: suggested,
          recentSales: Number(usage).toFixed(1),
          vendor: (bottle.vendor || bottle.supplier || "").trim() || "Primary supplier",
          bottleId: bottle.id,
          stationId: station.id,
          cost: bottle.cost || 0,
        });
      }
    });
  });
  return orders;
}

/** Group order lines by vendor for multi-supplier POs. */
function groupOrdersByVendor(orders) {
  const map = new Map();
  for (const o of orders) {
    const v = o.vendor || "Primary supplier";
    if (!map.has(v)) map.set(v, []);
    map.get(v).push(o);
  }
  return map;
}

function poBusinessHeader() {
  const cfg = window.__osbConfig || {};
  const b = cfg.branding || {};
  const name = b.business_name || cfg.bar_name || "Our bar";
  const addr = b.business_address || "";
  return { name, addr };
}

/** Build ready-to-send purchase order text for one vendor (or all). */
function buildPurchaseOrderText(orders, { vendor, poNumber, notes } = {}) {
  const { name, addr } = poBusinessHeader();
  const today = new Date().toISOString().slice(0, 10);
  const po = poNumber || `PO-${today.replace(/-/g, "")}-${String(Date.now()).slice(-4)}`;
  const lines = orders.filter((o) => (o.orderQty ?? o.suggested) > 0);
  const vendorLabel = vendor || (lines[0]?.vendor || "Primary supplier");

  const body = [
    `PURCHASE ORDER`,
    `PO #: ${po}`,
    `Date: ${today}`,
    ``,
    `From: ${name}`,
    addr ? `Address: ${addr}` : null,
    `To: ${vendorLabel}`,
    ``,
    `Please supply the following:`,
    ``,
    ...lines.map((o, i) => {
      const qty = o.orderQty ?? o.suggested;
      return `${String(i + 1).padStart(2, " ")}. ${qty} × ${o.name} (${o.size || "—"})  — station: ${o.station}`;
    }),
    ``,
    `Total lines: ${lines.length}`,
    `Total bottles (approx): ${lines.reduce((s, o) => s + (Number(o.orderQty ?? o.suggested) || 0), 0)}`,
    notes ? `` : null,
    notes ? `Notes: ${notes}` : null,
    ``,
    `Generated by Open Source Barware (local) — please confirm availability and ETA.`,
  ].filter((x) => x !== null);

  return { text: body.join("\n"), poNumber: po, vendor: vendorLabel, lines };
}

function downloadTextFile(filename, text, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { /* fall through */ }
  // Fallback for older browsers / file://
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;left:-9999px;top:0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (_) { /* ignore */ }
  document.body.removeChild(ta);
  return ok;
}

function openMailtoOrder({ vendor, text, subject }) {
  const sub = encodeURIComponent(subject || `Purchase order — ${vendor || "order"}`);
  const body = encodeURIComponent(text);
  // Keep under common mailto length limits; still open if long (client may truncate)
  const href = `mailto:?subject=${sub}&body=${body.slice(0, 1800)}`;
  window.location.href = href;
}

async function logPurchaseOrderSent(poPayload) {
  const { text, poNumber, vendor, lines } = poPayload;
  await OSB.uploadPosLog({
    label: `PO ${poNumber} → ${vendor}`,
    note: `${lines.length} lines · logged as sent order`,
    text,
    inputType: "po",
    parsed_pos: {
      source: "purchase-order",
      po_number: poNumber,
      vendor,
      lines: lines.map((o) => ({
        product: o.name,
        qty: o.orderQty ?? o.suggested,
        size: o.size,
        station: o.station,
      })),
    },
  });
}

// Live working set while Smart Orders / PO panel is open
let smartOrderWorking = [];

async function openSmartOrdersPanel() {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(8,12,18,0.96);z-index:9999;display:flex;flex-direction:column;";
  overlay.innerHTML = `
    <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg);gap:12px;flex-wrap:wrap;">
      <div>
        <span style="font-family:var(--font-serif);font-size:1.1rem;color:var(--copper-bright);">Smart Orders → Purchase Order</span>
        <span style="font-size:0.75rem;color:var(--text-muted);margin-left:8px;">V1.5 · 1-click send</span>
      </div>
      <button id="closeOrders" type="button" style="background:transparent;border:1px solid var(--border);color:var(--text);padding:6px 12px;border-radius:4px;font-size:0.9rem;">Close</button>
    </div>
    <div id="ordersContent" style="flex:1;overflow:auto;padding:12px;"></div>
    <div id="ordersStatus" class="status" style="padding:0 12px 4px;"></div>
    <div style="padding:12px;background:var(--bg);border-top:1px solid var(--border);display:flex;flex-wrap:wrap;gap:8px;">
      <button type="button" id="btnPoCopy" class="btn btn-primary" style="flex:1;min-width:140px;min-height:48px;">Copy PO text</button>
      <button type="button" id="btnPoEmail" class="btn btn-secondary" style="flex:1;min-width:140px;min-height:48px;">Email draft</button>
      <button type="button" id="btnPoCsv" class="btn btn-ghost" style="flex:1;min-width:120px;min-height:48px;">CSV</button>
      <button type="button" id="btnPoLog" class="btn btn-secondary" style="flex:1;min-width:140px;min-height:48px;">Log as sent</button>
      <button type="button" id="btnPoToReceive" class="btn btn-ghost" style="flex:1;min-width:140px;min-height:48px;">→ Receive</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const content = overlay.querySelector("#ordersContent");
  const statusEl = overlay.querySelector("#ordersStatus");
  const setPoStatus = (msg) => { if (statusEl) statusEl.textContent = msg || ""; };

  // Load recent POS for real usage
  const posData = await OSB.getPosLog();
  const salesMap = {};
  for (const entry of (posData.entries || []).slice(0, 5)) {
    const lines = entry.parsed_pos?.lines || [];
    for (const line of lines) {
      const key = (line.product || "").toLowerCase().trim();
      if (key) salesMap[key] = (salesMap[key] || 0) + (line.qty || 0);
    }
  }
  smartOrderWorking = generateSmartOrders(salesMap).map((o) => ({ ...o }));

  function collectFromDom() {
    content.querySelectorAll("[data-order-idx]").forEach((row) => {
      const idx = parseInt(row.dataset.orderIdx, 10);
      if (!smartOrderWorking[idx]) return;
      const qtyInp = row.querySelector(".po-qty");
      const vendInp = row.querySelector(".po-vendor");
      if (qtyInp) smartOrderWorking[idx].orderQty = Math.max(0, parseFloat(qtyInp.value) || 0);
      if (vendInp) smartOrderWorking[idx].vendor = vendInp.value.trim() || "Primary supplier";
    });
    const notes = content.querySelector("#poNotes")?.value?.trim() || "";
    const poNum = content.querySelector("#poNumber")?.value?.trim() || "";
    const vendorOverride = content.querySelector("#poVendorDefault")?.value?.trim() || "";
    return { notes, poNum, vendorOverride };
  }

  function activeLines() {
    return smartOrderWorking.filter((o) => (o.orderQty ?? o.suggested) > 0);
  }

  function render() {
    const { name, addr } = poBusinessHeader();
    let html = `<div class="panel panel--glass">`;
    html += `<h2 style="margin-top:0;">Suggested reorders → ready-to-send PO</h2>`;
    html += `<p class="field-hint">PAR − on-hand + recent POS sales. Edit qty / vendor, then copy, email, or log. Receive later against the same list.</p>`;

    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;">
      <div>
        <label class="field-hint" for="poNumber">PO number</label>
        <input id="poNumber" type="text" value="PO-${new Date().toISOString().slice(0,10).replace(/-/g,"")}" style="width:100%;" />
      </div>
      <div>
        <label class="field-hint" for="poVendorDefault">Default vendor (applies empty rows)</label>
        <input id="poVendorDefault" type="text" placeholder="e.g. Southern Glazer's" style="width:100%;" />
      </div>
      <div style="grid-column:1/-1;">
        <label class="field-hint" for="poNotes">Notes for supplier</label>
        <input id="poNotes" type="text" placeholder="Deliver back door, call on arrival…" style="width:100%;" />
      </div>
      <div style="grid-column:1/-1;font-size:0.8rem;color:var(--text-muted);">
        Ship-to: <strong>${escapeHtml(name)}</strong>${addr ? ` · ${escapeHtml(addr)}` : " · set business address in Settings"}
      </div>
    </div>`;

    if (smartOrderWorking.length === 0) {
      html += `<p class="field-hint">All good — nothing below par based on current data. Bump PARs or drop POS sales to generate suggestions.</p>`;
    } else {
      const byVendor = groupOrdersByVendor(smartOrderWorking);
      for (const [vendor, lines] of byVendor) {
        html += `<h3 style="font-family:var(--font-serif);color:var(--copper-bright);font-size:1rem;margin:16px 0 8px;">${escapeHtml(vendor)}</h3>`;
        html += `<table class="workbook-table"><thead><tr>
          <th>Station</th><th>Product</th><th>Current</th><th>PAR</th><th>Sales</th><th>Order qty</th><th>Vendor</th>
        </tr></thead><tbody>`;
        lines.forEach((o) => {
          const idx = smartOrderWorking.indexOf(o);
          html += `<tr data-order-idx="${idx}">
            <td>${escapeHtml(o.station)}</td>
            <td><strong>${escapeHtml(o.name)}</strong> ${escapeHtml(o.size || "")}</td>
            <td class="workbook-num">${o.current}</td>
            <td class="workbook-num">${o.par}</td>
            <td class="workbook-num">${o.recentSales || "—"}</td>
            <td><input class="po-qty" type="number" min="0" step="1" value="${o.orderQty ?? o.suggested}" style="width:64px;" /></td>
            <td><input class="po-vendor" type="text" value="${escapeHtml(o.vendor)}" style="width:120px;" /></td>
          </tr>`;
        });
        html += `</tbody></table>`;
      }
      html += `<p class="field-hint" style="margin-top:10px;">${smartOrderWorking.length} line(s). Set qty to 0 to drop a line from the PO.</p>`;
    }

    html += `<details style="margin-top:16px;"><summary style="cursor:pointer;color:var(--copper-bright);">Preview PO text</summary>
      <pre id="poPreview" style="white-space:pre-wrap;font-size:0.8rem;background:rgba(0,0,0,0.25);padding:12px;border-radius:6px;margin-top:8px;max-height:240px;overflow:auto;"></pre>
    </details>`;
    html += `</div>`;
    content.innerHTML = html;

    const refreshPreview = () => {
      const meta = collectFromDom();
      if (meta.vendorOverride) {
        smartOrderWorking.forEach((o) => {
          if (!o.vendor || o.vendor === "Primary supplier") o.vendor = meta.vendorOverride;
        });
      }
      const lines = activeLines();
      if (!lines.length) {
        const pre = content.querySelector("#poPreview");
        if (pre) pre.textContent = "(no lines with qty > 0)";
        return;
      }
      // Prefer single-vendor PO; if mixed, still one combined document
      const vendors = [...new Set(lines.map((o) => o.vendor))];
      const vendor = vendors.length === 1 ? vendors[0] : meta.vendorOverride || "Multiple suppliers";
      const { text } = buildPurchaseOrderText(lines, {
        vendor,
        poNumber: meta.poNum,
        notes: meta.notes,
      });
      const pre = content.querySelector("#poPreview");
      if (pre) pre.textContent = text;
    };

    content.querySelectorAll(".po-qty, .po-vendor, #poNotes, #poNumber, #poVendorDefault").forEach((el) => {
      el.addEventListener("input", refreshPreview);
      el.addEventListener("change", refreshPreview);
    });
    refreshPreview();
  }

  function buildCurrentPo() {
    const meta = collectFromDom();
    if (meta.vendorOverride) {
      smartOrderWorking.forEach((o) => {
        if (!o.vendor || o.vendor === "Primary supplier") o.vendor = meta.vendorOverride;
      });
    }
    const lines = activeLines();
    if (!lines.length) return null;
    const vendors = [...new Set(lines.map((o) => o.vendor))];
    const vendor = vendors.length === 1 ? vendors[0] : meta.vendorOverride || "Multiple suppliers";
    return buildPurchaseOrderText(lines, {
      vendor,
      poNumber: meta.poNum,
      notes: meta.notes,
    });
  }

  render();

  overlay.querySelector("#closeOrders").onclick = () => document.body.removeChild(overlay);

  overlay.querySelector("#btnPoCopy").onclick = async () => {
    const po = buildCurrentPo();
    if (!po) return setPoStatus("Nothing to order — all qtys are 0.");
    const ok = await copyToClipboard(po.text);
    setPoStatus(ok ? `PO ${po.poNumber} copied — paste into text/email to your rep.` : "Copy failed — open Preview and select manually.");
  };

  overlay.querySelector("#btnPoEmail").onclick = () => {
    const po = buildCurrentPo();
    if (!po) return setPoStatus("Nothing to order — all qtys are 0.");
    openMailtoOrder({
      vendor: po.vendor,
      text: po.text,
      subject: `Purchase order ${po.poNumber} — ${poBusinessHeader().name}`,
    });
    setPoStatus(`Email draft opened for ${po.poNumber}. Add your supplier address in the To field.`);
  };

  overlay.querySelector("#btnPoCsv").onclick = () => {
    collectFromDom();
    const lines = activeLines();
    if (!lines.length) return setPoStatus("Nothing to export.");
    const meta = collectFromDom();
    const header = "PO,Vendor,Station,Product,Size,Current,PAR,RecentSales,OrderQty\n";
    const poNum = meta.poNum || "PO";
    const rows = lines.map((o) =>
      [poNum, o.vendor, o.station, o.name, o.size, o.current, o.par, o.recentSales || "", o.orderQty ?? o.suggested]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",")
    ).join("\n");
    downloadTextFile(`${poNum}-order.csv`, header + rows, "text/csv");
    setPoStatus("CSV downloaded.");
  };

  overlay.querySelector("#btnPoLog").onclick = async () => {
    const po = buildCurrentPo();
    if (!po) return setPoStatus("Nothing to log.");
    try {
      await logPurchaseOrderSent(po);
      setPoStatus(`Logged ${po.poNumber} to input log (POs / Orders filter). Ready to Receive when stock arrives.`);
      try { await loadInputsHub(); } catch (_) { /* home may not be focused */ }
    } catch (e) {
      setPoStatus("Log failed: " + (e.message || e));
    }
  };

  overlay.querySelector("#btnPoToReceive").onclick = () => {
    collectFromDom();
    const lines = activeLines();
    if (!lines.length) return setPoStatus("Nothing to receive.");
    // Seed receive list from this PO, then jump to inputs
    receiveItems = lines.map((o) => ({
      station: o.station,
      name: o.name,
      size: o.size,
      suggested: o.orderQty ?? o.suggested,
      received: o.orderQty ?? o.suggested,
      current: o.current,
      par: o.par,
      recentSales: o.recentSales,
    }));
    document.body.removeChild(overlay);
    switchAdminView("inputs");
    loadInputsHub().then(() => {
      renderReceiveList();
      setStatus("PO lines loaded into Receive — edit actuals, then Log receipt.", "receiveStatus");
    }).catch(() => {
      renderReceiveList();
      setStatus("PO lines loaded into Receive — edit actuals, then Log receipt.", "receiveStatus");
    });
  };
}

/* ─── V1.5 Phase 4.1 Multi-venue transfers ─── */

async function refreshVenuePanels() {
  const box = document.getElementById("venuesConsolidated");
  const hist = document.getElementById("transferHistoryBox");
  try {
    const venues = await OSB.listVenues();
    if (box) {
      const c = venues.consolidated || {};
      const list = venues.venues || [];
      if (list.length <= 1) {
        box.innerHTML = `<p class="field-hint">One venue on the map. Add another bar to unlock transfers and company totals.</p>`;
      } else {
        box.innerHTML = `
          <div class="venues-roll-up">
            <strong>Company roll-up</strong>
            <span>${c.venue_count || list.length} venues · ${c.bottle_count || 0} SKUs · ${reportMoney(c.total_value || 0)} on hand · ${c.below_par || 0} below par</span>
          </div>
          <div class="venues-cards">
            ${list
              .map(
                (v) => `<div class="venue-card${v.id === venues.active_bar_id ? " venue-card--active" : ""}">
                <div class="venue-card-name">${escapeHtml(v.name || "Unnamed")}</div>
                <div class="venue-card-meta">${v.bottle_count || 0} bottles · ${v.station_count || 0} stations</div>
                <div class="venue-card-meta">${reportMoney(v.total_value || 0)} · ${v.below_par || 0} below par</div>
              </div>`
              )
              .join("")}
          </div>`;
      }
    }
    if (hist) {
      const t = await OSB.listTransfers(12);
      const rows = t.transfers || [];
      if (!rows.length) {
        hist.innerHTML = `<p class="field-hint">No transfers yet. Move a bottle between venues and it shows up here.</p>`;
      } else {
        hist.innerHTML = `
          <h3 class="transfer-history-title">Recent transfers</h3>
          <div class="transfer-history-list">
            ${rows
              .map(
                (x) => `<div class="transfer-history-row">
                <strong>${Number(x.qty).toFixed(1)} × ${escapeHtml(x.product || "")}</strong>
                <span class="field-hint">${escapeHtml(x.from_bar_name || "")} → ${escapeHtml(x.to_bar_name || "")}</span>
                <span class="field-hint">${escapeHtml((x.created_at || "").slice(0, 16).replace("T", " "))}${x.note ? " · " + escapeHtml(x.note) : ""}</span>
              </div>`
              )
              .join("")}
          </div>`;
      }
    }
  } catch (e) {
    if (box) box.innerHTML = `<p class="field-hint">${escapeHtml(e.message || "Could not load venues")}</p>`;
  }
}

async function openTransferPanel() {
  const listed = await OSB.listBars();
  const bars = listed.bars || [];
  if (bars.length < 2) {
    window.alert("Add a second venue in Settings → Your venues first. Then you can move stock between them.");
    switchAdminView("settings");
    return;
  }

  // Ensure we have live bottles for the active (from) bar
  const activeId = listed.active_bar_id || bars[0].id;
  try {
    barState = normalizeBar(await OSB.getBar(false, activeId));
  } catch (_) { /* keep existing barState */ }

  const bottles = typeof allBottles === "function" ? allBottles() : [];
  const bottleOpts = bottles
    .map(
      (b) =>
        `<option value="${escapeHtml(b.id)}" data-size="${escapeHtml(b.size || "")}" data-level="${b.current_level ?? 0}" data-name="${escapeHtml(b.name || "")}">${escapeHtml(b.name || "Bottle")} (${escapeHtml(b.size || "—")}) · on hand ${Number(b.current_level || 0).toFixed(1)}</option>`
    )
    .join("");

  const barOpts = (selectedId, excludeId) =>
    bars
      .filter((b) => !excludeId || b.id !== excludeId)
      .map(
        (b) =>
          `<option value="${escapeHtml(b.id)}"${b.id === selectedId ? " selected" : ""}>${escapeHtml(b.name || "Unnamed")}</option>`
      )
      .join("");

  const overlay = document.createElement("div");
  overlay.className = "xfer-overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(8,12,18,0.96);z-index:9999;display:flex;flex-direction:column;";
  overlay.innerHTML = `
    <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg);gap:12px;flex-wrap:wrap;">
      <div>
        <span style="font-family:var(--font-serif);font-size:1.15rem;color:var(--copper-bright);">Transfer stock</span>
        <span style="font-size:0.75rem;color:var(--text-muted);margin-left:8px;">V1.5 · multi-venue</span>
      </div>
      <button type="button" id="xferClose" class="btn btn-ghost btn-sm">Close</button>
    </div>
    <div style="flex:1;overflow:auto;padding:16px;max-width:560px;width:100%;margin:0 auto;">
      <div class="panel panel--glass">
        <p class="field-hint" style="margin-top:0;">Move bottles from one venue to another. Both inventories update together. Destination gets a matching product — or we create it under “Transfers in”.</p>
        <label for="xferFrom">From venue</label>
        <select id="xferFrom">${barOpts(activeId)}</select>
        <label for="xferTo">To venue</label>
        <select id="xferTo">${barOpts(bars.find((b) => b.id !== activeId)?.id, activeId)}</select>
        <label for="xferBottle">Product (from source)</label>
        <select id="xferBottle">
          <option value="">— pick a bottle —</option>
          ${bottleOpts || "<option value=\"\" disabled>No bottles on this venue yet</option>"}
        </select>
        <div class="row" style="gap:12px;margin-top:8px;">
          <div style="flex:1;">
            <label for="xferQty">How many (bottles / units)</label>
            <input id="xferQty" type="number" min="0.1" step="0.1" value="1" />
            <p id="xferAvail" class="field-hint" style="margin:4px 0 0;">On hand: —</p>
          </div>
        </div>
        <label for="xferNote">Note (optional)</label>
        <input id="xferNote" type="text" placeholder="e.g. Patio ran dry · runner from main" />
        <label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:0.9rem;">
          <input type="checkbox" id="xferCreate" checked />
          Create product on destination if missing
        </label>
        <p id="xferStatus" class="status" style="margin-top:10px;"></p>
        <div class="actions" style="margin-top:12px;gap:8px;flex-wrap:wrap;">
          <button type="button" class="btn btn-primary" id="xferSubmit">Move stock →</button>
          <button type="button" class="btn btn-ghost" id="xferClose2">Cancel</button>
        </div>
      </div>
      <div id="xferRecent" style="margin-top:16px;"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const fromEl = overlay.querySelector("#xferFrom");
  const toEl = overlay.querySelector("#xferTo");
  const bottleEl = overlay.querySelector("#xferBottle");
  const qtyEl = overlay.querySelector("#xferQty");
  const availEl = overlay.querySelector("#xferAvail");
  const statusEl = overlay.querySelector("#xferStatus");
  const recentEl = overlay.querySelector("#xferRecent");

  const close = () => overlay.remove();
  overlay.querySelector("#xferClose").onclick = close;
  overlay.querySelector("#xferClose2").onclick = close;

  const updateAvail = () => {
    const opt = bottleEl.selectedOptions[0];
    if (!opt || !opt.value) {
      availEl.textContent = "On hand: —";
      return;
    }
    const lvl = parseFloat(opt.dataset.level || "0") || 0;
    availEl.textContent = `On hand: ${lvl.toFixed(1)} · don't send more than this`;
    if (!qtyEl.value || parseFloat(qtyEl.value) > lvl) qtyEl.value = String(Math.min(1, lvl) || 0.1);
  };
  bottleEl.addEventListener("change", updateAvail);
  updateAvail();

  async function reloadSourceBottles() {
    const fromId = fromEl.value;
    statusEl.textContent = "Loading source map…";
    try {
      const bar = normalizeBar(await OSB.getBar(false, fromId));
      // Temporarily use this bar for bottle list without clobbering global if switch fails later
      const bottlesLocal = [];
      for (const st of bar.stations || []) {
        for (const b of st.bottles || []) {
          bottlesLocal.push({ ...b, stationName: st.name });
        }
      }
      bottleEl.innerHTML =
        `<option value="">— pick a bottle —</option>` +
        bottlesLocal
          .map(
            (b) =>
              `<option value="${escapeHtml(b.id)}" data-size="${escapeHtml(b.size || "")}" data-level="${b.current_level ?? 0}" data-name="${escapeHtml(b.name || "")}">${escapeHtml(b.name || "Bottle")} (${escapeHtml(b.size || "—")}) · ${Number(b.current_level || 0).toFixed(1)}</option>`
          )
          .join("");
      // Keep "to" from listing the same bar
      const other = bars.filter((b) => b.id !== fromId);
      toEl.innerHTML = other
        .map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name || "Unnamed")}</option>`)
        .join("");
      statusEl.textContent = "";
      updateAvail();
    } catch (e) {
      statusEl.textContent = e.message || "Could not load source bar";
    }
  }

  fromEl.addEventListener("change", reloadSourceBottles);

  async function loadRecent() {
    try {
      const t = await OSB.listTransfers(8);
      const rows = t.transfers || [];
      if (!rows.length) {
        recentEl.innerHTML = "";
        return;
      }
      recentEl.innerHTML = `
        <div class="panel panel--glass">
          <h3 style="margin:0 0 8px;font-family:var(--font-serif);color:var(--copper-bright);font-size:1rem;">Just moved</h3>
          ${rows
            .map(
              (x) => `<div class="transfer-history-row">
              <strong>${Number(x.qty).toFixed(1)} × ${escapeHtml(x.product || "")}</strong>
              <span class="field-hint">${escapeHtml(x.from_bar_name)} → ${escapeHtml(x.to_bar_name)}</span>
            </div>`
            )
            .join("")}
        </div>`;
    } catch (_) { /* ignore */ }
  }
  loadRecent();

  overlay.querySelector("#xferSubmit").onclick = async () => {
    const fromBarId = fromEl.value;
    const toBarId = toEl.value;
    const opt = bottleEl.selectedOptions[0];
    if (!opt?.value) {
      statusEl.textContent = "Pick a product to move.";
      return;
    }
    const qty = parseFloat(qtyEl.value);
    if (!(qty > 0)) {
      statusEl.textContent = "Enter a quantity greater than zero.";
      return;
    }
    if (fromBarId === toBarId) {
      statusEl.textContent = "From and To must be different venues.";
      return;
    }
    statusEl.textContent = "Moving…";
    try {
      const res = await OSB.transferStock({
        fromBarId,
        toBarId,
        bottleId: opt.value,
        product: opt.dataset.name,
        size: opt.dataset.size,
        qty,
        note: overlay.querySelector("#xferNote")?.value?.trim() || "",
        createIfMissing: !!overlay.querySelector("#xferCreate")?.checked,
      });
      statusEl.textContent = `Moved ${qty} × ${opt.dataset.name} → ${res.to_bar?.name || "destination"}${res.transfer?.created_dest ? " (created on dest)" : ""}.`;
      // Refresh local source list levels
      await reloadSourceBottles();
      await loadRecent();
      try {
        barState = normalizeBar(await OSB.getBar(false, listed.active_bar_id || fromBarId));
        await refreshHomeBars();
        await refreshVenuePanels();
        await loadMetrics();
        await loadInHouse();
      } catch (_) { /* non-fatal */ }
    } catch (e) {
      statusEl.textContent = e.message || "Transfer failed";
    }
  };
}

document.addEventListener("DOMContentLoaded", () => {
  loadBottleWeights(); // V1.5 Phase 1 preload weights for effective level calc
  if (document.body.dataset.app === "setup") {
    initSetup().catch((err) => setStatus(err.message || "Setup failed to load."));
  }
  if (document.body.dataset.app === "home") initHome();
});