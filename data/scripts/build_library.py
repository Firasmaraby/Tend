"""Searchable library export: every preferred, standard-basis, active food from one
source country, minus the curated set. These foods can be found and logged, but
are never suggested (no vetted serving, no diet/allergen tags yet).

Usage: python3 -I build_library.py FOODS_WIDE_CSV CURATION_CSV OUT_JSON [SOURCE_ID]
Output is compact: [{"id","n" name,"c" category,"v" {code: value per 100 g}}].
"""
import csv, json, sys
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from build_curated import COLS, num  # same column mapping and NULL rules

GROUPS = {"vegetables": "vegetables", "fruits": "fruit", "grains_cereals": "grains", "legumes": "legumes",
          "nuts_seeds": "nuts_seeds", "meat_poultry": "meat", "fish_seafood": "fish", "eggs": "eggs",
          "dairy": "milk", "fats_oils": "oils_fats", "herbs_spices_condiments": "herbs_spices",
          "sweets_sugars": "other", "beverages": "beverages", "mixed_dishes": "other", "soups_sauces": "other",
          "snacks": "other", "other": "other"}

def main(wide_path, cur_path, out_path, source="cnf"):
    curated = {r["food_id"] for path in cur_path.split(",") for r in csv.DictReader(open(path, encoding="utf-8"))}
    out = []
    for r in csv.DictReader(open(wide_path, encoding="utf-8")):
        if r["source_id"] != source or r["is_preferred"] != "True" or r["status"] != "active":
            continue
        if r["basis"] != "per 100 g edible portion" or r["food_group"] == "baby_foods" or r["food_id"] in curated:
            continue
        v = {}
        for code, (col, factor) in COLS.items():
            x = num(r.get(col))
            if x is not None:
                v[code] = round(x * factor, 4)
        epa, dha = num(r.get("omega3_epa_g")), num(r.get("omega3_dha_g"))
        if epa is not None and dha is not None:
            v["epa_dha"] = round((epa + dha) * 1000, 3)
        if "carbs" not in v and num(r.get("carbs_available_g")) is not None:
            v["carbs"] = round(num(r["carbs_available_g"]) + (num(r.get("fiber_g")) or 0), 4)
        out.append({"id": r["food_id"], "n": r["name_en"], "c": GROUPS.get(r["food_group"], "other"), "v": v})
    json.dump(out, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(out)} library foods written to {out_path}", file=sys.stderr)

if __name__ == "__main__":
    main(*sys.argv[1:5])
