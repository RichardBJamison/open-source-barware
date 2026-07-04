"""
Open Source Barware — Chrome Program Server
Local Flask app (OVLP POP delivery model).

Caterpillar: welcome → name_bar → build_bar → voice_walk → reconcile → map_review → first_count
Butterfly:   home base admin panel (metrics, spreadsheets, in-house inventory)
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from flask import Flask, jsonify, redirect, request, send_from_directory

VERSION = "0.2.0-demo-2026-07-01"
PORT = int(os.environ.get("PORT", "5052"))
DEMO_MODE = os.environ.get("OSB_DEMO_MODE", "1") != "0"

_DIR = os.path.dirname(os.path.abspath(__file__))
_STATIC = os.path.join(_DIR, "static")
_IS_VERCEL = bool(os.environ.get("VERCEL"))
_DATA = os.environ.get("OSB_DATA_DIR") or (
    "/tmp/osb-data" if _IS_VERCEL else os.path.join(_DIR, "data")
)
_CONFIG_FILE = (
    os.path.join(_DATA, "osb_config.json")
    if _IS_VERCEL
    else os.path.join(_DIR, "osb_config.json")
)
_STATE_FILE = os.path.join(_DATA, "program_state.json")
_BAR_FILE = os.path.join(_DATA, "bar_data.json")
_BARS_FILE = os.path.join(_DATA, "bars.json")

PHASES = (
    "welcome",
    "updates_signup",
    "name_bar",
    "build_bar",
    "voice_walk",
    "reconcile",
    "map_review",
    "first_count",
    "butterfly",
)

PHASE_LABELS = {
    "welcome": "Welcome",
    "updates_signup": "Updates",
    "name_bar": "Name",
    "build_bar": "Build bar",
    "voice_walk": "Walk",
    "reconcile": "Reconcile",
    "map_review": "Review",
    "first_count": "Count",
    "butterfly": "Home",
}

LEGACY_PHASE_MAP = {
    "ai_connect": "name_bar",
}

DEFAULT_STATIONS: list[dict[str, Any]] = [
    {"name": "Main Bar", "type": "well", "order": 0},
    {"name": "Service Bar", "type": "well", "order": 1},
    {"name": "Point", "type": "well", "order": 2},
    {"name": "Back Bar Main", "type": "back-bar", "order": 3},
    {"name": "Back Bar Point", "type": "back-bar", "order": 4},
    {"name": "Back Bar Service", "type": "back-bar", "order": 5},
    {"name": "Wine Cooler", "type": "walk-in", "order": 6},
    {"name": "Beer Cooler", "type": "walk-in", "order": 7},
    {"name": "Walk-in Cooler", "type": "walk-in", "order": 8},
]

DEFAULT_CONFIG: dict[str, Any] = {
    "bar_name": "",
    "active_bar_id": "",
    "setup_bar_id": "",
    "install_slug": "main",
    "server_url": f"http://localhost:{PORT}",
    "phase": "welcome",
    "ai_provider": "",
    "ai_api_key_set": False,
    "api_connection_status": "not-started",
    "map_approved": False,
    "first_count_complete": False,
    "cycle": {
        "interval_days": 7,
        "label": "Inventory cycle",
        "anchor_day": "monday",
        "timezone": "America/New_York",
    },
    "metrics_default_window": "current_cycle",
    "metrics_windows": [
        "current_cycle",
        "last_cycle",
        "last_3_cycles",
        "last_30_days",
        "last_90_days",
        "custom",
    ],
}

app = Flask(__name__, static_folder=_STATIC, static_url_path="/static")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _uid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:10]}"


def _read_json(path: str, fallback: Any) -> Any:
    if not os.path.exists(path):
        return fallback
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return fallback


def _write_json(path: str, data: Any) -> None:
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, path)


def _ensure_runtime_dirs() -> None:
    os.makedirs(_DATA, exist_ok=True)
    if not os.path.exists(_CONFIG_FILE):
        _write_json(_CONFIG_FILE, DEFAULT_CONFIG)


_ensure_runtime_dirs()


def _normalize_phase(phase: str, cfg: dict[str, Any]) -> str:
    if phase in LEGACY_PHASE_MAP:
        mapped = LEGACY_PHASE_MAP[phase]
        if mapped == "name_bar" and cfg.get("bar_name"):
            return "build_bar"
        return mapped
    if phase not in PHASES:
        return "welcome"
    return phase


def _load_config() -> dict[str, Any]:
    cfg = _read_json(_CONFIG_FILE, {})
    merged = {**DEFAULT_CONFIG, **cfg}
    merged["cycle"] = {**DEFAULT_CONFIG["cycle"], **cfg.get("cycle", {})}
    normalized = _normalize_phase(merged.get("phase", "welcome"), merged)
    if normalized != merged.get("phase"):
        merged["phase"] = normalized
        _write_json(_CONFIG_FILE, merged)
    return merged


def _save_config(patch: dict[str, Any]) -> dict[str, Any]:
    cfg = _load_config()
    if "cycle" in patch and isinstance(patch["cycle"], dict):
        cfg["cycle"] = {**cfg.get("cycle", {}), **patch["cycle"]}
        patch = {k: v for k, v in patch.items() if k != "cycle"}
    cfg.update(patch)
    _write_json(_CONFIG_FILE, cfg)
    return cfg


def _load_state() -> dict[str, Any]:
    return _read_json(
        _STATE_FILE,
        {
            "updated_at": None,
            "voice_notes": [],
            "draft_map": None,
            "approved_map": None,
            "cycles": [],
            "metrics_cache": {},
        },
    )


def _save_state(patch: dict[str, Any]) -> dict[str, Any]:
    state = _load_state()
    state.update(patch)
    state["updated_at"] = _now()
    _write_json(_STATE_FILE, state)
    return state


def _default_bar_setup() -> dict[str, Any]:
    return {
        "map_approved": False,
        "first_count_complete": False,
        "voice_notes": [],
        "draft_map": None,
        "approved_map": None,
    }


def _empty_bar_record(name: str = "", bar_id: str | None = None) -> dict[str, Any]:
    return {
        "id": bar_id or _uid("bar-"),
        "name": name,
        "created_at": None,
        "updated_at": None,
        "stations": [],
        "setup": _default_bar_setup(),
    }


def _normalize_bar_record(bar: dict[str, Any]) -> dict[str, Any]:
    bar.setdefault("id", _uid("bar-"))
    bar.setdefault("name", "")
    bar.setdefault("stations", [])
    setup = {**_default_bar_setup(), **bar.get("setup", {})}
    bar["setup"] = setup
    return bar


def _migrate_bars_registry() -> dict[str, Any]:
    """One-time migration from bar_data.json + program_state to bars.json."""
    existing = _read_json(_BARS_FILE, None)
    if existing and existing.get("bars"):
        return existing

    cfg = _read_json(_CONFIG_FILE, {})
    state = _read_json(_STATE_FILE, {})
    legacy = _read_json(_BAR_FILE, None)

    bar_id = cfg.get("active_bar_id") or _uid("bar-")
    name = ""
    stations: list[dict[str, Any]] = []
    created = None
    updated = None

    if legacy:
        name = legacy.get("bar_name") or cfg.get("bar_name", "")
        stations = legacy.get("stations", [])
        created = legacy.get("created_at")
        updated = legacy.get("updated_at")
    else:
        name = cfg.get("bar_name", "")

    bar = _normalize_bar_record(
        {
            "id": bar_id,
            "name": name,
            "created_at": created,
            "updated_at": updated,
            "stations": stations,
            "setup": {
                "map_approved": bool(cfg.get("map_approved")),
                "first_count_complete": bool(cfg.get("first_count_complete")),
                "voice_notes": state.get("voice_notes", []),
                "draft_map": state.get("draft_map"),
                "approved_map": state.get("approved_map"),
            },
        }
    )

    registry = {"bars": [bar]}
    _write_json(_BARS_FILE, registry)

    patch: dict[str, Any] = {"active_bar_id": bar_id}
    if cfg.get("setup_bar_id"):
        patch["setup_bar_id"] = cfg["setup_bar_id"]
    elif cfg.get("phase") != "butterfly":
        patch["setup_bar_id"] = bar_id
    if name and not cfg.get("bar_name"):
        patch["bar_name"] = name
    if os.path.exists(_CONFIG_FILE):
        merged = {**cfg, **patch}
        _write_json(_CONFIG_FILE, merged)

    return registry


def _load_bars_registry() -> dict[str, Any]:
    registry = _migrate_bars_registry()
    registry["bars"] = [_normalize_bar_record(b) for b in registry.get("bars", [])]
    return registry


def _save_bars_registry(registry: dict[str, Any]) -> dict[str, Any]:
    registry["bars"] = [_normalize_bar_record(b) for b in registry.get("bars", [])]
    _write_json(_BARS_FILE, registry)
    return registry


def _find_bar(registry: dict[str, Any], bar_id: str) -> tuple[int, dict[str, Any] | None]:
    for i, bar in enumerate(registry.get("bars", [])):
        if bar.get("id") == bar_id:
            return i, bar
    return -1, None


def _setup_bar_id(cfg: dict[str, Any] | None = None) -> str:
    cfg = cfg or _load_config()
    if cfg.get("setup_bar_id"):
        return cfg["setup_bar_id"]
    if cfg.get("active_bar_id"):
        return cfg["active_bar_id"]
    registry = _load_bars_registry()
    if registry.get("bars"):
        return registry["bars"][0]["id"]
    return ""


def _load_bar(bar_id: str | None = None) -> dict[str, Any]:
    registry = _load_bars_registry()
    cfg = _load_config()
    bid = bar_id or _setup_bar_id(cfg)
    if not bid:
        return _empty_bar_record(cfg.get("bar_name", ""))
    _, bar = _find_bar(registry, bid)
    if bar is None:
        return _empty_bar_record(cfg.get("bar_name", ""), bid)
    return bar


def _save_bar(bar: dict[str, Any]) -> dict[str, Any]:
    registry = _load_bars_registry()
    bar = _normalize_bar_record(bar)
    bar["updated_at"] = _now()
    if not bar.get("created_at"):
        bar["created_at"] = bar["updated_at"]

    idx, existing = _find_bar(registry, bar["id"])
    if idx >= 0:
        registry["bars"][idx] = bar
    else:
        registry["bars"].append(bar)

    _save_bars_registry(registry)

    cfg = _load_config()
    if cfg.get("active_bar_id") == bar["id"] or not cfg.get("active_bar_id"):
        _save_config({"bar_name": bar.get("name", ""), "active_bar_id": bar["id"]})
    return bar


def _bar_setup_state(bar: dict[str, Any]) -> dict[str, Any]:
    return bar.setdefault("setup", _default_bar_setup())


def _save_bar_setup(bar_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    registry = _load_bars_registry()
    idx, bar = _find_bar(registry, bar_id)
    if bar is None:
        raise ValueError("bar not found")
    setup = _bar_setup_state(bar)
    setup.update(patch)
    bar["setup"] = setup
    registry["bars"][idx] = bar
    _save_bars_registry(registry)
    return bar


def _bar_public_summary(bar: dict[str, Any]) -> dict[str, Any]:
    setup = bar.get("setup", {})
    return {
        "id": bar.get("id"),
        "name": bar.get("name", ""),
        "station_count": len(bar.get("stations", [])),
        "bottle_count": _bar_bottle_count(bar),
        "map_approved": bool(setup.get("map_approved")),
        "first_count_complete": bool(setup.get("first_count_complete")),
        "updated_at": bar.get("updated_at"),
    }


def _infer_bar_setup_phase(bar: dict[str, Any]) -> str:
    setup = bar.get("setup", {})
    if setup.get("first_count_complete"):
        return "butterfly"
    if setup.get("map_approved"):
        return "first_count"
    if setup.get("draft_map"):
        return "map_review"
    if setup.get("voice_notes") or _bar_bottle_count(bar) > 0:
        return "reconcile"
    if bar.get("stations"):
        return "voice_walk"
    if bar.get("name"):
        return "build_bar"
    return "name_bar"


def _stations_from_templates() -> list[dict[str, Any]]:
    return [
        {
            "id": _uid("stn-"),
            "name": s["name"],
            "type": s["type"],
            "order": s["order"],
            "bottles": [],
        }
        for s in DEFAULT_STATIONS
    ]


def _seed_default_stations(bar: dict[str, Any]) -> dict[str, Any]:
    if bar.get("stations"):
        return bar
    cfg = _load_config()
    if not bar.get("name"):
        bar["name"] = cfg.get("bar_name", "")
    bar["stations"] = _stations_from_templates()
    return _save_bar(bar)


def _reset_bar_templates(bar: dict[str, Any]) -> dict[str, Any]:
    """Replace stations with starter templates; keep bottles only on matching names."""
    cfg = _load_config()
    if not bar.get("name"):
        bar["name"] = cfg.get("bar_name", "")
    old_by_name = {s.get("name", "").lower(): s for s in bar.get("stations", [])}
    stations = []
    for tmpl in _stations_from_templates():
        prev = old_by_name.get(tmpl["name"].lower())
        if prev and prev.get("bottles"):
            tmpl["bottles"] = prev["bottles"]
        stations.append(tmpl)
    bar["stations"] = stations
    return _save_bar(bar)


def _bar_bottle_count(bar: dict[str, Any]) -> int:
    return sum(len(s.get("bottles", [])) for s in bar.get("stations", []))


def _bar_to_draft_map(bar: dict[str, Any]) -> dict[str, Any]:
    locations = []
    blank_slots: list[dict[str, Any]] = []
    for station in bar.get("stations", []):
        loc = {
            "id": station.get("id"),
            "name": station.get("name"),
            "type": station.get("type"),
            "bottles": [
                {
                    "id": b.get("id"),
                    "name": b.get("name"),
                    "category": b.get("category"),
                    "size": b.get("size"),
                    "par_level": b.get("par_level", 1.0),
                }
                for b in station.get("bottles", [])
            ],
        }
        locations.append(loc)
        if not loc["bottles"]:
            blank_slots.append({"station": station.get("name"), "reason": "no bottles assigned"})
    return {
        "id": _uid("map-"),
        "created_at": _now(),
        "status": "draft",
        "locations": locations,
        "blank_slots": blank_slots,
        "flags": [],
    }


def _phase_index(phase: str) -> int:
    try:
        return PHASES.index(phase)
    except ValueError:
        return 0


def _can_advance(cfg: dict[str, Any], target: str) -> tuple[bool, str]:
    current = cfg.get("phase", "welcome")
    if target not in PHASES:
        return False, "unknown phase"
    if _phase_index(target) <= _phase_index(current):
        return True, ""

    bar = _load_bar()
    setup = _bar_setup_state(bar)
    has_walk = bool(setup.get("voice_notes")) or _bar_bottle_count(bar) > 0
    bar_name = bar.get("name") or cfg.get("bar_name", "")

    checks = {
        "name_bar": (current == "welcome", "Complete welcome first."),
        "build_bar": (current == "name_bar", "Continue from the previous step first."),
        "voice_walk": (
            len(bar.get("stations", [])) > 0 and bool(bar_name),
            "Name this bar and add at least one station.",
        ),
        "reconcile": (has_walk, "Walk the bar — paste voice notes or add bottles."),
        "map_review": (
            bool(setup.get("draft_map")) or _bar_bottle_count(bar) > 0,
            "Run reconciliation or add bottles before review.",
        ),
        "first_count": (bool(setup.get("map_approved")), "Approve the inventory map before counting."),
        "butterfly": (
            bool(setup.get("first_count_complete")),
            "Complete the first live count before opening home base.",
        ),
    }
    if target in checks:
        ok, msg = checks[target]
        if not ok:
            return False, msg
    return True, ""


def _cycle_bounds(cfg: dict[str, Any], offset: int = 0) -> dict[str, str]:
    """Return period_start / period_end for current or prior cycle."""
    days = int(cfg.get("cycle", {}).get("interval_days", 7))
    end = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    end = end - timedelta(days=offset * days)
    start = end - timedelta(days=days)
    return {
        "period_start": start.date().isoformat(),
        "period_end": end.date().isoformat(),
        "interval_days": days,
    }


def _metrics_for_window(cfg: dict[str, Any], window: str, custom_from: str = "", custom_to: str = "") -> dict[str, Any]:
    """Stub metrics — structure is real; data fills in as cycles complete."""
    cycles = _load_state().get("cycles", [])
    interval = int(cfg.get("cycle", {}).get("interval_days", 7))

    if window == "custom" and custom_from and custom_to:
        bounds = {"period_start": custom_from, "period_end": custom_to, "interval_days": interval}
    elif window == "last_cycle":
        bounds = _cycle_bounds(cfg, offset=1)
    elif window == "last_3_cycles":
        bounds = _cycle_bounds(cfg, offset=0)
        bounds["period_start"] = (
            datetime.fromisoformat(bounds["period_end"]).date() - timedelta(days=interval * 3)
        ).isoformat()
    elif window == "last_30_days":
        end = datetime.now(timezone.utc).date()
        bounds = {"period_start": (end - timedelta(days=30)).isoformat(), "period_end": end.isoformat(), "interval_days": 30}
    elif window == "last_90_days":
        end = datetime.now(timezone.utc).date()
        bounds = {"period_start": (end - timedelta(days=90)).isoformat(), "period_end": end.isoformat(), "interval_days": 90}
    else:
        bounds = _cycle_bounds(cfg, offset=0)

    return {
        "window": window,
        "bounds": bounds,
        "cycle_label": cfg.get("cycle", {}).get("label", "Inventory cycle"),
        "interval_days": interval,
        "cycles_in_window": len(cycles),
        "last_inventory_at": cycles[-1]["completed_at"] if cycles else None,
        "summary": {
            "usage_value": None,
            "purchase_value": None,
            "variance_value": None,
            "variance_pct": None,
            "items_below_par": 0,
            "items_flagged": 0,
            "betterments": [],
            "sales_trend": "flat",
            "notes": "Metrics populate after the first completed cycle.",
        },
        "categories": {
            "liquor": {"sku_count": 0, "on_hand_units": 0},
            "beer": {"sku_count": 0, "on_hand_units": 0},
            "wine": {"sku_count": 0, "on_hand_units": 0},
            "mixers": {"sku_count": 0, "on_hand_units": 0},
            "dry_goods": {"sku_count": 0, "on_hand_units": 0, "reserved": True},
        },
    }


@app.after_request
def _cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return resp


@app.route("/ping")
def ping():
    return jsonify({"status": "ok", "app": "osb-program", "version": VERSION, "port": PORT})


@app.route("/")
def index():
    cfg = _load_config()
    if cfg.get("phase") == "butterfly" and not cfg.get("setup_bar_id"):
        return send_from_directory(_STATIC, "home.html")
    return send_from_directory(_STATIC, "setup.html")


@app.route("/setup")
def setup_page():
    return send_from_directory(_STATIC, "setup.html")


@app.route("/help/api-key")
def api_key_help():
    return send_from_directory(_STATIC, "api-guide.html")


@app.route("/help/standard-setups")
def standard_setups_help():
    return send_from_directory(_STATIC, "standard-setups.html")


@app.route("/home")
def home_page():
    cfg = _load_config()
    if cfg.get("phase") != "butterfly":
        return redirect("/")
    return send_from_directory(_STATIC, "home.html")


# ── Config & phase ────────────────────────────────────────────────────────────

@app.route("/api/state", methods=["GET"])
def api_state():
    cfg = _load_config()
    state = _load_state()
    registry = _load_bars_registry()
    bar = _load_bar()
    setup = _bar_setup_state(bar)
    phase = cfg.get("phase", "welcome")
    active_id = cfg.get("active_bar_id", "")
    setup_id = cfg.get("setup_bar_id", "") or active_id

    return jsonify(
        {
            "version": VERSION,
            "phase": phase,
            "phase_label": PHASE_LABELS.get(phase, phase),
            "phases": [{"id": p, "label": PHASE_LABELS[p]} for p in PHASES],
            "config": {
                "bar_name": bar.get("name") or cfg.get("bar_name"),
                "active_bar_id": active_id,
                "setup_bar_id": setup_id,
                "ai_provider": cfg.get("ai_provider"),
                "ai_api_key_set": cfg.get("ai_api_key_set"),
                "api_connection_status": cfg.get("api_connection_status"),
                "map_approved": setup.get("map_approved"),
                "first_count_complete": setup.get("first_count_complete"),
                "cycle": cfg.get("cycle"),
                "metrics_default_window": cfg.get("metrics_default_window"),
                "metrics_windows": cfg.get("metrics_windows"),
            },
            "bars": [_bar_public_summary(b) for b in registry.get("bars", [])],
            "bar": {
                "id": bar.get("id"),
                "name": bar.get("name", ""),
                "station_count": len(bar.get("stations", [])),
                "bottle_count": _bar_bottle_count(bar),
            },
            "state": {
                "voice_notes_count": len(setup.get("voice_notes", [])),
                "voice_notes_text": "\n\n".join(
                    n.get("text", "") for n in setup.get("voice_notes", []) if n.get("text")
                ),
                "has_draft_map": bool(setup.get("draft_map")),
                "has_approved_map": bool(setup.get("approved_map")),
                "cycles_count": len(state.get("cycles", [])),
            },
        }
    )


@app.route("/api/config", methods=["POST"])
def api_config():
    body = request.get_json(force=True) or {}
    allowed = {
        "bar_name",
        "ai_provider",
        "api_connection_status",
        "map_approved",
        "first_count_complete",
        "metrics_default_window",
        "cycle",
    }
    patch = {k: body[k] for k in allowed if k in body}
    if "cycle" in patch:
        cycle = patch["cycle"] if isinstance(patch["cycle"], dict) else {}
        mode = str(cycle.get("mode", "")).lower()
        interval = cycle.get("interval_days")
        if mode not in ("weekly", "monthly"):
            # legacy payloads: only interval 7 (weekly) or 30 (monthly) accepted
            if interval == 7:
                mode = "weekly"
            elif interval == 30:
                mode = "monthly"
            else:
                return (
                    jsonify({
                        "error": "Inventory cycle must be weekly (starts Monday) or monthly (starts on the 1st)."
                    }),
                    400,
                )
        if mode == "weekly":
            patch["cycle"] = {
                "mode": "weekly",
                "anchor": "monday",
                "anchor_day": "monday",
                "interval_days": 7,
                "label": "Inventory cycle",
                "timezone": cycle.get("timezone", "America/New_York"),
            }
        else:
            patch["cycle"] = {
                "mode": "monthly",
                "anchor": "first-of-month",
                "anchor_day": "first",
                "interval_days": 30,
                "label": "Inventory cycle",
                "timezone": cycle.get("timezone", "America/New_York"),
            }
    if body.get("bar_name"):
        bar = _load_bar()
        bar["name"] = body["bar_name"].strip()
        _save_bar(bar)
        patch["bar_name"] = bar["name"]
    if body.get("first_count_complete"):
        bar = _load_bar()
        _save_bar_setup(bar["id"], {"first_count_complete": True})
        patch["first_count_complete"] = True
        patch["setup_bar_id"] = ""
        patch["phase"] = "butterfly"
    if body.get("ai_api_key"):
        patch["ai_api_key_set"] = True
        patch["api_connection_status"] = "connected"
    if body.get("clear_api_key"):
        patch["ai_api_key_set"] = False
        patch["api_connection_status"] = "needs-key"
    cfg = _save_config(patch)
    public = {k: cfg.get(k) for k in allowed if k in cfg}
    public["ai_api_key_set"] = cfg.get("ai_api_key_set")
    public["api_connection_status"] = cfg.get("api_connection_status")
    return jsonify({"status": "saved", "config": public})


@app.route("/api/phase/advance", methods=["POST"])
def api_phase_advance():
    body = request.get_json(force=True) or {}
    target = body.get("phase", "")
    cfg = _load_config()
    ok, msg = _can_advance(cfg, target)
    if not ok:
        return jsonify({"error": msg}), 400
    cfg = _save_config({"phase": target})
    return jsonify({"status": "ok", "phase": cfg["phase"], "phase_label": PHASE_LABELS[cfg["phase"]]})


@app.route("/api/phase/go", methods=["POST"])
def api_phase_go():
    """Navigate setup — back freely; forward only when gates pass."""
    body = request.get_json(force=True) or {}
    target = body.get("phase", "").strip()
    if target not in PHASES or target == "butterfly":
        return jsonify({"error": "invalid phase"}), 400

    cfg = _load_config()
    current = cfg.get("phase", "welcome")
    cur_i = _phase_index(current)
    tgt_i = _phase_index(target)

    if tgt_i < cur_i:
        cfg = _save_config({"phase": target})
        return jsonify(
            {
                "status": "ok",
                "direction": "back",
                "phase": cfg["phase"],
                "phase_label": PHASE_LABELS[cfg["phase"]],
            }
        )

    if tgt_i == cur_i:
        return jsonify(
            {
                "status": "ok",
                "direction": "stay",
                "phase": current,
                "phase_label": PHASE_LABELS.get(current, current),
            }
        )

    ok, msg = _can_advance(cfg, target)
    if not ok:
        return jsonify({"error": msg}), 400
    cfg = _save_config({"phase": target})
    return jsonify(
        {
            "status": "ok",
            "direction": "forward",
            "phase": cfg["phase"],
            "phase_label": PHASE_LABELS[cfg["phase"]],
        }
    )


@app.route("/api/phase/reset", methods=["POST"])
def api_phase_reset():
    """Dev/sandbox helper — restart caterpillar."""
    _save_config({"phase": "welcome", "map_approved": False, "first_count_complete": False})
    return jsonify({"status": "reset", "phase": "welcome"})


# ── Caterpillar stubs ───────────────────────────────────────────────────────

@app.route("/api/setup/skip-ai", methods=["POST"])
def api_skip_ai():
    """Legacy — AI connect lives in Settings; marks skipped and stays on current phase."""
    body = request.get_json(force=True) or {}
    bar_name = (body.get("bar_name") or _load_config().get("bar_name") or "").strip()
    patch: dict[str, Any] = {
        "api_connection_status": "skipped",
        "ai_api_key_set": False,
    }
    if bar_name:
        patch["bar_name"] = bar_name
    if body.get("cycle"):
        patch["cycle"] = body["cycle"]
    elif body.get("cycle_days"):
        patch["cycle"] = {"interval_days": int(body["cycle_days"])}
    cfg = _save_config(patch)
    return jsonify(
        {
            "status": "skipped",
            "phase": cfg["phase"],
            "message": "API connection skipped. Add your key anytime under Settings → API management.",
        }
    )


@app.route("/api/setup/voice-notes", methods=["POST"])
def api_voice_notes():
    body = request.get_json(force=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text required"}), 400
    bar = _load_bar()
    existing = _bar_setup_state(bar).get("voice_notes", [])
    note_id = existing[0]["id"] if existing else _uid("note-")
    notes = [{"id": note_id, "text": text, "uploaded_at": _now()}]
    _save_bar_setup(bar["id"], {"voice_notes": notes})
    return jsonify({"status": "saved", "count": 1})


@app.route("/api/setup/reconcile", methods=["POST"])
def api_reconcile():
    """Build draft map from bar data; AI reconciliation wires in later."""
    bar = _load_bar()
    setup = _bar_setup_state(bar)
    if not setup.get("voice_notes") and _bar_bottle_count(bar) == 0:
        return jsonify({"error": "Walk the bar first — paste notes or add bottles."}), 400
    draft = _bar_to_draft_map(bar)
    cfg = _load_config()
    if not cfg.get("ai_api_key_set") and cfg.get("api_connection_status") != "connected":
        draft["flags"].append("AI not connected — map built from your walk. Connect API in Settings for deeper reconciliation.")
    _save_bar_setup(bar["id"], {"draft_map": draft})
    return jsonify({"status": "draft_ready", "draft_map": draft, "bottle_count": _bar_bottle_count(bar)})


@app.route("/api/setup/approve-map", methods=["POST"])
def api_approve_map():
    bar = _load_bar()
    setup = _bar_setup_state(bar)
    draft = setup.get("draft_map")
    if not draft:
        if _bar_bottle_count(bar) == 0:
            return jsonify({"error": "no draft map"}), 400
        draft = _bar_to_draft_map(bar)
    approved = {**draft, "status": "approved", "approved_at": _now()}
    _save_bar_setup(bar["id"], {"approved_map": approved, "map_approved": True})
    _save_config({"map_approved": True})
    return jsonify({"status": "approved"})


# ── Bar map (plug-and-play setup) ─────────────────────────────────────────────

@app.route("/api/bar", methods=["GET"])
def api_get_bar():
    bar_id = request.args.get("bar_id", "").strip()
    bar = _load_bar(bar_id or None)
    seed = request.args.get("seed", "").lower() in ("1", "true", "yes")
    if seed and not bar.get("stations"):
        bar = _seed_default_stations(bar)
    cfg = _load_config()
    if cfg.get("bar_name") and not bar.get("name"):
        bar["name"] = cfg["bar_name"]
        bar = _save_bar(bar)
    return jsonify(bar)


@app.route("/api/bar", methods=["POST"])
def api_save_bar():
    """Save full bar map — stations with nested bottles."""
    body = request.get_json(force=True) or {}
    bar = _load_bar(body.get("bar_id") or None)
    name = (body.get("bar_name") or body.get("name") or "").strip()
    if name:
        bar["name"] = name
        cfg_patch: dict[str, Any] = {}
        if _load_config().get("active_bar_id") == bar.get("id"):
            cfg_patch["bar_name"] = name
        if cfg_patch:
            _save_config(cfg_patch)
    if "stations" in body and isinstance(body["stations"], list):
        stations = []
        for i, s in enumerate(body["stations"]):
            station = {
                "id": s.get("id") or _uid("stn-"),
                "name": (s.get("name") or "Station").strip(),
                "type": s.get("type") or "back-bar",
                "order": s.get("order", i),
                "bottles": [],
            }
            for b in s.get("bottles", []):
                bottle: dict[str, Any] = {
                    "id": b.get("id") or _uid("bot-"),
                    "name": (b.get("name") or "Unknown").strip(),
                    "category": b.get("category") or "spirits",
                    "size": b.get("size") or "750ml",
                    "par_level": float(b.get("par_level", 1.0)),
                    "current_level": float(b.get("current_level", 1.0)),
                    "cost": float(b.get("cost", 0.0)),
                }
                if b.get("raw_heard"):
                    bottle["raw_heard"] = str(b.get("raw_heard", "")).strip()
                if "size_verified" in b:
                    bottle["size_verified"] = bool(b.get("size_verified"))
                station["bottles"].append(bottle)
            stations.append(station)
        bar["stations"] = stations
    review_status = body.get("walk_review_status", "")
    if review_status in ("pending", "complete", "skipped", "imported"):
        setup = _bar_setup_state(bar)
        setup["walk_review_status"] = review_status
        bar["setup"] = setup
    bar = _save_bar(bar)
    return jsonify({"status": "saved", "bar": bar})


@app.route("/api/bar/reset-templates", methods=["POST"])
def api_reset_bar_templates():
    """Restore starter station templates (wells → back bar → coolers)."""
    bar = _reset_bar_templates(_load_bar())
    return jsonify({"status": "reset", "bar": bar, "templates": [s["name"] for s in DEFAULT_STATIONS]})


# ── Multiple bars ─────────────────────────────────────────────────────────────

@app.route("/api/bars", methods=["GET"])
def api_list_bars():
    registry = _load_bars_registry()
    cfg = _load_config()
    return jsonify(
        {
            "active_bar_id": cfg.get("active_bar_id", ""),
            "setup_bar_id": cfg.get("setup_bar_id", ""),
            "bars": [_bar_public_summary(b) for b in registry.get("bars", [])],
        }
    )


@app.route("/api/bars", methods=["POST"])
def api_create_bar():
    """Create a new bar and optionally start its setup flow."""
    body = request.get_json(force=True) or {}
    name = (body.get("name") or "").strip()
    start_setup = body.get("start_setup", True)

    registry = _load_bars_registry()
    bar = _empty_bar_record(name)
    bar["created_at"] = _now()
    bar["updated_at"] = bar["created_at"]
    registry["bars"].append(bar)
    _save_bars_registry(registry)

    patch: dict[str, Any] = {"active_bar_id": bar["id"]}
    if start_setup:
        patch["setup_bar_id"] = bar["id"]
        cfg = _load_config()
        if cfg.get("phase") == "butterfly":
            patch["phase"] = "build_bar" if name else "name_bar"
        elif not name:
            patch["phase"] = "name_bar"
    if name:
        patch["bar_name"] = name
    _save_config(patch)

    return jsonify({"status": "created", "bar": _bar_public_summary(bar), "phase": patch.get("phase", _load_config().get("phase"))}), 201


@app.route("/api/bars/switch", methods=["POST"])
def api_switch_bar():
    body = request.get_json(force=True) or {}
    bar_id = (body.get("bar_id") or "").strip()
    registry = _load_bars_registry()
    _, bar = _find_bar(registry, bar_id)
    if bar is None:
        return jsonify({"error": "bar not found"}), 404

    _save_config({"active_bar_id": bar_id, "bar_name": bar.get("name", "")})
    return jsonify({"status": "ok", "bar": _bar_public_summary(bar)})


@app.route("/api/bars/setup", methods=["POST"])
def api_start_bar_setup():
    """Resume or start caterpillar setup for a specific bar."""
    body = request.get_json(force=True) or {}
    bar_id = (body.get("bar_id") or "").strip()
    registry = _load_bars_registry()
    _, bar = _find_bar(registry, bar_id)
    if bar is None:
        return jsonify({"error": "bar not found"}), 404

    phase = _infer_bar_setup_phase(bar)
    if phase == "butterfly":
        phase = "build_bar"

    _save_config(
        {
            "setup_bar_id": bar_id,
            "active_bar_id": bar_id,
            "bar_name": bar.get("name", ""),
            "phase": phase,
            "map_approved": bool(_bar_setup_state(bar).get("map_approved")),
            "first_count_complete": False,
        }
    )
    return jsonify({"status": "ok", "bar": _bar_public_summary(bar), "phase": phase})


@app.route("/api/bars/<bar_id>", methods=["DELETE"])
def api_delete_bar(bar_id: str):
    """Remove a bar and its map. If it was the last bar, a fresh one is created."""
    registry = _load_bars_registry()
    idx, bar = _find_bar(registry, bar_id)
    if bar is None:
        return jsonify({"error": "bar not found"}), 404

    deleted_name = bar.get("name", "")
    registry["bars"].pop(idx)
    cfg = _load_config()
    patch: dict[str, Any] = {}

    if not registry["bars"]:
        fresh = _empty_bar_record("")
        fresh["created_at"] = _now()
        fresh["updated_at"] = fresh["created_at"]
        fresh["stations"] = _stations_from_templates()
        registry["bars"] = [fresh]
        patch = {
            "active_bar_id": fresh["id"],
            "setup_bar_id": fresh["id"],
            "bar_name": "",
            "map_approved": False,
        }
        if cfg.get("phase") != "butterfly":
            patch["phase"] = "build_bar"
    else:
        fallback = registry["bars"][0]
        if cfg.get("active_bar_id") == bar_id:
            patch["active_bar_id"] = fallback["id"]
            patch["bar_name"] = fallback.get("name", "")
        if cfg.get("setup_bar_id") == bar_id:
            patch["setup_bar_id"] = fallback["id"]
            if "bar_name" not in patch:
                patch["bar_name"] = fallback.get("name", "")

    _save_bars_registry(registry)
    if patch:
        _save_config(patch)

    return jsonify(
        {
            "status": "deleted",
            "deleted_id": bar_id,
            "deleted_name": deleted_name,
            "replaced_with_fresh": len(registry["bars"]) == 1 and not deleted_name,
            "active_bar_id": _load_config().get("active_bar_id"),
            "bars": [_bar_public_summary(b) for b in registry["bars"]],
        }
    )


@app.route("/api/bars/select-setup", methods=["POST"])
def api_select_setup_bar():
    """Pick which bar to configure during name_bar (switch without leaving setup)."""
    body = request.get_json(force=True) or {}
    bar_id = (body.get("bar_id") or "").strip()
    registry = _load_bars_registry()
    _, bar = _find_bar(registry, bar_id)
    if bar is None:
        return jsonify({"error": "bar not found"}), 404

    _save_config(
        {
            "setup_bar_id": bar_id,
            "active_bar_id": bar_id,
            "bar_name": bar.get("name", ""),
            "map_approved": bool(_bar_setup_state(bar).get("map_approved")),
        }
    )
    return jsonify({"status": "ok", "bar": bar})


# ── Butterfly stubs ───────────────────────────────────────────────────────────

@app.route("/api/metrics", methods=["GET"])
def api_metrics():
    cfg = _load_config()
    window = request.args.get("window") or cfg.get("metrics_default_window", "current_cycle")
    custom_from = request.args.get("from", "")
    custom_to = request.args.get("to", "")
    return jsonify(_metrics_for_window(cfg, window, custom_from, custom_to))


@app.route("/api/in-house", methods=["GET"])
def api_in_house():
    category = request.args.get("category", "all")
    return jsonify(
        {
            "category": category,
            "last_reconciled_at": None,
            "items": [],
            "note": "In-house inventory populates after first reconciled cycle.",
        }
    )


@app.route("/api/cycles", methods=["GET"])
def api_cycles():
    return jsonify({"cycles": _load_state().get("cycles", [])})


if __name__ == "__main__":
    os.makedirs(_DATA, exist_ok=True)
    if not os.path.exists(_CONFIG_FILE):
        _write_json(_CONFIG_FILE, DEFAULT_CONFIG)
        print(f"[init] created {_CONFIG_FILE}")

    print("\n  Open Source Barware — Chrome Program")
    print("  " + "─" * 54)
    print(f"  Version:    {VERSION}")
    print(f"  Setup:      http://localhost:{PORT}/")
    print(f"  Home base:  http://localhost:{PORT}/home  (after butterfly)")
    print(f"  API state:  http://localhost:{PORT}/api/state")
    print(f"  Data dir:   {_DATA}")
    print("  " + "─" * 54 + "\n")

    cert = os.path.join(_DIR, "localhost+1.pem")
    key = os.path.join(_DIR, "localhost+1-key.pem")
    ssl_ctx = (cert, key) if os.path.exists(cert) and os.path.exists(key) else None

    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True, ssl_context=ssl_ctx)