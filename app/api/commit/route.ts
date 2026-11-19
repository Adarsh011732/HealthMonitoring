export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const repo = params.get("repo") || "",
    sha = params.get("sha") || "";
  if (
    !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo) ||
    !/^[a-f0-9]{7,40}$/i.test(sha)
  )
    return Response.json(
      { error: "Invalid repository or commit SHA." },
      { status: 400 },
    );
  const headers = {
    Accept: "application/vnd.github+json",
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  };
  try {
    const metadata = await fetch(`https://api.github.com/repos/${repo}`, {
      headers,
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 60 },
    });
    if (!metadata.ok)
      throw new Error(`GitHub repository request returned ${metadata.status}.`);
    if ((await metadata.json()).private)
      return Response.json(
        { error: "Private repositories require authentication." },
        { status: 403 },
      );
    const response = await fetch(
      `https://api.github.com/repos/${repo}/commits/${sha}`,
      { headers, signal: AbortSignal.timeout(12000), next: { revalidate: 60 } },
    );
    if (!response.ok)
      throw new Error(
        response.status === 403
          ? "GitHub rate limit reached. Try again later."
          : `Commit request returned ${response.status}.`,
      );
    const c = await response.json();
    return Response.json(
      {
        sha: c.sha,
        message: c.commit.message,
        url: c.html_url,
        stats: c.stats,
        files: (c.files || []).slice(0, 100).map((f: any) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          patch: f.patch || null,
        })),
        truncated: c.files?.length >= 100,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error ? e.message : "Could not load commit changes.",
      },
      { status: 502 },
    );
  }
}
