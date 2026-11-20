# Run and deploy Branchline

Production: https://branchline-rho.vercel.app

## GitHub sign-in configuration

In GitHub Settings → Developer settings → OAuth Apps, open the app matching your configured client ID. Set Homepage URL to `https://branchline-rho.vercel.app` and Authorization callback URL to `https://branchline-rho.vercel.app/api/auth/callback/github`. Changing this OAuth app to production can prevent local OAuth callbacks; use a separate OAuth app for local development if needed.

MongoDB Atlas must allow connections from the hosting environment. If authentication reports a database connection error, check Atlas Network Access and database-user permissions. Never put database credentials in browser variables.

## Docker

The image contains the standalone Next.js server, runs as a non-root user, and includes a health check. Secrets are supplied at runtime and excluded from image build context.

```powershell
docker build -t branchline:latest .
docker compose up -d
docker compose ps
docker compose down
```

Compose uses `.env.local` and opens http://localhost:3001. Set `BETTER_AUTH_URL` in that file to the actual URL used by the browser. Keep the matching OAuth callback configured at the provider.

Push to your Docker Hub repository :

```powershell
docker login
docker tag branchline:latest adarshsingh000/branchline:latest
docker push adarshsingh000/branchline:latest
```

Run the published image later:

```powershell
docker run -d --name branchline --restart unless-stopped -p 3001:3000 --env-file .env.local adarshsingh000/branchline:latest
```

The built local image was smoke-tested on port 3010: `/health` returned 200. Published to Docker Hub as `adarshsingh000/branchline:latest` and `adarshsingh000/branchline:1.0.0`.

## Vercel updates

```powershell
npm ci
npm run typecheck
npm test
npm run build
npx vercel deploy --prod
```

Production environment variables live in Vercel Project Settings → Environment Variables. Redeploy after changing them. Local values remain in ignored `.env.local`.

The web server displays GitHub activity and browser-session health checks. Scheduled email monitoring requires the separate `scripts/pipeline-monitor.mjs` process on an always-running host; Vercel does not run that persistent worker. AWS/Terraform are optional alternatives and are not required for this Vercel deployment.

