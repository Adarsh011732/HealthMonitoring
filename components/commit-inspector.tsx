"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  ChevronDown,
  FileCode2,
  GitCommitHorizontal,
  GitMerge,
  RefreshCw,
} from "lucide-react";
import type { Commit, Repository } from "../lib/repository";
type Detail = {
  message: string;
  stats: { additions: number; deletions: number; total: number };
  files: {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch: string | null;
  }[];
  truncated?: boolean;
};
export default function CommitInspector({
  repo,
  commit,
}: {
  repo: Repository;
  commit: Commit | undefined;
}) {
  const [detail, setDetail] = useState<Detail | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0),
    [opened, setOpened] = useState<string[]>([]);
  const reduced = useReducedMotion();
  useEffect(() => {
    setDetail(null);
    setBusy(false);
    setError("");
    setOpened([]);
    if (!commit) return;
    const abort = new AbortController();
    setBusy(true);
    fetch(
      `/api/commit?repo=${encodeURIComponent(repo.name.replace(/\s/g, ""))}&sha=${commit.sha}`,
      { signal: abort.signal },
    )
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d;
      })
      .then(setDetail)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setBusy(false);
      });
    return () => abort.abort();
  }, [repo.name, commit?.sha, retry]);
  return (
    <section className="panel commit-inspector">
      <div className="panel-heading">
        <h2>
          <GitCommitHorizontal size={17} />
          Change inspector
        </h2>
        <span className="sample-badge">
          GITHUB DIFF
        </span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={commit?.sha}
          initial={{ opacity: 0, y: reduced ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="inspector-body"
        >
          <div className="inspector-kicker">
            <code>{commit?.sha.slice(0, 7)}</code>
            <span>
              {commit?.parents.length === 2 ? "MERGE COMMIT" : "COMMIT"}
            </span>
          </div>
          <h3>{commit?.message || "Select a commit"}</h3>
          <p className="inspector-author">
            {commit?.author}
            <span>{commit && new Date(commit.date).toLocaleString()}</span>
          </p>
          <div className="inspector-parents">
            <GitMerge size={14} />
            <span>Parents</span>
            {commit?.parents.map((p) => (
              <code key={p}>{p.slice(0, 7)}</code>
            ))}
          </div>
          {busy && (
            <p className="inspector-loading">
              <RefreshCw size={15} className="spin" />
              Reading changed files from GitHub...
            </p>
          )}
          {error && (
            <div role="alert" className="error-message">
              {error}
              <button
                className="text-button"
                onClick={() => setRetry((v) => v + 1)}
              >
                Retry request <RefreshCw size={13} />
              </button>
            </div>
          )}
          {detail && (
            <>
              <div className="diff-stats">
                <strong>
                  {detail.files.length}
                  <small> changed files</small>
                </strong>
                <span>+{detail.stats.additions} additions</span>
                <span>−{detail.stats.deletions} deletions</span>
              </div>
              {detail.message.split("\n").slice(1).join("\n").trim() && <details className="commit-notes" key={commit?.sha}><summary>Commit notes</summary><p className="commit-description">{detail.message.split("\n").slice(1).join("\n").trim()}</p></details>}
              <div className="changed-files-heading">Changed files</div>
              <div className="changed-files">
                {detail.files.map((f) => (
                  <div key={f.filename} className="changed-file">
                    <button
                      aria-expanded={opened.includes(f.filename)}
                      onClick={() =>
                        setOpened((v) =>
                          v.includes(f.filename)
                            ? v.filter((n) => n !== f.filename)
                            : [...v, f.filename],
                        )
                      }
                    >
                      <FileCode2 size={15} />
                      <span>
                        {f.filename}
                        <small>{f.status}</small>
                      </span>
                      <code>
                        +{f.additions} / −{f.deletions}
                      </code>
                      <motion.span
                        animate={{
                          rotate: opened.includes(f.filename) ? 180 : 0,
                        }}
                      >
                        <ChevronDown size={14} />
                      </motion.span>
                    </button>
                    <AnimatePresence>
                      {opened.includes(f.filename) && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="patch"
                        >
                          <pre>
                            {f.patch
                              ? f.patch.split("\n").map((line, i) => (
                                  <span
                                    key={i}
                                    className={
                                      line.startsWith("+")
                                        ? "diff-add"
                                        : line.startsWith("-")
                                          ? "diff-remove"
                                          : line.startsWith("@@")
                                            ? "diff-hunk"
                                            : ""
                                    }
                                  >
                                    <i>{String(i + 1).padStart(2, "0")}</i>
                                    {line}
                                    {"\n"}
                                  </span>
                                ))
                              : "GitHub did not supply a text patch (binary file or large diff)."}
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
              {detail.truncated && (
                <p className="muted">
                  Large change: only the first 100 files are shown. Open GitHub
                  for the full diff.
                </p>
              )}
            </>
          )}
          {commit && (
            <a
              className="secondary-button"
              href={`${repo.url}/commit/${commit.sha}`}
              target="_blank"
              rel="noreferrer"
            >
              Full commit on GitHub <ArrowUpRight size={14} />
            </a>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
