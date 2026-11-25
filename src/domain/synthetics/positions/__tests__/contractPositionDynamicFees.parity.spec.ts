import { parity, ParityInput } from "domain/testUtils/parity/parity";
import {
  bpsOfSize,
  getCollateralToken,
  loadPositions,
  loadStoredStateFees,
  ParityPosition,
} from "domain/testUtils/parity/positions";
import { convertToTokenAmount } from "sdk/utils/tokens/utils";

const missedAccrual = {
  reason: "getContractPositionDynamicFees does not add the accrual since the market's last update, the contract does",
};

// Funding is in collateral token units, so it is measured against the position size in them
const getSizeInCollateralTokens = ({ market, testCase: { position } }: ParityInput<ParityPosition>) => {
  const collateral = getCollateralToken(market, position);

  return convertToTokenAmount(position.sizeInUsd, collateral.decimals, collateral.prices.minPrice)!;
};

parity("getContractPositionDynamicFees <-> Reader.getPositionInfo, pending fees from stored market state", {
  markets: (market) => !market.isSpotOnly,
  cases: loadPositions,
  ours: async ({ ctx, market, testCase }) => {
    const { pendingBorrowingFeesUsd, fundingFeeAmount } = await loadStoredStateFees(ctx, market, testCase);

    return { pendingBorrowingFeesUsd, fundingFeeAmount };
  },
  reader: async ({ testCase: { info } }) => ({
    pendingBorrowingFeesUsd: info.fees.borrowing.borrowingFeeUsd,
    fundingFeeAmount: info.fees.funding.fundingFeeAmount,
  }),
  fields: {
    pendingBorrowingFeesUsd: { ...bpsOfSize, knownIssues: [missedAccrual] },
    fundingFeeAmount: {
      bpsOf: getSizeInCollateralTokens,
      toleranceBps: 0.001,
      knownIssues: [
        missedAccrual,
        { reason: "getFundingAmount floors the funding fee amount, the contract rounds it up" },
      ],
    },
  },
});
