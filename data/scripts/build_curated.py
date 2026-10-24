"""Adapter: founder's unified database (foods_wide.csv) + a curation file -> app foods JSON.

Usage: python3 -I build_curated.py FOODS_WIDE_CSV CURATION_CSV OUT_JSON

Rules that matter (see docs/plan.md §6):
- A blank cell stays absent (unknown). It never becomes 0.
- EPA+DHA is the sum of EPA and DHA only when both are known; otherwise unknown.
- Vitamin K uses phylloquinone (K1), which the DRI is based on, never Japan's K1+MK-4 total.
- Niacin uses niacin equivalents, which the DRI is based on.
- Copper is converted mg -> µg to match the reference tables.
Prints a QA report (energy check, missing values) to stderr.
"""
import csv, json, sys

COLS = {
    "energy_kcal": ("energy_kcal", 1),
    "protein": ("protein_g", 1),
    "fat": ("fat_g", 1),
    "iron": ("iron_mg", 1),
    "calcium": ("calcium_mg", 1),
    "magnesium": ("magnesium_mg", 1),
    "potassium": ("potassium_mg", 1),
    "fibre": ("fiber_g", 1),
    "folate_dfe": ("folate_dfe_ug", 1),
    "folic_acid": ("folic_acid_ug", 1),
    "vit_b12": ("vitamin_b12_ug", 1),
    "vit_a_rae": ("vitamin_a_rae_ug", 1),
    "retinol": ("retinol_ug", 1),
    "vit_c": ("vitamin_c_mg", 1),
    "vit_k": ("vitamin_k1_ug", 1),
    "zinc": ("zinc_mg", 1),
    "choline": ("choline_mg", 1),
    "ala": ("omega3_ala_g", 1),
    "iodine": ("iodine_ug", 1),
    "vit_e": ("vitamin_e_mg", 1),
    "selenium": ("selenium_ug", 1),
    "vit_b6": ("vitamin_b6_mg", 1),
    "thiamin": ("thiamin_b1_mg", 1),
    "riboflavin": ("riboflavin_b2_mg", 1),
    "niacin": ("niacin_equivalents_mg", 1),
    "phosphorus": ("phosphorus_mg", 1),
    "copper": ("copper_mg", 1000),
    "vit_d": ("vitamin_d_ug", 1),
}
SELECTABLE = ["iron", "calcium", "magnesium", "potassium", "fibre", "folate_dfe", "vit_b12", "vit_a_rae",
              "vit_c", "vit_k", "zinc", "choline", "ala", "epa_dha", "iodine", "vit_e"]


DIETS = {"vegan", "vegetarian", "pescatarian", "omnivore"}
ALLERGENS = {"peanut", "tree_nut", "sesame", "milk", "egg", "fish", "crustacean", "mollusc", "soy", "wheat", "gluten", "mustard", "sulphite"}
CATEGORIES = {"leafy_greens", "vegetables", "fruit", "legumes", "grains", "nuts_seeds", "small_seeds", "fish", "shellfish", "meat",
              "poultry", "organ_meat", "eggs", "milk", "yogurt", "cheese", "oils_fats", "fortified", "herbs_spices", "aromatics",
              "garnish", "beverages", "other"}


def validate(c):
    """A malformed curation row must stop the build, never shift silently into the wrong columns."""
    if None in c or any(v is None for v in c.values()):
        raise SystemExit(f"curation row has the wrong number of columns (unquoted comma?): {c}")
    if c["diet"] not in DIETS or c["category"] not in CATEGORIES:
        raise SystemExit(f'{c["food_id"]}: bad diet or category {c["diet"]!r} {c["category"]!r}')
    bad = [a for a in c["allergens"].split("|") if a and a not in ALLERGENS]
    if bad or not float(c["serving_g"]) > 0 or c["suggestable"] not in ("true", "false"):
        raise SystemExit(f'{c["food_id"]}: bad allergens {bad}, serving or suggestable flag')


def num(s):
    return None if s is None or s.strip() == "" else float(s)


def main(wide_path, cur_path, out_path):
    wide = {r["food_id"]: r for r in csv.DictReader(open(wide_path, encoding="utf-8"))}
    foods, problems = [], []
    seen = set()
    rows = [c for path in cur_path.split(",") for c in csv.DictReader(open(path, encoding="utf-8"))]
    for c in rows:
        if c["food_id"] in seen:
            continue
        seen.add(c["food_id"])
        validate(c)
        r = wide.get(c["food_id"])
        if r is None:
            problems.append(f'{c["food_id"]}: not in database')
            continue
        if r["basis"] != "per 100 g edible portion" or r["status"] != "active":
            problems.append(f'{c["food_id"]}: basis/status {r["basis"]}/{r["status"]}')
        per100 = {}
        for code, (col, factor) in COLS.items():
            v = num(r.get(col))
            if v is not None:
                per100[code] = round(v * factor, 6)
        epa, dha = num(r.get("omega3_epa_g")), num(r.get("omega3_dha_g"))
        if epa is not None and dha is not None:
            per100["epa_dha"] = round((epa + dha) * 1000, 6)

        # Energy plausibility (Atwater): flags misnamed or mis-based records.
        p, f, cd = num(r.get("protein_g")), num(r.get("fat_g")), num(r.get("carbs_by_difference_g"))
        ca, fib, alc = num(r.get("carbs_available_g")), num(r.get("fiber_g")) or 0, num(r.get("alcohol_g")) or 0
        kcal = per100.get("energy_kcal")
        if kcal is not None and p is not None and f is not None and (cd is not None or ca is not None):
            est = 4 * p + 9 * f + 7 * alc + (4 * (cd - fib) + 2 * fib if cd is not None else 4 * ca + 2 * fib)
            if est > 0 and abs(kcal - est) / max(kcal, est) > 0.2:
                problems.append(f'{c["food_id"]} {c["display_name"]}: energy {kcal:.0f} vs Atwater {est:.0f}')
        missing = [n for n in SELECTABLE if n not in per100]

        foods.append({
            "id": c["food_id"],
            "name": c["display_name"],
            "category": c["category"],
            "form": r["state"],
            "per100g": per100,
            "suggestable": c["suggestable"] == "true",
            "serving": {"grams": float(c["serving_g"]), "label": c["serving_label"]},
            "diet": c["diet"],
            "allergens": [a for a in c["allergens"].split("|") if a],
            "pregnancyFlags": [p for p in c["pregnancy_flags"].split("|") if p],
            "traits": [t for t in c.get("traits", "").split("|") if t],
            "source": {"id": r["source_id"], "name": r["name_en"], "citation": r["source_citation"], "licence": r["licence"]},
            "missing": missing,
            "curation": "hand" if "status" not in c else c["status"],
            **({"dupGroupId": c["dup_group"]} if c.get("dup_group") else {}),
        })
    json.dump(foods, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(foods)} foods written to {out_path}", file=sys.stderr)
    for p in problems:
        print("QA:", p, file=sys.stderr)
    counts = {n: sum(1 for f in foods if n in f["per100g"]) for n in SELECTABLE}
    print("Known values per selectable nutrient:", counts, file=sys.stderr)


if __name__ == "__main__":
    main(*sys.argv[1:4])
