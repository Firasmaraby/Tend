# Data

- `scripts/build_curated.py`: the adapter. It reads the founder's merged database (foodpipe v1.0, `out/unified/foods_wide.csv`) together with a curation file, and writes app-ready foods. Blank cells stay unknown, never zero. EPA+DHA is only summed when both values are known. Vitamin K uses K1 (phylloquinone). Niacin uses niacin equivalents (NE). Copper is converted to µg. The script also prints an energy check (Atwater).
- `scripts/find.py`: searches the database's preferred standard-basis foods, as a curation aid.
- `curation/starter.csv`: the first 86 hand-curated foods, with vetted servings, diet, allergen and pregnancy tags. This is the start of the curation layer, and it scales through rules plus a review queue (docs/plan.md §6.6).

The raw database is not committed here. It lives in the founder's repo (`foodpipe-v1.0.zip`).
