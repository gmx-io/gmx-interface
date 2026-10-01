import { describe, expect, it } from "vitest";

import { mockPositionInfo } from "domain/synthetics/testUtils/mocks";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState, MOCK_ACCOUNT } from "domain/testUtils/mockSyntheticsState";
import { ETH_TOKEN, USDC_ADDRESS } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";

import type { SyntheticsState } from "../../SyntheticsStateContextProvider";
import { selectPositionEditorMaxWithdrawAmount } from "../positionEditorSelectors";

// no fees, no price impact: 1 % regular factor, 100x max allowed leverage; ETH is mocked at 2 000
const marketInfo = createMockMarketInfo(ETH_TOKEN, {
  positionFeeFactorForBalanceWasImproved: 0n,
  positionFeeFactorForBalanceWasNotImproved: 0n,
  positionImpactFactorPositive: 0n,
  positionImpactFactorNegative: 0n,
});

const usd = (value: number) => expandDecimals(value, 30);

/** a 10 000 USD long with 1 000 USD of collateral */
function createState(pnlUsd: bigint): SyntheticsState {
  const sizeInUsd = usd(10_000);
  const collateralUsd = usd(1_000);
  const position = mockPositionInfo(
    { marketInfo, collateralTokenAddress: USDC_ADDRESS, account: MOCK_ACCOUNT, isLong: true, sizeInUsd, collateralUsd },
    {
      sizeInTokens: ((sizeInUsd + pnlUsd) * expandDecimals(1, 18)) / usd(2_000),
      pnl: pnlUsd,
      markPrice: usd(2_000),
      remainingCollateralUsd: collateralUsd,
    }
  );
  const state = createMockSyntheticsState({
    marketInfo,
    account: MOCK_ACCOUNT,
    positionsInfoData: { [position.key]: position },
  });

  return {
    ...state,
    positionEditor: {
      editingPositionKey: position.key,
      selectedCollateralAddressMap: {},
      isCollateralTokenFromGmxAccount: false,
    },
  } as unknown as SyntheticsState;
}

describe("selectPositionEditorMaxWithdrawAmount", () => {
  it("keeps 1 % of the contract limit in reserve for a losing position", () => {
    // a 700 loss leaves 300 of margin against a 100 minimum: the contract accepts up to 200 USDC
    expect(selectPositionEditorMaxWithdrawAmount(createState(-usd(700)))).toBe(expandDecimals(198, 6));
  });

  it("keeps 1 % of the max allowed leverage limit in reserve for a profitable position", () => {
    // 100x on 10 000 needs 100 of collateral: 900 USDC above it
    expect(selectPositionEditorMaxWithdrawAmount(createState(usd(2_000)))).toBe(expandDecimals(891, 6));
  });
});
