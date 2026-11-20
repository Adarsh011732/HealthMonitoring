"use client";
import { Activity, ArrowUpRight, GitBranch, Workflow } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { Repository } from "../lib/repository";
import LatencyChart, { type CheckSample } from "./latency-chart";
export default function OverviewSummary({ repository, samples, navigate }: { repository: Repository | null; samples: CheckSample[]; navigate: (section: string) => void }) {
  const reduced = useReducedMotion();
  return <motion.div className="overview-summary" initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: .18 }}>
    <section className="production-card overview-pulse"><div className="summary-heading"><h2><Activity size={19}/> Application pulse</h2><button onClick={() => navigate("Services")} aria-label="Inspect application health"><ArrowUpRight size={18}/></button></div><LatencyChart samples={samples}/></section>
    <section className="production-card overview-changes"><div className="summary-heading"><h2>Latest changes</h2><span className="production-label">GITHUB</span></div>
      {repository?.commits.length ? repository.commits.slice(0, 3).map(commit => <button className="recent-change" key={commit.sha} onClick={() => navigate("Repository")}><code>{commit.sha.slice(0, 7)}</code><strong>{commit.message.split("\n")[0]}</strong><span>{commit.author} · {new Date(commit.date).toLocaleDateString()}</span><ArrowUpRight size={15}/></button>) : <p>Connect a repository to see its latest changes.</p>}
    </section>
    <button className="overview-destination" onClick={() => navigate("Repository")}><GitBranch size={26}/><div><h2>Explore your repository</h2><p>Branches, commit history, and file changes.</p></div><ArrowUpRight size={20}/></button>
    <button className="overview-destination" onClick={() => navigate("Deployments")}><Workflow size={26}/><div><h2>Follow your deployments</h2><p>Workflow runs and deployment activity from GitHub.</p></div><ArrowUpRight size={20}/></button>
  </motion.div>;
}
