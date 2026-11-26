import { getUncappedTotalImpactUsd } from "domain/testUtils/parity/context";
import { parity, ParityInput } from "domain/testUtils/parity/parity";
import {
  bpsOfSize,
  isProDiscountLarger,
  loadMinCollateralUsd,
  loadPositions,
  ParityPosition,
  PRO_TIER_SCENARIO,
} from "domain/testUtils/parity/positions";
import { MID_PRICES_SCENARIO, TRADER_PNL_CAP_SCENARIO } from "domain/testUtils/parity/scenarios";
import { bigMath } from "sdk/utils/bigmath";
import { getPositionInfo } from "sdk/utils/positions/utils";
import { convertToUsd } from "sdk/utils/tokens/utils";

// each of the three fees is off by less than one collateral token unit
const isFeeRounding = ({ testCase: { info } }: ParityInput<ParityPosition>, app: bigint, contract: bigint) =>
  bigMath.abs(app - contract) <= 3n * info.fees.collateralTokenPrice.max;

const feeRoundingReason =
  "we keep the closing, referral and borrowing fees in USD, the contract floors them to collateral token units";

const proTierIssue = {
  reason:
    "getPositionInfo does not apply the pro tier discount to the closing fee, the contract takes the larger of the pro and referral discounts",
  scenario: PRO_TIER_SCENARIO,
  appliesTo: isProDiscountLarger,
};

// The RPC path of usePositionsInfoRequest: Reader position + fees, everything else computed by getPositionInfo
parity("getPositionInfo <-> Reader.getPositionInfo", {
  markets: (market) => !market.isSpotOnly,
  cases: loadPositions,
  scenarios: [PRO_TIER_SCENARIO, TRADER_PNL_CAP_SCENARIO, MID_PRICES_SCENARIO],
  app: async ({ ctx, market, testCase }) => {
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
      closeTotalImpactUsd: getUncappedTotalImpactUsd(info.executionPriceResult),
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
    closingFeeUsd: {
      ...bpsOfSize,
      knownIssues: [
        {
          reason: feeRoundingReason,
          appliesTo: (input, app, contract) => isFeeRounding(input, app.closingFeeUsd, contract.closingFeeUsd),
        },
        proTierIssue,
      ],
    },
    netValueAfterAllFees: {
      ...bpsOfSize,
      knownIssues: [
        {
          reason: feeRoundingReason,
          appliesTo: (input, app, contract) =>
            isFeeRounding(input, app.netValueAfterAllFees, contract.netValueAfterAllFees),
        },
        proTierIssue,
      ],
    },
  },
  requiredCases: [
    { name: "the pro tier scenario applies", when: isProDiscountLarger, scenario: PRO_TIER_SCENARIO },
    {
      name: "a position with capped pnl",
      when: ({ testCase: { info } }) => info.basePnlUsd !== info.uncappedBasePnlUsd,
      scenario: TRADER_PNL_CAP_SCENARIO,
    },
  ],
});
