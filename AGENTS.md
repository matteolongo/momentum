# AGENTS.md

Rules for working in this repo. OpenCode reads this on session start. Follow
it — it overrides default behavior where noted.

## Project

Momentum: a mobile-first gamified habit tracker PWA. React + Vite +
TypeScript, local-only Dexie (IndexedDB), pure game engine, retro-pixel career-
man character with level-based unlocks and Money/Health/Mind flavor stats.

Design spec: `docs/superpowers/specs/2026-08-05-momentum-poc-design.md`.

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build + PWA assets
- `npm run preview` — serve the build locally
- `npm run test` — Vitest (engine unit tests are the backbone)
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`

Run **lint and typecheck after every change**, before claiming anything done.
Evidence before assertions: only report a command as passing after it ran.

## Architecture rules

Follow the layering flow: `UI → store (Zustand) → repos (Dexie)`. The engine
is the exception and the crown jewel:

- `src/engine/*` is **pure TypeScript**. No imports from UI, store, or db.
  Plain objects in, plain objects out. Game logic lives here so it is unit-
  testable in isolation.
- Character themes are **data, not code**: a theme object + art. Never
  hardcode theme-specific logic into the engine.
- Dates are local-timezone `YYYY-MM-DD` day stamps. No UTC rollover tricks.
- Generators and mutations are idempotent (no double-complete, no double
  check-in, no duplicate quest generation).

## Development practices

- **TDD for the engine.** Write the failing test first (Vitest), then the
  minimal implementation. Engine tests are the safety net for all game rules.
- **Never auto-punish the user.** Missed days are left open, streaks break
  only their own habit. The core principle is returning to control, not
  perfection.
- Follow existing patterns and code style in the file you're editing. Match
  the naming and structure around you.
- Do **not** add comments unless the code genuinely needs them; prefer
  self-documenting names. No dead code, no speculative features (YAGNI).
- Keep units small and single-purpose. A file that's grown too large is a
  signal to split, not to add more to it.

## Git workflow

- **Isolation:** feature work happens in a branch or worktree, never directly
  on `main` once the project has real code. Use `git worktree` for work that
  needs a clean tree.
- **Commit style:** Conventional Commits, imperative subject, ≤50 chars.
  `feat | fix | refactor | perf | docs | test | chore | build | ci | style`.
  Body only when the *why* isn't obvious (breaking changes, migrations,
  reverts always get a body). No AI attribution.
- **Scope** commits to one concern. Stage only intended files — never
  secrets, never build output, never `node_modules`.
- **Review before commit:** read your own diff (`git diff --cached`) before
  committing. Catch leftovers, debug logs, accidental deletions.
- Only commit/push/PR when the user asks, unless the repo convention says
  otherwise.

## Versioning & change documentation

- App version follows **SemVer** (`package.json` `version`, git tags `vX.Y.Z`).
  Breaking data-model changes bump major; new features minor; fixes patch.
- Keep a **CHANGELOG.md** (Keep a Changelog format). Every user-visible
  change gets an entry in the next unreleased version section. The commit
  that changes behavior also updates the changelog.
- PWA updates: bump the app version and rebuild on releases so the service
  worker pushes the new shell to installed clients.
- **Readme on changes:** when a change affects how the app is run, installed,
  or deployed, update the relevant docs (`README.md`, design spec) in the
  same commit. Docs rot faster than code.
- Each `docs/superpowers/specs/*` spec is written through the brainstorming
  flow and reviewed by the user before implementation starts.

## Review loops

- **Self-review your work before presenting it:** run the verification
  commands, reread your own diff, check the spec for placeholders or
  contradictions. Never report success on untested work.
- **Bug or unexpected behavior:** debug systematically — reproduce, form a
  hypothesis, test it, fix, and verify — instead of guessing.
- **Code review feedback:** verify claims before implementing. If feedback is
  unclear or technically wrong, say so.
- When a task is large, write an implementation plan first
  (`docs/superpowers/specs/`) and execute it in order with review
  checkpoints.
