# Momentum — POC Design

**Date:** 2026-08-05
**Status:** Approved
**Source spec:** `/home/memphis/Downloads/Gamified_Life_POC_Spec.md`

## Vision

A personal gamification PWA that builds discipline, improves health, and
reinforces positive habits through game mechanics. Core principle: the goal is
**not perfection, but returning to control** after setbacks.

The app succeeds if it motivates the user to wake up wanting to complete
today's quests, while reinforcing long-term healthy habits and a sense of
control.

## Scope

MVP must include: Habit Builder, Daily Quest Generator, XP Engine, Streak
Engine, Daily Check-in, Recovery Quest, and the RPG character-progression
layer (one career-man theme, extensible). Everything else from the source
spec's Future Ideas is out of scope.

**Explicitly out of scope:** multiple character themes (but the theme system
is data-driven so new themes = data + art only), badges/titles-as-content,
boss quests, weekly challenges, random events, avatar inventory/shop,
friends, AI coach, cloud sync.

## Platform & architecture decisions

| Decision | Choice |
|---|---|
| Platform | PWA — React + Vite + TypeScript, mobile-first |
| Install | `vite-plugin-pwa` (workbox), add-to-home-screen |
| Data | Local-only, Dexie.js on IndexedDB |
| Quest generation | Rule-based (no AI, fully offline) |
| First run | Pre-seeded default habits, user owns/edits them |
| Streaks | Daily for all habits, per-habit independent |
| Day closure | Manual evening check-in |
| Visual style | Simple/easy layout; retro-pixel *assets* (character + items) |
| RPG unlocks | Level-based (global XP); per-theme cosmetic flavor stats |
| Character themes | One in POC (career man), theme = data + art, extensible |

## Architecture

Layered, with a pure game engine at the center:

```
src/
  engine/          pure TS, no UI/DB imports — the brain
    quests.ts        generate today's quests (rule-based)
    xp.ts            XP math, difficulty multipliers, bonuses, level curve
    streaks.ts       streak compute/break/update
    checkin.ts       evening check-in closure, recovery quest logic
    theme.ts         character themes, item unlocks, flavor stats (config)
  db/
    index.ts         Dexie schema + versioning
    seed.ts          pre-seeded default habits
    repos.ts         typed CRUD for all entities
  store/
    useGame.ts       Zustand — current date, day-flip, UI flags
  ui/
    screens/         Today, Week, Character, Habits, CheckIn
    components/      QuestCard, StreakFlame, XPBar, CharacterView, ...
    theme/           simple clean layout, retro-pixel asset styling
  App.tsx / main.tsx / vite.pwa config
  tests/             engine unit tests (Vitest)
```

**Flow rule:** UI → store → repos → Dexie. The engine never touches Dexie; it
takes plain objects in, returns plain objects out. Everything game-related is
unit-testable in isolation.

## Data model

### Habit
```
id, name, category, difficulty (easy|medium|hard|epic),
xp (base reward), core (bool), active (bool), createdAt
```
All habits are daily in the POC. Categories: Sobriety, Training, Nutrition,
Sleep, Reading, Music, Meditation, Productivity, Finance, Custom.

### DailyQuest
```
id, habitId, date (YYYY-MM-DD), core (bool),
completed (bool), completionTime (ISO | null)
```

### XPTransaction
```
id, amount, reason, questId (nullable), stat (string | null), timestamp
```
`stat` records the active theme's flavor-stat key the completion fed (see Theme).

### Streak
```
habitId (pk), current, best, lastCompletionDate
```

### DailyCheckIn
```
id, date (pk), mood (1-5), energy (1-5), cravings (bool),
notes, completed (bool), recoveryQuestGenerated (bool)
```

### RecoveryQuest
```
id, date, title, stat (string | null), completed (bool)
```

### UnlockEvent
```
id, itemId, level, unlockedAt
```

### Theme (config data, seeded, not in DB)
```
name, stats: [{key, label}], items: [{id, level, name, asset, title?}],
statMap: { category: statKey }
```

## Game rules

### Quest generation (rule-based)
- Per date: up to **3 core quests** (from active core habits) and up to **2
  bonus quests** (from active bonus habits).
- When core habits exceed 3, rotate fairly (round-robin across days).
- Generators are idempotent: generating for a date that already has quests is
  a no-op.

### XP
- Base by difficulty: easy 10 / medium 25 / hard 50 / epic 100.
- Modifiers on completion:
  - **Perfect day bonus:** +25% of the day's quest XP when 100% of the day's
    quests are complete.
  - **Streak multiplier:** +10% per completed 7-day streak milestone, capped
    at +50%.
- Each completion writes a single XPTransaction (with `stat` from the habit's
  category via the theme's statMap).
- **Level:** derived from total XP via a curve (`levelForXp`), e.g. L1: 0,
  L2: 100, L3: 250, L4: 500, L5: 800, ... Level is display + unlock gate only.

### Streaks
- Every habit has an independent daily streak. A missed day breaks that
  habit's streak only; `best` is kept. Breaking one streak never resets any
  other.

### Evening check-in (manual)
- Rate mood (1-5), energy (1-5), cravings (bool), optional note.
- Mark which quests actually got done.
- **Recovery quest:** if any *core* quest was missed, generate one recovery
  quest for the next day from a rotating pool:
  "Invest in an ETF", "Walk 20 min", "Drink 2L water", "Journal 10 min".
  Recovery quests award small XP (15) and feed a flavor stat; they do **not**
  restore the broken streak — they are about reconnecting, not punishing.
- Check-in can only close a given day once.

### RPG character (career man)
- **Flavor stats** (cosmetic, accumulate from completed quests via statMap):
  - **Money** ← Sobriety, Finance, Productivity
  - **Health** ← Training, Nutrition, Sleep
  - **Mind** ← Reading, Music, Meditation
- **Item unlocks at levels** (each with pixel art + a "purchase" moment):
  - L1: worn clothes (start) · L2: suit · L3: watch · L4: briefcase ·
    L5: car · L6: house · L7: office
  - Beyond L7: title bumps (Junior → Manager → VP → CEO).
- Items/titles are config data; levels and names are tweakable.
- Theme definitions are data: adding a second theme later requires a new
  theme object + art, zero engine changes.

## Day flip

- Dates are day-stamped in the device's local timezone (`YYYY-MM-DD`).
- Opening the app on a new date triggers a day flip: today's quests are
  generated if absent, and yesterday is left **open** (never auto-punished)
  — the user can still complete yesterday's check-in retroactively from the
  Week view.

## Screens (4 tabs, bottom nav)

1. **Today** — today's quests grouped Core (top) then Bonus; each an XP-labeled
   card with a big check-off button; header shows today's XP earned,
   perfect-day progress, and streak flames for active habits; evening CTA
   launches the Check-In flow.
2. **Week** — 7-day calendar strip (Mon-Sun); each day shows quests with
   done/missed chips; tapping a day opens its quest list; shows weekly
   completion %.
3. **Character** — pixel career man standing with every earned item, the three
   flavor-stat bars (Money/Health/Mind), level + XP bar, and habit history
   (streak current/best). Absorbs the source spec's Statistics screen.
4. **Habits** — Habit Builder: create/edit habits (name, category, difficulty,
   core/bonus, live XP preview), toggle active, delete.

### Check-In flow
3 steps from Today: mood/energy/cravings + note → review incomplete quests →
"Close the day" (generates recovery quest if a core quest was missed). After
closing, Today shows the next day's freshly generated quests.

## Error handling & robustness

- All Dexie writes wrapped; a write failure surfaces an inline toast
  ("couldn't save") and never loses in-memory state — retry on next action.
- Double-tapping Complete is ignored (idempotent).
- Generators are idempotent; check-in closes a day at most once.
- Never auto-punishes missed days (day flip leaves the previous day open).

## Offline / PWA

- Service worker via `vite-plugin-pwa` (workbox): app-shell cache, fully
  usable offline; IndexedDB is local by nature.
- `manifest.json` + install prompt for add-to-home-screen on mobile.

## Testing

- **Engine unit tests (Vitest) are the backbone:** quest generation (rotation,
  caps, bonus limits), XP math (base, perfect-day, streak multiplier, level
  curve), streak break rules, recovery quest selection, check-in closure,
  day flip, unlock events at level thresholds.
- Repo-level tests against Dexie's in-memory DB.
- One App-level smoke test (Today renders).
- Commands: `npm run lint`, `npm run test`, `npm run typecheck`.

## Success metric

The app motivates the user to wake up wanting to complete today's quests while
reinforcing long-term healthy habits and a sense of control.
