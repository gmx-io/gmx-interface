const assert = require("node:assert/strict");
const { test } = require("node:test");

const resolvePreview = require("./resolvePreview.cjs");

const repository = { owner: "gmx-io", repo: "gmx-interface" };
const headSha = "a".repeat(40);
const previewUrl = "https://6425cbf1.gmx-interface.pages.dev";
const checkUrl = "https://github.com/gmx-io/gmx-interface/runs/123";

function summary(url = previewUrl) {
  return `<table>
<tr><td><strong>Preview URL:</strong></td><td>
<a href='${url}'>${url}</a>
</td></tr>
<tr><td><strong>Branch Preview URL:</strong></td><td>
<a href='https://some-branch.gmx-interface.pages.dev'>https://some-branch.gmx-interface.pages.dev</a>
</td></tr></table>`;
}

function deployedCheck(overrides = {}) {
  return {
    id: 123,
    name: "Cloudflare Pages: gmx-interface",
    app: { slug: "cloudflare-workers-and-pages" },
    head_sha: headSha,
    status: "completed",
    conclusion: "success",
    html_url: checkUrl,
    output: { summary: summary() },
    ...overrides,
  };
}

function client({ checks = [deployedCheck()], state = "open", updatedHeadSha = headSha } = {}) {
  let reads = 0;
  const github = {
    rest: {
      pulls: {
        get: async (params) => {
          assert.deepEqual(params, { ...repository, pull_number: 2932 });
          return { data: { state, head: { sha: reads++ === 0 ? headSha : updatedHeadSha } } };
        },
      },
      checks: { listForRef: Symbol("listForRef") },
    },
    paginate: async (method, params) => {
      assert.equal(method, github.rest.checks.listForRef);
      assert.deepEqual(params, {
        ...repository,
        ref: headSha,
        check_name: "Cloudflare Pages: gmx-interface",
        filter: "all",
        per_page: 100,
      });
      return checks;
    },
  };
  return github;
}

function resolve(options) {
  return resolvePreview({ github: client(options), repository, prNumber: "2932" });
}

test("uses the immutable application preview for the current PR commit", async () => {
  const result = await resolve({
    checks: [
      deployedCheck({ id: 124, name: "Cloudflare Pages: gmx-interface-home" }),
      deployedCheck({ id: 125, app: { slug: "github-actions" } }),
      deployedCheck({ id: 126, head_sha: "b".repeat(40) }),
      deployedCheck(),
    ],
  });
  assert.deepEqual(result, { prNumber: 2932, headSha, url: previewUrl, checkUrl });
});

test("selects the latest deployment when the same commit was deployed again", async () => {
  const url = "https://abcdef12.gmx-interface.pages.dev";
  const result = await resolve({
    checks: [deployedCheck(), deployedCheck({ id: 124, output: { summary: summary(url) } })],
  });
  assert.equal(result.url, url);
});

test("does not fall back to an older successful deployment when the latest is pending or failed", async () => {
  for (const latest of [
    { status: "in_progress", conclusion: null },
    { status: "completed", conclusion: "failure" },
  ]) {
    await assert.rejects(
      resolve({ checks: [deployedCheck(), deployedCheck({ id: 124, ...latest })] }),
      /no successful current/
    );
  }
});

test("rejects missing deployments and checks for a different app, project or commit", async () => {
  for (const checks of [
    [],
    [deployedCheck({ name: "Cloudflare Pages: gmx-interface-home" })],
    [deployedCheck({ app: { slug: "github-actions" } })],
    [deployedCheck({ head_sha: "b".repeat(40) })],
  ]) {
    await assert.rejects(resolve({ checks }), /no successful current/);
  }
});

test("rejects closed PRs", async () => {
  await assert.rejects(resolve({ state: "closed" }), /must be open/);
});

test("rejects a PR that receives another commit during resolution", async () => {
  await assert.rejects(resolve({ updatedHeadSha: "b".repeat(40) }), /changed while resolving/);
});

test("rejects invalid PR input before calling GitHub", async () => {
  for (const prNumber of [
    "",
    "0",
    "-1",
    "1.2",
    "2932\n",
    "2932; echo bad",
    "https://github.com/owner/repo/pull/2932",
    "9007199254740992",
  ]) {
    await assert.rejects(resolvePreview({ github: null, repository, prNumber }), /positive PR number/);
  }
});

test("rejects mutable aliases, other origins and non-root URLs", async () => {
  for (const url of [
    "https://test.gmx-interface.pages.dev",
    "https://some-branch.gmx-interface.pages.dev",
    "https://6425cbf1.gmx-interface-home.pages.dev",
    "https://6425cbf1.gmx-interface.pages.dev.example.com",
    "https://6425cbf1.gmx-interface.pages.dev@evil.example",
    "http://6425cbf1.gmx-interface.pages.dev",
    "https://6425cbf1.gmx-interface.pages.dev/trade",
    "https://6425cbf1.gmx-interface.pages.dev?target=elsewhere",
  ]) {
    await assert.rejects(
      resolve({ checks: [deployedCheck({ output: { summary: summary(url) } })] }),
      /no unambiguous immutable/
    );
  }
});

test("rejects missing or ambiguous preview rows instead of guessing another URL", async () => {
  for (const output of [
    null,
    { summary: "" },
    { summary: summary().replace("<strong>Preview URL:</strong>", "<strong>Other URL:</strong>") },
    { summary: summary() + summary() },
    { summary: summary().replace("</a>", '</a><a href="https://abcdef12.gmx-interface.pages.dev">another</a>') },
  ]) {
    await assert.rejects(resolve({ checks: [deployedCheck({ output })] }), /no unambiguous immutable/);
  }
});

test("accepts double-quoted links and a trailing root slash", async () => {
  const result = await resolve({
    checks: [deployedCheck({ output: { summary: summary(`${previewUrl}/`).replaceAll("'", '"') } })],
  });
  assert.equal(result.url, `${previewUrl}/`);
});

test("propagates GitHub errors without falling back to a shared target", async () => {
  const github = client();
  github.paginate = async () => {
    throw new Error("GitHub checks are unavailable");
  };
  await assert.rejects(resolvePreview({ github, repository, prNumber: "2932" }), /GitHub checks are unavailable/);
});
