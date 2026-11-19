#!/usr/bin/env bash
set -Eeuo pipefail
cd /opt/branchline
exec 9>.deploy.lock
flock -n 9 || { echo 'Another deployment is running'; exit 1; }
IMAGE="${1:?Image is required}"
SHA="${2:?Commit is required}"
[[ "$IMAGE" =~ ^[a-z0-9_-]+/smart-health:sha-[a-f0-9]{40}$ ]] || exit 2
[[ "$SHA" =~ ^[a-f0-9]{40}$ ]] || exit 2
test -f runtime.env && test -f .env
PREVIOUS=$(sed -n 's/^APP_IMAGE=//p' .env)
test -n "$PREVIOUS" || { echo 'APP_IMAGE must be present in .env'; exit 2; }
test -w data || { echo 'data must be writable by the deployment user and UID 1000'; exit 2; }
START=$SECONDS
record() {
  printf '{"id":"%s-%s","version":"%s","sha":"%s","message":"Release %s","time":"%s","status":"%s","duration":"%ss"}\n' "$SHA" "$(date +%s)" "${SHA:0:7}" "${SHA:0:7}" "${SHA:0:7}" "$(date -u +%FT%TZ)" "$1" "$((SECONDS-START))" >> data/deployments.jsonl
}
healthy() {
 for attempt in {1..30}; do
   if curl -fsS --max-time 5 http://127.0.0.1:3000/health | grep -q '"status":"ok"'; then return 0; fi
   sleep 2
 done
 return 1
}
rollback() {
 trap - ERR
 echo 'Release failed; restoring previous image.'
 if [ -n "$PREVIOUS" ] && [ "$PREVIOUS" != "$IMAGE" ]; then
   if APP_IMAGE="$PREVIOUS" docker compose -f compose.yml up -d app monitor && healthy; then record 'Rolled back'; else record 'Rollback failed'; fi
 else record 'Failed'; fi
 exit 1
}
docker pull "$IMAGE"
# Verify candidate before disturbing the active release.
docker run -d --name branchline-candidate --env-file runtime.env "$IMAGE"
trap 'docker rm -f branchline-candidate >/dev/null 2>&1 || true' EXIT
for attempt in {1..30}; do
 status=$(docker inspect --format '{{.State.Health.Status}}' branchline-candidate)
 [ "$status" = healthy ] && break
 [ "$status" = unhealthy ] && break
 sleep 2
done
if [ "$status" != healthy ]; then record 'Candidate failed'; exit 1; fi
docker rm -f branchline-candidate >/dev/null
trap rollback ERR
APP_IMAGE="$IMAGE" docker compose -f compose.yml up -d app monitor proxy
healthy
sed -i "s|^APP_IMAGE=.*|APP_IMAGE=$IMAGE|" .env
record Healthy
trap - ERR
echo 'Release is healthy.'
