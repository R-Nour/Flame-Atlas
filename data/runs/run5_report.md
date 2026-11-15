# Accuracy test (claude-haiku-5-5, run at 2026-11-15T04:37:11)

AI output: `data/runs/run5.json`. Answer key: `data/answer_key.json` (version 2; Version 1 frozen 2026-11-14 before any run. Version 2 corrected the evening of 2026-11-14, after run 3; see 'corrections'.)

**Main score: 3058 of 3104 values correct (98.5%)** across 881 tests, with the 124 ambiguous values left out.

Strict score, counting the ambiguous values against the key's first reading: 3077 of 3228 (95.3%).

862 tests fully correct. Rows missing from the AI output: 9. AI rows that match no test in the key: 8. Duplicate AI rows: 0. Failed chunks: 1.

Known data problems flagged: 31 of 37 rows. Clean rows flagged anyway: 395 of 844.

| Field | Correct | Accuracy |
| - | - | - |
| o2_pct | 871 of 881 | 98.9% |
| pressure_psi | 871 of 881 | 98.9% |
| flow_cm_s | 4 of 13 | 30.8% |
| burn_time_s | 454 of 463 | 98.1% |
| test_end | 858 of 866 | 99.1% |

| Investigation | Correct | Accuracy |
| - | - | - |
| FLEX | 1095 of 1096 | 99.9% |
| ACME CFI-G | 713 of 713 | 100.0% |
| ACME Flame Design | 621 of 621 | 100.0% |
| Saffire-I | 8 of 8 | 100.0% |
| CFI | 237 of 237 | 100.0% |
| Saffire-II | 0 of 36 | 0.0% |
| Saffire-III | 6 of 6 | 100.0% |
| BASS-II | 378 of 387 | 97.7% |

## Ambiguous values (left out of the main score)

| Investigation | Field | Why | Values | AI matched the key's first reading | AI gave null |
| - | - | - | - | - | - |
| ACME CFI-G | test_end | the row is marked self-extinguished, but its comment says the flow was stopped by hand | 1 | 1 | 0 |
| ACME CFI-G | burn_time_s | the row says no hot ignition, but lists a burn time | 1 | 1 | 0 |
| ACME CFI-G | test_end | the row says no hot ignition, but lists a burn time and a flow-terminated code | 1 | 0 | 0 |
| BASS-II | flow_cm_s | the table doesn't state the units of its 'Air display' column | 121 | 17 | 103 |

- cfig-21102a1 test_end: key's first reading went_out, AI gave went_out
- cfig-21106f4 burn_time_s: key's first reading 22.0, AI gave 22
- cfig-21106f4 test_end: key's first reading no_ignition, AI gave stopped

## Known-problem rows the AI didn't flag

- cfig-21106f4: Marked 'no hot ignition' but lists a 22 s burn and the comment says 'hot flame'
- saffire-ii-2-4: Thickness listed as '037 mm'; the decimal point is probably missing
- saffire-ii-2-5: Thickness listed as '037 mm'; the decimal point is probably missing
- saffire-ii-2-6: Material cell is blank in the PSI table; filled in from the row above; Thickness listed as '037 mm'; the decimal point is probably missing
- saffire-ii-2-8: Thickness listed as 'See Fig. 5', a figure not in the PSI files
- saffire-ii-2-9: Material cell is blank in the PSI table; filled in from the row above

## Misses (46 of 46 shown; all are in the JSON file)

- flex-114 pressure_psi: expected null, got 0
- saffire-ii-2-1 o2_pct: expected 21.5, got (row missing)
- saffire-ii-2-1 pressure_psi: expected null, got (row missing)
- saffire-ii-2-1 flow_cm_s: expected 20.0, got (row missing)
- saffire-ii-2-1 burn_time_s: expected null, got (row missing)
- saffire-ii-2-2 o2_pct: expected 22.1, got (row missing)
- saffire-ii-2-2 pressure_psi: expected null, got (row missing)
- saffire-ii-2-2 flow_cm_s: expected 20.0, got (row missing)
- saffire-ii-2-2 burn_time_s: expected null, got (row missing)
- saffire-ii-2-3 o2_pct: expected 22.1, got (row missing)
- saffire-ii-2-3 pressure_psi: expected null, got (row missing)
- saffire-ii-2-3 flow_cm_s: expected 20.0, got (row missing)
- saffire-ii-2-3 burn_time_s: expected null, got (row missing)
- saffire-ii-2-4 o2_pct: expected 22.1, got (row missing)
- saffire-ii-2-4 pressure_psi: expected null, got (row missing)
- saffire-ii-2-4 flow_cm_s: expected 20.0, got (row missing)
- saffire-ii-2-4 burn_time_s: expected null, got (row missing)
- saffire-ii-2-5 o2_pct: expected 22.1, got (row missing)
- saffire-ii-2-5 pressure_psi: expected null, got (row missing)
- saffire-ii-2-5 flow_cm_s: expected 20.0, got (row missing)
- saffire-ii-2-5 burn_time_s: expected 145.0, got (row missing)
- saffire-ii-2-6 o2_pct: expected 22.1, got (row missing)
- saffire-ii-2-6 pressure_psi: expected null, got (row missing)
- saffire-ii-2-6 flow_cm_s: expected 20.0, got (row missing)
- saffire-ii-2-6 burn_time_s: expected 115.0, got (row missing)
- saffire-ii-2-7 o2_pct: expected 22.1, got (row missing)
- saffire-ii-2-7 pressure_psi: expected null, got (row missing)
- saffire-ii-2-7 flow_cm_s: expected 20.0, got (row missing)
- saffire-ii-2-7 burn_time_s: expected 140.0, got (row missing)
- saffire-ii-2-8 o2_pct: expected 22.05, got (row missing)
- saffire-ii-2-8 pressure_psi: expected null, got (row missing)
- saffire-ii-2-8 flow_cm_s: expected 20.0, got (row missing)
- saffire-ii-2-8 burn_time_s: expected 600.0, got (row missing)
- saffire-ii-2-9 o2_pct: expected 21.95, got (row missing)
- saffire-ii-2-9 pressure_psi: expected null, got (row missing)
- saffire-ii-2-9 flow_cm_s: expected 20.0, got (row missing)
- saffire-ii-2-9 burn_time_s: expected 900.0, got (row missing)
- bass-ii-b14 test_end: expected low_flow_out, got not_recorded
- bass-ii-b21 test_end: expected low_flow_out, got went_out
- bass-ii-m17 test_end: expected low_flow_out, got went_out
- bass-ii-o8a test_end: expected low_flow_out, got went_out
- bass-ii-p1 o2_pct: expected 17.7, got 17.6
- bass-ii-p10 test_end: expected low_flow_out, got went_out
- bass-ii-p22a test_end: expected low_flow_out, got went_out
- bass-ii-p22b test_end: expected low_flow_out, got went_out
- bass-ii-p25 test_end: expected low_flow_out, got went_out
