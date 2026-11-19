# GitHub and Google sign-in with MongoDB

The app now uses MongoDB and Better Auth. Demo cookies are no longer accepted. The dashboard remains public; saving repositories and viewing personal pipeline records require a real session.

## Configure locally

Add these server-only values to `.env.local`. Put the same names in Vercel project Environment Variables for deployment. Never prefix them with NEXT_PUBLIC_. Never commit real values.

| Variable | Required | Obtain / format | Verification |
| --- | --- | --- | --- |
| MONGODB_URI | Yes | MongoDB Atlas → Connect → Drivers. Use the supplied mongodb+srv:// URI with a dedicated database user's URL-encoded password. | `npm run db:setup` succeeds. |
| MONGODB_DB | Yes | Choose the database name for this app. Use a dedicated database. | Setup creates workspace indexes there. |
| BETTER_AUTH_SECRET | Yes | Generate locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Keep the resulting 64-character hex secret private. | Auth initializes and session survives reload. |
| BETTER_AUTH_URL | Yes | Exact app origin, e.g. http://localhost:3001 locally; actual HTTPS Vercel URL in production. | OAuth returns to that origin. |
| GITHUB_CLIENT_ID | For GitHub | GitHub Settings → Developer settings → OAuth Apps → New OAuth App. | GitHub button enables. |
| GITHUB_CLIENT_SECRET | For GitHub | Generate a client secret in that OAuth App. | Login returns to workspace. |
| GOOGLE_CLIENT_ID | For Google | Google Cloud Console → Google Auth Platform → OAuth client → Web application. | Google button enables. |
| GOOGLE_CLIENT_SECRET | For Google | Secret from the same OAuth client. | Login returns to workspace. |

At least one complete OAuth provider pair is required. The adapter uses MongoDB transactions: use Atlas or a replica set. Grant the database user access only to the app database, including index creation. Configure Atlas network access for the actual local/deployment clients; do not disable TLS verification.

## Provider URLs

For local port 3001:

- GitHub Homepage: `http://localhost:3001`
- GitHub Authorization callback: `http://localhost:3001/api/auth/callback/github`
- Google Authorized JavaScript origin: `http://localhost:3001`
- Google Authorized redirect URI: `http://localhost:3001/api/auth/callback/google`

Replace the origin with the real HTTPS deployment URL for production. Use separate GitHub OAuth Apps for local and production callbacks. Google allows multiple authorized redirect URIs. Configure Google's consent screen and test users while the application is in testing.

## Start and verify

1. `npm install`
2. `npm run db:setup`
3. Restart the local server after editing environment variables: `npm run dev -- --port 3001`.
4. Open `/login`. Sign in with each configured provider. Confirm return to `/workspace`, save a public repository, reload, then sign out.
5. Confirm `/api/workspace` and `/api/pipelines` return 401 after sign-out. A forged legacy `branchline_session` cookie must not grant access.
6. For production: set variables in Vercel, run database setup against that database from a trusted machine, deploy, and repeat the checks against the deployed origin.

## Pipeline monitoring

`npm run monitor:pipelines` runs the MongoDB worker locally using `.env.local`. On a persistent host use `node scripts/pipeline-monitor.mjs` with injected environment. Run one replica; MongoDB leases reject overlapping workers. The worker needs MONGODB_URI, MONGODB_DB, optional GITHUB_TOKEN for public API rate limits, and SMTP_USER/SMTP_APP_PASSWORD for opted-in users' failure/recovery email. Use a Gmail App Password with two-step verification enabled. Initial scans establish a baseline without emailing old failures.

Email delivery and database state are not atomic; a process crash after delivery can cause a duplicate notification on retry. This remains an operational limitation. The existing PostgreSQL tables, if any, are not automatically migrated. Live OAuth, MongoDB indexes, multi-user isolation and email delivery must be verified with configured services before launch.
