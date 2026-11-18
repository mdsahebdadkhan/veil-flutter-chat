# VEIL — Phase 1 Risks

**Purpose:** the risk register for Phase 1. Each risk states its likelihood and
impact (before mitigation), what mitigates it, what happens if it occurs, and
how to roll back. Read with `PHASE_1_IMPLEMENTATION_PLAN.md` (§3 workstreams,
§6 behavior approvals) and `PHASE_1_AUDIT.md` (ground truth).

**Scope note:** risks are about Phase 1 execution only. Product risks (e.g.
"messaging has no E2EE") are recorded in the audit and are out of scope for
this phase by design.

Severity key: **L** likelihood (Low/Medium/High) · **I** impact (Low/Medium/High).

---

## 1. Risk register

### R1 — Phase 1 branched from the wrong base (PR #1 unmerged)

- **Risk:** Phase 1 work starts from pre-Phase-0 `main` and silently drops the
  Phase 0 commits, or stacks on `phase-0/stabilization` and cannot merge until
  PR #1 merges, accumulating rebase churn.
- **L/I:** Medium / High. **Workstream:** W0. **Decision:** D-0.
- **Mitigation:** W0 step 1 verifies `git log main..HEAD` contains the three
  Phase 0 commits before any work; the plan's recommended path is to merge PR
  #1 first.
- **If it occurs:** stop; rebase the Phase 1 branch onto the correct base (or
  recreate it) before writing more code. Work done on the wrong base is
  cherry-picked, not rewritten onto `main`.
- **Rollback:** delete the mis-based branch and recreate it (safe before push;
  after push, leave it and open a corrected branch).

### R2 — TanStack Query migration regresses messaging

- **Risk:** rewriting the realtime merge logic per query introduces stale
  threads, lost messages, or duplicated messages — the app's core function
  breaking silently (hooks currently have no error states, so failures are
  silent by construction).
- **L/I:** Medium / High. **Workstream:** W6. **Decision:** D-1.
- **Mitigation:** baseline tests first (W1 Tier 2 pins every hook's current
  behavior, including its error-blindness); error-state tests land with the
  W6 fixes that introduce the error paths, for the hooks whose fixes were
  approved — W1 does not and cannot cover error paths that do not exist yet.
  Pilot-first ordering (directory → conversations/groups → threads); one hook
  family per commit; `wrangler dev` smoke after each conversion; Realtime kept
  as the invalidation source (no new polling); explicit stop rule — if any
  conversion regresses messaging in smoke testing, revert that commit and do
  not press on.
- **If it occurs:** `git revert` the conversion commit(s); the previous hook
  implementation is restored exactly. Report the regression before retrying.
- **Rollback:** per-commit revert; no history rewrite.

### R3 — Automated dead-code removal deletes live code (Knip false positives)

- **Risk:** Knip (or depcheck/ts-prune) flags something live as unused and it
  gets deleted — the known traps are `emoji-picker-react` (dynamic import),
  route files (file-based routing needs entry-point config), and
  `@tanstack/react-start` (framework entry referenced by a string in
  `wrangler.jsonc`, not an import).
- **L/I:** Medium / High. **Workstream:** W5.
- **Mitigation:** Knip runs in report mode first and must reproduce the survey
  table before any deletion; the three known traps are checked explicitly;
  build + typecheck + tests run after each removal step; deletions are one
  commit per step-group.
- **If it occurs:** `git revert` the removal commit; the files/dependencies
  return exactly (lockfile restores the deps).
- **Rollback:** per-commit revert; everything deleted is recoverable from git
  history.

### R4 — Mechanical `prettier --write` commit obscures a real change

- **Risk:** the formatting commit touches ~28 files; a logic change hidden in
  the diff goes unreviewed, or the reformat itself breaks something subtle
  (e.g. JSX text whitespace).
- **L/I:** Low / Medium. **Workstream:** W8a.
- **Mitigation:** the commit contains formatting only — the diff is reviewed
  to confirm no logic changes; tests + build run immediately after; JSX text
  changes are checked specifically (prettier preserves JSX text semantics, but
  the review verifies it).
- **If it occurs:** `git revert` the format commit; re-apply formatting file
  by file.
- **Rollback:** single-commit revert.

### R5 — Gitleaks ignore file becomes a blind spot (or the scan does not see history)

- **Risk:** the `.gitleaksignore` file for the two known findings is written
  too broadly (a wrong fingerprint, or an extra line added) and a future real
  secret matching it passes CI silently. A second form of this risk: a
  `.gitleaks.toml` is added without `[extend] useDefault = true`, which
  *replaces* the default rules instead of extending them and silently disables
  all default detection. A third form: the workflow scans a shallow checkout,
  or runs an unpinned Gitleaks version, so the history scan is not what the
  plan claims.
- **L/I:** Low / High. **Workstream:** W3.
- **Mitigation:** fingerprint-level matching only (exact commit + file + rule +
  line); exactly two lines in `.gitleaksignore`, one fingerprint per line,
  verified against the Phase 0 report; the ignore file is reviewed in the PR;
  **no `.gitleaks.toml` in Phase 1** — if one is ever added it must start
  with `[extend] useDefault = true` and the scratch-secret test must still
  fail the scan. The scan covers the pushed/PR commit range, so any new
  finding in new commits fails the build. (It does not re-scan full history on
  every push — see plan W3.)
  proposed `gitleaks/gitleaks-action@v8`, a version that does not exist; v8 is
  the CLI version): the workflow uses the official action at v3 (SHA-pinned)
  with `actions/checkout` at `fetch-depth: 0` and `GITLEAKS_VERSION: 8.30.1`
  to pin the CLI. The two known findings are **not** a canary for the CI run:
  a push-triggered run scans only the event's commit range and never encounters
  commit `8062505`, so a green job does not prove the ignore file is correct.
  The ignore file was proven by the independent local verification in M1
  (full-history scan over 92 commits green; control without the file found
  exactly the two known findings; fake JWT failed as expected — see plan W3).
  If the job log shows a CLI version other than 8.30.1, switch to the explicit
  CLI install fallback (plan W3 step 3).
- **If it occurs:** remove the over-broad entry, re-scan history, and treat any
  newly exposed finding as a Phase 0-style STOP-and-report (no rotation,
  no rewrite, no changes without approval).
- **Rollback:** revert the ignore-file/workflow commit; manual scanning resumes.

### R6 — CI becomes a blocker rather than a guard (flaky or misconfigured)

- **Risk:** a flaky job (network-dependent test, Bun setup action breakage,
  Playwright browser download failure) makes CI red for reasons unrelated to
  the code, training reviewers to ignore it or blocking merges.
- **L/I:** Medium / Medium. **Workstream:** W2.
- **Mitigation:** no network-dependent tests in the unit job; all actions
  pinned; Playwright in a separate job that skips (not fails) when test-project
  secrets are absent; `concurrency: cancel-in-progress` to avoid stale runs.
- **If it occurs:** disable the flaky job (not the whole workflow) with a
  dated comment and fix it in a follow-up commit; never merge with a red
  required check by overriding branch protection.
- **Rollback:** revert the workflow commit; checks stop running.

### R7 — Deleting the server layer removes code a later phase needs

- **Risk:** `client.server.ts` / `auth-middleware.ts` / `auth-attacher.ts` are
  deleted in W5, and Phase 2 server-function work has to recreate them from
  memory (including the auth-middleware logic).
- **L/I:** Low / Medium. **Workstream:** W5. **Decision:** D-2.
- **Mitigation:** deletion is a deliberate, approved decision (D-2), not a
  drive-by; git history preserves the files byte-identical
  (`git show <commit>:<path>`); the plan records what the files did and where
  to find them.
- **If it occurs:** restore the files from git history into a new commit.
- **Rollback:** restore-from-history commit; no history rewrite.

### R8 — `.env.example` change exposes a secret's name as a target (misread risk)

- **Status (correction 2026-11-18): this risk is moot for Phase 1 as planned.**
  Phase 1 does **not** add `SUPABASE_SERVICE_ROLE_KEY` to `.env.example`
  (D-2 delete/dormant ⇒ the variable stays out; it is added only if an
  approved, actually-used server feature requires it). The risk below applies
  only if a future approved decision wires a server feature and adds the name.
- **Risk (for that future case):** adding the name is misread as permission to
  put a value there, or a contributor copies a real key into it and commits it.
- **L/I:** Low / High. **Workstream:** W7 (future only).
- **Mitigation:** name only, empty value, with a server-only warning comment;
  Gitleaks in CI (W3) would catch a committed value; the file is reviewed in
  the PR. Never place an actual service-role key value in any file.
- **If it occurs:** treat as a secret incident per the Phase 0 rules — STOP,
  report, do not rotate or rewrite without explicit approval.
- **Rollback:** revert the `.env.example` commit.

### R9 — E2E test project becomes a second production (data/credential sprawl)

- **Risk:** the test Supabase project accumulates real-looking data, its
  credentials spread (local `.env.test`, CI secrets, chat messages), and it
  gets confused with production.
- **L/I:** Low / Medium. **Workstream:** W1 (Tier 4). **Decision:** D-3.
- **Mitigation:** single test account, credentials only in CI secrets and a
  git-ignored local `.env.test`; the test project is named distinctly
  (`veil-test`); the E2E spec uses only that project; no production data is
  ever copied into it.
- **If it occurs:** rotate the test project's keys (test-only, no production
  impact) and re-issue CI secrets.
- **Rollback:** delete the E2E spec and workflow job; Tier 4 is recorded as
  deferred.

### R10 — The `@lovable.dev/vite-tanstack-config` black box blocks a needed change

- **Risk:** Phase 1 needs a Vite/build adjustment (e.g. to fix the
  `routeTree.gen.ts` regeneration, the preview server, or env injection) and
  it cannot be made in-repo — ejecting the config is a large, unplanned
  rewrite.
- **L/I:** Low / Medium. **Workstreams:** W7, W8.
- **Mitigation:** Phase 1 does not eject. The route-tree fix is attempted via
  the two in-repo options (gitignore vs commit regenerated); if neither works,
  the staleness is documented and deferred, not fixed by ejection. The preview
  problem is solved by documenting `wrangler dev`, not by reconfiguring Vite.
- **If it occurs:** record the blocker in the PR and defer ejection to a
  dedicated future decision (it would be its own phase, not a Phase 1
  side-quest).
- **Rollback:** not applicable — no change is made.

### R11 — Scope creep: Phase 1 becomes the product roadmap

- **Risk:** while "in" the hooks, someone implements unread counts, presence,
  1:1 typing, or pagination UI; while "in" CI, someone adds deployment; the
  phase balloons and the foundation never lands.
- **L/I:** Medium / Medium. **All workstreams.**
- **Mitigation:** §7 of the implementation plan lists explicit non-goals;
  each workstream has a "do not" list; the PR review checks scope per commit.
- **If it occurs:** move the out-of-scope work to a follow-up branch (cherry-pick
  or revert from the Phase 1 branch).
- **Rollback:** per-commit revert of the out-of-scope change.

### R12 — Test mock drift (fake Supabase diverges from real behavior)

- **Risk:** the client-boundary fake used in Tier 2 tests encodes wrong
  assumptions (e.g. about chaining order or error shapes); tests pass while
  the real app breaks, or vice versa.
- **L/I:** Medium / Medium. **Workstream:** W1.
- **Mitigation:** keep the fake minimal and driven by actual hook usage; the
  E2E smoke (if D-3 approved) is the backstop against the real backend; the
  fake is reviewed as production-adjacent code, not test trivia.
- **If it occurs:** fix the fake and re-run; a fake fix is a test-code change,
  never a reason to change app code to match the fake.
- **Rollback:** revert the fake change.

### R13 — `bun test` proves insufficient for component tests

- **Risk:** `happy-dom` cannot render a target component faithfully, or Bun's
  runner lacks a needed feature, stalling Tier 3.
- **L/I:** Low / Low. **Workstream:** W1.
- **Mitigation:** the strategy pre-authorizes dropping affected component
  tests to hook/logic level with a comment; switching to Vitest later is a
  one-commit change (same test API shape).
- **If it occurs:** document the blocker per component; do not block the phase
  on a runner migration.
- **Rollback:** remove the affected test file(s).

### R14 — Contributor runs Phase 1 steps out of order

- **Risk:** the data migration (W6) lands before tests (W1), or deps are
  removed before Knip confirmation (W5), removing the safety nets the order
  was designed to provide. A specific form of this risk: W1 tests asserting
  W6 behavior before W6 exists — tests for behavior that does not exist yet,
  which then either fail or force the fix to be smuggled in with the test.
- **L/I:** Medium / Medium. **All workstreams.**
- **Mitigation:** the milestone gates in the plan (§2) are explicit; each
  workstream lists its dependencies; the PR review verifies ordering by commit
  history. The test split is explicit (plan §2, Testing Strategy §3): W1 pins
  the baseline; W6 lands each fix with its tests in the same commit.
- **If it occurs:** stop, complete the skipped prerequisite, then re-verify the
  out-of-order work against it (re-run its verification steps).
- **Rollback:** per-commit revert of the out-of-order work.

### R15 — Plan approval is mistaken for approval of every option and behavior change

- **Risk:** approval of the Phase 1 plan is read as approval of all D-1–D-6
  options, all B1–B8 behavior-sensitive changes, and the PR #1 merge — so a
  behavior change proceeds, or a stacked-PR branch is cut, without the
  separate approval the brief requires.
- **L/I:** Medium / High. **All workstreams.** **Decisions:** D-0–D-6;
  plan §1.1, §6.
- **Mitigation:** plan §1.1 states the boundaries explicitly — plan approval
  authorizes the plan and the non-behavior workstreams only. Each B-item needs
  a separate approval naming the item before its commit lands; the PR
  description must list approved vs deferred B-items. PR #1's merge is the
  user's action (or an explicit stacked-PR choice under D-0).
- **If it occurs:** stop the affected work; obtain the missing approval or
  revert the commit.
- **Rollback:** per-commit revert.

---

## 2. Known constraints (not risks — facts that bound the phase)

| # | Constraint | Consequence for Phase 1 |
|---|---|---|
| C1 | All Vite/build config lives in `@lovable.dev/vite-tanstack-config` | No in-repo Vite changes; ejection is out of scope (R10) |
| C2 | `bunx` binary is not on PATH in this environment | Scripts use `bun x` (e.g. `bun x tsc`, `bun x knip`) |
| C3 | `/tmp` is a 512 MB tmpfs | Verification clones live under `~/workspace`, not `/tmp` (Phase 0 lesson) |
| C4 | `main` has 359 pre-existing lint problems; the gate has never passed | Lint must be fixed mechanically (W8a) before it can guard anything |
| C5 | No test Supabase project exists today | E2E is gated on D-3; without it, verification is unit/integration + manual smoke |
| C6 | The exposed anon key is still unrotated (Phase 0 §4.4, approval-gated) | Phase 1 does not rotate it; rotation remains a separate approval |
| C7 | Every data path is Supabase-native today | Server functions (if ever adopted) must be reserved for web-only or secret-bearing operations, or Flutter compatibility breaks |

---

## 3. Residual risks after Phase 1 (accepted, not fixed)

| # | Residual risk | Why it remains | Next step |
|---|---|---|---|
| RR1 | RLS is the only enforcement layer; no defense in depth if a policy is wrong | Phase 1 does not change RLS or add server checks (out of scope; dashboard/migration changes forbidden) | Phase 2: RLS policy review + server-side verification for sensitive operations |
| RR2 | Media upload validation stays client-only on a public bucket | Tightening needs Storage policies or server-side validation (Phase 2) | Phase 2: Storage policy review; consider signed URLs |
| RR3 | No E2EE; messages are plaintext at rest in Supabase | Explicitly out of Phase 1 | Future phase: real E2EE design (never claim it before it exists) |
| RR4 | Unread/presence/typing stay stubbed | Product work, not foundation | Future phase, with product decisions |
| RR5 | `vite preview` stays broken (documented, not fixed) | Fixing it means reconfiguring the build (C1) | Revisit if the Vite config is ever ejected |
| RR6 | No coverage threshold; no visual/perf/a11y automation | Deliberately deferred (see Testing Strategy §8) | Phase 2: threshold from real coverage data |

---

## 4. Global rollback strategy

- **Per-commit revert.** Every workstream lands as its own commit (plan §4).
  A failed workstream is reverted with `git revert <commit>` (or a revert range
  for a multi-commit workstream). Reverts are themselves reviewed commits.
- **Never force-push, never rewrite history.** A bad commit is reverted, not
  erased. The branch history stays an honest record of what was tried.
- **Branch-level rollback.** If the Phase 1 branch becomes unrecoverable, it
  is abandoned (left open, never merged) and a new branch is cut from the same
  base. Work is cherry-picked from the abandoned branch commit by commit.
- **CI-level rollback.** A broken workflow is disabled by reverting its commit
  (checks stop running); a broken ignore-file entry is removed the same way.
- **Secret incident rollback.** If a genuine secret is discovered at any point
  (in code, in CI logs, in a commit): **STOP**, report with rule ID / file /
  commit / line only (never the value), and wait for explicit instructions. No
  rotation, no history rewrite, no deletion without approval — the Phase 0
  rules still apply.
