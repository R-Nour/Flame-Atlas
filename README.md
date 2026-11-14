# Flame Atlas

Decades of NASA microgravity fire experiments, organized around one question: in a Moon Base atmosphere (30%+ oxygen at 10.2 psi or less), does shutting off the airflow still put out a fire?

Built for the NASA Space Apps Challenge 2026, "Flame in Freefall".

## Data
- `data/records.json`: 30 investigations, 895 tests and 69 sources (NASA PSI datasets, reports and papers, with DOIs and links).
- `data/tests.csv`: one row per test, with oxygen, pressure, airflow, Moon Base zone and outcome.
- `data/cards_digest.json`: a compact summary of each investigation.

## How the data was built and checked
Values were extracted with Claude from NASA PSI experiment tables, metadata and reports. Every value is tied to a verbatim quote with a page or line number, and all 2,547 quotes were machine-checked word for word against the source files. A person then spot-checked 30 values against the originals (`data/spot_check.csv`). Problems found in the source files are recorded as caveats rather than silently fixed.

## Accuracy test
`data/answer_key.json` holds verified values for 881 tests from 8 NASA PSI experiment tables (`data/raw/`). `tools/extract.py` has Claude read the raw tables on its own, and `tools/check.py` scores its output against the key: oxygen, pressure (converted to psi), airflow, burn time and how each test ended, plus whether it flags the known problems in the tables. Results: `data/accuracy_report.md`.

## License
MIT. NASA data is credited to its sources in `data/records.json`.
