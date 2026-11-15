#!/usr/bin/env python3
"""Accuracy test, step 2: score the AI's extraction against the frozen answer key.

How a value is scored
- Numbers match within the key's tolerances: oxygen 0.05 percentage points, pressure 1%
  (at least 0.02 psi), airflow 0.05 cm/s, burn time 0.05 s. A difference that lands exactly
  on a tolerance edge counts as a match (1e-6 allowance for floating-point rounding).
- "also_ok": other values the same row gives for that quantity (for example initial and final
  pressure next to the mean). Any of them counts; nothing in between does.
- "accept" [low, high]: any number in the range counts (used only where a key says so).
- A null expected value means the table doesn't give it, so the right answer is null.
- "ambiguous": the source doesn't determine one right answer (the row contradicts itself, or the
  unit isn't stated). These values are left out of the main score and listed separately. A second,
  strict score counts them too, against the key's first reading.

Usage
  python tools/check.py
      scores data/ai_extracted.json against data/answer_key.json
      and writes data/accuracy.json and data/accuracy_report.md
  python tools/check.py --ai data/runs/run3.json data/runs/run4.json --key data/answer_key_v1.json data/answer_key.json
      scores every run against every key and writes data/accuracy_comparison.md and .json
"""
import argparse
import collections
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
EPS = 1e-6
FIELDS = ["o2_pct", "pressure_psi", "flow_cm_s", "burn_time_s", "test_end"]


def num(v):
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return "not a number"


def slack(field, want, tol):
    if field == "pressure_psi":
        return max(tol["pressure_psi_relative"] * abs(want), 0.02)
    return tol[field]


def value_ok(field, exp, got, tol):
    """True if the AI's value matches the expected value or an alternative the key allows."""
    wants = [exp["value"]] + list(exp.get("also_ok", []))
    if field == "test_end":
        return got in wants
    g = num(got)
    for want in wants:
        if want is None:
            if got in (None, "", "null"):
                return True
        elif isinstance(g, float) and abs(g - want) <= slack(field, want, tol) + EPS:
            return True
    if "accept" in exp and isinstance(g, float):
        lo, hi = exp["accept"]
        if lo - slack(field, lo, tol) - EPS <= g <= hi + slack(field, hi, tol) + EPS:
            return True
    return False


def pct(a, b):
    return round(100 * a / b, 1) if b else None


def score(key, ai):
    tol = key["tolerances"]
    got_by, duplicates = {}, 0
    for t in ai.get("tests", []):
        m = re.search(r"\d+", str(t.get("line", "")))
        if m:
            k = (t.get("file"), int(m.group()))
            duplicates += k in got_by
            got_by[k] = t
    in_key = {(k["file"], k["line"]) for k in key["tests"]}

    main_f = collections.defaultdict(lambda: [0, 0])
    strict_f = collections.defaultdict(lambda: [0, 0])
    main_inv = collections.defaultdict(lambda: [0, 0])
    misses, ambiguous, unflagged = [], [], []
    missing = fully = flagged_known = known = flagged_clean = clean = 0

    for k in key["tests"]:
        g = got_by.get((k["file"], k["line"]))
        missing += g is None
        all_ok = True
        for field, exp in k["expected"].items():
            got = None if g is None else g.get(field)
            ok = g is not None and value_ok(field, exp, got, tol)
            strict_f[field][0] += ok
            strict_f[field][1] += 1
            if exp.get("ambiguous"):
                ambiguous.append({"id": k["id"], "investigation": k["investigation"], "field": field, "why": exp["ambiguous"],
                                  "key_first_reading": exp["value"], "got": got, "matches_first_reading": ok, "row_missing": g is None})
                continue
            main_f[field][0] += ok
            main_f[field][1] += 1
            main_inv[k["investigation"]][0] += ok
            main_inv[k["investigation"]][1] += 1
            if not ok:
                all_ok = False
                misses.append({"id": k["id"], "field": field, "expected": exp, "got": got, "row_missing": g is None, "row": k["row"]})
        fully += all_ok
        raised = bool(g and g.get("problems"))
        if k["known_problems"]:
            known += 1
            flagged_known += raised
            if not raised:
                unflagged.append({"id": k["id"], "known_problems": k["known_problems"]})
        else:
            clean += 1
            flagged_clean += raised

    right, total = sum(v[0] for v in main_f.values()), sum(v[1] for v in main_f.values())
    s_right, s_total = sum(v[0] for v in strict_f.values()), sum(v[1] for v in strict_f.values())
    summary = {
        "model": ai.get("model"), "run_at": ai.get("run_at"),
        "key_version": key.get("version", 1), "key_frozen": key.get("frozen"),
        "main": {"values_correct": right, "values_scored": total, "accuracy_pct": pct(right, total),
                 "note": "ambiguous values left out"},
        "strict": {"values_correct": s_right, "values_scored": s_total, "accuracy_pct": pct(s_right, s_total),
                   "note": "every value, ambiguous ones scored against the key's first reading"},
        "ambiguous_values": len(ambiguous),
        "tests": len(key["tests"]), "tests_fully_correct": fully,
        "rows_missing_from_ai_output": missing,
        "ai_rows_not_in_key": sum(1 for k in got_by if k not in in_key),
        "duplicate_ai_rows": duplicates,
        "per_field": {f: {"correct": v[0], "scored": v[1], "pct": pct(*v)} for f, v in sorted(main_f.items(), key=lambda x: FIELDS.index(x[0]))},
        "per_investigation": {i: {"correct": v[0], "scored": v[1], "pct": pct(*v)} for i, v in main_inv.items()},
        "known_problem_rows_flagged": f"{flagged_known} of {known}",
        "clean_rows_flagged": f"{flagged_clean} of {clean}",
        "failed_chunks": len(ai.get("errors", [])),
    }
    return {"summary": summary, "ambiguous": ambiguous, "known_problem_rows_not_flagged": unflagged, "misses": misses}


def show(v):
    return "null" if v is None else str(v)


def report(res, ai_path, key_path):
    s = res["summary"]
    m, st = s["main"], s["strict"]
    out = [f"# Accuracy test ({s['model']}, run at {s['run_at']})", "",
           f"AI output: `{ai_path}`. Answer key: `{key_path}` (version {s['key_version']}; {s['key_frozen']})", "",
           f"**Main score: {m['values_correct']} of {m['values_scored']} values correct ({m['accuracy_pct']}%)** across {s['tests']} tests, "
           f"with the {s['ambiguous_values']} ambiguous values left out.", "",
           f"Strict score, counting the ambiguous values against the key's first reading: {st['values_correct']} of {st['values_scored']} ({st['accuracy_pct']}%).", "",
           f"{s['tests_fully_correct']} tests fully correct. Rows missing from the AI output: {s['rows_missing_from_ai_output']}. "
           f"AI rows that match no test in the key: {s['ai_rows_not_in_key']}. Duplicate AI rows: {s['duplicate_ai_rows']}. Failed chunks: {s['failed_chunks']}.", "",
           f"Known data problems flagged: {s['known_problem_rows_flagged']} rows. Clean rows flagged anyway: {s['clean_rows_flagged']}.", "",
           "| Field | Correct | Accuracy |", "| - | - | - |"]
    out += [f"| {f} | {v['correct']} of {v['scored']} | {v['pct']}% |" for f, v in s["per_field"].items()]
    out += ["", "| Investigation | Correct | Accuracy |", "| - | - | - |"]
    out += [f"| {i} | {v['correct']} of {v['scored']} | {v['pct']}% |" for i, v in s["per_investigation"].items()]
    if res["ambiguous"]:
        groups = collections.defaultdict(list)
        for a in res["ambiguous"]:
            groups[(a["investigation"], a["field"], a["why"])].append(a)
        out += ["", "## Ambiguous values (left out of the main score)", "",
                "| Investigation | Field | Why | Values | AI matched the key's first reading | AI gave null |", "| - | - | - | - | - | - |"]
        for (inv, f, why), items in groups.items():
            out.append(f"| {inv} | {f} | {why} | {len(items)} | {sum(a['matches_first_reading'] for a in items)} | {sum(a['got'] is None for a in items)} |")
        small = [a for items in groups.values() if len(items) <= 5 for a in items]
        if small:
            out += [""] + [f"- {a['id']} {a['field']}: key's first reading {show(a['key_first_reading'])}, AI gave {show(a['got'])}" for a in small]
    if res["known_problem_rows_not_flagged"]:
        out += ["", "## Known-problem rows the AI didn't flag", ""]
        out += [f"- {u['id']}: {'; '.join(u['known_problems'])}" for u in res["known_problem_rows_not_flagged"]]
    n = len(res["misses"])
    out += ["", f"## Misses ({min(n, 60)} of {n} shown; all are in the JSON file)", ""]
    for x in res["misses"][:60]:
        alts = x["expected"].get("also_ok")
        exp = show(x["expected"]["value"]) + (f" (also ok: {', '.join(show(a) for a in alts)})" if alts else "")
        out.append(f"- {x['id']} {x['field']}: expected {exp}, got {'(row missing)' if x['row_missing'] else show(x['got'])}")
    return "\n".join(out) + "\n"


def load(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))


def rel(p):
    p = Path(p).resolve()
    return p.relative_to(ROOT).as_posix() if p.is_relative_to(ROOT) else str(p)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ai", nargs="+", default=[str(DATA / "ai_extracted.json")])
    ap.add_argument("--key", nargs="+", default=[str(DATA / "answer_key.json")])
    args = ap.parse_args()

    if len(args.ai) == 1 and len(args.key) == 1:
        res = score(load(args.key[0]), load(args.ai[0]))
        (DATA / "accuracy.json").write_text(json.dumps(res, indent=1, ensure_ascii=False), encoding="utf-8")
        (DATA / "accuracy_report.md").write_text(report(res, rel(args.ai[0]), rel(args.key[0])), encoding="utf-8")
        s = res["summary"]
        print(f"Main score {s['main']['values_correct']}/{s['main']['values_scored']} ({s['main']['accuracy_pct']}%), "
              f"strict {s['strict']['values_correct']}/{s['strict']['values_scored']} ({s['strict']['accuracy_pct']}%); "
              f"tests fully correct {s['tests_fully_correct']}/{s['tests']}; rows missing {s['rows_missing_from_ai_output']}; "
              f"known problems flagged {s['known_problem_rows_flagged']}. Wrote data/accuracy.json and data/accuracy_report.md")
        return

    rows, full = [], []
    for a in args.ai:
        ai = load(a)
        for k in args.key:
            s = score(load(k), ai)["summary"]
            full.append({"ai": rel(a), "key": rel(k), "summary": s})
            m, st = s["main"], s["strict"]
            rows.append((Path(a).name, s["model"], s["run_at"], f"{Path(k).name} (v{s['key_version']})",
                         f"{m['values_correct']} of {m['values_scored']} ({m['accuracy_pct']}%)",
                         f"{st['values_correct']} of {st['values_scored']} ({st['accuracy_pct']}%)",
                         f"{s['tests_fully_correct']} of {s['tests']}", str(s["rows_missing_from_ai_output"]),
                         [f"{s['per_field'][f]['pct']}% of {s['per_field'][f]['scored']}" if f in s["per_field"] else "-" for f in FIELDS]))
    md = ["# Accuracy test: every run scored against every answer key", "",
          "Main score leaves out the values the key marks ambiguous; the strict score counts them against the key's first reading. "
          "Version 1 of the key has no ambiguous values, so its two scores are the same.", "",
          "| Run | Model | Run at | Key | Main score | Strict score | Tests fully correct | Rows missing |", "| - | - | - | - | - | - | - | - |"]
    md += [f"| {' | '.join(r[:8])} |" for r in rows]
    md += ["", "Main score by field:", "", "| Run | Key | " + " | ".join(FIELDS) + " |", "| - | - | " + " | ".join("-" for _ in FIELDS) + " |"]
    md += [f"| {r[0]} | {r[3]} | " + " | ".join(r[8]) + " |" for r in rows]
    (DATA / "accuracy_comparison.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    (DATA / "accuracy_comparison.json").write_text(json.dumps(full, indent=1, ensure_ascii=False), encoding="utf-8")
    print("\n".join(md))
    print("\nWrote data/accuracy_comparison.md and data/accuracy_comparison.json")


if __name__ == "__main__":
    main()
