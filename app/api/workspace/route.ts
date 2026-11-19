import { session, sameOrigin } from "../../../lib/session";
import { mongoDatabase } from "../../../lib/mongodb";
export const dynamic = "force-dynamic";
export async function GET() {
  const s = await session();
  if (!s) return Response.json({ error: "Sign in required" }, { status: 401 });
  try {
    const db = mongoDatabase();
    const [repos, prefs] = await Promise.all([
      db.collection("branchline_repositories").find({ user_id: s.user.id }, { projection: { _id: 0, repository: 1, created_at: 1 } }).sort({ created_at: -1 }).limit(100).toArray(),
      db.collection("branchline_preferences").findOne({ user_id: s.user.id }),
    ]);
    return Response.json(
      {
        repositories: repos,
        alertsEnabled: prefs?.alerts_enabled ?? false,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Workspace storage is unavailable. Please try again later." },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "JSON content type required" }, { status: 415 });
  if (Number(request.headers.get("content-length") || 0) > 4096)
    return Response.json({ error: "Request too large" }, { status: 413 });
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  const s = await session();
  if (!s) return Response.json({ error: "Sign in required" }, { status: 401 });
  try {
    const text = await request.text();
    if (text.length > 4096) return Response.json({ error: "Request too large" }, { status: 413 });
    let body;
    try { body = JSON.parse(text); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return Response.json({ error: "Invalid request" }, { status: 400 });
    const db = mongoDatabase();
    if (
      body.action === "preferences" &&
      typeof body.alertsEnabled === "boolean"
    ) {
      if (body.alertsEnabled && !s.user.emailVerified)
        return Response.json(
          { error: "Verify your account email before enabling alerts." },
          { status: 400 },
        );
      await db.collection("branchline_preferences").updateOne({ user_id: s.user.id }, { $set: { alerts_enabled: body.alertsEnabled } }, { upsert: true });
    } else if (
      (body.action === "save" || body.action === "remove") &&
      typeof body.repository === "string" &&
      /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(body.repository) &&
      body.repository.length <= 200
    ) {
      const repository = body.repository.toLowerCase();
      if (body.action === "save") {
        const result = await fetch(
          `https://api.github.com/repos/${repository}`,
          {
            headers: { Accept: "application/vnd.github+json" },
            signal: AbortSignal.timeout(8000),
            cache: "no-store",
          },
        );
        if (!result.ok || (await result.json()).private)
          return Response.json(
            { error: "Enter an accessible public repository." },
            { status: 400 },
          );
        await db.collection("branchline_repositories").updateOne({ user_id: s.user.id, repository }, { $setOnInsert: { created_at: new Date() } }, { upsert: true });
      } else
        await db.collection("branchline_repositories").deleteOne({ user_id: s.user.id, repository });
    } else return Response.json({ error: "Invalid request" }, { status: 400 });
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Could not save changes. Please try again." },
      { status: 503 },
    );
  }
}
