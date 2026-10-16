import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { readRegressionIndexers } from "../fixtures/deploymentConfig";
import { productionChains, publicClient, readProductionEndpoints } from "../fixtures/productionChains";

const MAX_INDEXER_LAG_SECONDS = 30 * 60;
const { source, endpoints } = readRegressionIndexers();

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
const qaStartRoot = process.env.REGRESSION_QA_START_ROOT;

if (qaStartRoot) {
  test("0.01 indexer config is unchanged since the QA pass started", async ({}, testInfo) => {
    const started = readFileSync(join(qaStartRoot, "src/config/indexers.ts"), "utf8");
    await testInfo.attach("indexer-config-hashes", {
      body: JSON.stringify({ qaStart: sha256(started), shipping: sha256(source) }),
      contentType: "application/json",
    });
    expect(source, "src/config/indexers.ts changed since the QA pass; rerun the history and stats checks").toBe(
      started
    );
  });
}

for (const { configKey } of productionChains) {
  test(`0.02 0.04 ${configKey} checkout indexer uses the moving production tag`, async ({}, testInfo) => {
    const endpoint = endpoints.get(configKey);
    expect(endpoint, `No subsquid endpoint found for ${configKey}`).toBeDefined();
    const url = new URL(endpoint!);
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("gmx.squids.live");
    expect(url.pathname).toMatch(/:prod\/api\/graphql$/);
    expect(url.pathname).not.toContain("@");
    await testInfo.attach("checkout-indexer-config", {
      body: JSON.stringify({ configKey, endpoint, sha256: sha256(source) }),
      contentType: "application/json",
    });
  });
}

for (const { keys, url } of readProductionEndpoints().filter(({ file }) => file === "src/config/indexers.ts")) {
  const [, configKey, kind] = keys;
  test(`0.03 ${configKey} ${kind} indexer answers and is within 30 minutes of the chain head`, async ({
    request,
  }, testInfo) => {
    const isSquid = kind === "subsquid";
    const response = await request.post(url, {
      data: {
        query: isSquid ? "{ squidStatus { height } }" : "{ _meta { block { number timestamp } hasIndexingErrors } }",
      },
      maxRedirects: 0,
      timeout: 20_000,
    });
    expect(response.status(), `${url} returned HTTP ${response.status()}`).toBe(200);
    const body = await response.json();
    expect(body.errors, "GraphQL errors inside HTTP 200 are failures").toBeUndefined();
    let timestamp: number;
    if (isSquid) {
      const chain = productionChains.find((chain) => chain.configKey === configKey)!;
      const block = await publicClient(chain.id).getBlock({ blockNumber: BigInt(body.data.squidStatus.height) });
      timestamp = Number(block.timestamp);
    } else {
      expect(body.data._meta.hasIndexingErrors).toBe(false);
      timestamp = body.data._meta.block.timestamp;
    }
    const lag = Math.round(Date.now() / 1000 - timestamp);
    await testInfo.attach("indexer-freshness", {
      body: JSON.stringify({ url, response: body.data, lagSeconds: lag }),
      contentType: "application/json",
    });
    expect(lag).toBeLessThan(MAX_INDEXER_LAG_SECONDS);
  });
}
