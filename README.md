# Smart Deployment Health Monitor

The project now includes the Branchline Next.js dashboard. Start with [WEBAPP_GUIDE.md](WEBAPP_GUIDE.md) for local development and [DEPLOYMENT.md](DEPLOYMENT.md) for the current production setup, secrets, monitoring, and rollback workflow. The original quick-start notes below describe the earlier Express-only service.

A production-ready Node.js health-check microservice with Docker containerization, AWS Terraform infrastructure, and GitHub Actions CI/CD automation.

---

## 🏗️ Architecture

```
[Git Push / Tag] ──► [GitHub Actions CI/CD]
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
      Build & Push Image           SSH into EC2
              │                           │
              ▼                           ▼
      [ Docker Hub ] ──────────► [ Pull & Run Docker ]
                                          │
                                    Health Check
                                          │
                                          ▼
                                 [ Discord Alert ]
```

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests
npm test

# 3. Start local server with hot-reloading
npm run dev
# Server runs on http://localhost:3001
# Health check: http://localhost:3001/health
```

---

## ☁️ Infrastructure Setup (Terraform)

Provision the AWS EC2 instance and Security Group:

```bash
cd terraform
terraform init
terraform apply -var="key_name=your-ec2-keypair-name"
```

Save the output `instance_public_ip` for your GitHub repository secrets.

---

## 🔐 Required GitHub Secrets

Configure these in your GitHub repository: `Settings` ➔ `Secrets and variables` ➔ `Actions`:

| Secret Name | Description | Example / Format |
| :--- | :--- | :--- |
| `DOCKERHUB_USER` | Docker Hub username | `johndoe` |
| `DOCKERHUB_TOKEN` | Docker Hub Personal Access Token | `dckr_pat_...` |
| `EC2_HOST` | Public IP of the AWS EC2 instance | `54.210.xx.xx` |
| `EC2_USER` | SSH Username for EC2 OS | `ubuntu` |
| `EC2_KEY` | Private SSH key (`.pem`) file content | `-----BEGIN RSA PRIVATE KEY----- ...` |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL (Optional) | `https://discord.com/api/webhooks/...` |

---

## 🚢 Deployment Triggers

- **Production Release:** Push a tag starting with `v` (e.g. `git tag v1.0.0 && git push origin v1.0.0`)
- **Manual Trigger:** Go to **Actions** ➔ **Deploy** ➔ **Run workflow**
# Multi-user launch setup

See [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) for the current authentication, database, Gmail and worker configuration. Credentials and live end-to-end verification are still required before public launch.

