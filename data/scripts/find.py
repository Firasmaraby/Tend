"""Search the founder's unified foods for curation. Usage: python3 -I find.py WIDE_CSV 'q1|alt' 'q2' ...
Each query: words that must all appear in name_en (case-insensitive); '|' separates alternatives."""
import csv, sys
rows = [r for r in csv.DictReader(open(sys.argv[1], encoding="utf-8"))
        if r["is_preferred"] == "True" and r["basis"] == "per 100 g edible portion" and r["status"] == "active"]
rank = {"cnf": 0, "usda_fdc_sr_legacy": 1, "usda_fdc_foundation": 2}
for q in sys.argv[2:]:
    print(f"## {q}")
    hits = []
    for alt in q.split("|"):
        words = alt.lower().split()
        hits += [r for r in rows if all(w in r["name_en"].lower() for w in words)]
    hits.sort(key=lambda r: (rank.get(r["source_id"], 9), len(r["name_en"])))
    for r in hits[:6]:
        print(f'  {r["food_id"]:32} {r["name_en"][:80]:80} kcal={r["energy_kcal"]} Fe={r["iron_mg"]} Ca={r["calcium_mg"]} st={r["state"]}')
