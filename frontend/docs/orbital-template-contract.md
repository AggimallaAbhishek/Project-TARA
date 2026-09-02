# ORBITAL Template Contract (Applied)

## Template Reference
- Source: `/Users/aggimallaabhishek/Documents/Templates/orbital_2.html`
- Usage mode: visual and interaction reference only (not a 1:1 clone)

## Naming
"ORBITAL" is the internal name of this design system. It must never appear in a
user-facing string: the product is TARA. The landing hero, the global navbar,
and the home `h1` all previously rendered it, in one case larger than the
product name itself.

## Design Tokens Adopted
- Surfaces: `#05080b`, `#0b141a`, `#0f1a22`, `#132029`
- Border system: teal-tinted borders with weak/strong variants for hierarchy
- Primary accents: `#2dd4a7` (teal), `#5aa9f5` (blue), `#f0a83c` (amber), `#ff5a5a` (red)
- Text: `#e2ece7` primary, `#a8c0b6` secondary, `#7b978b` muted. `muted` is the
  floor - every value clears 4.5:1 on all four surfaces. Nothing dimmer carries
  text. (The retired `#3a5248` sat at 1.96:1.)
- Typography roles:
  - Display: `Space Grotesk` - headings and the STRIDE keys
  - UI/body: `IBM Plex Sans` - all prose, labels, and controls
  - Mono: `IBM Plex Mono` - data, timestamps, IDs, and status readouts **only**.
    Not a texture for "technical". Plex Sans and Plex Mono share a skeleton, so
    data rows read as part of the system rather than as costume.
- Type scale (the only permitted steps): 12 / 13 / 14 / 16 / 18 / 20 / 24 / 32 /
  42 / 60px. 12px is a hard floor. The previous set clustered seven sizes
  between 10 and 12px, then jumped straight to 32/72/102.

## Patterns Kept
- Compact telemetry strip + command header style
- Panelized layout with clear borders and scanable metadata rows
- Dark-first input/button/filter surfaces with consistent states
- Structured list/table density for data-heavy views

## Patterns Explicitly Skipped
- Heavy boot theatrics and startup narrative effects (a 6-7s boot overlay had
  been added in violation of this line; it and `landingBootUtils` are deleted)
- Decorative non-domain fiction panels and cinematic clutter
- High-frequency animated loops that hurt readability
- Duplicate nav semantics competing with global navbar

## Accessibility and Motion Rules
- Entrance motion animates from an already-visible default. Never
  `initial={{ opacity: 0 }}`: if the motion runtime does not start, the content
  must still be on the page.
- Two-axis grid-line overlays are decoration unless an actual canvas, map, or
  blueprint sits under them. Removed from the hero and the full-page loader.
- Visible focus ring across all controls on dark backgrounds
- Reduced-motion behavior globally respected via media query
- Motion only for meaningful transitions and feedback
