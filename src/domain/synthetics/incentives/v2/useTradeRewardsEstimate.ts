import { useMemo } from "react";
import { isAddressEqual, type Address } from "viem";

import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import { useAccount, useUserReferralInfo } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useMinAffiliateRewardFactor } from "domain/synthetics/referrals/useMinAffiliateRewardFactor";
import type { TradeFees, TradeFeesType } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import { applyFactor } from "lib/numbers";
import { getTokenBySymbolSafe } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { getPriceImpactForPosition } from "sdk/utils/fees/priceImpact";
import type { MarketInfo } from "sdk/utils/markets/types";

import { type EstimatedTradeRewards, getEstimatedTradeRewards } from "./tradeRewardEstimate";
import { useAccountIncentiveStatus } from "./useAccountIncentiveStatus";
import { useLatestGtPrice } from "./useLatestGtPrice";

export type TradeRewardsEstimateState = {
  enabled: boolean;
  multiplierDecimals?: bigint;
  multiplier?: bigint;
  hasKnownMultiplier: boolean;
  estimatedRewards?: EstimatedTradeRewards;
};

type Params = {
  fees?: TradeFees;
  feesType: TradeFeesType | null;
  marketInfo?: MarketInfo;
  isLong?: boolean;
  sizeDeltaUsd?: bigint;
  shouldEstimate?: boolean;
};

export function useTradeRewardsEstimate({
  fees,
  feesType,
  marketInfo,
  isLong,
  sizeDeltaUsd,
  shouldEstimate = true,
}: Params): TradeRewardsEstimateState {
  const { chainId } = useChainId();
  const account = useAccount();
  const userReferralInfo = useUserReferralInfo();
  const tokensData = useSelector(selectTokensData);
  const { availability, isActive } = useIncentivesV2State();
  const isEligibleTrade = feesType === "increase" || feesType === "decrease";
  const enabled = isActive && isEligibleTrade && Boolean(account);
  const config = availability.status === "active" ? availability.config : undefined;
  const hasEstimateInputs =
    marketInfo !== undefined &&
    isLong !== undefined &&
    sizeDeltaUsd !== undefined &&
    sizeDeltaUsd > 0n &&
    fees?.positionFee?.deltaUsd !== undefined;
  const canEstimate = enabled && shouldEstimate && hasEstimateInputs && Boolean(account);
  const referralDiscountUsd =
    fees?.positionFee && userReferralInfo
      ? applyFactor(
          applyFactor(bigMath.abs(fees.positionFee.deltaUsd), userReferralInfo.totalRebateFactor),
          userReferralInfo.discountFactor
        )
      : 0n;
  const needsMinAffiliateRewardFactor = Boolean(
    canEstimate && userReferralInfo && (fees?.feeDiscountUsd ?? 0n) > referralDiscountUsd
  );
  const { data: minAffiliateRewardFactor, error: minAffiliateRewardFactorError } = useMinAffiliateRewardFactor(
    chainId,
    needsMinAffiliateRewardFactor ? userReferralInfo?.tierId : undefined
  );

  const { data: status } = useAccountIncentiveStatus(chainId, {
    account,
    enabled: enabled && Boolean(account),
  });
  const { data: gtPrice } = useLatestGtPrice(chainId, {
    enabled: canEstimate && Boolean(account),
  });

  const currentStatus =
    status !== undefined &&
    account !== undefined &&
    isAddressEqual(status.account as Address, account as Address) &&
    status.epochTimestamp === config?.epochTimestamp
      ? status
      : undefined;
  const gmxToken = getTokenBySymbolSafe(chainId, "GMX", { isSynthetic: false });
  const gmxPrice = gmxToken ? tokensData?.[gmxToken.address]?.prices.minPrice : undefined;

  const balanceWasImproved = useMemo(() => {
    if (
      feesType !== "increase" ||
      !marketInfo ||
      isLong === undefined ||
      sizeDeltaUsd === undefined ||
      sizeDeltaUsd <= 0n
    ) {
      return false;
    }

    return getPriceImpactForPosition(marketInfo, sizeDeltaUsd, isLong, {
      fallbackToZero: true,
    }).balanceWasImproved;
  }, [feesType, isLong, marketInfo, sizeDeltaUsd]);

  const estimatedRewards = useMemo(() => {
    if (
      !canEstimate ||
      !config ||
      !currentStatus ||
      !marketInfo ||
      isLong === undefined ||
      sizeDeltaUsd === undefined ||
      fees?.positionFee?.deltaUsd === undefined ||
      (needsMinAffiliateRewardFactor && (minAffiliateRewardFactor === undefined || minAffiliateRewardFactorError))
    ) {
      return undefined;
    }

    return getEstimatedTradeRewards({
      config,
      status: currentStatus,
      positionFeeUsd: bigMath.abs(fees.positionFee.deltaUsd),
      totalRebateFactor: userReferralInfo?.totalRebateFactor ?? 0n,
      referralDiscountFactor: userReferralInfo?.discountFactor ?? 0n,
      minAffiliateRewardFactor: needsMinAffiliateRewardFactor ? minAffiliateRewardFactor : 0n,
      feeDiscountUsd: fees.feeDiscountUsd,
      sizeDeltaUsd,
      marketTokenAddress: marketInfo.marketTokenAddress,
      balanceWasImproved,
      isIncrease: feesType === "increase",
      gmxPrice,
      gtPrice: gtPrice?.priceUsd,
    });
  }, [
    balanceWasImproved,
    canEstimate,
    config,
    currentStatus,
    fees?.positionFee?.deltaUsd,
    fees?.feeDiscountUsd,
    feesType,
    gmxPrice,
    gtPrice?.priceUsd,
    isLong,
    marketInfo,
    minAffiliateRewardFactor,
    minAffiliateRewardFactorError,
    needsMinAffiliateRewardFactor,
    sizeDeltaUsd,
    userReferralInfo,
  ]);

  const visibleEstimate = estimatedRewards && estimatedRewards.rewardsUsd > 0n ? estimatedRewards : undefined;

  return {
    enabled,
    multiplierDecimals: config?.multiplierDecimals,
    multiplier: visibleEstimate?.effectiveMultiplier ?? currentStatus?.multiplier,
    hasKnownMultiplier: currentStatus !== undefined,
    estimatedRewards: visibleEstimate,
  };
}
