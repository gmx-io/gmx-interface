import { parity } from "domain/testUtils/parity/parity";
import {
  bpsOfSize,
  isProDiscountLarger,
  loadMinCollateralUsd,
  loadPositions,
  PRO_TIER_SCENARIO,
} from "domain/testUtils/parity/positions";
import { TRADER_PNL_CAP_SCENARIO } from "domain/testUtils/parity/scenarios";
import { getPositionInfo } from "sdk/utils/positions/utils";
import { convertToUsd } from "sdk/utils/tokens/utils";

const knownIssues = [
  {
    reason:
      "we keep the closing, referral and borrowing fees in USD, the contract floors them to collateral token units",
  },
  {
    reason:
      "getPositionInfo does not apply the pro tier discount to the closing fee, the contract takes the larger of the pro and referral discounts",
    scenario: PRO_TIER_SCENARIO,
  },
];

// The RPC path of usePositionsInfoRequest: Reader position + fees, everything else computed by getPositionInfo
parity("getPositionInfo <-> Reader.getPositionInfo", {
  markets: (market) => !market.isSpotOnly,
  cases: loadPositions,
  scenarios: [PRO_TIER_SCENARIO, TRADER_PNL_CAP_SCENARIO],
  ours: async ({ ctx, market, testCase }) => {
    const minCollateralUsd = await loadMinCollateralUsd(ctx);
    const info = getPositionInfo({
      position: testCase.position,
      marketInfo: market,
      minCollateralUsd,
      userReferralInfo: testCase.referralInfo,
      showPnlInLeverage: false,
      uiFeeFactor: 0n,
    });

    return {
      pnl: info.pnl,
      closePriceImpactUsd: info.closePriceImpactDeltaUsd,
      closeTotalImpactUsd: info.netPriceImapctDeltaUsd,
      closingFeeUsd: info.closingFeeUsd,
      netValueAfterAllFees: info.netValueAfterAllFees,
    };
  },
  contract: async ({ market, testCase: { info } }) => {
    const { funding, totalCostAmount, collateralTokenPrice, positionFeeAmount, totalDiscountAmount } = info.fees;
    const { longToken, shortToken } = market;
    const claimableLongUsd = convertToUsd(
      funding.claimableLongTokenAmount,
      longToken.decimals,
      longToken.prices.minPrice
    )!;
    const claimableShortUsd = convertToUsd(
      funding.claimableShortTokenAmount,
      shortToken.decimals,
      shortToken.prices.minPrice
    )!;

    return {
      pnl: info.basePnlUsd,
      closePriceImpactUsd: info.executionPriceResult.priceImpactUsd,
      closeTotalImpactUsd: info.executionPriceResult.totalImpactUsd,
      closingFeeUsd: (positionFeeAmount - totalDiscountAmount) * collateralTokenPrice.min,
      // the Reader adds claimable funding, which the app shows separately, and prices costs at the max collateral price
      netValueAfterAllFees:
        info.positionValueInUsd -
        claimableLongUsd -
        claimableShortUsd +
        totalCostAmount * (collateralTokenPrice.max - collateralTokenPrice.min),
    };
  },
  fields: {
    pnl: bpsOfSize,
    closePriceImpactUsd: bpsOfSize,
    closeTotalImpactUsd: bpsOfSize,
    closingFeeUsd: { ...bpsOfSize, knownIssues },
    netValueAfterAllFees: { ...bpsOfSize, knownIssues },
  },
  requiredCases: [
    { name: "the pro tier scenario applies", when: isProDiscountLarger },
    {
      name: "a position with capped pnl",
      when: ({ testCase: { info } }) => info.basePnlUsd !== info.uncappedBasePnlUsd,
    },
  ],
});
