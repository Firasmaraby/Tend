// User-facing copy. Drafted for founder review. Rules: plain and warm, no
// medical claims (wording follows EFSA/Health Canada-style function claims),
// no symptoms lists, no em dashes, nothing framed as failure.

import type { Mark, NutrientCode } from "@tend/core";

export interface Explainer {
  /** One plain line: what it does for her. */
  line: string;
  points: [string, string, string];
  pairs?: string;
  lifeStage?: string;
  care?: string;
}

export const EXPLAINERS: Partial<Record<NutrientCode, Explainer>> = {
  iron: {
    line: "Carries oxygen around your body.",
    points: [
      "Helps make the red blood cells that carry oxygen.",
      "Supports normal energy and focus.",
      "Your needs are higher while you menstruate and during pregnancy.",
    ],
    pairs: "Vitamin C (peppers, kiwi, citrus) helps your body absorb the iron in plant foods. Have them in the same meal.",
    lifeStage: "If you no longer menstruate, your iron mark is lower. Tend adjusts it for you.",
  },
  calcium: {
    line: "Builds bones and teeth, and keeps them strong.",
    points: [
      "Needed to maintain normal bones and teeth.",
      "Helps muscles contract normally.",
      "Helps nerves send signals.",
    ],
    pairs: "Vitamin D helps you absorb calcium. Food rarely provides enough vitamin D, so ask your doctor about it.",
    lifeStage: "Your mark rises after 50, when bone needs change.",
  },
  magnesium: {
    line: "Helps hundreds of everyday processes, from muscles to energy.",
    points: [
      "Supports normal muscle and nerve function.",
      "Helps turn food into energy.",
      "Contributes to healthy bones.",
    ],
    pairs: "Seeds, beans and leafy greens are the easiest sources. A handful of pumpkin seeds goes a long way.",
  },
  potassium: {
    line: "Keeps fluids, nerves and muscles in balance.",
    points: [
      "Contributes to normal blood pressure.",
      "Supports normal muscle function.",
      "Helps nerves work normally.",
    ],
    pairs: "Beans, potatoes with their skin, and leafy greens beat bananas for potassium.",
  },
  fibre: {
    line: "Feeds your gut and keeps things moving.",
    points: [
      "Supports regular digestion.",
      "Feeds the helpful bacteria in your gut.",
      "Helps meals keep you full for longer.",
    ],
    pairs: "Add it gradually and drink water with it. Your gut adjusts over a couple of weeks.",
  },
  folate_dfe: {
    line: "Helps your body make new cells.",
    points: [
      "Supports normal cell division.",
      "Helps form red blood cells.",
      "Especially important before and during pregnancy.",
    ],
    lifeStage: "During pregnancy, talk to your doctor or midwife about folic acid. Food is one part of the picture.",
  },
  vit_b12: {
    line: "Keeps nerves and blood cells healthy.",
    points: [
      "Supports normal nerve function.",
      "Helps form red blood cells.",
      "Helps turn food into energy.",
    ],
    care: "B12 is found almost only in animal foods and fortified foods. If you eat plant-based, it's worth asking a professional about B12.",
  },
  vit_a_rae: {
    line: "Supports your vision, skin and immune system.",
    points: [
      "Helps maintain normal vision.",
      "Supports normal skin.",
      "Supports your immune system.",
    ],
    care: "Liver contains a form of vitamin A with an upper limit, so Tend never suggests it. Orange vegetables and greens give the safe form.",
    lifeStage: "Your mark nearly doubles while breastfeeding.",
  },
  vit_c: {
    line: "Supports immunity and helps you absorb plant iron.",
    points: [
      "Supports your immune system.",
      "Helps your body make collagen for skin and blood vessels.",
      "Increases how much iron you absorb from plant foods.",
    ],
    pairs: "Cooking reduces vitamin C. Raw peppers, kiwi and citrus keep the most.",
  },
  vit_k: {
    line: "Helps your blood clot normally and supports bones.",
    points: [
      "Needed for normal blood clotting.",
      "Helps maintain normal bones.",
      "Leafy greens are by far the richest source.",
    ],
    care: "If you take a blood thinner, talk to your doctor before changing how many leafy greens you eat.",
  },
  zinc: {
    line: "Supports your immune system, skin and healing.",
    points: [
      "Supports your immune system.",
      "Helps maintain normal skin, hair and nails.",
      "Helps your body use the food you eat.",
    ],
    care: "Oysters are so rich in zinc that one serving passes the upper limit, so Tend doesn't suggest them.",
  },
  choline: {
    line: "Supports your liver and your brain.",
    points: [
      "Supports normal liver function.",
      "Helps your body process fats.",
      "Eggs are one of the richest everyday sources.",
    ],
    lifeStage: "Your needs go up during pregnancy and breastfeeding.",
  },
  ala: {
    line: "The plant omega-3. Your body uses it for energy and to build other fats.",
    points: [
      "Helps maintain normal blood cholesterol.",
      "Found in walnuts, chia, flax, hemp and canola oil.",
      "Counted separately from marine omega-3, because the body uses them differently.",
    ],
    pairs: "Chia is great for ALA, but it doesn't replace salmon. That's why Tend tracks them separately.",
  },
  epa_dha: {
    line: "The marine omega-3s, for your heart and brain.",
    points: [
      "Support the normal function of the heart.",
      "DHA helps maintain normal brain function and vision.",
      "Oily fish like salmon, sardines and trout are the main sources.",
    ],
    lifeStage: "During pregnancy, choose low-mercury fish such as salmon, trout and canned light tuna.",
  },
  iodine: {
    line: "Helps your thyroid make the hormones that run your metabolism.",
    points: [
      "Supports normal thyroid function.",
      "Contributes to normal energy use.",
      "Your needs go up during pregnancy and breastfeeding.",
    ],
  },
  vit_e: {
    line: "Protects your cells from everyday wear.",
    points: [
      "Helps protect cells from oxidative stress.",
      "Found mostly in nuts, seeds and plant oils.",
      "Sunflower seeds and almonds are standouts.",
    ],
  },
  protein: {
    line: "Builds and repairs muscle, and keeps you full.",
    points: [
      "Helps maintain muscle and bone, which matters more with every decade.",
      "Keeps meals satisfying for longer.",
      "Spreading it across your meals works better than one big serving.",
    ],
    pairs: "Beans, lentils, tofu, eggs, yogurt and fish bring protein and your three nutrients at the same time.",
    lifeStage: "Your protein mark is 75 g a day. If you add your weight in settings, Tend uses 1.2 g per kg instead. Your weight is never shown or used for anything else.",
  },
  vit_d: {
    line: "Helps you absorb calcium and supports your immune system.",
    points: [
      "Very few foods contain much vitamin D.",
      "That's why Tend doesn't offer it as one of your three.",
      "Talk to your doctor about whether vitamin D drops make sense for you.",
    ],
  },
};

/** Where the mark comes from, in plain words. */
export function markReason(m: Mark, rda?: number, ear?: number): string {
  switch (m.basis) {
    case "RDA":
      return `Your mark is ${fmt(m.value)}. It's 80% of the recommended amount (${fmt(rda)}), and never below the average requirement for women like you (${fmt(ear)}).`;
    case "AI":
      return `Your mark is the full Adequate Intake. There's no safety margin to trim from this one, so it stays at 100%.`;
    case "FIXED":
      return `Your mark is a fixed reference from the European Food Safety Authority. Tend doesn't adjust it.`;
  }
}

const fmt = (n?: number) => (n === undefined ? "" : String(Math.round(n * 100) / 100));

/** Round compass: what this stretch of the round is for. */
export function compass(day: number): { stage: string; line: string } {
  if (day <= 7) return { stage: "Finding your foods", line: "Try a few foods from your list and notice which ones you like." };
  if (day <= 28) return { stage: "Repeating what works", line: "Come back to the foods you liked. Repeating them is how they become yours." };
  return { stage: "Making it automatic", line: "You're nearly there. These foods are becoming part of how you eat." };
}

/** First-time moments: shown once, inline, never triggered by absence. */
export const HINTS = {
  first_log: "That's your first one. Every food you add moves your jars.",
  at_least: "Some foods don't list this nutrient yet, so Tend counts only what it knows. That's why it says at least.",
  past_mark: "Past your mark is good. Nothing here is a limit.",
  capped: "Some foods are so rich in one nutrient that one serving a day is plenty. Tend tells you when.",
  becoming_yours: "You've had this on four different days. It's joining your rotation.",
  density: "Most nutrient-dense ranks foods by what they give you per calorie. It's about getting a lot from a little, never about eating less.",
  why_jar: "Tap a jar to see what it does for you and where your mark comes from.",
  first_pairing: "Some foods work better together. Tend points out pairings that help you absorb more, and notices when you make one.",
  all_nutrients: "Your three get the spotlight, but Tend tracks everything. You can see the full list any time.",
  meals: "Tend files each food under a meal, based on the time. Change it with one tap. Meals let Tend spot pairings in the same meal.",
  first_period: "On period days, iron foods move up your suggestions. Your marks stay the same.",
  library_food: "This food is from the full library. It counts toward your day, but Tend only suggests foods with checked servings.",
} as const;
export type HintId = keyof typeof HINTS;

export const GLOSSARY: Record<string, string> = {
  mark: "The amount you're working toward each day. Reaching it on most days is what counts.",
  round: "Six weeks with three nutrients. Long enough for the foods to become habits.",
  "locked in": "A nutrient from an earlier round. Tend keeps tracking it and keeps it in your suggestions.",
  rotation: "The foods you come back to. They're how your marks get filled without thinking.",
  carried: "A nutrient that didn't reach its mark last round, so it comes with you into this one.",
};

/** Starter questions. Each answer adds weight to the nutrients a pattern tends to leave short. */
export const SCREENER: { id: string; q: string; noun: string; weights: Partial<Record<NutrientCode, number>>; omnivoreOnly?: boolean; skipFor?: string[] }[] = [
  { id: "fish", q: "Fish or seafood", noun: "fish or seafood", weights: { epa_dha: 3, vit_b12: 1, iodine: 1 }, skipFor: ["vegan", "vegetarian"] },
  { id: "greens", q: "Leafy greens", noun: "leafy greens", weights: { vit_k: 2, folate_dfe: 2, magnesium: 1, calcium: 1, vit_a_rae: 1 } },
  { id: "dairy", q: "Dairy, or fortified soy or almond drinks", noun: "dairy or fortified drinks", weights: { calcium: 3, vit_b12: 1, iodine: 1 } },
  { id: "legumes", q: "Beans, lentils or tofu", noun: "beans, lentils or tofu", weights: { fibre: 2, iron: 1, folate_dfe: 1, magnesium: 1, potassium: 1, zinc: 1 } },
  { id: "nuts", q: "Nuts or seeds", noun: "nuts or seeds", weights: { magnesium: 2, vit_e: 2, ala: 1, zinc: 1 } },
  { id: "eggs", q: "Eggs", noun: "eggs", weights: { choline: 2, vit_b12: 1 }, skipFor: ["vegan"] },
  { id: "fruit", q: "Fruit", noun: "fruit", weights: { vit_c: 2, potassium: 1, fibre: 1 } },
  { id: "grains", q: "Whole grains like oats or brown rice", noun: "whole grains", weights: { fibre: 2, magnesium: 1, iron: 1 } },
  { id: "meat", q: "Meat or poultry", noun: "meat or poultry", weights: { iron: 1, zinc: 2, vit_b12: 2 }, omnivoreOnly: true },
];
export const FREQUENCIES = [
  { id: "rarely", label: "Rarely", need: 2 },
  { id: "some", label: "Some weeks", need: 1 },
  { id: "most", label: "Most days", need: 0 },
] as const;

/** Better together: absorption guidance. Copy for the rules in @tend/core absorption.ts. */
export const PAIRING_COPY = {
  iron_vitamin_c: {
    title: "Iron likes vitamin C",
    nudge: (food: string) => `There's plant iron in your ${food}. Vitamin C in the same meal helps your body take in more of it.`,
    done: (food: string, helper: string) => `Nice pairing. The vitamin C in your ${helper} helps your body take in the iron from your ${food}.`,
    doneAnimal: (food: string, helper: string) => `Nice pairing. Your ${helper} helps your body take in the iron from your ${food}.`,
    chip: "Pair with vitamin C",
    learn: "Iron from plants (non-heme iron) is absorbed less easily than iron from meat and fish. Vitamin C changes that: about 25 mg in the same meal, the amount in half a red pepper or one kiwi, can make a real difference. Meat, fish and poultry help too.",
  },
  fat_soluble: {
    title: "Greens like a little fat",
    nudge: (food: string) => `Vitamins A and K in your ${food} absorb better with a little fat. A drizzle of olive oil, some avocado or a few nuts does it.`,
    done: (food: string, helper: string) => `Good match. The fat in your ${helper} helps you absorb the vitamins in your ${food}.`,
    chip: "Add a little fat",
    learn: "Vitamins A, E and K dissolve in fat, not water. Leafy greens and orange vegetables give you more of them when there's some fat in the meal: olive oil, avocado, nuts, seeds, cheese or eggs.",
  },
  calcium_oxalate: {
    title: "Not all greens give calcium equally",
    nudge: (food: string) => `${food} is great for many things, but most of its calcium is bound by oxalate. For calcium, kale, bok choy and collard greens give calcium your body can use.`,
    done: () => "",
    chip: "",
    learn: "Spinach and Swiss chard contain oxalate, which holds on to most of their calcium. Kale, bok choy and collard greens have little oxalate, so their calcium is absorbed about as well as the calcium in milk.",
  },
} as const;

/** Learn-only absorption tips: useful to know, never triggered by her log. */
export const ABSORPTION_TIPS: { nutrients: NutrientCode[]; title: string; body: string }[] = [
  {
    nutrients: ["iron"],
    title: "Time your tea and coffee",
    body: "Tea and coffee can reduce how much plant iron you absorb. If iron is one of your three, enjoy them an hour or so before or after an iron-rich meal.",
  },
  {
    nutrients: ["iron", "zinc"],
    title: "Soak, sprout or ferment",
    body: "Beans, whole grains and seeds hold some of their iron and zinc tightly. Soaking beans, choosing sprouted grains or eating sourdough bread loosens that grip.",
  },
  {
    nutrients: ["vit_c", "folate_dfe"],
    title: "Go gentle on the heat",
    body: "Vitamin C and folate break down with long cooking in lots of water. Eating some vegetables raw, or steaming them briefly, keeps more of both.",
  },
  {
    nutrients: ["vit_a_rae"],
    title: "Cook your carrots",
    body: "Cooking carrots, tomatoes and squash with a little oil releases more of their vitamin A than eating them raw.",
  },
];

export const SETTINGS_COPY = {
  energyTitle: "Show energy (kcal)",
  energyBody: "Adds a running total for the day and energy per serving. It counts up like everything else. Tend never sets an energy target.",
  weightTitle: "Weight for protein (optional)",
  weightBody: "Leave this empty and your protein mark is 75 g. Add your weight and Tend uses 1.2 g per kg. It's used for nothing else and never shown.",
  proteinRate: "Protein per kg",
  tipsTitle: "Show tips",
  tipsBody: "The one-line notes that explain things the first time they happen.",
  replay: "Replay how Tend works",
};

export const MEAL_LABEL = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" } as const;

export const SHOPPING_COPY = {
  title: "Shopping list",
  intro: "Built from the foods you already love, a few strong ones for your three, and the pairings that help them work.",
  kinds: { rotation: "Yours", try: "Worth trying", pairing: "Better together" },
  empty: "Log a few days and your list fills itself.",
};

export const REPEAT_COPY = {
  button: (meal: string) => `Repeat yesterday's ${meal.toLowerCase()}`,
  done: (meal: string) => `Added yesterday's ${meal.toLowerCase()}.`,
};

/** Period timing. Never raises the iron mark (see core period.ts); leans suggestions toward iron. */
export const PERIOD_COPY = {
  settingTitle: "Period timing",
  settingBody: "Tell Tend when your period starts, and iron gets extra attention in your suggestions for those days. Tend keeps only the start date and how long yours usually lasts.",
  lengthLabel: "Usually lasts",
  start: "My period started",
  startYesterday: "It started yesterday",
  end: "My period ended",
  todayLine: (day: number) => `Period day ${day}. Iron gets extra attention in your suggestions.`,
  why: "You lose some iron with each period. Your iron mark already allows for this across the month, so Tend doesn't raise it. Instead, on your period days Tend leans your suggestions toward iron and points out vitamin C pairings, so you replenish when it matters most.",
  ironNotHers: "Iron isn't one of your three right now, but on period days it still gets some attention.",
  heavyQuestion: "Are your periods often heavy?",
  heavyNote: "Heavy periods can lower your iron stores over time. It's worth asking your doctor whether to check your iron.",
  onboardingOffer: "Want iron to get extra attention during your period? You can turn this on or off any time in settings.",
};
