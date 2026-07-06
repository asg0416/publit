# 아니근데 Service Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete 아니근데's core service features: moderation admin, comments, extension/deletion lifecycle, real-data trends and tag suggestions, radius reliability, and mobile UI stability.

**Architecture:** Keep the existing Next.js App Router frontend and Supabase Edge Function backend. Add schema and Edge Functions in small vertical slices, then wire UI components to those APIs. Preserve coarse geohash privacy and use tests to keep the visual radius, API radius, and mobile layout aligned.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, lucide-react, Supabase Edge Functions, Supabase JS v2, Node test harness, Playwright.

---

## File Structure

- Create migration: `supabase/migrations/<timestamp>_add_comments_extensions_admin_reports.sql`
- Modify shared Edge code: `supabase/functions/_shared/publit.ts`
- Modify shared Supabase Edge helper: `supabase/functions/_shared/supabase.ts`
- Create Edge Functions:
  - `supabase/functions/create-comment/index.ts`
  - `supabase/functions/get-comments/index.ts`
  - `supabase/functions/extend-flame/index.ts`
  - `supabase/functions/admin-reports/index.ts`
  - `supabase/functions/admin-resolve-report/index.ts`
- Modify Edge Functions:
  - `supabase/functions/expire-flames/index.ts`
  - `supabase/functions/get-hot-topics/index.ts`
  - `supabase/functions/suggest-tags/index.ts`
  - `supabase/functions/nearby-flames/index.ts`
  - `supabase/functions/create-flame/index.ts`
- Modify client API: `lib/supabaseClient.ts`
- Modify types: `lib/flame/types.ts`
- Create admin UI:
  - `app/admin/page.tsx`
  - `components/admin/AdminReportsClient.tsx`
- Modify detail UI:
  - `components/flame/FlameDetailSheet.tsx`
  - `components/flame/ReactionBar.tsx`
- Modify map/touch/mobile UI:
  - `components/map/MapBackground.tsx`
  - `components/map/ThoughtOverlay.tsx`
  - `components/ui/BottomSheet.tsx`
  - `components/flame/InlineThoughtComposer.tsx`
  - `app/globals.css`
  - `app/layout.tsx`
- Modify tests:
  - `tests/harness/publit-core.test.ts`
  - `tests/harness/edge-functions-contract.test.ts`
  - `tests/harness/migration-privacy.test.ts`
  - `tests/e2e/flame-detail-actions.spec.ts`
  - `tests/e2e/responsive-layout.spec.ts`
  - Add `tests/e2e/admin-reports.spec.ts`
  - Add `tests/e2e/comments-extension.spec.ts`
  - Add or update `tests/e2e/tracking-mode.spec.ts`

---

## Task 1: Backend Schema And Contracts

- [ ] Add failing harness tests that require comment, extension, and admin-report schema.
- [ ] Create migration with `expires_at`, `extension_count`, `flame_comments`, and `report_reviews`.
- [ ] Update `action_events.action_type` constraint to include `create_comment` and `extend_flame`.
- [ ] Update contract test list to include new Edge Functions.
- [ ] Run `npm run harness:test` and verify the new tests fail before implementation.
- [ ] Commit once the migration and contract tests pass.

Expected verification:

```bash
npm run harness:test
```

## Task 2: Shared Backend Helpers

- [ ] Add comment validation: body trimmed, 1-160 characters.
- [ ] Add admin token assertion using `Deno.env.get('ADMIN_TOKEN')` and `x-admin-token`.
- [ ] Extend rate limit action union to `create_comment` and `extend_flame`.
- [ ] Add response sanitizers for comments and admin report summaries.
- [ ] Add tests for validators and sanitized response shapes.

Expected verification:

```bash
npm run harness:test
```

## Task 3: Comments API

- [ ] Implement `create-comment` with device hash, flame existence check, rate limit, and visible comment insert.
- [ ] Implement `get-comments` with visible comments only and sanitized output.
- [ ] Add client methods `publitApi.createComment` and `publitApi.getComments`.
- [ ] Add E2E route mocks for comments.
- [ ] Commit the comments API slice.

Expected verification:

```bash
npm run harness:test
npm run lint
```

## Task 4: Extension And Deletion Lifecycle

- [ ] Update `create-flame` to set `expires_at` to one day after creation.
- [ ] Implement `extend-flame` so only the original `device_hash` can extend the thought by one day.
- [ ] Update `expire-flames` to delete rows with `expires_at <= now()`.
- [ ] Keep cascade deletion for reactions, reports, comments, and report reviews.
- [ ] Add detail-sheet client API and owned-thought UI state.
- [ ] Commit the lifecycle slice.

Expected verification:

```bash
npm run harness:test
npm run lint
```

## Task 5: Admin Report Review

- [ ] Implement `admin-reports` with token validation and report queue summaries.
- [ ] Implement `admin-resolve-report` with `keep`, `hide`, and `delete`.
- [ ] Create `app/admin/page.tsx` and `components/admin/AdminReportsClient.tsx`.
- [ ] Admin page asks for an admin token, stores it in `sessionStorage`, and sends it as `x-admin-token`.
- [ ] Add Playwright test for report listing and moderation buttons.
- [ ] Commit the admin slice.

Expected verification:

```bash
npm run harness:test
npm run lint
```

## Task 6: Real Data Trends And Tag Suggestions

- [ ] Update `get-hot-topics` to query recent visible rows from `flames`.
- [ ] Include reaction/comment/extension signals when available.
- [ ] Keep `topics` as fallback only.
- [ ] Update `suggest-tags` to query recent visible `flames` and preserve user-entered tag behavior.
- [ ] Add harness assertions that these functions reference `flames`, not only `topics`.
- [ ] Commit the trend/tag slice.

Expected verification:

```bash
npm run harness:test
npm run lint
```

## Task 7: Radius And Map Interaction Hardening

- [ ] Add harness tests for range-to-zoom round trip and geohash coverage growth.
- [ ] Ensure `rangeValue` remains the single source for visual circle and API request.
- [ ] Debounce nearby API calls during zoom while updating the visible radius immediately.
- [ ] Prevent map-area pinch gestures from resizing the browser viewport where CSS allows it.
- [ ] Keep current-location button restoring tracking mode.
- [ ] Commit the radius slice.

Expected verification:

```bash
npm run harness:test
npm run lint
```

## Task 8: Detail Sheet, Reactions, Comments, Extension UI

- [ ] Add comments section to `FlameDetailSheet`.
- [ ] Show reaction counts and pressed state with stable hit areas.
- [ ] Show extension button only for owned active thoughts.
- [ ] Keep modal max height at 60% and internal scroll behavior.
- [ ] Add E2E tests for swipe, comments, reactions, and extension.
- [ ] Commit the detail UI slice.

Expected verification:

```bash
npm run e2e -- --grep "detail|comments|extension"
```

## Task 9: Composer And Mobile Stability

- [ ] Verify bottom composer does not sit under mobile browser chrome.
- [ ] Keep detail composer sheet anchored to `visualViewport`.
- [ ] Ensure tag input taps never hit tone buttons.
- [ ] Remove horizontal overflow on 360px and 390px mobile widths.
- [ ] Add or update responsive Playwright assertions.
- [ ] Commit the mobile stability slice.

Expected verification:

```bash
npm run e2e -- --grep "responsive|mobile"
```

## Task 10: Full Verification And Push

- [ ] Run full lint.
- [ ] Run all harness tests.
- [ ] Run production build.
- [ ] Run all Playwright tests.
- [ ] Commit remaining changes.
- [ ] Push `main` to `origin/main`.

Expected verification:

```bash
npm run lint
npm run harness:test
npm run build
npm run e2e
git push origin main
```

## Self-Review

- Every requested feature maps to at least one task.
- No task requires raw lat/lng persistence.
- Admin secrets stay server-side.
- The plan keeps commits small enough to isolate regressions.
- The first implementation slice starts with backend contracts because later UI depends on those APIs.
