# UI Migration + Cleanup Checklist

## Route groups migrated to shared ORBITAL foundation
- Home (`/`): mission input + operations + entities + feed core panels only
- Data views: history, audit, projects, project detail, compare
- Analysis report: analysis header/charts/version/diagram surfaces
- Entry/support: landing, login, not-found, startup error, error boundary

## Global foundation completed
- Single tokenized dark-first style system in `src/styles.css`
- Unified panel/filter/alert/empty/form/list primitives:
  - `.ui-panel`, `.ui-filter-bar`, `.ui-alert`, `.ui-empty-state`, `.ui-data-list`
- Navbar + app shell aligned to ORBITAL visual direction

## Hard deletion completed
- Deleted empty/obsolete legacy files:
  - `src/components/SystemInputForm.jsx`
  - `src/components/RiskSummary.jsx`
  - `src/components/ThreatTable.jsx`
- Deleted unused legacy sidebar:
  - `src/components/home/HomeSidebar.jsx`
- Deleted non-core Home orbital extras:
  - `src/components/orbital/OrbitalBootSequence.jsx`
  - `src/components/orbital/OrbitalTrackerPanel.jsx`
  - `src/components/orbital/OrbitalDossierPanel.jsx`
  - `src/components/orbital/OrbitalFooter.jsx`

## Regression gates
- Lint
- Unit/component tests
- Playwright E2E
- Production build
