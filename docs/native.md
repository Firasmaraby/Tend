# Native phone features (plan for the iPhone build)

The web prototype can't use these, but the Expo / React Native app can. Each item follows the product rules: count up, nothing triggered by absence, and no numbers on the lock screen.

## In the first App Store version
| Feature | How Tend uses it | Rules |
|---|---|---|
| **Haptics** (expo-haptics) | A light tick on every log. A soft "success" when a jar first passes its mark for the day. A gentle double-tap when she makes a pairing. Selection ticks on segmented controls. | Never on removal or undo. All haptics are off when the system setting is off. |
| **Notifications** (expo-notifications, scheduled on the device) | **Daily food note:** one optional note at a time she picks, e.g. "Kiwi tonight? It pairs with your lentils." **Arrivals:** the end of a round, and a jar reaching its mark for the first time in a round. **Weekly check-in** on day 7, 14 and so on. | The daily note is the same whether she logged or not, so the function that schedules it receives no log data. Nothing is ever triggered by absence. No percentages or day counts on the lock screen. Every type can be turned off on its own. |
| **Sign in with Apple** | The fastest signup. Apple requires it if any other social login is offered. | |
| **Offline logging** | Logs save on the phone first and sync when she's back online. Search of recent and favourite foods works offline. | Log ids are created on the phone, so a sync never creates a duplicate. |
| **Dynamic Type, VoiceOver, Reduce Motion** | Text scales. Every jar is read aloud as "Iron, 62% of your mark". Fills don't animate when Reduce Motion is on. | Required for the "accessible" promise and for App Review. |
| **Share sheet** | The end-of-round card: foods and nutrient names, no numbers. The shopping list as text. | |
| **App review prompt** | Asked only at an arrival: the end of a round where she reached her marks. | Never after a miss, never in the trial. |
| **Account deletion** | In Settings, with in-app confirmation. | An Apple requirement. |

## Soon after launch
| Feature | Notes |
|---|---|
| **Home screen widget** | Her three jars filling, tap to log. On the lock screen it shows jars without numbers. |
| **Apple Health (write)** | Writes dietary nutrients she logs (iron, calcium and so on) if she opts in. Tend never reads her weight or cycle from Health. |
| **Shortcuts / Siri** | "Log my usual breakfast" through App Intents. |
| **Barcode scanning** | Camera, for packaged foods. Needs a packaged-food data source and its licence (Open Food Facts is share-alike: decide first). |

## Not planned
- Live Activities and the Dynamic Island: a nutrition day isn't a live event.
- Reading cycle data from Apple Health: we keep period data minimal on purpose (DECISIONS.md).
