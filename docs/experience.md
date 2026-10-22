# The experience: how she learns as she goes, and how the features connect

## 1. "Let them know": guidance woven into use

**Decision:** guidance is woven into the app, not left to the Learn tab. Learn is where she goes deeper. The weaving is how she understands what is happening *while* it happens.

**The rule:** teach at the moment it matters, once, in one line, with more one tap away. Guidance never blocks logging, never appears as a pop-up wall, and is **never triggered by absence or shortfall**.

### Six mechanisms
1. **A "why?" behind every number.**
   - Every mark, percentage, suggestion and verdict has a reason one tap away, in a two-line sheet that ends with "More in Learn".
   - Suggestions carry their reason inline: *"Lentils · 46% of your iron · pairs with the peppers you had"*.
2. **First-time moments.** A small registry of moments, each shown once, inline, as a single sentence she taps to dismiss:

   | Moment | Line (draft) |
   |---|---|
   | First "at least" value | Some foods don't list this nutrient yet, so we count only what we know. |
   | First time past a mark | Past your mark is good. Nothing here is a limit. |
   | First capped suggestion | Brazil nuts are so rich in selenium that one serving a day is plenty. |
   | First "becoming yours" | You've had this on four different days. It's joining your rotation. |
   | First weekly check-in | Your round is judged on the days you log, so every logged day counts. |
   | Week 6 begins | Here's how the end of a round works. |
   | First carry-forward | Not at the mark yet, so it comes with you. Here's what changes. |
   | First lock-in | Locked in: still tracked, and it stays in your suggestions. |

   Deliberately excluded: anything about a missed day, a quiet week or a low number.
3. **Round compass.** A one-line header on Today says where she is in the arc and what this stretch is for:
   - Week 1: *Finding your foods*
   - Weeks 2–4: *Repeating what works*
   - Weeks 5–6: *Making it automatic*

   She learns the shape of the round without reading a manual.
4. **The weekly check-in teaches one idea taken from her own week.** For example, she had lentils four times, so it explains why vitamin C helps plant iron absorb.
5. **Glossary words.** *Mark, round, locked in, rotation, carried, project* get a dotted underline wherever they appear. Tapping one opens the same short definition everywhere.
6. **She stays in control.** Settings has "Show tips" (on by default) and "Replay how it works".

**Engineering (planned for the app build):** `nextHint(state, seen)` will be a pure function in `@tend/core`. In the prototype this logic lives in `Today.tsx`. Its inputs contain only progress and first-encounter facts, so it is structurally unable to fire on absence. It allows at most one hint per screen visit. The copy lives in one registry, which is linted for em dashes and banned words.

## 2. How the features feed each other
```
Screener ─► suggested three ─► ROUND (6 weeks) ─► Best right now ─► logs
                 ▲                                      │             │
                 │                                      ▼             ▼
   next picker: "lentils already           pairings inline     "becoming yours"
   cover magnesium too" ◄── Rotation ◄──────────────────────────────────┘
                 │              │
                 │              ├─► Shopping list (rotation + this week's best)
                 │              ├─► Weekly check-in (rotation highlights, one swap, one idea)
                 │              └─► End of round: jars on the shelf, rotation as the keepsake
                 │                              ├─► Share card (foods only, no numbers)
                 │                              └─► "Bring to your appointment" summary
                 └── Learn: the plate sandbox uses HER marks and HER eligible foods;
                     "add to shopping list" closes the loop.
```
- **The rotation is the connecting thread.** It's what she builds, what she shops from, what the check-in celebrates, what the end of a round hands her, and what makes the next picker feel personal.
- **One source of truth for every recommendation:** each surface draws from `eligibleFoods` and `rank`, so the Learn top 10, the shopping list and Best right now always agree.

## 3. Details that make it excellent
- **Logging in two taps:** her usuals first, recent foods, re-log yesterday's breakfast, and search at the bottom of the screen for one-handed use. A 5-second undo replaces any "are you sure?".
- **Feel:**
  - A light haptic tick on every log.
  - The jar fill springs up to its new level, with the mark line drawn on the jar. Past the mark, the fill takes on a soft glow.
  - Weeks 5 and 6 take on a warm gold accent.
  - The end of a round moves the jars onto her shelf.
  - Every animation has a reduced-motion version.
- **Honest states:** "at least" on totals with unknowns, a subtle offline indicator, and skeletons in place of spinners.
- **Never in the UI:** red, "remaining", countdowns, numbers on the lock screen, or anything triggered by absence.
