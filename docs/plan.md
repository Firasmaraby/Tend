# Eighty v2: planning response

## Context

Eighty is a micronutrient app for women that is in a live beta built with Lovable. The founder (Firas Maraby) wants a ground-up rebuild that can reach a five-star App Store release. This session is planning only and contains no production code. The working directory is empty: there is no v1 code here, and none is needed, because the brief tells me not to port v1. Every proposal below that changes the product is labelled **[FOUNDER DECIDES]**. All of those decisions are collected again in section 9.

What I checked in this environment (section 11 of the brief):
- **Model routing is possible.** The Agent tool accepts `model: "opus" | "sonnet"` for each subagent, and `create_session` accepts an explicit model ID (for example `claude-sonnet-5-5`) for sibling sessions. I have **not yet confirmed** which exact version the `sonnet` alias resolves to. Phase 0 settles this by spawning one trivial subagent and having it report its served model. Until that check passes, I won't claim Sonnet 5.5 handled anything.
- This planning session runs on Opus. That matches the brief: planning, maths and architecture belong to Opus.

---

## 0. The name (asked for directly)

**The case against "Eighty"** (pushing back, as you asked):
1. **The app isn't 80 for many nutrients.** AI nutrients sit at 100%, EPA+DHA is a fixed value, and protein is per kg. The name describes a rule that covers only part of the app.
2. **It invites the scrutiny covered in section 1.1.** 80% of the RDA lands at or slightly *below* the EAR for about eight nutrients. A name built on the number turns that into a headline argument.
3. **It reads as a grade or an age.** To a perfectionist, "80%" can read as a B-minus. "Eighty" can also suggest elderly, which works against the perimenopause niche.
4. **It's hard to search** and hard to own as a trademark.

**What the name should carry:** adding rather than subtracting, enough rather than perfect, a floor that rises, warmth, and food. It shouldn't sound like a diet or like a medical product.

| Name | Idea | Strength | Risk |
|---|---|---|---|
| **Tend** ⭐ | Ongoing care. A garden you return to. | Short, warm verb. Fits rounds, locked-in nutrients and the long game. "Tend to yourself." | Tend is also a US dental brand (a different trademark class). The word is common. |
| **Perennial** ⭐ | Locked-in nutrients come back every season | Captures the floor rising across rounds. Feels grown-up and suits the 40+ niche. | Long word. Probably taken in some classes. |
| **Fold** / **Fold In** ⭐ | The cooking term for gently adding an ingredient | Literally "add, don't subtract". Food-native and distinctive. | Abstract until someone explains it. |
| **Ample** | Enough, and then some | States the anti-diet thesis outright | **Ample is an existing meal-replacement shake brand.** That's real trademark risk in food. |
| **Trio** | Three at a time | Names the differentiator | Generic. Also, the three change every round. |
| **Copia** | Latin for abundance (as in cornucopia) | Ownable, elegant | Obscure, and people may mispronounce it |
| **Groundwork** | Building the floor | Honest about the mechanic | Sounds like work |
| **Satis** | Latin for "enough" (the root of "satisfy") | Clever, ownable | Obscure |
| **Brim** | Filling up | Pairs with the jar design (direction A) | 80% isn't the brim |
| **Pantry** | The foods that became yours | Pairs with direction A and the rotation feature | Sounds like a grocery or recipe app |

**My shortlist: Tend, Perennial, Fold.** My favourite is **Tend**. Its App Store name could be "Tend: Nutrients for Women" (Apple allows 30 characters). The 80% rule can stay as a named, defended *method* inside the app ("the 80 mark"), so you keep the story without staking the brand on it.

**Before choosing:** search CIPO and USPTO for classes 9, 42 and 44, check the App Store for name collisions, and check domains. I haven't checked any of these. A cheap test is to show your six testers three finalists and ask which one they'd tell a friend about. **[FOUNDER DECIDES]**

---

## 1. Critique of the v1 loop (ranked by impact)

### 1.1 The 80% mark: the food science you'll be asked to defend (high impact)
The maths in the brief holds when the RDA is 1.2 × the EAR, because 0.8 × 1.2 = 0.96 × EAR. But **0.96 × EAR is the median requirement.** At that intake, roughly half of women in the band are below their own requirement. The IOM explicitly warns against using the EAR as an individual's goal. A dietitian will raise this point the first time you defend the rule publicly.

Here is 0.8 × RDA set against the EAR for women aged 19 to 50:

| Nutrient | RDA | EAR | 0.8 × RDA | vs EAR |
|---|---|---|---|---|
| Zinc | 8 mg | 6.8 | 6.4 | **below** |
| Magnesium (31 to 50) | 320 mg | 265 | 256 | **below** |
| B12 | 2.4 µg | 2.0 | 1.92 | **below** |
| B6 | 1.3 mg | 1.1 | 1.04 | **below** |
| Thiamin / riboflavin | 1.1 mg | 0.9 | 0.88 | **below** |
| Selenium | 55 µg | 45 | 44 | **below** |
| Folate, vitamin C, vitamin E, calcium | | | | = EAR |
| Vitamin A | 700 µg | 500 | 560 | above |
| Iron (menstruating) | 18 mg | 8.1 | 14.4 | far above (menstrual losses make the distribution skewed, so 1.2× doesn't apply) |

Options:
- (a) Keep 0.8 × RDA and change the public framing to "a realistic floor near the average requirement", without claiming that the woman herself is covered.
- (b) **Use the EAR directly where one exists.** It lands near 80% anyway, and you can cite it as "the level the National Academies set as the average requirement". It's more defensible and changes almost nothing for users.
- (c) Use max(0.8 × RDA, EAR).

I lean towards (b) with (a)'s framing. Either way, the data model stores RDA, EAR, AI, UL and basis, so changing the rule is a data change rather than a code change. **[FOUNDER DECIDES]** You know this literature better than I do, so tell me if I'm wrong.

### 1.2 The round mean counts unlogged days as zero, and the verdict then describes intake when it measured logging (high impact)
Worked example: she logs 30 of 42 days and reaches exactly 100% on every logged day. Her all-days mean is 30/42 = **71.4%**. That's a miss, so the nutrient carries forward with "you didn't get there". The 30 logged days clear the low-data gate of 21, so the verdict fires. But her intake was fine. The statement is false, and that breaks your own rule: honest in substance.

**Proposal:** report two numbers and judge each on its own terms.
- **Intake** is the mean over *logged* days (unclamped). The verdict and carry-forward are based on this.
- **Consistency** is logged days out of 42, shown as a count that only goes up. It gates whether a verdict is given at all: at least 21 logged days, or you could raise that to 28.
- This keeps the push towards consistency (thin data gets no verdict, so she doesn't graduate) without misreporting what she ate. **[FOUNDER DECIDES]** If you keep unlogged days as zero, the end-of-round screen has to say plainly that "this number measures logging as much as eating".

### 1.3 Daily fills against a round scored on the mean (high impact)
The round is judged on an unclamped *mean*, so a 300% salmon day really does carry the week, and physiologically that's right for stored nutrients (B12, A, EPA+DHA, iron). But v1's Today screen and its "best right now" ranking work on the *single day*. That creates pass or fail every day, which is the diet-app feeling you're trying to avoid.
**Proposal:** Today still shows today's fills, because instant feedback is what makes logging rewarding. The ranker and the main progress visual work on **round-to-date over logged days**. If she had salmon yesterday, EPA+DHA drops down today's suggestions. A weekly ritual (1.8) makes the week the unit she thinks in. **[FOUNDER DECIDES]**

### 1.4 Locked-in nutrients pile up with no endgame (medium to high impact)
By round 4 she has 9 locked-in nutrients plus 3 in focus. If all of them are "weighted in suggestions", the app drifts back into the completeness tracker the differentiator was meant to beat. And with roughly 15 to 20 selectable nutrients, she runs out in 5 to 7 rounds (7 to 10 months).
**Proposals:**
- Give locked-in nutrients a low ranking weight: focus 1.0, carried 1.0, locked 0.3, all others 0.
- **Gentle resurfacing:** if a locked-in nutrient's logged-day mean stays under its mark for 3 weeks running, offer it back ("Iron has drifted. Want it in your next round?"). It's an offer, never forced.
- **Curate the selectable list** down to the roughly 12 to 15 nutrients that matter for women. Most adults don't fall short of phosphorus, manganese or niacin, so those stay in the background. A good starting point is the shortfall nutrients from the Dietary Guidelines and NHANES: calcium, magnesium, potassium, fibre, A, C, E, K, choline, iron, folate, B12, zinc, ALA, EPA+DHA, and iodine if the data supports it.
- **Endgame: "seasons".** Once she has worked through the list, rounds become tune-ups in which the app suggests her three lowest. **[FOUNDER DECIDES]**

### 1.5 Carry-forward: keep it, but cap repeats (medium impact)
It's honest, and it's the moral centre of the product. Keep it. Add two things:
- **Show the trajectory, not just the verdict:** "41% → 74%. Not at the mark yet, so it comes with you."
- **A second consecutive miss changes the strategy rather than repeating it.** For example, a vegan who misses B12 twice, or a menstruating vegetarian who misses iron twice, may not be able to reach the mark through food for her pattern. The third round shouldn't be the same coaching. It should offer new pairings and swaps and use "worth asking a professional about" language. No supplement advice. **[FOUNDER DECIDES]** Choose between allowing infinite carry-forward and moving the nutrient to a "longer project" status.

### 1.6 How she picks her three: both, with an intelligent start (medium impact)
At signup there's no log, so v1's picks are either a guess or free choice.
**Proposal:** an 8 to 10 question **food-frequency screener** in onboarding. It asks how often she eats fish, leafy greens, dairy or fortified alternatives, legumes, nuts and seeds, eggs, fruit, and whole grains. Combined with life-stage priors, that gives three *suggested* nutrients, each with a one-line reason, and she can swap any of them. From round 2 onwards, suggestions come from her logged data, since every nutrient is tracked in the background. Guardrails stay in place: vitamin D can't be chosen, the selectability floor applies per band and diet, and a carried-forward nutrient takes one slot. The picker also shows overlap ("these two share foods: spinach, lentils"), because three nutrients that share foods make an easier first round.
This is how the app shows its own intelligence (brief §1) from the first minute.

### 1.7 Round length (medium impact)
Six weeks is shorter than Lally's 66-day median (the range was 18 to 254 days), so you can't defend it as "long enough for automaticity". The locked-in mechanic carries the habit on past day 42, so the loop as a whole is consistent. The real risk is that **six weeks is a long wait for a first payoff in a new app**, and most churn happens in weeks 1 and 2.
**Proposal:** keep six weeks, which is the brand, and add a **weekly check-in** so there's a small arrival every 7 days. One alternative to consider is a shorter first round of 3 weeks, called a "starter round". **[FOUNDER DECIDES]**

### 1.8 Motivation mechanics (low to medium impact, mostly good)
- The logged-day count that only goes up: **keep.**
- "This one's becoming yours" at 4 distinct days: **promote it to a central mechanic.** It is the true habit signal. Each round should produce a tangible collection, her **rotation**: "These 6 foods carried your iron." That collection is what grows across rounds.
- Full-screen notes, at most one a day: keep the triggers, but make them **rarer** (only genuine firsts). Repeated full-screen interruptions start to feel like an ad.
- Weeks 5 and 6 visual treatment: keep it.
- **Ask for a review only at an arrival**, meaning the end of a round where she reached her marks. Never after a miss. This directly supports the five-star goal.

### 1.9 Best right now and density per calorie (keep, harden)
- Ranking a single food tends to return ten leafy greens. Add **category diversity** to the re-rank.
- Density per calorie favours near-zero-calorie foods (lettuce, broth). Fix this with a **kcal floor** in the denominator, for example max(kcal, 25), and a **minimum absolute contribution** of at least 10% of the mark per serving.
- A food with NULL energy is excluded from the density view and never treated as zero.
- Label it "most nutrient-dense", not "low calorie". The aim is efficiency, not restriction.
- **Searching by her three: keep it, and add "hits two of my three"** as a filter.

### 1.10 Social: there is a safe version
Comparison stays out. The safe version is a **shareable round card**: her rotation foods and the three nutrient names, with **no percentages, numbers or body references**. It's a growth lever with no comparison surface. **[FOUNDER DECIDES]**

---

## 2. New ideas (ranked by value against effort)

| # | Idea | Value | Effort | Risk |
|---|---|---|---|---|
| 1 | **Fast logging:** usuals, re-log yesterday's breakfast, saved meals, recent foods | Very high: logging speed is the main reason people leave nutrition apps | Low | — |
| 2 | **Rotation view:** "5 foods did 70% of your iron this week" | High | Low (derived from logs) | — |
| 3 | **Pairings:** vitamin C with non-heme iron, fat with carotenoids and vitamin K | High (and the strongest answer to iron being total-only data) | Low (a curated rules table you write) | Keep it qualitative. Don't invent absorption percentages. |
| 4 | **Swaps from her own log:** "white rice 5 times this week → farro adds X magnesium" | High, and it feels intelligent | Medium | Must always be framed as *adding*, never "replace bad food" |
| 5 | **Weekly check-in card** (on Sunday, a reflection rather than a score) | Medium to high | Low | — |
| 6 | **"Bring to your appointment" PDF** of a round summary | Medium. It backs up the "talk to a professional" language. | Low | No interpretation in it, only data |
| 7 | **Shopping list** from her rotation and her three | Medium | Low | — |
| 8 | **Shareable round card** (1.10) | Medium (growth) | Low | Must never show numbers |
| 9 | **Learn ↔ Substack links** | Medium (authority) | Low | — |
| 10 | **Simple plates** (three-ingredient combos built around her three) as the step before recipes | Medium | Medium | — |
| 11 | **Barcode scanning** | Medium | Medium | **Open Food Facts uses ODbL, a share-alike licence**, which could affect your merged database. Needs a licence review. |
| 12 | **Write to Apple Health** | Low to medium | Medium | Privacy scope |
| 13 | **Full recipes** | High | High (yield and retention factors) | Defer |
| 14 | **Photo logging:** a vision model proposes foods and she confirms from the library. The model never writes nutrient values. | Medium | High | Accuracy |
| ⚠ | **Cycle-aware guidance** | — | — | **Recommend no.** The evidence for cycle-syncing is weak, and your authority depends on not doing it. Iron stores are long-term, not tied to the day of the cycle. It also adds sensitive data. |
| ⚠ | Lab values (ferritin and so on) | — | — | Medical territory. No. |

---

## 3. The three required features (UX concepts)

### 3.1 Nutrient explainers
- **One component, used everywhere.** A nutrient card holds:
  - *What it does for you*: one plain line, then three short points.
  - *Where it's found*: the top 3 foods for her diet, with real servings.
  - *Pairs well with*
  - *Life-stage note*, for example "needs go up while breastfeeding".
  - *Easy to overdo?*: only for nutrients with an applicable UL.
- **Surfaces:**
  - In the picker, as an expandable tile.
  - On Today, a long-press or tap on a nutrient opens a bottom sheet with the same card in short form.
  - In Learn, as the full version.
- **Claims guardrail:** write the copy against the **EFSA authorised health-claims register** and Health Canada's acceptable biological-role claims. For example, "Iron contributes to normal cognitive function" is pre-vetted language. List no symptoms, because a symptom list is a diagnosis.
- **Content as data:** versioned and reviewed. I'd have Opus draft and you approve. A copy lint blocks em dashes and banned words ("remaining", "left", "missed", "failed", "budget", "limit").

### 3.2 Learn tab ("interactive" means it uses the real engine)
- **Plate sandbox** (the main feature): she drags foods onto a plate and watches her marks fill, with no logging involved. It runs the real ranking and coverage code, which keeps it accurate.
- **Portion slider:** "How much of this gets you to your iron mark?" It shows real servings, with a **raw ↔ cooked toggle**. Kale's vitamin C drops from 93 to 18. Asparagus folate rises from 52 to 149. Spinach volume shrinks.
- **Myth or fact cards:** for example, the spinach iron myth, and chia vs salmon (which teaches the difference between ALA and EPA+DHA).
- Each nutrient page has the **top 10 foods** from the curated suggestable set, filtered by her diet, with servings.
- **A daily card** ("today's food"), drawn from her rotation or her three. It gives her a reason to open the app on days she isn't logging.

### 3.3 First-run guide = onboarding (show, then ask)
These six steps are interleaved and take under two minutes. Every step saves to the server, so onboarding can be resumed.
1. **The promise:** add, don't subtract. One sentence and one visual.
2. **A first log as a tutorial:** "tap the lentils", and a mark fills. She *does* the core action before she reads about it.
3. **Why 80 (or whatever basis you choose):** an interactive requirements curve she drags to see where the mark sits. It must be honest after the discussion in 1.1.
4. **The round:** a six-week timeline animation covering three nutrients, locking in, and carry-forward explained in one line.
5. **About you:** life stage, diet pattern, allergens and the screener.
6. **Your suggested three**, with reasons → swap or confirm → "Round 1 starts today."

It can be revisited later from Settings ("How it works").

---

## 4. Design directions

**A. Pantry (recommended)**
- Look: a cream, paper-like background, deep green ink with terracotta and saffron accents, a warm serif for display (for example Fraunces) and a humanist sans for UI.
- Progress: each nutrient is a **jar that fills**. Overfilling is fine: a soft glow, never an alarm.
- End of round: a **shelf** of filled jars and her rotation as labelled jars. The shelf grows across rounds, which shows the rising floor.
- Food-native and warm, with an accumulation metaphor that suits counting up.
- Risk: it could become twee. It needs restrained illustration.

**B. Perennial garden**
- Each nutrient is a stem that grows leaves on logged days. Growth never shrinks. Locked-in nutrients become perennials, and the end of a round is a bloom.
- It's the strongest metaphor for the loop.
- Risks: it can feel gamey or childish (like Finch), and the animation and illustration cost is the highest of the three.

**C. Quiet editorial**
- An Oura or Aesop feel: off-white or deep plum, precise type, horizontal bars with a marked line, and an overflow segment past the mark in a lighter tint.
- Its authority comes from intelligence, which fits your positioning.
- Risk: it feels cool, and bars are less "want to fill" than a vessel.

**Decided: A, in its type-led form with no illustration (see Q7 in section 10)**, with C's discipline on data-heavy screens (detail views use precise bars). I'm rejecting **rings**: they're Apple's "close it every day" metaphor, which brings back daily pass or fail, and they handle 300% awkwardly.

**Applies to all three:** no red state anywhere, numbers always next to fills (colour is never the only signal), WCAG AA contrast, Dynamic Type, 44 pt touch targets, reduced-motion variants of every fill animation, and layouts tested at 320 pt width. **[FOUNDER DECIDES]** I'll mock up two or three key screens per direction before you choose.

---

## 5. Architecture and stack

**Recommended: React Native with Expo (TypeScript) and a new Supabase project.** **[FOUNDER DECIDES]**

| Option | For | Against |
|---|---|---|
| **Expo / React Native** ⭐ | iOS and Android from one codebase. Native components pass Guideline 4.2. EAS builds and over-the-air updates for copy fixes. Skia and Reanimated for the fills. Close to the React you know from Lovable. | Widgets and HealthKit need native modules (both available) |
| SwiftUI | The best feel, plus widgets and HealthKit | Android means building a second app, and it's slower |
| Web with a Capacitor shell | The fastest to build | Guideline 4.2 risk, weak offline support, worse performance |
| Flutter | Good | Dart, and a weaker Supabase offline story |

**Structure (monorepo):**
- `packages/core`: **pure TypeScript domain logic** with no I/O. It covers targets, bands, coverage, round windows, verdicts, ranking, UL guards and the selectability report. The app, the backend jobs and the tests all import it, so there is one source of truth for the maths.
- `apps/mobile`: Expo Router.
- `data/`: the curation pipeline and QA checks. It is built against a **library contract** (section 6) and tested on hand-entered fixture foods. The only real adapter will be for your merged database.
- `supabase/`: migrations, row-level security and edge functions (account deletion, library publishing).

**Key decisions:**
- **Ranking runs on the device.** The curated suggestable set (nutrient vectors and servings) ships as a versioned SQLite bundle. Re-ranking after a log is instant and works offline. Full-library search runs on the server (Postgres full-text and trigram search), with recent and frequent foods cached on the device.
- **Offline logging:** log IDs are UUIDs generated on the client, so sync is idempotent. Use PowerSync (which integrates with Supabase) or a hand-rolled outbox. I'd decide in Phase 7 after a spike.
- **Dates:** `log_date` is a DATE worked out on the device in her IANA zone at the moment she logs. Round membership compares DATEs only, never timestamps. Use `Temporal` (via polyfill).
- **The principles are enforced by the code's structure, not by discipline:**
  - The daily-note notification scheduler's function signature *takes no log data*, so it can't depend on whether she logged.
  - The analytics wrapper is fire-and-forget with try/catch, and a test injects failures.
  - Route guards render nothing until the profile query has settled. That's the fix for v1's stale redirect.
  - A copy lint blocks em dashes and banned words.
- **Auth:** email OTP and Sign in with Apple. Apple sign-in is mandatory if any social login is offered. Account deletion happens in the app and cascades through all user rows and the auth user.
- **Supabase: start clean in a new project.** v1's schema contains the band bugs, and **nothing in this plan touches the v1 project or its deployment.**
- **Privacy:**
  - Store only the menstrual *status* the iron band needs. No cycle tracking.
  - Use a privacy manifest (supported via Expo config).
  - Flag for legal review: **Washington's My Health My Data Act** (it needs separate consent for consumer health data), PIPEDA, and Quebec's Law 25.
  - Analytics (for example PostHog) carry no health properties.

**Tester migration** **[FOUNDER DECIDES]**: I recommend a fresh start on rounds (targets change anyway because of the band fixes), with an **optional import of each tester's foods and rotation** through a v1→v2 food-ID mapping, plus a "founding member" marker. The export from v1 is read-only and done once, by you or with your approval, and only after v2's beta is ready.

---

## 6. Data model

### 6.1 Library (your merged database, behind a contract)
- `source` (id, name, licence, version, url)
- `food_raw` (source_id, source_food_id, name, raw attributes)
- `nutrient` (id, code, name, unit, kind, `round_policy`: selectable | blocked_policy (vitamin D) | background (protein, and anything not curated))
- `food_nutrient_value` (food_id, nutrient_id, value_per_100g **NOT NULL**, source_id, derivation: analysed | calculated | imputed | label, confidence). **A missing row means NULL (unknown).** That makes NULL impossible to collapse into zero at the storage level.
- Split nutrients that hide a distinction:
  - vitamin A: `vit_a_rae`, plus `retinol` (preformed) and the carotenoids
  - folate: `folate_dfe`, plus `folate_food` and `folic_acid`
  - omega-3: `ala` and `epa_dha` (never summed)
  - tocopherol: alpha only
- Coverage notes: USDA SR has retinol and carotenes, and folic acid separately, so the vitamin A and folate UL logic is buildable. Iodine is missing from SR. The **USDA/FDA/ODS iodine database is public domain**, and the **Canadian Nutrient File** (Open Government Licence) is a natural fit for Toronto.

### 6.2 Canonical food and curation layer
- `food` (id, canonical_name, category, **form**: raw | boiled | roasted | dried | canned | …, `dup_group_id`, chosen value per nutrient with provenance, conflict flag)
- `serving_rule` (category → grams and label template). For example: nuts 30 g, small seeds 15 to 20 g, oils 10 to 14 g, cooked legumes and grains 1 cup, dry oats 40 g, fish 100 to 120 g, hard cheese 30 g, yogurt 170 g, milk 250 ml, leafy greens 1 cup.
- `food_curation` (food_id, suggestable, display_name, serving_g, serving_label, serving_rule_id or override, status: auto_passed | needs_review | approved | rejected, reviewer, reviewed_at, notes, library_version)
- `food_tag` (diet: vegan, vegetarian, pescatarian…; allergens: Canada's priority allergens list, which is a superset of the US big 9)
- `never_suggest_category` (herbs, spices, aromatics, garnishes)

### 6.3 Reference values
- `life_stage_band` (age range; status: none | pregnant | lactating)
- `dri` (nutrient, band, rda, ear, ai, ul, **ul_applies_to**: total | preformed_only | synthetic_or_supplemental_only, basis, source: NASEM | EFSA)
  - The magnesium UL is supplemental only, so it never applies to food.
  - The folate and niacin ULs apply to synthetic forms.
  - The vitamin E UL applies to supplemental forms.
  - The vitamin A UL applies to retinol only.
  - The zinc, selenium, iron and calcium ULs apply to total intake.
- `dri_modifier` (for example: not menstruating → iron uses 8 mg while the rest of the targets keep the age band). This fixes v1 moving her into the 51+ band.
- The mark is computed in `core` from basis (RDA → × 0.8 or EAR, per your 1.1 decision; AI → × 1.0; fixed → as is). It is never looked up from a list of nutrient names.

### 6.4 User and round data
- `profile`: user_id, birth_year (not the full date of birth), tz (IANA), status, menstruating, diet, allergens, protein_g_per_kg (0.8 to 2.2, default 1.2), weight_kg (nullable, opt-in), show_energy (off by default)
- `round`: id, n, started_on, ends_on = started_on + 41 (**inclusive**, the only convention used anywhere), status
- `round_nutrient`: role = focus | carried | locked
- `food_log`: client UUID, log_date, food_id, grams, library_version, logged_at, tz_at_log, deleted_at. Backdating allows `log_date ∈ {today, yesterday}` in her zone and is enforced on the server.
- `round_result`: **frozen when the round closes** with per-nutrient logged_days, mean_logged, mean_all, unknown_share, outcome (reached | carried | not_enough_data) and the trajectory. Past verdicts never change when the library is fixed. Open rounds recompute from current values.
- `milestone_event`: idempotent, which guarantees each encouragement fires at most once.

### 6.5 NULL handling end to end
- Daily totals use known values only and carry a `has_unknown` flag. The UI then says "at least X".
- Ranking scores NULL as no contribution but never *displays* 0.
- **Verdict rule:** if more than some threshold (say 30%) of her logged servings had NULL for a nutrient, the outcome is `not_enough_data` rather than a miss. A data gap must never become a carry-forward.
- A nutrient whose library completeness among suggestable foods is below a threshold can't be selected. Iodine is the likely case.

### 6.6 Automated QA, with review queues to scale from 160 to thousands of foods
Every check sends anything it flags to `needs_review`. Nothing is auto-approved into the suggestable set unless every check passes **and** its category has an approved serving rule.
1. **Atwater energy check:** 4P + 4C + 9F (+ 2F fibre adjustment) against stated kcal, ±15%.
2. **Name and state consistency:** category energy and water ranges by form. "Cooked lentils" at about 350 kcal/100 g or under 60% water gets flagged. This catches v1's lentil bug.
3. **Serving sanity:** serving kcal outside the category band, for example a suggestable serving above 400 kcal. This catches the sesame-cup bug. Servings that are too small for the category catch the white-bean bug.
4. **Outliers:** values above 3 × the category's 99th percentile, and conflicts where sources differ by more than 2×.
5. **Upper limits:** if one serving exceeds 50% of an applicable UL, the food gets a per-food daily cap in suggestions (Brazil nuts: 1). If one serving exceeds 100%, it's excluded (oysters for zinc, liver for retinol).
6. **Duplicates:** normalised name plus cosine similarity of nutrient vectors produces candidate groups for review.
7. **Golden set:** the ~160 hand-checked foods become regression fixtures. Any library update that moves a golden value beyond a set tolerance needs your approval.
8. **Selectability report:** for every (band × diet × nutrient) it lists how many suggestable foods deliver at least 15% of the mark per serving, and labels each pass, near (15 to 19) or fail. It runs in CI on every library version and **fails the build on regressions**, so the floor can no longer fail silently.

Promote foods to suggestable in batches, prioritised by what lifts the nutrients that are near or failing the floor (for example lactating vitamin A and E). The review UI can start as a simple internal web page on the same database.

### 6.7 Ranking (sketch, to be finalised in Phase 1 with expected values)
For each nutrient n, the contribution is c = value × serving ÷ 100 ÷ mark, and r = max(0, 1 − round-to-date logged mean, blended with today).

`score = Σ wₙ × min(cₙ, rₙ)`, with w set by role (1.6 above).

Then apply the UL exclusion and caps, the diet and allergen hard filters, and a diversity re-rank. Density mode is `score ÷ max(kcal_serving, 25)`, with a minimum contribution. When every focus mark is met, the ranker moves on to locked-in nutrients.

---

## 7. Build phases (each with a model, a deliverable and its verification)

| Phase | Model | Deliverable | Verified by |
|---|---|---|---|
| **0 Setup** | Opus | Your decisions recorded. Repo, CI and a new Supabase project. Model-alias check (one subagent reports its served model). | The alias check output, shown to you |
| **1 Domain core** | **Opus** (maths, tests first) | `packages/core`: targets, bands, coverage, windows, verdicts, ranking, ULs | **Audit tests with expected values written before the code:** vitamin K 90, potassium 2600, fibre 25, ALA 1.1. EPA+DHA 250, so 1202 mg is **480.8%** (not 601). Iron 14.4 and 6.4. Vitamin A 560 and 1040. The 30-of-42-days example from 1.2. The 21-day gate boundary (21 gives a verdict, 20 doesn't). Day 41 counted and day 42 the next round. Property tests across DST in Toronto, Lord Howe's half-hour DST and UTC+14. |
| **2 Data pipeline** | Opus for the checks and UL logic, Sonnet for the bulk transforms | Library contract, an adapter for your merged database (when it arrives), serving rules, QA checks, selectability report, review queue | Golden-160 fixtures. Lentil, sesame and white-bean regression tests. The selectability report shown to you for every band × diet. |
| **3 Shell and onboarding** | Sonnet (UI), Opus review | Auth, the first-run guide as onboarding, profile, settings, account deletion, design tokens | **Cold-start walk #1** (signup → onboarding → first log → day-2 log). A test that redirects only after data has settled. An injected analytics failure that still saves. |
| **4 Logging and Today** | Sonnet, Opus for ranking integration | Search, quick log, Today fills, best right now, density mode, browse by her three | Seeded accounts. Screen values checked against precomputed numbers. Re-rank under 100 ms on device. |
| **5 Round lifecycle** | Opus for logic, Sonnet for screens | Picker and screener, explainers, weekly check-in, end of round, carry-forward, locked-in, low-data path, notes, "becoming yours" | **Seeded accounts:** A, a complete round with gaps and 300% days. B, a low-data round. C, lactating and vegan. D, carried forward twice. E, a round crossing DST. F, a round ended but next three not yet picked (days stay contiguous). Plus a dev-only clock override and cold-start walk #2. |
| **6 Learn** | Opus drafts content, you approve, Sonnet builds | Learn tab, plate sandbox, portion slider, myth cards | Every number on a Learn page comes from `core`. A copy lint for em dashes and banned words. Your sign-off on the content. |
| **7 Release readiness** | Sonnet, with Opus review | Offline sync, notifications, privacy manifest, policy, App Store assets | An airplane-mode walk. Notification content tests (no numbers on the lock screen, no dependence on log state). An App Review checklist covering 4.2, 5.1.1 and deletion. A full end-to-end clean run before anything is called done. |
| **8 Beta → launch** | Opus review | TestFlight with your testers, then submission | Tester feedback loops back into phases 4 to 6 |

At each phase boundary I'll tell you which model did what. If the alias check fails, I'll ask you to switch models manually and say so explicitly.

---

## 8. Risks I'm flagging
- **Defending the 80% claim** (1.1).
- **Licence contamination** in the merged database if any source is share-alike (ODbL or CC-BY-SA).
- **Pregnancy** brings medical and App Store risk.
- **Perimenopause and weight:** that market pulls hard towards weight. The anti-diet stance is a differentiator but needs firm guardrails.

---

## 9. Decisions (resolved with the founder, 2026-10-22)
1. **Name: Tend** (working name). Trademark, App Store and domain checks happen before the first public submission. The 80% rule continues inside the app as "the mark".
2. **Mark basis (delegated to me): `mark = max(EAR, 0.8 × RDA)` for RDA nutrients, AI × 1.0, fixed values as they are.**
   - *Why it's defensible:* no mark is ever below the National Academies' average requirement. The public line is: "Your mark is never below the average requirement for women your age and stage."
   - *Why it's useful:* for most nutrients it barely moves (zinc 6.4 → 6.8 mg, magnesium 256 → 265 mg, B12 1.92 → 2.0 µg), so marks stay reachable and the "80" story mostly holds. Iron and vitamin A keep 0.8 × RDA, which sits above the EAR.
   - Every reference value in the brief still holds: iron 14.4 and 6.4, vitamin A 560 and 1040, the AI values, and EPA+DHA 250.
   - The UI presents the mark as *a floor, not a finish line*. Going past it is always celebrated.
3. **Verdict:** the intake mean over logged days, with a consistency gate of at least 21 logged days. Consistency is shown separately as a count that only goes up.
4. **Ranking and progress unit:** round-to-date over logged days, blended with today. Today's fills stay as instant feedback.
5. **Rounds:** 6 weeks, with a **weekly check-in** every 7 days.
6. **Picking:** a food-frequency screener and life-stage priors suggest three. She can swap any of them. From round 2, suggestions come from her data.
7. **Carry-forward:** once. A second consecutive miss moves the nutrient to a "longer project" with a different strategy (new pairings and swaps, plus "worth asking a professional" language).
8. **Locked-in:** ranking weight 0.3, resurfacing after 3 weeks below the mark (offered, never forced), a curated selectable list (Q5 below), and "seasons" once the list is done.
9. **Niche:** perimenopause is the first niche. Lactating and pregnant bands are still supported in the target engine.
10. **Pregnancy is supported with its own targets.** It comes with a clear, repeated "check with your doctor or midwife; this isn't medical advice" notice: in onboarding, on the Today screen header for that profile, and in every explainer. It also gets **pregnancy-specific hard food-safety filters** on suggestions:
    - no liver or other high-retinol foods
    - no high-mercury fish (shark, swordfish, marlin, fresh or frozen tuna except canned light, orange roughy, escolar), following Health Canada's guidance
    - no raw or undercooked fish, meat or eggs, no unpasteurised dairy, no raw sprouts and no deli meats as suggestions (listeria)
    These need your review before launch.
11. **Band logic (delegated to me, best for her and defensible):**
    - The age bands follow the DRI tables exactly: 19–30, 31–50, 51–70, 71+. This fixes v1 lumping 19–50 together, since magnesium differs.
    - Status: none, pregnant or lactating. Values come from the DRI pregnancy and lactation rows for her age.
    - The **menstrual modifier is independent of age:**
      - Not menstruating at any age → iron uses the non-menstruating values (RDA 8 / EAR 5, so the mark is 6.4). **Everything else stays on her age band.** This fixes v1's mapping to 51+.
      - Menstruating at 51+ → iron uses 18 (mark 14.4).
    - EPA+DHA for pregnancy and lactation is **350 mg**: EFSA's 250 plus the lower end of its +100 to 200 mg DHA. I chose the lower end because it is reachable through low-mercury fish. Flagged for your review.
    - Minimum age is 18. **Decided: an 18-year-old uses the 19–30 band.** This is a documented exception, recorded in `DECISIONS.md` and covered by a test.
    - **Pregnancy review was delegated to me.** In Phase 1 I check the food-safety filter list and the 350 mg EPA+DHA value against Health Canada's current guidance and EFSA's opinion, and record the sources in `DECISIONS.md`. Any change gets reported to you, not made silently.
12. **Design: direction A (Pantry).**
13. **Stack:** Expo/React Native (TypeScript), a new Supabase project, `packages/core` for the domain logic, and RevenueCat for subscriptions.
14. **Testers:** fresh start, an optional import of their foods and rotation, and a founding-member marker with free access for life (see Q1).
15. **Shareable round card: yes.** It shows foods and nutrient names only, with no numbers.
16. **Cycle-aware: the infrastructure is built, nothing is released.** Details below.
17. **Calories:** hidden by default, opt-in.
18. **Canada first:** Canadian English, CAD pricing, Health Canada's priority allergens, the Canadian Nutrient File as a source, and metric units. The US comes later.
19. **Minimum age:** 18+ (see 11 for the age-18 edge).

### 16 in detail: cycle-aware without collecting what we don't use
- The infrastructure is a general **context-modifier system** in `core` (the same mechanism as the menstrual iron modifier) plus a **feature flag**. Adding cycle awareness later means adding modifiers and copy, not rewriting anything.
- **No cycle data is collected until a release decision.** Storing menstrual dates nobody uses adds legal exposure (Washington's My Health My Data Act, Quebec's Law 25) and an App Store privacy-label burden, with no benefit to her.
- **What I'd release first, because it's defensible:** a "heavy periods" profile flag that adds iron emphasis, vitamin C pairing nudges and a "worth raising with your doctor" note. Heavy menstrual bleeding is a well-established driver of iron need.
- **What I'd still advise against:** phase-by-phase "cycle syncing" of nutrient targets. Its evidence is weak, and it's the kind of claim a credentialed founder gets criticised for. We revisit it when we decide on release.

### New from beta: allergens must actually filter (a v1 bug)
Root-cause design: allergen and diet filtering happens **once, in `core.eligibleFoods(profile)`**, *before* ranking. Every surface that recommends food has to take its pool from that function: Best right now, density mode, Browse by my three, Learn top 10, the plate sandbox, swaps, pairings, the shopping list and simple plates. No surface queries foods directly.
- **Curation rule:** a food can't be suggestable unless its allergen tagging is complete. Untagged means not suggestable. It never means "assumed safe".
- **Search and logging** still show every food, but foods containing her allergens carry a visible "Contains: peanuts" label. She can still log them, because she knows her body.
- **Tests:** for every allergen and every recommending surface, a seeded allergic profile returns **zero** tagged foods. There's also a structural test that fails if any surface imports the raw food table. Copy covers the limit: whole-food data can't account for cross-contact, so she should check labels on packaged foods.
- This lands in Phase 1 (`core`) and Phase 4 (surfaces). It doesn't wait for later.

## 10. Your questions answered
**Q1 Monetisation, my recommendation:**
- **Hard paywall at the end of onboarding, with a 7-day free trial.** The paywall comes right after she sees her three suggested nutrients and why, which is when her motivation peaks.
  - **Why 7 days, not 3:** the first weekly check-in lands on day 7, so the trial contains a real payoff. A 3-day trial ends before she has seen the loop work.
- **Plans:** annual (highlighted, with the trial) and monthly. As a rough starting point to validate against current competitor pricing: about CAD 12.99 a month and about CAD 79.99 a year (roughly 50% off monthly). I haven't verified competitors' current prices. I'll check before we set these.
- Apply for **Apple's Small Business Program** (15% commission instead of 30%).
- Use **RevenueCat** for receipts, trials, restore and offer codes.
- Give your **Substack readers an offer code** (an extended trial or first-year discount) as a low-cost acquisition channel.
- **Beta testers get free access for life.** They earned it, and they're your first reviews.
- Before charging: a restore-purchases button, links to terms and privacy, and clear trial terms on the paywall. App Review checks for all three.
- **Ask for a review only at an arrival** (the end of a round where she reached her marks), never in the trial and never after a miss.
- Why not freemium: a free tier forces you to decide which part of the loop to withhold. The loop only works whole, and a hard paywall with a trial gives a cleaner, more honest offer.

**Q2 Database: you're right, so I won't build a temporary USDA adapter.** That would be throwaway work. Instead:
- **Phases 0, 1 and 3 don't need the database at all.** The maths in `core` (targets, bands, rounds, coverage, ranking, upper limits, allergen filtering) works on a small food interface. Its tests use about 30 hand-entered fixture foods, including the known bug cases (lentils, sesame, white beans, salmon, Brazil nuts, oysters). Onboarding and the app shell don't touch food data.
- **Phase 2 waits for your file.** The QA checks are written against the library contract and tested on the same fixtures, so when your database arrives the only new work is one adapter mapping it into the contract, plus a report on what I find (provenance, NULLs, the retinol and folic-acid splits, licences).
- Nothing is built twice, and nothing waits on the database until Phase 2.

**Q4, explained:** the automated checks in 6.6 flag foods whose data looks wrong (a serving that's too big, a "cooked" food with dry-food numbers, a duplicate). A person has to look at each flagged food and approve or fix it before it can be *suggested*. Search isn't affected. The question is how much time a week you can give that review, because it sets how fast the suggested-food list grows beyond the current 160. I'll build a simple review screen showing the food, the problem and a proposed fix, with approve or edit. I'd estimate about 2 minutes per food, so 100 foods is about 3 hours. Even 1 to 2 hours a week works. I'll prioritise the foods that matter most.

**Q5 Selectable list for launch (only what people care about):**
- Iron, calcium, magnesium, potassium, fibre, folate, B12, vitamin A, vitamin C, vitamin K, zinc, choline, ALA, EPA+DHA.
- **Iodine and vitamin E only if they pass** the data-completeness and selectability checks. Iodine depends on whether your database has iodine data. If it doesn't, I'll suggest the public-domain USDA/FDA/ODS iodine database.
- **Everything else is tracked in the background** and never offered as a round.
- Vitamin D stays blocked, with the "talk to your doctor" language.
- Protein stays a background baseline.

**Q6 Legal entity:** we build now. Open the entity, and get the D-U-N-S number Apple requires (it can take a couple of weeks), **before the first public App Store submission.** Moving an app from a personal account to an organisation account later is possible but awkward, especially with Sign in with Apple users. TestFlight on your personal account is fine in the meantime.

**Q7 Design without illustration (decided: no illustrators, ever):** direction A becomes **"Pantry, type-led"**. Every visual is drawn in code or set in type. Nothing is drawn by hand.
- **Jars** are simple geometric vessels drawn in Skia or SVG: a rounded rectangle with a lid line. The fill rises with a soft meniscus and goes past the mark line into a lighter tint. They're animated in code, with a static version for reduced motion.
- **Shelf** is a horizontal rule with jars on it. Each locked-in nutrient adds a jar, so the floor rising is literally a fuller shelf.
- **Food** is never pictured. Each food is a typographic card: its name in the serif, the serving in the sans, and a small **category colour chip** (greens, legumes, fish, dairy, nuts and seeds, grains, fruit). A shared colour per category does the work illustration would have done.
- **Warmth comes from** the palette (cream, deep green, terracotta, saffron), a characterful serif (Fraunces, which is open source), generous spacing, and motion: fills, the end-of-round shelf "arrival", and subtle paper grain made with code-generated noise.
- **Icons:** one open-source line-icon set (for example Phosphor or Lucide) for navigation only.
- The cost is $0, the look stays consistent forever, and nothing blocks on an outside designer.

**Q8 Substack:** yes. Learn pages link to your relevant essays, and the onboarding "why the mark" step can link the essay that defends it.

**Q3 and Q9:** noted. Beta data will feed back in when it arrives, and the allergen bug is handled above.

### Still open
- The merged database file, when it's ready. Only Phase 2 waits on it.

---

## Next steps after approval (order changed so nothing waits on the database)
1. **Phase 0:** check the model alias, create the monorepo, CI and a new Supabase project (never v1), and write the decisions into the repo as `DECISIONS.md`.
2. **Phase 1 (Opus):** write expected values for every audit test before writing code. That includes the new marks, the band and modifier matrix (with 18 → 19–30), the allergen-filter tests and the 30-of-42 example. Then build `packages/core` on fixture foods. The pregnancy review is also done here.
3. **Phase 3, brought forward:** type-led direction A mockups of the key screens (Today, picker, end of round) for your review, then auth, onboarding and the first-run guide.
4. **Phase 2, when your database arrives:** one adapter into the library contract, the QA checks, the selectability report and the review screen.
5. Then phases 4 to 8 as in section 7.

## Verification of this plan itself
This is a planning document, so nothing runs yet. You verify it by reviewing it. Each build phase has its own verification in section 7.
