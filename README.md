# Veil

Veil is a privacy-first real-time messaging web application: 1:1 and group
chats with media attachments, built on React 19 + TypeScript + TanStack
Start and a Supabase backend (PostgreSQL, Auth, Storage, Realtime).

## Privacy — read this first

Messages are transmitted over an encrypted connection (TLS) and access is
controlled by Supabase Auth and row-level security (RLS) policies, but
**messages are not yet end-to-end encrypted**. Do not describe Veil as
end-to-end encrypted anywhere — in copy, metadata, or documentation — until
a real encryption implementation lands and is verified.

Details: [`docs/audit/SECURITY_AUDIT.md`](docs/audit/SECURITY_AUDIT.md).

## Prerequisites

- [Bun](https://bun.sh) >= 1.2 (the project's only package manager)
- Node.js >= 20

## Setup

```bash
cp .env.example .env
# Fill in the values from the Supabase dashboard (Project Settings -> API)
bun install
```

Never commit `.env` — it is git-ignored. `.env.example` is the values-free
template. The `VITE_*` values are publishable by design (Vite embeds them
in the client bundle); the non-`VITE_*` values are server-side only.

## Development

```bash
bun run dev      # start the dev server
bun run build    # production build (Cloudflare Workers via wrangler)
bun run preview  # preview the production build locally
bun run lint     # eslint
bun run typecheck  # type checking
```

## Documentation

- `docs/audit/` — project audit, feature inventory, security audit,
  architecture recommendation, roadmap, database recommendation.
- `docs/phase-0/PHASE_0_IMPLEMENTATION_PLAN.md` — Phase 0 (security and
  project stabilization) implementation plan.
