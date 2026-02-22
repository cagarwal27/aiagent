"""
test_retrieving.py

Researches a prospect by email, saves full intel to output.txt,
and writes a clean standalone pitch to pitch.txt.
"""

from retrieving import research_person, summarize_research, generate_pitch

EMAIL = "satya@microsoft.com"

PRODUCT = (
    "Vimero — Generate 5x more revenue through AI-personalized video outreach. "
    "Vimero researches every prospect automatically, writes a personalized video script "
    "based on their company, role, and pain points, generates a professional AI-narrated "
    "video with dynamic visuals, and delivers it ready to send. "
    "No recording. No editing. No production team. "
    "Sales teams using Vimero book 5x more meetings than text-only email outreach "
    "because every video feels like it was made specifically for that one person."
)

if __name__ == "__main__":

    # ── Step 1: Research ──────────────────────────────────────────────────
    research_data = research_person(EMAIL)

    # ── Step 2: Summarize into structured intel ───────────────────────────
    summary = summarize_research(research_data, EMAIL)

    # ── Step 3: Generate Vimero pitch ─────────────────────────────────────
    pitch = generate_pitch(summary, PRODUCT)

    # ── Save full intel report to output.txt ──────────────────────────────
    with open("output.txt", "w", encoding="utf-8") as f:
        f.write(f"PROSPECT INTEL REPORT\n")
        f.write(f"Email: {EMAIL}\n")
        f.write("=" * 70 + "\n\n")
        f.write(summary)
        f.write("\n\n" + "=" * 70 + "\n")
        f.write("GENERATED PITCH (see pitch.txt for clean version)\n")
        f.write("=" * 70 + "\n\n")
        f.write(pitch)

    print("Intel report saved -> output.txt")

    # ── Save clean pitch to pitch.txt ─────────────────────────────────────
    with open("pitch.txt", "w", encoding="utf-8") as f:
        f.write(pitch)

    print("Pitch saved        -> pitch.txt")
    print("\n--- PITCH PREVIEW ---\n")
    print(pitch)
