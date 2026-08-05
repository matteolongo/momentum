# Momentum POC Implementation Plan

Goal: ship the smallest verifiable slice of Momentum first, then expand only if the core loop holds up.

This plan intentionally cuts the earlier draft down. The old version tried to specify too much implementation detail before any code existed. That creates contradictions, makes review harder, and invites rework. This version keeps the same product scope, but executes it in a build order that can actually be checked.

## Operating rules

- Keep the engine pure: `src/engine/*` has no UI, store, or Dexie imports.
- Use local `YYYY-MM-DD` day stamps only.
- Generators and mutations must be idempotent.
- Never auto-punish: missed days stay open, streaks only affect their own habit.
- One theme only for the POC. Keep theme data-driven so a second theme is data plus art later.
- Write the smallest test that proves each rule before implementation.
- After each phase, run `npm run test`, `npm run lint`, and `npm run typecheck`.

## Build order

### Phase 1: project scaffold

Deliverables:

- Vite + React + TypeScript app boots.
- App smoke test passes.
- PWA shell is configured, but no game logic yet.

Done when:

- `npm run dev` starts.
- `npm run build` works.
- `App` renders a visible shell.

### Phase 2: pure engine foundation

Deliverables:

- Day-stamp helpers.
- Quest generation rules.
- XP math and level curve.
- Streak computation.
- Check-in closure and recovery-quest selection.

Done when:

- Engine tests cover the rules, especially idempotency.
- No engine file imports UI, store, or DB code.

### Phase 3: local persistence

Deliverables:

- Dexie schema.
- Seed data for default habits.
- Repositories for habits, quests, streaks, XP transactions, check-ins, recovery quests, and unlocks.

Done when:

- Repository methods enforce the same idempotency rules as the engine.
- Seed logic is safe to run more than once.

### Phase 4: orchestration layer

Deliverables:

- Game actions that connect engine output to repos.
- A single path for complete-quest, close-day, and quest-generation flows.
- Transactions around multi-write updates where needed.

Done when:

- Completing a quest twice is a no-op the second time.
- Closing the same day twice is a no-op the second time.
- Retroactive completion uses the selected date, not "today" by accident.

### Phase 5: Today screen and check-in flow

Deliverables:

- Today view with quests, XP, and streak hints.
- Manual evening check-in flow.
- Recovery quest is surfaced after a miss.

Done when:

- The main loop works end to end on one date.
- The UI refreshes after completion without a reload.

### Phase 6: Week, Character, Habits

Deliverables:

- Week view for retroactive review.
- Character screen with level, XP, and flavor stats.
- Habits CRUD screen.

Done when:

- Retroactive check-in is usable from Week.
- Level unlocks are data-driven, not hardcoded in UI logic.

### Phase 7: polish and release checks

Deliverables:

- PWA installability.
- Empty/error states.
- Final pass on lint, typecheck, tests, and build.

Done when:

- The app is installable.
- The repo has a clean verification story.

## What stays out of v1

- Multiple themes.
- Badges, titles-as-content, inventory, shop, friends, AI coach, cloud sync.
- Speculative abstractions that only help a future version.

## Review checkpoints

1. After scaffold: confirm the app actually starts and the test harness is wired.
2. After engine: confirm the rules match the design spec and the tests fail for the right reasons before passing.
3. After repos/actions: confirm idempotency and date handling with real repo-backed tests.
4. After UI: confirm the user can complete the core loop without stale state.

## Main risks to watch

- Wrong date source in orchestration. This is the easiest way to break retroactive check-in.
- Duplicate writes hidden behind optimistic UI.
- Quest generation that accidentally creates history for days before the app had data.
- XP and level rules drifting away from the design because they were copied into too many places.
