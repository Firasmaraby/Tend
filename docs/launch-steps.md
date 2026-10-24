# From prototype to App Store and Google Play: step by step

**Who does what:** *You* = the founder, for steps that need your identity, payment or legal authority. *Claude* = the build, in this repo. Costs and waits are approximate; check them on each provider's site when you sign up.

## Part A: Accounts and paperwork (you, start now, in parallel)
These have the longest waits, mostly identity checks, so they gate everything at the end.

1. **Form the company** (federal or Ontario incorporation).
2. **Get a D-U-N-S number** for the company. It's free, and Apple's developer site has a lookup and request tool. It can take a week or two. Both stores use it for organisation accounts.
3. **Domain and simple website** (for example tend-app.ca). Both stores require a support URL and a privacy policy URL. Claude can write the pages; you host them.
4. **Privacy policy and terms, reviewed by a lawyer.** Claude drafts them from what the app actually stores. A lawyer should check them against PIPEDA, Quebec Law 25 and Washington's My Health My Data Act (health and period data).
5. **Apple Developer Program, as an organisation:** about US$99 a year. It needs the D-U-N-S number and confirmation that you can sign for the company. Approval takes a few days.
6. **Google Play Console, as an organisation:** a one-time US$25, with identity verification. *Why an organisation account:* new personal accounts must run a closed test with at least 12 testers for 14 days before publishing. Organisation accounts don't have that rule.
7. **Supabase:** a free account. Create a **new** project called `tend` in the Canada region. Never reuse v1's project.
8. **Expo:** a free account to start. A paid plan helps later for faster builds.
9. **RevenueCat:** a free account, needed before the paywall step.

## Part B: Connect this environment (you, about 10 minutes, after Part A)
Keys never go in the chat. In this session's title bar, open the cloud environment menu, choose **Edit**, then:

1. **Network access:** allow `supabase.co`, `supabase.com`, `expo.dev` and `appstoreconnect.apple.com`.
2. **Network secrets** (or environment variables if that section isn't there):
   - `SUPABASE_ACCESS_TOKEN`: Supabase, then Account, then Access tokens.
   - `EXPO_TOKEN`: Expo, then Account settings, then Access tokens.
   - Later, for uploads to the stores:
     - an App Store Connect API key: `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`;
     - a Google Play service-account key: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.
3. **Start a new session** with the Tend repo selected. Sessions pick up new settings when they start.

## Part C: The build (Claude; you review at each checkpoint)
Each step ends with something you can try.

1. **Merge** `claude/foundation` into `main`, and use short branches from then on.
2. **App skeleton:** an Expo / React Native app in `apps/mobile`, using the same design system as the prototype (Pantry, type-led, jars drawn in code) and the same `@tend/core` maths.
   *Checkpoint:* the app runs on your phone through Expo's preview.
3. **Backend on Supabase:**
   - the database: profiles, rounds, food logs, curated foods and the library;
   - security rules so each woman sees only her own data;
   - sign-in: email code, Sign in with Apple and Sign in with Google;
   - account deletion inside the app (both stores require it);
   - loading your food data, curated and library.

   *Checkpoint:* sign up on your phone; your data survives reinstalling.
4. **All the screens from the prototype:** onboarding and first-run guide, Today, Browse and search, Learn, Round, history, shopping list, settings, period timing, Better together.
   *Checkpoint:* the same flows as the prototype, on real data.
5. **Native features:** haptics, notifications (following the rules in `docs/native.md`) and offline logging that syncs.
6. **Subscriptions:** RevenueCat, the paywall after onboarding, the 7-day trial on annual, restore purchases, and lifetime access for your beta testers.
7. **Verification before anyone else sees it:**
   - the maths audit tests;
   - seeded test accounts (full round, low-data round, breastfeeding vegan, period days, daylight-saving change);
   - fresh-account walk-throughs;
   - VoiceOver and large text.
8. **First builds to your phone:** EAS builds iOS and Android and uploads them to TestFlight (iOS) and Play internal testing (Android).
   *Checkpoint:* you install the real app from TestFlight and the Play Store.

## Part D: Beta (you and your testers; Claude iterates)
1. **Invite your 6 testers,** plus a few more.
2. **Run 2 to 4 weeks.** Wording, layout and logic fixes reach testers within minutes as over-the-air updates, with no store review. New phone permissions or widgets need a new build, usually a day.
3. **You decide what changes;** Claude builds it and Opus reviews it.

## Part E: Store submission
1. **Store listings (Claude drafts, you approve):**
   - name and subtitle ("Tend: Nutrients for Women");
   - description and keywords;
   - screenshots for each phone size;
   - support and privacy URLs.
2. **Store forms (Claude prepares the answers from the code, you confirm):**
   - Apple's App Privacy section and Google's Data safety form;
   - Google's health-app declaration;
   - age rating (18+);
   - a statement that this isn't a medical app.
3. **You press Submit** on each store and answer reviewers' questions if they have any. Review usually takes a day or two, and longer for a first app.
4. **Launch,** then a review prompt only after a round where she reached her marks.

## What can run in parallel
Part A takes the longest in calendar time. Claude can do steps C1 and C2, and most of C4, before your accounts exist, using mock data, and switch to the real backend when the keys arrive.
