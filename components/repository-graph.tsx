"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  GitCommitHorizontal,
  ArrowUpRight,
  GitMerge,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Commit, Branch } from "../lib/repository";

export default function RepositoryGraph({
  commits,
  selected,
  onSelect,
  paused,
  reset,
  branches = [],
}: {
  commits: Commit[];
  selected: string;
  onSelect: (sha: string) => void;
  paused: boolean;
  reset: number;
  branches?: Branch[];
}) {
  const reduced = useReducedMotion();
  const scroll = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const visible = commits.slice(0, 28);
  const row = 78;
  const height = Math.max(visible.length * row + 48, 270);
  const point = (i: number, lane: number) => ({
    x: 34 + (lane % 5) * 32,
    y: 42 + i * row,
  });
  useEffect(() => {
    setZoom(1);
    scroll.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [reset]);
  return (
    <div className="commit-tree-shell">
      <div className="tree-ruler">
        <span>ANCESTRY</span>
        <span>COMMIT / CHANGELOG</span>
        <span>NEWEST FIRST</span>
      </div>
      <div className="tree-scroll" ref={scroll}>
        <div className="tree-content" style={{ height: height * zoom }}>
          <div
            style={{
              height,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              width: `${100 / zoom}%`,
            }}
          >
            <svg
              className="ancestry-lines"
              width="210"
              height={height}
              aria-hidden="true"
            >
              {visible.flatMap((c, i) =>
                c.parents.map((parent) => {
                  const j = visible.findIndex((p) => p.sha === parent);
                  if (j < 0) return null;
                  const p = point(i, c.lane),
                    q = point(j, visible[j].lane);
                  const d = `M ${p.x} ${p.y} C ${p.x} ${p.y + 38}, ${q.x} ${q.y - 38}, ${q.x} ${q.y}`;
                  return (
                    <g key={c.sha + parent}>
                      <motion.path
                        d={d}
                        fill="none"
                        stroke={
                          c.sha === selected || parent === selected
                            ? "#fff"
                            : "#505050"
                        }
                        strokeWidth={c.sha === selected ? 2.5 : 1.5}
                        initial={{ pathLength: reduced ? 1 : 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{
                          duration: paused || reduced ? 0 : 0.75,
                          delay: Math.min(i * 0.035, 0.35),
                        }}
                      />
                      {!paused && !reduced && (
                        <circle r="2" fill="#fff" opacity=".7">
                          <animateMotion
                            dur={`${3 + (i % 3)}s`}
                            repeatCount="indefinite"
                            path={d}
                          />
                        </circle>
                      )}
                    </g>
                  );
                }),
              )}
            </svg>
            {visible.map((c, i) => {
              const p = point(i, c.lane);
              const labels = branches.filter((b) => b.sha === c.sha);
              return (
                <motion.button
                  key={c.sha}
                  className={`tree-commit ${c.sha === selected ? "is-selected" : ""}`}
                  style={{ top: p.y - 25 }}
                  onClick={() => onSelect(c.sha)}
                  aria-pressed={c.sha === selected}
                  initial={{ opacity: reduced ? 1 : 0, x: reduced ? 0 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: Math.min(i * 0.035, 0.4),
                  }}
                  whileHover={reduced ? {} : { x: 4 }}
                >
                  <span className="tree-node" style={{ left: p.x }}>
                    {c.parents.length > 1 ? <GitMerge size={12} /> : <span />}
                  </span>
                  <span className="tree-message">
                    <span className="tree-meta">
                      <code>{c.sha.slice(0, 7)}</code>
                      {labels.map((b) => (
                        <span className="tree-branch" key={b.name}>
                          {b.name}
                        </span>
                      ))}
                      {i === 0 && <span className="tree-head">LATEST</span>}
                    </span>
                    <strong>{c.message}</strong>
                    <small>
                      {c.author}
                      <span> / </span>
                      {new Date(c.date).toLocaleDateString()}
                    </small>
                  </span>
                  <ArrowUpRight className="tree-open" size={15} />
                </motion.button>
              );
            })}
            {!visible.length && (
              <div className="empty">No commits in this branch snapshot.</div>
            )}
          </div>
        </div>
      </div>
      <div className="tree-bottom">
        <span>
          <GitCommitHorizontal size={14} />
          Select a node to inspect its changes
        </span>
        <div>
          <button
            aria-label="Zoom out commit tree"
            onClick={() => setZoom((v) => Math.max(0.8, v - 0.1))}
          >
            <ZoomOut size={15} />
          </button>
          <code>{Math.round(zoom * 100)}%</code>
          <button
            aria-label="Zoom in commit tree"
            onClick={() => setZoom((v) => Math.min(1.3, v + 0.1))}
          >
            <ZoomIn size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
