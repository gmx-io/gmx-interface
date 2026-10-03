import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(process.env.REGRESSION_INDEXER_CONFIG || "src/config/indexers.ts", "utf8");
const file = ts.createSourceFile("indexers.ts", source, ts.ScriptTarget.Latest, true);
const endpoints = new Map<string, string>();
for (const statement of file.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const declaration of statement.declarationList.declarations) {
    if (declaration.name.getText(file) !== "INDEXER_URLS" || !declaration.initializer) continue;
    if (!ts.isObjectLiteralExpression(declaration.initializer)) continue;
    for (const chain of declaration.initializer.properties) {
      if (!ts.isPropertyAssignment(chain) || !ts.isObjectLiteralExpression(chain.initializer)) continue;
      for (const entry of chain.initializer.properties) {
        if (
          ts.isPropertyAssignment(entry) &&
          entry.name.getText(file) === "subsquid" &&
          ts.isStringLiteral(entry.initializer)
        ) {
          endpoints.set(chain.name.getText(file), entry.initializer.text);
        }
      }
    }
  }
}

for (const chain of ["ARBITRUM", "AVALANCHE", "MEGAETH"]) {
  test(`RR-00-02 RR-00-04 ${chain} checkout indexer uses the moving production tag`, async ({}, testInfo) => {
    const endpoint = endpoints.get(`[${chain}]`);
    expect(endpoint, `No subsquid endpoint found for ${chain}`).toBeDefined();
    const url = new URL(endpoint!);
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("gmx.squids.live");
    expect(url.pathname).toMatch(/:prod\/api\/graphql$/);
    expect(url.pathname).not.toContain("@");
    await testInfo.attach("checkout-indexer-config", {
      body: JSON.stringify({ chain, endpoint, sha256: createHash("sha256").update(source).digest("hex") }),
      contentType: "application/json",
    });
  });

  test(`RR-00-03 ${chain} production indexer accepts a GraphQL query`, async ({ request }) => {
    const endpoint = endpoints.get(`[${chain}]`);
    expect(endpoint).toBeDefined();
    const response = await request.post(endpoint!, {
      data: { query: "query RegressionHealth { __typename }" },
      timeout: 20_000,
    });
    expect(response.ok(), `Indexer returned HTTP ${response.status()}`).toBe(true);
    const body = await response.json();
    expect(body.errors, "GraphQL errors inside HTTP 200 are failures").toBeUndefined();
    expect(body.data?.__typename).toBeTruthy();
  });
}
