# Profile and Admin Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate duplicate assets, eliminate indefinite profile metric loading, professionalize the profile/leadership UI, and add explicit support-to-Supabase-Auth linking.

**Architecture:** Keep the existing vanilla HTML/CSS/JS architecture. Move the large leader UI logic into a focused module, make leadership a full-width workspace outside the personal profile grid, query only user-relevant operational data with bounded deadlines, and keep privileged Auth operations in the `leader-admin` Edge Function.

**Tech Stack:** HTML, CSS, browser JavaScript, Node test runner, Supabase Auth/Postgres/Edge Functions.

**Spec:** User request in conversation, 2026-08-18.

## Global Constraints
- Preserve existing business data and IDs.
- Do not expose service-role credentials in the browser.
- Administrative support/Auth changes must be authorized server-side.
- No indefinite loading states.
- Keep one canonical PDF directory and preserve valid files.
- Do not fabricate missing/corrupted training assets.

---

### Task 1: Repository hygiene and broken assets
**Files:** `paginas/menu.html`, `paginas/cadastro.html`, `assets/js/auth-errors.js`, `paginas/ares.html`, `imagens/banners/lojapronta.webp`, `documentos/pdfs/*`
- [ ] Add tests/checks for canonical PDF paths and missing local assets.
- [ ] Consolidate valid PDFs into `documentos/pdfs/`, remove duplicate PDF trees, and replace unavailable assets with disabled UI states.
- [ ] Restore the missing auth error helper, optimize Loja Pronta banner, and remove runtime Google Fonts import.
- [ ] Run `npm run check` and targeted tests.

### Task 2: Profile metrics state machine
**Files:** `assets/js/profile.js`, `assets/js/app-core.js`, `paginas/perfil.html`, `tests/profile-loading-timeout.test.mjs`
- [ ] Add failing tests requiring scoped queries, settled deadlines, and terminal loading states.
- [ ] Render the profile immediately after auth/profile resolution.
- [ ] Query only relevant columns/rows for the current support; use per-source timeout plus `Promise.allSettled`.
- [ ] Add explicit loading/success/partial/error status and retry control for indicators.
- [ ] Bound avatar signed-URL generation and bump static asset versions.

### Task 3: Professional profile and leadership layout
**Files:** `paginas/perfil.html`, `assets/css/profile.css`, `assets/js/leader-workspace.js`, `paginas/perfil-lider.html`
- [ ] Add structural tests for separate full-width leadership workspace.
- [ ] Move leader CSS/JS out of inline HTML.
- [ ] Widen the personal profile layout, reduce sidebar pressure, improve typography/spacing/table behavior, and make leader workspace full width.
- [ ] Replace legacy leader page with a minimal compatibility redirect.

### Task 4: Explicit Auth user linking
**Files:** `supabase/functions/leader-admin/index.ts`, `assets/js/leader-workspace.js`, `paginas/perfil.html`, `supabase/migrations/20260818_auth_support_linking.sql`, tests
- [ ] Add failing tests for `list_auth_users`, `link_auth_user`, and `unlink_auth_user`.
- [ ] Return sanitized Auth users only to validated leaders.
- [ ] Implement link/unlink with duplicate-link validation, profile synchronization, role metadata sync, and audit records.
- [ ] Add a unique partial index for `suportes_sellerpro.user_id` and an index for `sellers.suporte_id`.
- [ ] Add leader UI selectors and link/unlink states.

### Task 5: Regression cleanup and verification
**Files:** `assets/js/gamification.js`, tests, project docs
- [ ] Fix stale streak calculation semantics so the existing gamification test is deterministic.
- [ ] Run `npm test` and `npm run check`.
- [ ] Render the profile in a local mock-auth harness at desktop and mobile widths and inspect screenshots.
- [ ] Package the corrected project ZIP.
