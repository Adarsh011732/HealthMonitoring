# 🛡️ Smart Deployment Health Monitor

[![CI / CD](https://github.com/Adarsh011732/HealthMonitoring/actions/workflows/ci.yml/badge.svg)](https://github.com/Adarsh011732/HealthMonitoring/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-v24.x-339933?logo=node.js)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker)](https://www.docker.com/)
[![Terraform](https://img.shields.io/badge/Terraform-AWS%20IaC-844FBA?logo=terraform)](https://www.terraform.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **DevOps Deployment Automation & Resilience Control Center**  
> Continuous post-deployment health verification, automated circuit breakers, zero-downtime rollbacks, and instant developer alert dispatches.

---

## 📌 Executive Summary

Modern microservice deployments require rapid detection of runtime failures. **Smart Deployment Health Monitor** (Branchline) continuously verifies application health immediately following release promotions. If newly rolled out candidates fail critical health probes, the integrated **Automated Rollback Engine** instantly trips a circuit breaker, halts the failing container, restores the previous verified release in seconds, and dispatches real-time incident reports to developers via Gmail and Discord.

---

## 🚀 Key Capabilities

### 1. 🔄 Automated Rollback & Canary Verification
- **Continuous Probing**: Evaluates `/health` endpoints with customizable timeout thresholds and retry intervals.
- **Circuit Breaker Engine**: Automatically triggers upon 3 consecutive probe failures or crash loops.
- **Zero-Downtime Rollback**: Instantly switches traffic back to the previous stable release tag in `< 2 seconds`.
- **Interactive Simulator**: Built-in simulator under the **Deployments** tab allows instant demonstration of healthy promotions (v1.4.3) vs automated failure rollbacks.

### 2. 📊 Real-time Microservice Telemetry
- **Latency Spectrum**: Live 30-sample visual response latency bars with `< 50ms` SLA compliance indicators.
- **Resource Profiling**: Real-time RSS and V8 Heap memory consumption telemetry.
- **Audit Trail & CSV Export**: Session inspection history logging timestamps, HTTP status codes, and 1-click CSV download.

### 3. 🌳 Git Commit Topology & Branch Ancestry
- **Interactive Multi-Lane DAG**: SVG commit tree visualizer tracking branches, tags, and merges.
- **Commit Inspector**: Side-by-side patch viewer with file change analytics.
- **Persistent Selection**: Active repository context is preserved across tab transitions and browser refreshes.

### 4. ☁️ Enterprise Infrastructure as Code (Terraform)
- **AWS Cloud Provisioning**: Provisions an EC2 instance (`t3.small`), custom Security Groups (ports 22, 80, 443), Elastic IP, and encrypted 20GB EBS storage.
- **Cloud-Init Bootstrapping**: Automated provisioning of Docker Engine and Docker Compose upon initial boot.

### 5. 🔁 GitHub Actions CI/CD Pipeline
- **Validation Stage**: Linting, type checking, and automated unit testing on every push and pull request.
- **Containerization**: Multi-stage Docker builds optimized with standalone Next.js runtime.
- **Continuous Deployment**: Tag-driven releases (`v*`) deploying to AWS EC2 via verified SSH and automated health checks.

---

## 🏗️ Architecture & Workflow

```
               [ Developer Push / Release Tag (v*) ]
                               │
                               ▼
                   [ GitHub Actions CI/CD ]
                  ┌────────────┴────────────┐
                  ▼                         ▼
         [ 100% Unit Tests ]       [ Multi-Stage Docker ]
                  │                         │
                  └────────────┬────────────┘
                               ▼
                    [ Push to Docker Hub ]
                               │
                      (Secure SSH Deploy)
                               ▼
                   [ AWS EC2 / Production VM ]
                  ┌────────────┴────────────┐
                  ▼                         ▼
            [ Caddy Proxy ]       [ Next.js Container ]
            (Ports 80/443)              (Port 3001)
                                            │
                                  (/health Monitoring)
                                            │
                      ┌─────────────────────┴─────────────────────┐
                      ▼                                           ▼
             [ Health Checks PASS ]                      [ 3 Probes FAIL ]
                      │                                           │
             [ Promote Candidate ]                      [ CIRCUIT BREAKER ]
             (Zero-Downtime Active)                               │
                                                        [ AUTOMATED ROLLBACK ]
                                                        (Restore Last Stable)
                                                                  │
                                                        [ Alert Dispatched ]
                                                        (Gmail SMTP & Discord)
```

---

## 🛠️ Tech Stack

| Domain | Technology |
| :--- | :--- |
| **Frontend & Control Center** | Next.js 16 (App Router), React 19, Motion (Framer), Lucide Icons |
| **Backend & Microservice** | Node.js v24, Express API, Next.js Route Handlers |
| **Authentication & Sessions** | Better Auth, GitHub OAuth, Secure Session Engine |
| **Database & Resilience** | MongoDB Atlas with zero-dependency Local JSON database fallback |
| **Containerization** | Docker, Docker Compose, Multi-stage standalone build |
| **Infrastructure as Code** | HashiCorp Terraform (AWS Provider) |
| **CI / CD Automation** | GitHub Actions (CI & Production Deploy workflows) |
| **Monitoring & Notifications**| Nodemailer (TLS SMTP), Discord Webhooks, Native Fetch |

---

## ⚡ Quick Start (Local Setup)

### 1. Clone & Install
```bash
git clone https://github.com/Adarsh011732/HealthMonitoring.git
cd HealthMonitoring
npm install
```

### 2. Configure Environment
Create `.env.local` by copying the template:
```bash
cp .env.example .env.local
```
*(Configure `GITHUB_CLIENT_ID`, `SMTP_USER`, and `SMTP_APP_PASSWORD` as needed).*

### 3. Run Automated Tests
```bash
npm test
```
All 8 test suites will execute:
- Commit validation & sanitization
- Email alert delivery & TLS security
- Server routing & microservice health endpoints
- Repository ancestry & signal parsing

### 4. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3001](http://localhost:3001)** to view the live dashboard!

---

## ☁️ Infrastructure Deployment (AWS Terraform)

To provision production AWS infrastructure:

```bash
cd terraform
terraform init
terraform plan
terraform apply -var="key_name=your-aws-keypair"
```

Outputs:
- `instance_public_ip`: Elastic Public IP of your production server.
- `app_url`: Ready-to-browse production health monitor link.

---

## 🔐 GitHub Secrets Configuration

For automated CI/CD pipeline deployment to AWS EC2:

| Secret | Description |
| :--- | :--- |
| `DOCKERHUB_USER` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub Personal Access Token |
| `EC2_HOST` | Public IP of the AWS EC2 instance |
| `EC2_USER` | OS username (typically `ubuntu`) |
| `EC2_KEY` | Private SSH key (`.pem`) contents |
| `SSH_KNOWN_HOSTS`| EC2 host SSH fingerprint |
| `DISCORD_WEBHOOK_URL` | Optional Discord channel webhook for incident alerts |

---

## 📡 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Live microservice telemetry (uptime, environment, memory RSS/heap) |
| `GET` | `/api/repository?repo=owner/name` | Fetches branches, commit ancestry graph, and source tree |
| `GET` | `/api/pipelines?repo=owner/name` | GitHub Actions workflow execution history |
| `POST`| `/api/commit` | Verifies commit patches and code changes |
| `GET` | `/api/workspace` | Saved repositories and alert preferences |

---

## 👨‍💻 Project Information

- **Project**: Smart Deployment Health Monitor
- **Course**: CSE DevOps Engineering
- **Author**: Adarsh Singh
- **Repository**: [https://github.com/Adarsh011732/HealthMonitoring](https://github.com/Adarsh011732/HealthMonitoring)
