#!/bin/bash
set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y docker.io docker-compose-v2 curl
systemctl enable --now docker
usermod -aG docker ubuntu
install -d -o ubuntu -g ubuntu -m 750 /opt/branchline
install -d -o 1000 -g 1000 -m 750 /opt/branchline/data
