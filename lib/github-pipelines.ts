export async function githubPipelines(repository: string) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || repository.length > 200) throw new Error("Invalid repository");
  const headers = { Accept: "application/vnd.github+json", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
  const options = { headers, signal: AbortSignal.timeout(10000), next: { revalidate: 60 } };
  const metadata = await fetch(`https://api.github.com/repos/${repository}`, options);
  if (!metadata.ok || (await metadata.json()).private) throw new Error("Public repository unavailable");
  const response = await fetch(`https://api.github.com/repos/${repository}/actions/runs?per_page=20`, { ...options, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("GitHub Actions unavailable");
  const body = await response.json();
  return (body.workflow_runs || []).map((run: { name: string; conclusion: string | null; status: string; html_url: string; updated_at: string }) => ({ repository, name: run.name, conclusion: run.conclusion || run.status, url: run.html_url, updated_at: run.updated_at }));
}
