import { session } from "../../../lib/session";
import { mongoDatabase } from "../../../lib/mongodb";
import { githubPipelines } from "../../../lib/github-pipelines";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const repository = new URL(request.url).searchParams.get("repo");
  if (repository) {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || repository.length > 200) return Response.json({ error: "Invalid repository" }, { status: 400 });
    try { return Response.json({ runs: await githubPipelines(repository) }, { headers: { "Cache-Control": "no-store" } }); }
    catch { return Response.json({ error: "GitHub Actions unavailable. Check repository visibility or try again later." }, { status: 502 }); }
  }
  const s = await session();
  if (!s) return Response.json({ error: "Sign in required" }, { status: 401 });
  try {
    const db = mongoDatabase();
    const repositories = await db.collection("branchline_repositories").distinct("repository", { user_id: s.user.id });
    const results = await Promise.allSettled(repositories.slice(0, 5).map(repo => githubPipelines(String(repo))));
    if (results.length && results.every(result => result.status === "rejected")) throw new Error("GitHub unavailable");
    const rows = results.flatMap(result => result.status === "fulfilled" ? result.value : []).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)).slice(0, 100);
    return Response.json(
      { runs: rows, partial: results.some(result => result.status === "rejected") || repositories.length > 5 },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Pipeline history unavailable" },
      { status: 503 },
    );
  }
}
