"""Invoice parsing — local text heuristics + optional AI vision (Claude/OpenAI)."""

from __future__ import annotations

import base64
import json
import re
import urllib.error
import urllib.request
from typing import Any

_INVOICE_JSON_PROMPT = """You are parsing a beverage distributor invoice for a bar inventory system.
Extract every product line item from the invoice image or text.
Return ONLY valid JSON (no markdown fences):
{"vendor":"","invoice_number":"","invoice_date":"","total":0.0,"lines":[{"product":"","size":"750ml","qty":1,"unit_cost":0.0,"extended":0.0}]}
Rules:
- product = brand + product name as on invoice
- size as printed (750ml, 1L, 1.75L, 12oz, case, etc.)
- qty = integer bottles/cases ordered
- unit_cost and extended as numbers without $ signs
- Use empty string for unknown text fields, 0 for unknown numbers"""


def _parse_money(val: str) -> float:
    try:
        return float(val.replace(",", "").replace("$", "").strip())
    except ValueError:
        return 0.0


def parse_invoice_text_local(text: str) -> dict[str, Any]:
    """Heuristic parser for distributor invoice text (Southern Glazer's style)."""
    lines_out: list[dict[str, Any]] = []
    vendor = ""
    invoice_number = ""
    invoice_date = ""
    total = 0.0

    line_re = re.compile(
        r"^(.+?)\s+"
        r"(750ml|1\.75L|1L|1\.5L|\d+ml|12oz|6pk|case)\s+"
        r"(\d+)\s+"
        r"\$?([\d,]+\.?\d*)\s+"
        r"\$?([\d,]+\.?\d*)\s*$",
        re.I,
    )

    for raw in text.splitlines():
        s = raw.strip()
        if not s or s.startswith("-") or s.lower().startswith("item"):
            continue
        if not vendor and re.search(r"glazer|breakthru|distributor|wine|spirits", s, re.I):
            vendor = s[:120]
        m_num = re.search(r"invoice\s*#?\s*:?\s*([A-Z0-9\-]+)", s, re.I)
        if m_num:
            invoice_number = m_num.group(1)
        m_date = re.search(r"invoice\s*date\s*:?\s*([\d/\-]+)", s, re.I)
        if m_date:
            invoice_date = m_date.group(1)
        m_total = re.search(r"total\s+due\s*:?\s*\$?([\d,]+\.?\d*)", s, re.I)
        if m_total:
            total = _parse_money(m_total.group(1))

        m = line_re.match(s)
        if m:
            lines_out.append(
                {
                    "product": m.group(1).strip(),
                    "size": m.group(2),
                    "qty": int(m.group(3)),
                    "unit_cost": _parse_money(m.group(4)),
                    "extended": _parse_money(m.group(5)),
                }
            )

    return {
        "vendor": vendor,
        "invoice_number": invoice_number,
        "invoice_date": invoice_date,
        "total": total,
        "lines": lines_out,
        "parse_source": "local",
        "line_count": len(lines_out),
    }


def _extract_json_blob(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("AI response did not contain JSON")
    return json.loads(text[start : end + 1])


def _anthropic_vision(b64: str, media_type: str, api_key: str, prompt: str) -> dict[str, Any]:
    body = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 4096,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": media_type, "data": b64},
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    }
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    blocks = payload.get("content") or []
    text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
    parsed = _extract_json_blob(text)
    parsed["parse_source"] = "ai-anthropic"
    parsed["line_count"] = len(parsed.get("lines") or [])
    return parsed


def _openai_vision(b64: str, media_type: str, api_key: str, prompt: str) -> dict[str, Any]:
    body = {
        "model": "gpt-4o",
        "max_tokens": 4096,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{b64}"}},
                ],
            }
        ],
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    text = payload["choices"][0]["message"]["content"]
    parsed = _extract_json_blob(text)
    parsed["parse_source"] = "ai-openai"
    parsed["line_count"] = len(parsed.get("lines") or [])
    return parsed


def _anthropic_text(api_key: str, prompt: str, invoice_text: str) -> dict[str, Any]:
    body = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 4096,
        "messages": [
            {
                "role": "user",
                "content": f"{prompt}\n\nINVOICE TEXT:\n{invoice_text}",
            }
        ],
    }
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    blocks = payload.get("content") or []
    text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
    parsed = _extract_json_blob(text)
    parsed["parse_source"] = "ai-anthropic-text"
    parsed["line_count"] = len(parsed.get("lines") or [])
    return parsed


def parse_invoice_image(
    image_bytes: bytes, media_type: str, api_key: str, provider: str
) -> dict[str, Any]:
    if not api_key:
        raise ValueError(
            "Optional AI: connect your API key in Settings → Optional AI to read invoice photos — or paste/type invoice numbers yourself."
        )
    b64 = base64.standard_b64encode(image_bytes).decode("ascii")
    prov = (provider or "claude").lower()
    if prov in ("chatgpt", "openai"):
        return _openai_vision(b64, media_type, api_key, _INVOICE_JSON_PROMPT)
    return _anthropic_vision(b64, media_type, api_key, _INVOICE_JSON_PROMPT)


def parse_invoice_text_ai(text: str, api_key: str, provider: str) -> dict[str, Any]:
    if not api_key:
        raise ValueError("AI API key required")
    prov = (provider or "claude").lower()
    if prov in ("chatgpt", "openai"):
        raise ValueError("Text AI parse uses Claude for now — set provider to Claude")
    return _anthropic_text(api_key, _INVOICE_JSON_PROMPT, text)


def parse_invoice(
    *,
    text: str = "",
    image_bytes: bytes | None = None,
    media_type: str = "image/jpeg",
    api_key: str = "",
    provider: str = "claude",
    prefer_ai: bool = False,
) -> dict[str, Any]:
    if image_bytes:
        return parse_invoice_image(image_bytes, media_type, api_key, provider)
    if not text.strip():
        raise ValueError("Invoice text or photo required")
    local = parse_invoice_text_local(text)
    if local["line_count"] >= 2 and not prefer_ai:
        local["raw_text"] = text[:8000]
        return local
    if api_key:
        try:
            ai = parse_invoice_text_ai(text, api_key, provider)
            ai["raw_text"] = text[:8000]
            return ai
        except (urllib.error.HTTPError, urllib.error.URLError, ValueError, json.JSONDecodeError):
            if local["line_count"]:
                local["raw_text"] = text[:8000]
                return local
            raise
    if local["line_count"]:
        local["raw_text"] = text[:8000]
        return local
    raise ValueError(
        "Could not parse invoice — connect AI in Settings for photos, or paste clearer line-item text."
    )