"use client";
import { motion, useReducedMotion } from "motion/react";
export type CheckSample = { time: string; ms: number; ok: boolean };
export default function LatencyChart({ samples }: { samples: CheckSample[] }) {
  const reduced = useReducedMotion();
  const data = samples.slice(-30);
  const max = Math.max(10, ...data.map(s => s.ms));
  const point = (s: CheckSample, i: number) => [52 + i * 700 / Math.max(1, data.length - 1), 180 - s.ms / max * 140];
  return <div className="latency-chart">
    <header><div><span className="production-label">RESPONSE TIME</span><h3>Every check, in perspective.</h3></div><span>{data.length} / 30 samples</span></header>
    {data.length ? <motion.svg initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} viewBox="0 0 780 220" role="img" aria-label="Response time in milliseconds for this browser session">
      {[0, .5, 1].map(n => <g key={n}><line x1="52" x2="752" y1={180 - n * 140} y2={180 - n * 140} stroke="#333" strokeDasharray="4 6"/><text x="6" y={184 - n * 140}>{Math.round(n * max)}</text></g>)}
      <polyline points={data.map((s, i) => point(s, i).join(",")).join(" ")} fill="none" stroke="#dedede" strokeWidth="2" strokeLinejoin="round"/>
      {data.map((s, i) => { const [cx, cy] = point(s, i); return <circle key={`${s.time}-${i}`} cx={cx} cy={cy} r={s.ok ? 3 : 5} fill={s.ok ? "#eee" : "#111"} stroke="#eee"><title>{new Date(s.time).toLocaleTimeString()}: {s.ok ? `${s.ms} ms` : "Check failed"}</title></circle>; })}
      <text x="52" y="212">{new Date(data[0].time).toLocaleTimeString()}</text><text x="752" y="212" textAnchor="end">{new Date(data[data.length - 1].time).toLocaleTimeString()}</text>
    </motion.svg> : <p className="chart-empty">Your first measurement will appear here.</p>}
    <footer>Milliseconds · Measured from this browser <span>Hollow points indicate failed checks</span></footer>
  </div>;
}
