"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, GitBranch } from "lucide-react";
export default function RepositoryPicker({ current, busy, onSelect }: { current?: string; busy: boolean; onSelect: (repo: string) => void }) {
  const [repos, setRepos] = useState<string[]>([]);
  const [state, setState] = useState("loading");
  const [query, setQuery] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    void fetch("/api/workspace", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (response.status === 401) { setState("unauthorized"); return; }
      if (!response.ok) throw new Error();
      const body = await response.json();
      setRepos(body.repositories.map((r: { repository: string }) => r.repository)); setState("ready");
    }).catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, [retry]);
  if (state === "loading") return <p role="status">Loading saved repositories…</p>;
  if (state === "unauthorized") return <p><a href="/login">Sign in</a> to choose from your saved repositories.</p>;
  if (state === "error") return <p role="alert">Saved repositories are unavailable. <button onClick={() => setRetry(n => n + 1)}>Try again</button></p>;
  const filtered = repos.filter(r => r.toLowerCase().includes(query.toLowerCase()));
  return <div className="repository-picker"><div className="summary-heading"><h3>Saved repositories</h3><a href="/workspace">Manage <ArrowUpRight size={14}/></a></div>
    <label htmlFor="saved-repo-search">Find a repository</label><input id="saved-repo-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your repositories"/>
    <div className="saved-repo-list">{filtered.map(repo => <button key={repo} disabled={busy} aria-pressed={repo.toLowerCase() === current?.toLowerCase()} onClick={() => onSelect(repo)}><GitBranch size={17}/><span>{repo}</span>{repo.toLowerCase() === current?.toLowerCase() ? <Check size={16}/> : <ArrowUpRight size={16}/>}</button>)}</div>
    {!filtered.length && <p>{repos.length ? "No matching repositories." : "No saved repositories yet. Connect a public repository below."}</p>}
  </div>;
}
