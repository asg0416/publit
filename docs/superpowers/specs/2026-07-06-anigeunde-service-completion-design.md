# 아니근데 Service Completion Design

Date: 2026-07-06

## Goal

아니근데를 지도 위 익명 생각 서비스로 완성한다. 사용자는 현재 위치나 직접 둘러보는 지도 중심을 기준으로 생각을 보고, 생각을 올리고, 반응하고, 댓글을 달고, 하루 단위로 연장할 수 있다. 운영자는 신고된 생각을 별도 관리자 화면에서 확인하고 숨김, 유지, 삭제 처리할 수 있다.

## Scope

This design covers:

- All visible home-screen buttons behaving predictably.
- Admin report review and moderation actions.
- Radius and map zoom synchronization.
- Real-data hot trend and tag suggestion algorithms.
- Mobile layout stability, keyboard safety, and map touch handling.
- Thought expiration, deletion, and extension.
- Anonymous comments and comment lifecycle.

This design does not add full user accounts, profiles, direct messages, follow graphs, or exact raw coordinate storage.

## Product Model

The core unit remains a `flame` internally for compatibility, but user-facing language is `생각`.

- A thought is visible for one day by default.
- A thought can be extended by its original anonymous device in one-day increments.
- Expired thoughts are deleted from the database, including reactions, reports, and comments through cascading foreign keys.
- Comments are anonymous, short, and deleted with the thought.
- Reactions are one-per-device-per-reaction-type and return clear reacted states.
- Reports never immediately expose reporter information to clients.

## Privacy And Location

The app must keep the existing privacy stance:

- Do not store raw latitude or longitude.
- Do not return raw coordinates from Edge Functions.
- Store only coarse geohash cells.
- Use geohash coverage to approximate radius search.
- Make the visual circle and query coverage use the same radius value so users do not feel the UI lies.

For exact point-in-circle filtering, the current privacy model is intentionally approximate. The improvement is to make geohash coverage conservative enough that if a thought visually appears inside the selected circle, the query has also included that geohash cell.

## Radius Algorithm

Range selection has two inputs:

- Explicit side-button range control.
- Map zoom gesture.

The active radius state is the single source of truth for:

- Map zoom target.
- Visual range circle.
- Nearby Edge Function request body.
- Thought overlay bounds.
- Create location range metadata.

On zoom:

- The map emits live `zoom` camera changes.
- The client maps zoom to the nearest range step.
- The app debounces network refresh but updates visual range immediately.
- Panning disables tracking mode.
- Current-location button re-enables tracking mode and recenters on live device position.

## Data Model

Add the following database fields/tables:

- `flames.expires_at timestamptz`: deletion deadline and user-facing life end.
- `flames.extension_count int`: number of one-day extensions.
- `flame_comments`: anonymous comments tied to a thought.
- `report_reviews`: moderation audit log for admin actions.

`flame_comments` fields:

- `id uuid primary key`
- `flame_id uuid references public.flames(id) on delete cascade`
- `device_hash text`
- `body text check char_length between 1 and 160`
- `status text in ('visible', 'hidden', 'deleted')`
- `created_at timestamptz`

`report_reviews` fields:

- `id uuid primary key`
- `report_id uuid references public.reports(id) on delete cascade`
- `flame_id uuid references public.flames(id) on delete cascade`
- `action text in ('keep', 'hide', 'delete')`
- `admin_note text`
- `created_at timestamptz`

## Edge Functions

Keep all current functions and add:

- `create-comment`: create an anonymous visible comment.
- `get-comments`: fetch visible comments for a thought.
- `extend-flame`: original device extends a live thought by one day.
- `admin-reports`: list report queue with thought summary and report counts.
- `admin-resolve-report`: perform keep/hide/delete action and write audit log.

Update existing functions:

- `expire-flames`: delete rows whose `expires_at <= now()` instead of only marking `expired`.
- `nearby-flames`: include extension metadata and keep reaction summaries.
- `get-hot-topics`: derive hot topics from recent visible `flames`, not only the `topics` table.
- `suggest-tags`: derive suggestions from recent visible `flames` plus local rule suggestions and preserve user-entered tags.
- `react-flame`: keep duplicate protection and return the user's reacted state.
- `report-flame`: keep duplicate protection and queue items for admin review.

Admin functions require `x-admin-token` to match `ADMIN_TOKEN` from Edge Function environment variables. The token is never exposed through `NEXT_PUBLIC_*`.

## UI Architecture

Add an admin route:

- `app/admin/page.tsx`
- `components/admin/AdminReportsClient.tsx`

Home UI changes:

- Detail sheet shows comments, add-comment input, extend button for owner, and report button.
- Reaction buttons remain text-first: `어 나도`, `궁금`, `중립`, `별로`, `관망 중`.
- Add an optional custom reaction later only after schema support; current priority is stable comments and admin moderation.
- Bottom composer remains compact by default and opens the full sheet only for advanced settings.
- Bottom sheet stays anchored to `visualViewport`, max 60% height, and scrolls internally.
- Map/touch area uses CSS touch controls to prevent browser zoom while interacting with the map.

## Trends And Suggestions

Hot trends rank recent visible thoughts by:

- Local geohash match when location is available.
- Recent created time.
- Heat score.
- Comment count.
- Reaction count.
- Extension count.

Tag suggestions rank:

- User input rule matches.
- Recent local matching tags.
- Recent global matching tags.
- Fallback tags when the database is empty.

Suggested tags may be normalized for safety and display consistency, but the tag the user manually submits must remain what the user typed after character cleanup.

## Moderation

Reports have two paths:

- Automatic status escalation when a thought receives enough distinct reports.
- Admin review queue for explicit decision.

Admin actions:

- `keep`: mark thought live/visible again when appropriate and record audit.
- `hide`: set `status = hidden`.
- `delete`: delete the thought row and cascade related rows.

Report handling should be functional before building a polished admin dashboard.

## Testing

Harness tests cover:

- Migration contains comment, extension, and report review schema.
- New Edge Functions exist.
- Admin token is server-only.
- Expire function deletes expired thoughts.
- Trend and suggestion functions query real `flames` data.
- Radius coverage remains conservative.

E2E tests cover:

- Admin report queue renders and action buttons call admin functions.
- Detail sheet reactions show counts and reacted states.
- Comments can be opened, written, and shown.
- Extend button appears for owned thoughts and updates the life label.
- Mobile composer/detail sheet stay within the viewport during keyboard focus.
- Map touch area does not cause document horizontal overflow or layout shake.

## Self-Review

- No raw coordinates are introduced.
- No service-role or admin token is exposed to the browser through public env vars.
- The design splits backend data features from UI polish so changes can be verified in small commits.
- The design answers every requested goal item with a concrete data, API, UI, or test path.
