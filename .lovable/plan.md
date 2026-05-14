
# Veil Premium Upgrade — Phased Plan

The full request spans ~6 major feature areas, several of which need new database tables, storage buckets, and RLS policies (groups, media, reactions, blocks, sessions). Shipping it as one mega-change would be risky and slow to review. I'll split it into 3 phases — **Phase 1** is a self-contained shippable upgrade; Phases 2–3 require your approval (and DB migrations) before I start.

---

## Phase 1 — UI polish, navigation, profile (ship now)

No schema changes. Pure frontend / presentation work on top of the existing chats + auth flow.

**Global design system**
- Tighten spacing scale, type hierarchy (display vs body), softer shadows, glass tokens already in `styles.css`.
- Add reusable primitives: `GlassCard`, `PageTransition`, `SkeletonRow`, `OnlinePulse`, `UnreadBadge`.
- Page transitions via `AnimatePresence` in `__root.tsx` keyed by pathname.

**Chat list (`/chats`)**
- Redesigned conversation cards: avatar w/ online pulse, name, last message preview (1 line, truncated), relative timestamp, unread badge.
- Sticky glass header with refined search input (focus glow, clear button).
- Smooth list item enter animations (staggered fade-up).
- Empty state illustration + copy when no chats.
- Floating "New chat" FAB with spring animation.

**Chat thread (`/chat/$peerId`)**
- Sticky glass header with avatar, name, online status, back button.
- Animated message bubbles (spring on send, fade-in on receive).
- Typing indicator (3-dot bounce — already styled in CSS, wire to hook stub).
- Smooth auto-scroll on new message.
- Modernized composer: rounded glass input, attach button (UI only), send button with scale animation.
- Long-press placeholder menu (Reply / Copy / Delete UI only — no backend yet).

**Bottom navigation**
- Floating glass dock, 4 tabs: Chats, Groups, Explore, Profile.
- Animated active pill (`layoutId`) that slides between tabs.
- Visible only on authenticated routes; auto-hides on chat thread.
- Groups + Explore route to placeholder screens with "Coming soon" empty states.

**Profile dashboard (`/profile`)**
- Header card: avatar, @username, display name, bio (read-only for now), edit button.
- Sections rendered as glass cards: Account (edit profile, logout), Appearance (theme toggle — dark only for now, light disabled), Privacy (placeholders), Shared Media (empty state).
- Edit profile modal updates `display_name`, `avatar_url`, `bio` in `users` table (all already exist except `bio` — minor migration).

**Auth page**
- Already polished in previous turn; verify transitions match new page-transition system.

**Micro-interactions**
- Button press scale (`whileTap`).
- Hover glow on interactive cards.
- Skeleton rows during initial chat list load.
- Online dot pulse animation.

**Tiny migration in Phase 1**
- Add `bio TEXT` column to `public.users` (nullable). That's it.

---

## Phase 2 — Group chats (next, needs approval)

Schema work + UI. I'll send the migration for your approval before writing code.

**New tables**
- `groups` (id, name, description, avatar_url, created_by, created_at)
- `group_members` (group_id, user_id, role: 'admin'|'member', joined_at)
- `messages` extended: add nullable `group_id`, make `receiver_id` nullable; index on `(group_id, created_at)`.
- RLS: members can read group messages; only members can send; only admins can add/remove members.

**UI**
- Create group flow (name, avatar, member picker from directory).
- Group chat screen reusing thread UI with group header + member count.
- Group settings page (members list, admin badges, leave group, edit metadata if admin).

---

## Phase 3 — Media sharing, reactions, replies, blocks/sessions (final, needs approval)

**Storage**
- Public bucket `media` with per-user folder RLS.
- Signed URLs for chat attachments.

**Schema**
- `messages.attachments JSONB` (array of {url, type, size, thumbnail}).
- `messages.reply_to_id` (nullable self-FK).
- `message_reactions` (message_id, user_id, emoji).
- `blocked_users` (blocker_id, blocked_id).

**UI**
- Composer: image/video/file picker with preview-before-send, upload progress.
- Bubble: media renderer (images grid, video w/ play button, doc card).
- Fullscreen media viewer with swipe gallery.
- Long-press menu: real Reply (swipe gesture too), Reactions picker, Copy, Delete.
- Profile → Shared Media tab populated from messages.
- Privacy → Blocked users (real list w/ unblock).

**Out of scope for this plan** (too speculative without product input): voice notes recording/playback, push notifications, E2EE rollout, light theme.

---

## Technical notes

- Stack stays as-is: TanStack Start + Router, React 19, Framer Motion, Tailwind, Supabase via existing client.
- All new colors/shadows go through tokens in `src/styles.css` — no hard-coded hex.
- Bottom nav lives in a new `src/routes/_app.tsx` pathless layout; `chats`, `groups`, `explore`, `profile` move under it. Chat thread (`chat.$peerId.tsx`) stays outside the layout so it gets full-screen with no bottom dock.
- Real-time subscriptions stay client-side for now (unchanged from current code); the audit's scalability work is a separate track.
- New files (Phase 1): `src/routes/_app.tsx`, `src/routes/_app.chats.tsx` (move), `src/routes/_app.groups.tsx`, `src/routes/_app.explore.tsx`, `src/routes/_app.profile.tsx`, `src/components/BottomNav.tsx`, `src/components/PageTransition.tsx`, `src/components/GlassCard.tsx`, `src/components/EmptyState.tsx`, `src/components/SkeletonRow.tsx`, `src/components/EditProfileDialog.tsx`.

---

## What I'll do on approval

1. Run the tiny `bio` migration.
2. Implement Phase 1 end-to-end in one pass.
3. Verify in preview at mobile (390px) and desktop widths.
4. Stop and ask before starting Phase 2.

Reply **"go"** to start Phase 1, or tell me which pieces to drop/reprioritize.
