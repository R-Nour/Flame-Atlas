# Accuracy test (claude-haiku-5-5, 2026-11-15T00:11:20)

**3033 of 3228 values correct (94.0%)** across 881 tests; 715 tests fully correct; 2 rows missing from the AI output.

Known data problems flagged: 35 of 37 rows. Clean rows flagged anyway: 357 of 844.

Excluding BASS-II airflow (units not stated in the table): 2992 of 3107 values correct (96.3%).

| Field | Accuracy |
| - | - |
| o2_pct | 98.4% |
| pressure_psi | 98.9% |
| burn_time_s | 84.7% |
| test_end | 97.7% |
| flow_cm_s | 40.3% |

| Investigation | Accuracy |
| - | - |
| FLEX | 95.3% |
| ACME CFI-G | 92.9% |
| ACME Flame Design | 99.2% |
| Saffire-I | 100.0% |
| CFI | 100.0% |
| Saffire-II | 100.0% |
| Saffire-III | 100.0% |
| BASS-II | 82.9% |

## First 40 misses

- flex-092 burn_time_s: expected 21.7, got 8.3
- flex-093 o2_pct: expected 25.0, got 24.0
- flex-093 burn_time_s: expected 8.3, got 10.1
- flex-093 test_end: expected disruption, got went_out
- flex-094 burn_time_s: expected 10.1, got 8
- flex-095 burn_time_s: expected 8.0, got 5.2
- flex-095 test_end: expected went_out, got disruption
- flex-096 burn_time_s: expected 5.2, got 26.5
- flex-096 test_end: expected disruption, got burned_out
- flex-097 burn_time_s: expected 26.5, got 22.9
- flex-097 test_end: expected burned_out, got went_out
- flex-098 burn_time_s: expected 22.9, got 33
- flex-099 burn_time_s: expected 33.0, got 6.1
- flex-100 burn_time_s: expected 6.1, got 6.5
- flex-101 o2_pct: expected 23.0, got 21.0
- flex-101 burn_time_s: expected 6.5, got 4.2
- flex-102 burn_time_s: expected 4.2, got 3.2
- flex-103 o2_pct: expected 21.0, got 23.0
- flex-103 burn_time_s: expected 3.2, got 23.2
- flex-104 burn_time_s: expected 23.2, got 30.7
- flex-104 test_end: expected went_out, got disruption
- flex-105 o2_pct: expected 23.0, got None
- flex-105 pressure_psi: expected 10.34, got None
- flex-105 burn_time_s: expected 30.7, got None
- flex-105 test_end: expected disruption, got None
- flex-107 burn_time_s: expected 15.1, got 24.3
- flex-107 test_end: expected disruption, got burned_out
- flex-108 o2_pct: expected 23.0, got 21
- flex-108 burn_time_s: expected 24.3, got None
- flex-108 test_end: expected burned_out, got went_out
- flex-109 burn_time_s: expected None, got 13
- flex-110 burn_time_s: expected 13.0, got 16.4
- flex-110 test_end: expected went_out, got burned_out
- flex-111 pressure_psi: expected 10.38, got 10.262
- flex-111 burn_time_s: expected 16.4, got 25.2
- flex-112 o2_pct: expected 21.0, got 20
- flex-112 burn_time_s: expected 25.2, got 18.2
- flex-112 test_end: expected burned_out, got went_out
- flex-113 pressure_psi: expected 10.34, got 0
- flex-113 burn_time_s: expected 18.2, got 18.9
