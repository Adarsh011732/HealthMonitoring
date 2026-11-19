# Deployment handoff

The prepared production target is Ubuntu 24.04 on EC2, Docker Compose, and Caddy HTTPS. No cloud resources have been created. Confirm the hosting choice, public/private access, domain, and budget before applying Terraform. A private dashboard still needs an authentication layer.

## Values to share in chat

Repository URL, AWS region, whether EC2 already exists, domain (if any), access choice, and budget. Never share token/private-key values in chat.

## GitHub configuration

Create **Settings → Environments → production**. Add these environment secrets directly in GitHub:

| Name | Value |
|---|---|
| DOCKERHUB_USER | Docker Hub username |
| DOCKERHUB_TOKEN | Token permitted to push only the project image |
| EC2_HOST | Server DNS name or fixed public IP |
| EC2_USER | `ubuntu` for the supplied infrastructure |
| EC2_KEY | Dedicated SSH private key for this deployment user |
| SSH_KNOWN_HOSTS | Verified server SSH host-key entry, obtained through your trusted server console and checked against its fingerprint |

Use a public Docker Hub repository named `smart-health`, or preconfigure read-only registry authentication on the server for private images. The workflow does not copy registry credentials to the server.

The CI runner must reach SSH through the configured security group. Standard GitHub-hosted runners have changing IPs. Prefer a runner with static egress and add its CIDR to `ssh_allowed_cidrs`; set the environment variable `DEPLOY_RUNNER` to its label. Do not open SSH to the entire internet merely to make a run succeed. A different deployment transport can be selected once hosting details are known.

## Provisioning (only after cost/region confirmation)

Authenticate the AWS CLI locally using your normal AWS login. Credentials must not be put in Terraform files or committed. Supply existing public `subnet_id`, `vpc_id`, `key_name`, and explicit administrator/runner `ssh_allowed_cidrs` in an ignored `.tfvars` file.

```sh
terraform -chdir=terraform init
terraform -chdir=terraform plan -out=release.tfplan
terraform -chdir=terraform apply release.tfplan
```

This provisions one t3.small EC2 instance, a 20 GB encrypted disk, and an Elastic IP; all can incur charges. Review the plan. Store Terraform state securely and retain it for cleanup. The subnet must already have an Internet Gateway route. Bootstrapping installs Docker and Compose; verify `/var/log/cloud-init-output.log` for completion. No port 3000 is exposed by the security group.

## One-time server setup

The bootstrap creates `/opt/branchline` owned by ubuntu and its `data` directory owned by UID 1000 (the container user). Reconnect after Docker group membership is applied.

Copy `deploy/.env.example` to `/opt/branchline/.env` and `deploy/runtime.env.example` to `/opt/branchline/runtime.env`. Set `SITE_ADDRESS` to your domain and `APP_IMAGE` to your first built `username/smart-health:sha-<40-character-commit>` image. Point DNS at the Elastic IP. Caddy automatically provisions certificates when DNS is correct and ports 80/443 are reachable. For a temporary IP-only HTTP demo, use `SITE_ADDRESS=http://YOUR_IP`; this does not provide HTTPS.

Enter optional secrets **on the server**, using an editor or your secrets manager:

| Runtime variable | Purpose |
|---|---|
| GITHUB_TOKEN | Read-only public repository API access / higher rate limits |
| DISCORD_WEBHOOK_URL | Failure/recovery notifications from the monitoring worker |

```sh
chmod 600 /opt/branchline/runtime.env /opt/branchline/.env
```

Do not put secrets into `NEXT_PUBLIC_*` variables. `runtime.env` must exist even when both optional values are empty. The app is currently public-read-only and explicitly rejects private GitHub repository data.

## Release and recovery

Push a `v*` tag or run the Deploy workflow manually. It tests the app, builds and smoke-tests the actual image, pushes a commit-tagged image, checks the SSH host key, then uploads the deployment files. The server starts a candidate container and verifies it before replacing the active app. If activation fails, it restores the previous app/monitor image and checks health. It records actual outcomes in `data/deployments.jsonl`.

This is a single-host rolling replacement with brief possible downtime, not zero-downtime deployment. Keep previous registry images available. Rollback requires a previously successful image. Candidate failures leave the active deployment running. Releasing the same SHA while it is already running has no distinct prior version to restore.

The worker polls `/health` independently of visitors, persists the last 24 hours of checks, retains 100 incidents, and sends Discord notifications on transitions. The dashboard's **Server monitoring** panel displays that data and real release records. Browser-session metrics and the explicitly labeled example deployment timeline remain separate. This worker shares the host; host-wide outages require an external uptime monitor to detect them.

## Operations

```sh
cd /opt/branchline
docker compose -f compose.yml ps
docker compose -f compose.yml logs --tail=100 app monitor proxy
curl --fail https://YOUR_DOMAIN/health
```

Back up the `data` directory and Caddy volumes, restrict backup access, and keep Terraform state. Logs rotate at 10 MB × 3 files per service. The public operations endpoint exposes service availability and release summaries, never runtime secret values. External credentials, host provisioning, TLS, registry access, and a complete release/rollback rehearsal must be verified before calling this live deployment complete.
