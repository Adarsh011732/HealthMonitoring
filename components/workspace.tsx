"use client";
import { useEffect, useState } from "react";
import { createAuthClient } from "better-auth/react";
import { GitBranch, ArrowUpRight, LogOut, Plus, Trash2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
const auth = createAuthClient();
export default function Workspace({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const reduced = useReducedMotion();
  const [repos, setRepos] = useState<{ repository: string }[]>([]),
    [input, setInput] = useState(""),
    [alerts, setAlerts] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  async function load() {
    const r = await fetch("/api/workspace", { cache: "no-store" });
    const data = await r.json();
    if (!r.ok) throw Error(data.error);
    setRepos(data.repositories);
    setAlerts(data.alertsEnabled);
  }
  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function change(body: object) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      await load();
      setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="personal-workspace">
      <header>
        <a href="/dashboard">
          <GitBranch /> branchline
        </a>
        <button
          onClick={async () => {
            try {
              const result = await auth.signOut();
              if (result.error) throw new Error("Could not sign out. Please try again.");
              location.assign("/login");
            } catch { setError("Could not sign out. Please try again."); }
          }}
        >
          <LogOut size={16} /> Sign out
        </button>
      </header>
      <motion.section initial={{ opacity: 0, y: reduced ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, ease: [.22, 1, .36, 1] }}>
        <a className="workspace-back" href="/dashboard">← Back to dashboard</a>
        <span className="workspace-kicker">YOUR WORKSPACE</span>
        <h1>Hello, {name.split(" ")[0]}.</h1>
        <p className="workspace-intro">Your projects. A clearer perspective.</p>
        {error && (
          <p role="alert" className="workspace-error">
            {error}
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void change({ action: "save", repository: input });
          }}
        >
          <label htmlFor="saved-repo"><GitBranch size={17} /> Connect a repository</label>
          <p>Bring a public GitHub project into focus. Explore its branches, commits, and changes.</p>
          <div>
            <input
              id="saved-repo"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="owner/repository"
              maxLength={200}
              required
              pattern="[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+"
            />
            <button disabled={busy || loading}>
              <Plus size={16} /> Save repository
            </button>
          </div>
        </form>
        <div className="saved-repositories">
          <div className="workspace-list-heading"><h2>Your repositories</h2><span>{loading ? "Loading" : `${repos.length} connected`}</span></div>
          {loading ? (
            <p>Loading your workspace…</p>
          ) : repos.length ? (
            repos.map((r) => (
              <motion.article key={r.repository} initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} whileHover={reduced ? {} : { y: -2 }}>
                <GitBranch size={22} />
                <a
                  href={`/dashboard/repository?repo=${encodeURIComponent(r.repository)}`}
                >
                  {r.repository}
                  <ArrowUpRight size={18} />
                </a>
                <button
                  aria-label={`Remove ${r.repository}`}
                  disabled={busy}
                  onClick={() =>
                    change({ action: "remove", repository: r.repository })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </motion.article>
            ))
          ) : (
            <div className="workspace-empty">
              Your next project starts here.
              <small>
                Save a repository above to explore its branches and commits.
              </small>
            </div>
          )}
        </div>
        <aside>
          <h2>Email preferences</h2>
          <p>
            Alerts are delivered to your verified account email:{" "}
            <strong>{email}</strong>.
          </p>
          <label>
            <input
              type="checkbox"
              disabled={busy || loading}
              checked={alerts}
              onChange={(e) =>
                change({
                  action: "preferences",
                  alertsEnabled: e.target.checked,
                })
              }
            />{" "}
            Receive failure and recovery alerts
          </label>
          <p className="workspace-help">
            Saving this preference does not start monitoring. A running
            monitoring service and configured email sender are required.
          </p>
        </aside>
        <a href="/dashboard/repository">Open repository explorer →</a>
      </motion.section>
    </main>
  );
}
