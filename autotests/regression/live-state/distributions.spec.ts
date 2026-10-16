import { expect } from "@playwright/test";
import { formatBalanceAmount, formatUsd } from "../../../sdk/src/utils/numbers/utils";
import { distributionToken, type Distribution } from "../fixtures/liveAccounts";
import { test } from "../fixtures/liveWallet";
import { openTooltip } from "../fixtures/marketData";

test.use({ liveProfile: "distribution" });

// The browser runs in UTC; these mirror the tab's "dd MMM yyyy" and "dd MMM yyyy, h:mm a" formats.
const utcDay = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${String(date.getUTCDate()).padStart(2, "0")} ${month} ${date.getUTCFullYear()}`;
};
const utcTime = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
const compact = (text: string) => text.replace(/\s+/g, "");

test("13.06 live distributions: first-page rows show the received dates, USD totals and transactions, and the latest row's tooltip and breakdown name each token amount", async ({
  page,
  liveAccount,
  liveAccounts,
  liveWallet,
}, testInfo) => {
  const received: Distribution[][] = [];
  page.on("response", (response) => {
    if (response.url() !== liveAccounts.endpoint || response.request().method() !== "POST" || !response.ok()) return;
    const body = response.request().postDataJSON();
    if (!body?.query?.includes("userIncentiveData") || body?.variables?.account !== liveAccount.account) return;
    void response.json().then(
      (data) => Array.isArray(data?.data?.distributions) && received.push(data.data.distributions),
      () => undefined
    );
  });
  await liveWallet.connect(page, "/earn/distributions");
  const table = page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "DATE", exact: true }) });
  const rows = table.locator("tbody > tr");
  await expect(rows.first()).toBeVisible({ timeout: 90_000 });

  let shown: Distribution[] = [];
  await expect
    .poll(
      async () => {
        const latest = received.at(-1);
        if (!latest) return "waiting for the distributions response";
        shown = latest.slice(0, 15);
        const cells = await rows.evaluateAll((trs) =>
          trs.map((tr) => ({
            text: Array.from(tr.querySelectorAll("td")).map((td) => (td as HTMLElement).innerText.trim()),
            tx: tr.querySelector("a[href*='/tx/']")?.getAttribute("href"),
          }))
        );
        if (cells.length !== shown.length) return `${cells.length} rows for ${shown.length} received`;
        const problems = shown.flatMap((distribution, i) => {
          const [date, , amount] = cells[i].text;
          const tokens = distribution.tokens.map((token) => distributionToken(liveAccounts.chainId, token)!);
          // GM amounts are valued at the current GM price; other tokens use the indexed USD value.
          const usd = tokens.some((token) => token.isGm)
            ? undefined
            : formatUsd(
                distribution.tokens.reduce((sum, _, j) => sum + BigInt(distribution.amountsInUsd?.[j] ?? 0), 0n)
              );
          return [
            date !== utcDay(distribution.timestamp) && `row ${i} date ${date}`,
            (usd ? compact(amount) !== compact(usd) : !/^\$[\d,.]+$/.test(compact(amount))) &&
              `row ${i} amount ${amount} vs ${usd}`,
            !cells[i].tx?.endsWith(`tx/${distribution.transactionHash}`) && `row ${i} transaction ${cells[i].tx}`,
          ].filter(Boolean);
        });
        return problems.length ? problems : "match";
      },
      { timeout: 60_000 }
    )
    .toBe("match");

  const [latest] = shown;
  const expected = latest.tokens.map((address, i) => {
    const token = distributionToken(liveAccounts.chainId, address)!;
    return `${formatBalanceAmount(BigInt(latest.amounts[i]), token.decimals)}${token.symbol}`;
  });
  // The amount tooltip lists each token with its icon, symbol first.
  const tooltip = await openTooltip(page, rows.first().locator("td").nth(2).locator(".Tooltip-handle"));
  await expect
    .poll(async () => {
      const text = compact(await tooltip.innerText());
      return latest.tokens
        .map((address, i) => {
          const token = distributionToken(liveAccounts.chainId, address)!;
          return `${token.symbol}${formatBalanceAmount(BigInt(latest.amounts[i]), token.decimals)}`;
        })
        .filter((part) => !text.includes(compact(part)));
    })
    .toEqual([]);
  await page.mouse.move(0, 0);
  await rows.first().locator("td").first().click();
  const details = rows.nth(1);
  // The transaction status is read from the app's public RPC and is not part of this row.
  await expect(details).toContainText("Timestamp");
  await expect
    .poll(async () => {
      const text = compact(await details.innerText());
      return [...expected, `${utcDay(latest.timestamp)},${utcTime(latest.timestamp)}`].filter(
        (part) => !text.includes(compact(part))
      );
    })
    .toEqual([]);
  await testInfo.attach("live-distribution", {
    body: JSON.stringify({ shownRows: shown.length, latest, expectedBreakdown: expected }),
    contentType: "application/json",
  });
});
