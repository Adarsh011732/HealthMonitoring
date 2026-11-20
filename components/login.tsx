"use client";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { GitBranch, ArrowUpRight, LockKeyhole } from "lucide-react";
import { createAuthClient } from "better-auth/react";

const auth = createAuthClient();
const paths = [
  "M40 160H520",
  "M100 160C160 160 140 70 210 70H340C410 70 400 160 460 160",
  "M160 160C230 160 200 250 290 250H380C450 250 440 160 490 160",
];

export default function Login({ configured, github, google }: {
  configured: boolean; github: boolean; google: boolean;
}) {
  const reduced = useReducedMotion();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function signIn(provider: "github" | "google") {
    setBusy(provider); setError("");
    try {
      const result = await auth.signIn.social({ provider, callbackURL: "/workspace" });
      if (result.error) { setError("Unable to sign in. Please try again."); setBusy(""); }
    } catch { setError("Connection failed. Please try again."); setBusy(""); }
  }
  return <main className="login-backdrop">
    <motion.div className="login-shell login-clean" initial={{ opacity: 0, y: reduced ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, ease: [.22, 1, .36, 1] }}>
      <section className="login-art">
        <a className="login-brand" href="/dashboard"><GitBranch size={25} /> branchline<span>.</span></a>
        <div className="login-eyebrow">FROM COMMIT TO CONFIDENCE</div>
        <h1>Every branch.<br />A clearer picture.</h1>
        <p>Your code, its history, and what comes next.</p>
        <svg viewBox="0 0 560 320" role="img" aria-label="Animated branches joining together" className="login-tree">
          <defs><pattern id="login-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#353535" /></pattern><filter id="login-glow"><feGaussianBlur stdDeviation="3" /></filter></defs>
          <rect width="560" height="320" fill="url(#login-dots)" />
          {paths.map((path, index) => <g key={path}>
            <path d={path} fill="none" stroke="#353535" strokeWidth="2" />
            <motion.path d={path} fill="none" stroke={index === 0 ? "#f5f5f5" : "#aaa"} strokeWidth="2" initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : 1.8, delay: reduced ? 0 : index * .25, ease: "easeInOut" }} />
            {!reduced && <g><circle r="8" fill="#fff" opacity=".45" filter="url(#login-glow)"><animateMotion dur="3.8s" begin={`${index * .25}s`} repeatCount="1" fill="freeze" path={path} /></circle><circle r="3" fill="#fff"><animateMotion dur="3.8s" begin={`${index * .25}s`} repeatCount="1" fill="freeze" path={path} /></circle></g>}
          </g>)}
          {[[70,160],[140,160],[240,160],[350,160],[490,160],[220,70],[330,70],[290,250],[380,250]].map(([cx,cy], index) => <motion.g key={index} initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ delay: reduced ? 0 : .3 + index * .12 }}><circle cx={cx} cy={cy} r="8" fill="#101010" stroke="#bbb" strokeWidth="1.5" /><circle cx={cx} cy={cy} r="2" fill="white" /></motion.g>)}
          <g fill="#888" fontFamily="monospace" fontSize="11"><text x="210" y="45">feature</text><text x="290" y="285">fix</text><text x="465" y="135">main</text></g>
        </svg>
        <div className="login-art-footer"><span><span className="login-dot" /> A LITTLE MORE CONFIDENCE IN EVERY DEPLOY.</span></div>
      </section>
      <section className="login-form">
        <div className="login-card">
          <div className="login-mark"><GitBranch size={27} /></div>
          <span className="login-eyebrow">YOUR NEXT CHAPTER</span>
          <h2>Welcome back.</h2>
          <p>Sign in to your workspace.</p>
          <motion.button className="login-provider" whileTap={reduced ? {} : { scale: .98 }} disabled={!configured || !github || !!busy} onClick={() => signIn("github")}><GitBranch size={19} /><span>{busy === "github" ? "Connecting…" : "Continue with GitHub"}</span><ArrowUpRight size={16} /></motion.button>
          {google && <motion.button className="login-provider login-provider-secondary" whileTap={reduced ? {} : { scale: .98 }} disabled={!configured || !!busy} onClick={() => signIn("google")}><strong>G</strong><span>{busy === "google" ? "Connecting…" : "Continue with Google"}</span><ArrowUpRight size={16} /></motion.button>}
          {(!configured || (!github && !google)) && <p className="login-message" role="status">Sign-in is being configured. Please check back soon.</p>}
          {error && <p role="alert" className="login-message">{error}</p>}
          <div className="login-note"><LockKeyhole size={12} /> Your account. Your workspace.</div>
        </div>
        <footer className="login-bottom">BRANCHLINE <span>Built for what comes next.</span></footer>
      </section>
    </motion.div>
  </main>;
}
