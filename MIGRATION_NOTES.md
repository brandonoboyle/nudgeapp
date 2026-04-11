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

---
