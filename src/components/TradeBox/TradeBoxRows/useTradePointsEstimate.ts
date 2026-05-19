import { ARBITRUM } from "config/chains";
import { useUserReferralInfo } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useGmxPrice } from "domain/legacy";
import { isIncentivesEnabled, MULTIPLIER_DECIMALS } from "domain/synthetics/incentives/constants";
import {
  getEffectiveTradeMultiplier,
  getEstimatedFeeRewards,
  getEstimatedTradeRewards,
  getMarketDowngradingCoefficient,
} from "domain/synthetics/incentives/pointsEstimate";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/useAccountIncentiveStatus";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { TradeFees, TradeFeesType } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { bigMath } from "sdk/utils/bigmath";
import type { MarketInfo } from "sdk/utils/markets/types";

type Params = {
  fees?: TradeFees;
  feesType: TradeFeesType | null;
  marketInfo?: MarketInfo;
  isLong?: boolean;
  sizeDeltaUsd?: bigint;
  includeBalancingBoost?: boolean;
};

export function useTradePointsEstimate({
  fees,
  feesType,
  marketInfo,
  isLong,
  sizeDeltaUsd,
  includeBalancingBoost = false,
}: Params) {
  const { chainId } = useChainId();
  const { account, active, signer } = useWallet();
  const userReferralInfo = useUserReferralInfo();

  const enabled = isIncentivesEnabled(chainId);
  const { data: incentivesConfig } = useIncentivesConfig(chainId);
  const { data: status } = useAccountIncentiveStatus(chainId, {
    account,
    enabled: enabled && Boolean(account),
  });
  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);

  const effectiveMultiplier = getEffectiveTradeMultiplier({
    multiplier: status?.multiplier,
    maxMultiplier: incentivesConfig?.maxMultiplier,
    boosts: incentivesConfig?.boosts,
    featuredMarketTokens: incentivesConfig?.featuredMarketTokens,
    marketInfo,
    isLong: includeBalancingBoost ? isLong : undefined,
    sizeDeltaUsd: includeBalancingBoost ? sizeDeltaUsd : undefined,
    balancingTradesThreshold: incentivesConfig?.balancingTradesThreshold,
  });

  const hasMultiplier = effectiveMultiplier !== undefined && effectiveMultiplier > 0;
  const positionFeeUsd =
    feesType !== "swap" && fees?.positionFee?.deltaUsd !== undefined
      ? bigMath.abs(fees.positionFee.deltaUsd)
      : undefined;
  const downgradingCoefficient = getMarketDowngradingCoefficient(
    incentivesConfig?.downgradingCoefficients,
    marketInfo?.marketTokenAddress
  );

  const estimatedRewards = getEstimatedTradeRewards({
    feeUsd: positionFeeUsd,
    multiplier: effectiveMultiplier,
    multiplierDecimals: MULTIPLIER_DECIMALS,
    totalRebate: userReferralInfo?.totalRebate,
    discountShare: userReferralInfo?.discountShare,
    gmxPrice,
    downgradingCoefficient,
  });
  const estimatedFeeRewards = getEstimatedFeeRewards({
    feeUsd: positionFeeUsd,
    totalRebate: userReferralInfo?.totalRebate,
    discountShare: userReferralInfo?.discountShare,
    pointsBalance: status?.pointsBalance,
    gmxPrice,
  });

  const hasEstimatedRewards = estimatedRewards?.rewardsUsd !== undefined && estimatedRewards.rewardsUsd > 0n;

  return {
    enabled,
    effectiveMultiplier,
    hasMultiplier,
    estimatedRewards,
    estimatedFeeRewards,
    hasEstimatedRewards,
    downgradingCoefficient,
  };
}
