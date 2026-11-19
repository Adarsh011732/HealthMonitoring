const { test } = require("node:test");
const assert = require("node:assert/strict");
test("commit API validates requests and keeps patches intact", async () => {
  const { GET } = await import("../app/api/commit/route.ts");
  const invalid = await GET(
    new Request("http://localhost/api/commit?repo=bad&sha=invalid"),
  );
  assert.equal(invalid.status, 400);
  const original = global.fetch;
  try {
    global.fetch = async (url) =>
      Response.json(
        String(url).includes("/commits/")
          ? {
              sha: "a".repeat(40),
              commit: { message: "Fix check" },
              stats: { additions: 1, deletions: 1, total: 2 },
              files: [
                {
                  filename: "app.js",
                  status: "modified",
                  additions: 1,
                  deletions: 1,
                  patch: "@@ -1 +1 @@\n-old\n+new",
                },
              ],
            }
          : { private: false },
      );
    const response = await GET(
      new Request("http://localhost/api/commit?repo=owner/repo&sha=aaaaaaa"),
    );
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.files[0].filename, "app.js");
    assert.match(body.files[0].patch, /\+new/);
    global.fetch = async () => Response.json({ private: true });
    assert.equal(
      (
        await GET(
          new Request(
            "http://localhost/api/commit?repo=owner/repo&sha=aaaaaaa",
          ),
        )
      ).status,
      403,
    );
  } finally {
    global.fetch = original;
  }
});
