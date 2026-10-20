import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../env", () => ({
  isDevelopment: vi.fn(),
}));

import { ARBITRUM, ARBITRUM_SEPOLIA } from "../chains";
import { isDevelopment } from "../env";
import { getIndexerUrl, type IncentivesTestSquid } from "../indexers";
import { getIndexerUrlKey } from "../localStorage";

const mockIsDevelopment = vi.mocked(isDevelopment);

const ARBITRUM_IVPROD = "https://gmx-test.squids.live/gmx-synthetics-arbitrum@ivprod/api/graphql";
const ARBITRUM_IVTEST = "https://gmx-test.squids.live/gmx-synthetics-arbitrum@ivtest/api/graphql";
const ARBITRUM_PROD = "https://gmx.squids.live/gmx-synthetics-arbitrum:prod/api/graphql";
const SEPOLIA_IVTEST = "https://gmx-test.squids.live/gmx-synthetics-arb-sepolia@ivtest/api/graphql";
const SEPOLIA_PROD = "https://gmx.squids.live/gmx-synthetics-arb-sepolia:prod/api/graphql";
const SEPOLIA_OVERRIDE = "https://example.com/sepolia/graphql";
const ARBITRUM_OVERRIDE = "https://example.com/custom/graphql";

describe("getIndexerUrl", () => {
  beforeEach(() => {
    localStorage.clear();
    mockIsDevelopment.mockReset();
  });

  it.each<{
    chainId: number;
    indexer: "incentives" | "subsquid";
    isDev: boolean;
    squid?: IncentivesTestSquid;
    override?: { chainId: number; url: string };
    expected: string;
  }>([
    { chainId: ARBITRUM, indexer: "incentives", isDev: true, expected: ARBITRUM_IVPROD },
    { chainId: ARBITRUM, indexer: "incentives", isDev: true, squid: "ivtest", expected: ARBITRUM_IVTEST },
    { chainId: ARBITRUM, indexer: "incentives", isDev: false, squid: "ivtest", expected: ARBITRUM_PROD },
    { chainId: ARBITRUM, indexer: "subsquid", isDev: false, expected: ARBITRUM_PROD },
    { chainId: ARBITRUM, indexer: "subsquid", isDev: true, squid: "ivtest", expected: ARBITRUM_PROD },
    { chainId: ARBITRUM_SEPOLIA, indexer: "incentives", isDev: true, squid: "ivprod", expected: SEPOLIA_IVTEST },
    { chainId: ARBITRUM_SEPOLIA, indexer: "incentives", isDev: false, squid: "ivtest", expected: SEPOLIA_IVTEST },
    { chainId: ARBITRUM_SEPOLIA, indexer: "subsquid", isDev: true, squid: "ivtest", expected: SEPOLIA_PROD },
    { chainId: ARBITRUM_SEPOLIA, indexer: "subsquid", isDev: false, squid: "ivprod", expected: SEPOLIA_PROD },
    {
      chainId: ARBITRUM,
      indexer: "incentives",
      isDev: true,
      squid: "ivtest",
      override: { chainId: ARBITRUM, url: ARBITRUM_OVERRIDE },
      expected: ARBITRUM_OVERRIDE,
    },
    {
      chainId: ARBITRUM_SEPOLIA,
      indexer: "incentives",
      isDev: true,
      override: { chainId: ARBITRUM_SEPOLIA, url: SEPOLIA_OVERRIDE },
      expected: SEPOLIA_OVERRIDE,
    },
    {
      chainId: ARBITRUM,
      indexer: "incentives",
      isDev: true,
      override: { chainId: ARBITRUM_SEPOLIA, url: SEPOLIA_OVERRIDE },
      expected: ARBITRUM_IVPROD,
    },
  ])(
    "$indexer on $chainId, dev=$isDev, squid=$squid -> $expected",
    ({ chainId, indexer, isDev, squid, override, expected }) => {
      mockIsDevelopment.mockReturnValue(isDev);
      if (override) {
        localStorage.setItem(getIndexerUrlKey(override.chainId, "incentives"), override.url);
      }

      expect(getIndexerUrl(chainId, indexer, { incentivesTestSquid: squid })).toBe(expected);
    }
  );
});
