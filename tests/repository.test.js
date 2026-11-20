const { test } = require("node:test");
const assert = require("node:assert/strict");

test("repository snapshot starts commits and tree before branch listing completes", async () => {
  const { GET } = await import("../app/api/repository/route.ts");
  const original = global.fetch;
  const calls = [];
  let release;
  const branches = new Promise(resolve => { release = resolve; });
  try {
    global.fetch = async url => {
      const path = String(url);
      calls.push(path);
      if (path.includes("/branches?")) { await branches; return Response.json([]); }
      if (path.includes("/commits?")) return Response.json([]);
      if (path.includes("/git/trees/")) return Response.json({ tree: [] });
      return Response.json({ private: false, full_name: "owner/repo", default_branch: "main" });
    };
    const pending = GET(new Request("http://localhost/api/repository?repo=owner/repo"));
    // Drain promise callbacks while the branch response is deliberately held.
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(calls.some(path => path.includes("/commits?")));
    assert.ok(calls.some(path => path.includes("/git/trees/")));
    release();
    assert.equal((await pending).status, 200);
  } finally { release(); global.fetch = original; }
});

test("repository API rejects malformed paths before fetching", async () => {
  const { GET } = await import("../app/api/repository/route.ts");
  for (const repo of [
    "",
    "../../secrets",
    "owner/repo?token=x",
    "https://evil.example/repo",
  ]) {
    const response = await GET(
      new Request(
        `http://localhost/api/repository?repo=${encodeURIComponent(repo)}`,
      ),
    );
    assert.equal(response.status, 400);
  }
});

test("repository API preserves ancestry and refuses private data", async () => {
  const { GET } = await import("../app/api/repository/route.ts");
  const originalFetch = global.fetch;
  const originalToken = process.env.GITHUB_TOKEN;
  const calls = [];
  try {
    process.env.GITHUB_TOKEN = "test-server-only";
    global.fetch = async (url, options) => {
      calls.push(String(url));
      assert.equal(options.headers.Authorization, "Bearer test-server-only");
      const data = String(url).includes("/branches?")
        ? [{ name: "main", commit: { sha: "new" }, protected: true }]
        : String(url).includes("/commits?")
          ? [
              {
                sha: "new",
                commit: {
                  message: "Merge change\nDetails",
                  author: { name: "Author", date: "2026-11-18T00:00:00Z" },
                },
                parents: [{ sha: "old" }, { sha: "side" }],
              },
            ]
          : String(url).includes("/git/trees/")
            ? { tree: [{ path: "README.md", type: "blob" }], truncated: false }
            : {
                full_name: "owner/repo",
                default_branch: "main",
                html_url: "https://github.com/owner/repo",
                private: false,
              };
      return Response.json(data);
    };
    const response = await GET(
      new Request("http://localhost/api/repository?repo=owner/repo"),
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.commits[0].parents, ["old", "side"]);
    assert.equal(body.commits[0].message, "Merge change");
    assert.equal(body.branches.length, 1);
    assert.equal("demo" in body, false);
    assert.equal(JSON.stringify(body).includes("test-server-only"), false);
    global.fetch = async () => Response.json({ private: true });
    const denied = await GET(
      new Request("http://localhost/api/repository?repo=owner/private"),
    );
    assert.equal(denied.status, 403);
    global.fetch = async () => new Response("", { status: 403 });
    const limited = await GET(
      new Request("http://localhost/api/repository?repo=owner/repo"),
    );
    assert.equal(limited.status, 502);
    assert.match((await limited.json()).error, /rate limit/);
    assert.equal(calls.length, 4);
  } finally {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = originalToken;
  }
});
