# Accuracy test: every run scored against every answer key

Main score leaves out the values the key marks ambiguous; the strict score counts them against the key's first reading. Version 1 of the key has no ambiguous values, so its two scores are the same.

| Run | Model | Run at | Key | Main score | Strict score | Tests fully correct | Rows missing |
| - | - | - | - | - | - | - | - |
| run3.json | claude-haiku-5-5 | 2026-11-15T00:11:20 | answer_key_v1.json (v1) | 3037 of 3228 (94.1%) | 3037 of 3228 (94.1%) | 719 of 881 | 2 |
| run3.json | claude-haiku-5-5 | 2026-11-15T00:11:20 | answer_key.json (v2) | 3045 of 3104 (98.1%) | 3087 of 3228 (95.6%) | 846 of 881 | 2 |
| run4.json | claude-haiku-5-5 | 2026-11-15T03:40:54 | answer_key_v1.json (v1) | 3065 of 3228 (95.0%) | 3065 of 3228 (95.0%) | 724 of 881 | 0 |
| run4.json | claude-haiku-5-5 | 2026-11-15T03:40:54 | answer_key.json (v2) | 3096 of 3104 (99.7%) | 3119 of 3228 (96.6%) | 873 of 881 | 0 |

Main score by field:

| Run | Key | o2_pct | pressure_psi | flow_cm_s | burn_time_s | test_end |
| - | - | - | - | - | - | - |
| run3.json | answer_key_v1.json (v1) | 98.9% of 881 | 98.9% of 881 | 40.3% of 134 | 84.7% of 464 | 97.7% of 868 |
| run3.json | answer_key.json (v2) | 99.1% of 881 | 99.2% of 881 | 100.0% of 13 | 94.0% of 463 | 98.2% of 866 |
| run4.json | answer_key_v1.json (v1) | 100.0% of 881 | 99.0% of 881 | 25.4% of 134 | 90.7% of 464 | 98.7% of 868 |
| run4.json | answer_key.json (v2) | 100.0% of 881 | 99.9% of 881 | 100.0% of 13 | 100.0% of 463 | 99.2% of 866 |
