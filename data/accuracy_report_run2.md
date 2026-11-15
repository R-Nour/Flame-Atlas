# Accuracy test (claude-haiku-5-5, 2026-11-14T23:41:16)

**2985 of 3228 values correct (92.5%)** across 881 tests; 681 tests fully correct; 3 rows missing from the AI output.

Known data problems flagged: 36 of 37 rows. Clean rows flagged anyway: 420 of 844.

| Field | Accuracy |
| - | - |
| o2_pct | 96.7% |
| pressure_psi | 98.2% |
| burn_time_s | 81.7% |
| test_end | 97.5% |
| flow_cm_s | 32.1% |

| Investigation | Accuracy |
| - | - |
| FLEX | 92.0% |
| ACME CFI-G | 93.4% |
| ACME Flame Design | 98.4% |
| Saffire-I | 100.0% |
| CFI | 100.0% |
| Saffire-II | 100.0% |
| Saffire-III | 100.0% |
| BASS-II | 80.7% |

## First 40 misses

- flex-076 o2_pct: expected 13.0, got 14
- flex-076 burn_time_s: expected 8.9, got 8.5
- flex-077 burn_time_s: expected 8.5, got 12.9
- flex-078 o2_pct: expected 14.0, got 13
- flex-078 burn_time_s: expected 12.9, got 1.5
- flex-079 burn_time_s: expected 1.5, got 1
- flex-080 burn_time_s: expected 1.0, got 1.5
- flex-081 burn_time_s: expected 1.5, got 7.5
- flex-082 o2_pct: expected 13.0, got 12
- flex-082 pressure_psi: expected 14.78, got 14.928
- flex-082 burn_time_s: expected 7.5, got 5.45
- flex-083 burn_time_s: expected 5.45, got 10.8
- flex-084 burn_time_s: expected 10.8, got 9.3
- flex-085 burn_time_s: expected 9.3, got 9
- flex-086 burn_time_s: expected 9.0, got 9.3
- flex-087 o2_pct: expected 12.0, got 25
- flex-087 pressure_psi: expected 14.91, got 10.3935
- flex-087 burn_time_s: expected 9.3, got 14.8
- flex-087 test_end: expected went_out, got disruption
- flex-088 burn_time_s: expected 14.8, got 24
- flex-089 burn_time_s: expected 24.0, got 20.1
- flex-090 o2_pct: expected 25.0, got None
- flex-090 pressure_psi: expected 10.43, got None
- flex-090 burn_time_s: expected 20.1, got None
- flex-090 test_end: expected disruption, got None
- flex-107 burn_time_s: expected 15.1, got 24.3
- flex-107 test_end: expected disruption, got burned_out
- flex-108 o2_pct: expected 23.0, got 21
- flex-108 burn_time_s: expected 24.3, got None
- flex-108 test_end: expected burned_out, got went_out
- flex-109 burn_time_s: expected None, got 13
- flex-110 burn_time_s: expected 13.0, got 16.4
- flex-110 test_end: expected went_out, got burned_out
- flex-111 pressure_psi: expected 10.38, got 10.26
- flex-111 burn_time_s: expected 16.4, got 25.2
- flex-112 o2_pct: expected 21.0, got 20
- flex-112 burn_time_s: expected 25.2, got 18.2
- flex-112 test_end: expected burned_out, got went_out
- flex-113 pressure_psi: expected 10.34, got 0
- flex-113 burn_time_s: expected 18.2, got 18.9
