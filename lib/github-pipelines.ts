export async function githubPipelines(repository: string) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || repository.length > 200) throw new Error("Invalid repository");
  const headers = { Accept: "application/vnd.github+json", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
  const options = { headers, signal: AbortSignal.timeout(10000), next: { revalidate: 60 } };
  const metadata = await fetch(`https://api.github.com/repos/${repository}`, options);
  if (!metadata.ok || (await metadata.json()).private) throw new Error("Public repository unavailable");
  const response = await fetch(`https://api.github.com/repos/${repository}/actions/runs?per_page=20`, { ...options, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("GitHub Actions unavailable");
  const body = await response.json();
  const runs: { repository: string; name: string; conclusion: string; url: string; updated_at: string }[] = (body.workflow_runs || []).map((run: { name: string; conclusion: string | null; status: string; html_url: string; updated_at: string }) => ({ repository, name: run.name, conclusion: run.conclusion || run.status, url: run.html_url, updated_at: run.updated_at }));
  const deployments = await fetch(`https://api.github.com/repos/${repository}/deployments?per_page=5`, { ...options, signal: AbortSignal.timeout(10000) });
  if (!deployments.ok) throw new Error("GitHub deployment history unavailable");
  const records: { id: number; environment: string; updated_at: string }[] = await deployments.json();
  const statuses = await Promise.all(records.map(async deployment => {
    const response = await fetch(`https://api.github.com/repos/${repository}/deployments/${deployment.id}/statuses?per_page=1`, { ...options, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return { repository, name: `Deployment · ${deployment.environment}`, conclusion: "status_unavailable", url: `https://github.com/${repository}/deployments`, updated_at: deployment.updated_at };
    const states = await response.json();
    return { repository, name: `Deployment · ${deployment.environment}`, conclusion: states[0]?.state || "pending", url: `https://github.com/${repository}/deployments`, updated_at: states[0]?.updated_at || deployment.updated_at };
  }));
  return [...runs, ...statuses].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
}
