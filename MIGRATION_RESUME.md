# Nudge Migration — Resume Guide

Use this document to prompt a new Claude Code session to continue the Svelte → Next.js migration.

## Prompt to paste

> I'm migrating a Svelte app (`/apps/nudge/`) to Next.js (`/apps/nudgeapp/`). Phases 1-7 are complete. I need to continue with Phase 8: Cleanup & Optimization — review MIGRATION_NOTES.md and act on confirmed improvements.
>
> Read these files for full context:
> - `nudgeapp/MIGRATION_PLAN.md` — phase checklist
> - `nudgeapp/MIGRATION_NOTES.md` — deferred optimization observations (add to these, don't act on them until Phase 8)
>
> **Phase 5 status:** Dependencies installed (`codemirror`, `@codemirror/lang-markdown`, `@codemirror/view`, `@codemirror/state`, `@codemirror/language`, `@codemirror/commands`, `@lezer/highlight`, `lucide-react`). `src/components/` directory exists. No component files written yet.
>
> **What to convert (9 components, read from `nudge/src/lib/components/`):**
>
> | Svelte Component | Lines | Key Notes |
> |-----------------|-------|-----------|
> | `ChatMessage.svelte` | 195 | Simple — renders a single chat message with basic markdown→HTML, thinking dots animation |
> | `GoalToast.svelte` | 112 | Simple — fixed-position celebration toast, reads from writingStats + settings stores |
> | `ChatPanel.svelte` | 409 | Medium — streaming chat UI, send/retry, witness mode overlay, auto-scroll |
> | `ExportModal.svelte` | 387 | Medium — modal with checkbox options, generates markdown export, downloads as .md file |
> | `MasterEditor.svelte` | 424 | Medium — CodeMirror 6 editor with gold theme, toolbar (H1-H3, bold, italic), autosave, word count |
> | `CollabEditor.svelte` | 401 | Medium — Nearly identical to MasterEditor but teal-accented, for collaborative folders |
> | `FolderTree.svelte` | 709 | Complex — recursive tree with context menus, inline rename, file upload, drag support. Self-references for recursion. |
> | `TemplateChooser.svelte` | 644 | Complex — 4-step wizard (name → template → project core → depth), uses lucide icons |
> | `Settings.svelte` | 931 | Complex — tabbed modal (Appearance/Writing/Account), theme swatches, font picker, word goal, password change, Paddle checkout, sign out |
>
> **Conversion patterns to follow:**
> - Svelte `$state` → React `useState`
> - Svelte `$derived` → `useMemo` or inline computation
> - Svelte `$effect` → `useEffect`
> - Svelte `onMount`/`onDestroy` → `useEffect` with cleanup
> - Svelte `bind:this` → `useRef`
> - Svelte `bind:value` → controlled input with `onChange`
> - Svelte scoped `<style>` → CSS Modules (`.module.css` files)
> - Svelte `class:name={condition}` → template literal or conditional className
> - `lucide-svelte` → `lucide-react` (same icon names)
> - Store access: `projectStore.xxx` → `useProjectStore(state => state.xxx)` (Zustand hooks in `src/lib/stores/`)
> - Sign out in Settings: Svelte posted to `/auth/signout` — Next.js should use `signOut` from `next-auth/react`
>
> **After Phase 5, remaining phases:**
> - Phase 6: Pages (main app shell `/app`, landing page `/`)
> - Phase 7: Integration & testing
> - Phase 8: Cleanup — review MIGRATION_NOTES.md and act on confirmed improvements

## Files already created in Phases 1-4

```
src/lib/types.ts              — All TypeScript interfaces
src/lib/data/templates.ts      — 6 project templates
src/lib/data/scaffolds.ts      — Folder-aware starter content
src/lib/services/aiService.ts  — Streaming chat client + system prompt
src/lib/services/contextBuilder.ts — AI context assembly
src/lib/services/storageService.ts — localStorage + server sync
src/lib/services/paddleService.ts  — Paddle payment SDK
src/lib/server/db.ts           — PostgreSQL pool
src/lib/server/email.ts        — Resend verification email
src/lib/auth.ts                — NextAuth v5 config
src/lib/stores/projectStore.ts — Zustand project state
src/lib/stores/settingsStore.ts — Zustand settings state
src/lib/stores/uiStore.ts     — Zustand UI state
src/lib/stores/writingStatsStore.ts — Zustand writing stats
src/middleware.ts               — Route guard + security headers
src/app/globals.css            — Design system (4 themes)
src/app/layout.tsx             — Root layout (Lora + Playfair Display)
src/app/(auth)/auth.module.css — Shared auth styles
src/app/(auth)/login/page.tsx
src/app/(auth)/signup/page.tsx + actions.ts
src/app/(auth)/verify-email/page.tsx + actions.ts
src/app/api/auth/[...nextauth]/route.ts
src/app/api/chat/route.ts
src/app/api/projects/route.ts
src/app/api/projects/[id]/route.ts
src/app/api/settings/route.ts
src/app/api/change-password/route.ts
src/app/api/paddle/webhook/route.ts
```
