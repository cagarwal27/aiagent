"""
retrieving.py - Person 3: Script Agent (AI Brain)

Uses rtrvr.ai to deep scan a prospect and their company,
summarizes findings with MiniMax M2.5, and generates a personalized sales pitch.

Outputs:
    output.txt  - Full intel report (summary + pitch)
    pitch.txt   - Clean standalone pitch

Environment variables required:
    RTRVR_API_KEY    - rtrvr.ai API key
    MINIMAX_API_KEY  - MiniMax API key
"""

import os
import sys
import re
import json
import requests
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# ── Configuration ────────────────────────────────────────────────────────
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
# ─────────────────────────────────────────────────────────────────────────

RTRVR_API_KEY = os.getenv("RTRVR_API_KEY")
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY")

# MiniMax M2.5 via OpenAI-compatible API
MINIMAX_BASE_URL = "https://api.minimax.io/v1"


def strip_think_tags(text: str) -> str:
    """Remove <think>...</think> reasoning blocks from MiniMax M2.5 output."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def get_minimax_client() -> OpenAI:
    """Create an OpenAI client pointed at MiniMax's API."""
    if not MINIMAX_API_KEY:
        raise ValueError("MINIMAX_API_KEY environment variable is not set")
    return OpenAI(api_key=MINIMAX_API_KEY, base_url=MINIMAX_BASE_URL)


def research_person(email: str) -> dict:
    """
    Use rtrvr.ai /scrape endpoint to research a person by their email.

    Uses /scrape (faster than /agent — no agentic loop, direct extraction).
    Scrapes the company website + one Google search for the person.
    Returns raw research data about the person and company.
    """
    if not RTRVR_API_KEY:
        raise ValueError("RTRVR_API_KEY environment variable is not set")

    print(f"\n[1/3] Researching {email} via rtrvr.ai ...")

    username = email.split("@")[0] if "@" in email else email
    domain = email.split("@")[1] if "@" in email else ""
    company_name = domain.split(".")[0] if domain else ""

    # Keep URL list small — /scrape runs each URL in parallel but more URLs = more time
    personal_domains = ("gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com")
    if domain and domain not in personal_domains:
        urls = [
            f"https://{domain}",
            f"https://www.google.com/search?q=%22{username}%22+%22{company_name}%22+site:linkedin.com+OR+CEO+OR+founder",
        ]
    else:
        urls = [
            f"https://www.google.com/search?q=%22{email}%22",
            f"https://www.google.com/search?q=%22{company_name}%22+company",
        ]

    response = requests.post(
        "https://api.rtrvr.ai/scrape",
        headers={
            "Authorization": f"Bearer {RTRVR_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "input": (
                f"Extract the following about the person with email {email} "
                f"and their company ({domain}):\n"
                f"1. Person's full name, job title, seniority\n"
                f"2. Company name, what they do, main products/services\n"
                f"3. Company size, funding, HQ location\n"
                f"4. Recent news or announcements\n"
                f"5. Key pain points or challenges the company faces"
            ),
            "urls": urls,
            "response": {"verbosity": "final", "max_inline_output_bytes": 100000},
        },
        timeout=120,
    )
    response.raise_for_status()
    data = response.json()

    print("    Research complete.")
    return data


def summarize_research(research_data: dict, email: str) -> str:
    """
    Use MiniMax M2.5 to create a structured summary of the raw research data.
    Extracts person info, company info, and identifies key pain points.
    """
    print("[2/3] Summarizing research with MiniMax M2.5 ...")

    client = get_minimax_client()

    raw_text = json.dumps(research_data, indent=2, default=str)
    if len(raw_text) > 100000:
        raw_text = raw_text[:100000] + "\n... [truncated]"

    response = client.chat.completions.create(
        model="MiniMax-M2.5",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a sales research analyst. Your job is to analyze raw web "
                    "research data and produce a clean, structured intelligence brief "
                    "about a prospect and their company."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Analyze the following raw research data gathered about the person "
                    f"with email: {email}\n\n"
                    f"Create a structured summary with these sections:\n\n"
                    f"## Person Profile\n"
                    f"- Name\n- Title/Role\n- Seniority level\n- Background & experience\n"
                    f"- Key facts\n\n"
                    f"## Company Overview\n"
                    f"- Company name\n- Industry\n- What they do (1-2 sentences)\n"
                    f"- Main products/services\n- Company size & stage\n"
                    f"- Funding (if known)\n- HQ location\n- Recent news\n\n"
                    f"## Pain Points & Opportunities\n"
                    f"- List the top 3-5 challenges or pain points this company likely faces\n\n"
                    f"## Key Talking Points\n"
                    f"- What topics would resonate with this person in a sales conversation?\n"
                    f"- What are they likely focused on right now?\n\n"
                    f"If some information wasn't found, note it as 'Not found' rather than "
                    f"making it up.\n\n"
                    f"---\nRAW RESEARCH DATA:\n{raw_text}"
                ),
            },
        ],
    )

    summary = strip_think_tags(response.choices[0].message.content)
    print("    Summary complete.")
    return summary


def generate_pitch(summary: str, product_description: str) -> str:
    """
    Use MiniMax M2.5 to generate a personalized sales pitch based on
    the prospect summary and the product being sold.
    """
    print("[3/3] Generating personalized pitch with MiniMax M2.5 ...")

    client = get_minimax_client()

    response = client.chat.completions.create(
        model="MiniMax-M2.5",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a world-class sales copywriter. You write personalized "
                    "outreach messages that get replies. Every pitch you write references "
                    "specific details about the prospect — never generic."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Using the prospect research below, write a compelling personalized "
                    f"sales pitch formatted as an email.\n\n"
                    f"Rules:\n"
                    f"- Start with 'Hi [First Name],' using their ACTUAL first name from the research\n"
                    f"- Reference SPECIFIC details about the prospect's company "
                    f"(company name, products, recent news)\n"
                    f"- Mention the prospect BY NAME and their ROLE/TITLE naturally in the body\n"
                    f"- Identify a pain point relevant to THEIR situation\n"
                    f"- Position the product as the solution to that specific pain\n"
                    f"- Keep it concise: 150-200 words max\n"
                    f"- Tone: professional, warm, not pushy\n"
                    f"- Include a clear low-friction CTA (15-min call, quick demo)\n"
                    f"- NO filler phrases like 'I hope this finds you well'\n"
                    f"- Write it as a ready-to-send email (greeting, body, sign-off)\n\n"
                    f"Structure:\n"
                    f"1. Greeting — 'Hi [First Name],'\n"
                    f"2. Hook — reference something specific about them/their company\n"
                    f"3. Pain — a challenge they likely face\n"
                    f"4. Solution — how the product solves that pain\n"
                    f"5. Proof — a brief credibility point\n"
                    f"6. CTA — clear, easy next step\n"
                    f"7. Sign-off\n\n"
                    f"---\n"
                    f"PROSPECT RESEARCH:\n{summary}\n\n"
                    f"---\n"
                    f"PRODUCT BEING PITCHED:\n{product_description}\n"
                ),
            },
        ],
    )

    pitch = strip_think_tags(response.choices[0].message.content)
    print("    Pitch generated.\n")
    return pitch


def main():
    missing = []
    if not RTRVR_API_KEY:
        missing.append("RTRVR_API_KEY")
    if not MINIMAX_API_KEY:
        missing.append("MINIMAX_API_KEY")
    if missing:
        print(f"Error: Missing environment variables: {', '.join(missing)}")
        print("Set them before running:")
        print("  export RTRVR_API_KEY=your_rtrvr_key")
        print("  export MINIMAX_API_KEY=your_minimax_key")
        sys.exit(1)

    research_data = research_person(EMAIL)
    summary = summarize_research(research_data, EMAIL)
    pitch = generate_pitch(summary, PRODUCT)

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

    with open("pitch.txt", "w", encoding="utf-8") as f:
        f.write(pitch)

    print("Pitch saved        -> pitch.txt")
    print("\n--- PITCH PREVIEW ---\n")
    print(pitch)


if __name__ == "__main__":
    main()
