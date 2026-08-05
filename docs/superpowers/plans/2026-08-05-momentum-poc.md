# Momentum POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first PWA habit tracker with rule-based daily quests, XP/levels, per-habit streaks, a manual evening check-in, recovery quests, and a retro-pixel career-man character who earns items at level thresholds.

**Architecture:** Layered `UI → store (Zustand) → game actions → repos (Dexie)`. A pure TypeScript engine (`src/engine/*`) holds all game rules with no UI/DB imports — plain objects in, plain objects out, unit-tested in isolation. Character themes are config data, not code.

**Tech Stack:** Vite + React 18 + TypeScript, Dexie (IndexedDB), Zustand, Vitest + Testing Library, `vite-plugin-pwa`.

## Global Constraints

- **Dates:** local-timezone `YYYY-MM-DD` day stamps. Never UTC rollover.
- **Never auto-punish:** missed days stay open; a streak breaks only its own habit. Recovery quests reconnect, they never restore streaks.
- **Idempotent:** no duplicate quest generation, no double-complete, one check-in per day, one perfect-day bonus per day.
- **Engine purity:** `src/engine/*` imports nothing from `db/`, `game/`, `store/`, or `ui/`. No theme-specific logic hardcoded in the engine — themes are data.
- **TDD for engine and actions:** failing test first, minimal implementation, then green.
- **Commands after every change:** `npm run lint && npm run typecheck`. Tests: `npm run test`.
- **No comments** unless the code genuinely needs them. No dead code, no speculative features.
- **Commits:** Conventional Commits, imperative, ≤50 chars, one concern per commit, stage only intended files.

---

## File Structure

```
package.json, vite.config.ts, tsconfig.json, tsconfig.node.json,
eslint.config.js, index.html, public/icon.svg
src/
  main.tsx                  entry — create db, seed, render <App/>
  App.tsx                   tab shell, GameContext provider, day-flip watcher
  engine/
    types.ts                all domain types + constants + newId()
    dates.ts                day-stamp helpers (pure)
    quests.ts               generateQuests()
    xp.ts                   XP math, level curve, unlocks, stat totals
    streaks.ts              computeStreaks()
    checkin.ts              closeDay(), buildRecoveryQuest()
    theme.ts                CAREER_THEME config data
    index.ts                re-exports
  db/
    index.ts                MomentumDB class + createDb()
    seed.ts                 DEFAULT_HABITS + seedIfNeeded()
    repos.ts                createRepos() — typed CRUD facade
  game/
    actions.ts              completeQuest, closeDay, ensureQuests (orchestration)
  store/
    useGame.ts              Zustand: today, tab, checkInOpen, toast, syncToday
  ui/
    theme.css               palette + pixel-asset styles
    context.tsx             GameContext (repos + theme) + useGame hook helpers
    components/             QuestCard, StreakFlame, XPBar, TabBar, CharacterView, CheckInModal
    screens/                TodayScreen, WeekScreen, CharacterScreen, HabitsScreen
tests are co-located: src/engine/*.test.ts, src/db/*.test.ts,
src/game/*.test.ts, src/ui/*.test.tsx
docs/superpowers/plans/2026-08-05-momentum-poc.md  (this file)
```

---

### Task 1: Scaffold project, tooling, and PWA shell

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `eslint.config.js`, `index.html`, `public/icon.svg`, `src/main.tsx`, `src/App.tsx`, `src/ui/theme.css`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: runnable `npm run dev | build | preview | test | lint | typecheck`; `<App/>` renders "Momentum"

- [ ] **Step 1: Write the failing App smoke test**

```tsx
// src/App.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the Momentum title', () => {
    render(<App />);
    expect(screen.getByText('Momentum')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` — Expected: FAIL (`App` module not found). (Test script needs to exist first; create `package.json` before running.)

- [ ] **Step 3: Create project config files**

`package.json`:
```json
{
  "name": "momentum",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "dexie": "^4.0.8",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@eslint/js": "^9.9.0",
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "eslint": "^9.9.0",
    "eslint-plugin-react-hooks": "^4.6.2",
    "eslint-plugin-react-refresh": "^0.4.9",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.4",
    "typescript-eslint": "^8.2.0",
    "vite": "^5.4.0",
    "vite-plugin-pwa": "^0.20.1",
    "vitest": "^2.0.5"
  }
}
```

`vite.config.ts` (PWA + vitest config in one file):
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Momentum',
        short_name: 'Momentum',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f0f14',
        theme_color: '#0f0f14',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

`eslint.config.js`:
```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist'] },
  { extends: [js.configs.recommended, ...tseslint.configs.recommended] },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: { ...reactHooks.configs.recommended.rules, 'react-refresh/only-export-components': ['warn', { allowConstantExport: true }] },
  },
);
```

`src/setupTests.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0f0f14" />
    <title>Momentum</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`public/icon.svg` (simple pixel-style placeholder — a green pixel gem on dark):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" shape-rendering="crispEdges">
  <rect width="192" height="192" fill="#0f0f14"/>
  <rect x="64" y="40" width="64" height="112" fill="#2d9a4e"/>
  <rect x="80" y="56" width="32" height="80" fill="#7ed957"/>
  <rect x="88" y="40" width="16" height="16" fill="#7ed957"/>
  <rect x="88" y="152" width="16" height="16" fill="#2d9a4e"/>
</svg>
```

`src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './ui/theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

`src/App.tsx`:
```tsx
export default function App() {
  return (
    <main>
      <h1>Momentum</h1>
    </main>
  );
}
```

`src/ui/theme.css`:
```css
:root {
  --bg: #0f0f14;
  --panel: #1a1a22;
  --accent: #7ed957;
  --gold: #ffd23f;
  --danger: #ff5d5d;
  --text: #e8e8f0;
  --muted: #8a8a99;
  --pixel-border: 4px;
  font-family: 'Courier New', monospace;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); }
main { padding: 1rem; max-width: 480px; margin: 0 auto; }
```

- [ ] **Step 4: Install dependencies**

Run: `npm install` — Expected: success, `node_modules/` present.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test` — Expected: PASS (App renders Momentum).

- [ ] **Step 6: Run lint and typecheck**

Run: `npm run lint && npm run typecheck` — Expected: both pass with no errors.

- [ ] **Step 7: Verify production build**

Run: `npm run build` — Expected: `dist/` produced, PWA manifest generated, no TS errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite react pwa with tooling"
```

---

### Task 2: Engine types and date helpers

**Files:**
- Create: `src/engine/types.ts`, `src/engine/dates.ts`, `src/engine/dates.test.ts`, `src/engine/index.ts`

**Interfaces:**
- Consumes: nothing
- Produces: all domain types below plus `newId()`, and dates: `toDayStamp(d: Date)`, `todayStamp()`, `addDays(stamp, n)`, `yesterday(stamp)`, `tomorrow(stamp)`, `dayNumber(stamp)`, `weekStart(stamp)`, `lastNDays(stamp, n)`.

- [ ] **Step 1: Write the failing date tests**

```ts
// src/engine/dates.test.ts
import { describe, it, expect } from 'vitest';
import { toDayStamp, addDays, yesterday, tomorrow, dayNumber, weekStart, lastNDays } from './dates';

describe('dates', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(toDayStamp(new Date(2026, 7, 5))).toBe('2026-08-05');
  });
  it('adds and subtracts days', () => {
    expect(addDays('2026-08-05', 1)).toBe('2026-08-06');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('computes yesterday and tomorrow', () => {
    expect(yesterday('2026-08-05')).toBe('2026-08-04');
    expect(tomorrow('2026-08-05')).toBe('2026-08-06');
  });
  it('dayNumber is stable across timezones', () => {
    expect(dayNumber('2026-08-05') - dayNumber('2026-08-04')).toBe(1);
  });
  it('weekStart returns the Monday of the week', () => {
    expect(weekStart('2026-08-05')).toBe('2026-08-03'); // Wed -> Mon
    expect(weekStart('2026-08-03')).toBe('2026-08-03'); // Mon -> Mon
  });
  it('lastNDays returns n stamps ending with the given day', () => {
    expect(lastNDays('2026-08-05', 7)).toEqual(['2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/dates.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Write types**

```ts
// src/engine/types.ts
export type Difficulty = 'easy' | 'medium' | 'hard' | 'epic';
export type Category =
  | 'Sobriety' | 'Training' | 'Nutrition' | 'Sleep' | 'Reading'
  | 'Music' | 'Meditation' | 'Productivity' | 'Finance' | 'Custom';

export const CATEGORIES: Category[] = [
  'Sobriety', 'Training', 'Nutrition', 'Sleep', 'Reading',
  'Music', 'Meditation', 'Productivity', 'Finance', 'Custom',
];

export interface Habit {
  id: string;
  name: string;
  category: Category;
  difficulty: Difficulty;
  xp: number;
  core: boolean;
  active: boolean;
  createdAt: string;
}

export interface DailyQuest {
  id: string;
  habitId: string;
  date: string;
  core: boolean;
  completed: boolean;
  completionTime: string | null;
}

export interface XPTransaction {
  id: string;
  amount: number;
  reason: string;
  questId: string | null;
  stat: string | null;
  timestamp: string;
}

export interface Streak {
  habitId: string;
  current: number;
  best: number;
  lastCompletionDate: string | null;
}

export interface DailyCheckIn {
  id: string;
  date: string;
  mood: number;
  energy: number;
  cravings: boolean;
  notes: string;
  completed: boolean;
  recoveryQuestGenerated: boolean;
}

export interface RecoveryQuest {
  id: string;
  date: string;
  title: string;
  stat: string | null;
  completed: boolean;
  completionTime: string | null;
}

export interface UnlockEvent {
  id: string;
  itemId: string;
  level: number;
  unlockedAt: string;
}

export interface ThemeStat { key: string; label: string; }
export interface ThemeItem { id: string; level: number; name: string; icon: string; }
export interface ThemeTitle { level: number; title: string; }
export interface RecoveryQuestDef { title: string; stat: string | null; }

export interface CharacterTheme {
  id: string;
  name: string;
  stats: ThemeStat[];
  items: ThemeItem[];
  titles: ThemeTitle[];
  statMap: Record<Category, string | null>;
  recoveryQuests: RecoveryQuestDef[];
}

export function newId(): string {
  return crypto.randomUUID();
}
```

- [ ] **Step 4: Write date helpers**

```ts
// src/engine/dates.ts
export function toDayStamp(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStamp(): string {
  return toDayStamp(new Date());
}

export function fromDayStamp(stamp: string): Date {
  const [y, m, d] = stamp.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(stamp: string, n: number): string {
  const d = fromDayStamp(stamp);
  d.setDate(d.getDate() + n);
  return toDayStamp(d);
}

export function yesterday(stamp: string): string {
  return addDays(stamp, -1);
}

export function tomorrow(stamp: string): string {
  return addDays(stamp, 1);
}

export function dayNumber(stamp: string): number {
  return Math.floor(fromDayStamp(stamp).getTime() / 86_400_000);
}

export function weekStart(stamp: string): string {
  const d = fromDayStamp(stamp);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return toDayStamp(d);
}

export function lastNDays(stamp: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(stamp, i - (n - 1)));
}
```

- [ ] **Step 5: Create `src/engine/index.ts` barrel (start empty; add re-exports as modules land)**

```ts
// add one line per shipped module, in this order:
// export * from './types';
// export * from './dates';
// export * from './quests';
// export * from './xp';
// export * from './streaks';
// export * from './checkin';
// export * from './theme';
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/engine/dates.test.ts` — Expected: PASS (all 6).

- [ ] **Step 7: Run lint and typecheck**

Run: `npm run lint && npm run typecheck` — Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add src/engine/types.ts src/engine/dates.ts src/engine/dates.test.ts src/engine/index.ts
git commit -m "feat(engine): add domain types and date helpers"
```

---

### Task 3: Quest generation engine

**Files:**
- Create: `src/engine/quests.ts`, `src/engine/quests.test.ts`

**Interfaces:**
- Consumes: `Habit`, `DailyQuest`, `newId` from `./types`; `dayNumber` from `./dates`
- Produces: `generateQuests(date: string, habits: Habit[]): { core: DailyQuest[]; bonus: DailyQuest[] }`

Rules: up to 3 core quests from active core habits, up to 2 bonus quests from active bonus habits. When more candidates than slots, rotate by a date-derived offset (fair round-robin across days). Inactive habits never get quests.

- [ ] **Step 1: Write the failing tests**

```ts
// src/engine/quests.test.ts
import { describe, it, expect } from 'vitest';
import { generateQuests } from './quests';
import type { Habit } from './types';

function habit(partial: Partial<Habit> & Pick<Habit, 'id' | 'name'>): Habit {
  return { category: 'Custom', difficulty: 'easy', xp: 10, core: false, active: true, createdAt: '2026-08-01', ...partial };
}

describe('generateQuests', () => {
  it('generates up to 3 core and 2 bonus quests', () => {
    const habits = [
      habit({ id: 'a', name: 'A', core: true }),
      habit({ id: 'b', name: 'B', core: true }),
      habit({ id: 'c', name: 'C', core: true }),
      habit({ id: 'd', name: 'D', core: true }),
      habit({ id: 'e', name: 'E' }),
      habit({ id: 'f', name: 'F' }),
      habit({ id: 'g', name: 'G' }),
    ];
    const { core, bonus } = generateQuests('2026-08-05', habits);
    expect(core).toHaveLength(3);
    expect(bonus).toHaveLength(2);
  });

  it('skips inactive habits', () => {
    const habits = [habit({ id: 'a', name: 'A', core: true, active: false })];
    const { core } = generateQuests('2026-08-05', habits);
    expect(core).toHaveLength(0);
  });

  it('rotates which core habits appear when more than 3 exist', () => {
    const habits = ['a', 'b', 'c', 'd', 'e'].map((id) => habit({ id, name: id, core: true }));
    const day1 = generateQuests('2026-08-05', habits).core.map((q) => q.habitId);
    const day2 = generateQuests('2026-08-06', habits).core.map((q) => q.habitId);
    expect(day1).not.toEqual(day2);
    expect(day1).toHaveLength(3);
    expect(day2).toHaveLength(3);
  });

  it('tags quests with date and core flag and references habit xp', () => {
    const h = habit({ id: 'a', name: 'A', core: true, xp: 50 });
    const { core } = generateQuests('2026-08-05', [h]);
    expect(core[0]).toMatchObject({ habitId: 'a', date: '2026-08-05', core: true });
    expect(core[0].completed).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/quests.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/engine/quests.ts
import { dayNumber } from './dates';
import { newId, type DailyQuest, type Habit } from './types';

function takeRotating(candidates: Habit[], slots: number, date: string): Habit[] {
  if (candidates.length === 0) return [];
  if (candidates.length <= slots) return candidates;
  const offset = dayNumber(date) % candidates.length;
  return Array.from({ length: slots }, (_, i) => candidates[(offset + i) % candidates.length]);
}

function toQuest(habit: Habit, date: string): DailyQuest {
  return {
    id: newId(),
    habitId: habit.id,
    date,
    core: habit.core,
    completed: false,
    completionTime: null,
  };
}

export function generateQuests(date: string, habits: Habit[]): { core: DailyQuest[]; bonus: DailyQuest[] } {
  const active = habits.filter((h) => h.active);
  const coreCandidates = active.filter((h) => h.core).sort((a, b) => a.id.localeCompare(b.id));
  const bonusCandidates = active.filter((h) => !h.core).sort((a, b) => a.id.localeCompare(b.id));
  return {
    core: takeRotating(coreCandidates, 3, date).map((h) => toQuest(h, date)),
    bonus: takeRotating(bonusCandidates, 2, date).map((h) => toQuest(h, date)),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/quests.test.ts` — Expected: PASS (4).

- [ ] **Step 5: Add `export * from './quests';` to `src/engine/index.ts`, run lint + typecheck**

- [ ] **Step 6: Commit**

```bash
git add src/engine/quests.ts src/engine/quests.test.ts src/engine/index.ts
git commit -m "feat(engine): generate daily quests from habits"
```

---

### Task 4: XP, levels, and unlock engine

**Files:**
- Create: `src/engine/xp.ts`, `src/engine/xp.test.ts`

**Interfaces:**
- Consumes: `Difficulty`, `XPTransaction`, `CharacterTheme`, `ThemeItem` from `./types`
- Produces:
  - `BASE_XP: Record<Difficulty, number>` = `{ easy: 10, medium: 25, hard: 50, epic: 100 }`
  - `xpForDifficulty(d: Difficulty): number`
  - `streakMultiplier(streakCurrent: number): number` — `1 + 0.1 * floor(current / 7)`, cap 1.5
  - `computeQuestXp(baseXp: number, streakCurrent: number): number` — round(baseXp * multiplier)
  - `perfectDayBonus(dayQuestXp: number): number` — round(dayQuestXp * 0.25)
  - `totalXp(txns: Pick<XPTransaction, 'amount'>[]): number`
  - `LEVEL_THRESHOLDS: number[]` = `[0, 100, 250, 500, 800, 1200, 1700, 2300, 3000]`
  - `levelForXp(xp: number): number`
  - `xpToNextLevel(xp: number): { level: number; current: number; next: number; progress: number }`
  - `newUnlocks(theme, level, unlockedItemIds: Set<string>): ThemeItem[]`
  - `titleForLevel(theme, level): string | null`
  - `statTotals(txns: Pick<XPTransaction, 'stat' | 'amount'>[], theme): Record<string, number>`

**Order note:** this task's tests import `CAREER_THEME` from `./theme`. Land Task 6 (theme data) first, or create a matching `CAREER_THEME` stub now and reconcile in Task 6. Recommended: do Task 6 first, then this test passes as written.

- [ ] **Step 1: Write the failing tests**

```ts
// src/engine/xp.test.ts
import { describe, it, expect } from 'vitest';
import {
  BASE_XP, xpForDifficulty, streakMultiplier, computeQuestXp, perfectDayBonus,
  totalXp, levelForXp, xpToNextLevel, newUnlocks, titleForLevel, statTotals,
} from './xp';
import { CAREER_THEME } from './theme';

describe('xp', () => {
  it('maps difficulty to base xp', () => {
    expect(BASE_XP).toEqual({ easy: 10, medium: 25, hard: 50, epic: 100 });
    expect(xpForDifficulty('hard')).toBe(50);
  });

  it('streak multiplier grows every 7 days, capped at 1.5', () => {
    expect(streakMultiplier(3)).toBe(1);
    expect(streakMultiplier(7)).toBe(1.1);
    expect(streakMultiplier(14)).toBe(1.2);
    expect(streakMultiplier(35)).toBe(1.5);
    expect(streakMultiplier(70)).toBe(1.5);
  });

  it('computes quest xp from base and streak', () => {
    expect(computeQuestXp(50, 0)).toBe(50);
    expect(computeQuestXp(50, 7)).toBe(55);
  });

  it('perfect day bonus is 25% of the day xp', () => {
    expect(perfectDayBonus(100)).toBe(25);
  });

  it('sums transaction amounts', () => {
    expect(totalXp([{ amount: 10 }, { amount: 55 }, { amount: 25 }])).toBe(90);
  });

  it('levels by cumulative thresholds', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(250)).toBe(3);
    expect(levelForXp(99999)).toBe(10);
  });

  it('xpToNextLevel reports progress', () => {
    expect(xpToNextLevel(150)).toMatchObject({ level: 2, current: 50, next: 250, progress: 0.5 });
  });

  it('returns only newly unlocked items above unlocked levels', () => {
    const unlocked = newUnlocks(CAREER_THEME, 3, new Set(['item_1']));
    expect(unlocked.map((i) => i.id)).toEqual(['item_2']);
  });

  it('maps titles by level', () => {
    expect(titleForLevel(CAREER_THEME, 3)).toBeNull();
    expect(titleForLevel(CAREER_THEME, 8)).toBe('Junior');
  });

  it('totals flavor stats per theme stat key', () => {
    const txns = [{ stat: 'money', amount: 50 }, { stat: 'health', amount: 25 }, { stat: null, amount: 10 }];
    expect(statTotals(txns, CAREER_THEME)).toEqual({ money: 50, health: 25, mind: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/xp.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/engine/xp.ts
import type { CharacterTheme, Difficulty, ThemeItem, XPTransaction } from './types';

export const BASE_XP: Record<Difficulty, number> = { easy: 10, medium: 25, hard: 50, epic: 100 };

export function xpForDifficulty(d: Difficulty): number {
  return BASE_XP[d];
}

export function streakMultiplier(streakCurrent: number): number {
  return Math.min(1.5, 1 + 0.1 * Math.floor(streakCurrent / 7));
}

export function computeQuestXp(baseXp: number, streakCurrent: number): number {
  return Math.round(baseXp * streakMultiplier(streakCurrent));
}

export function perfectDayBonus(dayQuestXp: number): number {
  return Math.round(dayQuestXp * 0.25);
}

export function totalXp(txns: Pick<XPTransaction, 'amount'>[]): number {
  return txns.reduce((sum, t) => sum + t.amount, 0);
}

export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000];

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

export function xpToNextLevel(xp: number): { level: number; current: number; next: number; progress: number } {
  const level = levelForXp(xp);
  const next = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const prev = LEVEL_THRESHOLDS[level - 1];
  const current = xp - prev;
  return { level, current, next, progress: current / (next - prev) };
}

export function newUnlocks(theme: CharacterTheme, level: number, unlockedItemIds: Set<string>): ThemeItem[] {
  return theme.items.filter((item) => item.level <= level && !unlockedItemIds.has(item.id));
}

export function titleForLevel(theme: CharacterTheme, level: number): string | null {
  const match = theme.titles.filter((t) => t.level <= level).pop();
  return match ? match.title : null;
}

export function statTotals(txns: Pick<XPTransaction, 'stat' | 'amount'>[], theme: CharacterTheme): Record<string, number> {
  const totals = Object.fromEntries(theme.stats.map((s) => [s.key, 0]));
  for (const t of txns) {
    if (t.stat && t.stat in totals) totals[t.stat] += t.amount;
  }
  return totals;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/xp.test.ts` — Expected: PASS (11).

- [ ] **Step 5: Add `export * from './xp';` to `src/engine/index.ts`, run lint + typecheck**

- [ ] **Step 6: Commit**

```bash
git add src/engine/xp.ts src/engine/xp.test.ts src/engine/index.ts
git commit -m "feat(engine): add xp levels and unlock logic"
```

---

### Task 5: Streak engine

**Files:**
- Create: `src/engine/streaks.ts`, `src/engine/streaks.test.ts`

**Interfaces:**
- Consumes: `DailyQuest`, `Streak` from `./types`; `yesterday` from `./dates`
- Produces: `computeStreaks(quests: Pick<DailyQuest, 'habitId' | 'date' | 'completed'>[], today: string): Map<string, Streak>`

Rules: current = consecutive completed days ending at today (if today completed) else ending yesterday; best = longest run in history; lastCompletionDate = most recent completed date. A missing day breaks only that habit's run.

- [ ] **Step 1: Write the failing tests**

```ts
// src/engine/streaks.test.ts
import { describe, it, expect } from 'vitest';
import { computeStreaks } from './streaks';

const q = (habitId: string, date: string, completed = true) => ({ habitId, date, completed });

describe('computeStreaks', () => {
  it('counts consecutive completed days ending today', () => {
    const quests = [q('a', '2026-08-03'), q('a', '2026-08-04'), q('a', '2026-08-05')];
    const s = computeStreaks(quests, '2026-08-05').get('a')!;
    expect(s.current).toBe(3);
  });

  it('a gap breaks the current streak but keeps best', () => {
    const quests = [q('a', '2026-08-01'), q('a', '2026-08-02'), q('a', '2026-08-04'), q('a', '2026-08-05')];
    const s = computeStreaks(quests, '2026-08-05').get('a')!;
    expect(s.current).toBe(2);
    expect(s.best).toBe(3);
  });

  it('an open today does not break the streak through yesterday', () => {
    const quests = [q('a', '2026-08-03'), q('a', '2026-08-04')];
    const s = computeStreaks(quests, '2026-08-05').get('a')!;
    expect(s.current).toBe(2);
  });

  it('missed yesterday breaks the run', () => {
    const quests = [q('a', '2026-08-03'), q('a', '2026-08-05')];
    const s = computeStreaks(quests, '2026-08-05').get('a')!;
    expect(s.current).toBe(1);
  });

  it('returns no entry for habits with no completions', () => {
    const s = computeStreaks([q('a', '2026-08-05', false)], '2026-08-05');
    expect(s.size).toBe(0);
  });

  it('streaks are independent per habit', () => {
    const quests = [q('a', '2026-08-05'), q('b', '2026-08-03')];
    const s = computeStreaks(quests, '2026-08-05');
    expect(s.get('a')!.current).toBe(1);
    expect(s.get('b')!.current).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/streaks.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/engine/streaks.ts
import { yesterday } from './dates';
import type { DailyQuest, Streak } from './types';

function sortedCompletedDates(quests: Pick<DailyQuest, 'date' | 'completed'>[]): string[] {
  return quests.filter((q) => q.completed).map((q) => q.date).sort();
}

function consecutiveBack(completed: Set<string>, end: string): number {
  let count = 0;
  let d = end;
  while (completed.has(d)) {
    count++;
    d = yesterday(d);
  }
  return count;
}

function bestRun(dates: string[]): number {
  let best = 0;
  let run = 0;
  let prev = '';
  for (const d of dates) {
    if (prev && yesterday(d) !== prev) run = 0;
    run++;
    if (run > best) best = run;
    prev = d;
  }
  return best;
}

export function computeStreaks(
  quests: Pick<DailyQuest, 'habitId' | 'date' | 'completed'>[],
  today: string,
): Map<string, Streak> {
  const byHabit = new Map<string, Pick<DailyQuest, 'date' | 'completed'>[]>();
  for (const q of quests) {
    const list = byHabit.get(q.habitId) ?? [];
    list.push(q);
    byHabit.set(q.habitId, list);
  }
  const result = new Map<string, Streak>();
  for (const [habitId, habitQuests] of byHabit) {
    const completed = sortedCompletedDates(habitQuests);
    if (completed.length === 0) continue;
    const set = new Set(completed);
    const end = set.has(today) ? today : yesterday(today);
    result.set(habitId, {
      habitId,
      current: consecutiveBack(set, end),
      best: bestRun(completed),
      lastCompletionDate: completed[completed.length - 1],
    });
  }
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/streaks.test.ts` — Expected: PASS (6).

- [ ] **Step 5: Add `export * from './streaks';` to `src/engine/index.ts`, run lint + typecheck**

- [ ] **Step 6: Commit**

```bash
git add src/engine/streaks.ts src/engine/streaks.test.ts src/engine/index.ts
git commit -m "feat(engine): compute per-habit streaks"
```

---

### Task 6: Career theme data

**Files:**
- Create: `src/engine/theme.ts`, `src/engine/theme.test.ts`

**Interfaces:**
- Consumes: `CharacterTheme`, `Category`, `ThemeItem` from `./types`
- Produces: `CAREER_THEME: CharacterTheme` with id `'career'`, stats money/health/mind, items at L1-L7, titles at L8+, statMap for every category, and a 4-entry recovery quest pool.

- [ ] **Step 1: Write the failing tests**

```ts
// src/engine/theme.test.ts
import { describe, it, expect } from 'vitest';
import { CAREER_THEME } from './theme';
import { CATEGORIES } from './types';

describe('CAREER_THEME', () => {
  it('has the three flavor stats', () => {
    expect(CAREER_THEME.stats.map((s) => s.key)).toEqual(['money', 'health', 'mind']);
  });

  it('maps every category to a known stat or null', () => {
    const keys = new Set(CAREER_THEME.stats.map((s) => s.key));
    for (const c of CATEGORIES) {
      const stat = CAREER_THEME.statMap[c];
      expect(stat === null || keys.has(stat)).toBe(true);
    }
  });

  it('maps the money stats as specced', () => {
    expect(CAREER_THEME.statMap.Sobriety).toBe('money');
    expect(CAREER_THEME.statMap.Finance).toBe('money');
    expect(CAREER_THEME.statMap.Productivity).toBe('money');
    expect(CAREER_THEME.statMap.Training).toBe('health');
    expect(CAREER_THEME.statMap.Reading).toBe('mind');
    expect(CAREER_THEME.statMap.Custom).toBeNull();
  });

  it('items unlock at ascending levels starting with worn clothes', () => {
    expect(CAREER_THEME.items[0]).toMatchObject({ id: 'item_1', level: 1, name: 'Worn clothes' });
    for (let i = 1; i < CAREER_THEME.items.length; i++) {
      expect(CAREER_THEME.items[i].level).toBeGreaterThan(CAREER_THEME.items[i - 1].level);
    }
  });

  it('has a recovery quest pool', () => {
    expect(CAREER_THEME.recoveryQuests.length).toBeGreaterThanOrEqual(3);
    expect(CAREER_THEME.recoveryQuests.map((q) => q.title)).toContain('Invest in an ETF');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/theme.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/engine/theme.ts
import type { CharacterTheme } from './types';

export const CAREER_THEME: CharacterTheme = {
  id: 'career',
  name: 'Career Man',
  stats: [
    { key: 'money', label: 'Money' },
    { key: 'health', label: 'Health' },
    { key: 'mind', label: 'Mind' },
  ],
  items: [
    { id: 'item_1', level: 1, name: 'Worn clothes', icon: '🪫' },
    { id: 'item_2', level: 2, name: 'Suit', icon: '🕴️' },
    { id: 'item_3', level: 3, name: 'Watch', icon: '⌚' },
    { id: 'item_4', level: 4, name: 'Briefcase', icon: '💼' },
    { id: 'item_5', level: 5, name: 'Car', icon: '🚗' },
    { id: 'item_6', level: 6, name: 'House', icon: '🏠' },
    { id: 'item_7', level: 7, name: 'Office', icon: '🏢' },
  ],
  titles: [
    { level: 8, title: 'Junior' },
    { level: 9, title: 'Manager' },
    { level: 10, title: 'VP' },
    { level: 11, title: 'CEO' },
  ],
  statMap: {
    Sobriety: 'money',
    Training: 'health',
    Nutrition: 'health',
    Sleep: 'health',
    Reading: 'mind',
    Music: 'mind',
    Meditation: 'mind',
    Productivity: 'money',
    Finance: 'money',
    Custom: null,
  },
  recoveryQuests: [
    { title: 'Invest in an ETF', stat: 'money' },
    { title: 'Walk 20 min', stat: 'health' },
    { title: 'Drink 2L water', stat: 'health' },
    { title: 'Journal 10 min', stat: 'mind' },
  ],
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/theme.test.ts` — Expected: PASS (5).

- [ ] **Step 5: Add `export * from './theme';` to `src/engine/index.ts`, run lint + typecheck**

- [ ] **Step 6: Commit**

```bash
git add src/engine/theme.ts src/engine/theme.test.ts src/engine/index.ts
git commit -m "feat(engine): add career man theme data"
```

---

### Task 7: Check-in and recovery quest engine

**Files:**
- Create: `src/engine/checkin.ts`, `src/engine/checkin.test.ts`

**Interfaces:**
- Consumes: `DailyQuest`, `DailyCheckIn`, `RecoveryQuest`, `CharacterTheme`, `newId` from `./types`; `dayNumber`, `tomorrow` from `./dates`; `perfectDayBonus`, `totalXp` from `./xp`
- Produces:
  - `CheckInInput = { mood: number; energy: number; cravings: boolean; notes: string }`
  - `createCheckIn(date: string, input: CheckInInput): DailyCheckIn` (completed: true)
  - `missedCoreCount(quests: DailyQuest[]): number`
  - `buildRecoveryQuest(date: string, theme: CharacterTheme): RecoveryQuest` (rotates by `dayNumber(date) % pool.length`; generated for tomorrow)
  - `closeDay(args: { date: string; input: CheckInInput; quests: DailyQuest[]; dayQuestXp: number; theme: CharacterTheme; perfectDayAlreadyAwarded: boolean }): { checkIn: DailyCheckIn; recoveryQuest: RecoveryQuest | null; perfectDayBonus: number }`

- [ ] **Step 1: Write the failing tests**

```ts
// src/engine/checkin.test.ts
import { describe, it, expect } from 'vitest';
import { createCheckIn, missedCoreCount, buildRecoveryQuest, closeDay } from './checkin';
import { CAREER_THEME } from './theme';
import type { DailyQuest } from './types';

const quest = (id: string, core: boolean, completed = false): DailyQuest => ({
  id, habitId: id, date: '2026-08-05', core, completed, completionTime: null,
});

describe('checkin', () => {
  it('creates a completed check-in for the date', () => {
    const c = createCheckIn('2026-08-05', { mood: 4, energy: 3, cravings: false, notes: '' });
    expect(c).toMatchObject({ date: '2026-08-05', mood: 4, energy: 3, cravings: false, completed: true });
  });

  it('counts missed core quests only', () => {
    const quests = [quest('a', true, true), quest('b', true), quest('c', false), quest('d', false, true)];
    expect(missedCoreCount(quests)).toBe(1);
  });

  it('rotates recovery quests by date and schedules them for tomorrow', () => {
    const a = buildRecoveryQuest('2026-08-05', CAREER_THEME);
    const b = buildRecoveryQuest('2026-08-06', CAREER_THEME);
    expect(a.title).not.toBe(b.title);
    expect(a.date).toBe('2026-08-06');
  });

  it('closeDay spawns a recovery quest only when a core quest was missed', () => {
    const allDone = closeDay({ date: '2026-08-05', input: { mood: 4, energy: 4, cravings: false, notes: '' }, quests: [quest('a', true, true)], dayQuestXp: 100, theme: CAREER_THEME, perfectDayAlreadyAwarded: false });
    expect(allDone.recoveryQuest).toBeNull();
    expect(allDone.perfectDayBonus).toBe(25);

    const missed = closeDay({ date: '2026-08-05', input: { mood: 2, energy: 2, cravings: true, notes: '' }, quests: [quest('a', true)], dayQuestXp: 100, theme: CAREER_THEME, perfectDayAlreadyAwarded: false });
    expect(missed.recoveryQuest).not.toBeNull();
    expect(missed.perfectDayBonus).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/checkin.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/engine/checkin.ts
import { dayNumber, tomorrow } from './dates';
import { newId, type CharacterTheme, type DailyCheckIn, type DailyQuest, type RecoveryQuest } from './types';
import { perfectDayBonus } from './xp';

export interface CheckInInput {
  mood: number;
  energy: number;
  cravings: boolean;
  notes: string;
}

export function createCheckIn(date: string, input: CheckInInput): DailyCheckIn {
  return {
    id: newId(),
    date,
    mood: input.mood,
    energy: input.energy,
    cravings: input.cravings,
    notes: input.notes,
    completed: true,
    recoveryQuestGenerated: false,
  };
}

export function missedCoreCount(quests: DailyQuest[]): number {
  return quests.filter((q) => q.core && !q.completed).length;
}

export function buildRecoveryQuest(date: string, theme: CharacterTheme): RecoveryQuest {
  const pool = theme.recoveryQuests;
  const def = pool[dayNumber(date) % pool.length];
  return {
    id: newId(),
    date: tomorrow(date),
    title: def.title,
    stat: def.stat,
    completed: false,
    completionTime: null,
  };
}

export function closeDay(args: {
  date: string;
  input: CheckInInput;
  quests: DailyQuest[];
  dayQuestXp: number;
  theme: CharacterTheme;
  perfectDayAlreadyAwarded: boolean;
}): { checkIn: DailyCheckIn; recoveryQuest: RecoveryQuest | null; perfectDayBonus: number } {
  const { date, input, quests, theme, dayQuestXp, perfectDayAlreadyAwarded } = args;
  const checkIn = createCheckIn(date, input);
  const missed = missedCoreCount(quests);
  let recoveryQuest: RecoveryQuest | null = null;
  if (missed > 0) {
    recoveryQuest = buildRecoveryQuest(date, theme);
    checkIn.recoveryQuestGenerated = true;
  }
  let bonus = 0;
  if (!perfectDayAlreadyAwarded && missed === 0) {
    bonus = perfectDayBonus(dayQuestXp);
  }
  return { checkIn, recoveryQuest, perfectDayBonus: bonus };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/checkin.test.ts` — Expected: PASS (4).

- [ ] **Step 5: Add `export * from './checkin';` to `src/engine/index.ts`, run lint + typecheck**

- [ ] **Step 6: Commit**

```bash
git add src/engine/checkin.ts src/engine/checkin.test.ts src/engine/index.ts
git commit -m "feat(engine): add check-in close and recovery quests"
```

---

### Task 8: Dexie schema and seed

**Files:**
- Create: `src/db/index.ts`, `src/db/seed.ts`, `src/db/seed.test.ts`

**Interfaces:**
- Consumes: `Habit`, `Difficulty` from engine
- Produces:
  - `export class MomentumDB extends Dexie` with tables: `habits`, `quests`, `xpTransactions`, `streaks`, `checkins`, `recoveryQuests`, `unlockEvents`, `meta`
  - `export function createDb(name?: string): MomentumDB`
  - `export const DEFAULT_HABITS: Habit[]`
  - `export async function seedIfNeeded(db: MomentumDB): Promise<void>` — inserts defaults once (guarded by meta `seeded`), sets meta `theme` to `'career'`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/db/seed.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createDb } from './index';
import { DEFAULT_HABITS, seedIfNeeded } from './seed';

describe('seed', () => {
  let db: ReturnType<typeof createDb>;
  beforeEach(() => {
    db = createDb('test-seed');
  });

  it('seeds defaults once, not twice', async () => {
    await seedIfNeeded(db);
    await seedIfNeeded(db);
    const habits = await db.habits.toArray();
    expect(habits).toHaveLength(DEFAULT_HABITS.length);
  });

  it('defaults include core and bonus habits with valid difficulty xp', async () => {
    await seedIfNeeded(db);
    const habits = await db.habits.toArray();
    expect(habits.some((h) => h.core)).toBe(true);
    expect(habits.some((h) => !h.core)).toBe(true);
    for (const h of habits) {
      expect([10, 25, 50, 100]).toContain(h.xp);
    }
  });

  it('sets the active theme meta to career', async () => {
    await seedIfNeeded(db);
    const theme = await db.meta.get('theme');
    expect(theme).toBe('career');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/db/seed.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Write schema and seed**

```ts
// src/db/index.ts
import Dexie from 'dexie';
import type { DailyCheckIn, DailyQuest, Habit, RecoveryQuest, Streak, UnlockEvent, XPTransaction } from '../engine';

export class MomentumDB extends Dexie {
  habits!: Dexie.Table<Habit, string>;
  quests!: Dexie.Table<DailyQuest, string>;
  xpTransactions!: Dexie.Table<XPTransaction, string>;
  streaks!: Dexie.Table<Streak, string>;
  checkins!: Dexie.Table<DailyCheckIn, string>;
  recoveryQuests!: Dexie.Table<RecoveryQuest, string>;
  unlockEvents!: Dexie.Table<UnlockEvent, string>;
  meta!: Dexie.Table<{ key: string; value: string }, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      habits: 'id',
      quests: 'id, date, habitId, completed',
      xpTransactions: 'id, timestamp, stat',
      streaks: 'habitId',
      checkins: 'id, date',
      recoveryQuests: 'id, date, completed',
      unlockEvents: 'id, level',
      meta: 'key',
    });
  }
}

export function createDb(name = 'momentum'): MomentumDB {
  return new MomentumDB(name);
}
```

```ts
// src/db/seed.ts
import { newId, type Difficulty, type Habit } from '../engine';
import type { MomentumDB } from './index';

const XP_BY_DIFFICULTY: Record<Difficulty, number> = { easy: 10, medium: 25, hard: 50, epic: 100 };

function habit(partial: { name: string; category: Habit['category']; difficulty: Difficulty; core: boolean }): Habit {
  return {
    id: newId(),
    name: partial.name,
    category: partial.category,
    difficulty: partial.difficulty,
    xp: XP_BY_DIFFICULTY[partial.difficulty],
    core: partial.core,
    active: true,
    createdAt: new Date().toISOString(),
  };
}

export const DEFAULT_HABITS: Habit[] = [
  habit({ name: 'No smoking', category: 'Sobriety', difficulty: 'hard', core: true }),
  habit({ name: 'No alcohol', category: 'Sobriety', difficulty: 'hard', core: true }),
  habit({ name: 'Home workout', category: 'Training', difficulty: 'medium', core: true }),
  habit({ name: 'Sleep before 23:30', category: 'Sleep', difficulty: 'medium', core: true }),
  habit({ name: 'Read 20 pages', category: 'Reading', difficulty: 'easy', core: false }),
  habit({ name: 'Practice guitar 20 min', category: 'Music', difficulty: 'easy', core: false }),
  habit({ name: 'Meditate 10 min', category: 'Meditation', difficulty: 'easy', core: false }),
  habit({ name: 'Invest in an ETF', category: 'Finance', difficulty: 'medium', core: false }),
];

export async function seedIfNeeded(db: MomentumDB): Promise<void> {
  const seeded = await db.meta.get('seeded');
  if (seeded) return;
  await db.transaction('rw', db.habits, db.meta, async () => {
    const already = await db.habits.count();
    if (already > 0) return;
    await db.habits.bulkAdd(DEFAULT_HABITS.map((h) => ({ ...h })));
    await db.meta.put({ key: 'seeded', value: '1' });
    await db.meta.put({ key: 'theme', value: 'career' });
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/db/seed.test.ts` — Expected: PASS (3).

- [ ] **Step 5: Run lint + typecheck**

- [ ] **Step 6: Commit**

```bash
git add src/db/index.ts src/db/seed.ts src/db/seed.test.ts
git commit -m "feat(db): add dexie schema and default seed"
```

---

### Task 9: Repos layer

**Files:**
- Create: `src/db/repos.ts`, `src/db/repos.test.ts`

**Interfaces:**
- Consumes: `MomentumDB`, engine types
- Produces: `Repos` object (exact shape below) and `createRepos(db: MomentumDB): Repos`.

```ts
export interface Repos {
  habits: {
    all(): Promise<Habit[]>;
    put(habit: Habit): Promise<void>;
    remove(id: string): Promise<void>;
  };
  quests: {
    forDate(date: string): Promise<DailyQuest[]>;
    all(): Promise<DailyQuest[]>;
    putMany(quests: DailyQuest[]): Promise<void>;
    complete(id: string, completionTime: string): Promise<void>;
  };
  xp: {
    all(): Promise<XPTransaction[]>;
    total(): Promise<number>;
    hasReason(reason: string): Promise<boolean>;
    put(txn: XPTransaction): Promise<void>;
  };
  streaks: {
    all(): Promise<Streak[]>;
    putMany(streaks: Streak[]): Promise<void>;
  };
  checkins: {
    forDate(date: string): Promise<DailyCheckIn | undefined>;
    put(checkIn: DailyCheckIn): Promise<void>;
  };
  recovery: {
    forDate(date: string): Promise<RecoveryQuest | undefined>;
    put(quest: RecoveryQuest): Promise<void>;
    complete(id: string, completionTime: string): Promise<void>;
  };
  unlocks: {
    all(): Promise<UnlockEvent[]>;
    put(event: UnlockEvent): Promise<void>;
  };
  meta: {
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
  };
}
```

- [ ] **Step 1: Write the failing tests**

```ts
// src/db/repos.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createDb } from './index';
import { createRepos } from './repos';
import { newId, type Habit } from '../engine';

const habit = (partial: Partial<Habit> = {}): Habit => ({
  id: newId(), name: 'Test', category: 'Custom', difficulty: 'easy', xp: 10,
  core: false, active: true, createdAt: new Date().toISOString(), ...partial,
});

describe('repos', () => {
  let db: ReturnType<typeof createDb>;
  let repos: ReturnType<typeof createRepos>;
  beforeEach(() => {
    db = createDb('test-repos');
    repos = createRepos(db);
  });

  it('persists and lists habits', async () => {
    const h = habit();
    await repos.habits.put(h);
    expect(await repos.habits.all()).toHaveLength(1);
  });

  it('queries quests by date', async () => {
    await repos.quests.putMany([{ id: newId(), habitId: 'h', date: '2026-08-05', core: true, completed: false, completionTime: null }]);
    const qs = await repos.quests.forDate('2026-08-05');
    expect(qs).toHaveLength(1);
    expect(await repos.quests.forDate('2026-08-06')).toHaveLength(0);
  });

  it('marks a quest complete idempotently', async () => {
    const id = newId();
    await repos.quests.putMany([{ id, habitId: 'h', date: '2026-08-05', core: true, completed: false, completionTime: null }]);
    await repos.quests.complete(id, '2026-08-05T20:00:00');
    await repos.quests.complete(id, '2026-08-05T21:00:00');
    const [q] = await repos.quests.forDate('2026-08-05');
    expect(q.completed).toBe(true);
    expect(q.completionTime).toBe('2026-08-05T20:00:00');
  });

  it('records xp transactions and reports totals', async () => {
    await repos.xp.put({ id: newId(), amount: 50, reason: 'quest', questId: null, stat: 'money', timestamp: '2026-08-05T20:00:00' });
    await repos.xp.put({ id: newId(), amount: 25, reason: 'quest', questId: null, stat: 'health', timestamp: '2026-08-05T20:01:00' });
    expect(await repos.xp.total()).toBe(75);
    expect(await repos.xp.hasReason('perfect_day:2026-08-05')).toBe(false);
    await repos.xp.put({ id: newId(), amount: 1, reason: 'perfect_day:2026-08-05', questId: null, stat: null, timestamp: '2026-08-05T20:02:00' });
    expect(await repos.xp.hasReason('perfect_day:2026-08-05')).toBe(true);
  });

  it('upserts streaks and check-ins by key', async () => {
    await repos.streaks.putMany([{ habitId: 'h', current: 3, best: 3, lastCompletionDate: '2026-08-05' }]);
    await repos.checkins.put({ id: newId(), date: '2026-08-05', mood: 4, energy: 4, cravings: false, notes: '', completed: true, recoveryQuestGenerated: false });
    const c = await repos.checkins.forDate('2026-08-05');
    expect(c?.mood).toBe(4);
  });

  it('records and lists unlock events', async () => {
    await repos.unlocks.put({ id: newId(), itemId: 'item_1', level: 1, unlockedAt: '2026-08-05T20:00:00' });
    expect(await repos.unlocks.all()).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/db/repos.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/db/repos.ts
import type { DailyCheckIn, DailyQuest, Habit, RecoveryQuest, Streak, UnlockEvent, XPTransaction } from '../engine';
import type { MomentumDB } from './index';

export interface Repos {
  habits: {
    all(): Promise<Habit[]>;
    put(habit: Habit): Promise<void>;
    remove(id: string): Promise<void>;
  };
  quests: {
    forDate(date: string): Promise<DailyQuest[]>;
    all(): Promise<DailyQuest[]>;
    putMany(quests: DailyQuest[]): Promise<void>;
    complete(id: string, completionTime: string): Promise<void>;
  };
  xp: {
    all(): Promise<XPTransaction[]>;
    total(): Promise<number>;
    hasReason(reason: string): Promise<boolean>;
    put(txn: XPTransaction): Promise<void>;
  };
  streaks: {
    all(): Promise<Streak[]>;
    putMany(streaks: Streak[]): Promise<void>;
  };
  checkins: {
    forDate(date: string): Promise<DailyCheckIn | undefined>;
    put(checkIn: DailyCheckIn): Promise<void>;
  };
  recovery: {
    forDate(date: string): Promise<RecoveryQuest | undefined>;
    put(quest: RecoveryQuest): Promise<void>;
    complete(id: string, completionTime: string): Promise<void>;
  };
  unlocks: {
    all(): Promise<UnlockEvent[]>;
    put(event: UnlockEvent): Promise<void>;
  };
  meta: {
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
  };
}

export function createRepos(db: MomentumDB): Repos {
  return {
    habits: {
      all: () => db.habits.toArray(),
      put: (h) => db.habits.put(h),
      remove: (id) => db.habits.delete(id),
    },
    quests: {
      forDate: (date) => db.quests.where('date').equals(date).toArray(),
      all: () => db.quests.toArray(),
      putMany: (qs) => db.quests.bulkPut(qs),
      complete: (id, completionTime) =>
        db.quests.where('id').equals(id).modify((q) => {
          if (!q.completed) {
            q.completed = true;
            q.completionTime = completionTime;
          }
        }),
    },
    xp: {
      all: () => db.xpTransactions.toArray(),
      total: async () => {
        const txns = await db.xpTransactions.toArray();
        return txns.reduce((sum, t) => sum + t.amount, 0);
      },
      hasReason: async (reason) => (await db.xpTransactions.where('reason').equals(reason).count()) > 0,
      put: (t) => db.xpTransactions.put(t),
    },
    streaks: {
      all: () => db.streaks.toArray(),
      putMany: (ss) => db.streaks.bulkPut(ss),
    },
    checkins: {
      forDate: (date) => db.checkins.where('date').equals(date).first(),
      put: (c) => db.checkins.put(c),
    },
    recovery: {
      forDate: (date) => db.recoveryQuests.where('date').equals(date).first(),
      put: (q) => db.recoveryQuests.put(q),
      complete: (id, completionTime) =>
        db.recoveryQuests.where('id').equals(id).modify((q) => {
          if (!q.completed) {
            q.completed = true;
            q.completionTime = completionTime;
          }
        }),
    },
    unlocks: {
      all: () => db.unlockEvents.toArray(),
      put: (e) => db.unlockEvents.put(e),
    },
    meta: {
      get: (key) => db.meta.get(key).then((row) => row?.value),
      set: (key, value) => db.meta.put({ key, value }),
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/db/repos.test.ts` — Expected: PASS (7).

- [ ] **Step 5: Run lint + typecheck**

- [ ] **Step 6: Commit**

```bash
git add src/db/repos.ts src/db/repos.test.ts
git commit -m "feat(db): add typed repos facade"
```

---

### Task 10: Game actions and Zustand store

**Files:**
- Create: `src/game/actions.ts`, `src/game/actions.test.ts`, `src/store/useGame.ts`
- Modify: `AGENTS.md` (architecture line — add the actions layer)

**Interfaces:**
- Consumes: `Repos`, engine (`generateQuests`, `computeStreaks`, `computeQuestXp`, `perfectDayBonus`, `levelForXp`, `newUnlocks`, `titleForLevel`, `statTotals`, `CAREER_THEME`, `closeDay`, `CheckInInput`, types), `todayStamp`
- Produces:
  - `getTheme(): CharacterTheme`
  - `ensureQuestsForDate(repos, date, theme): Promise<DailyQuest[]>` — generate if none exist
  - `completeQuest(repos, date, questId, theme): Promise<{ xpEarned; streakCurrent; unlocked: string[]; perfectDayBonus }>`
  - `closeDayAction(repos, date, input, theme): Promise<{ recoveryQuest: RecoveryQuest | null; perfectDayBonus; unlocked: string[] }>`
  - `getCharacterData(repos, theme): Promise<{ level; totalXp; title: string | null; stats: Record<string, number>; unlockedItems: Set<string> }>`
  - Zustand store `useGame` with `{ today, tab, checkInOpen, toast, setTab, openCheckIn, closeCheckIn, showToast, syncToday }`.

- [ ] **Step 1: Write the failing action tests**

```ts
// src/game/actions.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createDb } from '../db';
import { createRepos } from '../db/repos';
import { seedIfNeeded } from '../db/seed';
import { CAREER_THEME } from '../engine';
import { completeQuest, closeDayAction, ensureQuestsForDate, getCharacterData } from './actions';

describe('game actions', () => {
  let repos: ReturnType<typeof createRepos>;
  beforeEach(async () => {
    const db = createDb('test-actions');
    await seedIfNeeded(db);
    repos = createRepos(db);
  });

  it('generates quests for a date only once', async () => {
    const q1 = await ensureQuestsForDate(repos, '2026-08-05', CAREER_THEME);
    const q2 = await ensureQuestsForDate(repos, '2026-08-05', CAREER_THEME);
    expect(q1).toHaveLength(5);
    expect(q2).toHaveLength(5);
    expect(q1.map((x) => x.id).sort()).toEqual(q2.map((x) => x.id).sort());
  });

  it('completing a quest awards xp, updates streak, and can unlock an item', async () => {
    const quests = await ensureQuestsForDate(repos, '2026-08-05', CAREER_THEME);
    const core = quests.find((q) => q.core)!;
    const result = await completeQuest(repos, '2026-08-05', core.id, CAREER_THEME);
    expect(result.xpEarned).toBeGreaterThan(0);
    expect(result.streakCurrent).toBe(1);
    expect(result.perfectDayBonus).toBe(0);
    const data = await getCharacterData(repos, CAREER_THEME);
    expect(data.totalXp).toBe(result.xpEarned);
    expect(data.level).toBe(1);
  });

  it('closeDayAction awards perfect bonus when all quests are done', async () => {
    const quests = await ensureQuestsForDate(repos, '2026-08-05', CAREER_THEME);
    for (const q of quests) await completeQuest(repos, '2026-08-05', q.id, CAREER_THEME);
    const perfect = await closeDayAction(repos, '2026-08-05', { mood: 4, energy: 4, cravings: false, notes: '' }, CAREER_THEME);
    expect(perfect.recoveryQuest).toBeNull();
    expect(perfect.perfectDayBonus).toBeGreaterThan(0);
  });

  it('double-completing the same quest is idempotent', async () => {
    const quests = await ensureQuestsForDate(repos, '2026-08-05', CAREER_THEME);
    const core = quests.find((q) => q.core)!;
    const first = await completeQuest(repos, '2026-08-05', core.id, CAREER_THEME);
    const second = await completeQuest(repos, '2026-08-05', core.id, CAREER_THEME);
    expect(second.xpEarned).toBe(0);
    expect(first.xpEarned).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/actions.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/game/actions.ts
import type { Repos } from '../db/repos';
import {
  CAREER_THEME, closeDay, computeQuestXp, computeStreaks, generateQuests,
  levelForXp, newId, newUnlocks, perfectDayBonus, statTotals, titleForLevel,
  totalXp, type CharacterTheme, type CheckInInput, type DailyQuest,
  type RecoveryQuest,
} from '../engine';
import { todayStamp } from '../engine/dates';

export function getTheme(): CharacterTheme {
  return CAREER_THEME;
}

export async function ensureQuestsForDate(repos: Repos, date: string, theme: CharacterTheme): Promise<DailyQuest[]> {
  const existing = await repos.quests.forDate(date);
  if (existing.length > 0) return existing;
  const habits = await repos.habits.all();
  const { core, bonus } = generateQuests(date, habits);
  const all = [...core, ...bonus];
  if (all.length === 0) return [];
  await repos.quests.putMany(all);
  return all;
}

export async function completeQuest(
  repos: Repos, date: string, questId: string, theme: CharacterTheme,
): Promise<{ xpEarned: number; streakCurrent: number; unlocked: string[]; perfectDayBonus: number }> {
  const quest = (await repos.quests.forDate(date)).find((q) => q.id === questId);
  if (!quest || quest.completed) return { xpEarned: 0, streakCurrent: 0, unlocked: [], perfectDayBonus: 0 };
  const habits = await repos.habits.all();
  const habit = habits.find((h) => h.id === quest.habitId);
  if (!habit) return { xpEarned: 0, streakCurrent: 0, unlocked: [], perfectDayBonus: 0 };

  const completionTime = new Date().toISOString();
  await repos.quests.complete(questId, completionTime);

  const allQuests = await repos.quests.all();
  const streaks = computeStreaks(allQuests, todayStamp());
  const streak = streaks.get(habit.id) ?? { habitId: habit.id, current: 0, best: 0, lastCompletionDate: null };
  await repos.streaks.putMany([...streaks.values()]);

  const xpEarned = computeQuestXp(habit.xp, streak.current);
  await repos.xp.put({
    id: newId(), amount: xpEarned, reason: `quest:${habit.name}`,
    questId: quest.id, stat: theme.statMap[habit.category], timestamp: completionTime,
  });

  const dayQuests = await repos.quests.forDate(date);
  let perfectDayBonusXp = 0;
  if (dayQuests.every((q) => q.completed) && !(await repos.xp.hasReason(`perfect_day:${date}`))) {
    const baseSum = dayQuests.reduce((sum, q) => {
      const h = habits.find((x) => x.id === q.habitId);
      return sum + (h ? h.xp : 0);
    }, 0);
    perfectDayBonusXp = perfectDayBonus(baseSum);
    await repos.xp.put({ id: newId(), amount: perfectDayBonusXp, reason: `perfect_day:${date}`, questId: null, stat: null, timestamp: completionTime });
  }

  const txns = await repos.xp.all();
  const level = levelForXp(totalXp(txns));
  const existingUnlocks = new Set((await repos.unlocks.all()).map((e) => e.itemId));
  const unlocked: string[] = [];
  for (const item of newUnlocks(theme, level, existingUnlocks)) {
    unlocked.push(item.id);
    await repos.unlocks.put({ id: newId(), itemId: item.id, level, unlockedAt: completionTime });
  }

  return { xpEarned, streakCurrent: streak.current, unlocked, perfectDayBonus: perfectDayBonusXp };
}

export async function closeDayAction(
  repos: Repos, date: string, input: CheckInInput, theme: CharacterTheme,
): Promise<{ recoveryQuest: RecoveryQuest | null; perfectDayBonus: number; unlocked: string[] }> {
  const existing = await repos.checkins.forDate(date);
  if (existing?.completed) return { recoveryQuest: null, perfectDayBonus: 0, unlocked: [] };

  const quests = await repos.quests.forDate(date);
  const habits = await repos.habits.all();
  const dayQuestXp = quests.reduce((sum, q) => {
    const h = habits.find((x) => x.id === q.habitId);
    return sum + (h ? h.xp : 0);
  }, 0);
  const already = await repos.xp.hasReason(`perfect_day:${date}`);
  const { checkIn, recoveryQuest, perfectDayBonus } = closeDay({
    date, input, quests, theme, dayQuestXp, perfectDayAlreadyAwarded: already,
  });
  await repos.checkins.put(checkIn);
  if (recoveryQuest) await repos.recovery.put(recoveryQuest);

  const txns = await repos.xp.all();
  const level = levelForXp(totalXp(txns));
  const existingUnlocks = new Set((await repos.unlocks.all()).map((e) => e.itemId));
  const unlocked: string[] = [];
  const time = new Date().toISOString();
  for (const item of newUnlocks(theme, level, existingUnlocks)) {
    unlocked.push(item.id);
    await repos.unlocks.put({ id: newId(), itemId: item.id, level, unlockedAt: time });
  }

  return { recoveryQuest, perfectDayBonus, unlocked };
}

export async function getCharacterData(repos: Repos, theme: CharacterTheme) {
  const txns = await repos.xp.all();
  const total = totalXp(txns);
  const level = levelForXp(total);
  const unlockedItems = new Set((await repos.unlocks.all()).map((e) => e.itemId));
  return {
    level,
    totalXp: total,
    title: titleForLevel(theme, level),
    stats: statTotals(txns, theme),
    unlockedItems,
  };
}
```

```ts
// src/store/useGame.ts
import { create } from 'zustand';
import { todayStamp } from '../engine/dates';

export type Tab = 'today' | 'week' | 'character' | 'habits';

interface GameState {
  today: string;
  tab: Tab;
  checkInOpen: boolean;
  toast: string | null;
  setTab(tab: Tab): void;
  openCheckIn(): void;
  closeCheckIn(): void;
  showToast(message: string | null): void;
  syncToday(): void;
}

export const useGame = create<GameState>((set) => ({
  today: todayStamp(),
  tab: 'today',
  checkInOpen: false,
  toast: null,
  setTab: (tab) => set({ tab }),
  openCheckIn: () => set({ checkInOpen: true }),
  closeCheckIn: () => set({ checkInOpen: false }),
  showToast: (message) => set({ toast: message }),
  syncToday: () => {
    const t = todayStamp();
    set((s) => (s.today === t ? s : { today: t }));
  },
}));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/game/actions.test.ts` — Expected: PASS (4). (Note: in test 2 the single core quest award is 50 XP for a hard habit; no unlock occurs at level 1. In test 3, each `completeQuest` call triggers the perfect-day path once all 5 quests are done — the guard on `hasReason` keeps it to a single bonus transaction.)

- [ ] **Step 5: Update AGENTS.md architecture line**

Change: `Follow the layering flow: \`UI → store (Zustand) → repos (Dexie)\`.` to `Follow the layering flow: \`UI → store (Zustand) → game actions (src/game) → repos (Dexie)\`.`.

- [ ] **Step 6: Run lint + typecheck + full test suite**

Run: `npm run lint && npm run typecheck && npm test` — Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/game/actions.ts src/game/actions.test.ts src/store/useGame.ts AGENTS.md
git commit -m "feat(game): add orchestration actions and store"
```

---

### Task 11: App shell, tab bar, context, and Today screen

**Files:**
- Create: `src/ui/context.tsx`, `src/ui/components/TabBar.tsx`, `src/ui/components/XPBar.tsx`, `src/ui/components/StreakFlame.tsx`, `src/ui/components/QuestCard.tsx`, `src/ui/TodayScreen.tsx`
- Modify: `src/App.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `useGame`, `ensureQuestsForDate`, `completeQuest`, `getTheme`, `Repos`
- Produces:
  - `GameProvider` context providing `{ repos: Repos; theme: CharacterTheme; ready: boolean }` + `useGameContext()`
  - `<TabBar/>` — 4 tabs driven by `useGame`
  - `<XPBar progress={number} label?: string/>`
  - `<StreakFlame count={number}/>`
  - `<QuestCard quest, habit, streak, disabled?, onComplete/>`
  - `<TodayScreen/>` — today's quests, XP header, streak flames, check-in CTA

- [ ] **Step 1: Write the failing App test**

```tsx
// src/App.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('seeds and shows the Today screen with quests', async () => {
    render(<App dbName="test-app" />);
    await waitFor(() => expect(screen.getByText(/Quest for today/i)).toBeTruthy());
    expect(screen.getByText('Momentum')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Today/i })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.test.tsx` — Expected: FAIL (App renders static Momentum only).

- [ ] **Step 3: Write context, shell, and Today screen**

```tsx
// src/ui/context.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createDb, type MomentumDB } from '../db';
import { seedIfNeeded } from '../db/seed';
import { createRepos, type Repos } from '../db/repos';
import { type CharacterTheme } from '../engine';
import { getTheme } from '../game/actions';

interface GameContextValue {
  repos: Repos;
  theme: CharacterTheme;
  ready: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children, dbName }: { children: ReactNode; dbName?: string }) {
  const [value, setValue] = useState<GameContextValue | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db: MomentumDB = createDb(dbName ?? 'momentum');
      await seedIfNeeded(db);
      const repos = createRepos(db);
      const theme = getTheme();
      if (!cancelled) setValue({ repos, theme, ready: true });
    })();
    return () => { cancelled = true; };
  }, [dbName]);

  if (!value) return <main><h1>Momentum</h1><p>Loading…</p></main>;
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext outside GameProvider');
  return ctx;
}
```

```tsx
// src/ui/components/TabBar.tsx
import { useGame, type Tab } from '../../store/useGame';

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'character', label: 'Character' },
  { id: 'habits', label: 'Habits' },
];

export function TabBar() {
  const { tab, setTab } = useGame();
  return (
    <nav role="tablist" style={{ display: 'flex', gap: 4 }}>
      {TABS.map((t) => (
        <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} style={{ flex: 1 }}>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
```

```tsx
// src/ui/components/XPBar.tsx
export function XPBar({ progress, label }: { progress: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
  return (
    <div role="progressbar" aria-valuenow={pct} aria-label={label} style={{ height: 14, border: '2px solid var(--gold)', background: '#000' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--gold)' }} />
    </div>
  );
}
```

```tsx
// src/ui/components/StreakFlame.tsx
export function StreakFlame({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span aria-label={`streak ${count}`}>🔥 {count}</span>;
}
```

```tsx
// src/ui/components/QuestCard.tsx
import { StreakFlame } from './StreakFlame';
import type { DailyQuest, Habit } from '../../engine';

interface Props {
  quest: DailyQuest;
  habit: Habit;
  streak: number;
  disabled?: boolean;
  onComplete(): Promise<void>;
}

export function QuestCard({ quest, habit, streak, disabled, onComplete }: Props) {
  return (
    <article data-testid={`quest-${quest.id}`} style={{ border: '2px solid var(--panel)', padding: 12, marginBottom: 8, background: 'var(--panel)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong>{habit.name}</strong>
        <StreakFlame count={streak} />
      </header>
      <p style={{ color: 'var(--muted)' }}>{habit.category} · {habit.xp} XP</p>
      {quest.completed ? (
        <span style={{ color: 'var(--accent)' }}>✓ Completed</span>
      ) : (
        <button onClick={onComplete} disabled={disabled}>Complete +{habit.xp} XP</button>
      )}
    </article>
  );
}
```

```tsx
// src/ui/TodayScreen.tsx
import { useEffect, useState } from 'react';
import { useGameContext } from './context';
import { ensureQuestsForDate, completeQuest } from '../game/actions';
import { computeStreaks, totalXp } from '../engine';
import { todayStamp } from '../engine/dates';
import { useGame } from '../store/useGame';
import { QuestCard } from './components/QuestCard';
import { CheckInModal } from './components/CheckInModal';
import type { DailyQuest, Habit } from '../engine';

export function TodayScreen() {
  const { repos, theme } = useGameContext();
  const { today, checkInOpen, openCheckIn } = useGame();
  const [quests, setQuests] = useState<DailyQuest[] | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [streaks, setStreaks] = useState<Map<string, { current: number }>>(new Map());
  const [dayXp, setDayXp] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dayQuests = await ensureQuestsForDate(repos, today, theme);
      const all = await repos.habits.all();
      const allQuests = await repos.quests.all();
      const txns = await repos.xp.all();
      if (cancelled) return;
      setQuests(dayQuests);
      setHabits(all);
      setStreaks(computeStreaks(allQuests, today));
      const dayQuestIds = new Set(dayQuests.map((q) => q.id));
      setDayXp(totalXp(txns.filter((t) => t.questId && dayQuestIds.has(t.questId))));
    })();
    return () => { cancelled = true; };
  }, [repos, today, theme]);

  if (!quests) return <p>Loading quests…</p>;
  const core = quests.filter((q) => q.core);
  const bonus = quests.filter((q) => !q.core);
  const hasCheckIn = false; // set from repos.checkins later in Task 12

  return (
    <section>
      <h2>Quest for today</h2>
      <p>XP earned today: {dayXp}</p>
      {core.length === 0 && bonus.length === 0 && <p>No active habits — add some in Habits.</p>}
      {[...core, ...bonus].map((q) => {
        const habit = habits.find((h) => h.id === q.habitId);
        if (!habit) return null;
        return (
          <QuestCard
            key={q.id}
            quest={q}
            habit={habit}
            streak={streaks.get(habit.id)?.current ?? 0}
            onComplete={async () => {
              await completeQuest(repos, today, q.id, theme);
              const allQuests = await repos.quests.all();
              setStreaks(computeStreaks(allQuests, today));
              setQuests(await repos.quests.forDate(today));
              setDayXp((x) => x);
            }}
          />
        );
      })}
      {checkInOpen && <CheckInModal quests={quests} onClose={() => {}} />}
      <button onClick={openCheckIn}>Evening Check-In</button>
    </section>
  );
}
```

```tsx
// src/App.tsx
import { useEffect } from 'react';
import { GameProvider } from './ui/context';
import { TabBar } from './ui/components/TabBar';
import { TodayScreen } from './ui/TodayScreen';
import { useGame } from './store/useGame';

function Shell() {
  const { tab, syncToday } = useGame();
  useEffect(() => {
    const timer = setInterval(syncToday, 60_000);
    document.addEventListener('visibilitychange', syncToday);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', syncToday);
    };
  }, [syncToday]);

  return (
    <main>
      <h1>Momentum</h1>
      {tab === 'today' && <TodayScreen />}
      <TabBar />
    </main>
  );
}

export default function App({ dbName }: { dbName?: string }) {
  return (
    <GameProvider dbName={dbName}>
      <Shell />
    </GameProvider>
  );
}
```

(Note: `CheckInModal` ships in Task 12; until then it doesn't exist, so either create a stub export in Task 11 or move the modal mount to Task 12. Recommended: skip the modal mount in Task 11 and add it in Task 12.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/App.test.tsx` — Expected: PASS.

- [ ] **Step 5: Run lint + typecheck + full suite**

Run: `npm run lint && npm run typecheck && npm test` — Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/ui src/App.tsx src/App.test.tsx
git commit -m "feat(ui): add shell tabs and today quests"
```

---

### Task 12: Check-in flow UI

**Files:**
- Create: `src/ui/components/CheckInModal.tsx`, `src/ui/CheckInFlow.test.tsx`
- Modify: `src/ui/TodayScreen.tsx` (mount the modal; read today's check-in status to gate the CTA)

**Interfaces:**
- Consumes: `useGame` (`checkInOpen`, `closeCheckIn`, `showToast`), `useGameContext`, `closeDayAction`, `CheckInInput`, `DailyQuest`
- Produces: `<CheckInModal quests onClose/>` — 3-step form (mood/energy/cravings + note → review missed → Close the day), reports recovery quest when generated, records check-in, refreshes Today

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/CheckInFlow.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('CheckInModal', () => {
  it('closes the day and reports a recovery quest when a core quest was missed', async () => {
    render(<App dbName="test-checkin" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Evening Check-In/i })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: /Evening Check-In/i }));
    await userEvent.click(screen.getByRole('button', { name: /Next/i }));
    await userEvent.click(screen.getByRole('button', { name: /Close the day/i }));
    await waitFor(() => expect(screen.getByText(/Recovery quest/i)).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/CheckInFlow.test.tsx` — Expected: FAIL (no modal).

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/ui/components/CheckInModal.tsx
import { useState } from 'react';
import { useGame } from '../../store/useGame';
import { useGameContext } from '../context';
import { closeDayAction } from '../../game/actions';
import { todayStamp } from '../../engine/dates';
import type { DailyQuest } from '../../engine';

export function CheckInModal({ quests, onClose }: { quests: DailyQuest[]; onClose(): void }) {
  const { showToast } = useGame();
  const { repos, theme } = useGameContext();
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [cravings, setCravings] = useState(false);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const missed = quests.filter((q) => q.core && !q.completed).length;

  async function closeDay() {
    const r = await closeDayAction(repos, todayStamp(), { mood, energy, cravings, notes }, theme);
    setResult(r.recoveryQuest ? `Recovery quest: ${r.recoveryQuest.title}` : 'Day closed. No recovery quest needed.');
    if (r.perfectDayBonus > 0) showToast(`Perfect day! +${r.perfectDayBonus} XP`);
  }

  return (
    <div role="dialog" aria-label="Evening check-in" style={{ border: '2px solid var(--accent)', padding: 16, background: 'var(--bg)' }}>
      {step === 1 && (
        <section>
          <h3>How was today?</h3>
          <label>Mood: <input type="number" min={1} max={5} value={mood} onChange={(e) => setMood(Number(e.target.value))} /></label>
          <label>Energy: <input type="number" min={1} max={5} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} /></label>
          <label><input type="checkbox" checked={cravings} onChange={(e) => setCravings(e.target.checked)} /> Cravings</label>
          <label>Notes: <textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          <button onClick={() => setStep(2)}>Next</button>
        </section>
      )}
      {step === 2 && (
        <section>
          <h3>Review</h3>
          <p>{missed > 0 ? `${missed} core quest(s) missed.` : 'All core quests done.'}</p>
          <button onClick={closeDay}>Close the day</button>
          <button onClick={() => setStep(1)}>Back</button>
        </section>
      )}
      {result && (
        <section>
          <p>Check-in saved.</p>
          <p>{result}</p>
          <button onClick={onClose}>Done</button>
        </section>
      )}
    </div>
  );
}
```

In `TodayScreen.tsx`: mount `{checkInOpen && <CheckInModal quests={quests} onClose={closeCheckIn} />}`; gate the CTA when today's check-in already exists by loading `repos.checkins.forDate(today)` in the effect and showing "Day closed ✓" instead of the button. Re-run `ensureQuestsForDate` for tomorrow after closing so the next day's quests exist.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/CheckInFlow.test.tsx` — Expected: PASS.

- [ ] **Step 5: Run lint + typecheck + full suite**

- [ ] **Step 6: Commit**

```bash
git add src/ui/components/CheckInModal.tsx src/ui/CheckInFlow.test.tsx src/ui/TodayScreen.tsx
git commit -m "feat(ui): add evening check-in flow"
```

---

### Task 13: Character screen with pixel character

**Files:**
- Create: `src/ui/components/CharacterView.tsx`, `src/ui/CharacterScreen.tsx`, `src/ui/CharacterScreen.test.tsx`
- Modify: `src/App.tsx` (wire `character` tab)

**Interfaces:**
- Consumes: `getCharacterData`, `useGameContext`, `CAREER_THEME`, `XPBar`, `xpToNextLevel`
- Produces: `<CharacterView theme, level, title, stats, unlockedItems/>` — pixel character (div-grid sprite), earned item icons, three stat bars; `<CharacterScreen/>` loads data and renders

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/CharacterScreen.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';
import { useGame } from '../store/useGame';

describe('CharacterScreen', () => {
  it('shows level, stats, and equipped item slots', async () => {
    render(<App dbName="test-char" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Character/i })).toBeTruthy());
    useGame.getState().setTab('character');
    await waitFor(() => expect(screen.getByText(/Level 1/i)).toBeTruthy());
    expect(screen.getByText('Money')).toBeTruthy();
    expect(screen.getByText('Health')).toBeTruthy();
    expect(screen.getByText('Mind')).toBeTruthy();
    expect(screen.getByText('Worn clothes')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/CharacterScreen.test.tsx` — Expected: FAIL (no Character tab content).

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/ui/components/CharacterView.tsx
import { XPBar } from './XPBar';
import type { CharacterTheme } from '../../engine';

const SPRITE = [
  '...H.....H...',
  '...H.....H...',
  '...HHHHHHH...',
  '...HHHHHHH...',
  '....HHHHH....',
  '.....HHH.....',
  '.....HHH.....',
  '....HHHHH....',
  '....HHHHH....',
  '...HHHHHHH...',
  '...H.....H...',
  '...H.....H...',
  '...H.....H...',
];

interface Props {
  theme: CharacterTheme;
  level: number;
  title: string | null;
  stats: Record<string, number>;
  unlockedItems: Set<string>;
}

export function CharacterView({ theme, level, title, stats, unlockedItems }: Props) {
  const maxStat = Math.max(1, ...Object.values(stats));
  return (
    <section>
      <h2>Level {level}{title ? ` · ${title}` : ''}</h2>
      <div role="img" aria-label="Career man" style={{ imageRendering: 'pixelated', fontSize: 0 }}>
        {SPRITE.map((row, r) => (
          <div key={r} style={{ display: 'flex' }}>
            {row.split('').map((px, c) => (
              <span key={c} style={{ width: 8, height: 8, background: px === 'H' ? '#7ed957' : 'transparent', display: 'inline-block' }} />
            ))}
          </div>
        ))}
      </div>
      {theme.stats.map((s) => (
        <div key={s.key}>
          <span>{s.label}: {stats[s.key]}</span>
          <XPBar progress={(stats[s.key] ?? 0) / maxStat} label={s.label} />
        </div>
      ))}
      <h3>Gear</h3>
      <ul>
        {theme.items.map((item) => (
          <li key={item.id} data-unlocked={unlockedItems.has(item.id)}>
            {item.icon} {item.name}{unlockedItems.has(item.id) ? '' : ' 🔒'}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
// src/ui/CharacterScreen.tsx
import { useEffect, useState } from 'react';
import { useGameContext } from './context';
import { getCharacterData } from '../game/actions';
import { CharacterView } from './components/CharacterView';
import { xpToNextLevel } from '../engine';
import { XPBar } from './components/XPBar';

export function CharacterScreen() {
  const { repos, theme } = useGameContext();
  const [data, setData] = useState<Awaited<ReturnType<typeof getCharacterData>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const d = await getCharacterData(repos, theme);
      if (!cancelled) setData(d);
    })();
    return () => { cancelled = true; };
  }, [repos, theme]);

  if (!data) return <p>Loading…</p>;
  const prog = xpToNextLevel(data.totalXp);
  return (
    <section>
      <CharacterView theme={theme} level={data.level} title={data.title} stats={data.stats} unlockedItems={data.unlockedItems} />
      <XPBar progress={prog.progress} label="XP to next level" />
      <p>Total XP: {data.totalXp} · Next level at {prog.next}</p>
    </section>
  );
}
```

Wire `{tab === 'character' && <CharacterScreen />}` in `App.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/CharacterScreen.test.tsx` — Expected: PASS.

- [ ] **Step 5: Run lint + typecheck + full suite**

- [ ] **Step 6: Commit**

```bash
git add src/ui/components/CharacterView.tsx src/ui/CharacterScreen.tsx src/ui/CharacterScreen.test.tsx src/App.tsx
git commit -m "feat(ui): add character screen with pixel avatar"
```

---

### Task 14: Week screen

**Files:**
- Create: `src/ui/WeekScreen.tsx`, `src/ui/WeekScreen.test.tsx`
- Modify: `src/App.tsx` (wire `week` tab)

**Interfaces:**
- Consumes: `useGameContext`, `weekStart`, `lastNDays`, `ensureQuestsForDate` (generates past days lazily so the week always has data), `DailyQuest`, `DailyCheckIn`
- Produces: `<WeekScreen/>` — Mon-Sun calendar; per-day chip shows done/missed/open; weekly completion %; tapping a day lists its quests and lets you complete retroactively

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/WeekScreen.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';
import { useGame } from '../store/useGame';

describe('WeekScreen', () => {
  it('shows seven day columns and a completion percentage', async () => {
    render(<App dbName="test-week" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Week/i })).toBeTruthy());
    useGame.getState().setTab('week');
    await waitFor(() => expect(screen.getByText(/Completion/i)).toBeTruthy());
    for (const dow of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
      expect(screen.getByText(dow)).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/WeekScreen.test.tsx` — Expected: FAIL (no Week tab content).

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/ui/WeekScreen.tsx
import { useEffect, useMemo, useState } from 'react';
import { useGameContext } from './context';
import { useGame } from '../store/useGame';
import { ensureQuestsForDate, completeQuest } from '../game/actions';
import { weekStart, lastNDays } from '../engine/dates';
import type { DailyCheckIn, DailyQuest } from '../engine';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekScreen() {
  const { repos, theme } = useGameContext();
  const { today } = useGame();
  const [days, setDays] = useState<Record<string, DailyQuest[]>>({});
  const [checkIns, setCheckIns] = useState<Record<string, DailyCheckIn>>({});

  const start = useMemo(() => weekStart(today), [today]);
  const stamps = useMemo(() => lastNDays(start, 7), [start]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const byDay: Record<string, DailyQuest[]> = {};
      const cis: Record<string, DailyCheckIn> = {};
      for (const stamp of stamps) {
        byDay[stamp] = await ensureQuestsForDate(repos, stamp, theme);
        const c = await repos.checkins.forDate(stamp);
        if (c) cis[stamp] = c;
      }
      if (cancelled) return;
      setDays(byDay);
      setCheckIns(cis);
    })();
    return () => { cancelled = true; };
  }, [repos, stamps, theme]);

  const completed = stamps.filter((s) => {
    const qs = days[s] ?? [];
    return qs.length > 0 && qs.every((q) => q.completed);
  }).length;
  const pct = Math.round((completed / 7) * 100);

  return (
    <section>
      <h2>Week</h2>
      <p>Completion: {pct}%</p>
      <div style={{ display: 'flex', gap: 4 }}>
        {stamps.map((stamp, i) => {
          const qs = days[stamp] ?? [];
          const done = qs.filter((q) => q.completed).length;
          const closed = !!checkIns[stamp];
          const state = closed ? '✓' : qs.length > 0 && done === qs.length ? '★' : '○';
          return (
            <div key={stamp} title={stamp} style={{ flex: 1, border: '1px solid var(--muted)', padding: 4 }}>
              <span>{DOW[i]}</span>
              <div>{done}/{qs.length}</div>
              <span>{state}</span>
            </div>
          );
        })}
      </div>
      {stamps.map((stamp) => (
        <details key={stamp}>
          <summary>{stamp}</summary>
          {(days[stamp] ?? []).map((q) => (
            <p key={q.id}>
              {q.core ? '[C] ' : '[B] '}
              {q.completed ? '✓' : <button onClick={() => completeQuest(repos, stamp, q.id, theme)}>Complete</button>}
            </p>
          ))}
        </details>
      ))}
    </section>
  );
}
```

Wire `{tab === 'week' && <WeekScreen />}` in `App.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/WeekScreen.test.tsx` — Expected: PASS.

- [ ] **Step 5: Run lint + typecheck + full suite**

- [ ] **Step 6: Commit**

```bash
git add src/ui/WeekScreen.tsx src/ui/WeekScreen.test.tsx src/App.tsx
git commit -m "feat(ui): add week calendar screen"
```

---

### Task 15: Habits screen (builder)

**Files:**
- Create: `src/ui/HabitsScreen.tsx`, `src/ui/HabitsScreen.test.tsx`
- Modify: `src/App.tsx` (wire `habits` tab)

**Interfaces:**
- Consumes: `useGameContext`, `Repos`, engine types (`Habit`, `Difficulty`, `CATEGORIES`, `newId`, `xpForDifficulty`)
- Produces: `<HabitsScreen/>` — list habits with active toggle + delete; inline create/edit form (name, category, difficulty, core/bonus, live XP preview); saving writes the habit

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/HabitsScreen.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import App from '../App';
import { useGame } from '../store/useGame';

describe('HabitsScreen', () => {
  it('creates a new habit and shows it in the list', async () => {
    render(<App dbName="test-habits" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Habits/i })).toBeTruthy());
    useGame.getState().setTab('habits');
    await waitFor(() => expect(screen.getByText('No smoking')).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: /New habit/i }));
    await userEvent.type(screen.getByLabelText(/Name/i), 'Push-ups');
    await userEvent.click(screen.getByRole('button', { name: /Save/i }));
    await waitFor(() => expect(screen.getByText('Push-ups')).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/HabitsScreen.test.tsx` — Expected: FAIL (no Habits tab content).

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/ui/HabitsScreen.tsx
import { useEffect, useState } from 'react';
import { useGameContext } from './context';
import { CATEGORIES, newId, xpForDifficulty, type Difficulty, type Habit } from '../engine';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'epic'];

export function HabitsScreen() {
  const { repos } = useGameContext();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [editing, setEditing] = useState<Partial<Habit> | null>(null);

  async function refresh() {
    setHabits(await repos.habits.all());
  }

  useEffect(() => { refresh(); }, [repos]);

  async function save() {
    if (!editing || !editing.name?.trim()) return;
    const difficulty = (editing.difficulty ?? 'easy') as Difficulty;
    const habit: Habit = {
      id: editing.id ?? newId(),
      name: editing.name.trim(),
      category: editing.category ?? 'Custom',
      difficulty,
      xp: xpForDifficulty(difficulty),
      core: editing.core ?? false,
      active: editing.active ?? true,
      createdAt: editing.createdAt ?? new Date().toISOString(),
    };
    await repos.habits.put(habit);
    setEditing(null);
    await refresh();
  }

  return (
    <section>
      <h2>Habits</h2>
      <button onClick={() => setEditing({ core: false, active: true, difficulty: 'easy', category: 'Custom' })}>New habit</button>
      {editing && (
        <form data-testid="habit-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <label>Name: <input aria-label="Name" value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
          <label>Category:
            <select aria-label="Category" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as Habit['category'] })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>Difficulty:
            <select aria-label="Difficulty" value={editing.difficulty} onChange={(e) => setEditing({ ...editing, difficulty: e.target.value as Difficulty })}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d} ({xpForDifficulty(d)} XP)</option>)}
            </select>
          </label>
          <label><input type="checkbox" checked={!!editing.core} onChange={(e) => setEditing({ ...editing, core: e.target.checked })} /> Core quest</label>
          <button type="submit">Save</button>
          <button type="button" onClick={() => setEditing(null)}>Cancel</button>
        </form>
      )}
      <ul>
        {habits.map((h) => (
          <li key={h.id}>
            <strong>{h.name}</strong> · {h.category} · {h.xp} XP {h.core ? '[Core]' : '[Bonus]'}
            <button aria-label={`Toggle ${h.name}`} onClick={async () => { await repos.habits.put({ ...h, active: !h.active }); await refresh(); }}>
              {h.active ? 'Pause' : 'Activate'}
            </button>
            <button aria-label={`Edit ${h.name}`} onClick={() => setEditing(h)}>Edit</button>
            <button aria-label={`Delete ${h.name}`} onClick={async () => { await repos.habits.remove(h.id); await refresh(); }}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

Wire `{tab === 'habits' && <HabitsScreen />}` in `App.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/HabitsScreen.test.tsx` — Expected: PASS.

- [ ] **Step 5: Run lint + typecheck + full suite**

- [ ] **Step 6: Commit**

```bash
git add src/ui/HabitsScreen.tsx src/ui/HabitsScreen.test.tsx src/App.tsx
git commit -m "feat(ui): add habits builder screen"
```

---

### Task 16: Toast, polish, docs, and release verification

**Files:**
- Create: `src/ui/components/Toast.tsx`, `src/ui/Toast.test.tsx`, `README.md`, `CHANGELOG.md`
- Modify: `src/App.tsx` (mount `<Toast/>`), `src/ui/theme.css` (tab bar + pixel border polish)

**Interfaces:**
- Consumes: `useGame` (`toast`, `showToast`)
- Produces: `<Toast/>` — dismissible message; `README.md`; `CHANGELOG.md` with `[0.1.0] - 2026-08-05`

- [ ] **Step 1: Write the failing toast test**

```tsx
// src/ui/Toast.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Toast } from './components/Toast';
import { useGame } from '../store/useGame';

describe('Toast', () => {
  it('shows the current toast message', () => {
    useGame.getState().showToast('Perfect day! +25 XP');
    render(<Toast />);
    expect(screen.getByText('Perfect day! +25 XP')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/Toast.test.tsx` — Expected: FAIL (no Toast module).

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/ui/components/Toast.tsx
import { useGame } from '../../store/useGame';

export function Toast() {
  const { toast, showToast } = useGame();
  if (!toast) return null;
  return (
    <div role="status" style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', border: '2px solid var(--accent)', padding: 8, background: 'var(--bg)' }}>
      {toast}
      <button aria-label="Dismiss toast" onClick={() => showToast(null)}>×</button>
    </div>
  );
}
```

Mount `<Toast />` in `App.tsx`.

- [ ] **Step 4: Write README and CHANGELOG**

`README.md`: project name, one-line description, prerequisites (Node 18+), `npm install`, `npm run dev`, `npm run build` + `npm run preview`, `npm test | lint | typecheck`, install-as-PWA note (Chrome mobile → Add to Home Screen), data-locality note (all data in IndexedDB, private, offline).

`CHANGELOG.md`:
```markdown
# Changelog

All notable changes to this project are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-05

### Added
- POC app shell: mobile-first PWA (Vite + React + TS), installable, offline.
- Habit Builder with create/edit/activate/delete and XP preview.
- Rule-based Daily Quest Generator (up to 3 core + 2 bonus, rotating).
- XP Engine (difficulty base XP, streak multiplier, perfect-day bonus, levels).
- Streak Engine (independent per-habit daily streaks).
- Manual Evening Check-In (mood/energy/cravings/notes) with day closure.
- Recovery Quest generation when a core quest is missed.
- Character screen: pixel career man, level-based item unlocks, Money/Health/Mind flavor stats.
- Week calendar with completion percentage and retroactive completion.
- Local-only storage (Dexie/IndexedDB); no account, fully offline.
```

- [ ] **Step 5: Run the full verification battery**

Run: `npm run lint && npm run typecheck && npm test && npm run build` — Expected: all pass, `dist/` built with PWA manifest and service worker.

- [ ] **Step 6: Manual PWA smoke check** (documented in commit body)

Run: `npm run dev` and open on a phone via LAN or localhost — Today generates quests, completing awards XP, Character shows level/stats, Check-In closes a day and spawns a recovery quest when core quests are missed. Note any issues as follow-up fixes; do not skip verification claims.

- [ ] **Step 7: Commit**

```bash
git add src/ui/components/Toast.tsx src/ui/Toast.test.tsx src/App.tsx src/ui/theme.css README.md CHANGELOG.md
git commit -m "docs: add readme changelog and toast polish"
```

---

## Self-Review

**Spec coverage check:**
- Habit Builder → Task 15 ✅
- Daily Quest Generator → Tasks 3, 10 ✅
- XP Engine (difficulty, perfect day, streak multiplier, levels) → Task 4, wired in Task 10 ✅
- Streak Engine → Task 5, wired in Tasks 10/11 ✅
- Dashboard Today → Task 11; Week → Task 14; Character (absorbs Stats) → Task 13 ✅
- Recovery Quest → Task 7 (engine) + Task 10 (action) + Task 12 (UI) ✅
- Daily Check-in → Tasks 7, 12 ✅
- RPG character, level-based item unlocks, Money/Health/Mind stats → Tasks 4, 6, 13 ✅
- Theme as data → Task 6 ✅
- Day flip / never auto-punish → Task 11 (store `syncToday` + open previous days) ✅
- Offline/PWA → Tasks 1, 16 ✅
- Versioning/CHANGELOG/README → Task 16 ✅
- AGENTS.md rules (TDD, layering, idempotency) → enforced per task ✅

**Placeholder scan:** all steps carry real code and commands; no TBD/TODO/"similar to". ✅

**Type consistency:** `computeStreaks` returns `Map<string, Streak>`; consumed as such in Tasks 10/11. `closeDay` takes `dayQuestXp`; `closeDayAction` passes it in Task 10. `newUnlocks`/`levelForXp`/`titleForLevel`/`statTotals` signatures match Task 4 and are used identically in Tasks 10/13. `Repos` shape used in Task 10 matches Task 9. Zustand `useGame` state names (`tab`, `today`, `checkInOpen`, `toast`) are consistent across Tasks 10-16. ✅
