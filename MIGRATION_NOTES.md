# Nudge: Svelte → Next.js Migration Notes

## Optimization & Cleanup Observations

_Observations collected during migration. Do NOT act on these until Phase 8 (final cleanup). More context later in the migration may change whether something actually needs fixing._

### Potential Redundancies
_(things that look duplicated or unnecessary)_

- `storageService.ts`: `loadProjects()` and `fetchProjectsFromServer()` both write to localStorage — the server fetch overwrites whatever `loadProjects()` returned. The dual-write pattern may be intentional (offline fallback) but worth reviewing if the hydration logic in the store already handles this.

### Code Quality
_(patterns that could be simplified, modernized, or made more idiomatic for React/Next.js)_

- `paddleService.ts`: The `openCheckout` function needs an `any` cast to attach customer email to the options object. Paddle's TS types use a complex discriminated union that makes spreads difficult. Worth checking if a newer Paddle SDK version has a cleaner API.
- `storageService.ts`: Every function has a `typeof window === 'undefined'` guard. In Next.js, these client-only functions could be in a file that's only ever imported from client components, making the guards unnecessary. Consider a `'use client'` boundary or moving to a hook pattern.

### Architecture
_(structural improvements worth considering once everything is wired up)_

- The current approach stores projects as JSON blobs in PostgreSQL. This works but means no server-side querying of project content (e.g., search across files). Fine for now, but worth noting if features expand.
- The Svelte login page POSTs directly to Auth.js's callback URL. The Next.js version uses `signIn('credentials', { redirect: false })` for better UX (no full page reload on error, inline error display). This is an improvement, not a regression — but note the behavioral difference.
- Auth page CSS was duplicated across login, signup, and verify-email in Svelte (identical `.page`, `.card`, `.logo-block` etc.). Consolidated into a single shared `auth.module.css` using a `(auth)` route group. Worth checking in Phase 8 that no page needs unique overrides.
- The Svelte version's `hooks.server.ts` had the `isPublicRoute` check duplicated in both `guardHandle` and `securityHeaders`. The Next.js proxy consolidates this into a single `isPublic()` function.
- The in-memory rate limiter in `/api/chat` resets on cold start. Fine for personal/small deployment, but won't work across multiple serverless instances. If scaling up, consider a Redis or DB-backed counter.
- The `change-password` route in Svelte used `new Response(JSON.stringify(...))` — ported to `Response.json(...)` which is cleaner and sets Content-Type automatically.
- The Paddle webhook handler has heavy use of `as Record<string, unknown>` type assertions. If Paddle provides typed webhook event definitions in their SDK, these could be replaced with proper types.
- `projectStore`: The Svelte version mutated state in-place (class with `$state` runes). The Zustand port mutates the current project object then triggers a re-render with `{ projects: [...state.projects] }`. This works but is subtly mutable — in Phase 8, consider whether an immer middleware would be cleaner for the deeply nested folder/file mutations.
- `projectStore`: The `save()` helper captures `state.projects` and `state.currentProjectId` at call time, but `syncProjectToServer` runs 3s later. If the user makes rapid changes, the debounced sync always uses the _latest_ project (via `get()` would be better) — the Svelte version had the same pattern via `this.currentProject`. Worth verifying this doesn't cause stale syncs.
- `writingStatsStore`: The `editorBaselines` and `editorHighWater` maps live outside Zustand state (module-level). This is correct — they're transient per-session tracking that shouldn't trigger re-renders. But it means they won't survive React hot reloads in dev. Acceptable trade-off.
- `uiStore`: The `showNewProjectOverlay` setter was implicit in Svelte (direct assignment). Added an explicit `setShowNewProjectOverlay` method. Check in Phase 5/6 if components need it.

### Phase 7 Observations

- `proxy.ts` was not wired as Next.js middleware — renamed to `middleware.ts` so the auth route protection actually activates. The middleware was correctly written but living at the wrong filename.
- The audit confirmed no client code calls POST on `/api/projects` — project creation is client-side (Zustand + localStorage), then syncs via PUT to `/api/projects/[id]`. The GET endpoint hydrates on load. No missing endpoint.
- Settings sync uses PUT (not POST), which matches the API route handler. No mismatch.
- The `getCurrentProject()` selector pattern in Zustand (`useProjectStore(s => s.getCurrentProject())`) re-evaluates on every state change because the store spreads `projects` on mutation. Functional but could be tightened in Phase 8 with a derived selector.

### Phase 6 Observations

- Landing page is a Server Component (no `'use client'`) — metadata, OG tags, and canonical URL are exported via Next.js `Metadata` API instead of `<svelte:head>`. Scroll/intersection animations are isolated to a tiny `LandingAnimations` client component.
- Landing page uses a `(marketing)` route group to keep it separate from the app without affecting the URL structure.
- App shell uses a server-side `auth()` check in `page.tsx` that redirects to `/login` if unauthenticated, then renders `AppShell` (client component) with `userEmail` as a prop. This replaces Svelte's `+page.server.ts` load function.
- The Svelte version used `$bindable()` for `showSettings`/`showExport` — React version uses `open`/`onClose` callback props (consistent with Phase 5 ExportModal/Settings).
- Sidebar content is extracted as a JSX variable shared between mobile and desktop layouts to avoid duplication. In Svelte this was two separate template blocks.

### Phase 5 Observations

- `MasterEditor` and `CollabEditor` share ~90% of their code (toolbar, CodeMirror setup, autosave, stats tracking). The only differences are theme (gold vs teal), placeholder text, badge label, and H1 token color. In Phase 8, consider extracting a shared `NudgeEditor` component that accepts an `accent` prop.
- `ExportModal` and `Settings` both use `$bindable()` for `open` in Svelte. In React, converted to `open` + `onClose` callback pattern — cleaner prop direction.
- `FolderTree` uses `svelte:window onclick` to close context menus. Ported to a `useEffect` with `window.addEventListener('click', ...)` — same behavior but the cleanup is explicit.
- `Settings` sign-out changed from `<form method="POST" action="/auth/signout">` to `signOut()` from `next-auth/react` — no full page reload, cleaner SPA behavior.

---
