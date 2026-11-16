#!/usr/bin/env python3
# Written with AI assistance (Anthropic’s Claude) and reviewed by the author.
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

Return exactly one object per row above, in the same order as the rows. Each object has:
- "row_start": the row's first 30 characters, copied exactly as written (the whole row if it is shorter)
- "is_test": true if the row describes one individual test; false for a header, note or blank row
- "test_id": the test's identifier as written
- "o2_pct": oxygen at the start of the test, in percent (convert fractions such as 0.21 to 21). If the cell gives a range, give its midpoint. null if the table doesn't give oxygen.
- "pressure_psi": ambient pressure in psi, converted from the table's unit (1 atm = 14.6959 psi; 1 bar = 14.5038 psi; 1 kPa = 0.145038 psi; 1 mmHg = 0.0193368 psi). null if the table doesn't give pressure.
- "flow_cm_s": imposed airflow speed in cm/s if the row gives one (the first value if it lists several). null otherwise.
- "burn_time_s": burn time in seconds if given as a number, else null.
- "test_end": one of these values:
{ends}
- "problems": short notes on anything in this row that looks wrong or inconsistent (impossible values, typos, missing cells, contradictions); [] if none.

For a row with "is_test": false, only "row_start" and "is_test" are needed. Use only what the table says; never guess or fill in values from outside knowledge.
Reply with: {{"tests": [ ... ]}}"""


ROW_START_CHARS = 30


def norm(x):
    """Compare row_start ignoring case and extra spaces."""
    return " ".join(str(x or "").lower().split())


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


WAITS = [15, 30, 60, 60, 60, 60]  # seconds before retries 1..6


def ask(client, model, prompt, validate=None, tries=4):  # 1 attempt + 3 retries
    api_retries = 0
    json_tries = 0
    stop = None
    while True:
        try:
            resp = client.messages.create(model=model, max_tokens=16000, system=SYSTEM,
                                          messages=[{"role": "user", "content": prompt}])
            stop = resp.stop_reason
            text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
            got = parse_json(text)
            if validate:
                validate(got)
            return got
        except (anthropic.RateLimitError, anthropic.APIConnectionError, anthropic.InternalServerError) as e:
            if api_retries >= len(WAITS):
                raise RuntimeError(f"gave up after {len(WAITS)} retries ({type(e).__name__})")
            wait = WAITS[api_retries]
            api_retries += 1
            print(f"    API busy ({type(e).__name__}); retry {api_retries}/{len(WAITS)} in {wait}s", file=sys.stderr, flush=True)
            time.sleep(wait)
        except (ValueError, json.JSONDecodeError) as e:
            json_tries += 1
            if json_tries >= tries:
                raise RuntimeError(f"gave up after {tries} attempts: {e}")
            print(f"    bad reply ({e}); stop_reason={stop}; retrying", file=sys.stderr, flush=True)
            prompt += "\n\nReply with valid JSON only."


def save(path, out):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="claude-haiku-5-5")
    ap.add_argument("--chunk", type=int, default=40)
    ap.add_argument("--fresh", action="store_true", help="ignore any existing data/ai_extracted.json and start over")
    args = ap.parse_args()

    key = json.loads((DATA / "answer_key.json").read_text(encoding="utf-8"))
    ends = "\n".join(f'  "{k}": {v}' for k, v in key["test_end_values"].items())
    client = anthropic.Anthropic()
    outpath = DATA / "ai_extracted.json"
    out = {"model": args.model, "chunk": args.chunk, "run_at": datetime.datetime.now().isoformat(timespec="seconds"),
           "done": [], "tests": [], "errors": []}

    if outpath.exists() and not args.fresh:
        prev = json.loads(outpath.read_text(encoding="utf-8"))
        if prev.get("model") == args.model and prev.get("chunk") == args.chunk and "done" in prev:
            out = prev
            out["errors"] = []  # failed chunks are not in "done", so they are retried
            print(f"resuming: {len(out['done'])} chunks already done, {len(out['tests'])} tests")
        else:
            print("existing ai_extracted.json can't be resumed (different model/chunk or no progress info); starting over")
    done = set(out["done"])

    for fname, info in key["files"].items():
        lines = read_lines(DATA / "raw" / fname)
        hidx = next(i for i, l in enumerate(lines) if l.strip())
        body = [(i + 1, l) for i, l in enumerate(lines) if i > hidx and l.strip()]
        print(f"{fname}: {len(body)} rows", flush=True)
        for s in range(0, len(body), args.chunk):
            part = body[s:s + args.chunk]
            cid = f"{fname}:{part[0][0]}-{part[-1][0]}"
            if cid in done:
                print(f"  lines {part[0][0]}-{part[-1][0]}: already done, skipping", flush=True)
                continue
            prompt = PROMPT.format(inv=info["investigation"], file=fname, hline=hidx + 1, header=lines[hidx], ends=ends,
                                   rows="\n".join(f"L{n}: {l}" for n, l in part))
            def validate(got, part=part):
                tests = got.get("tests")
                if not isinstance(tests, list) or len(tests) != len(part):
                    raise ValueError(f"expected {len(part)} objects, got {len(tests) if isinstance(tests, list) else 'none'}")
                for i, (t, (n, l)) in enumerate(zip(tests, part)):
                    if not isinstance(t, dict) or not isinstance(t.get("is_test"), bool):
                        raise ValueError(f"row {i + 1} (line {n}): missing or non-boolean is_test")
                    if norm(t.get("row_start")) != norm(l[:ROW_START_CHARS]):
                        raise ValueError(f"row {i + 1} (line {n}): row_start {t.get('row_start')!r} != {l[:ROW_START_CHARS]!r}")
            try:
                got = ask(client, args.model, prompt, validate)
                for t, (n, _) in zip(got["tests"], part):
                    if not t["is_test"]:
                        continue  # header, note or blank row
                    t["line"] = n  # set from position in the chunk, never from the model
                    t["file"] = fname
                    out["tests"].append(t)
                out["done"].append(cid)
                done.add(cid)
                print(f"  lines {part[0][0]}-{part[-1][0]}: {len(got.get('tests', []))} tests", flush=True)
            except Exception as e:
                out["errors"].append({"file": fname, "lines": [part[0][0], part[-1][0]], "error": str(e)})
                print(f"  lines {part[0][0]}-{part[-1][0]}: FAILED ({e})", file=sys.stderr, flush=True)
            save(outpath, out)

    save(outpath, out)
    print(f"wrote data/ai_extracted.json: {len(out['tests'])} tests, {len(out['errors'])} failed chunks")


if __name__ == "__main__":
    main()
