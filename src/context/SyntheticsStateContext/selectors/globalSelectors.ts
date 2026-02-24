import { getOrderRelayRouterAddress } from "domain/synthetics/express/expressOrderUtils";
import type { FeaturesSettings } from "domain/synthetics/features/useDisabledFeatures";
import { getIsInvalidSubaccount } from "domain/synthetics/subaccount/utils";
import { ProgressiveTokensData } from "domain/tokens";

import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createSelector, createSelectorDeprecated } from "../utils";

export const selectAccount = (s: SyntheticsState) => s.globals.account;
export const selectSigner = (s: SyntheticsState) => s.globals.signer;
export const selectOrdersInfoData = (s: SyntheticsState) => s.globals.ordersInfo.ordersInfoData;
export const selectIsOrdersLoading = (s: SyntheticsState) => s.globals.ordersInfo.isLoading;
export const selectPositionsInfoData = (s: SyntheticsState) => s.globals.positionsInfo.positionsInfoData;
export const selectIsPositionsLoading = (s: SyntheticsState) => s.globals.positionsInfo.isLoading;
export const selectMarketsInfoData = (s: SyntheticsState) => s.globals.marketsInfo.marketsInfoData;
export const selectTokensData = (s: SyntheticsState) => s.globals.tokensDataResult.tokensData;
export const selectIsGmxAccountBalancesLoaded = (s: SyntheticsState) =>
  s.globals.tokensDataResult.isGmxAccountBalancesLoaded;
export const selectGmMarkets = (s: SyntheticsState) => s.globals.markets.marketsData;
export const selectUiFeeFactor = (s: SyntheticsState) => s.globals.uiFeeFactor;
export const selectUserReferralInfo = (s: SyntheticsState) => s.globals.userReferralInfo;
export const selectChainId = (s: SyntheticsState) => s.globals.chainId;
export const selectSrcChainId = (s: SyntheticsState) => s.globals.srcChainId;
export const selectDepositMarketTokensData = (s: SyntheticsState) => s.globals.depositMarketTokensData;
export const selectProgressiveDepositMarketTokensData = (s: SyntheticsState) =>
  s.globals.progressiveDepositMarketTokensData;

export const selectProgressiveDepositMarketTokensDataWithoutGlv = createSelector((q) => {
  const progressiveDepositMarketTokensData = q(selectProgressiveDepositMarketTokensData);

  if (!progressiveDepositMarketTokensData) {
    return undefined;
  }

  return Object.entries(progressiveDepositMarketTokensData).reduce((acc, [address, token]) => {
    if (token.symbol === "GM") {
      acc[address] = token;
    }
    return acc;
  }, {} as ProgressiveTokensData);
});

export const selectIsFirstOrder = (s: SyntheticsState) => s.globals.isFirstOrder;
const selectFeatures = (s: SyntheticsState) => s.features;
export const selectIsSponsoredCallAvailable = (s: SyntheticsState) =>
  s.sponsoredCallBalanceData?.isSponsoredCallAllowed ?? false;
export const selectSubaccountState = (s: SyntheticsState) => s.subaccountState;
export const selectGasPaymentTokenAllowance = (s: SyntheticsState) => s.gasPaymentTokenAllowance;

export const selectUpdateSubaccountSettings = (s: SyntheticsState) => s.subaccountState.updateSubaccountSettings;
export const selectL1ExpressOrderGasReference = (s: SyntheticsState) => s.l1ExpressOrderGasReference;

const makeSelectEnabledFeature = (feature: keyof FeaturesSettings) => {
  return createSelector((q) => {
    const features = q(selectFeatures);
    return features?.[feature] ?? false;
  });
};

export const selectIsRelayRouterEnabled = makeSelectEnabledFeature("relayRouterEnabled");
const selectIsSubaccountRelayRouterEnabled = makeSelectEnabledFeature("subaccountRelayRouterEnabled");

export const selectBlockTimestampData = (s: SyntheticsState) => s.globals.blockTimestampData;

export const selectGlvInfo = (s: SyntheticsState) => s.globals.glvInfo.glvData;
export const selectGlvs = (s: SyntheticsState) => s.globals.glvInfo.glvs;
export const selectGlvInfoLoading = (s: SyntheticsState) => s.globals.glvInfo.isLoading;

export const selectGlvAndMarketsInfoData = createSelector((q) => {
  const glvsInfoData = q(selectGlvInfo);
  const marketsInfoData = q(selectMarketsInfoData);

  return {
    ...glvsInfoData,
    ...marketsInfoData,
  };
});

const selectMinCollateralUsd = (s: SyntheticsState) => s.globals.positionsConstants?.minCollateralUsd;
const selectMinPositionSizeUsd = (s: SyntheticsState) => s.globals.positionsConstants?.minPositionSizeUsd;
export const selectMaxAutoCancelOrders = (s: SyntheticsState) => s.globals.positionsConstants?.maxAutoCancelOrders;

export const selectClosingPositionKey = (s: SyntheticsState) => s.globals.closingPositionKey;
const selectSetClosingPositionKey = (s: SyntheticsState) => s.globals.setClosingPositionKey;

export const selectSetIsCandlesLoaded = (s: SyntheticsState) => s.globals.setIsCandlesLoaded;

export const selectGasLimits = (s: SyntheticsState) => s.globals.gasLimits;
export const selectGasPrice = (s: SyntheticsState) => s.globals.gasPrice;

export const selectKeepLeverage = (s: SyntheticsState) => s.globals.keepLeverage ?? true;

export const selectLastWeekAccountStats = (s: SyntheticsState) => s.globals.lastWeekAccountStats;
export const selectLastMonthAccountStats = (s: SyntheticsState) => s.globals.lastMonthAccountStats;
export const selectAccountStats = (s: SyntheticsState) => s.globals.accountStats;

export const selectBotanixStakingAssetsPerShare = (s: SyntheticsState) => s.globals.botanixStakingAssetsPerShare;

export const selectPositionConstants = createSelectorDeprecated(
  [selectMinCollateralUsd, selectMinPositionSizeUsd],
  (minCollateralUsd, minPositionSizeUsd) => ({
    minCollateralUsd,
    minPositionSizeUsd,
  })
);

export const selectClosingPositionKeyState = createSelectorDeprecated(
  [selectClosingPositionKey, selectSetClosingPositionKey],
  (closingPositionKey, setClosingPositionKey) => [closingPositionKey, setClosingPositionKey] as const
);

const selectPositiveFeePositions = createSelector((q) => {
  const positionsInfoData = q(selectPositionsInfoData);
  return Object.values(positionsInfoData || {}).filter((position) => position.pendingClaimableFundingFeesUsd > 0);
});

export const selectPositiveFeePositionsSortedByUsd = createSelector((q) => {
  const positiveFeePositions = q(selectPositiveFeePositions);
  return positiveFeePositions.sort((a, b) =>
    a.pendingClaimableFundingFeesUsd > b.pendingClaimableFundingFeesUsd ? -1 : 1
  );
});

/**
 * This selector might return subaccount with approval signed for other chain and lead to errors
 */
export const selectRawSubaccount = (s: SyntheticsState) => s.subaccountState.subaccount;

export const selectSubaccountForSettlementChainAction = createSelector((q) => {
  const chainId = q(selectChainId);
  const rawSubaccount = q(selectRawSubaccount);
  const isEnabled = q(selectIsSubaccountRelayRouterEnabled);

  if (
    !isEnabled ||
    !rawSubaccount ||
    getIsInvalidSubaccount({
      subaccount: rawSubaccount,
      requiredActions: 1,
      subaccountRouterAddress: getOrderRelayRouterAddress(chainId, true, false),
    })
  ) {
    return undefined;
  }

  return rawSubaccount;
});

export const selectSubaccountForMultichainAction = createSelector((q) => {
  const chainId = q(selectChainId);
  const rawSubaccount = q(selectRawSubaccount);
  const isEnabled = q(selectIsSubaccountRelayRouterEnabled);

  if (
    !isEnabled ||
    !rawSubaccount ||
    getIsInvalidSubaccount({
      subaccount: rawSubaccount,
      requiredActions: 1,
      subaccountRouterAddress: getOrderRelayRouterAddress(chainId, true, true),
    })
  ) {
    return undefined;
  }

  return rawSubaccount;
});

/**
 * When action target contract is purely dependent on srcChainId
 * aka its not possible to send multichain txn from settlement chain
 * we can use this selector to get subaccount for current source or settlement chain
 */
export const selectSubaccountForChainAction = createSelector((q) => {
  const srcChainId = q(selectSrcChainId);
  if (srcChainId !== undefined) {
    return q(selectSubaccountForMultichainAction);
  }

  return q(selectSubaccountForSettlementChainAction);
});

export const selectOracleSettings = (s: SyntheticsState) => s.globals.oracleSettings;

export const selectIsAutoCancelTPSLEnabled = (s: SyntheticsState) => s.settings.isAutoCancelTPSL;

export const selectMultichainMarketTokensBalancesResult = (s: SyntheticsState) =>
  s.globals.multichainMarketTokensBalancesResult;

export const selectMultichainMarketTokensBalancesIsLoading = (s: SyntheticsState) =>
  s.globals.multichainMarketTokensBalancesResult?.isLoading ?? false;
