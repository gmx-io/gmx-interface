import { describe, expect, it } from "vitest";

import { mockPositionInfo } from "domain/synthetics/testUtils/mocks";
import { Operation } from "domain/synthetics/trade/usePositionEditorState";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState, MOCK_ACCOUNT } from "domain/testUtils/mockSyntheticsState";
import { ETH_TOKEN, USDC_ADDRESS } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";

import type { SyntheticsState } from "../../SyntheticsStateContextProvider";
import { selectPositionEditorIsBlockedByClosedMarket } from "../positionEditorSelectors";

const marketInfo = createMockMarketInfo(ETH_TOKEN);

function isBlocked(
  operation: Operation,
  depositMode: "now" | "atPrice",
  replacingOrderKey: string | undefined,
  isMarketClosed: boolean
) {
  const position = mockPositionInfo({
    marketInfo,
    collateralTokenAddress: USDC_ADDRESS,
    account: MOCK_ACCOUNT,
    isLong: true,
    sizeInUsd: expandDecimals(10_000, 30),
    collateralUsd: expandDecimals(1_000, 30),
  });
  const state = createMockSyntheticsState({
    marketInfo,
    account: MOCK_ACCOUNT,
    positionsInfoData: { [position.key]: position },
  });

  return selectPositionEditorIsBlockedByClosedMarket({
    ...state,
    globals: { ...state.globals, closedMarkets: isMarketClosed ? { [marketInfo.marketTokenAddress]: true } : {} },
    positionEditor: { editingPositionKey: position.key, operation, depositMode, replacingOrderKey },
  } as unknown as SyntheticsState);
}

describe("selectPositionEditorIsBlockedByClosedMarket", () => {
  it("blocks deposits now and withdrawals on a closed market but keeps At price deposits TRD-45", () => {
    const cases: [Operation, "now" | "atPrice", string | undefined, boolean, boolean][] = [
      [Operation.Deposit, "now", undefined, true, true],
      [Operation.Deposit, "atPrice", undefined, true, false],
      [Operation.Deposit, "atPrice", "0xorder", true, false],
      [Operation.Withdraw, "now", undefined, true, true],
      [Operation.Withdraw, "atPrice", "0xorder", true, true],
      [Operation.Deposit, "now", undefined, false, false],
      [Operation.Withdraw, "now", undefined, false, false],
    ];

    for (const [operation, depositMode, replacingOrderKey, isMarketClosed, expected] of cases) {
      expect(
        isBlocked(operation, depositMode, replacingOrderKey, isMarketClosed),
        `${operation} ${depositMode} replacing=${replacingOrderKey !== undefined} closed=${isMarketClosed}`
      ).toBe(expected);
    }
  });
});
