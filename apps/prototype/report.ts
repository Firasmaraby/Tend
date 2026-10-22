import { allMarks, asLocalDate, selectabilityReport, type Food, type Profile } from "@tend/core";
import foods from "./src/foods.json";
const on = asLocalDate("2026-10-22");
const base: Profile = { birthYear: 1975, birthMonth: 3, status: "none", menstruating: true, diet: "omnivore", allergens: [], timeZone: "America/Toronto" };
const cases: [string, Partial<Profile>][] = [
  ["perimenopause 51, omnivore", {}],
  ["51, vegan", { diet: "vegan" }],
  ["51, vegetarian", { diet: "vegetarian" }],
  ["29 lactating omnivore", { birthYear: 1997, status: "lactating", menstruating: false }],
  ["33 pregnant vegetarian", { birthYear: 1993, status: "pregnant", diet: "vegetarian" }],
];
for (const [label, o] of cases) {
  const p = { ...base, ...o };
  const rows = selectabilityReport(foods as unknown as Food[], allMarks(p, on), p);
  console.log(label.padEnd(30), rows.map((r) => `${r.nutrient}:${r.qualifying}${r.status === "fail" ? "✗" : r.status === "near" ? "~" : ""}`).join(" "));
}
