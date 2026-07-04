/* Open Source Barware — Chrome program client */

const UPDATES_SIGNUP_STORAGE_KEY = "osb_updates_signup";
const UPDATES_SUBSCRIBE_URL = "https://opensourcebarware.com/api/updates-subscribe";

const US_STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
  ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"],
  ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
  ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"],
  ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

const SETUP_FLOW = [
  "welcome",
  "updates_signup",
  "name_bar",
  "build_bar",
  "voice_walk",
  "reconcile",
  "map_review",
  "first_count",
];

const STEP_LABELS = {
  welcome: "Start",
  updates_signup: "Updates",
  name_bar: "Name",
  build_bar: "Build",
  voice_walk: "Walk",
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

  async getBar(seed = false) {
    const r = await fetch(`/api/bar${seed ? "?seed=true" : ""}`);
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
    setUpdatesSignupStatus("");
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

  async getPosLog() {
    const r = await fetch("/api/pos/log");
    return r.json();
  },

  async uploadPosLog({ label, note, file, text }) {
    if (text?.trim() && !file) {
      const r = await fetch("/api/pos/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, note, text }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "POS upload failed");
      }
      return r.json();
    }
    const fd = new FormData();
    fd.append("label", label || "POS drop");
    if (note) fd.append("note", note);
    fd.append("file", file);
    const r = await fetch("/api/pos/log", { method: "POST", body: fd });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error || "POS upload failed");
    }
    return r.json();
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
    (p) => p.id !== "butterfly" && p.id !== "welcome" && p.id !== "updates_signup"
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

function getUpdatesSignupStatus() {
  const value = localStorage.getItem(UPDATES_SIGNUP_STORAGE_KEY);
  return value === "subscribed" || value === "skipped" ? value : "";
}

function setUpdatesSignupStatus(status) {
  if (!status) localStorage.removeItem(UPDATES_SIGNUP_STORAGE_KEY);
  else localStorage.setItem(UPDATES_SIGNUP_STORAGE_KEY, status);
}

function validateUpdatesSignup({ email, city, state }) {
  const trimmedEmail = (email || "").trim();
  const trimmedCity = (city || "").trim();
  const trimmedState = (state || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return "Enter a valid email address.";
  if (!trimmedCity || trimmedCity.length < 2) return "Enter your city.";
  if (!trimmedState) return "Select your state.";
  return null;
}

async function submitUpdatesSignup({ email, city, state, programUpdates, hiddenBarTour }) {
  const error = validateUpdatesSignup({ email, city, state });
  if (error) return { ok: false, message: error };
  if (!programUpdates && !hiddenBarTour) {
    return { ok: false, message: "Select at least one email preference." };
  }

  try {
    const response = await fetch(UPDATES_SUBSCRIBE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        source: "chrome-program-setup",
        programUpdates: programUpdates ?? true,
        hiddenBarTour: Boolean(hiddenBarTour),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        message: data.error || data.message || "Could not save your signup. Try again in a moment.",
      };
    }
    setUpdatesSignupStatus("subscribed");
    return {
      ok: true,
      message: data.message || "You are on the list. We only email when new releases ship.",
    };
  } catch {
    return { ok: false, message: "Network error — check your connection and try again." };
  }
}

function populateUpdatesStateSelect() {
  const select = document.getElementById("updatesState");
  if (!select || select.options.length > 1) return;
  US_STATES.forEach(([abbr, name]) => {
    const opt = document.createElement("option");
    opt.value = abbr;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

function renderUpdatesSignupStep() {
  populateUpdatesStateSelect();
  const subscribed = getUpdatesSignupStatus() === "subscribed";
  const form = document.getElementById("updatesSignupForm");
  const already = document.getElementById("updatesAlreadySubscribed");
  if (form) form.classList.toggle("hidden", subscribed);
  if (already) already.classList.toggle("hidden", !subscribed);
}

async function advanceFromUpdatesSignup() {
  await OSB.advancePhase("name_bar");
  await initSetup();
}

function setStatus(msg, id = "status") {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function sortedStations() {
  return [...barState.stations].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function allBottles() {
  return sortedStations().flatMap((s) =>
    (s.bottles || []).map((b) => ({ ...b, stationId: s.id, stationName: s.name }))
  );
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

function normalizeWalkStationLabel(label) {
  if (!label) return label;
  const parts = label.trim().split(/\s+/);
  if (parts[0]?.toLowerCase() !== "well") return label;
  const num = parts[1];
  if (!num || !/^\d+$/.test(String(num))) return label;
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

function stationIdByName(name) {
  const key = (name || "").trim().toLowerCase();
  if (!key) return null;
  const normalized = normalizeWalkStationLabel(name).toLowerCase();
  const exact = sortedStations().find(
    (s) => s.name.toLowerCase() === key || s.name.toLowerCase() === normalized
  );
  if (exact) return exact.id;
  const norm = key.replace(/[^a-z0-9]/g, "");
  const fuzzy = sortedStations().find((s) => {
    const sk = s.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const sn = normalizeWalkStationLabel(s.name).toLowerCase().replace(/[^a-z0-9]/g, "");
    return (
      sk === norm ||
      sk.includes(norm) ||
      norm.includes(sk) ||
      sn === norm.replace(/row\d+/g, "") ||
      sn.includes(norm) ||
      norm.includes(sn)
    );
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
  return allBottles().filter((b) => !b.size_verified).length;
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
  if (!body) return;
  const bottles = allBottles();
  if (!bottles.length) {
    body.innerHTML = `<tr><td colspan="6" class="bottle-empty">Upload notes to populate this table.</td></tr>`;
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
      return `
        <tr class="${unverified}${flaggedCls}" data-bottle="${b.id}" data-station="${b.stationId}">
          <td class="raw-heard">${rawCell}</td>
          <td><input type="text" class="review-name" value="${escapeHtml(b.name)}" data-bottle="${b.id}" data-station="${b.stationId}" /></td>
          <td><select class="review-station" data-bottle="${b.id}" data-station="${b.stationId}">${stationOptions(b.stationId)}</select></td>
          <td><select class="review-size" data-bottle="${b.id}" data-station="${b.stationId}">${sizeOptions(b.size || "750ml")}</select></td>
          <td class="size-verified-cell"><input type="checkbox" class="review-verified" data-bottle="${b.id}" data-station="${b.stationId}" ${b.size_verified ? "checked" : ""} title="Size confirmed" /></td>
          <td><button type="button" class="row-delete" data-del-review="${b.id}" data-station="${b.stationId}" title="Remove row">×</button></td>
        </tr>
      `;
    })
    .join("");
  updateWalkReviewProgress();
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
    allBottles().forEach((b) => {
      const bottle = findBottleRecord(b.id, b.stationId);
      if (bottle) bottle.size_verified = true;
    });
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
    if (!bottleId || !stationId) return;

    if (t.classList.contains("review-station")) {
      moveBottle(bottleId, stationId, t.value);
      await persistBar();
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
    // Any edit resolves the parse flag — the operator has looked at this row.
    if (bottle.parse_flags?.length) {
      bottle.parse_flags = [];
      const row = t.closest("tr");
      row?.classList.remove("row-flagged");
      row?.querySelector(".parse-flag")?.remove();
    }

    await persistBar();
    if (walkUnverifiedCount() === 0 && barState.setup?.walk_review_status === "pending") {
      await setWalkReviewStatus("complete");
    } else {
      updateWalkReviewProgress();
      updateWalkContinueButton();
    }
    const row = t.closest("tr");
    if (row) row.classList.toggle("size-unverified", !bottle.size_verified);
  });

  document.getElementById("walkReviewTable")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-del-review]");
    if (!btn) return;
    const station = barState.stations.find((s) => s.id === btn.dataset.station);
    if (!station?.bottles) return;
    station.bottles = station.bottles.filter((b) => b.id !== btn.dataset.delReview);
    await persistBar();
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

  if (bestInStation && bestInStationScore >= COUNT_MATCH_MIN_SCORE) {
    return { bottle: bestInStation, score: bestInStationScore, inStation: true };
  }
  if (best && bestScore >= COUNT_MATCH_MIN_SCORE) {
    return { bottle: best, score: bestScore, inStation: false };
  }
  return null;
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
    if (countedStationIds.size && !countedStationIds.has(b.stationId)) continue;
    notInCount.push({
      bottle: b,
      message: `${b.name} — on your map but not in this count.`,
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
  if (!btn) return;
  if (!countParsed) {
    btn.disabled = true;
    btn.textContent = "Upload your count first";
    return;
  }
  if (lastCountReconcile?.hasIssues) {
    const gaps =
      (lastCountReconcile.surprises?.length || 0) + (lastCountReconcile.notInCount?.length || 0);
    btn.disabled = true;
    btn.textContent = gaps
      ? `Reconcile ${gaps} gap${gaps === 1 ? "" : "s"} first`
      : "Reconcile gaps first";
    return;
  }
  btn.disabled = false;
  btn.textContent = "First count complete — open home base";
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
    rows.push({
      station: b.stationName || "",
      status: "missing_from_count",
      map_product: b.name || "",
      map_size: b.size || "",
      map_par_level: b.par_level ?? 1,
      count_heard: "",
      count_level: "",
      action_required: "On map from walk — not in your count. Re-count or remove from map.",
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

  let html = `
    <div class="count-reconcile-alert">
      <p class="count-reconcile-head"><strong>Not golden yet — reconciliation report</strong></p>
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
          <p><strong>${actionCount} gap${actionCount === 1 ? "" : "s"}</strong> before baseline locks — fix the map in Review, edit levels below, or re-upload your count.</p>
        </div>
      </div>
      <div class="count-reconcile-actions">
        <button type="button" class="btn btn-secondary btn-sm" id="btnGoReconcileMap">Go reconcile in Review →</button>
        <button type="button" class="btn btn-ghost btn-sm" id="btnRecountInline">Edit &amp; re-upload count</button>
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
          html += `<li class="count-reconcile-missing">${escapeHtml(m.message)}</li>`;
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
    <strong>Your move:</strong> Download the line-by-line comparison, fix gaps on the floor, then come back.
    Stations you didn't count yet won't show missing bottles — only the sections you walked.
  </p>`;
  el.classList.remove("hidden");
  el.innerHTML = html;
  el.querySelector("#btnRecountInline")?.addEventListener("click", () => resetCountForReupload());
  updateFirstCountDoneButton();
}

function parseCountNotes(text) {
  const bottles = allBottles();
  const matchedKeys = new Set();
  let matched = 0;

  for (const b of bottles) {
    const bottle = findBottleRecord(b.id, b.stationId);
    if (bottle) {
      bottle.count_matched = false;
      bottle.count_variance = null;
    }
  }

  const parsed = parseCountText(text);
  lastCountParsed = parsed;
  const reconcile = reconcileCountToMap(parsed);
  reconcile.comparisonRows = buildCountComparisonRows(reconcile);
  renderCountReconcileReport(reconcile);

  for (const { bottle: hit, level } of reconcile.matched) {
    const bottle = findBottleRecord(hit.id, hit.stationId);
    if (!bottle) continue;
    const key = `${hit.stationId}:${hit.id}`;
    bottle.current_level = level;
    bottle.count_matched = true;
    bottle.count_variance = "matched";
    if (!matchedKeys.has(key)) {
      matchedKeys.add(key);
      matched += 1;
    }
  }

  for (const m of reconcile.notInCount) {
    const bottle = findBottleRecord(m.bottle.id, m.bottle.stationId);
    if (bottle) bottle.count_variance = "missing";
  }

  for (const line of text.split(/\n+/).map((l) => l.trim()).filter(Boolean)) {
    const level = parseCountLevel(line);
    if (level === null) continue;
    for (const b of bottles) {
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
  document.getElementById("countUnparsed")?.classList.toggle("hidden", parsed);
  document.getElementById("countParsed")?.classList.toggle("hidden", !parsed);
  if (parsed) {
    updateCountSummary();
    renderCountReview();
  }
  updateFirstCountDoneButton();
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
    text += ". Paste notes, then click Parse my count (or pause typing — we parse automatically).";
  } else {
    text += ". Review levels below.";
  }
  el.textContent = text;
}

function renderCountReview() {
  const body = document.getElementById("countReviewBody");
  if (!body) return;
  const bottles = allBottles();
  if (!bottles.length) {
    body.innerHTML = `<tr><td colspan="5" class="bottle-empty">No bottles on your map — go back to Review.</td></tr>`;
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
      return `
        <tr data-bottle="${b.id}" data-station="${b.stationId}">
          <td>${escapeHtml(b.name)}</td>
          <td>${escapeHtml(b.stationName)}</td>
          <td>${b.par_level ?? 1}</td>
          <td><input type="number" class="count-level-input" step="0.1" min="0" max="99" value="${level}" data-bottle="${b.id}" data-station="${b.stationId}" /></td>
          <td>${status}</td>
        </tr>`;
    })
    .join("");
}

async function processCountNotes(text) {
  if (!text?.trim()) {
    setStatus(`Paste your count below, or choose a ${WALK_NOTES_ACCEPT_LABEL} file.`);
    return;
  }
  const { matched, reconcile } = parseCountNotes(text);
  await OSB.uploadCountNotes(text);
  await persistBar();
  lastParsedCountText = text.trim();
  setCountView(true);
  if (reconcile?.hasIssues) {
    setStatus(
      `Reconcile needed — ${reconcile.surprises.length} surprise(s), ${reconcile.notInCount.length} on map but not counted. See report above.`
    );
  } else if (matched) {
    setStatus(`Matched ${matched} bottles from your count — review levels below.`);
  } else {
    setStatus("Notes saved — set levels manually in the table below.");
  }
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
  if (notesText.trim()) {
    setCountEntryOpen(true);
    const result = parseCountNotes(notesText);
    if (result?.reconcile) renderCountReconcileReport(result.reconcile);
    setCountView(true);
  } else {
    setCountEntryOpen(false);
    setCountView(false);
  }
}

async function switchWalkBar(barId) {
  await saveWalkDraft();
  await OSB.selectSetupBar(barId);
  walkParsed = false;
  setStatus("");
  await initSetup();
}

function updateWalkBarHeader() {
  const name = barState.name?.trim() || "Unnamed bar";
  const title = document.getElementById("walkBarTitle");
  const inline = document.getElementById("walkBarNameInline");
  const counter = document.getElementById("walkBarCounter");
  const nextBtn = document.getElementById("btnNextWalkBar");

  if (title) title.textContent = name;
  if (inline) inline.textContent = name;

  const idx = allBars.findIndex((b) => b.id === barState.id);
  if (counter && allBars.length > 0) {
    counter.textContent = `Bar ${idx + 1} of ${allBars.length}`;
  }
  if (nextBtn) {
    nextBtn.classList.toggle("hidden", allBars.length <= 1);
  }
}

async function initWalkStep(data) {
  allBars = data.bars || [];
  updateWalkBarHeader();

  const voiceNotes = document.getElementById("voiceNotes");
  if (voiceNotes) voiceNotes.value = data.state?.voice_notes_text || "";

  fillManualStationSelect();
  const hasBottles = bottleCount() > 0;
  setWalkView(hasBottles);
  if (hasBottles) updateWalkSummary();
  updateWalkContinueButton();
  bindWalkReviewListeners();
}

async function processWalkNotes(text) {
  if (!text?.trim()) {
    setStatus(`Paste your walk notes below, or choose a ${WALK_NOTES_ACCEPT_LABEL} file.`);
    return;
  }
  const added = parseVoiceNotes(text);
  await OSB.uploadVoiceNotes(text);
  if (!barState.setup) barState.setup = {};
  barState.setup.walk_review_status = "pending";
  await persistBar({ walk_review_status: "pending" });
  lastParsedWalkText = text.trim();
  setWalkView(true);
  updateWalkSummary();
  setStatus(
    added
      ? `Parsed ${added} draft rows — review names and sizes before you continue.`
      : "Notes saved — add bottles manually, then review before you continue."
  );
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
  countParseTimer = window.setTimeout(async () => {
    const text = document.getElementById("countNotes")?.value?.trim() || "";
    if (text.length < 24 || text === lastParsedCountText) return;
    try {
      await processCountNotes(text);
      lastParsedCountText = text;
    } catch (e) {
      setStatus(e.message);
    }
  }, 700);
}

async function saveBuildBarName() {
  const input = document.getElementById("buildBarName");
  if (!input || !barState.id) return;
  const name = input.value.trim();
  barState.name = name;
  await OSB.saveBar({
    bar_id: barState.id,
    name,
    stations: sortedStations(),
  });
  if (name) await OSB.saveConfig({ bar_name: name });
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
        await saveBuildBarName();
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
  let currentStation = null;
  let buf = [];
  let qty = 1;

  function mkEntry(name, size, sizeVerified, flags = []) {
    return {
      name: walkTitleCase(name),
      size,
      size_verified: sizeVerified,
      station: currentStation,
      qty,
      raw_heard: name,
      flags,
    };
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
      entries.push(mkEntry(name, defaultSize, false, [flag]));
    }
    buf = [];
    qty = 1;
  }

  let i = 0;
  while (i < words.length) {
    const st = walkMatchStation(words, i);
    if (st) {
      if (buf.length) flushUnsized();
      currentStation = st.label;
      if (!stationsSeen.includes(st.label)) stationsSeen.push(st.label);
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
        entries.push(entry);
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

  return { entries, stations: stationsSeen };
}

function walkFindOrCreateStation(label) {
  if (!label) return sortedStations()[0] ?? null;
  const key = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  let found = barState.stations.find((s) => {
    const sk = s.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return sk === key || sk.includes(key) || key.includes(sk);
  });
  if (found) return found;
  found = {
    id: uid(),
    name: label,
    type: /shelf|wall|back bar|center/i.test(label) ? "back-bar" : "well",
    order: barState.stations.length,
    bottles: [],
  };
  barState.stations.push(found);
  return found;
}

function parseVoiceNotes(text) {
  const { entries } = parseWalkText(text);
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
  const count = bottleCount();
  const withBottles = sortedStations().filter((s) => (s.bottles || []).length > 0).length;
  el.textContent = `Found ${count} bottles across ${withBottles} stations`;
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

  const seed = data.phase === "build_bar" && (data.bar?.station_count || 0) === 0;
  barState = normalizeBar(await OSB.getBar(seed));
  if (cfg.bar_name && !barState.name) barState.name = cfg.bar_name;

  if (data.phase === "updates_signup") {
    renderUpdatesSignupStep();
  }
  if (data.phase === "build_bar") {
    allBars = data.bars || [];
    const buildNameEl = document.getElementById("buildBarName");
    if (buildNameEl) buildNameEl.value = barState.name || "";
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
  }

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
      "Hard reset wipes this bar and all setup progress and returns you to the email signup step.\n\nYour current data is backed up automatically. Continue?"
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
    await OSB.advancePhase("updates_signup");
    await initSetup();
  });

  document.getElementById("btnUpdatesSkip")?.addEventListener("click", async () => {
    try {
      setUpdatesSignupStatus("skipped");
      await advanceFromUpdatesSignup();
    } catch (err) {
      setStatus(err.message, "updatesStatus");
    }
  });

  document.getElementById("btnUpdatesContinue")?.addEventListener("click", async () => {
    try {
      await advanceFromUpdatesSignup();
    } catch (err) {
      setStatus(err.message, "updatesStatus");
    }
  });

  document.getElementById("btnUpdatesJoin")?.addEventListener("click", async () => {
    const optIn = document.getElementById("updatesOptIn")?.checked;
    const tourOptIn = document.getElementById("updatesTourOptIn")?.checked;
    if (!optIn && !tourOptIn) {
      setUpdatesSignupStatus("skipped");
      await advanceFromUpdatesSignup();
      return;
    }

    const email = document.getElementById("updatesEmail")?.value || "";
    const city = document.getElementById("updatesCity")?.value || "";
    const state = document.getElementById("updatesState")?.value || "";
    const statusEl = document.getElementById("updatesStatus");
    const joinBtn = document.getElementById("btnUpdatesJoin");
    if (joinBtn) joinBtn.disabled = true;
    if (statusEl) statusEl.textContent = "";

    const result = await submitUpdatesSignup({
      email,
      city,
      state,
      programUpdates: optIn,
      hiddenBarTour: tourOptIn,
    });
    if (joinBtn) joinBtn.disabled = false;

    if (!result.ok) {
      if (statusEl) statusEl.textContent = result.message;
      return;
    }

    if (statusEl) statusEl.textContent = result.message;
    window.setTimeout(() => advanceFromUpdatesSignup(), 700);
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

    await OSB.advancePhase("build_bar");
    await initSetup();
  });

  document.getElementById("buildBarName")?.addEventListener("blur", async () => {
    try {
      await saveBuildBarName();
      const data = await OSB.getState();
      renderBuildBarTabs(data.bars || [], barState.id);
    } catch (e) {
      setStatus(e.message);
    }
  });

  document.getElementById("btnDeleteBar")?.addEventListener("click", async () => {
    if (!barState.id) return;
    const bar = { id: barState.id, name: document.getElementById("buildBarName")?.value || barState.name };
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
      await saveBuildBarName();
      await persistBar();
      await OSB.createBar("", true);
      barState = normalizeBar(await OSB.getBar(true));
      editingStationId = null;
      const buildNameEl = document.getElementById("buildBarName");
      if (buildNameEl) {
        buildNameEl.value = "";
        buildNameEl.focus();
      }
      const data = await OSB.getState();
      allBars = data.bars || [];
      renderBuildBarTabs(allBars, barState.id);
      renderStationList();
      setStatus("New bar — name it above, then build its stations.");
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
    const name = document.getElementById("buildBarName")?.value?.trim();
    if (!name) {
      setStatus("Name this bar at the top before continuing.");
      document.getElementById("buildBarName")?.focus();
      return;
    }
    if (sortedStations().length === 0) {
      setStatus("Add at least one station.");
      return;
    }
    barState.name = name;
    await persistBar();
    await OSB.saveConfig({ bar_name: name });
    await OSB.advancePhase("voice_walk");
    await initSetup();
  });

  document.getElementById("voiceNotes")?.addEventListener("input", scheduleWalkParse);

  document.getElementById("btnUploadNotes")?.addEventListener("click", async () => {
    const text = document.getElementById("voiceNotes")?.value?.trim();
    if (text) {
      try {
        await processWalkNotes(text);
      } catch (e) {
        setStatus(e.message);
      }
      return;
    }
    document.getElementById("voiceNotesFile")?.click();
  });

  document.getElementById("voiceNotesFile")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAcceptedWalkNotesFile(file)) {
      const ext = walkNotesExtension(file.name);
      if (ext === "pdf") {
        setStatus("PDF isn't supported yet — from iPhone Notes, export as Markdown or .txt instead.");
      } else {
        setStatus(`That file type isn't supported. Use ${WALK_NOTES_ACCEPT_LABEL} from your notes app.`);
      }
      e.target.value = "";
      return;
    }
    try {
      const raw = await file.text();
      const text = normalizeUploadedWalkNotes(raw, file.name);
      document.getElementById("voiceNotes").value = text;
      await processWalkNotes(text);
    } catch (err) {
      setStatus(`Could not read that file — try ${WALK_NOTES_ACCEPT_LABEL} from your notes app.`);
    }
    e.target.value = "";
  });

  document.getElementById("btnNextWalkBar")?.addEventListener("click", async () => {
    if (allBars.length <= 1) return;
    const idx = allBars.findIndex((b) => b.id === barState.id);
    const next = allBars[(idx + 1) % allBars.length];
    try {
      await switchWalkBar(next.id);
      setStatus(`Now walking ${next.name || "next bar"}.`);
    } catch (e) {
      setStatus(e.message);
    }
  });

  document.getElementById("btnReparse")?.addEventListener("click", () => {
    setWalkView(false);
    document.getElementById("voiceNotesFile")?.click();
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
        setStatus("Parse my notes or add bottles, then review names and sizes before continuing.");
      }
      return;
    }
    const text = document.getElementById("voiceNotes")?.value?.trim();
    if (text) await OSB.uploadVoiceNotes(text);
    if (bottleCount() === 0 && !text) {
      setStatus("Parse my notes or add at least one bottle for this bar.");
      return;
    }
    await persistBar();

    const idx = allBars.findIndex((b) => b.id === barState.id);
    if (allBars.length > 1 && idx < allBars.length - 1) {
      const next = allBars[idx + 1];
      await switchWalkBar(next.id);
      setStatus(`Saved. Now walk ${next.name || "the next bar"} — or use Next Bar.`);
      return;
    }

    await OSB.advancePhase("reconcile");
    await initSetup();
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

  document.getElementById("btnUploadCount")?.addEventListener("click", async () => {
    const text = document.getElementById("countNotes")?.value?.trim();
    if (text) {
      try {
        await processCountNotes(text);
      } catch (e) {
        setStatus(e.message);
      }
      return;
    }
    document.getElementById("countNotesFile")?.click();
  });

  document.getElementById("countNotesFile")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAcceptedWalkNotesFile(file)) {
      const ext = walkNotesExtension(file.name);
      if (ext === "pdf") {
        setStatus("PDF isn't supported yet — from iPhone Notes, export as Markdown or .txt instead.");
      } else {
        setStatus(`That file type isn't supported. Use ${WALK_NOTES_ACCEPT_LABEL} from your notes app.`);
      }
      e.target.value = "";
      return;
    }
    try {
      const raw = await file.text();
      const text = normalizeUploadedWalkNotes(raw, file.name);
      document.getElementById("countNotes").value = text;
      await processCountNotes(text);
    } catch {
      setStatus(`Could not read that file — try ${WALK_NOTES_ACCEPT_LABEL} from your notes app.`);
    }
    e.target.value = "";
  });

  document.getElementById("btnRecount")?.addEventListener("click", () => resetCountForReupload());

  document.getElementById("btnCountDraft")?.addEventListener("click", async () => {
    try {
      await saveCountDraft();
      setStatus("Count draft saved.");
    } catch (e) {
      setStatus(e.message);
    }
  });

  document.getElementById("countReviewTable")?.addEventListener("change", async (e) => {
    const input = e.target.closest(".count-level-input");
    if (!input) return;
    const bottle = findBottleRecord(input.dataset.bottle, input.dataset.station);
    if (!bottle) return;
    bottle.current_level = parseFloat(input.value) || 0;
    bottle.count_matched = true;
    await persistBar();
    updateCountSummary();
    const statusCell = input.closest("tr")?.querySelector("td:last-child");
    if (statusCell) statusCell.innerHTML = '<span class="report-ok">manual</span>';
    updateFirstCountDoneButton();
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

  document.getElementById("btnFirstCountDone")?.addEventListener("click", async () => {
    if (!countParsed) {
      setStatus("Parse or paste your count first, then review levels in the table.");
      return;
    }
    if (lastCountReconcile?.hasIssues) {
      setStatus(
        "Count still has map mismatches — reconcile surprises above or fix levels, then finish."
      );
      document.getElementById("countReconcileReport")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    await persistBar();
    await OSB.saveConfig({ first_count_complete: true });
    await OSB.advancePhase("butterfly");
    window.location.href = "/home";
  });
}

/* ── Home base (butterfly) ── */

function apiStatusLabel(status) {
  const map = {
    "not-started": "Not started",
    connected: "Connected",
    skipped: "Skipped — add key when ready",
    "needs-key": "Needs API key",
  };
  return map[status] || status || "Unknown";
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
    <div class="metric"><div class="num">${s.bottle_count ?? "—"}</div><div class="lbl">Bottles on map</div></div>
    <div class="metric"><div class="num">${s.station_count ?? "—"}</div><div class="lbl">Stations</div></div>
    <div class="metric"><div class="num">${s.total_units ?? "—"}</div><div class="lbl">Total units</div></div>
    <div class="metric"><div class="num">${s.items_below_par ?? "—"}</div><div class="lbl">Below par</div></div>
    <div class="metric"><div class="num">${m.cycles_total ?? m.cycles_in_window ?? "—"}</div><div class="lbl">Cycles logged</div></div>
    <div class="metric"><div class="num">${s.pos_uploads ?? "—"}</div><div class="lbl">POS drops</div></div>
  `;

  const bounds = document.getElementById("metricsBounds");
  if (bounds && m.bounds) {
    const last = m.last_inventory_at ? ` · Last count ${m.last_inventory_at.slice(0, 10)}` : "";
    bounds.textContent = `Window: ${m.bounds.period_start} → ${m.bounds.period_end}${last}`;
  }

  const notes = document.getElementById("metricsNotes");
  if (notes) notes.textContent = s.notes || "";

  renderFirstWeekPanel(m.first_week);
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
    <table class="review-table">
      <thead><tr><th>Product</th><th>Station</th><th>Category</th><th>Level</th><th>Par</th></tr></thead>
      <tbody>
        ${items
          .map(
            (it) => `
          <tr${it.below_par ? ' class="row-flag"' : ""}>
            <td>${escapeHtml(it.name)} <span class="field-hint">${escapeHtml(it.size || "")}</span></td>
            <td>${escapeHtml(it.station_name || "")}</td>
            <td>${escapeHtml(it.category || "")}</td>
            <td>${escapeHtml(String(it.current_level ?? ""))}</td>
            <td>${escapeHtml(String(it.par_level ?? ""))}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

async function loadPosLog() {
  const list = document.getElementById("posLogList");
  if (!list) return;
  const data = await OSB.getPosLog();
  const entries = data.entries || [];
  if (!entries.length) {
    list.innerHTML = `<p class="field-hint">No POS drops yet — upload a terminal receipt above.</p>`;
    return;
  }
  list.innerHTML = entries
    .map(
      (e) => `
    <div class="bar-list-item" data-pos-id="${escapeHtml(e.id)}">
      <div>
        <strong>${escapeHtml(e.label || "POS drop")}</strong>
        <span class="field-hint">${escapeHtml((e.uploaded_at || "").slice(0, 16))} · ${escapeHtml(e.original_name || e.filename || "")}</span>
        ${e.note ? `<span class="field-hint">${escapeHtml(e.note)}</span>` : ""}
      </div>
      <button type="button" class="btn btn-ghost btn-sm btn-pos-delete" data-id="${escapeHtml(e.id)}">Remove</button>
    </div>`
    )
    .join("");
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
  await loadMetrics();

  if (homeListenersBound) return;
  homeListenersBound = true;

  document.querySelectorAll(".sidebar-link").forEach((btn) => {
    btn.addEventListener("click", async () => {
      switchAdminView(btn.dataset.view);
      if (btn.dataset.view === "inhouse") await loadInHouse();
      if (btn.dataset.view === "inputs") await loadPosLog();
    });
  });

  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => switchAdminView(btn.dataset.goto));
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
      await OSB.uploadPosLog({ label: label || "POS drop", note, file, text });
      document.getElementById("posFile").value = "";
      document.getElementById("posPaste").value = "";
      document.getElementById("posLabel").value = "";
      document.getElementById("posNote").value = "";
      setStatus("POS drop saved.", "posStatus");
      await loadPosLog();
      await loadMetrics();
    } catch (e) {
      setStatus(e.message, "posStatus");
    }
  });

  document.getElementById("posLogList")?.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-pos-delete");
    if (!btn) return;
    if (!window.confirm("Remove this POS drop?")) return;
    try {
      await OSB.deletePosLog(btn.dataset.id);
      await loadPosLog();
      await loadMetrics();
      setStatus("POS drop removed.", "posStatus");
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
    setStatus("Customizations saved.", "settingsStatus");
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
  if (document.body.dataset.app === "setup") initSetup();
  if (document.body.dataset.app === "home") initHome();
});