# Nudge: Svelte → Next.js Migration Plan

## Phases

- [x] **Phase 1: Foundation** — Types, data (templates/scaffolds), services, DB config, CSS theme system
- [x] **Phase 2: Auth** — Auth.js Next.js setup, login, signup, verify-email pages
- [x] **Phase 3: API Routes** — Chat (streaming), projects CRUD, settings, change-password, Paddle webhook
- [x] **Phase 4: State Management** — Convert Svelte 5 rune stores to Zustand (project, settings, UI, writingStats)
- [ ] **Phase 5: Components** — ChatPanel, ChatMessage, FolderTree, Editors (Master + Collab), Settings, ExportModal, TemplateChooser, GoalToast
- [ ] **Phase 6: Pages** — Main app shell (`/app`), landing page (`/`)
- [ ] **Phase 7: Integration & Testing** — Wire everything together, test flows end-to-end
- [ ] **Phase 8: Cleanup & Optimization** — Review MIGRATION_NOTES.md, act on confirmed improvements
