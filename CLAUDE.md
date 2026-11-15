# Flame Atlas: brief for Claude Code

## What this project is
Flame Atlas is a NASA Space Apps Challenge 2026 entry for the "Flame in Freefall" challenge. It is a dashboard over NASA Physical Sciences Informatics (PSI) microgravity-combustion data that summarizes, ranks and interprets findings for fire safety in a Moon Base atmosphere: oxygen 30% or more at 10.2 psi or less.

Headline question: does shutting off the fans (airflow) still stop a fire in Moon Base conditions?

The website is built by hand in Framer. This repo holds the data, a small serverless API for the site's "Ask" box, and code components that Framer imports. Submission deadline: Sunday Nov 15, 2026; target 7 PM US Eastern.

## The data (already built and checked; do not edit by hand)
- `data/records.json` is the master dataset: 30 investigation cards, 895 tests, 69 sources. Every value carries `evidence` items {source, quote, page or line, check}. Of its 3,141 quotes, 3,101 were machine-checked word for word against the source files and 13 write out table values that were checked cell by cell; the other 27 are DOIs and one note. Top-level keys: meta, sources, habitats, gaps, limits, coverage, smoke_particles, smoke_tests, jet_flame_runs, investigations, tests.
- `data/tests.csv` has one row per test: o2_pct, pressure_kpa, pressure_psi, flow_cm_s, flow_direction, moon_base_zone (inside / edge / outside / unknown), outcome, test_end, burn_time_s, source, source_url.
- `data/cards_digest.json` is a compact version of the 30 cards (about 100 KB), for the site and the API. Each card has key fields, findings with up to 4 evidence quotes, caveats, and test counts by zone.
- `data/spot_check.csv` records the hand check of 30 values (all 30 quotes found, 29 values matched; the fixes are listed in records.json under meta.hand_check). `data/key_corrections_check.csv` lists every kind of answer-key correction for the same hand check.
- `data/answer_key.json` is the answer key for the accuracy test (881 tests from the PSI tables in `data/raw/`), version 2, frozen. `data/answer_key_v1.json` is the original. Never edit either.
- `data/raw/` holds the original NASA PSI experiment tables (CSV). `PSI-69_Experimental_table_FLEX.csv` is Windows-1252 encoded.

Moon Base zone: inside means oxygen >= 30% and pressure <= 10.2 psi. Edge means oxygen >= 29.5% and pressure <= 10.6 psi.

Rules:
1. Never change a value, quote or caveat in the data files. If something looks wrong, add a line to `data/issues.md` instead.
2. Anything the site or the API states must cite a card or test and its source (title plus page or line).
3. Keep "our interpretation" separate from what a source says. Cards mark ours as `our_note`.
4. Never commit API keys. The key lives only in Vercel environment variables.

## What the data says (so outputs stay consistent)
- BASS-II (PSI-25, 13.6-22.2% oxygen, about 1 atm): 17 tests record flames going out as the airflow was turned down; 7 blew out when it was turned up. From its own rod tests, the summary report finds that at low airflow, the slower the airflow, the more oxygen a flame needs; it also cites an earlier space experiment (its Ref. 11) in which flames spread with no airflow at all at higher oxygen levels.
- ACME BRE (PSI-20, no airflow at all): in normal air (21% oxygen) every flame went out by itself within 40 s; at 26.5% oxygen and above, flames generally kept burning steadily, including at 34% oxygen and 8.2 psia (test 19070D1, inside the Moon Base zone), but one 27% test (19056F1) went out by itself at 45 s. Results are labelled preliminary, and BRE imitates solids with a gas burner.
- Saffire V (25-26% oxygen, about 10.3 psi): turning the fan off put out two PMMA samples immediately, but only after 300 s at a reduced 5 cm/s airflow to cool them; a cotton flame survived 70 s with the fan off and grew back. In Saffire IV-2 (22% oxygen), PMMA kept burning through a 15 s fan-off.
- Together: "fans off" works up to about station-air oxygen and stops working reliably somewhere around 26.5% oxygen in still air, so for Moon Base air the answer is "probably not".
- Detection: SAME's model of smoke in the ISS US Lab found smoke spreads by ventilation mixing and detection can be slow; it never tested fans off. DAFT found ISS air very clean, but Velcro made particle counts jump.
- The cards' caveats include many data problems found in the PSI files (spreadsheet auto-fill errors, wrong dates, duplicate rows, mislabelled units). These are a feature of the site ("what we found in NASA's data").

## Tasks, in order. Stop after each one and show me the result.
0. **Accuracy test: done.** Against key version 2, run 4 scored 3,096 of 3,104 unambiguous values (99.7%) and run 5, an identical repeat that lost one 9-row chunk, scored 3,058 of 3,104 (98.5%); the README's accuracy section has every run and every disclosure, and `data/accuracy_comparison.md` has the full table. Raw outputs are in `data/runs/`.
   - The API key comes from a Codespaces secret named `ANTHROPIC_API_KEY` (GitHub → Settings → Secrets and variables → Codespaces). Never write it into a file.
   - Don't change either answer key, `tools/check.py`, `tools/extract.py` or the prompt, and don't start a new run unless I ask. Every run gets reported, so if I do ask for one, keep its output in `data/runs/` and add it to the README table.
1. **Ask API.** Create a Vercel serverless function `api/ask.js` (Node 18+, `@anthropic-ai/sdk`). POST `{question}` (max 300 characters) returns `{answer, cited_cards}`.
   - Send `data/cards_digest.json` as a system block with prompt caching, plus the question, to model `claude-sonnet-5-5`, max_tokens about 500.
   - System rules: answer only from the digest; cite card name, source and page or line; if the data doesn't answer it, say so; plain language, 120 words or fewer; never invent numbers; mention a caveat when it matters.
   - CORS limited to the Framer site's origin (env `ALLOWED_ORIGIN`). Add a simple per-IP rate limit.
   - If the key is missing or the API fails, return the matching entry from `data/cached_answers.json`, or a friendly error.
2. **Cached answers.** Run the 5 demo questions below through the API and save `data/cached_answers.json` for my review.
3. **Rankings.** Write `data/rankings.json`: the 30 investigations ranked by how directly they inform the headline question, each with a one-sentence reason and the evidence it relies on (copied from the digest). Show me before saving.
4. **Framer code components** in `framer/`:
   - `MoonBaseMap.tsx`: scatter of tests.csv with pressure (psi) on x and oxygen (%) on y, the inside zone and edge band shaded, points colored by investigation, and a tooltip with test id, outcome and source.
   - `AskBox.tsx`: question input that calls the deployed API and shows the answer and cited cards, falling back to cached answers.
   - Load data from jsDelivr (`https://cdn.jsdelivr.net/gh/OWNER/REPO@main/data/...`, owner and repo from `git remote -v`).
5. **README.md**: expand it with how to run and deploy, and keep the data and method sections.

## Demo questions
1. Does turning off the fans put out a fire in Moon Base air?
2. What tests exist at 30% oxygen or more and low pressure?
3. Which materials behaved differently in microgravity than on Earth?
4. Can a flame relight after it seems to go out?
5. How long does smoke take to reach a detector on the ISS?

## Deploying
Import the GitHub repo in Vercel, set `ANTHROPIC_API_KEY` and `ALLOWED_ORIGIN`, and deploy. Set a monthly spend limit in the Anthropic Console.
