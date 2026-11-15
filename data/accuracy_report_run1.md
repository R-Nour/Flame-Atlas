# Accuracy test (claude-haiku-5-5, 2026-11-14T22:23:36)

**2120 of 3228 values correct (65.7%)** across 881 tests; 522 tests fully correct; 298 rows missing from the AI output.

Known data problems flagged: 24 of 37 rows. Clean rows flagged anyway: 153 of 844.

| Field | Accuracy |
| - | - |
| o2_pct | 65.7% |
| pressure_psi | 65.8% |
| burn_time_s | 81.7% |
| test_end | 65.6% |
| flow_cm_s | 9.7% |

| Investigation | Accuracy |
| - | - |
| FLEX | 85.1% |
| ACME CFI-G | 93.4% |
| ACME Flame Design | 32.9% |
| Saffire-I | 100.0% |
| CFI | 100.0% |
| Saffire-II | 100.0% |
| Saffire-III | 100.0% |
| BASS-II | 5.3% |

## First 40 misses

- flex-001 o2_pct: expected 21.0, got None
- flex-001 pressure_psi: expected 14.65, got None
- flex-001 burn_time_s: expected 4.3, got None
- flex-001 test_end: expected disruption, got None
- flex-002 o2_pct: expected 21.0, got None
- flex-002 pressure_psi: expected 14.73, got None
- flex-002 burn_time_s: expected 5.0, got None
- flex-002 test_end: expected went_out, got None
- flex-003 o2_pct: expected 21.0, got None
- flex-003 pressure_psi: expected 14.78, got None
- flex-003 burn_time_s: expected 3.2, got None
- flex-003 test_end: expected went_out, got None
- flex-004 o2_pct: expected 21.0, got None
- flex-004 pressure_psi: expected 14.7, got None
- flex-004 burn_time_s: expected 7.64, got None
- flex-004 test_end: expected went_out, got None
- flex-005 o2_pct: expected 21.0, got None
- flex-005 pressure_psi: expected 14.7, got None
- flex-005 burn_time_s: expected 6.34, got None
- flex-005 test_end: expected went_out, got None
- flex-006 o2_pct: expected 21.0, got None
- flex-006 pressure_psi: expected 14.7, got None
- flex-006 burn_time_s: expected 9.6, got None
- flex-006 test_end: expected went_out, got None
- flex-007 o2_pct: expected 21.0, got None
- flex-007 pressure_psi: expected 14.72, got None
- flex-007 burn_time_s: expected 5.3, got None
- flex-007 test_end: expected disruption, got None
- flex-008 o2_pct: expected 21.0, got None
- flex-008 pressure_psi: expected 14.74, got None
- flex-008 burn_time_s: expected 14.8, got None
- flex-008 test_end: expected disruption, got None
- flex-009 o2_pct: expected 21.0, got None
- flex-009 pressure_psi: expected 14.7, got None
- flex-009 burn_time_s: expected None, got None
- flex-009 test_end: expected disruption, got None
- flex-010 o2_pct: expected 21.0, got None
- flex-010 pressure_psi: expected 44.86, got None
- flex-010 burn_time_s: expected 13.6, got None
- flex-010 test_end: expected went_out, got None
