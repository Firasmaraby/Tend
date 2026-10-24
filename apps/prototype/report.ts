import { allMarks, asLocalDate, selectabilityReport, type Food, type Profile } from "@tend/core";
import foods from "./src/foods.json";
const on = asLocalDate("2026-10-24");
const base: Profile = { birthYear: 1975, birthMonth: 3, status: "none", menstruating: true, diet: "omnivore", allergens: [], timeZone: "America/Toronto" };
const cases: [string, Partial<Profile>][] = [
  ["51, omnivore", {}], ["51, pescatarian", { diet: "pescatarian" }], ["51, vegetarian", { diet: "vegetarian" }], ["51, vegan", { diet: "vegan" }],
  ["29 lactating omnivore", { birthYear: 1997, status: "lactating", menstruating: false }], ["29 lactating vegan", { birthYear: 1997, status: "lactating", menstruating: false, diet: "vegan" }],
  ["33 pregnant omnivore", { birthYear: 1993, status: "pregnant" }], ["33 pregnant vegetarian", { birthYear: 1993, status: "pregnant", diet: "vegetarian" }],
];
const f = (foods as unknown as Food[]);
console.log("suggestable foods:", f.filter((x) => x.suggestable).length);
for (const [label, o] of cases) {
  const p = { ...base, ...o };
  const rows = selectabilityReport(f, allMarks(p, on), p);
  console.log(label.padEnd(24), rows.map((r) => `${r.nutrient}:${r.qualifying}${r.status === "fail" ? "✗" : r.status === "near" ? "~" : ""}`).join(" "));
}
