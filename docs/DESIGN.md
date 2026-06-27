# Design

Publit should feel like opening a quiet radar of nearby thoughts, not like entering a feed or chat room.

## Principles

- The first screen is the usable radar, not a marketing page.
- The brand signal is simple: Publit, 지금 이 공간의 불꽃, 반경 500m.
- Flames show tags on the radar; body text appears only in detail.
- Empty states must still feel alive by showing hot tags and a clear first-flame CTA.
- Motion should be slow, ambient, and reduced for `prefers-reduced-motion`.

## Visual System

- Dark base with warm flame accents and restrained cool contrast.
- No one-note purple, beige, espresso, or slate-only palette.
- Circular radar is the primary surface.
- Cards are reserved for repeated items, sheets, dialogs, and individual controls.
- Buttons use at least 40px hit areas and tactile `scale(0.96)` press feedback.
