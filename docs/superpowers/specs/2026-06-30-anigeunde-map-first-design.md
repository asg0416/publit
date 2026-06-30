# 아니근데 Map-First Redesign

Date: 2026-06-30

## Goal

Rebrand the existing Publit MVP into 아니근데 without rebuilding the project or renaming every internal concept at once.

아니근데 is a mobile web service where people see nearby anonymous thoughts and tags as cute characters floating over a map-like space. The experience is not chat-first and not feed-first. The first screen is the usable map-first thought surface.

## Approved Visual Direction

The approved direction is based on option B, refined by user feedback:

- Use a full map background across the main viewport.
- Remove decorative grid backgrounds behind the app.
- Keep a white and off-white UI surface system.
- Keep the pixel-inspired feeling, but use thin 1-2px pixel shadows instead of heavy block shadows.
- Use color only for points of attention: tag labels, active range, thought CTA, and same-tag aura.
- Keep the tone cute, kitschy, pixel-inspired, muted, and usable rather than childish.

## Main Screen Structure

The home screen should become a map-first layout:

1. Top hot tag ticker labeled `지금 뜨는 태그`.
2. Service header with `아니근데` and the brand copy `나만 이런 생각한 거 아니었네`.
3. Full background map layer.
4. Custom thought character overlay layer above the map.
5. Range circle and range control.
6. Right-side floating utility buttons.
7. Bottom summary card.
8. Bottom `생각 띄우기` toolbar.

The existing radar should not be deleted as a concept in one sweep. Its particle simulation can be reused to move thought characters and cluster same tags.

## Components

Add or refactor toward these components:

- `components/map/MapBackground.tsx`: background-only MapGlot surface or a safe fallback during local tests.
- `components/map/ThoughtOverlay.tsx`: renders emoji characters, tag flags, glow, and same-tag aura.
- `components/map/RangeControl.tsx`: range selector for 50m, 100m, 300m, 500m, 1km, 3km, 10km, 지역, 전국.
- `components/map/RangeCircle.tsx`: visual range boundary inside the safe overlay area.

Keep compatibility test IDs where useful, and add new thought-oriented IDs:

- Keep `flame-particle` temporarily for existing tests.
- Add `thought-character`.
- Add `thought-map`.
- Add `mapglot-background`.

## Layout Safety

The implementation must prevent overlapping or broken UI:

- Reserve safe areas for ticker, header, right buttons, range control, bottom summary, and bottom toolbar.
- Render characters only inside the remaining overlay bounds.
- Give the map and overlay stable dimensions with responsive `min-height`, `svh`, and fixed control heights.
- Cap tag flag width and use `overflow: hidden`, `text-overflow: ellipsis`, and `white-space: nowrap`.
- Keep interactive buttons at least 40px high.
- Check mobile widths down to 360px.
- Do not place cards inside cards.

## Copy Changes

User-facing copy should move away from flame/fire language:

- `Publit` -> `아니근데`
- `불꽃 띄우기` -> `생각 띄우기`
- `내 불꽃` -> `내 생각`
- `근처 불꽃` -> `근처 생각`
- `지금 뜨거운 불꽃` -> `지금 뜨는 태그`
- `불꽃 상태` -> `생각 분위기`
- `불꽃 강도` -> `생각 크기`
- `반응 온도` -> `반응 열기`
- `불꽃이 모이고 있어요` -> `같은 태그가 모이고 있어요`

Internal names such as `Flame` and Edge Function slugs may remain during the first pass to avoid breaking working behavior.

## Character Model

Use `characterKey` in data and types, not raw emoji values. The UI maps keys to emoji:

- `turtle` -> `🐢`
- `chick` -> `🐥`
- `fox` -> `🦊`
- `dog` -> `🐶`
- `butterfly` -> `🦋`
- `bug` -> `🐛`

If old rows do not have `character_key`, derive a stable fallback from the thought id or tag.

## Data And Privacy

Preserve the current privacy model:

- Do not store raw lat/lng.
- Do not return raw lat/lng, coordinates, exact location, device hash, exact reaction counts, view counts, or user counts.
- Keep existing `flames` table and Edge Function names for compatibility.
- Add only minimal safe fields if needed: `character_key`, `region_code`, `display_scope`.
- Continue using `sanitizeFlameForResponse`.
- MapGlot must be used as a background layer only. Do not use MapGlot markers for thoughts.

## Create Sheet

The bottom sheet becomes `생각 띄우기`:

1. Thought input, max 80 characters.
2. Recommended tags from input.
3. Hot tag chips for the current range.
4. Manual tag input.
5. Mood selector: `조용함`, `궁금함`, `진지함`, `나누고싶음`.
6. Size selector: `작게`, `보통`, `크게`.
7. Character selection or random assignment.
8. Submit button labeled `생각 띄우기`.

The three active slot limit remains in place.

## Testing

Update or add tests for:

- Main screen shows `아니근데`.
- Top ticker shows `지금 뜨는 태그`.
- Main map area is visible.
- Bottom toolbar shows `생각 띄우기`.
- Character emoji plus tag flag renders on the overlay.
- Range choices include `50m`, `500m`, and `전국`.
- Same-tag characters cluster without leaving the safe overlay bounds.
- No exact numeric counts appear in user-facing UI.
- Raw lat/lng is not returned by API response helpers.
- Raw lat/lng columns are not added to migrations.
- Forbidden map SDKs remain absent.
- MapGlot is the only map provider reference.

## Out Of Scope For First Pass

- Full rename of database tables or Edge Function slugs.
- Real user profiles, chat, following, or DMs.
- Exact map markers tied to personal locations.
- Storing movement paths or location history.

## Self-Review

- No TBD or placeholder requirements remain.
- The design keeps existing functionality and privacy constraints.
- The design resolves the visual direction: full map background, white pixel UI, point color only.
- The implementation scope is narrow enough for a single follow-up plan.
