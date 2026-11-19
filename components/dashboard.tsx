"use client";

import { useEffect, useRef, useState } from "react";
import { createAuthClient } from "better-auth/react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Activity, ArrowUpRight, GitBranch, Layers, LayoutDashboard, Settings2, UserRound } from "lucide-react";
import type { Repository } from "../lib/repository";
import RepositoryGraph from "./repository-graph";
import CommitInspector from "./commit-inspector";
import PipelineHistory from "./pipeline-history";

const sections = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Repository", icon: GitBranch },
  { name: "Services", icon: Activity },
  { name: "Deployments", icon: Layers },
  { name: "Settings", icon: Settings2 },
] as const;
const auth = createAuthClient();

type Health = { status: string; timestamp: string; uptime: number };

export default function Dashboard({ initialTab = "Overview" }: { initialTab?: string }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const { data: account, isPending: sessionPending } = auth.useSession();
  const requestVersion = useRef(0);
  const [tab, setTab] = useState(initialTab);
  const [input, setInput] = useState("");
  const [repository, setRepository] = useState<Repository | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState("");
  const [reset, setReset] = useState(0);
  const [connect, setConnect] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [checks, setChecks] = useState({ total: 0, passed: 0 });

  useEffect(() => {
    const segment = pathname.split("/")[2] || "overview";
    setTab(sections.find(section => section.name.toLowerCase() === segment)?.name || "Overview");
  }, [pathname]);
  useEffect(() => {
    let repo = new URLSearchParams(window.location.search).get("repo");
    if (!repo) { try { repo = sessionStorage.getItem("branchline.repository"); } catch {} }
    if (repo) { setInput(repo); void loadRepository(repo); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function check() {
      try {
        const started = performance.now();
        const response = await fetch("/health", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setHealth(await response.json());
        setLatency(Math.round(performance.now() - started));
        setChecks(value => ({ total: value.total + 1, passed: value.passed + 1 }));
        setHealthError("");
      } catch (cause) {
        if (!controller.signal.aborted) setHealthError(cause instanceof Error ? cause.message : "Health check unavailable");
        if (!controller.signal.aborted) setChecks(value => ({ ...value, total: value.total + 1 }));
      }
    }
    void check();
    const timer = window.setInterval(() => { if (!document.hidden) void check(); }, 30000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);

  async function loadRepository(value: string) {
    const version = ++requestVersion.current;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/repository?repo=${encodeURIComponent(value.trim())}`, { cache: "no-store" });
      const body = await response.json();
      if (version !== requestVersion.current) return;
      if (!response.ok) throw new Error(body.error || "Repository unavailable");
      setRepository(body);
      setConnect(false);
      setSelected(body.commits[0]?.sha || "");
      const params = new URLSearchParams(window.location.search);
      params.set("repo", body.name.replace(/\s/g, ""));
      try { sessionStorage.setItem("branchline.repository", body.name.replace(/\s/g, "")); } catch {}
      window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
    } catch (cause) {
      if (version === requestVersion.current) setError(cause instanceof Error ? cause.message : "Repository unavailable");
    } finally { if (version === requestVersion.current) setLoading(false); }
  }

  function navigate(name: string) {
    setTab(name);
    const params = new URLSearchParams(window.location.search);
    window.history.pushState(null, "", `/dashboard/${name.toLowerCase()}${params.size ? `?${params}` : ""}`);
  }

  const selectedCommit = repository?.commits.find((commit) => commit.sha === selected);
  const metrics = [
    { title: "Application health", value: healthError ? "Unavailable" : health ? "Operational" : "Checking…", note: "Verified against /health", icon: Activity },
    { title: "Response time", value: latency === null ? "—" : `${latency} ms`, note: "Latest browser-to-app check", icon: Activity },
    { title: "Repository branches", value: repository ? String(repository.branches.length) : "—", note: repository ? `${repository.defaultBranch} is the default branch` : "Connect a repository to begin", icon: GitBranch },
    { title: "Checks passing", value: checks.total ? `${(100 * checks.passed / checks.total).toFixed(1)}%` : "—", note: `${checks.total} checks in this session`, icon: Activity },
  ];
  return <main className="production-dashboard">
    <header className="production-header">
      <div className="restored-breadcrumb">Workspace <span>›</span> <strong>{tab}</strong></div>
      <div className="restored-top-right"><span>Smart Deployment Health Monitor</span>{sessionPending ? <span role="status">Checking account…</span> : account?.user ? <a className="dashboard-account" href="/workspace" aria-label="Open your account"><UserRound size={17}/><span>{account.user.name.split(" ")[0]}</span></a> : <a href="/login">Sign in <ArrowUpRight size={14} /></a>}</div>
    </header>
    <div className="production-layout">
      <nav aria-label="Dashboard sections" className="production-nav">
        <a href="/dashboard" className="restored-brand"><GitBranch size={30} /> branchline.</a>
        <a href="/workspace" className="restored-workspace"><span>W</span><div>My workspace<small>Personal project</small></div><span>⌄</span></a>
        <span className="restored-nav-label">WORKSPACE</span>
        {sections.map(({ name, icon: Icon }) => <motion.button key={name} type="button" whileTap={reduced ? {} : { scale: .98 }} aria-current={tab === name ? "page" : undefined} onClick={() => navigate(name)}>{tab === name && <motion.span className="nav-active-surface" layoutId="active-navigation" transition={{ duration: reduced ? 0 : .24, ease: [.22, 1, .36, 1] }} />}<Icon size={18} /><span>{name}</span></motion.button>)}
        <div className="restored-sidebar-bottom"><div className="restored-monitor">● {healthError ? "Monitor unavailable" : health ? "Monitor is online" : "Connecting monitor"}<small>Next check every 30 seconds</small></div><a href="/workspace">Manage account <ArrowUpRight size={14} /></a></div>
      </nav>
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }} className="production-content">
        <div className="restored-hero"><div className="production-heading"><span>YOUR DEPLOYMENTS, IN PERSPECTIVE</span><h1>{tab === "Overview" ? "A clear view. A confident deploy." : tab}</h1><p>Follow your code from the first commit to a healthy deployment.</p></div><motion.button whileTap={reduced ? {} : { scale: .97 }} className="restored-connect" aria-expanded={connect} onClick={() => { if (tab !== "Overview" && tab !== "Repository") { navigate("Repository"); setConnect(true); } else setConnect(!connect); }}>＋ Connect repository</motion.button></div>
        {(tab === "Overview" || tab === "Repository") && <>
          <div className="restored-status"><strong>● {repository ? "CONNECTED WORKSPACE" : "YOUR WORKSPACE"}</strong><span>{repository ? repository.name : "Connect a repository to explore its branches and commits."}</span><button onClick={() => setConnect(true)}>Bring your own repo →</button></div>
          <motion.div className="restored-metrics" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : .08 } } }}>{metrics.map(({ title, value, note, icon: Icon }, index) => <motion.article key={title} variants={{ hidden: { opacity: 0, y: reduced ? 0 : 14 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: .4, ease: [.22, 1, .36, 1] }} whileHover={reduced ? {} : { y: -3 }}><span>{title}<Icon size={15} /></span><AnimatePresence mode="wait" initial={false}><motion.strong key={value} initial={{ opacity: 0, y: reduced ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}>{value}</motion.strong></AnimatePresence><small>{note}</small><svg className="metric-decoration" viewBox="0 0 70 32" aria-hidden="true"><motion.path d={index === 2 ? "M6 28L30 16L60 8M30 16V2" : index === 3 ? "M15 16L27 27L53 3" : "M0 21H12L18 6L26 28L34 15L41 21H70"} fill="none" stroke="currentColor" strokeWidth="1.4" initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: .8, delay: index * .1 }} /></svg></motion.article>)}</motion.div>
          <AnimatePresence>{connect && <motion.section key="connect" className="production-card connect-panel" initial={{ opacity: 0, y: reduced ? 0 : -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -6 }} transition={{ duration: .22 }}>
            <h2>Explore a GitHub repository</h2>
            <p>View public branches, commit ancestry, and changed files from GitHub.</p>
            <form onSubmit={(event) => { event.preventDefault(); void loadRepository(input); }} className="production-form">
              <label htmlFor="repository-input">Repository</label>
              <input id="repository-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="owner/repository" required maxLength={200} pattern="[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+" />
              <button type="submit" disabled={loading}>{loading ? "Loading…" : "Load repository"}</button>
            </form>
            {error && <p role="alert" className="production-error">{error}</p>}
            {loading && <p role="status">Loading branches and commits…</p>}
          </motion.section>}</AnimatePresence>
          {repository ? <>
            <section className="production-card"><div className="production-row"><div><span className="production-label">REPOSITORY MAP</span><h2>{repository.name}</h2><p>{repository.description || "No repository description provided."}</p></div><a href={repository.url} target="_blank" rel="noopener noreferrer">Open on GitHub <ArrowUpRight size={16} /></a></div>
              <div className="production-stats"><div><strong>{repository.branches.length}</strong><span>branches</span></div><div><strong>{repository.commits.length}</strong><span>recent commits</span></div><div><strong>{repository.files.length}</strong><span>files shown</span></div></div>
              {repository.truncated && <p role="status">GitHub history or file list was truncated. Open GitHub for the complete record.</p>}
            </section>
            <div className="production-columns"><section className="production-card"><div className="production-row"><h2>Commit tree</h2><button type="button" onClick={() => setReset((value) => value + 1)}>Reset view</button></div>{repository.commits.length ? <RepositoryGraph commits={repository.commits} selected={selected} onSelect={setSelected} paused={false} reset={reset} branches={repository.branches} /> : <p>No commits returned by GitHub.</p>}</section><CommitInspector repo={repository} commit={selectedCommit} /></div>
          </> : !loading && <section className="production-card"><h2>No repository selected</h2><p>Enter a public repository above or open one from <a href="/workspace">your workspace</a>.</p></section>}
        </>}
        {tab === "Services" && <section className="production-card"><h2>Application health</h2>{healthError ? <p role="alert">Health check failed: {healthError}</p> : health ? <div className="production-stats"><div><strong>{health.status}</strong><span>status</span></div><div><strong>{Math.floor(health.uptime / 60)} min</strong><span>instance uptime</span></div><div><strong>{new Date(health.timestamp).toLocaleTimeString()}</strong><span>last checked</span></div></div> : <p role="status">Checking application health…</p>}<p>Instance uptime is for the responding server, not a service availability guarantee.</p></section>}
        {tab === "Deployments" && <PipelineHistory repository={repository?.name.replace(/\s/g, "")} />}
        {tab === "Settings" && <section className="production-card"><h2>Workspace settings</h2><p>Manage saved repositories and email alert preferences in your workspace.</p><a href="/workspace">Open workspace <ArrowUpRight size={16} /></a></section>}
      </motion.section>
    </div>
  </main>;
}
