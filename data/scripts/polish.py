"""Readable names and food-specific servings for automatically curated foods.

The source name is always kept next to the display name (source_name column),
so polishing never loses traceability. Servings are common household measures
(USDA/CNF household weights, rounded); anything without a specific rule keeps
its category serving.
"""
import re

# (pattern on the source name, grams, label). First match wins.
SERVINGS = [
    (r"grapefruit", 123, "½ grapefruit"),
    (r"spinach, canned", 214, "1 cup"),
    (r"tomato.*canned|tomatoes.*canned", 120, "½ cup"),
    (r"peas, green, raw", 145, "1 cup"),
    (r"rice.*cooked|cooked.*rice", 190, "1 cup cooked"),
    (r"quinoa, cooked", 185, "1 cup cooked"),
    (r"bulgur, cooked", 182, "1 cup cooked"),
    (r"couscous, cooked", 157, "1 cup cooked"),
    (r"barley.*cooked", 157, "1 cup cooked"),
    (r"millet, cooked", 174, "1 cup cooked"),
    (r"buckwheat.*cooked", 168, "1 cup cooked"),
    (r"oat.*cooked|oatmeal, cooked|cereal, hot, oat", 234, "1 cup cooked"),
    (r"^pasta|spaghetti|macaroni|noodles", 140, "1 cup cooked"),
    (r"lentils.*boiled|lentils.*cooked", 198, "1 cup cooked"),
    (r"chickpeas.*boiled", 164, "1 cup cooked"),
    (r"^beans, (navy|white|small white|great northern).*boiled", 180, "1 cup cooked"),
    (r"^beans, .*boiled|^beans, .*canned", 172, "1 cup cooked"),
    (r"^peas, split.*boiled", 196, "1 cup cooked"),
    (r"spinach.*(boiled|cooked)", 180, "1 cup cooked"),
    (r"collards.*(boiled|cooked)", 190, "1 cup cooked"),
    (r"chard.*(boiled|cooked)", 175, "1 cup cooked"),
    (r"kale.*(boiled|cooked)", 130, "1 cup cooked"),
    (r"(mustard|turnip) greens.*(boiled|cooked)", 140, "1 cup cooked"),
    (r"spinach, raw", 30, "1 cup"),
    (r"kale.*raw", 21, "1 cup chopped"),
    (r"lettuce, iceberg", 72, "1 cup shredded"),
    (r"lettuce, (cos|romaine)", 47, "1 cup shredded"),
    (r"lettuce", 40, "1 cup shredded"),
    (r"arugula|rocket", 20, "1 cup"),
    (r"broccoli.*(boiled|cooked)", 156, "1 cup cooked"),
    (r"broccoli.*raw|broccoli$", 91, "1 cup chopped"),
    (r"cauliflower.*(boiled|cooked)", 124, "1 cup cooked"),
    (r"cauliflower.*raw", 107, "1 cup chopped"),
    (r"carrots?.*(boiled|cooked)", 156, "1 cup cooked"),
    (r"carrots?.*raw|carrots?, baby", 128, "1 cup chopped"),
    (r"pepper, sweet.*raw|peppers, sweet.*raw", 149, "1 cup chopped"),
    (r"cucumber", 119, "1 cup sliced"),
    (r"tomato.*raw|tomato, red", 123, "1 medium"),
    (r"celery.*raw|celery$", 101, "1 cup chopped"),
    (r"mushrooms?.*raw", 70, "1 cup sliced"),
    (r"mushrooms?.*(boiled|cooked|sauteed|microwaved)", 156, "1 cup cooked"),
    (r"cabbage.*raw", 89, "1 cup shredded"),
    (r"cabbage.*(boiled|cooked)", 150, "1 cup cooked"),
    (r"zucchini.*raw|squash, summer.*raw", 124, "1 cup chopped"),
    (r"zucchini.*(boiled|cooked)|squash, summer.*(boiled|cooked)", 180, "1 cup cooked"),
    (r"squash, winter.*(baked|boiled|cooked)|butternut.*baked|pumpkin.*(boiled|cooked)", 205, "1 cup cubed, cooked"),
    (r"beans, snap.*(boiled|cooked)|green beans.*(boiled|cooked)", 125, "1 cup cooked"),
    (r"beans, snap.*raw", 110, "1 cup"),
    (r"brussels sprouts.*(boiled|cooked)", 156, "1 cup cooked"),
    (r"asparagus.*(boiled|cooked)", 180, "1 cup cooked"),
    (r"peas, green.*(boiled|cooked)|green peas", 160, "1 cup cooked"),
    (r"corn, sweet.*(boiled|cooked|canned)", 164, "1 cup cooked"),
    (r"beets.*(boiled|cooked)", 170, "1 cup sliced, cooked"),
    (r"eggplant.*(boiled|cooked)", 99, "1 cup cooked"),
    (r"onions?.*raw", 160, "1 cup chopped"),
    (r"sweet potato.*baked", 150, "1 medium"),
    (r"potato.*baked", 173, "1 medium"),
    (r"potato.*boiled", 156, "1 cup cooked"),
    (r"^apples?,", 182, "1 medium"),
    (r"^bananas?", 118, "1 medium"),
    (r"^oranges?,|^orange,", 140, "1 medium"),
    (r"^pears?,", 178, "1 medium"),
    (r"^peach", 150, "1 medium"),
    (r"^plums?, raw|^plum,", 132, "2 plums"),
    (r"^kiwi", 148, "2 kiwis"),
    (r"^grapes?", 151, "1 cup"),
    (r"strawberr", 152, "1 cup"),
    (r"blueberr", 148, "1 cup"),
    (r"raspberr", 123, "1 cup"),
    (r"blackberr", 144, "1 cup"),
    (r"^cherr", 138, "1 cup"),
    (r"^mango", 165, "1 cup"),
    (r"pineapple", 165, "1 cup"),
    (r"cantaloupe|melon, cantaloupe|honeydew", 160, "1 cup cubed"),
    (r"watermelon", 152, "1 cup diced"),
    (r"papaya", 145, "1 cup"),
    (r"grapefruit", 123, "½ grapefruit"),
    (r"clementine|tangerine|mandarin", 148, "2 small"),
    (r"^apricots?, raw|^apricot, raw", 105, "3 apricots"),
    (r"dates", 40, "4 dates"),
    (r"raisins", 40, "¼ cup"),
    (r"^nuts,|^peanuts", 30, "1 small handful"),
    (r"egg, chicken", 100, "2 large eggs"),
    (r"cheese, cottage|cheese, ricotta", 113, "½ cup"),
    (r"cheese, feta|cheese, goat, soft", 38, "¼ cup crumbled"),
    (r"cheese, parmesan|cheese, romano", 15, "2 tbsp grated"),
    (r"cheese, mozzarella", 28, "1 slice"),
]

HEAD_REORDER = {
    "beans": "beans", "lentils": "lentils", "nuts": "", "seeds": "", "grains": "", "vegetable oil": "oil",
}


FRUIT_ONLY = {r"^grapes?\b", r"dates", r"raisins", r"^apples?,", r"^bananas?", r"^oranges?,|^orange,", r"^pears?,", r"^peach", r"^plums?, raw|^plum,", r"^kiwi", r"strawberr", r"blueberr", r"raspberr", r"blackberr", r"^cherr", r"^mango", r"pineapple", r"cantaloupe|melon, cantaloupe|honeydew", r"watermelon", r"papaya", r"grapefruit", r"clementine|tangerine|mandarin", r"^apricots?, raw|^apricot, raw"}


def serving_for(source_name, default_g, default_label, category=None):
    for pat, g, label in SERVINGS:
        if pat in FRUIT_ONLY and category != "fruit":
            continue
        if re.search(pat, source_name, re.I):
            return g, label
    return default_g, default_label


# Not suggested even if everyday-sounding: condiments, dish components, variants that crowd lists.
NOT_SUGGESTED = re.compile(
    r"ketchup|puree|paste|tomato products|skin, cooked in skin|potato, skin|hash|o'brien|toasted|low sodium|reduced sodium|lactose reduced|"
    r"with fruit|with pasta and seasonings|melon balls|horned|casaba|orange peel|with peel|apple, raw, without skin, sliced, cooked|"
    r"cornish|peanuts, (spanish|valencia|virginia)|corn, sweet, (white|yellow), raw|sprouted, bean sprouts, canned|lambsquarters|"
    r"canned, total can contents|kippered|lox|white with raisins|pita, fruit|cheddar or colby type|edam, mini wheel|silken, light",
    re.I,
)


def dup_group(display_name):
    """Variants of one food share a group so lists show only one (two cheddars never appear together)."""
    parts = [p.strip().lower() for p in display_name.split(",")]
    head = parts[0]
    if head in ("bread", "melon", "milk", "yogurt", "pasta", "squash", "cabbage", "beef", "pork", "lamb") and len(parts) > 1:
        head = f"{head}, {parts[1]}"
    head = re.sub(r"\(.*?\)", "", head).strip()
    return "g:" + re.sub(r"[^a-z0-9]+", "-", head).strip("-")


def clean_name(n, category):
    s = n
    s = re.sub(r"\s*\([^)]{25,}\)", "", s)  # long parenthetical alternatives
    drop = [r"mature seeds", r"drained", r"without salt", r"year round average", r"all commercial varieties", r"all types",
            r"all varieties", r"all classes", r"mixed species", r"broiler", r"fluid", r"separable lean only", r"boneless",
            r"refrigerated and/or shelf-stable", r"refrigerated", r"shelf-stable", r"shelled", r"unblanched", r"unroasted", r"\bmeat only\b", r"\bmeat\b"]
    for d in drop:
        s = re.sub(r",\s*" + d + r"\b", "", s, flags=re.I)
    s = re.sub(r"(\d+(\.\d+)?)% M\.F\.?", r"\1%", s)
    s = re.sub(r"\bM\.F\.?", "", s)
    s = re.sub(r"baked or broiled", "baked", s, flags=re.I)
    s = re.sub(r"boiled or steamed", "cooked", s, flags=re.I)
    if category in ("legumes", "grains", "leafy_greens", "vegetables"):
        s = re.sub(r"\bboiled\b", "cooked", s, flags=re.I)
    parts = [p.strip() for p in s.split(",") if p.strip()]
    head = parts[0].lower() if parts else ""

    def join(front, rest):
        out = front + (", " + ", ".join(rest) if rest else "")
        return out[0].upper() + out[1:]

    if head == "egg" and len(parts) > 1:
        return join("Eggs", [p for p in parts[1:] if p.lower() not in ("chicken", "whole", "cooked")])
    if head.startswith("soybean") and len(parts) > 2 and "fermented" in parts[1].lower():
        return join(re.sub(r"\s*\(.*?\)", "", parts[2]), parts[3:])
    if head == "beans" and len(parts) > 1 and parts[1].lower().startswith("snap"):
        return join("Green or yellow beans", [p for p in parts[2:] if "green or yellow" not in p.lower()])
    if head == "peas" and len(parts) > 1 and parts[1].lower().startswith("edible-podded"):
        return join("Snow peas", parts[2:])
    if head in ("beans",) and len(parts) > 1:
        return join(f"{parts[1]} beans", parts[2:])
    if head in ("lentils", "peas") and len(parts) > 1 and parts[1].lower() not in ("cooked", "raw"):
        return join(f"{parts[1]} {head}", parts[2:])
    if head == "nuts" and len(parts) > 1:
        return join(parts[1], [p for p in parts[2:] if p.lower() not in ("dried",)])
    if head == "seeds" and len(parts) > 1:
        nm = re.sub(r"seed kernels|kernels", "seeds", parts[1], flags=re.I)
        return join(nm, [p for p in parts[2:] if p.lower() not in ("dried",)])
    if head == "grains" and len(parts) > 1:
        rest = parts[2:]
        front = parts[1]
        if rest and rest[0].lower() not in ("cooked",):
            front = f"{rest[0]} {front}"
            rest = rest[1:]
        return join(front, rest)
    if head == "vegetable oil" and len(parts) > 1:
        return join(f"{parts[1]} oil", parts[2:])
    if head in ("fish", "crustaceans", "crusteceans", "mollusks") and len(parts) > 1:
        rest = parts[2:]
        front = parts[1]
        if rest and not re.search(r"baked|cooked|canned|raw|steamed|smoked|poached|grilled|dried|wild|farmed", rest[0], re.I):
            front = f"{rest[0]} {front}"
            rest = rest[1:]
        return join(front, rest)
    if head == "cheese" and len(parts) > 1:
        return join(parts[1].capitalize() + " cheese" if parts[1].lower() in ("cottage", "goat", "cream") else parts[1], parts[2:])
    if head == "yogourt (yogurt)":
        return join("Yogurt", parts[1:])
    if head == "plant-based beverage" and len(parts) > 1:
        return join(parts[1], [p for p in parts[2:] if p.lower() in ("fortified", "unsweetened") or "fat" in p.lower()])
    if head == "milk" and len(parts) > 1:
        return join("Milk", parts[1:])
    if head in ("chicken", "turkey") and len(parts) > 1:
        cut = [p for p in parts[1:] if re.search(r"breast|thigh|drumstick|wing|leg|ground|light|dark", p, re.I)]
        rest = [p for p in parts[1:] if p not in cut and re.search(r"roasted|cooked|stewed|grilled|braised|rotisserie|fried", p, re.I)]
        return join(f"{parts[0]} {' '.join(cut)}".strip(), rest)
    return join(parts[0], parts[1:]) if parts else n
