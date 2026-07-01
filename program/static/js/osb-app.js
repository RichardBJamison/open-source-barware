/* Open Source Barware — Chrome program client */

const SETUP_FLOW = [
  "welcome",
  "name_bar",
  "build_bar",
  "voice_walk",
  "reconcile",
  "map_review",
  "first_count",
];

const STEP_LABELS = {
  welcome: "Start",
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
  rum: ["rum", "bacardi", "captain", "malibu", "kraken"],
  tequila: ["tequila", "patron", "casamigos", "don julio", "espolon", "hornitos"],
  whiskey: ["whiskey", "whisky", "bourbon", "rye", "jack daniels", "jameson", "makers mark", "bulleit", "woodford"],
  scotch: ["scotch", "glenfiddich", "macallan", "glenlivet", "johnnie walker"],
  cognac: ["cognac", "brandy", "hennessy", "remy martin"],
  liqueur: ["liqueur", "amaretto", "kahlua", "baileys", "campari", "aperol"],
  beer: ["beer", "ipa", "lager", "ale", "stout", "heineken", "corona", "modelo"],
  wine: ["wine", "cabernet", "merlot", "pinot", "chardonnay", "prosecco", "champagne"],
  mixer: ["soda", "juice", "tonic", "syrup", "grenadine", "bitters", "vermouth"],
};

let setupListenersBound = false;
let homeListenersBound = false;
let barState = { id: "", name: "", stations: [] };
let walkParsed = false;
let editingStationId = null;
let allBars = [];

const WALK_NOTES_EXTENSIONS = new Set(["txt", "text", "md", "markdown", "rtf", "note"]);
const WALK_NOTES_ACCEPT_LABEL = ".txt · .md · .markdown · .rtf";
const BOTTLE_SIZES = ["50ml", "200ml", "375ml", "750ml", "1L", "1.75L"];
let walkReviewListenersBound = false;

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
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
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
};

function renderStepIndicator(phases, current) {
  const el = document.getElementById("stepIndicator");
  if (!el) return;
  const setupPhases = phases.filter((p) => p.id !== "butterfly" && p.id !== "welcome");
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

function stationIdByName(name) {
  const key = (name || "").trim().toLowerCase();
  return sortedStations().find((s) => s.name.toLowerCase() === key)?.id ?? null;
}

function walkReviewIsComplete() {
  const status = barState.setup?.walk_review_status;
  if (status === "complete" || status === "skipped" || status === "imported") return true;
  if (bottleCount() === 0) return false;
  return allBottles().every((b) => b.size_verified);
}

function updateWalkContinueButton() {
  const btn = document.getElementById("btnWalkContinue");
  if (!btn) return;
  const ready = walkReviewIsComplete();
  btn.disabled = !ready;
  btn.textContent = ready ? "Continue" : "Review your map first";
}

function updateWalkReviewProgress() {
  const el = document.getElementById("walkReviewProgress");
  if (!el) return;
  const bottles = allBottles();
  const verified = bottles.filter((b) => b.size_verified).length;
  el.textContent =
    bottles.length === 0
      ? "No bottles yet — upload notes or add manually."
      : `${verified} of ${bottles.length} sizes reviewed`;
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
  body.innerHTML = bottles
    .map((b) => {
      const raw = b.raw_heard || b.name;
      const unverified = !b.size_verified ? " size-unverified" : "";
      return `
        <tr class="${unverified}" data-bottle="${b.id}" data-station="${b.stationId}">
          <td class="raw-heard">${escapeHtml(raw)}</td>
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

    await persistBar();
    updateWalkReviewProgress();
    updateWalkContinueButton();
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
    setStatus(`Upload a notes file (${WALK_NOTES_ACCEPT_LABEL}) or paste your notes first.`);
    return;
  }
  const added = parseVoiceNotes(text);
  await OSB.uploadVoiceNotes(text);
  if (!barState.setup) barState.setup = {};
  barState.setup.walk_review_status = "pending";
  await persistBar({ walk_review_status: "pending" });
  setWalkView(true);
  updateWalkSummary();
  setStatus(
    added
      ? `Uploaded ${added} draft rows — review names and sizes before you continue.`
      : "Notes saved — add bottles manually, then review before you continue."
  );
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

function parseVoiceNotes(text) {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const stations = sortedStations();
  const newBottles = [];
  let currentStation = stations[0] ?? null;

  for (const line of lines) {
    const matchedStation = stations.find((s) => {
      const sName = s.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const lName = line.toLowerCase().replace(/[^a-z0-9]/g, "");
      return lName.startsWith(sName) || sName.startsWith(lName) || lName.includes(sName);
    });

    if (matchedStation) {
      currentStation = matchedStation;
      const pattern = new RegExp(matchedStation.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const remainder = line.replace(pattern, "").replace(/^[\s:,\-]+/, "").trim();
      if (remainder && currentStation) {
        remainder.split(/[,.]/).forEach((prod) => {
          const p = prod.trim();
          if (p.length > 1) pushBottle(currentStation.id, p.replace(/^\d+\.\s*/, ""));
        });
      }
      continue;
    }

    if (currentStation) {
      line.split(/[,.]|\band\b/).forEach((prod) => {
        const p = prod.trim().replace(/^\d+\.\s*/, "").replace(/:$/, "");
        if (p.length > 1) pushBottle(currentStation.id, p);
      });
    }
  }

  function pushBottle(stationId, raw) {
    const station = barState.stations.find((s) => s.id === stationId);
    if (!station) return;
    const parsed = extractSizeFromRaw(raw);
    if (parsed.name.length < 2) return;
    if (!station.bottles) station.bottles = [];
    const exists = station.bottles.some((b) => b.name.toLowerCase() === parsed.name.toLowerCase());
    if (exists) return;
    station.bottles.push({
      id: uid(),
      name: parsed.name,
      raw_heard: parsed.raw_heard,
      category: guessCategory(parsed.name),
      size: parsed.size,
      size_verified: parsed.size_verified,
      par_level: 1.0,
      current_level: 1.0,
      cost: 0,
    });
    newBottles.push(parsed.name);
  }

  return newBottles.length;
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

function renderReview() {
  const nameEl = document.getElementById("reviewBarName");
  if (nameEl) nameEl.textContent = barState.name || "your bar";

  const statsEl = document.getElementById("reviewStats");
  if (statsEl) {
    const cats = new Set(allBottles().map((b) => b.category));
    statsEl.innerHTML = `
      <div class="stat-card"><div class="stat-num">${sortedStations().length}</div><div class="stat-lbl">Stations</div></div>
      <div class="stat-card"><div class="stat-num">${bottleCount()}</div><div class="stat-lbl">Bottles</div></div>
      <div class="stat-card"><div class="stat-num">${cats.size}</div><div class="stat-lbl">Categories</div></div>
    `;
  }
  renderBottleGroups("bottleGroupsReview", true);
}

function renderReconcilePreview() {
  const el = document.getElementById("reconcilePreview");
  if (!el) return;
  el.innerHTML = `
    <div class="reconcile-stat-row">
      <span><strong>${sortedStations().length}</strong> stations</span>
      <span><strong>${bottleCount()}</strong> bottles mapped</span>
    </div>
  `;
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
  const cycleEl = document.getElementById("cycleDays");
  if (cycleEl && cfg.cycle?.interval_days) cycleEl.value = cfg.cycle.interval_days;

  const voiceNotes = document.getElementById("voiceNotes");
  if (voiceNotes && data.state?.voice_notes_text) voiceNotes.value = data.state.voice_notes_text;

  const seed = data.phase === "build_bar" && (data.bar?.station_count || 0) === 0;
  barState = normalizeBar(await OSB.getBar(seed));
  if (cfg.bar_name && !barState.name) barState.name = cfg.bar_name;

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
  if (data.phase === "reconcile") renderReconcilePreview();
  if (data.phase === "map_review") renderReview();

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

  document.getElementById("btnWelcomeNext")?.addEventListener("click", async () => {
    await OSB.advancePhase("name_bar");
    await initSetup();
  });

  document.getElementById("btnNameContinue")?.addEventListener("click", async () => {
    const cycleDays = parseInt(document.getElementById("cycleDays")?.value || "7", 10);
    await OSB.saveConfig({ cycle: { interval_days: cycleDays } });

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
      setStatus("Review names and sizes in the table — or use Continue with defaults if you're stuck.");
      return;
    }
    const text = document.getElementById("voiceNotes")?.value?.trim();
    if (text) await OSB.uploadVoiceNotes(text);
    if (bottleCount() === 0 && !text) {
      setStatus("Upload notes or add at least one bottle for this bar.");
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
    setStatus("Reconciling…");
    try {
      await persistBar();
      await OSB.reconcile();
      await OSB.advancePhase("map_review");
      setStatus("");
      await initSetup();
    } catch (e) {
      setStatus(e.message);
    }
  });

  document.getElementById("btnApproveMap")?.addEventListener("click", async () => {
    await persistBar();
    await OSB.approveMap();
    await OSB.advancePhase("first_count");
    await initSetup();
  });

  document.getElementById("btnFirstCountDone")?.addEventListener("click", async () => {
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
    <div class="metric"><div class="num">${m.cycles_in_window ?? "—"}</div><div class="lbl">Cycles in window</div></div>
    <div class="metric"><div class="num">${m.interval_days ?? "—"}</div><div class="lbl">Interval (days)</div></div>
    <div class="metric"><div class="num">${s.items_below_par ?? "—"}</div><div class="lbl">Below par</div></div>
    <div class="metric"><div class="num">${s.items_flagged ?? "—"}</div><div class="lbl">Flagged</div></div>
    <div class="metric"><div class="num">${s.sales_trend ?? "—"}</div><div class="lbl">Sales trend</div></div>
    <div class="metric"><div class="num">${m.last_inventory_at ? "✓" : "—"}</div><div class="lbl">Last count</div></div>
  `;

  const bounds = document.getElementById("metricsBounds");
  if (bounds && m.bounds) {
    bounds.textContent = `Window: ${m.bounds.period_start} → ${m.bounds.period_end}`;
  }
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
  if (data.phase !== "butterfly" || data.config.setup_bar_id) {
    window.location.href = "/";
    return;
  }

  const cfg = data.config;
  const cycleDays = cfg.cycle?.interval_days || 7;
  const cycleText = `${cfg.cycle?.label || "Inventory cycle"} · every ${cycleDays} day${cycleDays === 1 ? "" : "s"}`;

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
    btn.addEventListener("click", () => switchAdminView(btn.dataset.view));
  });

  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => switchAdminView(btn.dataset.goto));
  });

  document.getElementById("metricsWindow")?.addEventListener("change", loadMetrics);

  document.getElementById("barSwitcher")?.addEventListener("change", async (e) => {
    await OSB.switchBar(e.target.value);
    await refreshHomeBars();
    const fresh = await OSB.getState();
    document.getElementById("settBarName").value = fresh.config.bar_name || "";
    await loadMetrics();
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