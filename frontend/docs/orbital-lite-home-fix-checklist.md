# ORBITAL-Lite Home Fix Checklist

## Baseline Defects Logged

- [ ] Duplicate visual chrome at top (global navbar + dense orbital strip) reduces first-screen task focus.
- [ ] Main three-column grid stretches secondary panels to mission-panel height, leaving large dead zones.
- [ ] Telemetry cards and feed text were too small for fast scanning on normal desktop distance.
- [ ] Operations/feed growth could force excessive page height rather than controlled panel scrolling.
- [ ] Small-screen layout needed stricter overflow guards to avoid horizontal scroll/cutoff risk.
- [ ] Focus visibility inside orbital surfaces needed stronger local contrast.

## Acceptance Criteria

- [ ] Desktop: mission, operations/feed, entities are balanced without large empty stretched columns.
- [ ] Tablet: mission first, then operations, feed, entities in readable stack.
- [ ] Mobile: single-column stack with no horizontal overflow.
- [ ] Global navbar remains primary navigation; orbital top strip is telemetry-only information.
- [ ] Existing Home labels/selectors remain unchanged for analysis workflows.
- [ ] Operations, feed, entities use a unified loading/empty/error pattern.
- [ ] Reduced-motion/E2E mode avoids non-essential high-frequency motion.
- [ ] Keyboard tab path reaches mission controls with visible focus indication.
