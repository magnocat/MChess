#!/usr/bin/env python3
"""
MChess 3D - Servidor Universal do Mural (Node 07 VPS).
Zero dependencias externas (apenas biblioteca padrao Python 3).
Armazena o ranking global em texto puro (.txt) e expoe API REST com CORS.
"""

from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import re
import threading

PORT = int(os.environ.get("PORT", "8098"))
MURAL_FILE = os.environ.get("MURAL_FILE", "/var/lib/mchess-mural/mural-global.txt")
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "https://magnocat.github.io,http://localhost:5173,http://127.0.0.1:5173",
).split(",")
MAX_BODY_BYTES = 102400

LOCK = threading.Lock()
SAFE_ID_RE = re.compile(r"^[a-fA-F0-9a-zA-Z_-]{4,16}$")


def sanitize_text(value: str, max_len: int = 32) -> str:
    if not isinstance(value, str):
        return ""
    cleaned = "".join(ch for ch in value if ch.isprintable() and ch not in "<>\"'`")
    return cleaned.strip()[:max_len]


def merge_period(existing_bucket, incoming_bucket):
    if not isinstance(incoming_bucket, dict):
        return existing_bucket
    key = sanitize_text(str(incoming_bucket.get("key", "")), 12)
    if not key:
        return existing_bucket
    if not isinstance(existing_bucket, dict) or existing_bucket.get("key") != key:
        prev = {"key": key, "points": 0, "wins": 0, "losses": 0, "draws": 0, "games": 0, "moves": 0}
    else:
        prev = existing_bucket
    return {
        "key": key,
        "points": max(int(prev.get("points", 0)), max(0, int(incoming_bucket.get("points", 0) or 0))),
        "wins": max(int(prev.get("wins", 0)), max(0, int(incoming_bucket.get("wins", 0) or 0))),
        "losses": max(int(prev.get("losses", 0)), max(0, int(incoming_bucket.get("losses", 0) or 0))),
        "draws": max(int(prev.get("draws", 0)), max(0, int(incoming_bucket.get("draws", 0) or 0))),
        "games": max(int(prev.get("games", 0)), max(0, int(incoming_bucket.get("games", 0) or 0))),
        "moves": max(int(prev.get("moves", 0)), max(0, int(incoming_bucket.get("moves", 0) or 0))),
    }


def load_entries() -> list:
    if not os.path.exists(MURAL_FILE):
        return []
    try:
        with open(MURAL_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("PAYLOAD_JSON="):
                    data = json.loads(line[len("PAYLOAD_JSON="):].strip())
                    entries = data.get("entries", [])
                    return entries if isinstance(entries, list) else []
    except Exception:
        return []
    return []


def save_entries(entries: list) -> None:
    os.makedirs(os.path.dirname(MURAL_FILE), exist_ok=True)
    now_iso = datetime.now(timezone.utc).isoformat()
    payload = json.dumps({"entries": entries}, ensure_ascii=False, separators=(",", ":"))
    content = (
        "# MCHESS - REGISTRO GLOBAL EM TEXTO PURO (ASD-STE100)\n"
        "TIPO=SCOREBOARD\n"
        "HWID_HASH=GLOBAL\n"
        f"ATUALIZADO_EM={now_iso}\n"
        f"PAYLOAD_JSON={payload}\n"
    )
    tmp_path = f"{MURAL_FILE}.tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(content)
    os.replace(tmp_path, MURAL_FILE)


def merge_and_sort(current: list, incoming: list) -> list:
    by_id = {e["shortId"]: e for e in current if isinstance(e, dict) and e.get("shortId")}
    for item in incoming:
        if not isinstance(item, dict):
            continue
        short_id = sanitize_text(str(item.get("shortId", "")), 16)
        if not SAFE_ID_RE.match(short_id):
            continue
        player_name = sanitize_text(str(item.get("playerName", "")), 32) or short_id
        games = max(0, int(item.get("games", 0) or 0))
        moves = max(0, int(item.get("moves", 0) or 0))
        wins = max(0, int(item.get("wins", 0) or 0))
        losses = max(0, int(item.get("losses", 0) or 0))
        draws = max(0, int(item.get("draws", 0) or 0))
        points = max(0, int(item.get("points", 0) or 0))
        elo = max(100, min(3500, int(item.get("elo", 800) or 800)))
        updated_at = sanitize_text(str(item.get("updatedAt", "")), 40) or datetime.now(timezone.utc).isoformat()

        existing = by_id.get(short_id)
        if not existing:
            by_id[short_id] = {
                "shortId": short_id,
                "playerName": player_name,
                "games": games,
                "moves": moves,
                "wins": wins,
                "losses": losses,
                "draws": draws,
                "points": points,
                "elo": elo,
                "monthly": merge_period(None, item.get("monthly")),
                "daily": merge_period(None, item.get("daily")),
                "updatedAt": updated_at,
            }
        else:
            if points >= existing.get("points", 0) or moves >= existing.get("moves", 0):
                if player_name and player_name != short_id:
                    existing["playerName"] = player_name
                existing["games"] = max(int(existing.get("games", 0)), games)
                existing["moves"] = max(int(existing.get("moves", 0)), moves)
                existing["wins"] = max(int(existing.get("wins", 0)), wins)
                existing["losses"] = max(int(existing.get("losses", 0)), losses)
                existing["draws"] = max(int(existing.get("draws", 0)), draws)
                existing["points"] = max(int(existing.get("points", 0)), points)
                existing["elo"] = max(int(existing.get("elo", 800)), elo)
                existing["updatedAt"] = updated_at
            existing["monthly"] = merge_period(existing.get("monthly"), item.get("monthly"))
            existing["daily"] = merge_period(existing.get("daily"), item.get("daily"))

    merged = list(by_id.values())
    merged.sort(key=lambda e: (-int(e.get("points", 0)), -int(e.get("elo", 800)), -int(e.get("moves", 0))))
    return merged[:200]


class MuralHandler(BaseHTTPRequestHandler):
    def _send_cors(self):
        origin = self.headers.get("Origin", "")
        safe_origin = origin.replace("\r", "").replace("\n", "")
        if origin in ALLOWED_ORIGINS or "*" in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", safe_origin or "*")
        else:
            self.send_header("Access-Control-Allow-Origin", "https://magnocat.github.io")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send_json(self, code: int, payload: dict):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self._send_cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            with LOCK:
                entries = load_entries()
            self._send_json(200, {"status": "ok", "entries": len(entries)})
            return

        if self.path.startswith("/api/mural"):
            with LOCK:
                entries = load_entries()
            self._send_json(200, {"entries": entries[:50]})
            return

        self._send_json(404, {"error": "not_found"})

    def do_POST(self):
        if not self.path.startswith("/api/mural"):
            self._send_json(404, {"error": "not_found"})
            return

        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0 or length > MAX_BODY_BYTES:
            self._send_json(400, {"error": "invalid_payload_size"})
            return

        try:
            raw = self.rfile.read(length)
            data = json.loads(raw.decode("utf-8"))
            incoming = data.get("entries", [])
            if not isinstance(incoming, list):
                self._send_json(400, {"error": "invalid_entries"})
                return
        except Exception:
            self._send_json(400, {"error": "invalid_json"})
            return

        with LOCK:
            current = load_entries()
            updated = merge_and_sort(current, incoming)
            save_entries(updated)

        self._send_json(200, {"ok": True, "entries": updated[:50]})

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), MuralHandler)
    print(f"MChess Mural Server ativo em 0.0.0.0:{PORT}")
    server.serve_forever()
