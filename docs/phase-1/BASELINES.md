# VEIL — Phase 1 baselines (W0)

Recorded 2026-11-18 on branch `phase-1/foundation`, before any Phase 1 change.

## Base

- Branch: `phase-1/foundation` (tracks `origin/phase-1/foundation`)
- Base commit: `b5410d90aae5fa672aaea2ee6a88fbac42f7e633`
  ("Merge pull request #1 from mdsahebdadkhan/phase-0/stabilization")
- PR #1 state: MERGED 2026-11-18T08:51:32Z (merge commit `b5410d9`,
  parents `8ef591a` + `4cb05cd`). D-0 satisfied: Phase 1 branches from
  updated `main` after PR #1 merged (not stacked).
- Phase 0 commits present on the branch (all ancestors of the base):
  `0211db3` (E2EE-claim removal), `0275ff6` (untrack .env),
  `4cb05cd` (Bun-only). Verified with `git merge-base --is-ancestor`.

## Toolchain

- Bun 1.4.4
- Node v24.22.1
- Gitleaks 8.30.1

## Measurements (base commit, before any change)

| Check | Result |
|---|---|
| `bun run lint` | exit 1 — **358 problems (349 errors, 9 warnings)** |
| `bun x tsc --noEmit` | exit 0 |
| `bun run build` | exit 0 (built in 9.97s) |
| `git ls-files` | 106 tracked files |

Lint detail: all 349 errors are `prettier/prettier` (formatting only);
9 warnings are 8× `react-refresh/only-export-components` and
1× `react-hooks/exhaustive-deps` (`auth-context.tsx:75`). No `no-undef`
errors: `process.env` is used in server files
(`client.server.ts:9-10`, `auth-middleware.ts:12-13`) but ESLint's flat
recommended config does not flag it — the W4 node-globals override is a
correctness fix for the config, not a fix for a failing check.

## Notes

- `bun install --frozen-lockfile`: 515 packages, exit 0 (`bun.lockb`
  unchanged). `node_modules/` was absent in the working copy and was
  installed as setup, not as a code change.
- Lint is known-red (358 problems) until M2 (W8a); the M1 gate allows the
  lint job to fail with `continue-on-error` and a dated TODO.
- No application code was modified during W0.
