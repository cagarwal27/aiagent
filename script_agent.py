"""
script_agent.py - Person 3: Video Script Generator

Orchestrates the full Person 3 pipeline:
  1. Research person via rtrvr.ai          (from retrieving.py)
  2. Summarize research with MiniMax M2.5  (from retrieving.py)
  3. Generate sales pitch text             (from retrieving.py)
  4. Store prospect + company info in DB   (from database.py)
  5. Generate 3-scene video script         (this file)
  6. Store script in DB                    (from database.py)

The 3-scene script JSON matches the Convex schema exactly:
  prospects.script → { scenes: [...], fullNarration: "..." }
So Person 2 can pipe each scene's:
  narration     → ElevenLabs TTS (voice)
  visualPrompt  → MiniMax image-01 (scene visual)

Usage:
    python script_agent.py xyz@minimax.com
    python script_agent.py xyz@minimax.com --sender "Sarah from Acme"
    python script_agent.py xyz@minimax.com --product "Your product"
    python script_agent.py xyz@minimax.com --output results.json
    python script_agent.py --list                  # all stored prospects
    python script_agent.py --show xyz@minimax.com  # detail for one email

Environment variables required:
    RTRVR_API_KEY    - rtrvr.ai API key
    MINIMAX_API_KEY  - MiniMax API key
"""

import os
import sys
import json
import re
import argparse
from dotenv import load_dotenv

# Research + pitch functions live in retrieving.py (unchanged)
from retrieving import research_person, summarize_research, generate_pitch, get_minimax_client

# DB layer
import database as db

load_dotenv()

RTRVR_API_KEY = os.getenv("RTRVR_API_KEY")
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY")


# ---------------------------------------------------------------------------
# Video script generation
# ---------------------------------------------------------------------------

def generate_video_script(
    summary: str,
    email: str,
    sender_name: str,
    product_description: str,
) -> dict:
    """
    Use MiniMax M2.5 to generate a structured 3-scene personalized video script.

    Scene layout (per architecture):
      Scene 1 — Hook       (10-15s): prospect's name + specific company hook
      Scene 2 — Pain+Fix   (20-25s): relevant pain point → product as the solution
      Scene 3 — CTA        (10-15s): sender signs off, mentions company, clear CTA

    Returns a dict matching the Convex schema (prospects.script):
    {
      "scenes": [
        {
          "sceneNumber": 1,
          "narration": "...",      <-- ElevenLabs speaks this verbatim
          "visualPrompt": "...",   <-- MiniMax image-01 generates this
          "durationSeconds": 12
        },
        ...
      ],
      "fullNarration": "..."       <-- all narration joined for reference
    }
    """
    print("\n[Generating video script with MiniMax M2.5 ...]")

    client = get_minimax_client()
    domain = email.split("@")[1] if "@" in email else ""
    company_hint = domain.split(".")[0].capitalize() if domain else "their company"

    response = client.chat.completions.create(
        model="MiniMax-M2.5",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a world-class sales video scriptwriter for B2B outreach. "
                    "You write personalized 60-second video scripts that get replies. "
                    "Every script references specific prospect details — never generic. "
                    "You respond ONLY with valid JSON — no markdown, no code fences, no explanation."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Write a 3-scene personalized sales video script for a prospect at {company_hint}.\n\n"
                    f"SENDER: {sender_name}\n\n"
                    f"PRODUCT:\n{product_description}\n\n"
                    f"PROSPECT RESEARCH:\n{summary}\n\n"
                    f"SCENE RULES:\n"
                    f"- Total narration: under 150 words (~60 seconds spoken)\n"
                    f"- Scene 1 — Hook (10-15s): Address prospect BY NAME. Reference ONE specific "
                    f"  detail from their research (recent news, product, funding, or challenge).\n"
                    f"- Scene 2 — Pain + Solution (20-25s): Name a concrete pain point for their "
                    f"  role/industry. Position the product as the direct fix.\n"
                    f"- Scene 3 — CTA (10-15s): {sender_name} signs off. "
                    f"  Mention their company name. Clear, low-friction CTA (15-min call or quick demo).\n"
                    f"- narration must be plain spoken text only — NO markdown, asterisks, "
                    f"  parenthetical directions, or special formatting. "
                    f"  It will be read aloud by TTS exactly as written.\n"
                    f"- visualPrompt: vivid AI image generation prompt describing the scene — "
                    f"  subject, setting, lighting, color palette, camera angle. "
                    f"  NO text, no logos, no real person names. Cinematic, photorealistic style.\n"
                    f"- durationSeconds: estimated spoken time (~2.5 words per second)\n\n"
                    f"Return ONLY this JSON structure (no code fences, no extra text):\n"
                    + json.dumps(
                        {
                            "scenes": [
                                {
                                    "sceneNumber": 1,
                                    "narration": "...",
                                    "visualPrompt": "...",
                                    "durationSeconds": 12,
                                },
                                {
                                    "sceneNumber": 2,
                                    "narration": "...",
                                    "visualPrompt": "...",
                                    "durationSeconds": 22,
                                },
                                {
                                    "sceneNumber": 3,
                                    "narration": "...",
                                    "visualPrompt": "...",
                                    "durationSeconds": 12,
                                },
                            ],
                            "fullNarration": "<scene 1 + scene 2 + scene 3 narration joined>",
                        },
                        indent=2,
                    )
                ),
            },
        ],
    )

    raw = response.choices[0].message.content.strip()
    # Strip markdown code fences in case the model wrapped the JSON anyway
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        script = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            script = json.loads(match.group())
        else:
            raise ValueError(f"MiniMax did not return valid JSON.\nRaw response:\n{raw}")

    if not script.get("fullNarration"):
        script["fullNarration"] = " ".join(
            s["narration"] for s in script.get("scenes", [])
        )

    print("    Video script generated.")
    return script


# ---------------------------------------------------------------------------
# Display helpers
# ---------------------------------------------------------------------------

def print_script(script: dict):
    print("\n" + "=" * 70)
    print("VIDEO SCRIPT (3 SCENES)")
    print("=" * 70)
    for scene in script.get("scenes", []):
        print(f"\n--- Scene {scene['sceneNumber']} ({scene.get('durationSeconds', '?')}s) ---")
        print(f"NARRATION  : {scene['narration']}")
        print(f"VISUAL     : {scene['visualPrompt']}")
    total = sum(s.get("durationSeconds", 0) for s in script.get("scenes", []))
    words = len(script.get("fullNarration", "").split())
    print(f"\nTotal: ~{total}s  |  {words} words")
    print(f"\nFULL NARRATION:\n{script.get('fullNarration', '')}")
    print("=" * 70)


def cmd_list():
    rows = db.list_prospects()
    if not rows:
        print("No prospects in database yet.")
        return
    print(f"\n{'ID':<5} {'EMAIL':<35} {'NAME':<22} {'COMPANY':<22} CREATED")
    print("-" * 105)
    for r in rows:
        print(
            f"{r['id']:<5} {(r['email'] or ''):<35} {(r['name'] or ''):<22} "
            f"{(r['company_name'] or ''):<22} {r['created_at']}"
        )


def cmd_show(email: str):
    p = db.get_prospect(email)
    if not p:
        print(f"No prospect found for: {email}")
        return
    print(f"\n{'='*60}\nPROSPECT: {email}\n{'='*60}")
    skip = {"raw_research", "summary", "pitch"}
    for key, val in p.items():
        if key in skip:
            continue
        print(f"  {key:<20}: {val}")
    print("\n--- SUMMARY ---")
    print(p.get("summary") or "(none)")
    print("\n--- PITCH ---")
    print(p.get("pitch") or "(none)")
    scripts = db.get_scripts_for_prospect(email)
    if scripts:
        print(f"\n--- VIDEO SCRIPTS ({len(scripts)} stored) ---")
        for s in scripts:
            print(f"\n  Script #{s['id']} | sender: {s.get('sender')} | {s['created_at']}")
            for scene in s.get("scenes", []):
                print(f"    Scene {scene['sceneNumber']}: {scene['narration'][:80]}...")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    db.init_db()

    parser = argparse.ArgumentParser(
        description=(
            "Research a prospect by email, store to DB, "
            "generate sales pitch + 3-scene video script"
        )
    )
    parser.add_argument("email", nargs="?",
                        help="Prospect email (e.g., xyz@minimax.com)")
    parser.add_argument("--sender", default="Sarah from ProspectClip",
                        help="Sender name shown in pitch and script")
    parser.add_argument("--product", default=(
        "ProspectClip — AI-generated personalized sales videos at scale. "
        "Upload a prospect list and ProspectClip researches each prospect, "
        "writes a personalized script, generates AI narration and scene visuals, "
        "and delivers finished narrated video presentations ready to embed in outreach emails. "
        "3-5x reply rates vs text email. Zero recording needed."
    ), help="Product description to pitch")
    parser.add_argument("--output", default=None,
                        help="Save full results to a JSON file")
    parser.add_argument("--list", action="store_true",
                        help="List all stored prospects")
    parser.add_argument("--show", metavar="EMAIL",
                        help="Show stored data for a specific email")

    args = parser.parse_args()

    if args.list:
        cmd_list()
        return
    if args.show:
        cmd_show(args.show)
        return
    if not args.email:
        parser.print_help()
        sys.exit(1)

    # Validate env vars
    missing = [k for k, v in [("RTRVR_API_KEY", RTRVR_API_KEY),
                               ("MINIMAX_API_KEY", MINIMAX_API_KEY)] if not v]
    if missing:
        print(f"Error: Missing environment variables: {', '.join(missing)}")
        sys.exit(1)

    email = args.email

    # ── Step 1: Research via rtrvr.ai  (retrieving.py) ───────────────────
    research_data = research_person(email)

    # ── Step 2: Summarize with MiniMax (retrieving.py) ───────────────────
    summary = summarize_research(research_data, email)

    # ── Step 3: Generate sales pitch   (retrieving.py) ───────────────────
    pitch = generate_pitch(summary, args.product)

    # ── Step 4: Store prospect + company info in DB (database.py) ────────
    prospect_id = db.save_prospect(email, research_data, summary, pitch)
    print(f"[DB] Prospect stored (id={prospect_id})")

    # ── Step 5: Generate 3-scene video script ─────────────────────────────
    script = generate_video_script(summary, email, args.sender, args.product)

    # ── Step 6: Store script in DB (database.py) ──────────────────────────
    script_id = db.save_script(prospect_id, email, args.sender, args.product, script)
    print(f"[DB] Script stored (id={script_id})")

    # ── Print all results ─────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("PROSPECT SUMMARY")
    print("=" * 70)
    print(summary)

    print("\n" + "=" * 70)
    print("SALES PITCH (text email)")
    print("=" * 70)
    print(pitch)

    print_script(script)

    # ── Optionally save to JSON ───────────────────────────────────────────
    if args.output:
        output_data = {
            "email": email,
            "sender": args.sender,
            "product": args.product,
            "prospect_id": prospect_id,
            "script_id": script_id,
            "summary": summary,
            "pitch": pitch,
            # script matches Convex prospects.script schema exactly
            # pipe scenes to Person 2 for voice + image generation
            "script": script,
        }
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(output_data, f, indent=2, default=str)
        print(f"\nResults saved to {args.output}")
        print("('script' field matches Convex schema — feed to Person 2's voice/image pipeline)")


if __name__ == "__main__":
    main()
