import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { mockPositionInfo } from "domain/synthetics/testUtils/mocks";
import { createMockMarketInfo, createMockMarketsData } from "domain/testUtils/mockMarketInfo";
import { ETH_ADDRESS, ETH_TOKEN, USDC_ADDRESS, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { useMulticall } from "lib/multicall";
import { expandDecimals } from "lib/numbers";
import type { PositionsData } from "sdk/utils/positions/types";

import { usePositions } from "../usePositions";

vi.mock("lib/multicall", () => ({ useMulticall: vi.fn(), executeMulticall: vi.fn() }));
vi.mock("lib/metrics/reportFreshnessMetric", () => ({
  freshnessMetrics: { reportThrottled: vi.fn(), clear: vi.fn() },
}));
vi.mock("context/SyntheticsEvents", () => ({
  useSyntheticsEvents: () => ({ positionIncreaseEvents: [], positionDecreaseEvents: [], pendingPositionsUpdates: {} }),
}));

const ACCOUNT_A = "0x1111111111111111111111111111111111111111";
const ACCOUNT_B = "0x2222222222222222222222222222222222222222";

const marketInfo = createMockMarketInfo();
const marketsData = createMockMarketsData([marketInfo]);
const tokensData = { [USDC_ADDRESS]: USDC_TOKEN, [ETH_ADDRESS]: ETH_TOKEN };

const positionA = mockPositionInfo({
  marketInfo,
  collateralTokenAddress: USDC_ADDRESS,
  account: ACCOUNT_A,
  isLong: true,
  sizeInUsd: expandDecimals(10_000, 30),
  collateralUsd: expandDecimals(2_000, 30),
});

type LoadedPositions = { account: string; chainId: number; positionsData: PositionsData };

function mockMulticall(data: LoadedPositions | undefined) {
  vi.mocked(useMulticall).mockReturnValue({
    data,
    error: undefined,
    isLoading: data === undefined,
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useMulticall>);
}

function Probe({ account, resultRef }: { account: string; resultRef: { current?: PositionsData } }) {
  resultRef.current = usePositions(ARBITRUM, { marketsData, tokensData, account }).positionsData;

  return null;
}

function readPositions(account: string): PositionsData | undefined {
  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
  const resultRef: { current?: PositionsData } = {};

  render(<Probe account={account} resultRef={resultRef} />);

  return resultRef.current;
}

describe("usePositions", () => {
  afterEach(() => {
    cleanup();
    vi.mocked(useMulticall).mockReset();
  });

  it("returns the positions fetched for the current account", () => {
    mockMulticall({ account: ACCOUNT_A, chainId: ARBITRUM, positionsData: { [positionA.key]: positionA } });

    expect(readPositions(ACCOUNT_A)).toEqual({ [positionA.key]: positionA });
  });

  it("stays loading while the cache still holds another account's positions", () => {
    mockMulticall({ account: ACCOUNT_A, chainId: ARBITRUM, positionsData: { [positionA.key]: positionA } });

    expect(readPositions(ACCOUNT_B)).toBeUndefined();
  });

  it("stays loading while the cache still holds the same account's positions from another chain", () => {
    mockMulticall({ account: ACCOUNT_A, chainId: ARBITRUM + 1, positionsData: { [positionA.key]: positionA } });

    expect(readPositions(ACCOUNT_A)).toBeUndefined();
  });

  it("stays loading before the first response", () => {
    mockMulticall(undefined);

    expect(readPositions(ACCOUNT_A)).toBeUndefined();
  });

  it("tags the parsed response with the account it was requested for", () => {
    mockMulticall(undefined);
    readPositions(ACCOUNT_A);

    const { parseResponse } = vi.mocked(useMulticall).mock.calls[0][2];
    const response = {
      success: true,
      errors: {},
      data: {
        reader: {
          positions_0: {
            returnValues: [
              {
                position: {
                  addresses: {
                    account: ACCOUNT_A,
                    market: marketInfo.marketTokenAddress,
                    collateralToken: USDC_ADDRESS,
                  },
                  numbers: {
                    sizeInUsd: positionA.sizeInUsd,
                    sizeInTokens: positionA.sizeInTokens,
                    collateralAmount: positionA.collateralAmount,
                    increasedAtTime: 1n,
                    decreasedAtTime: 0n,
                    pendingImpactAmount: 0n,
                  },
                  flags: { isLong: true },
                },
                fees: {
                  borrowing: { borrowingFeeUsd: 0n },
                  funding: { fundingFeeAmount: 0n, claimableLongTokenAmount: 0n, claimableShortTokenAmount: 0n },
                  referral: { traderDiscountAmount: 0n },
                  ui: { uiFeeAmount: 0n },
                  positionFeeAmount: 0n,
                },
                basePnlUsd: 0n,
                positionValueInUsd: 0n,
              },
            ],
          },
        },
      },
    };

    const parsed = parseResponse!(response as never, ARBITRUM, [
      ACCOUNT_A,
      [marketInfo.marketTokenAddress],
    ]) as LoadedPositions;

    expect(parsed.account).toBe(ACCOUNT_A);
    expect(Object.keys(parsed.positionsData)).toEqual([positionA.key]);
    expect(parsed.positionsData[positionA.key].sizeInUsd).toBe(positionA.sizeInUsd);
  });
});
