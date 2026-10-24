# Decisions

These are the founder's decisions, made 2026-10-22. The full reasoning is in `docs/plan.md`. Code that implements a decision cites its section number.

## The loop (preserved)
1. **Three nutrients, six-week rounds, food suggestions that fill her marks.** This is the core and is not up for change. Everything else is built around it.
2. **Mark:** RDA basis uses `max(EAR, 0.8 × RDA)`. AI basis uses `AI × 1.0`. Fixed values are used as they are (EPA+DHA). The basis is always read from data.
3. **Verdict:** the mean over logged days, unclamped. It needs at least 21 logged days. Consistency (logged days) is shown separately as a count that only goes up.
4. **Ranking and progress:** blend today with the round-to-date mean over logged days (0.5 each).
5. **Weekly check-in** every 7 days.
6. **Picking:** a food-frequency screener plus life-stage priors suggest three, and she can swap any of them. From round 2, suggestions come from her data.
7. **Carry-forward happens once.** A second miss in a row turns the nutrient into a "longer project" with different coaching, and the next-lowest first-time miss carries instead.
8. **Locked-in** nutrients have weight 0.3. A drifting one (three weeks under its mark) is offered back, never forced. Projects have weight 0.6. When the list runs out, she moves into "seasons".

## Who it's for
9. Perimenopause is the first niche. The target engine supports every band.
10. **Pregnancy is supported with its own targets**, and repeated notices say "check with your doctor or midwife; this isn't medical advice".
    - Suggestions hard-exclude everything in `PREGNANCY_FLAGS` (`packages/core/src/foods.ts`). The list was reviewed against Health Canada's guidance on 2026-10-22:
      - [Safe food handling for pregnant people](https://www.canada.ca/en/health-canada/services/publications/food-nutrition/safe-food-handling-pregnant-people.html)
      - [Mercury in fish Q&A](https://www.canada.ca/en/health-canada/services/food-nutrition/food-safety/chemical-contaminants/environmental-contaminants/mercury/mercury-fish-questions-answers.html)
    - What that guidance covers: high-mercury fish (fresh or frozen tuna, shark, swordfish, marlin, orange roughy, escolar), canned albacore (it has a weekly limit, so we don't push it), raw or undercooked animal foods and eggs, unpasteurised dairy and juice, soft, semi-soft and blue cheeses, non-dried deli meats, refrigerated smoked seafood, refrigerated pâté, and raw sprouts.
    - `high_retinol` (liver) is our own conservative rule, because preformed vitamin A is teratogenic.
    - The live Canada.ca pages must be re-checked before launch.
11. **Bands:**
    - Bands follow the DRI tables exactly: 19–30, 31–50, 51–70 and 71+. Pregnancy and lactation use their own rows.
    - **An 18-year-old uses 19–30.**
    - Menstruation changes iron only, whatever her age.
    - EPA+DHA is 350 mg in pregnancy and lactation.
    - Users must be 18 or older. Age comes from birth year and month only.

## Product
12. **Design:** Pantry, type-led. **No illustrations, ever.** Jars and shelves are drawn in code. Foods are shown as type plus a category colour chip.
13. **Stack:** Expo/React Native (TypeScript), a new Supabase project (never v1's), `@tend/core` for all the maths, and RevenueCat.
14. **Beta testers:** a fresh start, an optional import of their foods and rotation, and founding-member status with free access for life.
15. **Shareable round card:** yes. It shows foods and nutrient names only, never numbers.
16. **Cycle-aware:** the infrastructure exists (context modifiers and a feature flag). No cycle data is collected until a release decision is made. The first candidate is a "heavy periods" setting for iron.
17. **Calories:** hidden by default, opt-in.
18. **Market:** Canada first, with Canadian English, CAD, Health Canada priority allergens and the Canadian Nutrient File.
19. **Allergens and diet** filter suggestions in exactly one place (`eligibleFoods`), before ranking. Untagged foods are never suggested.

## Business
- **Name:** Tend (a working name, pending trademark checks).
- **Pricing:** a subscription with a hard paywall at the end of onboarding and a 7-day trial on the annual plan. The starting price is roughly CAD 12.99 a month or 79.99 a year, to be checked against competitors. Substack offer codes. The app asks for a review only at the end of a round where she reached her marks.
- **Legal entity and D-U-N-S number** are needed before the first public App Store submission.

## Data
- The founder's merged database is the only real source. The `@tend/core` maths is tested on hand-entered fixtures. Phase 2 starts when the database file arrives.

## Open for the founder (from the first data run, 2026-10-22)
- **EPA+DHA floor (decided 2026-10-23):** 8 qualifying foods instead of 15 (`MIN_QUALIFYING_BY_NUTRIENT`).
- **Iodine** is known for about a third of foods in the merged database. It stays unselectable until coverage improves, and the selectability report will show when it does.

## Added 2026-10-23 (from founder feedback on the prototype)
- **Protein is the daily foundation.** It has its own bar under the three jars, but it isn't a jar or a round nutrient. The mark is a flat 75 g, or 1.2 g/kg (adjustable from 0.8 to 2.2) if she adds her weight in settings. Weight is opt-in, used only for this, and never displayed. In suggestions protein has weight 0.5.
- **Energy (kcal) is opt-in and off by default.** It counts up, and there is never an energy target.
- **Absorption ("Better together") teaches and never changes a number.** The rules are in `packages/core/src/absorption.ts`: vitamin C (25 mg or more) or meat/fish with plant iron; fat with greens for vitamins A and K; a "know" card on oxalate in spinach and chard. More tips in Learn: tea/coffee timing, soaking/sprouting, gentle cooking, cooked carrots.
- **Searchable is not suggestable.** Every food in the library can be found and logged. Only curated foods are suggested.
- **Spinach and chard calcium (decided 2026-10-23):** it counts in her totals, but isn't used to rank suggestions or to pass the calcium floor (`rankable` in core).
- **Meal tags (decided 2026-10-23):** every log gets breakfast, lunch, dinner or snack, defaulted from her clock and changeable with one tap. Pairings count within the same meal when both foods are tagged.
- **Shopping list and repeat-a-meal (decided 2026-10-23):** built from her rotation, strong foods for her three, and pairing helpers.

## Added 2026-10-24
- **Food as its own pairing partner: kept.** Spinach with its own vitamin C, or avocado with its own fat, counts as a pairing.
- **Period timing (brought back from the v1 beta).** It's opt-in, and she taps "My period started" and "My period ended".
  - On period days iron gets extra weight in suggestions: +0.5, or 0.6 if iron isn't one of her three. The iron pairing tips switch on.
  - **The iron mark is not raised.** The menstruating RDA already averages period losses across the month, so raising it would count them twice.
  - An optional heavy-periods question leads to a "worth asking your doctor about checking your iron" note.
  - Data kept: the current period's start date, its usual length, and an end date if she ends it. No cycle history and no predictions.
  - Code: `packages/core/src/period.ts`.
  - Open item for the native build: a "still going" action for a period that runs longer than usual.

## Curation at scale (2026-10-24)
- `data/scripts/curate_auto.py` scopes the Canadian Nutrient File to everyday foods in the form people eat them. It assigns category servings, diet, allergen and pregnancy tags, then runs the checks.
- **Result:** 1,110 foods in scope. 1,030 pass every check; 80 are in `data/curation/review_queue.csv` for the founder. 628 everyday foods are **suggestable** (86 hand-checked plus 542 automatic). The rest keep a serving and stay searchable and loggable.
- **Suggested only if everyday:** a food must pass every check *and* be on the everyday-food list. Rare foods (sheep's milk, grape leaves) crowded out common ones in testing.
- **Remaining gaps are real, not data bugs:** vegan B12 (professional referral), plant-based EPA+DHA, iodine (missing in the database), and choline for vegetarians and vegans.
- **Decided (2026-10-24):** automatic everyday foods are suggestable in the beta, and the founder spot-checks a 30-food sample.
- **Polish (2026-10-24):** readable names (`data/scripts/polish.py`) and food-specific household servings. Near-duplicates share a `dupGroupId`, so lists show one cheddar, not ten. Condiments, toasted and low-sodium variants and dish components are not suggested. Result: 566 suggestable rows, about 290 distinct foods.
- **Review page:** the founder records decisions on the 80 flagged foods and the spot-check sample on an artifact page (collections `decisions` and `spotcheck`). Claude reads them back and applies them to `data/curation/`.
- **Errors found in the merged database (report to the pipeline):**
  - frozen pinto beans list ALA (1.77 g) above total fat (0.48 g);
  - poached coho salmon's energy doesn't match its macros;
  - peeled apple has a borrowed iodine value about 25 times the skin-on value;
  - chanterelle has borrowed omega-3 values.
- **Founder review applied (2026-10-24):** all 80 flagged foods were decided by accepting the recommendations. The record is in `data/curation/review_decisions.csv`.
  - 12 removed, from both suggestions and the searchable library (listed in `removed.csv`).
  - 34 approved; 34 searchable only.
  - Fixes: falafel 3 patties (50 g), papadum 1 piece (13 g), meatless fillet 90 g, koyadofu 1 dried piece (17 g). Hard goat cheese lost the soft-cheese pregnancy flag.
  - The 30-food spot-check sample is still open on the review page.
- **Totals after review:** 585 suggestable entries (86 hand-checked and 499 automatic), 0 foods awaiting review.
- **Editing past days (founder request, 2026-10-24):** she can add, remove or change food on any of the **last 7 days** (it was yesterday only), matching the week strip. Days in a round that has closed stay locked, so a verdict never changes after the fact. Code: `canEditDate` and `BACKDATE_DAYS` in `packages/core/src/dates.ts`. Widening it to the whole open round is a one-number change.
