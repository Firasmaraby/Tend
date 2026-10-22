# Expected values (worked out before the code)

Every number here was calculated by hand from the reference tables before any
`core` code existed. The tests in `test/` assert these exact values. If a
test and this file disagree, the code is wrong until proven otherwise.

Mark rule (DECISIONS.md §2): RDA basis → `max(EAR, 0.8 × RDA)`; AI basis →
`AI × 1.0`; fixed basis → value as is.

## Marks

### Woman 19–30, menstruating, not pregnant or lactating
| Nutrient | RDA / AI / fixed | EAR | Working | Mark |
|---|---|---|---|---|
| Iron | 18 mg | 8.1 | max(8.1, 14.4) | **14.4 mg** |
| Calcium | 1000 mg | 800 | max(800, 800) | **800 mg** |
| Magnesium | 310 mg | 255 | max(255, 248) | **255 mg** |
| Potassium | AI 2600 mg | | | **2600 mg** |
| Fibre | AI 25 g | | | **25 g** |
| Folate | 400 µg DFE | 320 | max(320, 320) | **320 µg** |
| B12 | 2.4 µg | 2.0 | max(2.0, 1.92) | **2.0 µg** |
| Vitamin A | 700 µg RAE | 500 | max(500, 560) | **560 µg** |
| Vitamin C | 75 mg | 60 | max(60, 60) | **60 mg** |
| Vitamin K | AI 90 µg | | | **90 µg** |
| Zinc | 8 mg | 6.8 | max(6.8, 6.4) | **6.8 mg** |
| Choline | AI 425 mg | | | **425 mg** |
| ALA | AI 1.1 g | | | **1.1 g** |
| EPA+DHA | fixed 250 mg | | never × 0.8 | **250 mg** |
| Iodine | 150 µg | 95 | max(95, 120) | **120 µg** |
| Vitamin E | 15 mg | 12 | max(12, 12) | **12 mg** |
| Selenium | 55 µg | 45 | max(45, 44) | **45 µg** |

### Other profiles
| Profile | Nutrient | Working | Mark |
|---|---|---|---|
| 31–50 | Magnesium | max(265, 256) | **265 mg** |
| 31–50, **not menstruating** | Iron | max(5, 6.4) | **6.4 mg** |
| 31–50, not menstruating | Calcium | stays on the age band: max(800, 800) | **800 mg** (v1 wrongly gave 1000) |
| 31–50, not menstruating | Fibre | stays on the age band | **25 g** (v1 wrongly gave 21) |
| 51–70, not menstruating | Iron | max(5, 6.4) | **6.4 mg** |
| 51–70, **menstruating** | Iron | max(8.1, 14.4) | **14.4 mg** |
| 51–70 | Calcium | max(1000, 960) | **1000 mg** |
| 51–70 | Fibre | AI | **21 g** |
| 71+ | Calcium | max(1000, 960) | **1000 mg** |
| Lactating 19–30 | Vitamin A | max(900, 1040) | **1040 µg** |
| Lactating 19–30 | Iron (menses not returned) | max(6.5, 7.2) | **7.2 mg** |
| Lactating 19–30, **menstruating** | Iron | the lactation RDA assumes no menses, so use 18 | **14.4 mg** |
| Lactating 19–30 | EPA+DHA | fixed (DECISIONS §11) | **350 mg** |
| Lactating 19–30 | Choline | AI | **550 mg** |
| Lactating 19–30 | Iodine | max(209, 232) | **232 µg** |
| Lactating 19–30 | Zinc | max(10.4, 9.6) | **10.4 mg** |
| Lactating 19–30 | Potassium / Fibre | AI | **2800 mg / 29 g** |
| Pregnant 31–50 | Iron | max(22, 21.6) | **22 mg** |
| Pregnant 31–50 | Folate | max(520, 480) | **520 µg** |
| Pregnant 31–50 | Magnesium | max(300, 288) | **300 mg** |
| Pregnant 31–50 | Vitamin A | max(550, 616) | **616 µg** |
| Pregnant 31–50 | EPA+DHA | fixed | **350 mg** |
| Pregnant 31–50 | Potassium / Fibre | AI | **2900 mg / 28 g** |
| Age 18 | any | uses 19–30 (DECISIONS §11) | Iron **14.4 mg** |
| Age 17 | — | not eligible | throws |

## Coverage
- Salmon (fixture): EPA+DHA 1202 mg per 100 g, 100 g serving → 1202 / 250 = **4.808 (480.8%)**. Under v1's mistaken 0.8 rule it would have been 601%.
- Coverage is unclamped. A 300% day counts as **3.0**.
- A NULL is never zero. A day with one known iron value of 5 mg plus one food with unknown iron reports **at least 5 mg**, `hasUnknown = true`.

## Dates (all windows are inclusive)
- Round starting **2026-03-02** has `ends_on` = start + 41 = **2026-04-12**. 2026-04-12 is in the round. 2026-04-13 is the first day of the next round.
- Toronto (DST starts 2026-03-08 at 02:00 local):
  - 2026-03-08T04:30Z → **2026-03-07** (23:30 EST)
  - 2026-03-08T07:30Z → **2026-03-08** (03:30 EDT)
- Kiritimati (UTC+14): 2026-03-07T10:30Z → **2026-03-08**.
- Lord Howe (DST ends 2026-04-05 at 02:00 local, which is 2026-04-04T15:00Z; UTC+11 → UTC+10:30):
  - 2026-04-04T12:45Z → **2026-04-04** (23:45)
  - 2026-04-04T13:15Z → **2026-04-05** (00:15)
- Backdating: with today 2026-03-08 in her zone, 2026-03-08 and 2026-03-07 are allowed. 2026-03-06 and 2026-03-09 are not.

## Round verdicts (gate: at least 21 logged days)
| Case | Working | Outcome |
|---|---|---|
| 30 logged days, each at 1.0 | logged-day mean 30 / 30 = 1.0 | **reached**, mean 1.0, loggedDays 30 |
| 21 logged days, each at 1.0 | exactly at the gate | **reached** |
| 20 logged days, each at 3.0 | under the gate | **not_enough_data** (`low_logging`) |
| 21 days: 10 at 0.5, 11 at 1.2 | (5 + 13.2) / 21 = 0.866667 | **missed**, mean 0.8667 |
| 21 days: 20 at 0.9, 1 at 3.0 | (18 + 3) / 21 = 1.0 (clamping would give 0.905) | **reached**: unclamped, with floating-point tolerance |
| 25 logged days, NULL on 40% of servings | over the 30% unknown share | **not_enough_data** (`data_gap`) |

## Carry-forward
- Focus: iron 0.62, calcium 0.95, fibre 1.10. Iron and calcium missed. The lowest miss, **iron, carries**. Calcium and fibre lock in.
- Next round: iron (carried) misses again at 0.70 and calcium (focus) misses at 0.90. **Iron becomes a longer project. Calcium carries.**
- Low-data round: no carry-forward and nothing locks in. All three become available to pick again.
- Next round starts on previous `ends_on` + 1 when she picks within 7 days of the end. After that, it starts on the day she picks.

## Upper limits
| Food (fixture) | Serving | Working | Result |
|---|---|---|---|
| Brazil nuts, selenium 1917 µg / 100 g | 20 g | 383.4 µg = 95.85% of 400 | capped at **1 serving a day**. Excluded if a serving is already logged today. |
| Oysters (eastern, cooked), zinc 78.6 mg / 100 g | 85 g | 66.81 mg = 167% of 40 | **excluded** |
| Beef liver, retinol 9442 µg / 100 g | 85 g | 8025.7 µg against a UL of 3000 (preformed only) | **excluded** |
| Spinach, vitamin A RAE 469, retinol 0 | 1 cup | the UL applies to retinol only, so 0 | **not limited** |
| Pumpkin seeds, magnesium 592 mg / 100 g | 30 g | 177.6 mg = 51% of 350, but that UL is supplemental only | **not limited** |
| Fortified cereal, folic acid 1750 µg / 100 g | 40 g | 700 µg = 70% of 1000 (synthetic only) | capped at **1 serving a day** |

## Ranking (woman 19–30, menstruating; focus iron, calcium, fibre at weight 1; empty day, no round history)
- Lentils, cooked: iron 3.33, calcium 19, fibre 7.9, 116 kcal per 100 g. Serving 198 g.
  - Iron 6.5934 / 14.4 = 0.457875
  - Calcium 37.62 / 800 = 0.047025
  - Fibre 15.642 / 25 = 0.62568
  - **Score 1.13058.** Serving energy is 229.68 kcal, so **density 1.13058 / 229.68 = 0.0049224**.
- Density floor: iceberg lettuce at 14 kcal per 100 g, 72 g serving, gives 10.08 kcal. The denominator uses **25**.
- Gain stops at the mark. With iron today already at 0.9, lentils add min(0.457875, 0.1) = **0.1** for iron.
- Blend: today 0, round-to-date mean 3.0 for EPA+DHA → room left = max(0, 1 − (0.5 × 0 + 0.5 × 3.0)) = **0** → salmon gains nothing for EPA+DHA today.

## Selectability
- Thresholds: at least 15 qualifying foods means selectable. 15 to 19 is labelled `near`, 20 or more `pass`, under 15 `fail`.
- A qualifying food delivers at least 15% of the mark in one serving.
