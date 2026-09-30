import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import useSWRInfinite from "swr/infinite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { createMockMarketInfo, MOCK_MARKET_ADDRESS } from "domain/testUtils/mockMarketInfo";
import { USDC_ADDRESS, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { getToken, getTokensMap } from "sdk/configs/tokens";

import { ClaimType } from "./types";
import {
  ClaimCollateralHistoryResult,
  RawClaimAction,
  fetchRawClaimActions,
  useClaimCollateralHistory,
} from "./useClaimHistory";

const queryMock = vi.fn();

vi.mock("lib/indexers", () => ({
  getSubsquidGraphClient: () => ({ query: queryMock }),
}));

vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: () => ({ showDebugValues: false }),
}));

vi.mock("context/SyntheticsStateContext/hooks/globalsHooks", () => ({
  useMarketsInfoData: vi.fn(),
  useTokensData: vi.fn(),
}));

vi.mock("context/SyntheticsStateContext/selectors/globalSelectors", () => ({
  selectAccount: vi.fn(),
}));

vi.mock("context/SyntheticsStateContext/utils", () => ({
  useSelector: () => "0x47a6D13E4bac608980fA0494023f1B73C646067a",
}));

vi.mock("swr/infinite", () => ({ default: vi.fn() }));

describe("fetchRawClaimActions", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({ data: { claimActions: [] } });
  });

  it("filters by the indexed scalar timestamp fields", async () => {
    await fetchRawClaimActions({
      chainId: 42161,
      account: "0xAccount",
      pageIndex: 0,
      pageSize: 300,
      fromTxTimestamp: 1783425600,
      toTxTimestamp: 1786620000,
    });

    const body = queryMock.mock.calls[0][0].query.loc.source.body;
    expect(body).toContain("timestamp_gte:1783425600");
    expect(body).toContain("timestamp_lte:1786620000");
    // transaction_timestamp_* is not a valid ClaimActionWhereInput field and fails the whole query
    expect(body).not.toContain("transaction_timestamp");
  });
});

describe("useClaimCollateralHistory", () => {
  const unknownAddress = "0x47c031236e19d024b42f8AE6780E44A573170703";
  const marketInfo = createMockMarketInfo();
  const usdc = getToken(ARBITRUM, USDC_ADDRESS);

  function createAction(overrides: Partial<RawClaimAction> = {}): RawClaimAction {
    return {
      id: "claim",
      eventName: ClaimType.ClaimFunding,
      account: "0x47a6D13E4bac608980fA0494023f1B73C646067a",
      marketAddresses: [MOCK_MARKET_ADDRESS],
      tokenAddresses: [USDC_ADDRESS],
      amounts: ["1000000"],
      tokenPrices: ["1000000000000000000000000"],
      transactionHash: "0xHash",
      timestamp: 1775174400,
      ...overrides,
    };
  }

  function readHistory(pages: RawClaimAction[][], pageIndex = pages.length) {
    vi.mocked(useSWRInfinite).mockReturnValue({
      data: pages.map((claimActions) => ({ claimActions })),
      error: undefined,
      size: pageIndex,
      setSize: vi.fn(),
      mutate: vi.fn(),
      isValidating: false,
      isLoading: false,
    });

    let result: ClaimCollateralHistoryResult | undefined;
    function Harness() {
      result = useClaimCollateralHistory(ARBITRUM, { pageSize: 100 });
      return null;
    }
    renderToStaticMarkup(createElement(Harness));
    return result!;
  }

  beforeEach(() => {
    vi.mocked(useMarketsInfoData).mockReturnValue({ [MOCK_MARKET_ADDRESS]: marketInfo });
    vi.mocked(useTokensData).mockReturnValue({ [USDC_ADDRESS]: USDC_TOKEN });
  });

  afterEach(() => {
    getTokensMap(ARBITRUM)[USDC_ADDRESS] = usdc;
  });

  it("omits the zero-amount claim in an unlisted GM token without hiding other pages", () => {
    const validClaim = createAction({ id: "valid-claim" });
    const result = readHistory([[createAction({ tokenAddresses: [unknownAddress], amounts: ["0"] })], [validClaim]]);

    expect(result.isLoading).toBe(false);
    expect(result.claimActions).toMatchObject([{ id: validClaim.id, amounts: [1000000n], tokens: [usdc] }]);
  });

  it.each(Object.values(ClaimType))("omits the entire mixed-token %s action", (eventName) => {
    const result = readHistory([
      [
        createAction({
          eventName,
          marketAddresses: [MOCK_MARKET_ADDRESS, MOCK_MARKET_ADDRESS],
          tokenAddresses: [USDC_ADDRESS, unknownAddress],
          amounts: ["1000000", "0"],
          tokenPrices: ["1000000000000000000000000", "0"],
        }),
      ],
    ]);

    expect(result.claimActions).toEqual([]);
    expect(result.isLoading).toBe(false);
  });

  it.each(Object.values(ClaimType))("omits the entire mixed-market %s action", (eventName) => {
    const result = readHistory([
      [
        createAction({
          eventName,
          marketAddresses: [MOCK_MARKET_ADDRESS, unknownAddress],
          tokenAddresses: [USDC_ADDRESS, USDC_ADDRESS],
          amounts: ["1000000", "0"],
          tokenPrices: ["1000000000000000000000000", "0"],
        }),
      ],
    ]);

    expect(result.claimActions).toEqual([]);
  });

  it.each(Object.values(ClaimType))("preserves a supported %s action", (eventName) => {
    const rawAction = createAction({ eventName, isLongOrders: [false] });
    const { claimActions } = readHistory([[rawAction]]);

    expect(claimActions).toMatchObject([
      {
        id: rawAction.id,
        eventName,
        account: rawAction.account,
        transactionHash: rawAction.transactionHash,
        timestamp: rawAction.timestamp,
        tokens: [usdc],
        amounts: [1000000n],
        tokenPrices: [10n ** 24n],
        claimItems:
          eventName === ClaimType.SettleFundingFeeCreated || eventName === ClaimType.SettleFundingFeeCancelled
            ? []
            : [{ marketInfo, shortTokenAmount: 1000000n, shortTokenAmountUsd: 10n ** 30n }],
      },
    ]);
  });

  it("shows the complete claim once its token is listed", () => {
    const rawAction = createAction({
      marketAddresses: [MOCK_MARKET_ADDRESS, MOCK_MARKET_ADDRESS],
      tokenAddresses: [marketInfo.longTokenAddress, USDC_ADDRESS],
      amounts: ["1000000000000000000", "1000000"],
      tokenPrices: ["2000000000000000", "1000000000000000000000000"],
    });
    delete getTokensMap(ARBITRUM)[USDC_ADDRESS];
    expect(readHistory([[rawAction]]).claimActions).toEqual([]);

    getTokensMap(ARBITRUM)[USDC_ADDRESS] = usdc;
    expect(readHistory([[rawAction]]).claimActions).toMatchObject([
      {
        amounts: [10n ** 18n, 1000000n],
        tokens: [getToken(ARBITRUM, marketInfo.longTokenAddress), usdc],
        claimItems: [{ longTokenAmount: 10n ** 18n, shortTokenAmount: 1000000n }],
      },
    ]);
  });

  it("continues pagination past a full page of omitted claims", () => {
    const omittedPage = Array.from({ length: 100 }, (_, i) =>
      createAction({ id: `omitted-${i}`, tokenAddresses: [unknownAddress] })
    );
    const firstPage = readHistory([omittedPage]);
    expect(firstPage.claimActions).toEqual([]);
    expect(firstPage.hasMorePages).toBe(true);

    const loadingNextPage = readHistory([omittedPage], 2);
    expect(loadingNextPage.hasMorePages).toBe(false);

    const nextPage = readHistory([omittedPage, [createAction({ id: "older-valid-claim" })]]);
    expect(nextPage.claimActions).toMatchObject([{ id: "older-valid-claim" }]);
    expect(nextPage.hasMorePages).toBe(false);
  });
});
