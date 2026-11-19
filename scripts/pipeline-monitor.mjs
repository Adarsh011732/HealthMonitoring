import { MongoClient, ObjectId } from "mongodb";
import { createEmailAlerts } from "./email-alerts.mjs";
if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) throw Error("MONGODB_URI and MONGODB_DB are required");
const client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 3, serverSelectionTimeoutMS: 8000 });
const db = client.db(process.env.MONGODB_DB);
const owner = crypto.randomUUID();
let stopped = false, heartbeat, owned = false;
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => { stopped = true; });
async function github(path) {
  const r = await fetch(`https://api.github.com/repos/${path}`, { headers: { Accept: "application/vnd.github+json", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw Error(`GitHub HTTP ${r.status}`);
  return r.json();
}
try {
  const locks = db.collection("branchline_worker_locks");
  await locks.createIndex({ name: 1 }, { unique: true });
  // Duplicate key means another process owns the unexpired lease.
  await locks.findOneAndUpdate({ name: "pipelines", expiresAt: { $lt: new Date() } }, { $set: { owner, expiresAt: new Date(Date.now() + 90000) } }, { upsert: true });
  owned = true;
  heartbeat = setInterval(async () => {
    try {
      const r = await locks.updateOne({ name: "pipelines", owner }, { $set: { expiresAt: new Date(Date.now() + 90000) } });
      if (!r.matchedCount) { owned = false; stopped = true; }
    } catch { owned = false; stopped = true; }
  }, 20000);
  while (!stopped) {
    for await (const entry of db.collection("branchline_repositories").find({})) {
      if (stopped) break;
      try {
        const user = await db.collection("user").findOne({ _id: ObjectId.isValid(entry.user_id) ? new ObjectId(entry.user_id) : entry.user_id });
        if (!user) continue;
        const preferences = await db.collection("branchline_preferences").findOne({ user_id: entry.user_id });
        const metadata = await github(entry.repository);
        if (metadata.private) { await db.collection("branchline_runs").deleteMany({ user_id: entry.user_id, repository: entry.repository }); continue; }
        const result = await github(`${entry.repository}/actions/runs?status=completed&per_page=30`);
        const seen = new Set();
        for (const run of result.workflow_runs || []) {
          if (seen.has(run.workflow_id)) continue;
          seen.add(run.workflow_id);
          if (!["success", "failure", "timed_out"].includes(run.conclusion)) continue;
          const filter = { user_id: entry.user_id, repository: entry.repository, workflow_id: String(run.workflow_id) };
          const old = await db.collection("branchline_runs").findOne(filter);
          if (old?.run_id === String(run.id)) continue;
          const bad = run.conclusion !== "success";
          const changed = old ? (old.conclusion !== "success") !== bad : false;
          if (stopped || !owned) break;
          if (changed && preferences?.alerts_enabled && user.emailVerified) {
            const send = createEmailAlerts({ ...process.env, ALERT_EMAIL_TO: user.email });
            if (!send) throw Error("Email sender not configured");
            await send({ ok: !bad, time: run.updated_at, repository: entry.repository });
          }
          await db.collection("branchline_runs").updateOne(filter, { $set: { run_id: String(run.id), conclusion: run.conclusion, url: run.html_url, updated_at: new Date() } }, { upsert: true });
        }
      } catch { console.error("Pipeline check failed; retrying next cycle."); }
    }
    for (let n = 0; n < 300 && !stopped; n++) await new Promise(resolve => setTimeout(resolve, 1000));
  }
} finally {
  clearInterval(heartbeat);
  if (owned) await db.collection("branchline_worker_locks").deleteOne({ name: "pipelines", owner }).catch(() => {});
  await client.close();
}
