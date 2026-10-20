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

function client({
  checks = [deployedCheck()],
  checkSequence,
  state = "open",
  updatedState = state,
  updatedHeadSha = headSha,
} = {}) {
  let reads = 0;
  let checkReads = 0;
  return {
    rest: {
      pulls: {
        get: async () => {
          const firstRead = reads++ === 0;
          return {
            data: { state: firstRead ? state : updatedState, head: { sha: firstRead ? headSha : updatedHeadSha } },
          };
        },
      },
      checks: {},
    },
    paginate: async () => (checkSequence ? checkSequence[Math.min(checkReads++, checkSequence.length - 1)] : checks),
  };
}

function resolve(options) {
  return resolvePreview({ github: client(options), repository, prNumber: "2932" });
}

test("ignores checks for another app, project or commit", async () => {
  const decoys = [
    deployedCheck({ id: 124, name: "Cloudflare Pages: gmx-interface-home" }),
    deployedCheck({ id: 125, app: { slug: "github-actions" } }),
    deployedCheck({ id: 126, head_sha: "b".repeat(40) }),
  ];
  for (const checks of [[], ...decoys.map((decoy) => [decoy])]) {
    await assert.rejects(resolve({ checks }), /no successful current/);
  }
  assert.deepEqual(await resolve({ checks: [...decoys, deployedCheck()] }), {
    prNumber: 2932,
    headSha,
    url: previewUrl,
    checkUrl,
  });
});

test("landing resolution needs the landing preview URL from its own check", async () => {
  const project = "gmx-interface-home";
  const url = "https://abcdef12.gmx-interface-home.pages.dev";
  const landing = (summaryUrl) =>
    deployedCheck({ name: `Cloudflare Pages: ${project}`, output: { summary: summary(summaryUrl) } });
  const run = (checks) => resolvePreview({ github: client({ checks }), repository, prNumber: "2932", project });
  assert.equal((await run([deployedCheck(), landing(url)])).url, url);
  await assert.rejects(run([landing(previewUrl)]), /immutable gmx-interface-home preview/);
});

test("uses only the latest deployment of the commit, without falling back to an older one", async () => {
  const url = "https://abcdef12.gmx-interface.pages.dev";
  for (const [latest, expectedUrl] of [
    [{ output: { summary: summary(url) } }, url],
    [{ status: "in_progress", conclusion: null }],
    [{ status: "completed", conclusion: "failure" }],
  ]) {
    const resolving = resolve({ checks: [deployedCheck(), deployedCheck({ id: 124, ...latest })] });
    if (expectedUrl) assert.equal((await resolving).url, expectedUrl);
    else await assert.rejects(resolving, /no successful current/);
  }
});

test("rejects a PR that is closed or changes before or during resolution", async () => {
  for (const [options, expectedHeadSha, error] of [
    [{ state: "closed" }, undefined, /must be open/],
    [{ updatedHeadSha: "b".repeat(40) }, undefined, /changed while resolving/],
    [{}, "b".repeat(40), /changed since this run/],
    [{ checks: [], updatedHeadSha: "b".repeat(40) }, undefined, /changed since this run/],
    [{ checks: [], updatedState: "closed" }, undefined, /must be open/],
  ]) {
    await assert.rejects(
      resolvePreview({
        github: client(options),
        repository,
        prNumber: "2932",
        expectedHeadSha,
        maxAttempts: 61,
        wait: async () => {},
      }),
      error
    );
  }
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

test("accepts only one unambiguous immutable root preview URL", async () => {
  for (const [output, expectedUrl] of [
    [{ summary: summary(`${previewUrl}/`).replaceAll("'", '"') }, `${previewUrl}/`],
    ...[
      "https://test.gmx-interface.pages.dev",
      "https://some-branch.gmx-interface.pages.dev",
      "https://6425cbf1.gmx-interface-home.pages.dev",
      "https://6425cbf1.gmx-interface.pages.dev.example.com",
      "https://6425cbf1.gmx-interface.pages.dev@evil.example",
      "http://6425cbf1.gmx-interface.pages.dev",
      "https://6425cbf1.gmx-interface.pages.dev/trade",
      "https://6425cbf1.gmx-interface.pages.dev?target=elsewhere",
    ].map((url) => [{ summary: summary(url) }]),
    [null],
    [{ summary: "" }],
    [{ summary: summary().replace("<strong>Preview URL:</strong>", "<strong>Other URL:</strong>") }],
    [{ summary: summary() + summary() }],
    [{ summary: summary().replace("</a>", '</a><a href="https://abcdef12.gmx-interface.pages.dev">another</a>') }],
  ]) {
    const resolving = resolve({ checks: [deployedCheck({ output })] });
    if (expectedUrl) assert.equal((await resolving).url, expectedUrl);
    else await assert.rejects(resolving, /no unambiguous immutable/, JSON.stringify(output));
  }
});

test("waits for the pinned commit's deployment until it succeeds, fails or runs out of attempts", async () => {
  for (const [checkSequence, expectedWaits, error] of [
    [[[], [deployedCheck({ status: "in_progress", conclusion: null })], [deployedCheck()]], 2],
    [[[]], 2, /no successful current/],
    [[[], [deployedCheck({ conclusion: "failure" })]], 1, /deployment \(failure\)/],
  ]) {
    let waits = 0;
    const resolving = resolvePreview({
      github: client({ checkSequence }),
      repository,
      prNumber: "2932",
      maxAttempts: 3,
      wait: async () => {
        waits++;
      },
    });
    if (error) await assert.rejects(resolving, error);
    else assert.equal((await resolving).url, previewUrl);
    assert.equal(waits, expectedWaits);
  }
});
