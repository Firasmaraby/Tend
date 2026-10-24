# Data

- `scripts/build_curated.py`: the adapter. It reads the founder's merged database (foodpipe v1.0, `out/unified/foods_wide.csv`) together with a curation file, and writes app-ready foods. Blank cells stay unknown, never zero. EPA+DHA is only summed when both values are known. Vitamin K uses K1 (phylloquinone). Niacin uses niacin equivalents (NE). Copper is converted to µg. The script also prints an energy check (Atwater).
- `scripts/find.py`: searches the database's preferred standard-basis foods, as a curation aid.
- `curation/starter.csv`: the first 86 hand-curated foods, with vetted servings, diet, allergen and pregnancy tags. This is the start of the curation layer, and it scales through rules plus a review queue (docs/plan.md §6.6).

The raw database is not committed here. It lives in the founder's repo (`foodpipe-v1.0.zip`).

## Automatic curation
- `scripts/curate_auto.py`: scope, servings, tags and checks over the founder's database, which writes `curation/auto.csv` and `curation/AUTO_REPORT.md`.
- `curation/review_queue.csv`: the foods flagged for a human look, with a reason for each. Fill in the `decision` column (approve, fix or reject).
- Build the app data from both files: `build_curated.py FOODS_WIDE starter.csv,auto.csv OUT_JSON` (hand-checked rows win).
- `apps/prototype/report.ts`: the selectability report per life stage and diet (bundle with esbuild, run with node).
- `curation/review_decisions.csv`: the founder's decisions from the review page. `curate_auto.py` applies them on every run (remove, approve, searchable only, serving fixes, pregnancy flag changes).
- `curation/removed.csv`: foods removed in review. Pass it to `build_library.py` too, so removed foods aren't searchable either.
