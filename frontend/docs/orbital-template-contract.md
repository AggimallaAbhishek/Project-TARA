# ORBITAL Template Contract (Applied)

## Template Reference
- Source: `/Users/aggimallaabhishek/Documents/Templates/orbital_2.html`
- Usage mode: visual and interaction reference only (not a 1:1 clone)

## Design Tokens Adopted
- Surfaces: `#040709`, `#080e14`, `#0d1620`, `#131e28`
- Border system: teal-tinted borders with weak/strong variants for hierarchy
- Primary accents: `#00c8a0` (teal), `#3898f0` (blue), `#e8a030` (amber), `#e84040` (red)
- Typography roles:
  - Display: `Orbitron`
  - UI/body: `Rajdhani`
  - Mono telemetry/meta: `Share Tech Mono`

## Patterns Kept
- Compact telemetry strip + command header style
- Panelized layout with clear borders and scanable metadata rows
- Dark-first input/button/filter surfaces with consistent states
- Structured list/table density for data-heavy views

## Patterns Explicitly Skipped
- Heavy boot theatrics and startup narrative effects
- Decorative non-domain fiction panels and cinematic clutter
- High-frequency animated loops that hurt readability
- Duplicate nav semantics competing with global navbar

## Accessibility and Motion Rules
- Visible focus ring across all controls on dark backgrounds
- Reduced-motion behavior globally respected via media query
- Motion only for meaningful transitions and feedback
