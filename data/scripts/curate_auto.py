"""Automatic curation: everyday foods from the founder's database -> curation rows.

Usage: python3 -I curate_auto.py FOODS_WIDE_CSV STARTER_CSV OUT_CSV [REPORT_MD]

Pipeline (docs/plan.md section 6.6):
1. Scope: preferred, standard-basis, active Canadian Nutrient File foods in
   everyday groups, in the form people eat them (cooked legumes and meat,
   no raw beans or raw chicken), no brands, salted duplicates, fried foods,
   sweets, flours or processed meats.
2. Category, serving (category rules from the brief), diet, allergens and
   pregnancy flags from food group plus name keywords.
3. QA checks. Anything odd gets status needs_review with reasons; clean
   rows are auto_passed. Hand-checked starter rows always win.
Nothing here is suggested until it passes; flagged foods stay searchable.
"""
import csv, re, sys
from collections import defaultdict

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from build_curated import COLS, num  # one column mapping, one NULL rule

GROUPS = {"vegetables", "fruits", "grains_cereals", "legumes", "nuts_seeds", "meat_poultry", "fish_seafood", "eggs", "dairy", "fats_oils", "beverages"}

EXCLUDE = re.compile(
    r"salt added|with salt|babyfood|fast food|imitation|substitute|powder|dehydrated|unprepared|game meat|indigenous|composite|"
    r"\bfat,|cookie|cake|cracker|pancake|waffle|muffin|\bpie\b|pastry|doughnut|croissant|granola|cereal, ready|breaded|nugget|patty|"
    r"batter|candied|syrup|sweetened|juice|nectar|drink|cocktail|sausage|deli|bacon|wiener|bologna|salami|pepperoni|luncheon|frankfurter|"
    r"ham\b|jerky|ice cream|frozen dessert|pudding|chocolate|flavou?red|\bcream\b|margarine|shortening|lard|tallow|butter,|^butter|"
    r"flour|\bmeal\b|bran\b|germ\b|chips|fries|french fried|hash brown|pickled|sauce|soup|gravy|dressing|mayonnaise|spread|"
    r"stuffing|noodles, chinese|instant|dry mix|mix,|with added|sugar|honey roasted|oil roasted|salted|\bfried\b|deep-fried|"
    r"heart\b|kidney, raw|kidneys|tongue|tripe|brain|giblet|gizzard|sweetbread|lung|spleen|pancreas|liver|"
    r"skin only|separable fat|trimmed to 1/2|with skin|meat and skin|lean and fat|ground, regular|regular ground|"
    r"sprouts?, raw|sprouted, raw|alfalfa|simulated|glazed|solids and liquid|with liquid|human|breast milk|frozen mixture|flakes|prepared from|in heavy|in light syrup|in syrup|stewed|frozen, unprepared|"
    r"\braw\b.*(beans|lentils|peas|chickpeas)|mature seeds, raw|uncooked|, dry\b(?!.*oats)",
    re.I,
)
# Brand-like names in CNF use "Name: variety, Brand".
BRANDISH = re.compile(r":")

LEAFY = re.compile(r"leaves|spinach|kale|chard|collard|lettuce|arugula|rocket|bok choy|pak-choi|mustard greens|turnip greens|beet greens|dandelion|watercress|endive|escarole|romaine|rapini|broccoli raab|amaranth leaves", re.I)
BERRIES = re.compile(r"berr", re.I)
SMALL_SEEDS = re.compile(r"chia|flax|sesame|hemp|poppy", re.I)
SHELLFISH = re.compile(r"shrimp|prawn|crab|lobster|crayfish|clam|mussel|oyster|scallop|squid|octopus|whelk|abalone|snail|conch|cuttlefish", re.I)
CRUSTACEAN = re.compile(r"shrimp|prawn|crab|lobster|crayfish", re.I)
POULTRY = re.compile(r"chicken|turkey|duck|goose|hen\b|cornish|quail|pheasant", re.I)
COMMON_MEAT = re.compile(r"ground|sirloin|tenderloin|steak|roast|loin|chop|breast|thigh|drumstick|leg\b|stewing|cubed|flank|round|rib eye|shank", re.I)
TREE_NUTS = re.compile(r"almond|walnut|cashew|pecan|pistachio|hazelnut|filbert|macadamia|brazil|pine nut|pinyon|chestnut|beechnut|butternut", re.I)
WHEAT = re.compile(r"wheat|\bbread\b|pasta|spaghetti|macaroni|couscous|bulgur|semolina|spelt|farro|durum|kamut|seitan|bagel|\bpita\b|tortilla, flour|soba", re.I)
HERBS = re.compile(r"chives|coriander|cilantro|parsley|\bdill|basil|\bmint|spearmint|peppermint|thyme|rosemary|oregano|\bsage\b|tarragon|lemongrass|lemon grass|garlic|ginger root|\bshallot|epazote|lovage|sorrel|fennel, leaves|seaweed|nori|kelp|wakame", re.I)
GLUTEN_ONLY = re.compile(r"barley|\brye\b|\boats?\b|oatmeal|oat bran", re.I)
NOT_WHEAT = re.compile(r"buckwheat groats|squash|rice noodle|noodles, rice|rice vermicelli|corn tortilla|tortilla, corn|glass noodle|made from soy", re.I)
PLANT_DAIRY_WORDS = re.compile(r"plant-based|\bsoy|tofu|coconut|almond|oat beverage|rice beverage|seed butter|nut butter|peanut butter|almond butter|cashew butter|sesame butter|butternut|cocoa butter", re.I)
RAW_UNEATEN = re.compile(r"potato|yam|cassava|taro|squash, winter|winter squash|pumpkin, raw|eggplant|artichoke|okra|parsnip|rutabaga|plantain|lima|lotus root|burdock|arrowroot|breadfruit|soybeans, green|edamame|beans, (lima|fava|broad)|broadbeans", re.I)
SOY = re.compile(r"\bsoy|tofu|edamame|tempeh|miso|natto", re.I)
SOFT_CHEESE = re.compile(r"brie|camembert|havarti|blue|roquefort|gorgonzola|stilton|limburger|queso fresco|panela|feta|ricotta|mascarpone|goat", re.I)
HIGH_MERCURY = re.compile(r"swordfish|shark|marlin|orange roughy|escolar|tilefish|king mackerel|mackerel, king|tuna, (fresh|bluefin|yellowfin|bigeye|skipjack)|tuna,.*(raw|baked|broiled|cooked)", re.I)
ALBACORE = re.compile(r"albacore|white tuna|tuna, white", re.I)
SMOKED_FISH = re.compile(r"smoked", re.I)
# Everyday foods in a Canadian kitchen. Only these are suggested; everything
# else that passes the checks keeps its serving and stays searchable and
# loggable, but isn't recommended (suggestions full of rare foods don't help).
EVERYDAY = re.compile(
    r"^(beans, (black|kidney|navy|pinto|white|great northern|lima|cranberry|adzuki|mung|small white|french|snap|green)|lentils|chickpeas|peas, (green|split)|"
    r"tofu|edamame|soybeans?, green|soybean, fermented products, tempeh|hummus|"
    r"grains, (rice|quinoa|oats|barley|bulgur|couscous|millet|buckwheat|wild rice)|cereal, hot, oat|bread, (whole wheat|rye|pumpernickel|multigrain|mixed grain|oat|sourdough|french|white|pita|60%)|pasta|"
    r"spinach|kale|chard|collards|lettuce|arugula|bok choy|broccoli|cauliflower|cabbage|brussels sprouts|carrots?|peppers?, sweet|pepper, sweet|tomato|cucumber|zucchini|squash|"
    r"sweet potato|potato|beets|asparagus|corn, sweet|mushrooms?|onions?|celery|eggplant|green peas|peas, edible-podded|snow peas|"
    r"avocado|apples?|bananas?|oranges?|strawberr|blueberr|raspberr|blackberr|grapes?\b|kiwi|mango|pears?\b|peach|plums?\b|cherr|cantaloupe|melon|watermelon|pineapple|papaya|grapefruit|apricot|prunes|plums, dried|raisins|dates|figs|clementine|tangerine|mandarin|"
    r"nuts, (almonds|walnuts|cashew|pecans|pistachio|filberts|hazelnuts|brazil|macadamia|pine nuts)|peanuts|peanut butter|almond butter|seeds, (sunflower|pumpkin|sesame|chia|flax|hemp)|sesame butter|tahini|"
    r"fish, (salmon|trout|sardine|mackerel, atlantic|tuna, light|cod|haddock|halibut|tilapia|pollock|sole|herring|arctic char|whitefish|catfish|perch|snapper)|crustaceans, (shrimp|crab|lobster)|mollusks, (mussel|scallop|clam|oyster)|"
    r"chicken|turkey|beef|pork|lamb|egg, chicken|"
    r"milk, fluid, (skim|partly skimmed|whole|1%|2%|3\.25%)|milk, fluid, (partly|whole)|kefir|yogourt|cheese, (cheddar|mozzarella|swiss|parmesan|cottage|ricotta|feta|gouda|brie|camembert|havarti|edam|provolone|monterey|colby|goat)|"
    r"plant-based beverage|vegetable oil, (olive|canola|flaxseed|walnut|avocado|sunflower))",
    re.I,
)


def category(r):
    g, n = r["food_group"], r["name_en"]
    if g == "vegetables":
        if HERBS.search(n):
            return "herbs_spices"  # searchable, never suggested
        return "leafy_greens" if LEAFY.search(n) else "vegetables"
    if g == "fruits":
        return "fruit"
    if g == "grains_cereals":
        return "grains"
    if g == "legumes":
        return "nuts_seeds" if re.search(r"peanut", n, re.I) else "legumes"
    if g == "nuts_seeds":
        return "small_seeds" if SMALL_SEEDS.search(n) and not re.search(r"butter|paste|tahini", n, re.I) else "nuts_seeds"
    if g == "fish_seafood":
        return "shellfish" if SHELLFISH.search(n) else "fish"
    if g == "meat_poultry":
        return "poultry" if POULTRY.search(n) else "meat"
    if g == "eggs":
        return "eggs"
    if g == "dairy":
        if re.search(r"yog", n, re.I):
            return "yogurt"
        if re.search(r"cheese", n, re.I):
            return "cheese"
        return "milk"
    if g == "fats_oils":
        return "oils_fats"
    if g == "beverages":
        return "milk"  # only fortified plain plant beverages reach here
    return "other"


def in_scope(r):
    g, n, st = r["food_group"], r["name_en"], r["state"]
    if g not in GROUPS or EXCLUDE.search(n) or BRANDISH.search(n):
        return False
    if g == "beverages":
        return bool(re.search(r"plant-based beverage", n, re.I) and re.search(r"plain", n, re.I) and re.search(r"fortified", n, re.I) and not re.search(r"not fortified|unfortified", n, re.I))
    if g == "fats_oils":
        return bool(re.search(r"\boil\b", n, re.I)) and not re.search(r"fish oil|cod liver|hydrogenated|blend", n, re.I)
    if g in ("meat_poultry", "fish_seafood", "eggs"):
        if st == "raw" or re.search(r"\braw\b", n, re.I):
            return False
    if g == "meat_poultry":
        return bool(COMMON_MEAT.search(n)) and bool(re.search(r"lean|meat only|breast|ground", n, re.I))
    if g == "eggs":
        return bool(re.search(r"chicken, whole|whole, cooked|hard|poached|scrambled|boiled", n, re.I)) and not re.search(r"duck|goose|quail|turkey", n, re.I)
    if g == "legumes":
        if re.search(r"\braw\b|mature seeds, raw", n, re.I) and not re.search(r"tofu|peanut", n, re.I):
            return False
    if g == "grains_cereals":
        if re.search(r"oats|oatmeal", n, re.I):
            return True
        return bool(re.search(r"cooked|boiled|bread|pita|tortilla", n, re.I))
    if g == "dairy":
        if re.search(r"yog", n, re.I):
            return bool(re.search(r"plain", n, re.I))
        if re.search(r"cheese", n, re.I):
            return not re.search(r"spread|food|product|processed|sauce", n, re.I)
        return bool(re.search(r"milk, fluid|kefir|buttermilk", n, re.I)) and not re.search(r"evaporated|condensed|goat", n, re.I)
    if g == "vegetables":
        if (st == "raw" or re.search(r"\braw\b", n, re.I)) and RAW_UNEATEN.search(n):
            return False
        return st in ("raw", "cooked_moist", "roasted_baked", "canned", "frozen", "unknown") and not re.search(r"seasoned|creamed|scalloped|au gratin|mashed, (home|dehyd)", n, re.I)
    return True


def serving(cat, r):
    n, st = r["name_en"], r["state"]
    cooked = st in ("cooked_moist", "roasted_baked", "grilled", "sauteed") or re.search(r"cooked|boiled|baked|roasted|steamed|broiled|braised|stewed|microwaved", n, re.I)
    if cat == "leafy_greens":
        return (170, "about 1 cup cooked") if cooked else (35, "1 cup")
    if cat == "vegetables":
        if re.search(r"potato", n, re.I) and re.search(r"baked", n, re.I):
            return (170, "1 medium")
        return (155, "about 1 cup cooked") if cooked else (125, "about 1 cup chopped")
    if cat == "fruit":
        if st == "dried" or re.search(r"dried|prunes|raisins|dates", n, re.I):
            return (40, "¼ cup")
        if re.search(r"avocado", n, re.I):
            return (75, "½ avocado")
        if BERRIES.search(n):
            return (145, "1 cup")
        return (140, "1 medium or 1 cup")
    if cat == "legumes":
        if re.search(r"tofu|tempeh", n, re.I):
            return (125, "½ cup")
        if re.search(r"hummus", n, re.I):
            return (60, "¼ cup")
        return (175, "about 1 cup cooked")
    if cat == "grains":
        if re.search(r"oats|oatmeal", n, re.I) and not cooked:
            return (40, "½ cup dry")
        if re.search(r"pita|tortilla|naan|paratha|roti|chapati|bagel", n, re.I):
            return (64, "1 piece")
        if re.search(r"bread", n, re.I):
            return (64, "2 slices")
        return (160, "about 1 cup cooked")
    if cat == "nuts_seeds":
        if re.search(r"butter|paste", n, re.I):
            return (32, "2 tbsp")
        return (30, "¼ cup")
    if cat == "small_seeds":
        return (15, "1½ tbsp")
    if cat == "fish":
        return (100, "½ can drained") if st == "canned" or re.search(r"canned", n, re.I) else (100, "1 piece")
    if cat == "shellfish":
        return (85, "1 portion")
    if cat in ("meat", "poultry"):
        return (100, "1 portion")
    if cat == "eggs":
        return (100, "2 large eggs")
    if cat == "milk":
        return (258, "1 cup (250 mL)")
    if cat == "yogurt":
        return (175, "¾ cup")
    if cat == "cheese":
        if re.search(r"cottage|ricotta", n, re.I):
            return (113, "½ cup")
        if re.search(r"parmesan|romano|grated", n, re.I):
            return (15, "2 tbsp grated")
        return (30, "1 slice")
    if cat == "oils_fats":
        return (14, "1 tbsp")
    return (100, "100 g")


def diet(cat, n):
    if cat in ("meat", "poultry", "organ_meat"):
        return "omnivore"
    if cat in ("fish", "shellfish"):
        return "pescatarian"
    if cat in ("eggs", "milk", "yogurt", "cheese") and not PLANT_DAIRY_WORDS.search(n):
        return "vegetarian"
    if re.search(r"\begg|milk|cheese|butter|cream|honey|whey", n, re.I) and not PLANT_DAIRY_WORDS.search(n):
        return "vegetarian"
    if cat == "grains" and re.search(r"bread|bagel|pita", n, re.I):
        return "vegetarian"  # commercial breads may contain milk or egg
    return "vegan"


def allergens(cat, n):
    a = set()
    if cat == "fish":
        a.add("fish")
    if cat == "shellfish":
        a.add("crustacean" if CRUSTACEAN.search(n) else "mollusc")
    if (cat in ("milk", "yogurt", "cheese") or re.search(r"\bmilk\b(?!-fed)|cheese|butter,|\bcream\b|whey", n, re.I)) and not PLANT_DAIRY_WORDS.search(n):
        a.add("milk")
    if cat == "eggs" or re.search(r"\begg", n, re.I):
        a.add("egg")
    if re.search(r"peanut", n, re.I):
        a.add("peanut")
    if TREE_NUTS.search(n) and not re.search(r"water ?chestnut|butternut squash|squash, winter, butternut", n, re.I):
        a.add("tree_nut")
    if re.search(r"sesame|tahini", n, re.I):
        a.add("sesame")
    if SOY.search(n):
        a.add("soy")
    if WHEAT.search(n) and not NOT_WHEAT.search(n):
        a.update({"wheat", "gluten"})
    if GLUTEN_ONLY.search(n) and cat != "oils_fats":
        a.add("gluten")
    if re.search(r"mustard", n, re.I) and cat != "leafy_greens":
        a.add("mustard")
    if re.search(r"sulfured|sulphured|sulphite|sulfite", n, re.I) or (cat == "fruit" and re.search(r"apricots?, dried|raisins, golden", n, re.I)):
        a.add("sulphite")
    return sorted(a)


def pregnancy(cat, n):
    f = set()
    if cat in ("fish", "shellfish"):
        if HIGH_MERCURY.search(n) and not re.search(r"light, canned|canned, light|tuna, light", n, re.I):
            f.add("high_mercury_fish")
        if ALBACORE.search(n):
            f.add("albacore_tuna")
        if SMOKED_FISH.search(n) and not re.search(r"canned", n, re.I):
            f.add("refrigerated_smoked_seafood")
    if cat == "cheese" and SOFT_CHEESE.search(n):
        f.add("soft_cheese")
    if re.search(r"unpasteuri", n, re.I):
        f.add("unpasteurised_dairy")
    return sorted(f)


def main(wide_path, starter_path, out_path, report_path=None):
    starter = {r["food_id"]: r for r in csv.DictReader(open(starter_path, encoding="utf-8"))}
    rows = [r for r in csv.DictReader(open(wide_path, encoding="utf-8"))
            if r["source_id"] == "cnf" and r["is_preferred"] == "True" and r["status"] == "active"
            and r["basis"] == "per 100 g edible portion"]
    # The founder's database already clusters duplicates across sources; never add
    # a second record of a food that is hand-checked.
    canon = {r["food_id"]: r["canonical_id"] for r in rows}
    starter_clusters = {canon[i] for i in starter if canon.get(i)}
    scoped = [r for r in rows if r["food_id"] not in starter and r["canonical_id"] not in starter_clusters and in_scope(r)]

    # Category percentiles for the outlier check.
    per_cat = defaultdict(lambda: defaultdict(list))
    for r in scoped:
        c = category(r)
        for code, (col, factor) in COLS.items():
            v = num(r.get(col))
            if v is not None:
                per_cat[c][code].append(v * factor)
    p99 = {c: {k: sorted(v)[int(0.99 * (len(v) - 1))] for k, v in d.items() if len(v) >= 20} for c, d in per_cat.items()}

    out, counts = [], defaultdict(lambda: defaultdict(int))
    for r in scoped:
        n = r["name_en"]
        cat = category(r)
        g, label = serving(cat, r)
        reasons = []
        kcal = num(r.get("energy_kcal"))
        p, fat, cd = num(r.get("protein_g")), num(r.get("fat_g")), num(r.get("carbs_by_difference_g"))
        fib = num(r.get("fiber_g")) or 0
        if kcal is None:
            reasons.append("no energy value")
        elif p is not None and fat is not None and cd is not None:
            est = 4 * p + 9 * fat + 4 * (cd - fib) + 2 * fib
            if est > 0 and abs(kcal - est) / max(kcal, est) > 0.2:
                reasons.append(f"energy {kcal:.0f} vs Atwater {est:.0f}")
        if kcal is not None and cat in ("legumes", "grains") and re.search(r"cooked|boiled", n, re.I) and kcal > 220:
            reasons.append(f"named cooked but {kcal:.0f} kcal/100 g looks dry")
        if kcal is not None and not (5 <= kcal * g / 100 <= 450):
            reasons.append(f"serving energy {kcal * g / 100:.0f} kcal")
        known = sum(1 for code in ("iron", "calcium", "magnesium", "potassium", "zinc", "vit_c", "folate_dfe", "vit_a_rae", "fibre", "vit_b12") if num(r.get(COLS[code][0])) is not None)
        if known < 6:
            reasons.append(f"thin data ({known}/10 core values)")
        for code, (col, factor) in COLS.items():
            v = num(r.get(col))
            lim = p99.get(cat, {}).get(code)
            if v is not None and lim and lim > 0 and v * factor > 3 * lim:
                reasons.append(f"{code} outlier for {cat}")
        if cat == "cheese" and re.search(r"feta|goat|ricotta", n, re.I):
            reasons.append("pregnancy cheese rule: confirm pasteurised and soft/semi-soft status")
        status = "needs_review" if reasons else "auto_passed"
        counts[cat][status] += 1
        out.append({
            "food_id": r["food_id"],
            "display_name": clean_name(n),
            "category": cat,
            "serving_g": g,
            "serving_label": label,
            "diet": diet(cat, n),
            "allergens": "|".join(allergens(cat, n)),
            "pregnancy_flags": "|".join(pregnancy(cat, n)),
            "suggestable": "true" if status == "auto_passed" and cat != "herbs_spices" and EVERYDAY.search(n) and not re.search(r"sheep|goat milk|buffalo|horse|bison|elk|venison|caribou|moose", n, re.I) else "false",
            "traits": "high_oxalate" if re.search(r"spinach|chard|beet greens", n, re.I) else "",
            "status": status,
            "reasons": "; ".join(reasons),
            "source_name": n,
        })

    fields = ["food_id", "display_name", "category", "serving_g", "serving_label", "diet", "allergens", "pregnancy_flags", "suggestable", "traits", "status", "reasons", "source_name"]
    with open(out_path, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fields, lineterminator="\n")
        w.writeheader()
        w.writerows(sorted(out, key=lambda x: (x["status"], x["category"], x["display_name"])))
    total_pass = sum(v["auto_passed"] for v in counts.values())
    everyday = sum(1 for o in out if o["suggestable"] == "true")
    print(f"{everyday} everyday foods are suggestable; the rest stay searchable with servings", file=sys.stderr)
    total_review = sum(v["needs_review"] for v in counts.values())
    print(f"{len(rows)} CNF foods, {len(scoped)} in scope: {total_pass} auto-passed, {total_review} need review", file=sys.stderr)
    for c in sorted(counts):
        print(f"  {c:14} passed {counts[c]['auto_passed']:4}  review {counts[c]['needs_review']:4}", file=sys.stderr)
    if report_path:
        with open(report_path, "w", encoding="utf-8") as fh:
            fh.write(f"# Automatic curation report\n\n{len(scoped)} foods in scope from the Canadian Nutrient File. "
                     f"{total_pass} passed every check, {total_review} need a look. {everyday} everyday foods are suggestable.\n\n| Category | Passed | Review |\n|---|---|---|\n")
            for c in sorted(counts):
                fh.write(f"| {c} | {counts[c]['auto_passed']} | {counts[c]['needs_review']} |\n")


DROP = re.compile(r",\s*(mature seeds|drained|without salt|year round average|all commercial varieties|all types|all varieties|boneless|separable lean only)", re.I)


def clean_name(n):
    """Readable, honest names. Founder review can polish these; the source name is kept beside them."""
    s = DROP.sub("", n)
    s = re.sub(r"\s+", " ", s).strip(" ,")
    return s[0].upper() + s[1:] if s else n


if __name__ == "__main__":
    main(*sys.argv[1:5])
