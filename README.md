# Tend

A micronutrient app for women. Pick three nutrients, spend six weeks with them, and fill your marks with real food. It counts up and never down.

- `DECISIONS.md`: what was decided, and why it matters to the code
- `docs/plan.md`: the full plan (critique, design, data model, phases)
- `docs/experience.md`: in-context guidance and how the features connect
- `packages/core`: all the nutrition and round maths, pure TypeScript. Its expected values were written by hand first, in `packages/core/EXPECTED_VALUES.md`.

```
pnpm install
pnpm test        # audit tests
pnpm typecheck
```
