const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { transform, loadBindings } = require("next/dist/build/swc");

// Execute the component's loading effect with isolated hooks and HTTP fixtures.
// No real authentication, database connection or provider credential is used.
async function loadActivity(sessionState, status = 200, repository) {
  await loadBindings();
  let effect;
  const states = [];
  const calls = [];
  const { code: source } = await transform(fs.readFileSync("components/pipeline-history.tsx", "utf8"), {
    filename: "pipeline-history.tsx",
    jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } },
    module: { type: "commonjs" },
  });
  const module = { exports: {} };
  const context = {
    module, exports: module.exports,
    require(name) {
      if (name === "react") return {
        useState(value) { return [value, next => states.push(next)]; },
        useEffect(callback) { effect = callback; },
      };
      if (name === "motion/react") return { useReducedMotion: () => true, motion: { article: "article" } };
      return require(name);
    },
    AbortController, AbortSignal,
    fetch: async (url, options) => { calls.push({ url, options }); return { status, ok: status === 200, json: async () => ({ runs: [] }) }; },
    setInterval: () => 1, clearInterval() {}, document: { hidden: false },
  };
  vm.runInNewContext(source, context);
  module.exports.default({ sessionState, repository, onRefreshSession() {} });
  effect();
  await new Promise(resolve => setImmediate(resolve));
  return { calls, states };
}

test("account activity waits for the session; signed-out users see sign-in", async () => {
  const pending = await loadActivity("loading");
  assert.equal(pending.calls.length, 0);
  assert.equal(pending.states.at(-1), "loading");
  const anonymous = await loadActivity("anonymous");
  assert.equal(anonymous.calls.length, 0);
  assert.equal(anonymous.states.at(-1), "unauthorized");
});

test("signed-in activity sends credentials and a failed check does not claim signed out", async () => {
  const ready = await loadActivity("authenticated");
  assert.equal(ready.calls.length, 1);
  assert.equal(ready.calls[0].options.credentials, "same-origin");
  assert.equal(ready.states.at(-1), "ready");
  const failed = await loadActivity("authenticated", 401);
  assert.equal(failed.states.at(-1), "session-error");
});

test("session errors allow retry while selected public repository activity remains available", async () => {
  const failed = await loadActivity("error");
  assert.equal(failed.states.at(-1), "session-error");
  const publicActivity = await loadActivity("loading", 200, "owner/repository");
  assert.equal(publicActivity.calls.length, 1);
  assert.equal(publicActivity.states.at(-1), "ready");
});
