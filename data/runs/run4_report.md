# Accuracy test (claude-haiku-5-5, run at 2026-11-15T03:40:54)

AI output: `data/runs/run4.json`. Answer key: `data/answer_key.json` (version 2; Version 1 frozen 2026-11-14 before any run. Version 2 corrected the evening of 2026-11-14, after run 3; see 'corrections'.)

**Main score: 3096 of 3104 values correct (99.7%)** across 881 tests, with the 124 ambiguous values left out.

Strict score, counting the ambiguous values against the key's first reading: 3119 of 3228 (96.6%).

873 tests fully correct. Rows missing from the AI output: 0. AI rows that match no test in the key: 8. Duplicate AI rows: 0. Failed chunks: 0.

Known data problems flagged: 36 of 37 rows. Clean rows flagged anyway: 340 of 844.

| Field | Correct | Accuracy |
| - | - | - |
| o2_pct | 881 of 881 | 100.0% |
| pressure_psi | 880 of 881 | 99.9% |
| flow_cm_s | 13 of 13 | 100.0% |
| burn_time_s | 463 of 463 | 100.0% |
| test_end | 859 of 866 | 99.2% |

| Investigation | Correct | Accuracy |
| - | - | - |
| FLEX | 1095 of 1096 | 99.9% |
| ACME CFI-G | 711 of 713 | 99.7% |
| ACME Flame Design | 621 of 621 | 100.0% |
| Saffire-I | 8 of 8 | 100.0% |
| CFI | 237 of 237 | 100.0% |
| Saffire-II | 36 of 36 | 100.0% |
| Saffire-III | 6 of 6 | 100.0% |
| BASS-II | 382 of 387 | 98.7% |

## Ambiguous values (left out of the main score)

| Investigation | Field | Why | Values | AI matched the key's first reading | AI gave null |
| - | - | - | - | - | - |
| ACME CFI-G | test_end | the row is marked self-extinguished, but its comment says the flow was stopped by hand | 1 | 1 | 0 |
| ACME CFI-G | burn_time_s | the row says no hot ignition, but lists a burn time | 1 | 1 | 0 |
| ACME CFI-G | test_end | the row says no hot ignition, but lists a burn time and a flow-terminated code | 1 | 0 | 0 |
| BASS-II | flow_cm_s | the table doesn't state the units of its 'Air display' column | 121 | 21 | 90 |

- cfig-21102a1 test_end: key's first reading went_out, AI gave went_out
- cfig-21106f4 burn_time_s: key's first reading 22.0, AI gave 22
- cfig-21106f4 test_end: key's first reading no_ignition, AI gave stopped

## Known-problem rows the AI didn't flag

- cfig-21106f4: Marked 'no hot ignition' but lists a 22 s burn and the comment says 'hot flame'

## Misses (8 of 8 shown; all are in the JSON file)

- flex-114 pressure_psi: expected null, got 0
- cfig-21088p1 test_end: expected went_out, got stopped
- cfig-21162f1 test_end: expected no_ignition, got not_recorded
- bass-ii-b14 test_end: expected low_flow_out, got not_recorded
- bass-ii-m17 test_end: expected low_flow_out, got went_out
- bass-ii-o4 test_end: expected low_flow_out, got not_recorded
- bass-ii-o8a test_end: expected low_flow_out, got went_out
- bass-ii-p10 test_end: expected low_flow_out, got went_out
