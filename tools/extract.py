#!/usr/bin/env python3
"""Accuracy test, step 1: Claude reads the raw PSI tables and extracts test records.

Reads data/answer_key.json only for the list of files and the test-end definitions
(never the expected values), sends each file to the model in chunks of rows, and
writes data/ai_extracted.json.

Usage:  python tools/extract.py [--model claude-haiku-5-5] [--chunk 40]
Needs ANTHROPIC_API_KEY in the environment.
"""
import argparse
import datetime
import json
import re
import sys
import time
from pathlib import Path

import anthropic

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

SYSTEM = "You extract individual test records from NASA PSI experiment tables given as CSV text. Reply with JSON only, no prose."

PROMPT = """Investigation: {inv}
File: {file}
Header (line {hline}):
{header}

Rows, each prefixed with its line number:
{rows}

For every row above that describes one individual test, return an object with:
- "line": the line number
- "test_id": the test's identifier as written
- "o2_pct": oxygen at the start of the test, in percent (convert fractions such as 0.21 to 21). If the cell gives a range, give its midpoint. null if the table doesn't give oxygen.
- "pressure_psi": ambient pressure in psi, converted from the table's unit (1 atm = 14.6959 psi; 1 bar = 14.5038 psi; 1 kPa = 0.145038 psi; 1 mmHg = 0.0193368 psi). null if the table doesn't give pressure.
- "flow_cm_s": imposed airflow speed in cm/s if the row gives one (the first value if it lists several). null otherwise.
- "burn_time_s": burn time in seconds if given as a number, else null.
- "test_end": one of these values:
{ends}
- "problems": short notes on anything in this row that looks wrong or inconsistent (impossible values, typos, missing cells, contradictions); [] if none.

Skip header, note and blank rows. Use only what the table says; never guess or fill in values from outside knowledge.
Reply with: {{"tests": [ ... ]}}"""


def read_lines(path):
    raw = path.read_bytes()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("cp1252")
    return text.splitlines()


def parse_json(text):
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < 0:
        raise ValueError("no JSON object in reply")
    return json.loads(text[start:end + 1])


def ask(client, model, prompt, tries=4):
    for attempt in range(tries):
        try:
            resp = client.messages.create(model=model, max_tokens=8000, temperature=0, system=SYSTEM,
                                          messages=[{"role": "user", "content": prompt}])
            text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
            return parse_json(text)
        except (anthropic.RateLimitError, anthropic.APIConnectionError, anthropic.InternalServerError) as e:
            wait = 5 * (attempt + 1)
            print(f"    API busy ({type(e).__name__}); retrying in {wait}s", file=sys.stderr)
            time.sleep(wait)
        except (ValueError, json.JSONDecodeError) as e:
            print(f"    reply wasn't valid JSON ({e}); retrying", file=sys.stderr)
            prompt += "\n\nReply with valid JSON only."
    raise RuntimeError("gave up after repeated failures")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="claude-haiku-5-5")
    ap.add_argument("--chunk", type=int, default=40)
    args = ap.parse_args()

    key = json.loads((DATA / "answer_key.json").read_text(encoding="utf-8"))
    ends = "\n".join(f'  "{k}": {v}' for k, v in key["test_end_values"].items())
    client = anthropic.Anthropic()
    out = {"model": args.model, "chunk": args.chunk, "run_at": datetime.datetime.now().isoformat(timespec="seconds"), "tests": [], "errors": []}

    for fname, info in key["files"].items():
        lines = read_lines(DATA / "raw" / fname)
        hidx = next(i for i, l in enumerate(lines) if l.strip())
        body = [(i + 1, l) for i, l in enumerate(lines) if i > hidx and l.strip()]
        print(f"{fname}: {len(body)} rows")
        for s in range(0, len(body), args.chunk):
            part = body[s:s + args.chunk]
            prompt = PROMPT.format(inv=info["investigation"], file=fname, hline=hidx + 1, header=lines[hidx], ends=ends,
                                   rows="\n".join(f"L{n}: {l}" for n, l in part))
            try:
                got = ask(client, args.model, prompt)
                for t in got.get("tests", []):
                    t["file"] = fname
                    out["tests"].append(t)
                print(f"  lines {part[0][0]}-{part[-1][0]}: {len(got.get('tests', []))} tests")
            except Exception as e:
                out["errors"].append({"file": fname, "lines": [part[0][0], part[-1][0]], "error": str(e)})
                print(f"  lines {part[0][0]}-{part[-1][0]}: FAILED ({e})", file=sys.stderr)

    (DATA / "ai_extracted.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"wrote data/ai_extracted.json: {len(out['tests'])} tests, {len(out['errors'])} failed chunks")


if __name__ == "__main__":
    main()
