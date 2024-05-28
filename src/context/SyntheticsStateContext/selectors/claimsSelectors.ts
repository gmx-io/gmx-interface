import { getTotalAccruedFundingUsd, getTotalClaimableFundingUsd } from "domain/synthetics/markets";
import { createSelector } from "../utils";
import { selectMarketsInfoData, selectPositionsInfoData, selectTokensData } from "./globalSelectors";
import { calcTotalRebateUsd } from "components/Synthetics/Claims/utils";
import { RebateInfoItem } from "domain/synthetics/fees/useRebatesInfo";
import { SyntheticsState } from "../SyntheticsStateContextProvider";

export const selectClaimablePositionPriceImpactFees = (s: SyntheticsState) => s.claims.claimablePositionPriceImpactFees;
const selectAccruedPositionPriceImpactFees = (s: SyntheticsState) => s.claims.accruedPositionPriceImpactFees;

export const selectClaimsFundingFeesAccruedTotal = createSelector(function selectAccruedFundingFees(q) {
  const positionsInfoData = q(selectPositionsInfoData);
  const positions = Object.values(positionsInfoData || {});
  return getTotalAccruedFundingUsd(positions);
});

export const selectClaimsFundingFeesClaimableTotal = createSelector(function selectClaimableFundingFees(q) {
  const marketsInfoData = q(selectMarketsInfoData);
  const markets = Object.values(marketsInfoData ?? {});
  return getTotalClaimableFundingUsd(markets);
});

export const selectClaimsPriceImpactClaimableTotal = createSelector(function selectPriceImpactClaimable(q) {
  const claimablePositionPriceImpactFees = q(selectClaimablePositionPriceImpactFees);
  const tokensData = q(selectTokensData);

  return calcTotalRebateUsd(claimablePositionPriceImpactFees, tokensData, false);
});

export const selectClaimsPriceImpactAccruedTotal = createSelector(function selectPriceImpactDifference(q) {
  const tokensData = q(selectTokensData);
  const accruedPositionPriceImpactFees = q(selectAccruedPositionPriceImpactFees);
  return calcTotalRebateUsd(accruedPositionPriceImpactFees, tokensData, true);
});

export const selectClaimsGroupedPositionPriceImpactAccruedFees = createSelector(
  function selectGroupedAccruedPositionPriceImpactFees(q) {
    const accruedPositionPriceImpactFees = q(selectAccruedPositionPriceImpactFees);
    const groupedMarkets: Record<string, number> = {};
    return accruedPositionPriceImpactFees.reduce((acc, rebateItem) => {
      const key = rebateItem.marketAddress;

      if (typeof groupedMarkets[key] === "number") {
        const index = groupedMarkets[key];
        acc[index].push(rebateItem);
      } else {
        groupedMarkets[key] = acc.length;
        acc.push([rebateItem]);
      }

      return acc;
    }, [] as RebateInfoItem[][]);
  }
);

export const selectClaimsGroupedPositionPriceImpactClaimableFees = createSelector(
  function selectGroupedClaimablePositionPriceImpactFees(q) {
    const claimablePositionPriceImpactFees = q(selectClaimablePositionPriceImpactFees);
    const groupedMarkets: Record<string, number> = {};
    return claimablePositionPriceImpactFees.reduce((acc, rebateItem) => {
      const key = rebateItem.marketAddress;

      if (typeof groupedMarkets[key] === "number") {
        const index = groupedMarkets[key];
        acc[index].push(rebateItem);
      } else {
        groupedMarkets[key] = acc.length;
        acc.push([rebateItem]);
      }

      return acc;
    }, [] as RebateInfoItem[][]);
  }
);

export const selectClaimablesCount = createSelector(function selectClaimablesCount(q) {
  const totalPositionFees = q(selectClaimsPriceImpactClaimableTotal);
  const totalFundingFees = q(selectClaimsFundingFeesClaimableTotal);

  let total = 0;

  if (totalPositionFees > 0) total++;
  if (totalFundingFees > 0) total++;

  return total;
});
