# foodpipe BUILD_REPORT v1.0 (2026-10-22)

v0.3 → v1.0 is a targeted fix pass after the independent review (`REVIEW_v0.3.md`). The method is unchanged. No source values, column names or citation files were changed. Translation and the existing Haiku/Sonnet verdicts were not re-run, except for the 346 CNF↔USDA pairs. The v0.3 report (per-source detail, dedup design) is kept as `docs/BUILD_REPORT_v0.3.md`.

**Check status: all automated checks pass (0 mismatches, 0 dedup-check failures). One caveat is on the sample check: I read the 100-cluster sample myself, so it is less independent than the review. See §4.**

Build: 26,565 foods (26,491 active, 74 superseded), 20,492 clusters, 4,686 multi-source clusters, QA flags error 0 / warning 255 / info 14,474, borrowed values 44,529 (v0.3: 47,301).

## 1. Before / after per finding

| Finding | Check | v0.3 | v1.0 |
|---|---|---|---|
| **B1** wrong basis | 240 records (206 CoFID "weighed…", 34 Foundation "0% moisture") labelled "edible portion" | 240 | 0 (now "as purchased (incl. refuse)" / "dry matter") |
| | of them is_preferred | 216 | 29 (17 Foundation beans, ~12 CoFID; none has a standard-basis twin) |
| | in multi-member clusters | 9 | 0 |
| | borrowed values into/out of them | 177 | 0 |
| | in density ranking | 201 | 0 |
| **M1** NDB links | borrowed values with a "same-origin" note | 12,305 | 10,985 (all on CNF foods derived from USDA) |
| | borrowed values via the 346 non-derived pairs | 1,397 | 690 (after Haiku → Sonnet review) |
| | of the 346 pairs in the same cluster | 318 | 158 |
| **M2** numeric guard | guard log rows | 161 | 741 (161 from the v0.3 text guard + 580 new) |
| | review's 69 confirmed-wrong clusters | 69 | 33 gone, 26 keep only the true CNF↔USDA derivation pair, 10 remain as correct sub-groups (see §3) |
| **M3** fortification | leaked cross-country values | 32 (12 foods) | 0 |
| **M4** licence | CNF values in the data | 259,499 | 259,548 (+50 released) |
| | Swiss values | 48,847 | 48,843 |
| | Swiss values from IFCT India (source 2290) | 4 | 0 (listed in `out/removed_upstream_values.csv`) |
| **m4** preferred/supersede | preferred without energy | 175 | 166 |
| | preferred without energy+protein+fat | 317 | 297 |
| | peanut butter 2758989 | active | superseded by 2262072 |
| | within-source kept record lacking energy/fat while the other has them | not counted | 0 of 74 |
| **Item 7** | `derivation`, `licence` in food_nutrients | no | yes |
| | `estimated_nutrients` in foods_wide | no | yes |
| | duplicates on (food_id, nutrient_code) | 833 | 776 (expected: reported + derived/borrowed rows coexist) |
| | duplicates on (food_id, nutrient_code, value_type) | 0 | 0 (documented as the key) |
| | canonical_id derived from preferred food_id | 15,380 / 20,234 | 20,298 / 20,492 (194 exempt singletons use their sole member) |
| | metadata version | 2026.10.21 | 1.0 |
| | NOTICE has CNF "as is / not medical advice" | no | yes |
| | Ciqual and CNF changes_notice mention derived values | no | yes |
| | out/*.csv without citation columns | foods_wide, density_rank, qa_flags, food_values_long | those files are build-internal and not in the zip; `out/unified/*.csv` carry the citations |

M4 count fix: CNF has 72 values from sources 81/82/83; 50 are in loaded nutrients (all 50 now present, unchanged) and 22 are in nutrients that are not loaded.

M2 guard rules fired (one downgrade can trigger several): sodium_3x 368, salt_wording 322, sugar_2x 52, vitamin_d_drink 40, folic_acid 36, water_10g 34, text_contradiction 2, flour_type 2. Old methods of the 580: haiku 350, sonnet-review 181, rule_identical_name 47, claude-review 2. Full log: `out/match_guard_log.csv`.

## 2. Spot-checks (against raw files, borrowed rows excluded)

| Check | Sampled | Mismatches |
|---|---|---|
| AFCD, Ciqual, CNF, CoFID, MEXT, Swiss, TACO | ≥200 each | 0 |
| USDA SR Legacy, Foundation | 200 each | 0 |
| Borrowed values vs donor | 300 | 0 |
| v1.0 specifics (CNF 81/82/83, Swiss IFCT, same-origin notes, B1 labels, non-standard foods in clusters/borrowing) | all | 0 |
| Dedup checks (one preferred per cluster except listed exempt singletons; no non-standard food preferred next to a standard twin; foods_wide preferred count) | all | 0 failures |

Swiss spot-check now expects the 4 IFCT cells as removed.

Coverage of the 24 density nutrients (standard-basis active foods, 26,236): own values 77.1% → 79.8% with borrowing (v0.3: 77.0% → 79.9%). By source after borrowing: AFCD 87.4, CNF 86.8, SR Legacy 84.6, Swiss 83.8, MEXT 80.1, Foundation 74.2, CoFID 73.5, TACO 62.9, Ciqual 60.2. Table: scratchpad `coverage_v1_src.csv`.

## 3. The 69 confirmed-wrong clusters

33 no longer share members. 26 keep only the CNF↔USDA derivation pair (e.g. both "with salt"), which is correct. 10 remain as sub-groups that I judged correct on reading: rye flour (Swiss Type 815 + generic), mozzarella (low-moisture vs fresh now split), curry powder, tomato purée, black beans, light rye with Ciqual T85 (borderline), pecans, turnip, skim milk, corn. `checks/v1_metrics.py` reports 36 as "still merged" because it counts these 26 + 10 by membership overlap, not by correctness. Members: `reports/v03_wrong69_members.json`.

A cluster-level check was added: a food joins a cluster only if the guard finds no conflict with any existing member (stops a generic "Flour, rye" from chaining type 130 and Type 815). Conflicts go to the review queue (now 1,572 pairs).

## 4. Fresh 100-cluster sample (seed 2026)

55 clusters from the independent stratum (1,189 clusters with a non-CNF/USDA member) and 45 from CNF/USDA-only (3,497). **Clear errors: 0 of 100. Borderline: 8 of 100.** Borderline: candied fruit, pumpkin seeds, pomegranate, poached egg (sodium), canned peaches drained vs whole contents, fondant vs icing, Flour 00 vs type 65 vs plain, new potato.

**Caveat:** I drew and judged this sample myself and I built the pipeline, so it is less independent than the Opus review (4.7% wrong in the independent stratum at v0.3). Please have it checked by a second reviewer. Sample file: scratchpad `sample100.txt`.

## 5. Decisions made

- Non-standard-basis foods with a standard twin get **no preferred record** (`canonical_foods.preferred_food_id` empty, `preferred_note` says why). Foods without a twin stay preferred in their own singleton cluster (29).
- Twin detection: exact name after removing the basis phrase, or same source + same head word + token subset.
- Guard is build-time and downgrade-only; `matches/*.csv` keep the raw model verdicts. True ndb_code derivations are exempt.
- M4: each publisher's open licence is treated as covering what it republishes (your decision), recorded in `config/sources.yaml`. IFCT India values in the Swiss file are removed because IFCT is not an approved source.
- `foods_wide.csv`, `density_rank.csv`, `qa_flags.csv`, `food_values_long.csv` and the sqlite file in `out/` have no citation columns, so they are not shipped; rebuild with `python3 -m foodpipe build`.

## 6. Open questions / not fixed

1. **Licence (yours to decide):** AFCD "Borrowed" third-party foods (CC BY); Ciqual and Swiss values that originate in other databases are now kept under your M4 decision, which I'm not qualified to confirm legally.
2. **m6:** "independent" sources often are not independent (255 members identical to USDA/CNF values). Not fixed.
3. **m7:** AFCD vitamin D is D3-equivalent, not D2+D3. Not fixed.
4. **m8/m9/m10:** within-source collapse can merge different products; MEXT human-milk iodine is borrowed; Ciqual "en rôti" state; the density top 50 is not de-duplicated by canonical_id; taco:33 translation. Not fixed.
5. The reviewer did not receive the CoFID and AFCD raw files.
6. 1,572 pairs in `out/dedup_cluster_review.csv` wait for review.
7. 166 preferred records lack energy (none has a sibling with energy). They are listed by `checks/v1_metrics.py`.
8. The sample in §4 needs an independent look.
