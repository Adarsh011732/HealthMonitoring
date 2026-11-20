"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createAuthClient } from "better-auth/react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  Activity,
  ArrowUpRight,
  GitBranch,
  Layers,
  LayoutDashboard,
  Settings2,
  UserRound,
  RefreshCw,
  Server,
  ShieldCheck,
  Radio,
  LogOut,
  ArrowDown,
  ChevronRight,
  Clock,
  Zap,
} from "lucide-react";
import type { Repository } from "../lib/repository";
import RepositoryGraph from "./repository-graph";
import CommitInspector from "./commit-inspector";
import PipelineHistory from "./pipeline-history";
import OverviewSummary from "./overview-summary";
import LatencyChart from "./latency-chart";
import RepositoryPicker from "./repository-picker";

const sections = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Repository", icon: GitBranch },
  { name: "Services", icon: Activity },
  { name: "Deployments", icon: Layers },
  { name: "Settings", icon: Settings2 },
] as const;

const auth = createAuthClient();

type Health = {
  status: string;
  timestamp: string;
  uptime: number;
  environment?: string;
  service?: string;
  memory?: { rssMb: number; heapUsedMb: number };
};

type CheckSample = { time: string; ms: number; ok: boolean };

export default function Dashboard({
  initialTab = "Overview",
  initialUser = null,
}: {
  initialTab?: string;
  initialUser?: { id: string; name: string; email: string } | null;
}) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const { data: account, isPending, error: sessionError, refetch: refreshSession } = auth.useSession();
  const user = account?.user || ((isPending || sessionError) ? initialUser : null);
  const sessionState = user ? "authenticated" : isPending ? "loading" : sessionError ? "error" : "anonymous";

  const requestVersion = useRef(0);
  const [tab, setTab] = useState(initialTab);
  const [input, setInput] = useState("");
  const [repository, setRepository] = useState<Repository | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState("");
  const [latency, setLatency] = useState<number | null>(null);
  const [samples, setSamples] = useState<CheckSample[]>([]);
  const [checking, setChecking] = useState(false);

  const probeInFlight = useRef(false);
  const [commitQuery, setCommitQuery] = useState("");
  const [reset, setReset] = useState(0);
  const [connect, setConnect] = useState(false);

  const pickerDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = pickerDialog.current;
    if (connect && !dialog?.open) dialog?.showModal();
    if (!connect && dialog?.open) dialog.close();
  }, [connect]);

  // Keep tab synced with pathname
  useEffect(() => {
    const segment = pathname.split("/")[2] || "overview";
    const found = sections.find((s) => s.name.toLowerCase() === segment);
    if (found) setTab(found.name);
  }, [pathname]);

  // Load repository with persistent memory (sessionStorage & localStorage)
  useEffect(() => {
    let repoToLoad = new URLSearchParams(window.location.search).get("repo");
    if (!repoToLoad) {
      try {
        repoToLoad = localStorage.getItem("branchline.current_repo");
      } catch {}
    }
    if (!repoToLoad) {
      setConnect(true); return;
    }
    setInput(repoToLoad);

    // Instant client cache hydration to eliminate 1-2s loading delay
    try {
      const cached = sessionStorage.getItem(`branchline.repo_cache.${repoToLoad}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setRepository(parsed);
        setSelected(parsed.commits[0]?.sha || "");
      }
    } catch {}

    void loadRepository(repoToLoad);
  }, []);

  // Real-time Health Checker
  const checkHealth = useCallback(async () => {
    if (probeInFlight.current) return;
    probeInFlight.current = true;
    setChecking(true);
    const start = performance.now();
    try {
      const response = await fetch("/health", { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      const ms = Math.round(performance.now() - start);
      setHealth(body);
      setLatency(ms);
      setHealthError("");
      setSamples((prev) => [...prev.slice(-29), { time: new Date().toISOString(), ms, ok: true }]);
    } catch (err: any) {
      setHealthError(err.message || "Health check failed");
      setSamples((prev) => [...prev.slice(-29), { time: new Date().toISOString(), ms: 0, ok: false }]);
    } finally {
      probeInFlight.current = false;
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkHealth();
    const interval = window.setInterval(() => {
      if (!document.hidden) void checkHealth();
    }, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  async function loadRepository(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const version = ++requestVersion.current;
    
    // Only show loading indicator if repository data is not already populated
    if (!repository) {
      setLoading(true);
    }
    setError("");
    try {
      const response = await fetch(`/api/repository?repo=${encodeURIComponent(trimmed)}`, { cache: "no-store" });
      const body = await response.json();
      if (version !== requestVersion.current) return;
      if (!response.ok) throw new Error(body.error || "Repository unavailable");
      setRepository(body);
      setConnect(false);
      setSelected(body.commits[0]?.sha || "");
      setCommitQuery("");
      const cleanName = body.name.replace(/\s/g, "");
      try {
        localStorage.setItem("branchline.current_repo", cleanName);
        sessionStorage.setItem(`branchline.repo_cache.${cleanName}`, JSON.stringify(body));
        sessionStorage.setItem(`branchline.repo_cache.${trimmed}`, JSON.stringify(body));
      } catch {}
      const params = new URLSearchParams(window.location.search);
      params.set("repo", cleanName);
      window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
    } catch (cause: any) {
      if (version === requestVersion.current) setError(cause.message || "Repository unavailable");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }

  function navigate(name: string) {
    setTab(name);
    setConnect(false);
    const params = new URLSearchParams(window.location.search);
    if (repository) {
      params.set("repo", repository.name.replace(/\s/g, ""));
    }
    const queryString = params.toString() ? `?${params.toString()}` : "";
    window.history.pushState(null, "", `/dashboard/${name.toLowerCase()}${queryString}`);
  }

  const handleSignOut = async () => {
    try {
      const result = await auth.signOut();
      if (result.error) throw new Error("Sign out failed");
      window.location.assign("/login");
    } catch { setError("Sign out failed. Please try again."); }
  };

  const exportCsv = () => {
    if (!samples.length) return;
    const header = "timestamp,latency_ms,status\n";
    const rows = samples.map((s) => `${s.time},${s.ms},${s.ok ? "OK" : "FAIL"}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smart-health-checks-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedCommit = repository?.commits.find((c) => c.sha === selected);

  return (
    <main className="production-dashboard">
      {/* Top Header */}
      <header className="production-header">
        <div className="restored-breadcrumb">
          <span>DevOps Workspace</span>
          <span>›</span>
          <strong>{tab}</strong>
        </div>

        <div className="restored-top-right">
          <span className="project-badge">
            <span className="status-pulse" />
            Smart Deployment Health Monitor
          </span>

          {user ? (
            <div className="account-badge">
              <span className="user-icon-circle">
                <UserRound size={14} />
              </span>
              <span className="user-name">{user.name ? user.name.split(" ")[0] : "Account"}</span>
              <button onClick={handleSignOut} className="signout-icon-btn" title="Sign out">
                <LogOut size={13} />
                <span>Exit</span>
              </button>
            </div>
          ) : sessionState === "loading" ? (
            <span role="status">Checking session…</span>
          ) : sessionState === "error" ? (
            <button onClick={() => void refreshSession()}>Retry account check</button>
          ) : (
            <a href="/login" className="login-header-btn">
              Sign in <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      </header>

      <div className="production-layout">
        {/* Sidebar Navigation */}
        <nav aria-label="Main Navigation" className="production-nav">
          <a href="/dashboard" className="restored-brand">
            <GitBranch size={28} />
            <span>branchline<span>.</span></span>
          </a>

          <a href="/workspace" className="restored-workspace">
            <span>{user ? user.name[0]?.toUpperCase() : "W"}</span>
            <div>
              <strong>{user ? `${user.name.split(" ")[0]}'s Workspace` : "My Workspace"}</strong>
              <small>Repositories & Alerts</small>
            </div>
            <ChevronRight size={14} />
          </a>

          <span className="restored-nav-label">COMMAND CENTER</span>

          {sections.map(({ name, icon: Icon }) => (
            <motion.button
              key={name}
              type="button"
              whileTap={reduced ? {} : { scale: 0.98 }}
              aria-current={tab === name ? "page" : undefined}
              onClick={() => navigate(name)}
            >
              {tab === name && (
                <motion.span
                  className="nav-active-surface"
                  layoutId="active-navigation"
                  transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              <Icon size={18} />
              <span>{name}</span>
            </motion.button>
          ))}

          <div className="restored-sidebar-bottom">
            <div className="restored-monitor">
              <div className="monitor-header">
                <span className={`pulse-dot ${healthError ? "danger" : "active"}`} />
                <strong>{healthError ? "Monitor Alert" : health ? "Monitor Online" : "Connecting..."}</strong>
              </div>
              <small>Automated checks every 30s</small>
            </div>
            <a href="/workspace">
              <span>Personal Workspace</span>
              <ArrowUpRight size={14} />
            </a>
          </div>
        </nav>

        {/* Content Body */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="production-content"
        >
          {/* Hero Banner */}
          <div className="restored-hero">
            <div className="production-heading">
              <span className="eyebrow-tag">DEVOPS DEPLOYMENT AUTOMATION</span>
              <h1>
                {tab === "Overview" && "A clear view. A confident deploy."}
                {tab === "Repository" && "Your repository, connected."}
                {tab === "Services" && "Application health"}
                {tab === "Deployments" && "Workflow activity"}
                {tab === "Settings" && "Your workspace settings"}
              </h1>
              <p>
                {tab === "Overview" && "Follow your code, workflow activity, and application health in one place."}
                {tab === "Repository" && "Explore live branches, tree signals, and inspect line diffs from GitHub."}
                {tab === "Services" && "Live instance telemetry, response times, memory metrics, and audit logs."}
                {tab === "Deployments" && "Live workflow runs and deployment records from GitHub."}
                {tab === "Settings" && "Manage your account, saved repositories, and email preferences."}
              </p>
            </div>

            <motion.button
              whileTap={reduced ? {} : { scale: 0.97 }}
              className="restored-connect"
              aria-expanded={connect}
              onClick={() => {
                if (tab !== "Overview" && tab !== "Repository") {
                  navigate("Repository");
                  setConnect(true);
                } else {
                  setConnect(!connect);
                }
              }}
            >
              ＋ Connect Repository
            </motion.button>
          </div>

          {/* Persistent Repository Banner */}
          <div className="restored-status">
            <span className="active-repo-indicator">
              <span className="status-pulse-green" />
              <strong>ACTIVE REPO</strong>
            </span>
            <span className="repo-current-name">
              {repository ? repository.name : loading ? "Loading repository…" : "No repository connected"}
            </span>
            {repository && (
              <span className="repo-meta-pill">
                {repository.defaultBranch} · {repository.commits.length} commits
              </span>
            )}
            <button onClick={() => setConnect(true)} className="change-repo-btn">
              Switch repository →
            </button>
          </div>

          <dialog ref={pickerDialog} className="repository-dialog" aria-label="Switch repository" onCancel={() => setConnect(false)} onClose={() => setConnect(false)} onClick={event => { if (event.target === event.currentTarget) setConnect(false); }}>
            <section className="production-card connect-panel">
              <div className="connect-heading"><div><h2>Switch repository</h2><p>Choose a saved repository or connect another public project.</p></div><button onClick={() => setConnect(false)} aria-label="Close repository picker">✕</button></div>
              {connect && <RepositoryPicker current={repository?.name.replace(/\s/g, "")} busy={loading} onSelect={value => { setInput(value); void loadRepository(value); }} />}
              <details className="picker-manual"><summary>Open a different public repository</summary>
                <form className="production-form" onSubmit={event => { event.preventDefault(); void loadRepository(input); }}>
                  <label htmlFor="repository-input">Repository name</label>
                  <input id="repository-input" value={input} onChange={event => setInput(event.target.value)} placeholder="owner/repository" required maxLength={200} pattern="[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+" />
                  <button disabled={loading}>{loading ? "Connecting…" : "Connect repository"}</button>
                </form>
              </details>
              {error && <p role="alert" className="production-error">{error}</p>}
            </section>
          </dialog>
          {error && !connect && <p role="alert" className="production-error">{error}</p>}

          {/* TAB 1: OVERVIEW */}
          {tab === "Overview" && (
            <>
              {/* Metric Cards */}
              <motion.div
                className="restored-metrics"
                initial="hidden"
                animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.08 } } }}
              >
                <motion.article whileHover={reduced ? {} : { y: -3 }}>
                  <span>Health State <Activity size={16} /></span>
                  <strong className={healthError ? "text-amber" : "text-emerald"}>
                    {healthError ? "Attention" : health ? "Operational" : "Checking…"}
                  </strong>
                  <small>{healthError || "Automated probes passing (/health)"}</small>
                </motion.article>

                <motion.article whileHover={reduced ? {} : { y: -3 }}>
                  <span>Response Latency <Radio size={16} /></span>
                  <strong>{latency !== null ? `${latency} ms` : "—"}</strong>
                  <small>Browser-to-app round trip</small>
                </motion.article>

                <motion.article whileHover={reduced ? {} : { y: -3 }}>
                  <span>Latest commit <Layers size={16} /></span>
                  <strong>{repository?.commits[0]?.sha.slice(0, 7) || "—"}</strong>
                  <small>Latest commit in the repository snapshot</small>
                </motion.article>

                <motion.article whileHover={reduced ? {} : { y: -3 }}>
                  <span>Branches Monitored <GitBranch size={16} /></span>
                  <strong>{repository ? repository.branches.length : "—"}</strong>
                  <small>{repository ? `Default: ${repository.defaultBranch}` : "Connect repository"}</small>
                </motion.article>
              </motion.div>

              <OverviewSummary repository={repository} samples={samples} navigate={navigate} />
            </>
          )}

          {/* TAB 2: REPOSITORY */}
          {tab === "Repository" && repository && (
            <>
              <section className="production-card">
                <div className="production-row">
                  <div>
                    <span className="production-label">GITHUB REPOSITORY SNAPSHOT</span>
                    <h2>{repository.name}</h2>
                    <p>{repository.description || "Public repository tree and commit history."}</p>
                  </div>
                  <a href={repository.url} target="_blank" rel="noopener noreferrer" className="external-link-btn">
                    View on GitHub <ArrowUpRight size={16} />
                  </a>
                </div>
                <div className="repo-metrics-grid">
                  <article className="repo-metric-card">
                    <span className="metric-header">
                      <span>BRANCHES MONITORED</span>
                      <GitBranch size={16} />
                    </span>
                    <strong>{repository.branches.length}</strong>
                    <small>Active branch references tracked</small>
                  </article>
                  <article className="repo-metric-card">
                    <span className="metric-header">
                      <span>RECENT COMMITS</span>
                      <Activity size={16} />
                    </span>
                    <strong>{repository.commits.length}</strong>
                    <small>Direct commit history scanned</small>
                  </article>
                  <article className="repo-metric-card">
                    <span className="metric-header">
                      <span>TRACKED ASSETS</span>
                      <Layers size={16} />
                    </span>
                    <strong>{repository.files.length}</strong>
                    <small>Files in this repository snapshot</small>
                  </article>
                </div>
              </section>

              <div className="production-columns">
                <section className="production-card">
                  <div className="production-row">
                    <h2>Ancestry & Signal Tree</h2>
                    <button type="button" onClick={() => setReset((v) => v + 1)}>Reset View</button>
                  </div>
                  <label className="commit-search">Find a commit<input value={commitQuery} onChange={event => setCommitQuery(event.target.value)} placeholder="Search message, author, or SHA" /></label>
                  <RepositoryGraph
                    commits={repository.commits.filter(commit => `${commit.message} ${commit.author} ${commit.sha}`.toLowerCase().includes(commitQuery.toLowerCase()))}
                    selected={selected}
                    onSelect={setSelected}
                    paused={false}
                    reset={reset}
                    branches={repository.branches}
                  />
                </section>
                <CommitInspector repo={repository} commit={selectedCommit} />
              </div>
            </>
          )}

          {/* TAB 3: SERVICES */}
          {tab === "Services" && (
            <div className="tab-pane-container">
              {/* Real-time Health Card */}
              <section className="production-card live-service-card">
                <div className="service-card-header">
                  <div>
                    <span className="eyebrow-tag">APPLICATION HEALTH</span>
                    <h2>Branchline service</h2>
                    <p>Live checks of this Branchline instance. These measurements do not probe the selected repository’s deployed website.</p>
                  </div>
                  <div className="service-actions">
                    <button onClick={checkHealth} disabled={checking} className="probe-now-btn">
                      <RefreshCw size={14} className={checking ? "spin" : ""} />
                      <span>{checking ? "Probing..." : "Run Health Check"}</span>
                    </button>
                    <button onClick={exportCsv} disabled={!samples.length} className="export-csv-btn">
                      <ArrowDown size={14} />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                <div className="services-metrics-grid">
                  <article className="service-stat-card">
                    <span className="metric-header">
                      <span>SERVICE STATUS</span>
                      <span className={`status-dot ${healthError ? "danger" : "active"}`} />
                    </span>
                    <strong className={healthError ? "stat-danger" : "stat-success"}>
                      {healthError ? "Attention" : health ? "Operational" : "Checking"}
                    </strong>
                    <small>Endpoint /health responsive</small>
                  </article>
                  <article className="service-stat-card">
                    <span className="metric-header">
                      <span>INSTANCE UPTIME</span>
                      <Clock size={15} />
                    </span>
                    <strong>{health ? `${Math.floor(health.uptime / 60)}m ${Math.floor(health.uptime % 60)}s` : "—"}</strong>
                    <small>Continuous server uptime</small>
                  </article>
                  <article className="service-stat-card">
                    <span className="metric-header">
                      <span>PROBE LATENCY</span>
                      <Zap size={15} />
                    </span>
                    <strong className="stat-highlight">{latency !== null ? `${latency} ms` : "—"}</strong>
                    <small>Measured from your browser</small>
                  </article>
                  <article className="service-stat-card">
                    <span className="metric-header">
                      <span>MEMORY (RSS / HEAP)</span>
                      <Server size={15} />
                    </span>
                    <strong>{health?.memory ? `${health.memory.rssMb}M / ${health.memory.heapUsedMb}M` : "—"}</strong>
                    <small>Memory resident footprint</small>
                  </article>
                  <article className="service-stat-card">
                    <span className="metric-header">
                      <span>CHECK INTERVAL</span>
                      <RefreshCw size={15} />
                    </span>
                    <strong>30 Seconds</strong>
                    <small>While this page is open</small>
                  </article>
                </div>

                <LatencyChart samples={samples} />
              </section>

              {/* Checks Audit Table */}
              <section className="production-card audit-card">
                <div className="audit-card-header">
                  <div>
                    <span className="eyebrow-tag">AUDIT TRAIL</span>
                    <h2>Health Check Inspection History</h2>
                  </div>
                  <span className="badge-counter">{samples.length} recorded events</span>
                </div>
                <div className="audit-table-wrapper">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Recorded At</th>
                        <th>Target Endpoint</th>
                        <th>Roundtrip Latency</th>
                        <th>HTTP Status</th>
                        <th>Verification Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {samples.slice().reverse().slice(0, 8).map((sample, i) => (
                        <tr key={i}>
                          <td className="cell-time">{new Date(sample.time).toLocaleTimeString()}</td>
                          <td><code className="cell-endpoint">GET /health</code></td>
                          <td className="cell-latency">{sample.ms} ms</td>
                          <td><span className="cell-code">{sample.ok ? "200 OK" : "FAILED"}</span></td>
                          <td>
                            <span className={sample.ok ? "badge-success-pill" : "badge-danger-pill"}>
                              {sample.ok ? "PASSED" : "FAILED"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {tab === "Deployments" && <PipelineHistory repository={repository?.name.replace(/\s/g, "")} sessionState={sessionState} onRefreshSession={() => void refreshSession()} />}
          {tab === "Settings" && <div className="account-settings">
            <section className="production-card settings-profile">
              <span className="settings-avatar"><UserRound size={28}/></span>
              <div><span className="production-label">YOUR ACCOUNT</span><h2>{user?.name || "Your personal workspace"}</h2><p>{user?.email || "Sign in to save repositories and manage your preferences."}</p></div>
              <a className="deployment-primary" href={user ? "/workspace" : "/login"}>{user ? "Manage account" : "Sign in"}<ArrowUpRight size={16}/></a>
            </section>
            <div className="settings-options">
              <a className="settings-option" href="/workspace"><GitBranch size={24}/><h2>Saved repositories</h2><p>Keep your projects together and switch between them in a click.</p><span>Manage repositories <ArrowUpRight size={16}/></span></a>
              <a className="settings-option" href="/workspace#notifications"><Radio size={24}/><h2>Email notifications</h2><p>Manage failure and recovery notification preferences for your account.</p><span>Notification preferences <ArrowUpRight size={16}/></span></a>
            </div>
            <p className="settings-footnote"><ShieldCheck size={16}/> Your account preferences are saved to your personal workspace.</p>
          </div>}
        </motion.section>
      </div>
    </main>
  );
}
