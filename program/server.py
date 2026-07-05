"""
Open Source Barware — Chrome Program Server
Local Flask app (OVLP POP delivery model).

Caterpillar: welcome → name_bar → voice_walk → reconcile → build_bar → map_review → first_count
Butterfly:   home base admin panel (metrics, spreadsheets, in-house inventory)
"""

from __future__ import annotations

import csv
import io
import json
import math
import os
import re
import urllib.error

import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from typing import Any

from flask import Flask, Response, jsonify, redirect, request, send_from_directory

VERSION = "0.3.0-butterfly-2026-07-04"
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
_POS_DIR = os.path.join(_DATA, "pos")
_SECRETS_FILE = os.path.join(_DATA, "ai_secrets.json")

from invoice_parse import parse_invoice  # noqa: E402

PHASES = (
    "welcome",
    "name_bar",
    "voice_walk",
    "reconcile",
    "build_bar",
    "map_review",
    "first_count",
    "butterfly",
)

PHASE_LABELS = {
    "welcome": "Welcome",
    "name_bar": "Name",
    "voice_walk": "Walk",
    "build_bar": "Review bar",
    "reconcile": "Reconcile",
    "map_review": "Review",
    "first_count": "Count",
    "butterfly": "Home",
}

LEGACY_PHASE_MAP = {
    "ai_connect": "name_bar",
    "updates_signup": "name_bar",
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
    "branding": {
        "business_name": "",
        "business_address": "",
        "panel_title": "",
        "logo_data_url": "",
    },
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
            return "voice_walk"
        return mapped
    if phase not in PHASES:
        return "welcome"
    return phase


def _load_config() -> dict[str, Any]:
    cfg = _read_json(_CONFIG_FILE, {})
    merged = {**DEFAULT_CONFIG, **cfg}
    merged["cycle"] = {**DEFAULT_CONFIG["cycle"], **cfg.get("cycle", {})}
    merged["branding"] = {**DEFAULT_CONFIG["branding"], **cfg.get("branding", {})}
    normalized = _normalize_phase(merged.get("phase", "welcome"), merged)
    if normalized != merged.get("phase"):
        merged["phase"] = normalized
        _write_json(_CONFIG_FILE, merged)
    return merged


def _load_ai_secrets() -> dict[str, Any]:
    data = _read_json(_SECRETS_FILE, {})
    return data if isinstance(data, dict) else {}


def _save_ai_secrets(data: dict[str, Any]) -> None:
    _write_json(_SECRETS_FILE, data)
    try:
        os.chmod(_SECRETS_FILE, 0o600)
    except OSError:
        pass


def _ai_credentials(cfg: dict[str, Any]) -> tuple[str, str]:
    secrets = _load_ai_secrets()
    return secrets.get("api_key", ""), secrets.get("provider") or cfg.get("ai_provider") or "claude"


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
        "count_notes": [],
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
        if setup.get("stations_reviewed"):
            return "map_review"
        return "build_bar"
    if setup.get("voice_notes") or _bar_bottle_count(bar) > 0:
        return "reconcile"
    if bar.get("name") or _load_config().get("bar_name"):
        return "voice_walk"
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


def _bucket_category(category: str) -> str:
    c = (category or "spirits").lower().strip()
    if any(k in c for k in ("beer", "ipa", "lager", "ale")):
        return "beer"
    if "wine" in c or "champagne" in c or "prosecco" in c:
        return "wine"
    if "mixer" in c or c in ("soda", "juice", "tonic", "syrup"):
        return "mixers"
    return "liquor"


def _iter_bar_bottles(bar: dict[str, Any]):
    for station in bar.get("stations", []):
        for bottle in station.get("bottles", []):
            yield station, bottle


def _empty_category_totals() -> dict[str, Any]:
    return {
        "liquor": {"sku_count": 0, "on_hand_units": 0.0},
        "beer": {"sku_count": 0, "on_hand_units": 0.0},
        "wine": {"sku_count": 0, "on_hand_units": 0.0},
        "mixers": {"sku_count": 0, "on_hand_units": 0.0},
        "dry_goods": {"sku_count": 0, "on_hand_units": 0, "reserved": True},
    }


def _bar_inventory_stats(bar: dict[str, Any]) -> dict[str, Any]:
    below_par = 0
    flagged = 0
    total_units = 0.0
    categories = _empty_category_totals()
    for _station, bottle in _iter_bar_bottles(bar):
        level = float(bottle.get("current_level", 1.0))
        par = float(bottle.get("par_level", 1.0))
        total_units += level
        if level < par:
            below_par += 1
        if bottle.get("parse_flags"):
            flagged += 1
        bucket = _bucket_category(str(bottle.get("category", "spirits")))
        categories[bucket]["sku_count"] += 1
        categories[bucket]["on_hand_units"] = round(
            categories[bucket]["on_hand_units"] + level, 2
        )
    return {
        "stations": len(bar.get("stations", [])),
        "bottles": _bar_bottle_count(bar),
        "below_par": below_par,
        "flagged": flagged,
        "total_units": round(total_units, 2),
        "categories": categories,
    }


def _bar_snapshot(bar: dict[str, Any]) -> dict[str, Any]:
    stations: list[dict[str, Any]] = []
    for station in bar.get("stations", []):
        stations.append(
            {
                "id": station.get("id"),
                "name": station.get("name"),
                "type": station.get("type"),
                "bottles": [
                    {
                        "id": b.get("id"),
                        "name": b.get("name"),
                        "category": b.get("category"),
                        "size": b.get("size"),
                        "par_level": float(b.get("par_level", 1.0)),
                        "current_level": float(b.get("current_level", 1.0)),
                    }
                    for b in station.get("bottles", [])
                ],
            }
        )
    return {"stations": stations}


def _pos_log_file(bar_id: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_-]", "", bar_id or "default")
    return os.path.join(_POS_DIR, f"{safe}_pos.json")


def _load_pos_log(bar_id: str) -> dict[str, Any]:
    return _read_json(_pos_log_file(bar_id), {"bar_id": bar_id, "entries": []})


def _save_pos_log(bar_id: str, log: dict[str, Any]) -> dict[str, Any]:
    os.makedirs(_POS_DIR, exist_ok=True)
    log["bar_id"] = bar_id
    log["updated_at"] = _now()
    _write_json(_pos_log_file(bar_id), log)
    return log


def _close_cycle(bar: dict[str, Any], cfg: dict[str, Any]) -> dict[str, Any]:
    bounds = _cycle_bounds(cfg, offset=0)
    stats = _bar_inventory_stats(bar)
    state = _load_state()
    cycles = list(state.get("cycles", []))
    bar_id = bar.get("id", "")
    bar_cycles = [c for c in cycles if c.get("bar_id") == bar_id]
    cycle = {
        "id": _uid("cycle-"),
        "bar_id": bar_id,
        "bar_name": bar.get("name", ""),
        "cycle_number": len(bar_cycles) + 1,
        "period_start": bounds["period_start"],
        "period_end": bounds["period_end"],
        "completed_at": _now(),
        "summary": {
            "stations": stats["stations"],
            "bottles": stats["bottles"],
            "matched": stats["bottles"],
            "surprises": 0,
            "not_in_count": 0,
            "below_par": stats["below_par"],
            "flagged": stats["flagged"],
            "total_units": stats["total_units"],
        },
        "categories": stats["categories"],
        "snapshot": _bar_snapshot(bar),
    }
    cycles.append(cycle)
    _save_state({"cycles": cycles})
    return cycle


def _cycles_in_window(cycles: list[dict[str, Any]], bounds: dict[str, Any]) -> list[dict[str, Any]]:
    start = bounds.get("period_start", "")
    end = bounds.get("period_end", "")
    if not start or not end:
        return cycles
    matched: list[dict[str, Any]] = []
    for cycle in cycles:
        completed = (cycle.get("completed_at") or "")[:10]
        if start <= completed <= end:
            matched.append(cycle)
    return matched


def _in_house_items(bar: dict[str, Any], category: str = "all") -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for station, bottle in _iter_bar_bottles(bar):
        bucket = _bucket_category(str(bottle.get("category", "spirits")))
        if category not in ("all", "", bucket):
            continue
        level = float(bottle.get("current_level", 1.0))
        items.append(
            {
                "id": bottle.get("id"),
                "name": bottle.get("name"),
                "category": bucket,
                "raw_category": bottle.get("category", "spirits"),
                "size": bottle.get("size", "750ml"),
                "station_id": station.get("id"),
                "station_name": station.get("name"),
                "current_level": level,
                "par_level": float(bottle.get("par_level", 1.0)),
                "whole_bottles": math.ceil(level) if level > 0 else 0,
                "below_par": level < float(bottle.get("par_level", 1.0)),
            }
        )
    items.sort(key=lambda x: (x["category"], x["station_name"], x["name"]))
    return items


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
        "voice_walk": (current == "name_bar", "Continue from the previous step first."),
        "reconcile": (has_walk, "Walk the bar — paste voice notes or add bottles."),
        "build_bar": (
            bool(setup.get("draft_map")),
            "Run reconciliation before reviewing your bar layout.",
        ),
        "map_review": (
            bool(setup.get("draft_map")) and bool(setup.get("stations_reviewed")),
            "Review your station layout before approving the map.",
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
    """Live metrics from bar inventory + completed cycles."""
    state = _load_state()
    all_cycles = state.get("cycles", [])
    bar = _load_bar()
    bar_id = bar.get("id", "")
    bar_cycles = [c for c in all_cycles if c.get("bar_id") == bar_id]
    stats = _bar_inventory_stats(bar)
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

    window_cycles = _cycles_in_window(bar_cycles, bounds)
    last_cycle = bar_cycles[-1] if bar_cycles else None
    first_cycle = bar_cycles[0] if bar_cycles else None
    has_data = bool(bar_cycles) or stats["bottles"] > 0

    summary: dict[str, Any] = {
        "usage_value": None,
        "purchase_value": None,
        "variance_value": None,
        "variance_pct": None,
        "items_below_par": stats["below_par"],
        "items_flagged": stats["flagged"],
        "bottle_count": stats["bottles"],
        "station_count": stats["stations"],
        "total_units": stats["total_units"],
        "pos_uploads": len(_load_pos_log(bar_id).get("entries", [])),
        "betterments": [],
        "sales_trend": "flat",
        "notes": (
            f"Baseline locked — {stats['bottles']} bottles across {stats['stations']} stations."
            if has_data
            else "Complete your first count to populate metrics."
        ),
    }

    if last_cycle:
        summary["last_cycle_number"] = last_cycle.get("cycle_number")
        summary["last_cycle_bottles"] = last_cycle.get("summary", {}).get("bottles")

    first_week: dict[str, Any] | None = None
    if first_cycle:
        first_week = {
            "cycle_number": first_cycle.get("cycle_number", 1),
            "completed_at": first_cycle.get("completed_at"),
            "period_start": first_cycle.get("period_start"),
            "period_end": first_cycle.get("period_end"),
            "summary": first_cycle.get("summary", {}),
            "categories": first_cycle.get("categories", {}),
        }

    return {
        "window": window,
        "bounds": bounds,
        "cycle_label": cfg.get("cycle", {}).get("label", "Inventory cycle"),
        "interval_days": interval,
        "cycles_in_window": len(window_cycles),
        "cycles_total": len(bar_cycles),
        "last_inventory_at": last_cycle["completed_at"] if last_cycle else None,
        "summary": summary,
        "categories": stats["categories"],
        "first_week": first_week,
    }


def _pours_per_bottle(size: str) -> int:
    s = (size or "").lower()
    if "1.75" in s or "1750" in s:
        return 39
    if "1l" in s or "1000" in s or "1 l" in s:
        return 22
    return 17


def _cycle_avg_level(cycle: dict[str, Any]) -> float:
    total = 0.0
    count = 0
    snap = cycle.get("snapshot") or {}
    for station in snap.get("stations", []):
        for bottle in station.get("bottles", []):
            total += float(bottle.get("current_level", 0.0))
            count += 1
    return round(total / count, 2) if count else 0.0


def _snapshot_level_map(cycle: dict[str, Any]) -> dict[str, float]:
    levels: dict[str, float] = {}
    snap = cycle.get("snapshot") or {}
    for station in snap.get("stations", []):
        for bottle in station.get("bottles", []):
            bid = bottle.get("id")
            if bid:
                levels[bid] = float(bottle.get("current_level", 0.0))
    return levels


def _analytics_payload(cfg: dict[str, Any], bar: dict[str, Any]) -> dict[str, Any]:
    """Program Health analytics — mirrors Dojo /inventory/analytics."""
    state = _load_state()
    bar_id = bar.get("id", "")
    cycles = [c for c in state.get("cycles", []) if c.get("bar_id") == bar_id]

    category_values: dict[str, float] = {}
    category_counts: dict[str, int] = {}
    variance_alerts: list[dict[str, Any]] = []
    product_rows: list[dict[str, Any]] = []
    total_value = 0.0
    cost_weighted = 0.0
    cost_items = 0

    for station, bottle in _iter_bar_bottles(bar):
        cost = float(bottle.get("cost", 0.0))
        level = float(bottle.get("current_level", 1.0))
        par = float(bottle.get("par_level", 1.0))
        bucket = _bucket_category(str(bottle.get("category", "spirits")))
        line_value = cost * level
        total_value += line_value
        category_values[bucket] = round(category_values.get(bucket, 0.0) + line_value, 2)
        category_counts[bucket] = category_counts.get(bucket, 0) + 1

        if level < par:
            variance_alerts.append(
                {
                    "id": bottle.get("id"),
                    "name": bottle.get("name"),
                    "category": bucket,
                    "current": level,
                    "par": par,
                    "deficit": round(par - level, 2),
                }
            )

        pours = _pours_per_bottle(str(bottle.get("size", "750ml")))
        pour_cost = cost / pours if pours and cost else 0.0
        avg_drink = 12.0
        cost_pct_item = (pour_cost / avg_drink) * 100 if avg_drink and pour_cost else 0.0
        if cost > 0:
            cost_weighted += cost_pct_item
            cost_items += 1

        product_rows.append(
            {
                "id": bottle.get("id"),
                "station_id": station.get("id"),
                "name": bottle.get("name"),
                "category": bucket,
                "station": station.get("name"),
                "size": bottle.get("size", "750ml"),
                "cost": cost,
                "pour_cost": round(pour_cost, 2),
                "cost_pct": round(cost_pct_item, 1),
                "current_level": level,
                "par_level": par,
            }
        )

    variance_alerts.sort(key=lambda x: x["deficit"], reverse=True)

    if cost_items:
        beverage_cost_pct = round(cost_weighted / cost_items, 1)
    elif total_value > 0:
        beverage_cost_pct = round((total_value / (total_value * 4)) * 100, 1)
    else:
        beverage_cost_pct = 0.0

    trend_data = []
    for cycle in list(reversed(cycles[-12:])):
        completed = cycle.get("completed_at") or ""
        try:
            label = datetime.fromisoformat(completed.replace("Z", "+00:00")).strftime("%b %d")
        except ValueError:
            label = completed[:10]
        trend_data.append(
            {
                "date": label,
                "items": cycle.get("summary", {}).get("bottles", 0),
                "avg_level": _cycle_avg_level(cycle),
            }
        )

    velocity: list[dict[str, Any]] = []
    if len(cycles) >= 2:
        latest = cycles[-1]
        previous = cycles[-2]
        prev_map = _snapshot_level_map(previous)
        name_map: dict[str, str] = {}
        for station in (latest.get("snapshot") or {}).get("stations", []):
            for bottle in station.get("bottles", []):
                if bottle.get("id"):
                    name_map[bottle["id"]] = bottle.get("name", "")
        for bid, level in _snapshot_level_map(latest).items():
            if bid not in prev_map:
                continue
            change = round(level - prev_map[bid], 2)
            if change == 0:
                continue
            velocity.append(
                {
                    "id": bid,
                    "name": name_map.get(bid, bid),
                    "change": change,
                    "direction": "up" if change > 0 else "down",
                }
            )
        velocity.sort(key=lambda x: abs(x["change"]), reverse=True)
        velocity = velocity[:10]

    week_over_week: list[dict[str, Any]] = []
    if len(cycles) >= 2:
        latest = cycles[-1]
        previous = cycles[-2]
        prev_map = _snapshot_level_map(previous)
        latest_map = _snapshot_level_map(latest)
        name_station: dict[str, dict[str, str]] = {}
        for station in (latest.get("snapshot") or {}).get("stations", []):
            st_name = station.get("name", "")
            for bottle in station.get("bottles", []):
                bid = bottle.get("id")
                if bid:
                    name_station[bid] = {
                        "name": bottle.get("name", ""),
                        "station": st_name,
                    }
        for bid, current in latest_map.items():
            if bid not in prev_map:
                continue
            previous_level = prev_map[bid]
            change = round(current - previous_level, 2)
            meta = name_station.get(bid, {})
            week_over_week.append(
                {
                    "id": bid,
                    "name": meta.get("name", bid),
                    "station": meta.get("station", ""),
                    "previous_level": previous_level,
                    "current_level": current,
                    "change": change,
                    "direction": "up" if change > 0 else "down" if change < 0 else "flat",
                }
            )
        week_over_week.sort(key=lambda x: abs(x["change"]), reverse=True)

    stats = _bar_inventory_stats(bar)
    return {
        "bar_name": bar.get("name", ""),
        "bottle_count": stats["bottles"],
        "station_count": stats["stations"],
        "total_value": round(total_value, 2),
        "beverage_cost_pct": beverage_cost_pct,
        "category_values": [
            {"name": k, "value": v}
            for k, v in sorted(category_values.items(), key=lambda x: x[1], reverse=True)
        ],
        "category_distribution": [
            {"name": k, "value": v}
            for k, v in sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
        ],
        "variance_alerts": variance_alerts,
        "trend_data": trend_data,
        "velocity": velocity,
        "week_over_week": week_over_week,
        "product_rows": sorted(product_rows, key=lambda r: (r["category"], r["name"])),
        "cycles_total": len(cycles),
        "cycle_label": cfg.get("cycle", {}).get("label", "Inventory cycle"),
        "last_count_at": cycles[-1].get("completed_at") if cycles else None,
        "below_par": stats["below_par"],
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


@app.route("/downloads/<path:filename>")
def program_downloads(filename: str):
    return send_from_directory(os.path.join(_STATIC, "downloads"), filename, as_attachment=True)


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
    raw_setup_id = cfg.get("setup_bar_id") or ""
    # Butterfly: never substitute active_bar_id — initHome treats any setup_bar_id as "still in setup"
    setup_id = raw_setup_id if phase == "butterfly" else (raw_setup_id or active_id)

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
                "branding": cfg.get("branding", DEFAULT_CONFIG["branding"]),
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
                "count_notes_count": len(setup.get("count_notes", [])),
                "count_notes_text": "\n\n".join(
                    n.get("text", "") for n in setup.get("count_notes", []) if n.get("text")
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
    cycle_closed: dict[str, Any] | None = None
    allowed = {
        "bar_name",
        "ai_provider",
        "api_connection_status",
        "map_approved",
        "first_count_complete",
        "metrics_default_window",
        "cycle",
        "branding",
    }
    patch = {k: body[k] for k in allowed if k in body}
    if "branding" in patch and isinstance(patch["branding"], dict):
        current = _load_config().get("branding", DEFAULT_CONFIG["branding"])
        branding = {**current, **patch["branding"]}
        logo = branding.get("logo_data_url") or ""
        if logo and len(logo) > 180_000:
            return jsonify({"error": "Logo image too large — use a smaller file (under ~120KB)."}), 400
        for key in ("business_name", "business_address", "panel_title"):
            if key in branding and branding[key] is not None:
                branding[key] = str(branding[key]).strip()[:200]
        patch["branding"] = branding
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
        cfg_now = _load_config()
        state = _load_state()
        existing = [
            c for c in state.get("cycles", []) if c.get("bar_id") == bar.get("id")
        ]
        if not existing:
            cycle_closed = _close_cycle(bar, cfg_now)
        patch["first_count_complete"] = True
        patch["setup_bar_id"] = ""
        patch["phase"] = "butterfly"
    if body.get("ai_api_key"):
        key = str(body["ai_api_key"]).strip()
        provider = str(body.get("ai_provider") or _load_config().get("ai_provider") or "claude").strip()
        _save_ai_secrets({"api_key": key, "provider": provider})
        patch["ai_api_key_set"] = True
        patch["api_connection_status"] = "connected"
        if provider:
            patch["ai_provider"] = provider
    if body.get("clear_api_key"):
        _save_ai_secrets({})
        patch["ai_api_key_set"] = False
        patch["api_connection_status"] = "needs-key"
    cfg = _save_config(patch)
    public = {k: cfg.get(k) for k in allowed if k in cfg}
    public["branding"] = cfg.get("branding", DEFAULT_CONFIG["branding"])
    public["ai_api_key_set"] = cfg.get("ai_api_key_set")
    public["api_connection_status"] = cfg.get("api_connection_status")
    resp: dict[str, Any] = {"status": "saved", "config": public}
    if cycle_closed:
        resp["cycle"] = cycle_closed
    return jsonify(resp)


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


@app.route("/api/hard-reset", methods=["POST"])
def api_hard_reset():
    """Full wipe back to updates signup (first setup step). Archives current data first."""
    import shutil

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_dir = os.path.join(_DATA, "_backups", f"reset-{stamp}")
    try:
        os.makedirs(backup_dir, exist_ok=True)
        for src in (_CONFIG_FILE, _BARS_FILE, _BAR_FILE, _STATE_FILE):
            if os.path.exists(src):
                shutil.copy2(src, os.path.join(backup_dir, os.path.basename(src)))
    except OSError:
        backup_dir = ""

    for f in (_BARS_FILE, _BAR_FILE, _STATE_FILE):
        try:
            if os.path.exists(f):
                os.remove(f)
        except OSError:
            pass

    reset_cfg = {**DEFAULT_CONFIG, "phase": "welcome"}
    _write_json(_CONFIG_FILE, reset_cfg)
    return jsonify({"status": "reset", "phase": "welcome", "backup": backup_dir})


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
            "message": "Optional AI skipped. The full program runs without it. Add a key anytime under Settings → Optional AI for invoice photos.",
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


@app.route("/api/setup/count-notes", methods=["POST"])
def api_count_notes():
    body = request.get_json(force=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text required"}), 400
    bar = _load_bar()
    existing = _bar_setup_state(bar).get("count_notes", [])
    note_id = existing[0]["id"] if existing else _uid("note-")
    notes = [{"id": note_id, "text": text, "uploaded_at": _now()}]
    _save_bar_setup(bar["id"], {"count_notes": notes})
    return jsonify({"status": "saved", "count": 1})


@app.route("/api/cycle/begin-next-count", methods=["POST"])
def api_begin_next_count():
    """Open Count step for the next inventory cycle — map and PARs unchanged."""
    cfg = _load_config()
    bar = _load_bar()
    bar_id = bar.get("id", "")
    setup = _bar_setup_state(bar)
    if not setup.get("map_approved"):
        return jsonify({"error": "Approve your inventory map before starting a count."}), 400
    if _bar_bottle_count(bar) < 1:
        return jsonify({"error": "No bottles on map — complete your walk first."}), 400

    _save_bar_setup(bar_id, {"count_notes": []})
    _save_config(
        {
            "setup_bar_id": bar_id,
            "active_bar_id": bar_id,
            "phase": "first_count",
        }
    )
    state = _load_state()
    cycles_done = len([c for c in state.get("cycles", []) if c.get("bar_id") == bar_id])
    return jsonify(
        {
            "status": "ok",
            "phase": "first_count",
            "phase_label": PHASE_LABELS["first_count"],
            "next_cycle_number": cycles_done + 1,
            "bar_id": bar_id,
        }
    )


@app.route("/api/count/process-cycle", methods=["POST"])
def api_process_inventory_cycle():
    """Close inventory cycle after count — populates metrics, analytics, spreadsheets, week-over-week."""
    bar = _load_bar()
    if _bar_bottle_count(bar) < 1:
        return jsonify({"error": "No bottles on map — complete your walk first."}), 400

    cfg = _load_config()
    bar_id = bar.get("id", "")
    state = _load_state()
    bar_cycles_before = [c for c in state.get("cycles", []) if c.get("bar_id") == bar_id]

    cycle = _close_cycle(bar, cfg)
    setup_patch: dict[str, Any] = {"last_count_at": _now(), "first_count_complete": True}
    _save_bar_setup(bar_id, setup_patch)

    cfg_patch: dict[str, Any] = {
        "first_count_complete": True,
        "setup_bar_id": "",
        "phase": "butterfly",
    }
    _save_config(cfg_patch)

    cfg = _load_config()
    analytics = _analytics_payload(cfg, bar)
    metrics = _metrics_for_window(cfg, cfg.get("metrics_default_window", "current_cycle"))
    in_house = _in_house_items(bar, "all")

    return jsonify(
        {
            "status": "processed",
            "cycle": cycle,
            "cycle_number": cycle.get("cycle_number"),
            "cycles_total": len([c for c in _load_state().get("cycles", []) if c.get("bar_id") == bar_id]),
            "is_first_cycle": len(bar_cycles_before) == 0,
            "analytics": analytics,
            "metrics": metrics,
            "in_house_count": len(in_house),
            "velocity": analytics.get("velocity", []),
            "week_over_week": analytics.get("week_over_week", []),
        }
    )


def _reconcile_bar(bar: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Turn walked bar data into an auditable draft map + summary."""
    flagged = 0
    unverified = 0
    duplicates_removed = 0
    seen: set[tuple[str, str, str]] = set()
    empty_stations: list[str] = []
    locations: list[dict[str, Any]] = []

    for station in sorted(bar.get("stations", []), key=lambda s: s.get("order", 0)):
        station_name = station.get("name", "")
        clean_bottles: list[dict[str, Any]] = []
        for raw in station.get("bottles", []):
            name = (raw.get("name") or "").strip()
            size = (raw.get("size") or "750ml").strip() or "750ml"
            if not name:
                flagged += 1
                continue
            key = (station.get("id", ""), name.lower(), size.lower())
            if key in seen:
                duplicates_removed += 1
                continue
            seen.add(key)
            parse_flags = list(raw.get("parse_flags") or [])
            if not raw.get("size_verified"):
                unverified += 1
            if parse_flags:
                flagged += 1
            clean_bottles.append(
                {
                    "id": raw.get("id"),
                    "name": name,
                    "category": raw.get("category") or "spirits",
                    "size": size,
                    "size_verified": bool(raw.get("size_verified")),
                    "par_level": raw.get("par_level", 1.0),
                    "parse_flags": parse_flags,
                    "raw_heard": raw.get("raw_heard") or name,
                }
            )
        locations.append(
            {
                "id": station.get("id"),
                "name": station_name,
                "type": station.get("type"),
                "bottles": clean_bottles,
            }
        )
        if not clean_bottles:
            empty_stations.append(station_name)

    bottle_count = sum(len(loc.get("bottles", [])) for loc in locations)
    draft = {
        "id": _uid("map-"),
        "created_at": _now(),
        "status": "draft",
        "locations": locations,
        "blank_slots": [{"station": name, "reason": "no bottles assigned"} for name in empty_stations],
        "flags": [],
        "summary": {
            "stations": len(locations),
            "stations_with_bottles": len(locations) - len(empty_stations),
            "bottles": bottle_count,
            "flagged": flagged,
            "unverified": unverified,
            "duplicates_removed": duplicates_removed,
            "empty_stations": len(empty_stations),
        },
    }
    return draft, draft["summary"]


@app.route("/api/setup/reconcile", methods=["POST"])
def api_reconcile():
    """Build draft map from bar data; AI reconciliation wires in later."""
    bar = _load_bar()
    setup = _bar_setup_state(bar)
    if not setup.get("voice_notes") and _bar_bottle_count(bar) == 0:
        return jsonify({"error": "Walk the bar first — paste notes or add bottles."}), 400
    draft, summary = _reconcile_bar(bar)
    cfg = _load_config()
    if not cfg.get("ai_api_key_set") and cfg.get("api_connection_status") != "connected":
        draft["flags"].append(
            "Optional AI off — map built locally from your walk. Add a key in Settings only if you want invoice photos read."
        )
    _save_bar_setup(bar["id"], {"draft_map": draft})
    return jsonify(
        {
            "status": "draft_ready",
            "draft_map": draft,
            "summary": summary,
            "bottle_count": summary["bottles"],
        }
    )


_AUDIT_HEADERS = [
    "station", "product_name", "category", "size", "size_verified",
    "par_level", "flags", "what_we_heard", "bottle_id",
]

_WALK_SHEET_HEADERS = [
    "station", "product_name", "size", "level", "notes",
]

_WALK_BLANK_LINES_PER_STATION = 2
_WALK_ADD_ROWS_PER_STATION = 3


def _walk_sheet_rows(bar: dict[str, Any]) -> list[dict[str, str]]:
    """Clipboard-friendly walk sheet: bottles + blank handwriting lines + add rows per station."""
    rows: list[dict[str, str]] = []
    bar_name = (bar.get("name") or "Bar").strip()
    rows.append({
        "station": f"BAR: {bar_name}",
        "product_name": "",
        "size": "",
        "level": "",
        "notes": "Walk sheet — write levels in tenths; use blank rows for discoveries",
    })
    for station in sorted(bar.get("stations", []), key=lambda s: s.get("order", 0)):
        station_name = station.get("name", "")
        bottles = station.get("bottles", [])
        if not bottles:
            continue
        rows.append({
            "station": f"▸ {station_name}",
            "product_name": "",
            "size": "",
            "level": "",
            "notes": "",
        })
        for b in bottles:
            rows.append({
                "station": station_name,
                "product_name": b.get("name", ""),
                "size": b.get("size", "750ml"),
                "level": "",
                "notes": "",
            })
        for _ in range(_WALK_BLANK_LINES_PER_STATION):
            rows.append({
                "station": station_name,
                "product_name": "",
                "size": "",
                "level": "",
                "notes": "",
            })
        for i in range(_WALK_ADD_ROWS_PER_STATION):
            rows.append({
                "station": station_name,
                "product_name": f"Missed entry {i + 1} — speak or write:",
                "size": "",
                "level": "",
                "notes": "",
            })
    return rows


def _bottle_audit_rows(bar: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for station in sorted(bar.get("stations", []), key=lambda s: s.get("order", 0)):
        for b in station.get("bottles", []):
            rows.append({
                "station": station.get("name", ""),
                "product_name": b.get("name", ""),
                "category": b.get("category", "spirits"),
                "size": b.get("size", "750ml"),
                "size_verified": "yes" if b.get("size_verified") else "no",
                "par_level": b.get("par_level", 1.0),
                "flags": "; ".join(b.get("parse_flags", []) or []),
                "what_we_heard": b.get("raw_heard", b.get("name", "")),
                "bottle_id": b.get("id", ""),
            })
    return rows


def _export_audit_xml(bar: dict[str, Any]) -> str:
    """Structured bottle audit — stations nested with bottles for scripts / ETL."""
    root = ET.Element("inventory_audit")
    meta = ET.SubElement(root, "meta")
    ET.SubElement(meta, "bar_name").text = (bar.get("name") or "").strip()
    ET.SubElement(meta, "exported_at").text = _now()
    ET.SubElement(meta, "bottle_count").text = str(_bar_bottle_count(bar))
    stations_el = ET.SubElement(root, "stations")
    for station in sorted(bar.get("stations", []), key=lambda s: s.get("order", 0)):
        st_el = ET.SubElement(stations_el, "station", id=station.get("id", ""))
        ET.SubElement(st_el, "name").text = station.get("name", "")
        ET.SubElement(st_el, "type").text = station.get("type", "back-bar")
        bottles_el = ET.SubElement(st_el, "bottles")
        for b in station.get("bottles", []):
            bot = ET.SubElement(bottles_el, "bottle", id=b.get("id", ""))
            ET.SubElement(bot, "product_name").text = b.get("name", "")
            ET.SubElement(bot, "category").text = b.get("category", "spirits")
            ET.SubElement(bot, "size").text = b.get("size", "750ml")
            ET.SubElement(bot, "size_verified").text = "true" if b.get("size_verified") else "false"
            ET.SubElement(bot, "par_level").text = str(b.get("par_level", 1.0))
            flags_el = ET.SubElement(bot, "flags")
            for flag in b.get("parse_flags", []) or []:
                ET.SubElement(flags_el, "flag").text = str(flag)
            ET.SubElement(bot, "what_we_heard").text = b.get("raw_heard", b.get("name", ""))
    ET.indent(root, space="  ")
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding="unicode")


def _export_xlsx(rows: list[dict[str, Any]], headers: list[str], sheet_title: str) -> Response:
    from openpyxl import Workbook
    from openpyxl.styles import Font

    wb = Workbook()
    ws = wb.active
    ws.title = sheet_title[:31]
    ws.append([h.replace("_", " ").title() for h in headers])
    for cell in ws[1]:
        cell.font = Font(bold=True)
    for r in rows:
        ws.append([r.get(h, "") for h in headers])
    for i, h in enumerate(headers, start=1):
        width = 16
        if rows:
            longest = max(len(str(r.get(h, ""))) + 2 for r in rows)
            width = min(40, max(12, len(h) + 2, longest))
        col = chr(64 + i) if i <= 26 else "A"
        ws.column_dimensions[col].width = width
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return Response(
        buf.read(),
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


_COUNT_COMPARISON_HEADERS = [
    "station", "status", "map_product", "map_size", "map_par_level",
    "count_heard", "count_level", "action_required",
]


def _export_count_comparison_xml(
    bar_name: str, summary: str, rows: list[dict[str, Any]]
) -> str:
    root = ET.Element("count_comparison")
    meta = ET.SubElement(root, "meta")
    ET.SubElement(meta, "bar_name").text = bar_name
    ET.SubElement(meta, "exported_at").text = _now()
    ET.SubElement(meta, "summary").text = summary
    ET.SubElement(meta, "row_count").text = str(len(rows))
    ET.SubElement(meta, "legend").text = (
        "map_* = walk/setup (first input); count_* = live count (second input)"
    )
    lines_el = ET.SubElement(root, "lines")
    for row in rows:
        line = ET.SubElement(lines_el, "line")
        for key in _COUNT_COMPARISON_HEADERS:
            ET.SubElement(line, key).text = str(row.get(key, ""))
    ET.indent(root, space="  ")
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding="unicode")


@app.route("/api/export/count-comparison", methods=["POST"])
def api_export_count_comparison():
    """Map vs count line-by-line comparison — CSV, XLSX, or XML."""
    body = request.get_json(force=True) or {}
    fmt = (body.get("format") or "csv").lower()
    bar_name = (body.get("bar_name") or _load_bar().get("name") or "bar").strip()
    summary = (body.get("summary") or "").strip()
    rows = body.get("rows") or []
    if not isinstance(rows, list):
        return jsonify({"error": "rows must be an array"}), 400
    safe = re.sub(r"[^\w\-]+", "_", bar_name).strip("_") or "bar"

    if fmt == "xml":
        body_xml = _export_count_comparison_xml(bar_name, summary, rows)
        return Response(
            body_xml,
            mimetype="application/xml",
            headers={"Content-Disposition": f"attachment; filename={safe}_count_comparison.xml"},
        )

    if fmt in ("xlsx", "xls", "excel"):
        try:
            resp = _export_xlsx(rows, _COUNT_COMPARISON_HEADERS, "Map vs Count")
            resp.headers["Content-Disposition"] = f"attachment; filename={safe}_count_comparison.xlsx"
            return resp
        except ImportError:
            return jsonify({"error": "xlsx export requires openpyxl — run pip install openpyxl"}), 503

    sbuf = io.StringIO()
    writer = csv.writer(sbuf)
    if summary:
        writer.writerow(["# bar", bar_name])
        writer.writerow(["# summary", summary])
        writer.writerow(["# exported_at", _now()])
        writer.writerow([])
    writer.writerow(_COUNT_COMPARISON_HEADERS)
    for r in rows:
        writer.writerow([r.get(h, "") for h in _COUNT_COMPARISON_HEADERS])
    return Response(
        "﻿" + sbuf.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={safe}_count_comparison.csv"},
    )


@app.route("/api/export/bottles", methods=["GET"])
def api_export_bottles():
    """Full bottle-audit or clipboard walk sheet — CSV, XLSX, or XML."""
    fmt = request.args.get("format", "csv").lower()
    bar = _load_bar()
    safe = re.sub(r"[^\w\-]+", "_", bar.get("name") or "bar").strip("_") or "bar"

    if fmt == "xml":
        body = _export_audit_xml(bar)
        return Response(
            body,
            mimetype="application/xml",
            headers={"Content-Disposition": f"attachment; filename={safe}_bottle_audit.xml"},
        )

    if fmt in ("walk_csv", "walk_sheet_csv", "walk"):
        rows = _walk_sheet_rows(bar)
        sbuf = io.StringIO()
        writer = csv.writer(sbuf)
        writer.writerow(_WALK_SHEET_HEADERS)
        for r in rows:
            writer.writerow([r[h] for h in _WALK_SHEET_HEADERS])
        return Response(
            "﻿" + sbuf.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment; filename={safe}_walk_sheet.csv"},
        )

    if fmt in ("walk_xlsx", "walk_sheet_xlsx", "walk_excel"):
        rows = _walk_sheet_rows(bar)
        try:
            resp = _export_xlsx(rows, _WALK_SHEET_HEADERS, "Walk Sheet")
            resp.headers["Content-Disposition"] = f"attachment; filename={safe}_walk_sheet.xlsx"
            return resp
        except ImportError:
            return jsonify({"error": "xlsx export requires openpyxl — run pip install openpyxl"}), 503

    rows = _bottle_audit_rows(bar)

    if fmt in ("xlsx", "xls", "excel"):
        try:
            resp = _export_xlsx(rows, _AUDIT_HEADERS, "Bottle Audit")
            resp.headers["Content-Disposition"] = f"attachment; filename={safe}_bottle_audit.xlsx"
            return resp
        except ImportError:
            return jsonify({"error": "xlsx export requires openpyxl — run pip install openpyxl"}), 503

    sbuf = io.StringIO()
    writer = csv.writer(sbuf)
    writer.writerow(_AUDIT_HEADERS)
    for r in rows:
        writer.writerow([r[h] for h in _AUDIT_HEADERS])
    return Response(
        "﻿" + sbuf.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={safe}_bottle_audit.csv"},
    )


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
                flags = b.get("parse_flags")
                if isinstance(flags, list) and flags:
                    bottle["parse_flags"] = [str(f).strip() for f in flags if str(f).strip()]
                station["bottles"].append(bottle)
            stations.append(station)
        bar["stations"] = stations
    setup = _bar_setup_state(bar)
    review_status = body.get("walk_review_status", "")
    if review_status in ("pending", "complete", "skipped", "imported"):
        setup["walk_review_status"] = review_status
    if body.get("stations_reviewed") is True:
        setup["stations_reviewed"] = True
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
            patch["phase"] = "voice_walk" if name else "name_bar"
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
        phase = "voice_walk"

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
        fresh["stations"] = []
        registry["bars"] = [fresh]
        patch = {
            "active_bar_id": fresh["id"],
            "setup_bar_id": fresh["id"],
            "bar_name": "",
            "map_approved": False,
        }
        if cfg.get("phase") != "butterfly":
            patch["phase"] = "voice_walk"
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


# ── Butterfly (home base) ─────────────────────────────────────────────────────

@app.route("/api/metrics", methods=["GET"])
def api_metrics():
    cfg = _load_config()
    window = request.args.get("window") or cfg.get("metrics_default_window", "current_cycle")
    custom_from = request.args.get("from", "")
    custom_to = request.args.get("to", "")
    return jsonify(_metrics_for_window(cfg, window, custom_from, custom_to))


@app.route("/api/analytics", methods=["GET"])
def api_analytics():
    cfg = _load_config()
    bar = _load_bar()
    return jsonify(_analytics_payload(cfg, bar))


@app.route("/api/in-house", methods=["GET"])
def api_in_house():
    category = request.args.get("category", "all")
    bar = _load_bar()
    state = _load_state()
    bar_cycles = [c for c in state.get("cycles", []) if c.get("bar_id") == bar.get("id")]
    last_at = bar_cycles[-1]["completed_at"] if bar_cycles else None
    items = _in_house_items(bar, category)
    totals = _bar_inventory_stats(bar)
    return jsonify(
        {
            "category": category,
            "bar_id": bar.get("id"),
            "bar_name": bar.get("name", ""),
            "last_reconciled_at": last_at,
            "item_count": len(items),
            "totals": totals,
            "items": items,
            "note": (
                f"{len(items)} products on hand after last count."
                if items
                else "Complete your first count to populate in-house inventory."
            ),
        }
    )


@app.route("/api/cycles", methods=["GET"])
def api_cycles():
    cfg = _load_config()
    bar_id = request.args.get("bar_id") or cfg.get("active_bar_id", "")
    cycles = _load_state().get("cycles", [])
    if bar_id:
        cycles = [c for c in cycles if c.get("bar_id") == bar_id]
    return jsonify({"cycles": cycles, "bar_id": bar_id})


@app.route("/api/reports/first-week", methods=["GET"])
def api_reports_first_week():
    cfg = _load_config()
    bar_id = request.args.get("bar_id") or cfg.get("active_bar_id", "")
    cycles = [
        c for c in _load_state().get("cycles", []) if c.get("bar_id") == bar_id
    ]
    if not cycles:
        return jsonify({"error": "No completed cycle yet — finish your first count."}), 404
    first = cycles[0]
    bar = _load_bar(bar_id or None)
    return jsonify(
        {
            "report": "first-week",
            "bar_id": bar_id,
            "bar_name": bar.get("name", ""),
            "cycle": first,
            "generated_at": _now(),
        }
    )


@app.route("/api/pos/log", methods=["GET"])
def api_pos_log_list():
    cfg = _load_config()
    bar_id = cfg.get("active_bar_id") or _setup_bar_id(cfg)
    log = _load_pos_log(bar_id)
    return jsonify(log)


@app.route("/api/pos/log", methods=["POST"])
def api_pos_log_add():
    cfg = _load_config()
    bar_id = cfg.get("active_bar_id") or _setup_bar_id(cfg)
    body = request.get_json(silent=True) or {} if request.is_json else {}
    label = (request.form.get("label") or body.get("label") or "").strip()
    note = (request.form.get("note") or body.get("note") or "").strip()
    raw_type = (request.form.get("input_type") or body.get("input_type") or "pos").strip().lower()
    input_type = "invoice" if raw_type in ("invoice", "invoices", "vendor") else "pos"
    if request.is_json:
        text_body = (body.get("text") or "").strip()
        if text_body and not request.files:
            os.makedirs(os.path.join(_POS_DIR, "files"), exist_ok=True)
            fname = f"{_uid('pos-')}.txt"
            fpath = os.path.join(_POS_DIR, "files", fname)
            with open(fpath, "w", encoding="utf-8") as fh:
                fh.write(text_body)
            default_label = "Invoice drop" if input_type == "invoice" else "POS drop"
            entry = {
                "id": _uid("pos-"),
                "input_type": input_type,
                "label": label or default_label,
                "note": note,
                "filename": fname,
                "original_name": "paste.txt",
                "uploaded_at": _now(),
                "size_bytes": len(text_body.encode("utf-8")),
            }
            log = _load_pos_log(bar_id)
            log.setdefault("entries", []).insert(0, entry)
            _save_pos_log(bar_id, log)
            return jsonify({"status": "saved", "entry": entry})

    upload = request.files.get("file")
    if not upload or not upload.filename:
        return jsonify({"error": "POS file or pasted text required."}), 400
    if not label:
        label = upload.filename.rsplit(".", 1)[0] or ("Invoice drop" if input_type == "invoice" else "POS drop")

    os.makedirs(os.path.join(_POS_DIR, "files"), exist_ok=True)
    safe_ext = re.sub(r"[^a-zA-Z0-9.]", "", os.path.splitext(upload.filename)[1].lower())[:8]
    stored = f"{_uid('pos-')}{safe_ext}"
    fpath = os.path.join(_POS_DIR, "files", stored)
    upload.save(fpath)
    size = os.path.getsize(fpath)

    entry = {
        "id": _uid("pos-"),
        "input_type": input_type,
        "label": label,
        "note": note,
        "filename": stored,
        "original_name": upload.filename,
        "uploaded_at": _now(),
        "size_bytes": size,
    }
    log = _load_pos_log(bar_id)
    log.setdefault("entries", []).insert(0, entry)
    _save_pos_log(bar_id, log)
    return jsonify({"status": "saved", "entry": entry})


@app.route("/api/inputs/invoice/parse", methods=["POST"])
def api_parse_invoice():
    """Parse invoice from photo (AI vision) or pasted text (local + optional AI)."""
    cfg = _load_config()
    api_key, provider = _ai_credentials(cfg)

    upload = request.files.get("image") or request.files.get("file")
    if upload and upload.filename:
        raw = upload.read()
        if len(raw) > 8_000_000:
            return jsonify({"error": "Image too large — use a photo under 8MB."}), 400
        ext = os.path.splitext(upload.filename)[1].lower()
        media = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
            ".heic": "image/heic",
        }.get(ext, upload.mimetype or "image/jpeg")
        try:
            parsed = parse_invoice(
                image_bytes=raw, media_type=media, api_key=api_key, provider=provider
            )
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", errors="replace")[:400]
            return jsonify({"error": f"AI provider error ({e.code}): {detail}"}), 502
        except Exception as e:
            return jsonify({"error": f"Invoice parse failed: {e}"}), 500
        return jsonify({"status": "parsed", "invoice": parsed})

    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Upload an invoice photo or paste invoice text."}), 400
    prefer_ai = bool(body.get("use_ai")) and bool(api_key)
    try:
        parsed = parse_invoice(
            text=text, api_key=api_key, provider=provider, prefer_ai=prefer_ai
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")[:400]
        return jsonify({"error": f"AI provider error ({e.code}): {detail}"}), 502
    except Exception as e:
        return jsonify({"error": f"Invoice parse failed: {e}"}), 500
    return jsonify({"status": "parsed", "invoice": parsed})


@app.route("/api/inputs/invoice/save", methods=["POST"])
def api_save_parsed_invoice():
    """Save parsed invoice to input log with structured line items."""
    cfg = _load_config()
    bar_id = cfg.get("active_bar_id") or _setup_bar_id(cfg)
    body = request.get_json(force=True) or {}
    invoice = body.get("invoice") or {}
    label = (body.get("label") or invoice.get("vendor") or "Invoice drop").strip()
    note = (body.get("note") or "").strip()
    lines = invoice.get("lines") or []
    if not lines:
        return jsonify({"error": "No line items to save — parse the invoice first."}), 400

    os.makedirs(os.path.join(_POS_DIR, "files"), exist_ok=True)
    raw_text = invoice.get("raw_text") or json.dumps(invoice, indent=2)
    fname = f"{_uid('inv-')}.json"
    fpath = os.path.join(_POS_DIR, "files", fname)
    with open(fpath, "w", encoding="utf-8") as fh:
        json.dump(invoice, fh, indent=2)

    entry = {
        "id": _uid("pos-"),
        "input_type": "invoice",
        "label": label[:120],
        "note": note,
        "filename": fname,
        "original_name": "parsed-invoice.json",
        "uploaded_at": _now(),
        "size_bytes": len(raw_text.encode("utf-8")),
        "parsed_invoice": {
            "vendor": invoice.get("vendor", ""),
            "invoice_number": invoice.get("invoice_number", ""),
            "invoice_date": invoice.get("invoice_date", ""),
            "total": invoice.get("total", 0),
            "line_count": len(lines),
            "lines": lines,
            "parse_source": invoice.get("parse_source", "unknown"),
        },
    }
    log = _load_pos_log(bar_id)
    log.setdefault("entries", []).insert(0, entry)
    _save_pos_log(bar_id, log)
    return jsonify({"status": "saved", "entry": entry})


@app.route("/api/pos/log/<entry_id>", methods=["DELETE"])
def api_pos_log_delete(entry_id: str):
    cfg = _load_config()
    bar_id = cfg.get("active_bar_id") or _setup_bar_id(cfg)
    log = _load_pos_log(bar_id)
    entries = log.get("entries", [])
    kept: list[dict[str, Any]] = []
    removed = None
    for entry in entries:
        if entry.get("id") == entry_id:
            removed = entry
            fpath = os.path.join(_POS_DIR, "files", entry.get("filename", ""))
            try:
                if os.path.isfile(fpath):
                    os.remove(fpath)
            except OSError:
                pass
        else:
            kept.append(entry)
    if not removed:
        return jsonify({"error": "entry not found"}), 404
    log["entries"] = kept
    _save_pos_log(bar_id, log)
    return jsonify({"status": "deleted", "id": entry_id})


if __name__ == "__main__":
    os.makedirs(_DATA, exist_ok=True)
    if not os.path.exists(_CONFIG_FILE):
        _write_json(_CONFIG_FILE, DEFAULT_CONFIG)
        print(f"[init] created {_CONFIG_FILE}")

    print("\n  Open Source Barware — Chrome Program")
    print("  " + "-" * 54)
    print(f"  Version:    {VERSION}")
    print(f"  Setup:      http://localhost:{PORT}/")
    print(f"  Home base:  http://localhost:{PORT}/home  (after butterfly)")
    print(f"  API state:  http://localhost:{PORT}/api/state")
    print(f"  Data dir:   {_DATA}")
    print("  " + "-" * 54 + "\n")

    cert = os.path.join(_DIR, "localhost+1.pem")
    key = os.path.join(_DIR, "localhost+1-key.pem")
    ssl_ctx = (cert, key) if os.path.exists(cert) and os.path.exists(key) else None

    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True, ssl_context=ssl_ctx)