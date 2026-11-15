# Flame Atlas

Decades of NASA microgravity fire experiments, organized around one question: in a Moon Base atmosphere (30%+ oxygen at 10.2 psi or less), does shutting off the airflow still put out a fire?

Built for the NASA Space Apps Challenge 2026, "Flame in Freefall".

## Data
- `data/records.json`: 30 investigations, 895 tests and 69 sources (NASA PSI datasets, reports and papers, with DOIs and links).
- `data/tests.csv`: one row per test, with oxygen, pressure, airflow, Moon Base zone and outcome.
- `data/cards_digest.json`: a compact summary of each investigation.
- `data/rankings.json`: the investigations ranked by how directly they inform the headline question, each with a reason and the evidence it relies on.
- `data/cached_answers.json`: saved answers to the five demo questions, checked by hand, used when the live Ask box can't answer.
- `data/raw/`: the original NASA PSI experiment tables.

## How the data was built and checked
Values were extracted with Claude from NASA PSI experiment tables, metadata and reports. Every value is tied to a verbatim quote with its page or line: 3,141 quotes in all. 3,101 were machine-checked word for word against the source files, and 13 more write out values from two Saffire papers' tables, which were checked cell by cell against the tables' columns. The other 27 are DOIs from the challenge's resource list (26) and one note of a message on the PSI site. Three online papers (ICES 2019, 2021 and 2024) were first read through an AI web-reading tool; once the files were attached, all of their quotes were checked the same way, and all matched. Problems found in the source files are recorded as caveats rather than silently fixed.

**Hand check.** A person checked 30 values against the original files (`data/spot_check.csv`): 20 random fire tests drawn from `tests.csv` and 10 headline claims. All 30 quotes were found, and 29 of the 30 values matched. The one mismatch, CFI airflow recorded as 0 cm/s when the CFI report never states an airflow, is fixed: it is now "not stated", with still air given as our inference. The check also found seven places where our wording went further than the source, all now reworded; for example, BRE flames "generally" kept burning at 26.5% oxygen and above, and one 27% test went out by itself. It also found one new data problem: the FLEX report's Tables VIII and IX disagree on CO2, N2 and droplet size for tests 162-165. Every fix is listed in `data/records.json` under `meta.hand_check`. The smoke tables (PSI-101 and PSI-102) were machine-checked only. The answer-key corrections are listed for the same kind of hand check in `data/key_corrections_check.csv`.

## Run and deploy
The site is built by hand in Framer. This repo supplies the data, the Ask API and two Framer code components.

```
api/ask.js              Ask API (Vercel serverless function)
framer/AskBox.tsx       Ask box component
framer/MoonBaseMap.tsx  scatter of tests by pressure and oxygen
vercel.json, package.json, .env.example
```

### The Ask API
`POST /api/ask` with `{"question": "..."}` (300 characters at most) returns `{answer, cited_cards}`. It sends `data/cards_digest.json` to `claude-sonnet-5-5` as a cached system block and answers only from it, citing card, source and page or line. If the key is missing or the call fails, it returns the matching entry from `data/cached_answers.json`, or a friendly error. It allows 10 requests per IP per minute (counted per server instance, so a brake on casual abuse, not a guarantee), and only answers browsers from the origins in `ALLOWED_ORIGIN`.

**Run it on your computer** (Node 18 or newer):
```
npm install
export ANTHROPIC_API_KEY=your-key      # never put the key in a file in the repo
npx vercel dev
curl -X POST http://localhost:3000/api/ask -H "Content-Type: application/json" \
  -d '{"question": "Does turning off the fans put out a fire in Moon Base air?"}'
```
Without a key the same call returns the saved answer for that question.

**Deploy it on Vercel:**
1. Push this repo to GitHub, then in Vercel choose Add New, Project and import it. Leave the framework as Other.
2. Under Environment Variables add `ANTHROPIC_API_KEY` (your Anthropic key) and `ALLOWED_ORIGIN` (your Framer site's address, e.g. `https://your-site.framer.website`; separate several with commas, and include the custom domain once you have one).
3. Deploy. Every push to `main` redeploys. The API is then at `https://YOUR-PROJECT.vercel.app/api/ask`.
4. In the Anthropic Console, set a monthly spend limit for the key.

### The Framer components
In Framer, add a code component (Assets, Code, New), paste in a file from `framer/`, and drop it on the page.
- `AskBox.tsx`: set **API URL** to your Vercel address. Each visitor gets 10 questions a day, counted in their browser (`localStorage`, with a fallback if storage is blocked). After 10, or if the API fails, it shows the saved answers instead. A visitor can reset the count by clearing site data, so the spend limit is the real cap.
- `MoonBaseMap.tsx`: needs no setup. It plots every test with both oxygen and pressure (881 of 895) on a log pressure axis, shades the Moon Base zone and edge band, and shows test id, outcome and source on hover or tap. The axis ranges are properties.

Both load their data from jsDelivr (`https://cdn.jsdelivr.net/gh/R-Nour/Flame-Atlas@main/data/...`), which caches files for up to about a day. After changing a data file, refresh it by opening `https://purge.jsdelivr.net/gh/R-Nour/Flame-Atlas@main/data/tests.csv` (and the same for `cached_answers.json`).

## Accuracy test
Can an AI read NASA's raw experiment tables reliably? `tools/extract.py` has Claude Haiku 5.5 (`claude-haiku-5-5`) read 8 PSI tables in `data/raw/` on its own (881 tests). `tools/check.py` scores five values per test against a verified answer key (`data/answer_key.json`): oxygen, pressure (converted to psi), airflow, burn time and how the test ended. A number counts as correct within 0.05 (percentage points of oxygen, cm/s, or seconds) or within 1% for pressure.

**Results (answer key version 2), two runs of exactly the same setup:**
- **Run 4: 3,096 of 3,104 values correct (99.7%); 873 of 881 tests fully correct.**
- **Run 5: 3,058 of 3,104 values correct (98.5%); 862 of 881 tests fully correct.**

Run 5 lost one chunk of 9 Saffire-II tests, which accounts for 36 of its 46 misses (see "Run 5: a repeat" below). Neither run is the "real" score; together they show the run-to-run spread.

The 3,104 values are the ones with one clear right answer. Another 124 are marked ambiguous because the source itself doesn't settle them: BASS-II airflow, whose unit the table never states (121 values), and three values in two ACME CFI-G rows that contradict themselves. Counting those against our first reading, the score is 3,119 of 3,228 (96.6%). Against the original, uncorrected key it is 3,065 of 3,228 (95.0%) for run 4 and 3,020 of 3,228 (93.6%) for run 5.

Every run is scored against both versions of the key (`data/accuracy_comparison.md`):

| Run | Key | Main score | Strict score (every value) | Tests fully correct | Rows missing |
| - | - | - | - | - | - |
| 3 | version 1 | 3,037 / 3,228 (94.1%) | 3,037 / 3,228 (94.1%) | 719 / 881 | 2 |
| 3 | version 2 | 3,045 / 3,104 (98.1%) | 3,087 / 3,228 (95.6%) | 846 / 881 | 2 |
| 4 | version 1 | 3,065 / 3,228 (95.0%) | 3,065 / 3,228 (95.0%) | 724 / 881 | 0 |
| 4 | version 2 | 3,096 / 3,104 (99.7%) | 3,119 / 3,228 (96.6%) | 873 / 881 | 0 |
| 5 (repeat of 4) | version 1 | 3,020 / 3,228 (93.6%) | 3,020 / 3,228 (93.6%) | 709 / 881 | 9 |
| 5 (repeat of 4) | version 2 | 3,058 / 3,104 (98.5%) | 3,077 / 3,228 (95.3%) | 862 / 881 | 9 |

The full scored reports, including every value missed and how often the known problems in the tables were flagged, are `data/runs/run4_report.md` and `data/runs/run5_report.md` (with `run4_report.json` and `run5_report.json`). `data/accuracy_report.md` is a copy of run 4's. Raw output for runs 2 to 5 is in `data/runs/`.

### What changed between runs, and why
- **Runs 1 and 2.** Run 1 scored 2,120 of 3,228 (65.7%) against key version 1, with 298 rows missing from the output (`data/accuracy_report_run1.md`; its raw output was overwritten by the next run and is not kept). Run 2 scored 2,985 of 3,228 (92.5%) against key version 1, as first scored (2,992, 92.7%, with today's checker). The changes between runs 1 and 2 were to how the script ran: the fixed temperature setting (`temperature=0` in the first version) was removed, rows go to the model in chunks of 15 instead of 40, failed calls are retried up to 6 times with waits, replies may be longer (16,000 tokens instead of 8,000), and the script saves after every chunk and can resume. Run 3 added one general prompt line: `line` must be the number in the row's `L<n>` label, never a value from inside the row, and every row needs an object.
- **Run 3 to run 4: how rows are matched.** In run 3 the model sometimes labelled rows with the table's own test number instead of the line label, which shifted answers onto the wrong rows in one stretch of the FLEX table. In run 4 the model returns exactly one answer per row, in order, each with the first 30 characters of its row and an `is_test` flag (false for header, note or blank rows). The script checks the count and every echo (ignoring case and extra spaces), retries a chunk that doesn't match up to 3 times and otherwise records it as failed, assigns line numbers itself from each row's position, and drops rows flagged `is_test` false. In the run 4 output, 12 chunk replies were retried and none failed. Nothing in this change refers to specific rows.
- **Run 5: a repeat.** Run 5 used exactly the same code, prompt, settings and keys as run 4 (`python tools/extract.py --chunk 15 --fresh`), to measure how much the score varies by chance. It scored 3,058 of 3,104 (98.5%) against key version 2, against 3,096 (99.7%) for run 4, and 3,020 of 3,228 (93.6%) against version 1, against 3,065 (95.0%). The difference is mostly one lost chunk: for the first 15-row chunk of the Saffire-II table (9 tests), the model's echo of the row start was one character off on each of 4 attempts, so the chunk was recorded as failed and those 9 rows are missing. That alone accounts for 36 of run 5's 46 misses. Diagnostic only (the main score above still counts the 9 empty rows as wrong): on the rows it did return, leaving out those 9, run 5 got 3,058 of 3,068 values correct (99.7%), the same rate as run 4. Its replies needed 16 retries (run 4: 12), and it flagged fewer of the 37 known problems (31, against 36 in run 4, partly because the lost rows can't be flagged) and more clean rows (395 of 844, against 340). Repeat runs of the same setup can therefore differ by about 1 percentage point on the main score, mostly from whether a chunk is lost. The run was not repeated to retry the failed chunk.
- **An intermediate run.** Between runs 3 and 4 there was one run whose echo was only the row's first two cells. It scored 3,070 of 3,228 (95.1%) against key version 1 and 3,094 of 3,104 (99.7%) against version 2 with today's checker, with no rows missing (`data/runs/run3b_two_cell_row_start.json`). We lengthened the echo because in the CFI-G, Flame Design and BASS-II tables neighbouring rows begin with the same two cells. It is not in the table above.
- **Key version 1 to version 2.** After run 3 we audited every miss against the source table and found errors in the key, listed in `data/answer_key.json` under "corrections":
  - oxygen for ACME CFI-G and Flame Design is now the table's exact value instead of a rounded one;
  - Flame Design pressure accepts any of the three values the table lists for a test (initial, final or mean);
  - CFI-G burn time is the table's own number (0 for no ignition);
  - four BASS-II test endings were re-read from the notes in the table's fan and airflow columns;
  - oxygen cells that give a range now expect the midpoint, as the instructions say;
  - values the source doesn't settle are marked ambiguous and left out of the main score.

  Each reason for marking a value ambiguous was recorded as a caveat in `data/records.json` before any AI run. One correction counted against the AI: in run 3 it had, like key version 1, missed that BASS-II test M17 went out.
- **Checker fix.** A difference exactly on a tolerance edge (39.05 against 39.1) was being rejected because of floating-point rounding. Fixing it moved run 3 against key version 1 from 3,033 (94.0%, as first reported) to 3,037 (94.1%).

### Limits
- The key corrections and the run 4 protocol were both developed on these same 8 tables after seeing run 3's errors, and there was no held-out table, so the scores are probably somewhat optimistic. That is why the scores against the original key are reported too.
- Auditing the AI's misses can't find errors that the key and the AI share. The hand checks above are the independent check on the key; their result columns in `data/spot_check.csv` and `data/key_corrections_check.csv` are still blank.
- The key is frozen at version 2: nothing was changed after run 4.
- The test covers the PSI tables only, which are structured data and the easiest case. Values taken from PDF reports were checked by quote matching and by hand, not by this test.
- The model runs without a fixed temperature, so scores vary from run to run: runs 4 and 5 are identical in setup and differ by 1.2 points on the main score (99.7% and 98.5%) against key version 2. We have one repeat, so the size of the variation is only roughly known.

### Running it
```
pip install -r requirements.txt
export ANTHROPIC_API_KEY=...   # or set it as a GitHub Codespaces secret
python tools/extract.py --chunk 15 --fresh
python tools/check.py
python tools/check.py --ai data/runs/run3.json data/runs/run4.json data/runs/run5.json --key data/answer_key_v1.json data/answer_key.json
```

## License
MIT. NASA data is credited to its sources in `data/records.json`.
