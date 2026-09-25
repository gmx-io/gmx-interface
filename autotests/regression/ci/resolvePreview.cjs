const CHECK_NAME = "Cloudflare Pages: gmx-interface";

module.exports = async function resolvePreview({ github, repository, prNumber }) {
  const pullNumber = Number(prNumber);
  if (!Number.isSafeInteger(pullNumber) || pullNumber <= 0 || String(pullNumber) !== prNumber) {
    throw new Error("Enter a positive PR number, for example 2932.");
  }

  const pullParams = { ...repository, pull_number: pullNumber };
  const { data: pull } = await github.rest.pulls.get(pullParams);
  if (pull.state !== "open") {
    throw new Error(`PR #${prNumber} must be open to run candidate regression.`);
  }

  const headSha = pull.head.sha;
  const checks = await github.paginate(github.rest.checks.listForRef, {
    ...repository,
    ref: headSha,
    check_name: CHECK_NAME,
    filter: "all",
    per_page: 100,
  });
  const check = checks
    .filter(
      (entry) =>
        entry.name === CHECK_NAME && entry.app?.slug === "cloudflare-workers-and-pages" && entry.head_sha === headSha
    )
    .sort((a, b) => b.id - a.id)[0];

  if (!check || check.status !== "completed" || check.conclusion !== "success") {
    throw new Error(
      `PR #${prNumber} (${headSha}) has no successful current ${CHECK_NAME} deployment. Wait for its preview to deploy, then manually rerun this workflow.`
    );
  }

  const rows = check.output?.summary?.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
  const previewRows = rows.filter((row) => /<strong>\s*Preview URL:\s*<\/strong>/i.test(row));
  const links = previewRows.length === 1 ? [...previewRows[0].matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)] : [];
  const url = links.length === 1 ? links[0][1] : "";
  if (url.trim() !== url || !/^https:\/\/[a-f0-9]{8}\.gmx-interface\.pages\.dev\/?$/.test(url)) {
    throw new Error(
      `The successful Cloudflare check for PR #${prNumber} has no unambiguous immutable gmx-interface preview URL. Check its output format; branch aliases and other projects are not accepted.`
    );
  }

  const { data: currentPull } = await github.rest.pulls.get(pullParams);
  if (currentPull.state !== "open" || currentPull.head.sha !== headSha) {
    throw new Error(`PR #${prNumber} changed while resolving its deployment. Run the workflow again.`);
  }

  return { prNumber: pullNumber, headSha, url, checkUrl: check.html_url };
};
