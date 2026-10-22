# foodpipe v1.0: independent re-review

Reviewer: Claude (Opus), the same chat that reviewed v0.3. I did not build or fix v1.0, and I changed nothing in it. Date: 2026-10-22.
Inputs: `foodpipe-v1.0.zip`, `food_database_v1.0.xlsx`, and the raw official files for **all 9 sources**. CoFID 2021 and AFCD Release 3 arrived this time; their md5 values match `sources.yaml`.
Method: the same independent readers and scripts used for v0.3, plus new readers for CoFID and AFCD. Every count below was recomputed from the files.

## Verdict: GO for app use

There is one condition on how apps read the data. Filter on **both** `is_preferred = TRUE` **and** `basis = "per 100 g edible portion"`, or show the basis label next to the food.

61 preferred records are on another basis and have no edible-portion record to replace them:
* 31 CoFID alcoholic drinks (per 100 mL);
* 17 USDA dry-matter beans;
* 12 CoFID records weighed with skin, bone or shell;
* 1 Swiss pizza on an assumed basis.

Their labels are now correct. They just shouldn't appear in a plain list of foods next to normal records.

Everything left is minor and can wait for v1.1.

---

## 1. Fidelity: 9 of 9 sources, every value traced to the raw cell

| Source | Values compared (all, not a sample) | Result |
|---|---|---|
| **CoFID 2021** (new) | 114,228: 97,933 numbers, 8,414 "N", 7,881 "Tr"; 15,687 blanks correctly absent | 0 mismatches. "N" → `present_not_quantified` (never a number), "Tr" → `trace` = 0. CHO goes only to `carbs_available_monosaccharide_g`. 1,078 fibre values are NSP (Englyst) where AOAC is missing or "N"; each is labelled in `note`. |
| **AFCD R3** (new) | 72,296 numbers + 1,588 kcal derived from kJ | 0 mismatches. kcal = kJ/4.184 exactly (max error 5e-7). The mg→g factors (EPA, DHA, trans) are correct. |
| CNF | 259,452 + **50 released** values (sources 81/82/83) | 0 mismatches. The 50 released values equal the raw cells exactly. The withheld calorie value for dragon fruit no longer reappears as a derived value. |
| Swiss | 48,843 | 0 mismatches. The 4 IFCT-India cells are removed (`swiss_fcdb:275` cashew: 3 cells; `swiss_fcdb:13883` litchi: 1 cell). |
| SR Legacy, Foundation, Ciqual, MEXT, TACO | 309,983 / 10,348 / 115,109 / 87,837 / 16,198 | 0 mismatches (unchanged from v0.3). |

The workbook opens completely (11 sheets). food_nutrients = 1,048,575 + 32,673 = 1,081,248 rows, which equals the CSV. The properties carry the notice.

## 2. The v0.3 findings

| v0.3 finding | Status | Evidence |
|---|---|---|
| **B1** wrong basis | **Closed**, with the app filter above | All 206 CoFID "weighed…" records → `per 100 g as purchased (incl. refuse)`. All 34 Foundation "(0% moisture)" records → `per 100 g dry matter`. 0 of them in multi-source clusters; 0 borrowed values into or out of them; not in the density ranking. Where a same-name standard-basis twin exists, the cluster has no preferred record (194 clusters, each with a `preferred_note`). 29 remain preferred because they have no twin (see Verdict). |
| **M1** unreviewed CNF↔USDA links | **Closed** | All 346 pairs were re-judged. 158 are clustered again (155 of them confirmed by Sonnet), 188 are not. The cannelloni/tortellini, reduced-sugar/sugar-free syrup, raw/cooked ground pork and corned-beef pairs are all split. All 10,985 "same-origin" notes sit on true derivations; 0 sit on the 346. Of the 158 re-clustered pairs, 17 still differ by more than 20% on fat. All 17 are the same cut or product with kcal within 7%, i.e. Canadian re-analysis. That is acceptable. |
| **M2** wrong merges | **Closed** | Of my 69 confirmed-wrong clusters: 33 are fully split; 26 now hold only the genuine CNF↔USDA derivation pair (e.g. both "with salt"); 10 hold sub-groups that I agree are correct. The one exception is the **spinach spaghetti** pair: CNF enriched (folic acid 62 µg) is still merged with SR unenriched (0 µg), in clusters `cf_1c64da8827` (cooked) and `cf_ee62315c09` (dry). It is a true derivation, so the guard exempts it. The guard also catches the patterns: 580 new downgrades, of which 368 for sodium 3× and 322 for salt wording. |
| **M3** fortification leakage | **Closed** | 0 values now pass from North-American enriched donors (FOLAC > 0) into other countries' foods. The croissant, wafer-cone and rusk cases are gone. |
| **M4** licence rule | **Applied** | The decision is recorded in sources.yaml and the 72/50 wording is fixed. One inconsistency remains (see m-a). |
| m4 preferred without calories | **Closed** | 166 preferred records lack energy, and none has a cluster sibling with energy. The peanut butter now keeps the record with 589 kcal. |
| Item 7 app and citation fixes | **Closed** | `derivation` and `licence` are now in food_nutrients. `estimated_nutrients` is in foods_wide: all 15,993 MEXT parenthesised values are marked "estimated". The key (food_id, nutrient_code, value_type) is unique; 776 food/nutrient pairs have both a `present_not_quantified` or `pending` row and a `borrowed` row, as documented. The NOTICE has CNF's "as is" and "not medical advice" wording. The changes notices mention derived DFE. Version = 1.0. Every row cites its source, every borrowed row cites its donor, and no shipped CSV lacks citation columns. |

## 3. Fresh independent sample of wrong merges

I drew a **new** sample of 200 clusters (seed 777): 150 with a non-CNF/USDA member out of 1,189, and 50 CNF/USDA-only out of 3,497. I read every member of each cluster.

| Stratum | v0.3 wrong | v1.0 wrong | v1.0 borderline |
|---|---|---|---|
| Independent (150) | 4.7% | **0 / 150** (95% upper bound 2.4%) | 7 |
| CNF/USDA-only (50) | 0.7% | **0 / 50** | 0 |

The 7 borderline clusters, none with materially wrong values:
* poached egg: SR has sodium 297, the other sources ~120;
* canned potato: unsalted (Na 5) with FR canned (Na 61);
* fig jam with a generic jam;
* red king crab with a generic crab;
* mixed-colour sweet pepper with red peppers;
* two bread clusters that mix UK/AU flour, which is fortified by law, with unfortified Swiss or French bread.

I also re-ran the rule sweep over all 4,686 multi-source clusters. It flagged **44 clusters (v0.3: 188)**. On reading: 2 wrong (the spinach spaghetti pair), 7 borderline (syrup grades, "whole contents" vs "drained", brand vs brand), and the rest fine.

## 4. Remaining findings (all minor)

* **m-a. One licence inconsistency is left.** Under your rule, IFCT-India values were removed from Swiss. AFCD's Food Details say `afcd:F002258` (cardamom) has some values borrowed from the Indian Food Composition Tables 2017. To apply the rule consistently, remove those too, or record an exception.
* **m-b. The safety check is a little over-cautious.** In 40 random new downgrades, 6 split true matches. Examples:
  * paprika and spelt split on a sugar quirk;
  * "Milk chocolate" caught by the drink vitamin D rule, because its regex matches "milk";
  * fruit punch split because SR reports 0 sugar.

  That is about 15%, so roughly 90 good matches are lost. This costs coverage, not accuracy: borrowed values went from 47,301 to 44,529, and density-nutrient coverage from 79.9% to 79.8%. *Fix:* skip the drink vitamin D rule for chocolate and confectionery, and require two rules to fire for sugar-only downgrades of spices and grains.
* **m-c. Spinach spaghetti, enriched vs unenriched** (2 clusters). This is a CNF derivation with Food_Source 1 ("changed to meet Canadian regulations"). *Fix:* don't exempt Food_Source 1 derivations from the folic acid rule.
* **m-d. UK and Australian mandatory flour fortification isn't covered by the fortification guard.** Their donors have no folic acid, so the guard doesn't fire. Example: the FR "Biscuit, oat, plain" received Ca, Fe, thiamin and niacin from a UK digestive (4 values). *Fix:* treat CoFID and AFCD flour, bread and biscuit donors as fortified for Ca, Fe, B1 and B3.
* **m-e. The density ranking is no longer shipped.** It was dropped with the other files that lacked citation columns. If the app needs it, add citation columns and ship it, de-duplicated by `canonical_id`.
* **Carried over from v0.3, unfixed by design:**
  * m6: "independent" sources often copy USDA values;
  * m7: AFCD vitamin D is "D3 equivalents";
  * m8: the within-source collapse merged the digestive cookie and pancake mix records;
  * m9: Japanese human-milk iodine; Ciqual "en rôti" state;
  * m10: one translation;
  * 1,572 pairs still in the cluster review queue.

  None shows users wrong numbers at a scale that blocks use.

## 5. For v1.1, in order of value

1. Tune the guard (m-b), so fewer true matches are lost.
2. The two fortification gaps (m-c, m-d).
3. Ship the density ranking with citations, if the app uses it (m-e).
4. The cardamom/IFCT decision (m-a).

Evidence (REVIEW_v1.0_evidence.zip): `v1_cluster_sample_200_verdicts.csv`, `v1_flagged_44_verdicts.csv`, `cluster_sweep.csv`, `match_guard_log.csv`.
