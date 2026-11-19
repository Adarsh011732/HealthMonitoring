import type { Commit } from "../../../lib/repository";
export const dynamic = "force-dynamic";
async function github(path: string) {
  const response = await fetch(`https://api.github.com/repos/${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
    signal: AbortSignal.timeout(12000),
    next: { revalidate: 60 },
  });
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "Repository not found. Enter the name of a public GitHub repository."
        : response.status === 403 || response.status === 429
          ? "GitHub rate limit reached. Try later or configure a server token."
          : `GitHub returned ${response.status}.`,
    );
  return response.json();
}
export async function GET(request: Request) {
  const input = new URL(request.url).searchParams
    .get("repo")
    ?.trim()
    .replace(/^https:\/\/github.com\//, "")
    .replace(/\/$/, "");
  if (!input || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(input))
    return Response.json(
      { error: "Enter a GitHub repository as owner/repository." },
      { status: 400 },
    );
  try {
    const repo = await github(input);
    if (repo.private)
      return Response.json(
        {
          error:
            "Private repositories require user authentication, which is not enabled in this version. Use a public repository.",
        },
        { status: 403 },
      );
    let branches: any[] = [];
    let more = false;
    for (let page = 1; page <= 5; page++) {
      const batch = await github(`${input}/branches?per_page=100&page=${page}`);
      branches.push(...batch);
      if (batch.length < 100) break;
      if (page === 5) more = true;
    }
    const [raw, tree] = await Promise.all([
      github(`${input}/commits?per_page=80`),
      github(
        `${input}/git/trees/${encodeURIComponent(repo.default_branch)}?recursive=1`,
      ),
    ]);
    const extraBranches = branches
      .filter((b) => b.name !== repo.default_branch)
      .slice(0, 7);
    const histories = await Promise.all(
      extraBranches.map((b) =>
        github(
          `${input}/commits?sha=${encodeURIComponent(b.name)}&per_page=20`,
        ),
      ),
    );
    const unique = new Map<string, any>();
    [raw, ...histories].flat().forEach((c) => {
      if (!unique.has(c.sha)) unique.set(c.sha, c);
    });
    const combined = [...unique.values()]
      .sort(
        (a, b) =>
          new Date(b.commit.author?.date || 0).getTime() -
          new Date(a.commit.author?.date || 0).getTime(),
      )
      .slice(0, 160);
    const commits: Commit[] = combined.map((c: any) => ({
      sha: c.sha,
      message: c.commit.message.split("\n")[0],
      author: c.commit.author?.name || "Unknown",
      date: c.commit.author?.date,
      parents: c.parents.map((p: any) => p.sha),
      lane: 0,
    }));
    // Place non-first-parent ancestry on separate lanes; never invent merge edges.
    const lanes = new Map<string, number>();
    extraBranches.forEach((b, i) => lanes.set(b.commit.sha, i + 1));
    const defaultTip = branches.find((b) => b.name === repo.default_branch)
      ?.commit.sha;
    if (defaultTip) lanes.set(defaultTip, 0);
    let nextLane = extraBranches.length + 1;
    for (const c of commits) {
      c.lane = lanes.get(c.sha) ?? 0;
      c.parents.forEach((p, i) => {
        if (!lanes.has(p)) lanes.set(p, i === 0 ? c.lane : nextLane++);
      });
    }
    return Response.json(
      {
        name: repo.full_name.replace("/", " / "),
        description: repo.description || "Connected GitHub repository",
        url: repo.html_url,
        defaultBranch: repo.default_branch,
        branches: branches.map((b) => ({
          name: b.name,
          sha: b.commit.sha,
          protected: b.protected,
        })),
        commits,
        files: (tree.tree || [])
          .slice(0, 1000)
          .map((f: any) => ({ path: f.path, type: f.type })),
        fetchedAt: new Date().toISOString(),
        truncated: more || tree.truncated || tree.tree?.length > 1000,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to contact GitHub.",
      },
      { status: 502 },
    );
  }
}
