"use client";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Workflow, ArrowUpRight, RefreshCw, LockKeyhole, CircleCheck, CircleAlert } from "lucide-react";
type Run = { name?: string; repository: string; conclusion: string; url: string; updated_at: string };
type State = "loading" | "ready" | "unauthorized" | "session-error" | "error";
export default function PipelineHistory({ repository, sessionState, onRefreshSession }: {
  repository?: string;
  sessionState: "loading" | "authenticated" | "anonymous" | "error";
  onRefreshSession: () => void;
}) {
  const reduced = useReducedMotion();
  const [runs, setRuns] = useState<Run[]>([]);
  const [state, setState] = useState<State>("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setRuns([]);
    setState("loading");
    // Public repository activity needs no account. Account-wide activity must
    // wait for the shared session and refresh when that identity changes.
    if (!repository && sessionState === "loading") return;
    if (!repository && sessionState === "error") { setState("session-error"); return; }
    if (!repository && sessionState === "anonymous") { setState("unauthorized"); return; }
    const controller = new AbortController();
    let inFlight = false;
    async function load() {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await fetch(`/api/pipelines${repository ? `?repo=${encodeURIComponent(repository)}` : ""}`, { credentials: "same-origin", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]), cache: "no-store" });
        if (controller.signal.aborted) return;
        if (response.status === 401) { setRuns([]); setState(sessionState === "authenticated" ? "session-error" : "unauthorized"); return; }
        if (!response.ok) throw new Error("Pipeline request failed");
        const body = await response.json();
        if (!Array.isArray(body.runs)) throw new Error("Invalid response");
        if (!controller.signal.aborted) { setRuns(body.runs); setState("ready"); }
      } catch { if (!controller.signal.aborted) setState("error"); }
      finally { inFlight = false; }
    }
    void load();
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 60000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [retry, repository, sessionState]);
  const refresh = () => { setState("loading"); setRetry(value => value + 1); };
  return <section className="deployments-panel" aria-busy={state === "loading"}>
    <header className="deployments-header"><div><span className="deployment-icon"><Workflow size={20}/></span><div><h2>Pipeline activity</h2><p>Live GitHub Actions and GitHub deployment records.</p></div></div><button onClick={refresh} disabled={state === "loading"} aria-label="Refresh pipeline activity"><RefreshCw size={15}/> Refresh</button></header>
    {state === "loading" ? <div className="deployment-empty" role="status"><RefreshCw size={25}/><h3>Loading pipeline activity</h3><p>Checking for completed workflow runs.</p></div> : state === "session-error" ? <div className="deployment-empty" role="alert"><span className="deployment-state-icon"><CircleAlert size={25}/></span><h3>We couldn't verify your session.</h3><p>Your account check could not be completed. Retry to refresh your session and activity.</p><button className="deployment-primary" onClick={() => { onRefreshSession(); refresh(); }}><RefreshCw size={15}/> Retry session check</button></div> : state === "unauthorized" ? <div className="deployment-empty"><span className="deployment-state-icon"><LockKeyhole size={25}/></span><h3>Your deployment story starts here.</h3><p>Sign in to follow your repositories and see their pipeline results.</p><a className="deployment-primary" href="/login">Sign in to continue <ArrowUpRight size={15}/></a></div> : state === "error" ? <div className="deployment-empty" role="alert"><span className="deployment-state-icon"><CircleAlert size={25}/></span><h3>We couldn’t load pipeline activity.</h3><p>GitHub activity is temporarily unavailable. Try again shortly.</p><button className="deployment-primary" onClick={refresh}><RefreshCw size={15}/> Try again</button></div> : runs.length === 0 ? <div className="deployment-empty"><span className="deployment-state-icon"><Workflow size={27}/></span><h3>No workflow or deployment records.</h3><p>GitHub has no activity to show for this selection. Hosting providers do not always publish deployment records to GitHub.</p><a className="deployment-primary" href="/workspace">Manage repositories <ArrowUpRight size={15}/></a></div> : <div className="deployment-list">{runs.map((run, index) => <motion.article key={`${run.repository}-${run.url}-${index}`} initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : Math.min(index * .04, .3) }}><span className="deployment-run-icon">{run.conclusion === "success" ? <CircleCheck size={20}/> : <CircleAlert size={20}/>}</span><div><h3>{run.name || run.repository}</h3><p>{run.repository} · {new Date(run.updated_at).toLocaleString()}</p></div><span className="deployment-badge">{run.conclusion.replaceAll("_", " ")}</span><a href={run.url.startsWith("https://github.com/") ? run.url : "https://github.com"} target="_blank" rel="noopener noreferrer" aria-label={`View workflow for ${run.repository}`}><ArrowUpRight size={18}/></a></motion.article>)}</div>}
    <footer className="deployments-footer"><span>GitHub · Workflow and deployment results</span><span>Refreshes every minute</span></footer>
  </section>;
}
