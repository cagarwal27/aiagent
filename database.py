"""
database.py - SQLite storage layer for ProspectClip (Person 3)

Stores:
  prospects — person + company intelligence from rtrvr.ai research
  scripts   — generated 3-scene video scripts (narration + visual prompts)

Usage (imported by script_agent.py):
    import database as db
    db.init_db()
    pid = db.save_prospect(email, research_data, summary, pitch)
    db.save_script(pid, email, sender, product, script)
"""

import os
import re
import json
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "prospectclip.db")


# ---------------------------------------------------------------------------
# Connection
# ---------------------------------------------------------------------------

def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

def init_db():
    """Create tables if they don't exist yet."""
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS prospects (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            email           TEXT    UNIQUE NOT NULL,
            -- Person info
            name            TEXT,
            title           TEXT,
            seniority       TEXT,
            -- Company info
            company_name    TEXT,
            company_domain  TEXT,
            industry        TEXT,
            company_what    TEXT,       -- what the company does (1-2 sentences)
            company_size    TEXT,
            company_funding TEXT,
            company_hq      TEXT,
            recent_news     TEXT,
            -- Insights
            pain_points     TEXT,       -- JSON array of strings
            talking_points  TEXT,       -- JSON array of strings
            -- Full text fields
            summary         TEXT,       -- MiniMax structured markdown summary
            pitch           TEXT,       -- MiniMax sales email pitch
            raw_research    TEXT,       -- raw JSON from rtrvr.ai
            -- Timestamps
            created_at      TEXT        DEFAULT (datetime('now')),
            updated_at      TEXT        DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS scripts (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            prospect_id     INTEGER NOT NULL REFERENCES prospects(id),
            email           TEXT    NOT NULL,
            sender          TEXT,
            product         TEXT,
            scenes          TEXT    NOT NULL,   -- JSON array of scene objects
            full_narration  TEXT    NOT NULL,
            created_at      TEXT    DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Writes
# ---------------------------------------------------------------------------

def save_prospect(email: str, research_data: dict, summary: str, pitch: str) -> int:
    """
    Store person + company data parsed from the MiniMax summary.
    Upserts on email — re-running for the same email updates all fields.
    Returns the prospect row id.
    """
    parsed = _parse_summary(summary)
    domain = email.split("@")[1] if "@" in email else ""

    conn = get_db()
    cur = conn.execute(
        """
        INSERT INTO prospects
            (email, name, title, seniority,
             company_name, company_domain, industry, company_what,
             company_size, company_funding, company_hq, recent_news,
             pain_points, talking_points,
             summary, pitch, raw_research, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'))
        ON CONFLICT(email) DO UPDATE SET
            name            = excluded.name,
            title           = excluded.title,
            seniority       = excluded.seniority,
            company_name    = excluded.company_name,
            company_domain  = excluded.company_domain,
            industry        = excluded.industry,
            company_what    = excluded.company_what,
            company_size    = excluded.company_size,
            company_funding = excluded.company_funding,
            company_hq      = excluded.company_hq,
            recent_news     = excluded.recent_news,
            pain_points     = excluded.pain_points,
            talking_points  = excluded.talking_points,
            summary         = excluded.summary,
            pitch           = excluded.pitch,
            raw_research    = excluded.raw_research,
            updated_at      = datetime('now')
        """,
        (
            email,
            parsed.get("name"),
            parsed.get("title"),
            parsed.get("seniority"),
            parsed.get("company_name"),
            domain,
            parsed.get("industry"),
            parsed.get("company_what"),
            parsed.get("company_size"),
            parsed.get("company_funding"),
            parsed.get("company_hq"),
            parsed.get("recent_news"),
            json.dumps(parsed.get("pain_points", [])),
            json.dumps(parsed.get("talking_points", [])),
            summary,
            pitch,
            json.dumps(research_data, default=str),
        ),
    )
    conn.commit()
    # lastrowid is 0 on UPDATE — fall back to a SELECT
    prospect_id = cur.lastrowid or conn.execute(
        "SELECT id FROM prospects WHERE email = ?", (email,)
    ).fetchone()["id"]
    conn.close()
    return prospect_id


def save_script(prospect_id: int, email: str, sender: str, product: str, script: dict) -> int:
    """
    Store a generated 3-scene video script.
    Each run appends a new row (history is preserved).
    Returns the script row id.
    """
    conn = get_db()
    cur = conn.execute(
        """
        INSERT INTO scripts (prospect_id, email, sender, product, scenes, full_narration)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            prospect_id,
            email,
            sender,
            product,
            json.dumps(script.get("scenes", []), ensure_ascii=False),
            script.get("fullNarration", ""),
        ),
    )
    conn.commit()
    script_id = cur.lastrowid
    conn.close()
    return script_id


# ---------------------------------------------------------------------------
# Reads
# ---------------------------------------------------------------------------

def get_prospect(email: str) -> dict | None:
    """Fetch a stored prospect by email. Returns None if not found."""
    conn = get_db()
    row = conn.execute("SELECT * FROM prospects WHERE email = ?", (email,)).fetchone()
    conn.close()
    if not row:
        return None
    data = dict(row)
    for field in ("pain_points", "talking_points"):
        if data.get(field):
            try:
                data[field] = json.loads(data[field])
            except Exception:
                pass
    return data


def list_prospects() -> list[dict]:
    """Return summary rows for all stored prospects."""
    conn = get_db()
    rows = conn.execute(
        "SELECT id, email, name, title, company_name, created_at FROM prospects ORDER BY id"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_scripts_for_prospect(email: str) -> list[dict]:
    """Return all video scripts stored for a given email."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM scripts WHERE email = ? ORDER BY id", (email,)
    ).fetchall()
    conn.close()
    result = []
    for row in rows:
        d = dict(row)
        if d.get("scenes"):
            try:
                d["scenes"] = json.loads(d["scenes"])
            except Exception:
                pass
        result.append(d)
    return result


# ---------------------------------------------------------------------------
# Internal: parse structured fields from MiniMax summary markdown
# ---------------------------------------------------------------------------

def _parse_summary(summary: str) -> dict:
    """Best-effort extraction of fields from the markdown summary."""

    def grab(pattern, text):
        m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        return m.group(1).strip() if m else None

    def grab_list(header_pattern, text):
        block = re.search(
            header_pattern + r".*?\n((?:\s*[-*]\s*.+\n?)+)",
            text, re.IGNORECASE
        )
        if not block:
            return []
        return [l.strip() for l in re.findall(r"[-*]\s*(.+)", block.group(1)) if l.strip()]

    return {
        "name":            grab(r"[-*]\s*Name[:\s]+(.+)", summary),
        "title":           grab(r"[-*]\s*Title(?:/Role)?[:\s]+(.+)", summary),
        "seniority":       grab(r"[-*]\s*Seniority[:\s]+(.+)", summary),
        "company_name":    grab(r"[-*]\s*Company\s*name[:\s]+(.+)", summary),
        "industry":        grab(r"[-*]\s*Industry[:\s]+(.+)", summary),
        "company_what":    grab(r"[-*]\s*What they do[:\s]+(.+)", summary),
        "company_size":    grab(r"[-*]\s*Company\s*size[:\s]+(.+)", summary),
        "company_funding": grab(r"[-*]\s*Funding[:\s]+(.+)", summary),
        "company_hq":      grab(r"[-*]\s*HQ\s*location[:\s]+(.+)", summary),
        "recent_news":     grab(r"[-*]\s*Recent\s*news[:\s]+(.+)", summary),
        "pain_points":     grab_list(r"##\s*Pain Points", summary),
        "talking_points":  grab_list(r"##\s*Key Talking Points", summary),
    }
