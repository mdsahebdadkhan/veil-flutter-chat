# VEIL — Phase 1 Implementation Plan: Foundation & Engineering Quality

**Status: PLAN ONLY.** No files have been modified, no packages installed, no
commits made, no branches created, no configuration changed to produce this
plan. Everything below is a proposal for review and approval.

**Companion documents:** `PHASE_1_AUDIT.md` (verified ground truth — read it
first), `PHASE_1_TESTING_STRATEGY.md` (test design), `PHASE_1_RISKS.md`
(risk register). This document governs sequencing, decisions, and acceptance.

**Objectives (from the brief):** (1) reliable testing foundation; (2) automated
CI via GitHub Actions; (3) Gitleaks in CI; (4) consistent TypeScript
type-checking; (5) safe removal of genuinely unused dependencies and dead
code; (6) consistent data-fetching strategy; (7) server-side architecture
wiring review; (8) project structure and DX without unnecessary rewrites;
(9) reproducible dev/build workflows.

**Constraints (hard):** preserve React 19, TypeScript, TanStack Start/Router,
Tailwind v4, Supabase backend. No new backend/database. No auth/messaging
behavior change without a separately documented reason and approval. No E2EE
in Phase 1. No Flutter work. Shared features stay Supabase-native for a future
Flutter client. Never push directly to `main`. Never force-push. No history
rewrite. No credential rotation. No production-data or Supabase-settings
changes.

---

## 1. Decisions required before execution

Execution must not start until D-0 is answered. D-1–D-6 may be answered
together or per workstream at their gates, but each gates its workstream.

| #   | Decision                                                                                                                                                   | Recommendation                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | If declined                                                                                                                                                                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-0 | **Merge PR #1 first?** Phase 0 is not on `main` (`origin/main` = `8ef591a`; PR #1 OPEN, MERGEABLE).                                                        | **Yes — PR #1 must be merged by the user, then `phase-1/foundation` is created from updated `main`.**                                                                                                                                                                                                                                                                                                                                                                                      | The user explicitly chooses a stacked PR: branch Phase 1 from `phase-0/stabilization` instead (Phase 1 cannot merge before PR #1; rebase churn if PR #1 changes). The choice must be explicit — silence is not a choice. Do not branch Phase 1 from pre-Phase-0 `main` — it would silently drop Phase 0. |
| D-1 | **Data fetching: adopt TanStack Query or remove it?** (`@tanstack/react-query` installed, zero usage.)                                                     | **Adopt, staged (Option C): Query for reads, direct Supabase calls for writes in Phase 1.** Provider wired once; read models converted pilot-first (directory → conversations/groups → threads); mutations stay direct calls. Full `useMutation` migration is Phase 2.                                                                                                                                                                                                                     | Remove the dependency and harden custom hooks in place (dedup cache, error states, filters). Lower churn; every future feature re-implements caching.                                                                                                                                                    |
| D-2 | **Dead server layer: delete, document, or wire?** (`client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`; zero call sites; `src/start.ts` missing.) | **Delete the three files in W5.** Nothing imports them; git history preserves them (reversible); keeping a service-role client that bypasses RLS lying around is a security smell. **Consequence for the environment file:** if D-2 is delete or dormant, `SUPABASE_SERVICE_ROLE_KEY` stays **out** of `.env.example` — no approved, actually-used server feature requires it (see W7). The variable is added only if a future decision approves and wires a server feature that needs it. | Document as dormant (keep files + add a `SERVER_LAYER.md` note) — preserves the scaffold for Phase 2 server work at the cost of continued confusion. Wiring them properly (S2) is out of Phase 1 scope.                                                                                                  |
| D-3 | **Provision a separate Supabase test project + test account for E2E?**                                                                                     | **Yes, if E2E is wanted in Phase 1.** One smoke spec only (see Testing Strategy §2.2). Credentials in CI secrets, never in the repo.                                                                                                                                                                                                                                                                                                                                                       | Decline: no E2E in Phase 1. Unit/integration + CI build + documented `wrangler dev` smoke is the floor; E2E is recorded as deferred.                                                                                                                                                                     |
| D-4 | **Delete 44 dead `ui/` files and their 35 orphaned dependencies?**                                                                                         | **Yes, after Knip confirms the survey** (W5 step 1). Keep `sonner.tsx` (live). `components.json` becomes vestigial — keep it (harmless) and note it; do not delete shadcn config speculatively.                                                                                                                                                                                                                                                                                            | Keep the files as a future component library. Then the 35 dependencies must also stay, and W5 shrinks to the 4 outright-unused deps + dead exports only.                                                                                                                                                 |
| D-5 | **Commit `docs/` into the repo?** (`docs/audit/`, `docs/phase-0/`, `docs/phase-1/` are untracked; README links to them dangle on the pushed branch.)       | **Yes — commit the docs on the Phase 1 branch** (one `docs:` commit). It fixes the dangling README links and makes the PR self-documenting.                                                                                                                                                                                                                                                                                                                                                | Keep docs out of the repo; then W8 must remove the README links instead.                                                                                                                                                                                                                                 |
| D-6 | **Lint-gate path: exclude generated files + one mechanical `prettier --write` commit?**                                                                    | **Yes.** Exclude `src/integrations/supabase/types.ts` (generated, 222 errors) from Prettier/ESLint like `routeTree.gen.ts` already is, then run `prettier --write` once as a formatting-only commit, then fix the 9 warnings by hand.                                                                                                                                                                                                                                                      | Fix 349 errors by hand across 29 files (slow, error-prone) or leave lint red and gate CI on typecheck/test/build only (lint stays unenforced).                                                                                                                                                           |

### 1.1 Approval boundaries (read before executing anything)

- **Approval of this plan authorizes the plan and the non-behavior
  workstreams only.** It does **not** approve any D-1–D-6 option, any B1–B8
  behavior-sensitive change (§6), the merge of PR #1, or the merge of the
  Phase 1 PR. Each of those is a separate decision.
- **Each D-item is decided at its gate.** D-0 is decided by the user merging
  PR #1 (or explicitly choosing a stacked PR). D-1–D-6 are decided when their
  workstream reaches its gate. An undecided D-item blocks its workstream; it
  is never treated as approved by silence.
- **Each B-item (§6) requires a separate explicit approval naming the item**,
  recorded before its commit lands — in a reply, or as a line in the PR
  description stating which B-items are approved and which are deferred. If an
  approval is not given, the affected work is deferred, not executed silently.
  Plan approval is not a blanket approval for optional behavior changes.
- **PR #1 must be merged by the user** before Phase 1 branches from updated
  `main`, unless the user explicitly chooses a stacked PR (D-0). No one else
  merges it on the user's behalf as part of Phase 1 execution.

---

## 2. Execution order (milestones)

| Milestone                   | Workstreams                                                                                                | Gate to proceed                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0 — Setup**              | W0                                                                                                         | D-0 answered; branch created from correct base; baselines recorded                                                                           |
| **M1 — Safety nets**        | W3 (Gitleaks CI) → W2 (CI) → W4 (typecheck)                                                                | CI green on the branch (except the known-red lint job, which is explicitly allowed to fail until M2)                                         |
| **M2 — Green lint**         | W8a (generated-file exclusions + `prettier --write` + warning fixes)                                       | `bun run lint` exits 0 on the branch                                                                                                         |
| **M3 — Tests + cleanup**    | W1 (baseline tests) → W5 (dead code + deps)                                                                | `bun run test` green in CI on baseline tests; Knip clean; build + typecheck green after removals                                             |
| **M4 — Data + server + DX** | W6 (data fetching + tests for new behavior) → W7 (server/env/deploy) → W8b (structure/DX) → W9 (close-out) | All acceptance criteria in §5 hold on a clean clone; new-behavior tests green; B-items approved per §1.1; PR opened with verification report |

Ordering rationale: secrets scanning and CI go first so every later change is
checked from the moment it lands. Lint goes green before the cleanup so
removals are verified against a passing gate rather than a red one. Tests land
before the data-fetching migration so the migration has a safety net. Within
testing, the split is deliberate: W1 pins the **baseline** — tests assert what
the code does today, including its current error-blindness — so W6 regressions
are visible. Tests for behavior W6 **introduces** (error surfacing, state
reset on key change, debounced search, thread limits) land in W6, in the same
commit as the fix that introduces the behavior. No test in W1 asserts behavior
that does not exist yet. The data-fetching migration is last among code changes
because it touches the hottest code (messaging hooks) and must not block the
foundation work.

**Rollback rule (global):** every workstream lands as its own commit (see §4).
A failed workstream is reverted with `git revert` of that commit, never by
rewriting history. The branch is never force-pushed.

---

## 3. Workstreams

Each workstream lists: objective, exact files, steps, dependencies, risks /
rollback, verification. "Behavior-sensitive" marks changes that touch
auth/messaging behavior and therefore need a separately documented reason and
approval before execution (per the brief's constraint).

### W0 — Setup and baseline

- **Objective:** start Phase 1 from the correct base with recorded baselines.
- **Files affected:** none in the repo (branch + records only). Baseline record
  goes in the PR description and `docs/phase-1/` notes.
- **Steps:**
  1. Confirm D-0. If PR #1 is merged: `git checkout main && git pull &&
git checkout -b phase-1/foundation`. If stacked (D-0 declined):
     `git checkout -b phase-1/foundation phase-0/stabilization` and record the
     stacking in the PR description.
  2. Record baselines on the new branch before any change: `bun run lint`
     problem count, `bun x tsc --noEmit` exit code, `bun run build` exit code,
     `git ls-files` count. (Expected: lint 358 problems on a Phase 0 base.)
  3. Confirm the toolchain: Bun 1.4.4, Node v24.x, Gitleaks v8.30.1 available
     (install Gitleaks from the official v8.30.1 release if absent, as in
     Phase 0).
- **Dependencies:** D-0.
- **Risks / rollback:** branching from the wrong base silently drops Phase 0
  (mitigated by step 1's explicit check and by verifying `git log --oneline
main..HEAD` contains the three Phase 0 commits). Rollback: delete the branch
  locally and remotely (`git branch -D`, `git push origin --delete`) — safe
  before any push of work; after push, prefer leaving the branch and starting
  a corrected one.
- **Verification:** `git log` shows the branch contains Phase 0 commits;
  baselines recorded.

### W1 — Testing foundation

- **Objective:** Tier 1–3 tests (see `PHASE_1_TESTING_STRATEGY.md`); Tier 4
  gated on D-3.
- **Files affected (new):** `src/lib/media-upload.test.ts`,
  `src/lib/utils.test.ts`, `src/lib/encryption.test.ts`,
  `src/lib/chat-hooks.test.ts`, `src/lib/group-hooks.test.ts`,
  `src/components/MessageComposer.test.tsx`,
  `src/components/EmptyState.test.tsx` (or equivalent component-test files),
  `src/routes/auth.test.tsx`, `src/test-utils/fake-supabase.ts`,
  `src/test-utils/factories.ts`, `src/test-utils/setup.ts`,
  `playwright.config.ts` + `e2e/smoke.spec.ts` (only if D-3 approved).
- **Files affected (modified):** `package.json` (add scripts `test`,
  `test:watch`; add devDependency `happy-dom` and `@testing-library/react`;
  add devDependency `playwright` + `@playwright/test` only if D-3 approved).
- **Steps:**
  1. Add scripts + `happy-dom` + Testing Library. Add `src/test-utils/setup.ts`
     (happy-dom preload) and the Supabase client fake.
  2. Tier 1 tests (pure logic). The encryption tests assert **pass-through
     behavior** and are named as such — never "encryption".
  3. Tier 2 **baseline** tests (hooks, mocked client). Baseline means the
     tests assert what the hooks do **today** — loading states, message
     assembly, realtime merge/dedup, send payloads — including the current
     error-blindness. Example: the `checkUsernameAvailable` baseline test pins
     that an RPC failure returns `false` today, with a comment stating W6
     changes this behavior and the test with it. **No baseline test asserts
     error surfacing, state reset on key change, debounced search, or thread
     limits** — those behaviors do not exist yet, and their tests land in W6
     alongside the fixes (see W6). W1 completes in M3 with baseline tests only.
  4. Tier 3 baseline tests (components, current render contracts).
  5. Tier 4 (only if D-3 approved): Playwright + one smoke spec; test-project
     credentials in CI secrets.
- **Dependencies:** none for Tiers 1–3. Tier 4 depends on D-3.
- **Risks / rollback:** `happy-dom` rendering gaps (mitigation: drop affected
  component tests to hook/logic level with a comment — see Testing Strategy
  §2.1). Mock drift (the fake diverges from real Supabase semantics —
  mitigation: keep the fake minimal and driven by actual hook usage; the E2E
  smoke is the backstop). Rollback: revert the workstream commit(s); tests are
  additive, so reverting is safe.
- **Verification:** `bun run test` exits 0 locally and in CI; every Tier 1
  target and every hook has at least one **baseline** test; no test touches
  the network or production Supabase (inspection); coverage artifact produced
  (no threshold).

### W2 — CI via GitHub Actions

- **Objective:** every push to the Phase 1 branch and every PR to `main` runs
  install, lint, typecheck, test, and build automatically.
- **Files affected (new):** `.github/workflows/ci.yml`.
- **Files affected (modified):** none (workflow only). Branch protection
  (require the CI workflow before merge) is a **repo-settings change by the
  user**, documented in the PR — not executable from the repo.
- **Steps:**
  1. Create `.github/workflows/ci.yml` with jobs: `install` (Bun setup via
     `oven-sh/setup-bun` — verify the latest major version at authoring time
     and pin it; `bun install --frozen-lockfile`),
     `lint` (`bun run lint`), `typecheck` (`bun x tsc --noEmit`), `test`
     (`bun run test`), `build` (`bun run build`). Pin every action to a full
     commit SHA, as W3 does for the Gitleaks workflow (verify each SHA against
     the action's official repository at authoring time). `concurrency:
cancel-in-progress: true` per branch.
  2. Triggers: `push` (branches: `phase-1/foundation`) and `pull_request`
     (branches: `main`). Add `push` on `main` after merge so post-merge
     breakage is also caught.
  3. Upload the coverage artifact from the `test` job (measurement only).
  4. Until M2 completes, the `lint` job is allowed to fail: use
     `continue-on-error: true` on the lint job with a comment and a dated
     TODO, removed in M2. (Alternative — gate lint from day one and keep the
     branch red until M2 — is worse: a red-required check trains reviewers to
     ignore CI.)
- **Dependencies:** W0. `typecheck` job depends on W4's script existing
  (W4 lands in M1; if W4 slips, the job calls `bun x tsc --noEmit` directly
  and the script is added later — no blocker).
- **Risks / rollback:** CI flakiness (mitigation: no network-dependent tests
  in the `test` job; build is hermetic). Bun setup action breakage
  (mitigation: pinned version; fallback documented as installing Bun via the
  official install script). Rollback: delete the workflow file (one commit
  revert); CI simply stops running.
- **Verification:** open the PR; all jobs run and report; intentionally break
  one check in a scratch commit (or verify via the known-red lint job) to
  prove the workflow fails when it should, then remove the scratch commit
  before merge. (Do not merge a deliberately broken state.)

### W3 — Gitleaks in CI

- **Objective:** no new secret can land via a PR without CI failing.
- **Files affected (new):** `.github/workflows/gitleaks.yml` (separate
  workflow so the secret scan is visible independently of the build jobs),
  `.gitleaksignore` (the two known historical findings, by exact fingerprint,
  one per line). No `.gitleaks.toml` is created — no custom configuration is
  needed; the default rules apply.
- **Files affected (modified):** none.
- **Correction (2026-11-18): the original draft of this plan proposed
  `gitleaks/gitleaks-action@v8`. That version does not exist — v8 is the
  Gitleaks *CLI* version, not the GitHub Action version. The official action's
  current major is **v3** (latest release v3.0.0, 2026-05-30). The workflow
  below uses the corrected version, verified against the official action
  repository on 2026-11-18.**
- **Steps:**
  1. Add a root `.gitleaksignore` with the **two known historical findings
     only**, one exact fingerprint per line, no other entries:
     ```
     8062505c6663f8c041de39134f6baf0a90340410:.env:jwt:1
     8062505c6663f8c041de39134f6baf0a90340410:.env:jwt:4
     ```
     These are the fingerprints from the Phase 0 scan: rule `jwt`, file
     `.env`, commit `8062505`, lines 1 and 4 — Supabase publishable/anon keys,
     triaged in Phase 0, publishable by design. The ignore file is a
     documented exception, not a blind spot: it matches exactly those two
     findings, by fingerprint, and nothing else. Record the triage (rule /
     file / commit / line) as a comment in the workflow YAML and in the PR
     description — the ignore file itself holds fingerprints only.
     **Do not create `.gitleaks.toml`.** No custom configuration is needed.
     If custom configuration is ever required, the file must start with
     `[extend] useDefault = true`: a `.gitleaks.toml` without it _replaces_
     the default rules instead of extending them, which would silently disable
     all default detection. (Verified against the Gitleaks README, 2026-11-18:
     `.gitleaksignore` takes fingerprints one per line at the repo root; the
     `[extend]` block with `useDefault = true` extends the built-in config.
     The ignore-file mechanism is marked experimental upstream, which is one
     more reason the CLI version is pinned to 8.30.1.)
  2. Add the workflow. Third-party actions are pinned to full commit SHAs
     (verified 2026-11-18 against the official repositories):
     ```yaml
     jobs:
       scan:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6
             with:
               fetch-depth: 0
           - uses: gitleaks/gitleaks-action@e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e # v3.0.0
             env:
               GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
               GITLEAKS_VERSION: 8.30.1
     ```
     What each part does and why:
     - `actions/checkout` with `fetch-depth: 0` checks out the **complete**
       Git history, so the full history is _available_ to the scan. That alone
       does not guarantee the action scans all of it (see the next bullet).
       The official action README uses exactly this step.
     - `gitleaks/gitleaks-action@v3` is the official action (v3.0.0; v3
       migrates the action runtime from Node 20 to Node 24 with no behavior
       change). **Scope correction (2026-11-18, verified against the M1 CI
       run):** on push and pull-request events the action scans the event's
       commit range (e.g. the pushed commits), not necessarily the complete
       Git history — the M1 run logged `gitleaks detect ...` `--log-opts=--no-merges --first-parent <base>^..<head>` and "4 commits
       scanned". The workflow's job is therefore to scan **new commits** in CI;
       it does not re-scan all history on every push. No scheduled trigger is
       added (decision: Option 1, accepted 2026-11-18).
     - `GITLEAKS_VERSION: 8.30.1` pins the Gitleaks CLI version the action
       runs. This is the action's documented pin mechanism (`GITLEAKS_VERSION`
       selects a particular CLI version; its default is a hard-coded version,
       so an explicit pin is required for reproducibility). `8.30.1` is the
       CLI version Phase 0 verified.
     - `GITHUB_TOKEN` is the auto-assigned token the action uses for PR
       comments. No `GITLEAKS_LICENSE` is set: a license is required only for
       organization accounts, and this repository belongs to a personal
       account (per the action README).
     - No secret values appear anywhere in the workflow or the ignore file —
       only rule IDs, file paths, commit SHAs, line numbers, and fingerprints.
  3. **Fallback (only if the pinned action cannot be used):** if the job log
     shows a CLI version other than 8.30.1, or the action step fails for a
     reason unrelated to findings, replace the action step with an explicit
     CLI install in the same job (download the official v8.30.1 release
     tarball for `linux_x64`, verify `gitleaks version`, then run
     `gitleaks git --redact --log-opts="--all" .`). The `.gitleaksignore`
     at the repo root is picked up automatically from the working directory;
     no `--config` flag is used, because there is no `.gitleaks.toml`.
     Do not silently accept a different CLI version.
  4. Triggers: same as CI (`pull_request` to `main`, `push` to the Phase 1
     branch).
  5. Document the local equivalent in the README (the Phase 0 scan command)
     so developers can check before pushing.
- **Dependencies:** W0. The ignore file depends on the Phase 0 triage (verified
  in the audit, §1.9).
- **Risks / rollback:** ignore file too broad (mitigation: exactly two
  fingerprint lines, verified against the Phase 0 report; review the ignore
  file in the PR). False positives on new code (mitigation: Gitleaks' default
  config is precise; a false positive is triaged by adding that finding's
  fingerprint to `.gitleaksignore` with justification, never by disabling the
  scan). A `.gitleaks.toml` added without `[extend] useDefault = true` would
  replace the default rules and silently disable detection (mitigation: no
  `.gitleaks.toml` in Phase 1; if one is ever added, the PR must show the
  `[extend]` block and the scratch-secret test below must still fail the
  scan). Action-version drift (mitigation: SHA pinning + the
  `GITLEAKS_VERSION` pin + the fallback in step 3). Rollback: revert the
  workflow + ignore-file commits; manual scanning resumes.
- **Verification — what a green CI run proves, and what it does not
  (corrected 2026-11-18 after the M1 runs):** the workflow passes on the
  Phase 1 branch **and** the job log shows CLI version 8.30.1 and a
  `fetch-depth: 0` checkout. A green push-triggered run proves the action
  works, the CLI version is pinned, and **no new secret is present in the
  scanned commit range**. It does **not** prove the ignore file covers the two
  historical findings: a push-triggered run scans only the event's commit
  range, so it never encounters commit `8062505`. Do not claim a green CI run
  proves `.gitleaksignore` is correct.
- **Verification — independent local check (the evidence for the ignore
  file):** the ignore file and full-history behavior were verified locally
  with Gitleaks CLI 8.30.1 in a disposable scratch clone during M1
  (2026-11-18), and the scratch clone was deleted afterward:
  - Full-history scan (`gitleaks git --redact --log-opts="--all"`) over 92
    commits: exit 0, 0 findings, with `.gitleaksignore` in place.
  - Control scan with `.gitleaksignore` removed: exit 1, exactly the two
    known findings (rule `jwt`, file `.env`, commit `8062505`, lines 1 and 4)
    — proving the scan encounters them and the ignore file is what suppresses
    them.
  - Fake-secret test: a throwaway branch with a fake JWT (jwt.io example,
    fake signature) committed, scan exit 1 with exactly one new finding
    (rule `jwt`, redacted) — proving a new finding still fails detection and
    the ignore file suppresses only the two known findings.
    No test secrets or unwanted commits were left in the shared branch.
- **Verification — new findings in CI:** a scratch commit containing a fake
  secret (e.g. a test JWT in a temp file) fails the scan — then the scratch
  commit is removed before merge. (The local fake-secret test above already
  demonstrates this against the same CLI version; repeat it against the CI
  workflow only if the action's behavior is ever in doubt.)

### W4 — Consistent TypeScript type-checking

- **Objective:** type-checking is a script, runs in CI, and covers server code
  correctly.
- **Files affected (modified):** `package.json` (add `"typecheck":
"bun x tsc --noEmit"` — `bun x`, not `bunx`, because the `bunx` binary is
  not on PATH in this environment), `README.md` (replace `bunx tsc --noEmit`
  with `bun run typecheck`), `eslint.config.js` (add a `languageOptions`
  override with `globals.node` for server files: `src/integrations/supabase/
client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`, `vite.config.ts`
  if needed), `tsconfig.json` (see step 2).
- **Steps:**
  1. Add the `typecheck` script; fix the README command; add the ESLint node
     globals override for server files.
  2. **Do not** enable `noUnusedLocals` / `noUnusedParameters` yet — that
     lands after W5 (the cleanup removes what those flags would flag; enabling
     them first would fail the build on pre-existing dead code). Record this
     ordering in the commit message.
  3. Verify `bun run typecheck` exits 0 and CI's `typecheck` job passes.
- **Dependencies:** W0. Step 2 depends on W5 completing.
- **Risks / rollback:** the node-globals override could mask a real browser
  misuse (mitigation: scope the override to the named server files only, not
  `src/**`). Rollback: revert the commit; type-checking returns to README-only.
- **Verification:** `bun run typecheck` exit 0 locally and in CI; `bun run
lint` shows no new errors from the config change.

### W5 — Unused dependencies and dead code (safe removal)

- **Objective:** remove what the evidence proves is unused, with automated
  confirmation before each removal. Nothing is removed on grep evidence alone
  where the survey marked it inconclusive.
- **Files affected (modified):** `package.json` (dependency removals),
  `bun.lockb` (regenerated by frozen install after removals),
  `src/lib/group-hooks.ts` (remove `addGroupMembers` export).
- **Files affected (deleted):** 44 files in `src/components/ui/` (all except
  `sonner.tsx`), `src/components/PageTransition.tsx`,
  `src/hooks/use-mobile.tsx`, and — per D-2 — `src/integrations/supabase/
client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts` (only if D-2
  approves deletion).
- **Files affected (new):** `knip.json` (entry-point config — see step 1).
- **Steps:**
  1. Add Knip as a devDependency and configure `knip.json` with entry points
     covering TanStack Start file-based routing (`src/router.tsx`,
     `src/routes/**`, `src/routeTree.gen.ts`, `vite.config.ts`,
     `eslint.config.js`). Run `bun x knip` in report mode; confirm it
     reproduces the survey table (4 outright-unused deps, the 44 dead `ui/`
     files, `PageTransition`, `use-mobile`, `addGroupMembers`). Investigate
     any disagreement before proceeding — Knip's verdict governs, not the
     survey's, where they differ.
  2. Delete the dead files (one commit, message lists the files). Keep
     `sonner.tsx`. Do not touch `components.json` (vestigial but harmless).
  3. Remove the 4 outright-unused dependencies (`@hookform/resolvers`,
     `@tanstack/react-query` — only if D-1 is "remove"; if D-1 is "adopt",
     keep it and W6 owns it — `zod`, `eslint-config-prettier`) with
     `bun remove`, then the 35 transitively-orphaned dependencies (only after
     step 2, only those Knip confirms). Run `bun install --frozen-lockfile`.
  4. Remove the `addGroupMembers` export.
  5. Execute D-2 (delete the three server files, if approved).
  6. Verify `@types/node`: run `bun run typecheck` with the package removed
     in a scratch state; keep it if the typecheck fails, remove it if it
     passes. Do not remove on grep evidence alone.
  7. Do **not** remove the 5 "only-in-config" packages
     (`@cloudflare/vite-plugin`, `@tailwindcss/vite`,
     `@tanstack/router-plugin`, `vite-tsconfig-paths`, `@vitejs/plugin-react`)
     in Phase 1: their status requires inspecting the installed
     `@lovable.dev/vite-tanstack-config` tree, and removing a load-bearing
     pin would break the build opaquely. Record them as investigated and
     deferred.
  8. Enable `noUnusedLocals` and `noUnusedParameters` in `tsconfig.json` and
     turn on `@typescript-eslint/no-unused-vars` (warn first, error after one
     green run) — now that the dead code is gone, these flags guard against
     recurrence. Fix any newly surfaced issues in the same commit.
- **Dependencies:** W1 (tests exist before removals, so regressions are
  caught), W2 (CI runs on the removal PR), D-1 (decides react-query's fate),
  D-2, D-4.
- **Risks / rollback:** Knip false positives — the known traps are
  `emoji-picker-react` (dynamic import; Knip handles it, verify explicitly),
  route files (entry-point config), and `react-start` (framework entry via
  `wrangler.jsonc` string reference, not an import). Mitigation: step 1's
  confirm-before-delete and the build/typecheck/test gates after each removal
  step. Rollback: `git revert` the removal commit(s); dependencies are
  restored from the lockfile. Deleting `ui/` files is recoverable from git
  history.
- **Verification:** Knip exits 0 after cleanup; `bun install
--frozen-lockfile` exit 0; `bun run typecheck` exit 0; `bun run test` exit
  0; `bun run build` exit 0; `git status` clean apart from intended changes.

### W6 — Consistent data-fetching strategy

- **Objective:** implement Decision D-1 (recommended: Option C — TanStack
  Query for reads, direct Supabase calls for writes in Phase 1), plus the
  hardening fixes that are independent of the choice.
- **Files affected (new):** `src/lib/query-client.ts` (QueryClient instance
  - defaults: `staleTime`, `gcTime`, `retry` policy — values decided at
    authoring time and documented in the file).
- **Files affected (modified):** `src/routes/__root.tsx` (mount
  `QueryClientProvider`), `src/router.tsx` (pass the client through router
  context), `src/lib/chat-hooks.ts`, `src/lib/group-hooks.ts` (convert read
  hooks to `useQuery`; add `error` to every hook return), `src/routes/
chat.$peerId.tsx` (use `fetchProfile` instead of the inlined query),
  `src/lib/auth-context.tsx` (fix the `exhaustive-deps` warning at line 75;
  **behavior-sensitive:** the missing `session.user` dependency — document the
  reason for the fix).
- **Steps (in order — do not reorder):**
  - **Tests and approvals:** each fix in steps 2–6 lands with its tests in the
    same commit (fix first, test second, same commit). Those tests replace or
    update the W1 baseline tests that pinned the old behavior — e.g. the
    `checkUsernameAvailable` baseline test is updated in step 5 to assert
    error surfacing instead of `false`. No W6 test is written in W1.
    Every behavior-sensitive step below (marked as such) requires its separate
    approval under §1.1 before its commit lands.
  1. Wire the provider: create the QueryClient, mount the provider in
     `__root.tsx`, pass it through router context. No hook changes yet. Verify
     the app still builds and serves (smoke test).
  2. Pilot conversion — lowest-risk read model first: `useDirectory` +
     `fetchProfile`/`fetchProfiles` → `useQuery` with keys `["profiles", id]`,
     `["directory", userId, search]`. Add the search debounce (P16) in the
     same step. Verify with the Tier 2 tests.
  3. Convert `useConversations` and `useUserGroups` → `useQuery` (keys
     `["conversations", userId]`, `["groups", userId]`). Realtime INSERTs
     invalidate the query (not full refetch-and-redecrypt of everything —
     **behavior-sensitive:** refresh semantics change from full reload to
     cache invalidation; document the reason).
  4. Convert `useThread` / `useGroupThread` → `useQuery` (keys `["thread",
userId, peerId]`, `["group-thread", groupId]`). Add the Postgres
     `filter:` to the two unfiltered channels (P11) and state reset on key
     change (P14) in this step.
  5. Hardening (independent of Query, may land before steps 2–4 if preferred):
     add `error` to every hook return (P9); fix `checkUsernameAvailable` to
     surface errors instead of returning `false` (**behavior-sensitive:**
     callers must handle the error — document the reason); remove the dead
     `draft`/`onSend` in `group.$groupId.tsx`; add a `limit` to thread fetches
     with a "load more" design (**behavior-sensitive:** changes what users see
     — document the reason and the chosen limit; the unbounded fetch is a
     correctness/scale problem, P15).
  6. `createGroup` orphan fix: on member-insert failure, delete the
     just-created group (compensating delete) and surface the error
     (**behavior-sensitive:** changes failure behavior from silent orphan to
     atomic-ish failure — document the reason; a true transaction needs a
     server function/RPC and is deferred to Phase 2).
  7. Do **not** in Phase 1: convert mutations to `useMutation` (Phase 2);
     implement unread/presence/1:1 typing (product work, not foundation);
     add pagination UI beyond "load more" (Phase 2).
- **Dependencies:** W1 (Tier 2 tests must exist before hook conversions),
  W2 (CI), D-1. Steps 2–4 depend on step 1.
- **Risks / rollback:** this is the highest-risk workstream — the realtime
  merge logic is rewritten per query, and a mistake silently breaks messaging
  (stale threads, lost messages). Mitigations: tests first (W1), pilot-first
  ordering, one hook family per commit, `wrangler dev` smoke after each
  conversion, and the Realtime channel kept as the invalidation source (no new
  polling). Rollback: `git revert` the conversion commit(s); the previous
  hook implementation is restored exactly. **If any conversion regresses
  messaging in smoke testing, stop and revert that commit — do not press on.**
- **Verification:** Tier 2 tests pass; `bun run typecheck` and `bun run
build` exit 0; `wrangler dev` smoke: sign in, open a DM thread, send a
  message, see it appear; open a group, send a message, see it appear;
  navigate peer A → peer B and confirm A's messages do not linger. (Smoke
  requires a signed-in account — use the test account from D-3 if approved,
  otherwise the developer's own account against the dev project, never
  production data manipulation beyond normal messaging.)

### W7 — Server architecture, env, and deploy wiring

- **Objective:** resolve the server layer's status, fix env documentation, and
  make the deploy path real.
- **Files affected (modified):** `.env.example` (remove
  `VITE_SUPABASE_PROJECT_ID` only after confirming no code references it —
  the audit found none, re-verify at execution time. Do **not** add
  `SUPABASE_SERVICE_ROLE_KEY` — see step 2),
  `package.json` (add `wrangler` as a direct devDependency — pinned to the
  version the lockfile already resolves, 4.76.0 — and add scripts
  `dev:worker` → `wrangler dev` and `deploy` → `wrangler deploy`),
  `README.md` (document `wrangler dev` as the smoke-test path and
  `wrangler deploy` as the manual deploy command; note that deploy requires
  Cloudflare authentication and is never run from CI in Phase 1),
  `docs/phase-0/PHASE_0_IMPLEMENTATION_PLAN.md` (correct the `.output/` →
  `dist/` error — a doc fix, not a code change).
- **Files affected (deleted):** the three server files, only if D-2 approves
  deletion (executed in W5; this workstream records the outcome).
- **Steps:**
  1. Execute the D-2 outcome (deletion happens in W5; if D-2 is "document as
     dormant", write `docs/phase-1/SERVER_LAYER.md` stating the layer is
     intentionally unwired and what would be needed to activate it).
  2. Do **not** add `SUPABASE_SERVICE_ROLE_KEY` to `.env.example` in Phase 1.
     The variable is added only if an approved, actually-used server feature
     requires it — i.e. only if D-2 selects wiring (out of Phase 1 scope) or
     a later approved decision wires a server feature. If D-2 is delete or
     dormant, the variable stays out of the example setup entirely, because
     there is no server feature to configure. **Never place an actual
     service-role key value in any file** — the example file holds names only,
     always.
  3. Add `wrangler` as a direct devDependency (proves the deploy tool is
     pinned, not transitive drift) and the two scripts. Run
     `bun install --frozen-lockfile` and verify the lockfile.
  4. Document the deploy command. Do not add CI deployment in Phase 1.
- **Dependencies:** D-2, W5 (server-file fate), W2 (CI must still pass after
  the dependency addition).
- **Risks / rollback:** adding `SUPABASE_SERVICE_ROLE_KEY` to `.env.example`
  is no longer a Phase 1 step (see step 2) — the risk below applies only if a
  future approved decision adds it. If that ever happens: documenting a
  secret's _name_ is safe (names are not values), but the comment must state
  it is server-only and must never be given a value in the file.
  Adding `wrangler` as a direct dep can shift the resolved version —
  mitigation: pin to the already-resolved 4.76.0 and verify with a frozen
  install. Rollback: revert the commit(s).
- **Verification:** fresh-clone check: follow the README setup from scratch
  (copy `.env.example`, fill values, install, build, `wrangler dev`, smoke
  test) — the README must be sufficient without tribal knowledge.
  `bun install --frozen-lockfile` exit 0; build exit 0.

### W8 — Project structure and developer experience

- **Objective:** small, safe cleanups that make the repo easier to work in.
  Split into W8a (lint-gate work, M2) and W8b (remaining DX, M4).
- **Files affected (W8a):** `.prettierignore` (add
  `src/integrations/supabase/types.ts`), `eslint.config.js` (add the generated
  file to `ignores` if not already covered), every file `prettier --write`
  changes (formatting only — one commit, no logic changes), `src/lib/
auth-context.tsx` (fix the `exhaustive-deps` warning), the 8 files with
  `react-refresh/only-export-components` warnings (fix by moving the
  non-component export or adding the documented exception — per file, minimal
  change).
- **Files affected (W8b):** `package.json` (rename `name` to `veil`; add
  scripts `typecheck`, `test`, `test:watch`, `dev:worker`, `clean`
  → `rm -rf dist node_modules/.vite`), `README.md` (fix links per D-5;
  replace `bunx` with `bun run typecheck`; document `wrangler dev`;
  document the test commands), `src/routes/routeTree.gen.ts` (see step 3),
  `docs/phase-0/PHASE_0_IMPLEMENTATION_PLAN.md` (correct `.output/` → `dist/`
  — shared with W7; do it once, here or there, not both).
- **Steps (W8a):**
  1. Exclude the generated `types.ts` from Prettier and ESLint.
  2. Run `bunx prettier --write .` (via `bun x prettier --write .` if `bunx`
     is unavailable) as a **formatting-only commit**. Review the diff to
     confirm no logic changes (it should touch only whitespace/line breaks).
  3. Fix the 9 warnings by hand (one commit). The `exhaustive-deps` fix in
     `auth-context.tsx` is behavior-sensitive — document the reason.
  4. Verify `bun run lint` exits 0; remove the `continue-on-error` escape
     hatch on the CI lint job (W2 step 4).
- **Steps (W8b):**
  1. Rename the package, add the scripts, fix the README.
  2. `routeTree.gen.ts` staleness: first try **option B** — remove it from git
     tracking (`git rm --cached`) and add it to `.gitignore`, then verify a
     clean-clone build regenerates it before bundling (if the build fails
     without the committed file, fall back to **option A**: commit the
     regenerated version with the Register block). Record which option was
     taken and why.
  3. Commit the docs per D-5 (one `docs:` commit) if approved.
- **Dependencies:** W8a depends on W2 (CI lint job exists to remove the hatch
  from). W8b depends on D-5 and W7 (README content).
- **Risks / rollback:** the `prettier --write` commit touches ~28 files —
  large diff, but mechanical; mitigation is the diff review in step 2 and the
  fact that tests + build run after it. The `routeTree.gen.ts` experiment
  could break the build — mitigation is the fallback to option A in the same
  workstream. Rollback: revert the commit(s).
- **Verification:** `bun run lint` exit 0; `bun run build` exit 0 after the
  route-tree change (clean clone); README setup followed from scratch works
  (W7 verification covers this).

### W9 — Reproducible workflows and close-out

- **Objective:** prove Phase 1 end-to-end on a clean clone and open the PR.
- **Files affected:** none (verification + PR only).
- **Steps:**
  1. Fresh clean clone of `phase-1/foundation` (scratch directory under
     `~/workspace`, **not** `/tmp` — `/tmp` is a 512 MB tmpfs that filled
     during Phase 0 verification).
  2. Run the full sequence from the README, verbatim: copy `.env.example`,
     fill values, `bun install --frozen-lockfile`, `bun run typecheck`,
     `bun run lint`, `bun run test`, `bun run build`, `wrangler dev` smoke
     (`/` and `/auth` 200, sign-in, DM + group thread load, message send).
  3. Re-run the Gitleaks history scan (Phase 0 procedure, v8.30.1) and record
     the triage.
  4. Push only `phase-1/foundation`; open a PR to `main` with the
     verification report (tool versions, exit codes, test counts, lint count,
     Gitleaks triage) in the description. Do not merge it in this phase —
     merge is the user's decision after review.
- **Dependencies:** all workstreams.
- **Risks / rollback:** a late failure here reopens the failed workstream
  (fix forward on the branch; never rewrite history).
- **Verification:** the §5 acceptance table is fully green; the PR description
  contains the evidence.

---

## 4. Commit plan

One commit per numbered step-group below (squash nothing; each commit must
leave the branch green or explicitly note the known-red lint job until M2).

| #   | Commit                                                                                           | Workstream |
| --- | ------------------------------------------------------------------------------------------------ | ---------- |
| 1   | `chore: record Phase 1 baselines` (docs note only)                                               | W0         |
| 2   | `ci: add Gitleaks history scan workflow + .gitleaksignore`                                       | W3         |
| 3   | `ci: add GitHub Actions workflow (install, lint, typecheck, test, build)`                        | W2         |
| 4   | `chore: add typecheck script and ESLint node globals for server files`                           | W4         |
| 5   | `chore: exclude generated Supabase types from linting`                                           | W8a        |
| 6   | `style: format with prettier (no logic changes)`                                                 | W8a        |
| 7   | `fix: resolve remaining lint warnings`                                                           | W8a        |
| 8   | `test: add testing foundation (bun test, fakes, Tier 1-3 baseline tests)`                        | W1         |
| 9   | `test: add Playwright smoke spec` (only if D-3)                                                  | W1         |
| 10  | `chore: add Knip config and confirm unused-code survey`                                          | W5         |
| 11  | `chore: remove dead ui components and orphaned files`                                            | W5         |
| 12  | `chore: remove unused dependencies`                                                              | W5         |
| 13  | `chore: remove dead server layer` (only if D-2 approves deletion)                                | W5         |
| 14  | `chore: enable noUnusedLocals/noUnusedParameters and no-unused-vars`                             | W5         |
| 15  | `feat: wire TanStack Query provider`                                                             | W6         |
| 16  | `feat: migrate directory/profile reads to TanStack Query (+ tests)`                              | W6         |
| 17  | `feat: migrate conversations/groups reads to TanStack Query (+ tests)`                           | W6         |
| 18  | `feat: migrate thread reads to TanStack Query; filter realtime channels (+ tests)`               | W6         |
| 19  | `fix: surface hook errors; fix username check; group-create cleanup (+ tests for new behavior)`  | W6         |
| 20  | `chore: add wrangler devDependency and scripts; fix .env.example (no service-role var — see W7)` | W7         |
| 21  | `docs: fix README links, commands, and preview documentation`                                    | W8b        |
| 22  | `chore: rename package to veil; add clean script`                                                | W8b        |
| 23  | `docs: commit audit and phase plans` (only if D-5)                                               | W8b        |

---

## 5. Acceptance criteria (all must hold before the PR is opened)

| #   | Criterion                                                                                                                                                                                        | How verified                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Branch `phase-1/foundation` created from `main` **after** PR #1 merged (or explicitly stacked, per D-0)                                                                                          | `git log` shows Phase 0 commits on the branch                                                                                          |
| A2  | CI workflow runs on push + PR; all jobs green                                                                                                                                                    | GitHub Actions run on the PR                                                                                                           |
| A3  | Gitleaks workflow passes; job log shows CLI 8.30.1 and a `fetch-depth: 0` checkout; no leaks in the scanned commit range (push-triggered runs scan the event's range, not full history — see W3) | Workflow log; `.gitleaksignore` has exactly two fingerprint lines; full-history + ignore-file behavior verified locally in M1 (see W3) |
| A4  | `bun run lint` exits 0                                                                                                                                                                           | Clean-clone run                                                                                                                        |
| A5  | `bun run typecheck` exits 0                                                                                                                                                                      | Clean-clone run + CI                                                                                                                   |
| A6  | `bun run test` exits 0: Tiers 1–3 **baseline** tests green; tests for new W6 behavior green (they land with the W6 fixes); Tier 4 iff D-3                                                        | Clean-clone run + CI                                                                                                                   |
| A7  | `bun install --frozen-lockfile` exits 0; `bun.lockb` unchanged by the install                                                                                                                    | Clean-clone run                                                                                                                        |
| A8  | `bun run build` exits 0                                                                                                                                                                          | Clean-clone run + CI                                                                                                                   |
| A9  | `wrangler dev` smoke: `/` and `/auth` 200; sign-in works; DM + group threads load; a message sends and appears                                                                                   | Manual smoke on the clean clone (test account if D-3, else dev account)                                                                |
| A10 | Knip exits 0 (no unused deps/exports/files) after W5                                                                                                                                             | `bun x knip` on the branch                                                                                                             |
| A11 | No E2EE claims introduced; no new secrets; `.env` still untracked/ignored; `.env.example` values-free                                                                                            | Grep checks from Phase 0 §6.4, re-run                                                                                                  |
| A12 | No auth/messaging behavior change except the explicitly approved items in §6                                                                                                                     | Diff review + smoke test (A9)                                                                                                          |
| A13 | README setup works from scratch on a clean clone                                                                                                                                                 | W7 verification                                                                                                                        |
| A14 | Gitleaks history scan re-run: no new findings beyond the two ignored                                                                                                                             | Phase 0 scan procedure, v8.30.1                                                                                                        |

---

## 6. Behavior changes requiring separate documented reason + approval

Per the brief, these may not be executed as incidental side effects. Each
needs its reason written down (in the commit message and PR description) and
approval before its commit lands.

**Approval gate:** each B-item is approved separately under §1.1 at its
milestone gate, before its commit lands. The PR description must list which
B-items were approved and which were deferred. Plan approval alone approves
none of them.

| #   | Change                                                                                                             | Workstream   | Reason it needs approval                                               |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------------ | ---------------------------------------------------------------------- |
| B1  | TanStack Query caching semantics (data may be served from cache; refresh changes from full reload to invalidation) | W6 steps 2–4 | Changes what users see and when (staleness windows)                    |
| B2  | Thread `limit` + "load more" (currently unbounded fetch)                                                           | W6 step 5    | Changes what users see (older messages require an action)              |
| B3  | `checkUsernameAvailable` surfaces errors instead of returning `false`                                              | W6 step 5    | Changes signup UX on network failure (error shown vs "taken")          |
| B4  | `createGroup` compensating delete on member-insert failure                                                         | W6 step 6    | Changes failure behavior (no orphaned group)                           |
| B5  | Hook error states surfaced in UI (errors shown where empty lists appeared)                                         | W6 step 5    | Changes what users see on failure                                      |
| B6  | `auth-context.tsx` exhaustive-deps fix (adds `session.user` dependency)                                            | W6 / W8a     | Changes effect re-run behavior in auth bootstrap                       |
| B7  | Deleting the server layer (D-2)                                                                                    | W5           | Removes code a future phase might want; service-role client disappears |
| B8  | Removing `VITE_SUPABASE_PROJECT_ID` from `.env.example`                                                            | W7           | Removes a documented variable (verify unused first)                    |

---

## 7. What Phase 1 explicitly does NOT do

- No E2EE implementation (encryption tests assert pass-through only).
- No Flutter work; no posts/feed, stories, follows, likes, notifications, or
  other product features.
- No unread/presence/1:1-typing implementation (stubs stay stubbed; tests pin
  the stubbed behavior so a future fix is deliberate).
- No server-function / route-loader adoption (S2/S3 deferred; W7 only resolves
  the dead layer's status).
- No `useMutation` migration (Phase 2).
- No CI deployment (deploy stays a manual `wrangler deploy`).
- No Vite config ejection (the `@lovable.dev/vite-tanstack-config` black box
  stays; its opacity is recorded as a known constraint in the risks doc).
- No coverage threshold; no visual-regression, performance, or accessibility
  automation.
- No credential rotation, no history rewrite, no migration changes, no
  Supabase dashboard changes.

---

## 8. Risks and rollback (summary)

Full analysis in `PHASE_1_RISKS.md`. The four risks that most constrain
execution: (R1) PR #1 unmerged — wrong branch base; (R2) the TanStack Query
migration regressing messaging — mitigated by baseline tests first, pilot ordering,
per-commit revert; (R3) Knip false positives deleting live code — mitigated by
report-mode confirmation and the known traps (dynamic import, route entries,
framework string reference); (R4) the mechanical `prettier --write` commit
touching ~28 files — mitigated by diff review and by running tests/build
after it. Global rollback is `git revert` per commit; the branch is never
force-pushed and history is never rewritten.
