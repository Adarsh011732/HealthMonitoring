# Branchline — Smart Deployment Health Monitor

The confirmed exam title remains **Smart Deployment Health Monitor**. Branchline is the dashboard's visual identity.

## Run locally

Use Node.js 24 and npm. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For an optimized build, run `npm run build` then `npm start`. `npm run start:legacy` runs the original Express API separately (use a different PORT if both run).

## What works

- Next.js App Router and TypeScript dashboard, with Overview, Repository, Services, Deployments, and Settings views.
- Lazy-loaded animated SVG commit tree with Motion: drawn ancestry paths, traveling signals, branch labels, commit selection, pause, and zoom. This replaces the original Three.js scene for readability. The tree renders up to 28 recent commits; the searchable list includes all fetched commits.
- Motion view transitions, responsive sidebar, reduced-motion support, native accessible dialogs, and keyboard-accessible commit selection.
- Public GitHub repository connection: up to 500 branches, 80 default-branch commits plus 20 commits from each of up to seven other branches (deduplicated and capped at 160), and up to 1,000 default-branch tree entries. This is a bounded snapshot, not a complete Git clone.
- Commit inspector: author, date, parent SHAs, changed files, additions/deletions, and expandable GitHub patches. Binary or omitted patches show an explanation. Example patches are labeled illustrative.
- Shareable `?view=repository&repo=owner/repository` URLs restore public repositories. Other people need access to the deployed host; localhost links only work on this machine.
- Actual `/health` endpoint and browser health checks every 30 seconds when visible, response-time chart, session availability, memory, and CSV export. The measured time includes browser/server network round trip.
- Multi-stage standalone Docker image, non-root runtime user, container health check, and Next.js build added to CI.

## Data and security

The initial repository and release timeline are **labeled examples** for an exam walkthrough. Connecting GitHub replaces the repository data only. Deployment details remain illustrative; clicking them does not deploy anything. Graph parent edges use actual parent SHAs for connected repositories.

Optional `GITHUB_TOKEN` in `.env.local` improves public GitHub API rate limits. Never use `NEXT_PUBLIC_GITHUB_TOKEN`, commit a token, or paste credentials into the dashboard. Use a narrowly scoped token. Private repositories are rejected because this version has no user authentication. Do not enable private repo access before adding per-user authentication and authorization.

Checks and samples are held in browser memory and reset on reload. A connected repository is preserved in the page URL. The page is not a background uptime monitor: add a persistent worker and database before presenting historical uptime as production telemetry. No account, cloud instance, or paid resource is created by running this app.

## Container deployment

```sh
docker build -t smart-health:web .
docker run -d --name smart-health -p 3000:3000 --restart unless-stopped smart-health:web
```

The existing GitHub Actions release workflow uses the updated Dockerfile and still targets Docker Hub and EC2. Configure the secrets listed in README.md and ensure Docker is installed on the host. Put HTTPS in front of the application before internet use. The Terraform configuration is still an incomplete original placeholder and must be completed and validated before provisioning. No AWS deployment was executed during this implementation.

## Verification

```sh
npm test
npm run build
npm run typecheck
npm audit
```

The original Express tests are retained. Repository API tests cover validation, GitHub errors, private-repository refusal, and parent-edge preservation with mocked responses. Docker must be installed to validate the container build.

## Next backend milestones

Update: production Compose configuration, persistent monitoring, release records, rollback scripting, and Terraform infrastructure have now been added. Use [DEPLOYMENT.md](DEPLOYMENT.md) as the current deployment runbook. Cloud deployment and the container/rollback rehearsal remain pending environment configuration. The older milestones below describe the remaining broader product roadmap; authentication and external-host monitoring still require additional work.

1. Persistent scheduled monitoring and incidents using a database.
2. Authenticated repository/workspace ownership.
3. Signed deployment events from Actions, actual release history, and rollback execution.
4. Complete Terraform, provision EC2, configure HTTPS, and rehearse the failure/recovery demonstration.

The older generated PDF describes the original Express-only setup; use this guide for the new web app.
