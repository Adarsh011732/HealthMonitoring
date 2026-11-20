# Final UI recovery — 20 November 2026

Git reflog showed a reset to `backup-master` (`04c3be5`). The finalized overview, chart, picker, and CSS layer were absent from the available commits. This recovery reconstructs those changes; it is not a byte-for-byte checkout of the missing files.

The restored UI keeps the dark monochrome dashboard, compact animated login, larger typography, account settings, native dialog repository picker, and repository-only commit graph. Overview contains application health and recent changes. Services uses measured samples only. Deployments reads GitHub workflows and deployment statuses instead of a simulated release timeline.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 8 passed. Existing Node module-type warnings remain.
- `npm run build`: production build verified; sandbox directory permissions required running outside the sandbox. A later temporary headless-browser file lock was released before rerunning.
- `git diff --check`: passed.
- Headless Chrome: Overview, Services, Settings, Deployments, Repository, and Login rendered. Repository graph/search/inspector present; no duplicate tree on Overview; repository picker opens as a modal; removed login back link absent.
- Desktop 1440×1000 and Services mobile 390×844: no document horizontal overflow.
- All five dashboard sections and Login returned 200. Health returned 200. Signed-out Workspace redirected (307); workspace API returned 401; malformed pipeline repository returned 400.
- Selected public repository returned five real deployment records, visible in the browser.

OAuth completion and signed-in saved-repository selection were not repeated in the isolated browser. Credentials were neither displayed nor modified. Nothing was deployed or pushed during this recovery.

Keep `app/submission-ui.css` after `app/restored-dashboard.css` in the root layout. Preserve native Next.js routes in `app/`; shared UI lives in `components/` and server integrations in `lib/`.

Before accepting another automated rewrite, commit the working version. Compare changes against the recovery checkpoint before reverting specific files; do not use a broad hard reset that discards unrelated work.
