import { addDays, defaultMeal, NUTRIENTS, type Allergen, type LocalDate, type FoodCategory, type Meal, type NutrientCode, type Ranked } from "@tend/core";
import type { ProtoFood } from "../engine";

const SHORT: Partial<Record<NutrientCode, string>> = {
  folate_dfe: "Folate",
  vit_b12: "Vitamin B12",
  vit_a_rae: "Vitamin A",
  vit_c: "Vitamin C",
  vit_k: "Vitamin K",
  vit_e: "Vitamin E",
  vit_d: "Vitamin D",
  vit_b6: "Vitamin B6",
  ala: "Plant omega-3",
  epa_dha: "Marine omega-3",
};
const PILL: Partial<Record<NutrientCode, string>> = {
  vit_b12: "B12",
  vit_a_rae: "Vit A",
  vit_c: "Vit C",
  vit_k: "Vit K",
  vit_e: "Vit E",
  vit_d: "Vit D",
};

/** Display name, title case. */
export const shortName = (n: NutrientCode): string => SHORT[n] ?? NUTRIENTS[n].name;
/** For the middle of a sentence. */
export const inlineName = (n: NutrientCode): string => {
  const s = shortName(n);
  return s.charAt(0).toLowerCase() + s.slice(1);
};
export const pillName = (n: NutrientCode): string => PILL[n] ?? shortName(n);

export const pct = (x: number): number => Math.round(x * 100);

export function fracText(x: number): string {
  const whole = Math.floor(x + 1e-9);
  const rem = Math.round((x - whole) * 4) / 4;
  const sym = rem === 0.25 ? "¼" : rem === 0.5 ? "½" : rem === 0.75 ? "¾" : "";
  if (rem === 1) return String(whole + 1);
  if (whole === 0) return sym || "0";
  return `${whole}${sym}`;
}

export const servingsText = (mult: number): string => (mult <= 1 ? `${fracText(mult)} serving` : `${fracText(mult)} servings`);

/** "1 cup cooked", or "2 × 1 cup cooked" when it isn't a single serving. */
export function servingPhrase(food: ProtoFood, grams: number): string {
  // Library foods have no vetted serving: they are logged, and shown, by weight.
  if (!food.serving) return gramsText(grams);
  const label = food.serving?.label ?? "";
  const mult = food.serving ? grams / food.serving.grams : 1;
  return Math.abs(mult - 1) < 0.01 ? label : `${fracText(mult)} × ${label}`;
}

/** "150 g", without float noise. */
export const gramsText = (grams: number): string => `${Math.round(grams * 10) / 10} g`;

/**
 * Opt-in energy and macros for an amount of a food: "120 kcal · Protein 8 g ·
 * Carbs 20 g · Fat 2 g". Unknown values are left out, never shown as 0.
 * Null when nothing is listed.
 */
export function kcalText(food: ProtoFood, grams: number): string | null {
  const v = (k: "energy_kcal" | "protein" | "carbs" | "fat") => {
    const per100 = food.per100g[k];
    return per100 === undefined ? undefined : (per100 * grams) / 100;
  };
  const parts: string[] = [];
  const kcal = v("energy_kcal");
  if (kcal !== undefined) parts.push(`${Math.round(kcal).toLocaleString("en-CA")} kcal`);
  for (const [k, label] of [["protein", "Protein"], ["carbs", "Carbs"], ["fat", "Fat"]] as const) {
    const g = v(k);
    if (g !== undefined) parts.push(`${label} ${g < 10 ? Math.round(g * 10) / 10 : Math.round(g)} g`);
  }
  return parts.length ? parts.join(" · ") : null;
}

/** Name up to the first comma: "Lentils, cooked" becomes "Lentils". */
export const foodShort = (name: string): string => name.split(",")[0] ?? name;
export const foodLower = (name: string): string => foodShort(name).toLowerCase();

export const ALLERGEN_CHIPS: Record<Allergen, string> = {
  peanut: "Peanuts",
  tree_nut: "Tree nuts",
  sesame: "Sesame",
  milk: "Milk",
  egg: "Eggs",
  fish: "Fish",
  crustacean: "Crustaceans",
  mollusc: "Molluscs",
  soy: "Soy",
  wheat: "Wheat",
  gluten: "Gluten",
  mustard: "Mustard",
  sulphite: "Sulphites",
};
export const ALLERGEN_SINGULAR: Record<Allergen, string> = {
  peanut: "peanut",
  tree_nut: "tree nut",
  sesame: "sesame",
  milk: "milk",
  egg: "egg",
  fish: "fish",
  crustacean: "crustacean",
  mollusc: "mollusc",
  soy: "soy",
  wheat: "wheat",
  gluten: "gluten",
  mustard: "mustard",
  sulphite: "sulphites",
};

export const CATEGORY_LABEL: Record<FoodCategory, string> = {
  leafy_greens: "leafy greens",
  vegetables: "vegetables",
  fruit: "fruit",
  legumes: "legumes",
  grains: "grains",
  nuts_seeds: "nuts and seeds",
  small_seeds: "small seeds",
  fish: "fish",
  shellfish: "shellfish",
  meat: "meat",
  poultry: "poultry",
  organ_meat: "organ meat",
  eggs: "eggs",
  milk: "milk",
  yogurt: "yogurt",
  cheese: "cheese",
  oils_fats: "oils and fats",
  fortified: "fortified",
  herbs_spices: "herbs and spices",
  aromatics: "aromatics",
  garnish: "garnish",
  beverages: "beverages",
  other: "other",
};

/** The css variable suffix for a category chip colour. */
export function chipKey(c: FoodCategory): string {
  switch (c) {
    case "milk":
    case "yogurt":
    case "cheese":
    case "fortified":
    case "beverages":
      return "dairy";
    case "aromatics":
    case "garnish":
      return "herbs_spices";
    default:
      return c;
  }
}

export interface Pill {
  nutrient: NutrientCode;
  share: number;
}

/** Contribution pills for the nutrients she is working on, where the share is known. */
export function pillsFor(r: Ranked, order: readonly NutrientCode[], min = 0.05): Pill[] {
  const out: Pill[] = [];
  for (const n of order) {
    const c = r.contributions.find((x) => x.nutrient === n);
    // Present but poorly absorbed (spinach calcium): never advertised as a source.
    if (c && !c.poorlyAbsorbed && c.share !== undefined && c.share >= min) out.push({ nutrient: n, share: c.share });
  }
  return out;
}

/** "Fills 46% of your iron mark", from the biggest known contribution. */
export function whyLine(r: Ranked, preferred: readonly NutrientCode[]): string | null {
  const known = r.contributions.filter((c) => c.share !== undefined && !c.poorlyAbsorbed);
  const pool = known.filter((c) => preferred.includes(c.nutrient));
  const all = pool.length ? pool : known;
  let best: { nutrient: NutrientCode; share: number } | null = null;
  for (const c of all) if (c.share !== undefined && (!best || c.share > best.share)) best = { nutrient: c.nutrient, share: c.share };
  if (!best || best.share < 0.01) return null;
  if (best.share >= 1) return `Covers your ${inlineName(best.nutrient)} mark in one serving`;
  return `Fills ${pct(best.share)}% of your ${inlineName(best.nutrient)} mark`;
}

export const ordinalWord = (n: number): string => ["zeroth", "first", "second", "third", "fourth", "fifth", "sixth"][n] ?? `number ${n}`;

/** "1 cup cooked · 198 g": the label people recognise, plus the weight the maths uses. */
export const servingWithGrams = (food: { serving?: { label: string; grams: number } }): string =>
  food.serving ? `${food.serving.label} · ${Math.round(food.serving.grams)} g` : "";

/** Capitalise the first letter. */
export const sentenceCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);


// ---- Meals ----

/** The meal for "right now" on her clock. */
export const mealNow = (): Meal => {
  const d = new Date();
  return defaultMeal(d.getHours(), d.getMinutes());
};

/** "At dinner", "At snack time": for the small line above a pairing. */
export const mealPhrase = (meal: Meal): string => (meal === "snack" ? "At snack time" : `At ${meal}`);

/**
 * Weaves the meal into a celebration line that opens with a short phrase:
 * "Nice pairing. The vitamin C..." becomes "Nice pairing at dinner. The vitamin C...".
 */
export function withMeal(text: string, meal: Meal | undefined): string {
  if (!meal || !text) return text;
  const where = meal === "snack" ? "at snack time" : `at ${meal}`;
  return /^[^.]{1,24}\./.test(text) ? text.replace(/^([^.]{1,24})\./, `$1 ${where}.`) : `${sentenceCase(where)}. ${text}`;
}

// ---- Dates (calendar days, so a fixed zone keeps them from shifting) ----

const dayAt = (d: string) => new Date(`${d}T12:00:00Z`);
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => dayAt(d).toLocaleDateString("en-US", { ...o, timeZone: "UTC" });

export const weekdayLong = (d: string): string => fmt(d, { weekday: "long" });
export const weekdayInitial = (d: string): string => weekdayLong(d).charAt(0);
export const dayNumber = (d: string): string => fmt(d, { day: "numeric" });
/** "Tuesday, October 20" */
export const dateLong = (d: string): string => fmt(d, { weekday: "long", month: "long", day: "numeric" });
/** "Oct 20" */
export const dateShort = (d: string): string => fmt(d, { month: "short", day: "numeric" });

/** "Today", "Yesterday", otherwise the weekday. */
export function dayWord(date: LocalDate, today: LocalDate): string {
  if (date === today) return "Today";
  if (date === addDays(today, -1)) return "Yesterday";
  return weekdayLong(date);
}

/** First letter up, the rest as written: "lentils" becomes "Lentils". */
export const capFirst = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
