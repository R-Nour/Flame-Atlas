#!/usr/bin/env python3
"""Accuracy test, step 2: score data/ai_extracted.json against the frozen answer key.

Writes data/accuracy.json and data/accuracy_report.md, and prints a one-line summary.
Usage:  python tools/check.py
"""
import collections
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def num(v):
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return "not a number"


def correct(field, exp, got, tol):
    want = exp["value"]
    if want is None:
        return got in (None, "", "null")
    g = num(got)
    if not isinstance(g, float):
        return False
    if field == "o2_pct":
        lo, hi = exp.get("accept", [want, want])
        return lo - tol["o2_pct"] <= g <= hi + tol["o2_pct"]
    if field == "pressure_psi":
        return abs(g - want) <= max(tol["pressure_psi_relative"] * abs(want), 0.02)
    return abs(g - want) <= tol[field]


def main():
    key = json.loads((DATA / "answer_key.json").read_text(encoding="utf-8"))
    ai = json.loads((DATA / "ai_extracted.json").read_text(encoding="utf-8"))
    tol = key["tolerances"]
    got_by = {}
    for t in ai["tests"]:
        m = re.search(r"\d+", str(t.get("line", "")))
        if m:
            got_by[(t.get("file"), int(m.group()))] = t

    per_field = collections.defaultdict(lambda: [0, 0])
    per_inv = collections.defaultdict(lambda: [0, 0])
    misses, missing_rows, fully = [], 0, 0
    flagged_known = known = flagged_clean = clean = 0

    for k in key["tests"]:
        g = got_by.get((k["file"], k["line"]))
        if g is None:
            missing_rows += 1
        all_ok = True
        for field, exp in k["expected"].items():
            if field == "test_end":
                ok = g is not None and g.get("test_end") == exp["value"]
            else:
                ok = g is not None and correct(field, exp, g.get(field), tol)
            per_field[field][0] += ok
            per_field[field][1] += 1
            per_inv[k["investigation"]][0] += ok
            per_inv[k["investigation"]][1] += 1
            if not ok:
                all_ok = False
                misses.append({"id": k["id"], "field": field, "expected": exp, "got": None if g is None else g.get(field), "row": k["row"]})
        fully += all_ok
        raised = bool(g and g.get("problems"))
        if k["known_problems"]:
            known += 1
            flagged_known += raised
        else:
            clean += 1
            flagged_clean += raised

    right = sum(v[0] for v in per_field.values())
    total = sum(v[1] for v in per_field.values())
    pct = lambda a, b: round(100 * a / b, 1) if b else None
    summary = {
        "model": ai.get("model"), "run_at": ai.get("run_at"),
        "values_correct": right, "values_scored": total, "accuracy_pct": pct(right, total),
        "tests_fully_correct": fully, "tests": len(key["tests"]), "rows_missing_from_ai_output": missing_rows,
        "per_field_pct": {f: pct(*v) for f, v in per_field.items()},
        "per_investigation_pct": {i: pct(*v) for i, v in per_inv.items()},
        "known_problem_rows_flagged": f"{flagged_known} of {known}",
        "clean_rows_flagged": f"{flagged_clean} of {clean}",
        "failed_chunks": len(ai.get("errors", [])),
    }
    (DATA / "accuracy.json").write_text(json.dumps({"summary": summary, "misses": misses}, indent=1, ensure_ascii=False), encoding="utf-8")

    lines = [f"# Accuracy test ({summary['model']}, {summary['run_at']})", "",
             f"**{right} of {total} values correct ({summary['accuracy_pct']}%)** across {len(key['tests'])} tests; "
             f"{fully} tests fully correct; {missing_rows} rows missing from the AI output.", "",
             f"Known data problems flagged: {summary['known_problem_rows_flagged']} rows. Clean rows flagged anyway: {summary['clean_rows_flagged']}.", "",
             "| Field | Accuracy |", "| - | - |"] + [f"| {f} | {p}% |" for f, p in summary["per_field_pct"].items()] + [
             "", "| Investigation | Accuracy |", "| - | - |"] + [f"| {i} | {p}% |" for i, p in summary["per_investigation_pct"].items()] + [
             "", "## First 40 misses", ""] + [f"- {m['id']} {m['field']}: expected {m['expected']['value']}, got {m['got']}" for m in misses[:40]]
    (DATA / "accuracy_report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Accuracy: {right}/{total} values ({summary['accuracy_pct']}%); tests fully correct {fully}/{len(key['tests'])}; "
          f"known problems flagged {summary['known_problem_rows_flagged']}; clean rows flagged {summary['clean_rows_flagged']}")


if __name__ == "__main__":
    main()
