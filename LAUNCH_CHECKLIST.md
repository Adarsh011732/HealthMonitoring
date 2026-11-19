# Branchline account setup and launch

## Current implementation

`/login` provides GitHub/Google sign-in. `/` and `/workspace` require a real database-backed session. Saved repositories, notification preferences and pipeline history are selected using the authenticated user ID, never a user ID supplied by the browser. Public repository exploration is still public-data-only: private GitHub access is not implemented. Signing in with Google does not grant GitHub access.

The database and OAuth configuration are deliberately required before sign-in is enabled. There is no fake login or bypass. The repository illustration shown before a repository is connected remains explicitly marked sample. Deployment panels now show recorded GitHub Actions results rather than sample deployments.

## Values you must supply

Add these in Vercel → Branchline → Settings → Environment Variables and in your ignored local `.env.local` for testing. Never paste credentials into chat or commit them.

| Variable | Source |
|---|---|
| DATABASE_URL | Neon PostgreSQL connection string; accept Neon Marketplace terms, provision the free plan and connect it to Branchline |
| BETTER_AUTH_SECRET | A random secret of at least 32 bytes; generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and save directly |
| BETTER_AUTH_URL | Exact production origin, for example the Vercel hostname actually assigned to Branchline; use `http://localhost:3000` locally |
| GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET | GitHub Settings → Developer settings → OAuth Apps → New OAuth App |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | Google Cloud Console → Google Auth Platform → OAuth web application |
| SMTP_USER | Gmail sender account; a dedicated app account is preferable |
| SMTP_APP_PASSWORD | Google App Password for that sender, after enabling 2-Step Verification |
| ALERT_EMAIL_TO | `adarshsingh98635@gmail.com` for the original single-service monitor only |
| GITHUB_TOKEN | Optional read-only token to raise public GitHub API limits; kept server-side |

Register OAuth callback URLs using your real production origin:

- GitHub: `https://YOUR-HOST/api/auth/callback/github`
- Google: `https://YOUR-HOST/api/auth/callback/google`

For local testing create separate OAuth apps/credentials with `http://localhost:3000/api/auth/callback/github` and `/google`. Configure Google's consent audience for external users, publish it when ready, and comply with any verification requirements Google presents. Keep scopes limited to basic identity/email; the app currently reads public repository information only.

## Database setup

After entering DATABASE_URL, run `npm run db:setup`. This applies Better Auth's migration plan and creates workspace tables. Run it against the intended database before deploying; it is not automatically executed on website requests. Back up an existing database before changing its schema.

## Monitoring and email

The web app can run on Vercel. Its background pipeline monitor is a separate continuously running Node process and must run on an always-on host (the existing EC2/Docker host can be used):

`node --env-file=.env.local scripts/pipeline-monitor.mjs`

For Docker, deploy `deploy/pipeline-worker.compose.yml` with your image and protected `runtime.env`, then run `docker compose -f pipeline-worker.compose.yml up -d`. This can run independently of the Vercel frontend. Deploy updated worker images explicitly; the original single-service deployment script does not update this separate Compose project.

It checks saved public repositories every five minutes, stores the latest completed result for each workflow, and sends failure/recovery transitions to each opted-in user's verified login email. It never sends everybody's alerts to the administrator. A PostgreSQL advisory lock prevents two workers running at once. Provider failures are retried next cycle. Email can be duplicated if a process crashes after sending but before recording the result; Gmail does not provide an idempotent-send guarantee.

The original `scripts/monitor.mjs` checks the configured app health URL and uses ALERT_EMAIL_TO. Its metrics represent this application's health, not the health of every saved repository. GitHub Actions success is a pipeline result, not proof that a deployed website is healthy. Arbitrary user-provided health URLs are not fetched by this version.

Gmail credentials stay on the worker host. Website users only choose whether to receive alerts. Gmail quotas apply; delivery has not been tested with real credentials.

## Release checks still requiring your accounts

1. Accept Neon terms, provision/connect PostgreSQL and run `npm run db:setup`.
2. Add OAuth credentials and authentication environment variables, then deploy Branchline.
3. In Vercel Deployment Protection, allow public access to production while keeping preview protection if desired.
4. Verify GitHub and Google sign-in, sign-out, rejected unauthenticated requests, and two separate users saving different repositories.
5. Start the pipeline worker with database/SMTP settings. Opt in using a verified account and exercise a failing workflow followed by success; confirm delivery and history.
6. Confirm mobile login layout and reduced-motion behavior in a browser. Local build/tests do not substitute for this live verification.

No purchase or domain is required by this authentication/Gmail implementation. Real deployment, OAuth redirects, database migrations and email delivery cannot be certified until the account configuration is supplied.
