import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import {
  readRegressionAnnouncements,
  readRegressionEndpoints,
  readRegressionGlvs,
  readRegressionIndexers,
} from "./deploymentConfig";

const candidateFiles = {
  "src/config/indexers.ts": `
    throw new Error("Candidate code must not execute");
    const INDEXER_URLS = { [ARBITRUM]: { subsquid: "https://example.com/deployed:prod/api/graphql", syntheticsStats: "https://example.com/deployed-gm" } };
  `,
  "src/config/markets.ts": `
    export const GLV_MARKETS = {
      [ARBITRUM]: { "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9": {} },
      [AVALANCHE]: { "0x901eE57f7118A7be56ac079cbCDa7F22663A3874": {} }
    };
  `,
  "sdk/src/configs/oracleKeeper.ts": `
    const ORACLE_KEEPER_URLS: Record<ContractsChainId, string> = { [ARBITRUM]: "https://keeper.example.com" };
    const ORACLE_KEEPER_FALLBACK_URLS = { [ARBITRUM]: ["https://fallback-1.example.com", "https://fallback-2.example.com"] };
  `,
  "sdk/src/configs/api.ts": `
    const API_URLS = { production: { [ARBITRUM]: "https://api.example.com", [AVALANCHE_FUJI]: undefined }, test: { [ARBITRUM]: "https://test.example.com" } };
    const API_FALLBACK_URLS = { production: { [ARBITRUM]: [] } };
  `,
  "src/config/backend.ts": `const BACKEND_URLS = { default: "https://backend.example.com" };`,
  "src/config/events.tsx": `
    export const appEventsData: EventData[] = [
      { id: "release-2", type: "update", isActive: true, startDate: "14 Sep 2026, 08:00", endDate: "21 Sep 2026, 08:00", title: <b>New</b>,
        description: <><Link to="/trade">Trade</Link> or <ExternalLink href={"https://gmx.io/builders"}>build</ExternalLink> <Link to={path}>x</Link></>,
        link: { text: "Read more", href: "https://docs.gmx.io/docs", newTab: true } },
      { id: "listing", type: "listing", isActive: false, flagId: "showListing", endDate: "01 Sep 2026, 12:00", chains: [ARBITRUM, AVALANCHE] },
    ];
  `,
};

test("discovery reads the deployed checkout configuration without executing its code", () => {
  const root = mkdtempSync(join(tmpdir(), "gmx-live-config-"));
  const previousRoot = process.env.REGRESSION_CANDIDATE_ROOT;
  try {
    for (const [path, source] of Object.entries(candidateFiles)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), source);
    }
    process.env.REGRESSION_CANDIDATE_ROOT = root;
    assert.equal(readRegressionIndexers().endpoints.get("[ARBITRUM]"), "https://example.com/deployed:prod/api/graphql");
    assert.equal(
      readRegressionIndexers("syntheticsStats").endpoints.get("[ARBITRUM]"),
      "https://example.com/deployed-gm"
    );
    assert.deepEqual(readRegressionGlvs(43114), ["0x901eE57f7118A7be56ac079cbCDa7F22663A3874"]);
    assert.deepEqual(
      readRegressionEndpoints().map(({ keys, url }) => [keys.join(" "), url]),
      [
        ["INDEXER_URLS [ARBITRUM] subsquid", "https://example.com/deployed:prod/api/graphql"],
        ["INDEXER_URLS [ARBITRUM] syntheticsStats", "https://example.com/deployed-gm"],
        ["ORACLE_KEEPER_URLS [ARBITRUM]", "https://keeper.example.com"],
        ["ORACLE_KEEPER_FALLBACK_URLS [ARBITRUM]", "https://fallback-1.example.com"],
        ["ORACLE_KEEPER_FALLBACK_URLS [ARBITRUM]", "https://fallback-2.example.com"],
        ["API_URLS production [ARBITRUM]", "https://api.example.com"],
        ["API_URLS test [ARBITRUM]", "https://test.example.com"],
        ["BACKEND_URLS default", "https://backend.example.com"],
      ]
    );
    assert.deepEqual(readRegressionAnnouncements(), [
      {
        id: "release-2",
        type: "update",
        isActive: true,
        startDate: "14 Sep 2026, 08:00",
        endDate: "21 Sep 2026, 08:00",
        linkHref: "https://docs.gmx.io/docs",
        hrefs: ["/trade", "https://gmx.io/builders"],
      },
      {
        id: "listing",
        type: "listing",
        isActive: false,
        flagId: "showListing",
        endDate: "01 Sep 2026, 12:00",
        chains: ["ARBITRUM", "AVALANCHE"],
        hrefs: [],
      },
    ]);
    writeFileSync(join(root, "src/config/markets.ts"), "const UNKNOWN_CONFIG = {};");
    assert.throws(() => readRegressionGlvs(42161), /Missing GLV_MARKETS/);
  } finally {
    if (previousRoot === undefined) delete process.env.REGRESSION_CANDIDATE_ROOT;
    else process.env.REGRESSION_CANDIDATE_ROOT = previousRoot;
    rmSync(root, { recursive: true });
  }
});
