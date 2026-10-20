import { expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import ts from "typescript";

import { test } from "../fixtures/browser";
import { selectNetwork } from "../fixtures/network";

type Competition = { href: string; chain?: "Arbitrum" | "Avalanche"; enabled: boolean; from: number; to?: number };

function readCompetitions() {
  const path = "src/domain/synthetics/leaderboard/constants.ts";
  const file = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  const pages = file.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .find((declaration) => declaration.name.getText(file) === "LEADERBOARD_PAGES")?.initializer;
  if (!pages || !ts.isObjectLiteralExpression(pages)) throw new Error(`Missing LEADERBOARD_PAGES in ${path}`);
  const fields = (node: ts.Node | undefined): Record<string, ts.Expression | undefined> => {
    const properties =
      node && ts.isObjectLiteralExpression(node) ? node.properties.filter(ts.isPropertyAssignment) : [];
    return Object.fromEntries(properties.map((property) => [property.name.getText(file), property.initializer]));
  };
  return pages.properties.filter(ts.isPropertyAssignment).flatMap((page): Competition[] => {
    const config = fields(page.initializer);
    if (config.isCompetition?.kind !== ts.SyntaxKind.TrueKeyword) return [];
    const timeframe = fields(config.timeframe);
    const chain = config.chainId?.getText(file);
    return [
      {
        href: (config.href as ts.StringLiteral).text,
        chain: chain === "ARBITRUM" ? "Arbitrum" : chain === "AVALANCHE" ? "Avalanche" : undefined,
        enabled: config.enabled?.kind === ts.SyntaxKind.TrueKeyword,
        from: Number(timeframe.from?.getText(file)),
        to: timeframe.to && ts.isNumericLiteral(timeframe.to) ? Number(timeframe.to.text) : undefined,
      },
    ];
  });
}

const competitions = readCompetitions().filter((competition) => competition.enabled);
const now = Date.now() / 1000;
const active = competitions.filter((c) => c.from <= now && (c.to === undefined || c.to > now));

test("16.07 active competition pages load their rankings", async ({ page }) => {
  test.skip(active.length === 0, "no enabled competition in LEADERBOARD_PAGES is running now");
  for (const competition of active) {
    await page.goto(competition.href);
    await expect(page.getByRole("button", { name: "Top PnL ($)", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Top PnL (%)", exact: true })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("Concluded competitions", { exact: true })).toHaveCount(0);
  }
});

test("16.08 chain-specific competition asks for its network from another chain and switches on click", async ({
  page,
  chainId,
}) => {
  const competition = [...active, ...competitions].find((c) => c.chain);
  test.skip(!competition, "no enabled chain-specific competition in LEADERBOARD_PAGES");
  const network = competition!.chain!;
  const other = network === "Arbitrum" ? "Avalanche" : "Arbitrum";
  await page.goto(competition!.href);
  if ((chainId === 42161 ? "Arbitrum" : "Avalanche") === network) await selectNetwork(page, other);
  const prompt = page.getByText(`This competition is held on the ${network} network.`, { exact: false });
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText("to participate");
  await prompt.getByText("Change your network", { exact: true }).click();
  await expect(page.getByRole("banner").getByRole("button", { name: network, exact: true })).toBeVisible();
  await expect(prompt).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("SELECTED_NETWORK")))
    .toBe(network === "Arbitrum" ? "42161" : "43114");
  await expect(page).toHaveURL(new RegExp(`${competition!.href}$`));
});
