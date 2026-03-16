import { t } from "@lingui/macro";
import partition from "lodash/partition";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { selectGasPaymentToken } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useArbitraryError, useArbitraryRelayParamsAndPayload } from "domain/multichain/arbitraryRelayParams";
import { getReferralsDataKey } from "domain/referrals/hooks/useReferralsData";
import { ExpressTransactionBuilder } from "domain/synthetics/express/types";
import { useGasPrice } from "domain/synthetics/fees/useGasPrice";
import { MarketsInfoData, useMarketsInfoRequest } from "domain/synthetics/markets";
import {
  buildRewardsParams,
  getSelectedClaimTokenAmounts,
  type RewardsParams,
} from "domain/synthetics/referrals/claimAffiliateRewards";
import {
  claimAffiliateRewardsTxn,
  estimateClaimAffiliateRewardsGas,
  simulateAndClaimAffiliateRewardsAndSwapTxn,
} from "domain/synthetics/referrals/claimAffiliateRewardsTxn";
import {
  buildAndSignMultichainClaimAffiliateRewardsTxn,
  simulateAndCreateMultichainClaimAffiliateRewardsTxn,
} from "domain/synthetics/referrals/createMultichainClaimAffiliateRewardsTxn";
import { AffiliateReward } from "domain/synthetics/referrals/types";
import { useAffiliateRewards } from "domain/synthetics/referrals/useAffiliateRewards";
import { useClaimAffiliateSwapRoutes } from "domain/synthetics/referrals/useClaimAffiliateSwapRoutes";
import { getTotalClaimableAffiliateRewardsUsd } from "domain/synthetics/referrals/utils";
import { convertToTokenAmount, convertToUsd, useTokensDataRequest } from "domain/synthetics/tokens";
import { getDefaultInsufficientGasMessage } from "domain/synthetics/trade/utils/validation";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import { expandDecimals } from "lib/numbers";
import { getByKey } from "lib/objects";
import { WalletTxnResult } from "lib/transactions/sendWalletTransaction";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { usePrevious } from "lib/usePrevious";
import { useThrottledAsync } from "lib/useThrottledAsync";
import useWallet from "lib/wallets/useWallet";
import { getToken } from "sdk/configs/tokens";
import type { TokenData } from "sdk/utils/tokens/types";

import { calculateNetworkFeeDetails } from "components/GmxAccountModal/calculateNetworkFeeDetails";

const MAIN_REWARDS_PREVIEW_COUNT = 5;
const MAX_MULTICHAIN_SWAP_REWARDS = 5;
const MIN_REWARD_USD_THRESHOLD = expandDecimals(1, 30); // $1 in USD_DECIMALS

export type RewardWithUsd = {
  reward: AffiliateReward;
  usd: bigint;
};

export type NetworkFeeInfo =
  | {
      isLoading: true;
      amount?: undefined;
      amountUsd?: undefined;
      decimals?: undefined;
      symbol?: undefined;
      isStable?: undefined;
    }
  | {
      isLoading: false;
      amount: bigint;
      amountUsd: bigint;
      decimals: number;
      symbol: string;
      isStable: boolean | undefined;
    };

export type SubmitButtonState = {
  text: string;
  disabled: boolean;
  showSpinner?: boolean;
};

export function getRewardUsd(reward: AffiliateReward, marketsInfoData: MarketsInfoData | undefined): bigint {
  const marketInfo = marketsInfoData ? getByKey(marketsInfoData, reward.marketAddress) : undefined;
  if (!marketInfo) {
    return 0n;
  }

  const { longToken, shortToken, isSameCollaterals } = marketInfo;
  const { longTokenAmount, shortTokenAmount } = reward;

  const longRewardUsd = convertToUsd(longTokenAmount, longToken.decimals, longToken.prices.minPrice)!;
  let totalReward = longRewardUsd;

  if (!isSameCollaterals) {
    const shortRewardUsd = convertToUsd(shortTokenAmount, shortToken.decimals, shortToken.prices.minPrice)!;
    totalReward += shortRewardUsd;
  }

  return totalReward;
}

function useMultichainClaimAffiliateRewardsExpressTransactionBuilder({
  rewardsParams,
}: {
  rewardsParams: RewardsParams | undefined;
}): ExpressTransactionBuilder | undefined {
  const { chainId, srcChainId } = useChainId();
  const { address: account } = useAccount();

  return useMemo((): ExpressTransactionBuilder | undefined => {
    const areValidRewardsParams =
      rewardsParams && rewardsParams.marketAddresses.length > 0 && rewardsParams.tokenAddresses.length > 0;
    if (!account || !areValidRewardsParams) {
      return undefined;
    }

    const expressTransactionBuilder: ExpressTransactionBuilder = async ({ gasPaymentParams, relayParams }) => ({
      txnData: await buildAndSignMultichainClaimAffiliateRewardsTxn({
        account,
        marketAddresses: rewardsParams.marketAddresses,
        tokenAddresses: rewardsParams.tokenAddresses,
        chainId,
        srcChainId,
        relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
        relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
        relayParams,
        signer: undefined,
        emptySignature: true,
      }),
    });

    return expressTransactionBuilder;
  }, [account, chainId, rewardsParams, srcChainId]);
}

export function useClaimAffiliatesModalState({ onClose }: { onClose: () => void }) {
  const { account, signer } = useWallet();
  const { chainId, srcChainId } = useChainId();
  const hasOutdatedUi = useHasOutdatedUi();

  const { mutate: swrMutate } = useSWRConfig();
  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });
  const { affiliateRewardsData, mutateAffiliateRewards } = useAffiliateRewards(chainId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOtherMainRewards, setShowOtherMainRewards] = useState(false);
  const [isSwapEnabled, setIsSwapEnabled] = useState(false);
  const [showSmallRewards, setShowSmallRewards] = useState(false);
  const [selectedMarketAddresses, setSelectedMarketAddresses] = useState<string[]>([]);
  const isInitialSelectionAppliedRef = useRef(false);

  const rawRewards = useMemo(() => Object.values(affiliateRewardsData || {}), [affiliateRewardsData]);
  const rewards = useMemo(
    () =>
      rawRewards.filter(
        (reward) =>
          !getByKey(marketsInfoData, reward.marketAddress)?.isDisabled &&
          (reward.longTokenAmount > 0 || reward.shortTokenAmount > 0)
      ),
    [marketsInfoData, rawRewards]
  );

  const { mainRewardsWithUsd, smallRewardsWithUsd } = useMemo(() => {
    const withUsd: RewardWithUsd[] = rewards
      .map((reward) => ({ reward, usd: getRewardUsd(reward, marketsInfoData) }))
      .filter(({ usd }) => usd > 0n)
      .sort((a, b) => (a.usd > b.usd ? -1 : a.usd < b.usd ? 1 : 0));

    const [main, small] = partition(withUsd, ({ usd }) => usd > MIN_REWARD_USD_THRESHOLD);

    return {
      mainRewardsWithUsd: main,
      smallRewardsWithUsd: small,
    };
  }, [marketsInfoData, rewards]);

  const mainRewards = useMemo(() => mainRewardsWithUsd.map(({ reward }) => reward), [mainRewardsWithUsd]);
  const smallRewards = useMemo(() => smallRewardsWithUsd.map(({ reward }) => reward), [smallRewardsWithUsd]);

  const rankedMarketAddresses = useMemo(
    () => [...mainRewards, ...smallRewards].map((reward) => reward.marketAddress),
    [mainRewards, smallRewards]
  );
  const isSelectionLimitedBySwapMultichain = srcChainId !== undefined && isSwapEnabled;

  const selectedMarketAddressesSet = useMemo(() => new Set(selectedMarketAddresses), [selectedMarketAddresses]);

  const canSelectMore =
    !isSelectionLimitedBySwapMultichain || selectedMarketAddresses.length < MAX_MULTICHAIN_SWAP_REWARDS;

  const handleToggleSelect = useCallback(
    (marketAddress: string) => {
      setSelectedMarketAddresses((prev) => {
        if (prev.includes(marketAddress)) {
          return prev.filter((address) => address !== marketAddress);
        }

        if (isSelectionLimitedBySwapMultichain && prev.length >= MAX_MULTICHAIN_SWAP_REWARDS) {
          return prev;
        }

        return [...prev, marketAddress];
      });
    },
    [isSelectionLimitedBySwapMultichain]
  );

  const rewardsTxParams = useMemo(
    () => buildRewardsParams(chainId, rewards, selectedMarketAddresses),
    [chainId, rewards, selectedMarketAddresses]
  );

  const selectedClaimTokenAmountsByToken = useMemo(
    () =>
      getSelectedClaimTokenAmounts({
        chainId,
        rewards,
        selectedMarketAddresses,
      }),
    [chainId, rewards, selectedMarketAddresses]
  );

  const selectedClaimTokensUsd = useMemo(
    () =>
      Object.values(selectedClaimTokenAmountsByToken).reduce((acc, item) => {
        const token = getByKey(tokensData, item.tokenAddress);
        if (!token) {
          return acc;
        }

        return acc + (convertToUsd(item.amount, token.decimals, token.prices.minPrice) ?? 0n);
      }, 0n),
    [selectedClaimTokenAmountsByToken, tokensData]
  );

  const totalClaimableFundingUsd =
    marketsInfoData && affiliateRewardsData
      ? getTotalClaimableAffiliateRewardsUsd(marketsInfoData, affiliateRewardsData)
      : 0n;

  const previewMainRewards = useMemo(
    () => mainRewardsWithUsd.slice(0, MAIN_REWARDS_PREVIEW_COUNT),
    [mainRewardsWithUsd]
  );
  const hiddenMainRewards = useMemo(() => mainRewardsWithUsd.slice(MAIN_REWARDS_PREVIEW_COUNT), [mainRewardsWithUsd]);
  const shouldShowSmallRewardsToggle = hiddenMainRewards.length === 0 || showOtherMainRewards;

  const {
    swapTargetTokenOptions,
    swapTargetTokenAddress,
    setSwapTargetTokenAddress,
    swapTargetToken,
    hasSwapRouteError,
    isSwapRouteLoading,
    settlementSwapExternalCalls,
    multichainSwapExternalCalls,
    toReceiveAmount,
    toReceiveUsd,
    failedSwapTokenSymbols,
    swapEstimatedNetworkFeeAmount,
  } = useClaimAffiliateSwapRoutes({
    account,
    chainId,
    selectedClaimTokenAmountsByToken,
    tokensData,
    isSwapEnabled,
  });

  const selectableMarketAddresses = useMemo(
    () => (showSmallRewards ? rewards : mainRewards).map((reward) => reward.marketAddress),
    [mainRewards, rewards, showSmallRewards]
  );

  const isAllChecked =
    selectableMarketAddresses.length > 0 &&
    selectableMarketAddresses.every((marketAddress) => selectedMarketAddressesSet.has(marketAddress));

  const handleToggleSelectAll = useCallback(() => {
    if (isAllChecked) {
      setSelectedMarketAddresses([]);
      return;
    }

    if (isSelectionLimitedBySwapMultichain) {
      setSelectedMarketAddresses(selectableMarketAddresses.slice(0, MAX_MULTICHAIN_SWAP_REWARDS));
      return;
    }

    setSelectedMarketAddresses(selectableMarketAddresses);
  }, [isAllChecked, isSelectionLimitedBySwapMultichain, selectableMarketAddresses]);

  const gasPaymentToken = useSelector(selectGasPaymentToken);
  const gasPrice = useGasPrice(chainId);

  const handleSubmitSettlementChain = useCallback(async () => {
    if (
      !account ||
      !signer ||
      !affiliateRewardsData ||
      !marketsInfoData ||
      srcChainId !== undefined ||
      !rewardsTxParams
    )
      return;
    if (isSwapEnabled && !settlementSwapExternalCalls && (isSwapRouteLoading || hasSwapRouteError)) {
      helperToast.error(t`Swap route unavailable`);
      return;
    }

    setIsSubmitting(true);

    try {
      let tx: WalletTxnResult;
      if (isSwapEnabled && settlementSwapExternalCalls) {
        tx = await simulateAndClaimAffiliateRewardsAndSwapTxn(chainId, signer, {
          account,
          rewardsParams: rewardsTxParams,
          externalCalls: settlementSwapExternalCalls,
        });
      } else {
        tx = await claimAffiliateRewardsTxn(chainId, signer, {
          account,
          rewardsParams: rewardsTxParams,
        });
      }

      const receipt = await tx.wait();
      if (receipt?.status === "success") {
        mutateAffiliateRewards();
        swrMutate(getReferralsDataKey(account));
        helperToast.success(t`Affiliate rewards claimed`);
        onClose();
      } else {
        throw new Error("Transaction receipt status is failed");
      }
    } catch (error) {
      metrics.pushError(error, "settlementClaimAffiliateRewards");
      helperToast.error(t`Failed to claim affiliate rewards`);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    account,
    affiliateRewardsData,
    chainId,
    hasSwapRouteError,
    isSwapEnabled,
    isSwapRouteLoading,
    marketsInfoData,
    mutateAffiliateRewards,
    onClose,
    rewardsTxParams,
    settlementSwapExternalCalls,
    signer,
    srcChainId,
    swrMutate,
  ]);

  const expressTransactionBuilder = useMultichainClaimAffiliateRewardsExpressTransactionBuilder({
    rewardsParams: rewardsTxParams,
  });

  const expressTxnParamsAsyncResult = useArbitraryRelayParamsAndPayload({
    isGmxAccount: true,
    enabled: srcChainId !== undefined,
    expressTransactionBuilder,
    withLoading: false,
    transactionExternalCalls: multichainSwapExternalCalls,
  });

  const errors = useArbitraryError(expressTxnParamsAsyncResult.error);
  const fallbackGasPaymentTokenAmount = useMemo(() => {
    if (srcChainId === undefined || !gasPaymentToken || swapEstimatedNetworkFeeAmount <= 0n) {
      return undefined;
    }

    const nativeToken = getByKey(tokensData, zeroAddress);

    if (!nativeToken) {
      return undefined;
    }

    const swapEstimatedNetworkFeeUsd = convertToUsd(
      swapEstimatedNetworkFeeAmount,
      nativeToken.decimals,
      nativeToken.prices.minPrice
    );

    if (swapEstimatedNetworkFeeUsd === undefined) {
      return undefined;
    }

    return convertToTokenAmount(swapEstimatedNetworkFeeUsd, gasPaymentToken.decimals, gasPaymentToken.prices.minPrice);
  }, [gasPaymentToken, srcChainId, swapEstimatedNetworkFeeAmount, tokensData]);

  const isFallbackOutOfGasPaymentTokenBalance = useMemo(() => {
    if (srcChainId === undefined || !gasPaymentToken || fallbackGasPaymentTokenAmount === undefined) {
      return false;
    }

    if (gasPaymentToken.gmxAccountBalance === undefined) {
      return false;
    }

    return fallbackGasPaymentTokenAmount > gasPaymentToken.gmxAccountBalance;
  }, [fallbackGasPaymentTokenAmount, gasPaymentToken, srcChainId]);

  const isExpressParamsLoading =
    srcChainId !== undefined &&
    expressTxnParamsAsyncResult.data === undefined &&
    expressTxnParamsAsyncResult.error === undefined;

  const isSwapReady =
    settlementSwapExternalCalls !== undefined || (isSwapEnabled && !isSwapRouteLoading && !hasSwapRouteError);
  const shouldEstimateSettlementNetworkFee =
    srcChainId === undefined &&
    account !== undefined &&
    rewardsTxParams !== undefined &&
    rewardsTxParams.marketAddresses.length > 0 &&
    rewardsTxParams.tokenAddresses.length > 0 &&
    (!isSwapEnabled || isSwapReady);

  const settlementFeeForceRecalculateKey = useMemo(() => {
    if (!shouldEstimateSettlementNetworkFee || !rewardsTxParams) {
      return undefined;
    }

    const uniqueSortedMarketAddresses = [...new Set(rewardsTxParams.marketAddresses)].sort().join("|");
    return `${settlementSwapExternalCalls ? "withExternalCalls" : "withoutExternalCalls"}:${uniqueSortedMarketAddresses}`;
  }, [rewardsTxParams, settlementSwapExternalCalls, shouldEstimateSettlementNetworkFee]);

  const previousSettlementFeeForceRecalculateKey = usePrevious(settlementFeeForceRecalculateKey);
  const shouldForceRecalculateSettlementNetworkFee =
    settlementFeeForceRecalculateKey !== undefined &&
    settlementFeeForceRecalculateKey !== previousSettlementFeeForceRecalculateKey;

  const settlementNetworkFeeAsyncResult = useThrottledAsync(
    async ({ params }): Promise<bigint | undefined> => {
      return estimateClaimAffiliateRewardsGas(params.chainId, {
        account: params.account,
        rewardsParams: params.rewardsParams,
        externalCalls: params.externalCalls,
      });
    },
    {
      params:
        account && (!isSwapEnabled || settlementSwapExternalCalls)
          ? {
              chainId,
              account,
              rewardsParams: rewardsTxParams,
              externalCalls: settlementSwapExternalCalls,
            }
          : undefined,
      forceRecalculate: shouldForceRecalculateSettlementNetworkFee,
      resetOnForceRecalculate: true,
      leading: true,
      trailing: true,
    }
  );

  const settlementNetworkFeeGasLimit = settlementNetworkFeeAsyncResult.data;

  const settlementNetworkFeeDetails = useMemo(
    () =>
      calculateNetworkFeeDetails({
        gasLimit: settlementNetworkFeeGasLimit,
        gasPrice,
        tokensData,
      }),
    [settlementNetworkFeeGasLimit, gasPrice, tokensData]
  );

  const isOutOfTokenErrorToken = useMemo(() => {
    if (errors?.isOutOfTokenError?.tokenAddress) {
      return getByKey(tokensData, errors.isOutOfTokenError.tokenAddress);
    }
  }, [errors, tokensData]);

  const handleSubmitMultichain = useCallback(async () => {
    if (!account || !signer || !rewardsTxParams) return;
    if (isSwapEnabled && !multichainSwapExternalCalls) {
      helperToast.error(t`Swap route unavailable`);
      return;
    }

    setIsSubmitting(true);

    try {
      const expressTxnParams = await expressTxnParamsAsyncResult.promise;
      if (!expressTxnParams) {
        helperToast.error(t`Claim parameters unavailable. Retry in a few seconds`);
        metrics.pushError(new Error("No necessary params to claim"), "multichainClaimAffiliateRewards");
        return;
      }

      const result = await simulateAndCreateMultichainClaimAffiliateRewardsTxn({
        account,
        marketAddresses: rewardsTxParams.marketAddresses,
        tokenAddresses: rewardsTxParams.tokenAddresses,
        chainId,
        srcChainId,
        signer,
        expressTxnParams,
      });

      const receipt = await result.wait();
      if (!receipt || receipt.status === "failed") {
        throw new Error("Transaction receipt status is failed");
      }

      mutateAffiliateRewards();
      swrMutate(getReferralsDataKey(account));
      helperToast.success(t`Claim successful`);

      onClose();
    } catch (error) {
      helperToast.error(t`Claiming affiliate rewards failed`);
      metrics.pushError(error, "multichainClaimAffiliateRewards");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    account,
    chainId,
    expressTxnParamsAsyncResult.promise,
    isSwapEnabled,
    multichainSwapExternalCalls,
    mutateAffiliateRewards,
    onClose,
    rewardsTxParams,
    signer,
    srcChainId,
    swrMutate,
  ]);

  const handleSubmit = useCallback(() => {
    if (hasOutdatedUi) {
      return;
    }
    if (srcChainId === undefined) {
      handleSubmitSettlementChain();
    } else {
      handleSubmitMultichain();
    }
  }, [handleSubmitMultichain, handleSubmitSettlementChain, hasOutdatedUi, srcChainId]);

  useEffect(() => {
    if (!isSelectionLimitedBySwapMultichain) {
      return;
    }

    const rankedMarketAddressesSet = new Set(rankedMarketAddresses);
    setSelectedMarketAddresses((prev) => {
      const filteredSelectedMarketAddresses = prev.filter((address) => rankedMarketAddressesSet.has(address));

      if (filteredSelectedMarketAddresses.length === 0) {
        return rankedMarketAddresses.slice(0, MAX_MULTICHAIN_SWAP_REWARDS);
      }

      if (filteredSelectedMarketAddresses.length <= MAX_MULTICHAIN_SWAP_REWARDS) {
        return filteredSelectedMarketAddresses;
      }

      return filteredSelectedMarketAddresses.slice(0, MAX_MULTICHAIN_SWAP_REWARDS);
    });
  }, [isSelectionLimitedBySwapMultichain, rankedMarketAddresses]);

  useEffect(() => {
    if (isInitialSelectionAppliedRef.current || mainRewards.length === 0) {
      return;
    }

    setSelectedMarketAddresses(mainRewards.map((reward) => reward.marketAddress));
    isInitialSelectionAppliedRef.current = true;
  }, [mainRewards]);

  useEffect(() => {
    if (!shouldShowSmallRewardsToggle && showSmallRewards) {
      setShowSmallRewards(false);
    }
  }, [setShowSmallRewards, shouldShowSmallRewardsToggle, showSmallRewards]);

  const networkFeeInfo = useMemo((): NetworkFeeInfo => {
    if (srcChainId === undefined) {
      if (!settlementNetworkFeeDetails) {
        return { isLoading: true };
      }

      return {
        isLoading: false,
        amount: settlementNetworkFeeDetails.amount,
        amountUsd: settlementNetworkFeeDetails.usd,
        decimals: settlementNetworkFeeDetails.decimals,
        symbol: settlementNetworkFeeDetails.symbol,
        isStable: false,
      };
    }

    let amount: bigint | undefined;
    let token: TokenData | undefined = gasPaymentToken;

    if (errors?.isOutOfTokenError?.isGasPaymentToken && errors.isOutOfTokenError.requiredAmount !== undefined) {
      amount = errors.isOutOfTokenError.requiredAmount;
    } else if (expressTxnParamsAsyncResult.data?.gasPaymentParams.gasPaymentTokenAmount !== undefined) {
      amount = expressTxnParamsAsyncResult.data.gasPaymentParams.gasPaymentTokenAmount;
    } else if (isFallbackOutOfGasPaymentTokenBalance) {
      amount = fallbackGasPaymentTokenAmount;
    }

    if (amount === undefined || token === undefined) {
      return { isLoading: true };
    }

    const amountUsd = convertToUsd(amount, token.decimals, token.prices.minPrice) ?? 0n;
    return {
      isLoading: false,
      amount,
      amountUsd,
      decimals: token.decimals,
      symbol: token.symbol,
      isStable: token.isStable,
    };
  }, [
    errors?.isOutOfTokenError?.isGasPaymentToken,
    errors?.isOutOfTokenError?.requiredAmount,
    expressTxnParamsAsyncResult.data?.gasPaymentParams.gasPaymentTokenAmount,
    fallbackGasPaymentTokenAmount,
    gasPaymentToken,
    isFallbackOutOfGasPaymentTokenBalance,
    settlementNetworkFeeDetails,
    srcChainId,
  ]);

  const isSwapRouteLoadingForSubmit = isSwapEnabled && isSwapRouteLoading;
  const hasSwapRouteErrorForSubmit =
    srcChainId !== undefined
      ? isSwapEnabled && !isSwapRouteLoading && !multichainSwapExternalCalls
      : isSwapEnabled && hasSwapRouteError;

  const submitButtonState = useMemo((): SubmitButtonState => {
    if (hasOutdatedUi) {
      return { text: getPageOutdatedError(), disabled: true };
    } else if (isSubmitting) {
      return { text: t`Claiming...`, disabled: true };
    } else if (selectedMarketAddresses.length === 0) {
      return { text: t`No rewards selected`, disabled: true };
    } else if (isSwapEnabled && !swapTargetTokenAddress) {
      return { text: t`Swap token unavailable`, disabled: true };
    } else if (isSwapRouteLoadingForSubmit) {
      return { text: t`Fetching swap route...`, disabled: true };
    } else if (hasSwapRouteErrorForSubmit) {
      return { text: t`Swap route unavailable`, disabled: true };
    } else if (networkFeeInfo.isLoading) {
      return { text: t`Loading fees...`, disabled: true };
    } else if (isFallbackOutOfGasPaymentTokenBalance || errors?.isOutOfTokenError?.isGasPaymentToken) {
      return { text: getDefaultInsufficientGasMessage(), disabled: true };
    } else if (errors?.isOutOfTokenError) {
      const token = getToken(chainId, errors.isOutOfTokenError.tokenAddress);
      return { text: t`Insufficient ${token?.symbol} balance`, disabled: true };
    } else if (isExpressParamsLoading) {
      return { text: t`Loading...`, disabled: true, showSpinner: true };
    } else if (srcChainId !== undefined && expressTxnParamsAsyncResult.error) {
      return {
        text: expressTxnParamsAsyncResult.error.name.slice(0, 32) || t`Error simulating claim`,
        disabled: true,
      };
    } else {
      return {
        text: isSwapEnabled ? t`Claim & swap` : t`Claim`,
        disabled: false,
      };
    }
  }, [
    chainId,
    errors?.isOutOfTokenError,
    expressTxnParamsAsyncResult.error,
    hasOutdatedUi,
    hasSwapRouteErrorForSubmit,
    isExpressParamsLoading,
    isFallbackOutOfGasPaymentTokenBalance,
    isSubmitting,
    isSwapEnabled,
    isSwapRouteLoadingForSubmit,
    networkFeeInfo.isLoading,
    selectedMarketAddresses.length,
    srcChainId,
    swapTargetTokenAddress,
  ]);

  return {
    totalClaimableFundingUsd,
    previewMainRewards,
    hiddenMainRewards,
    smallRewardsWithUsd,
    marketsInfoData,

    selectedMarketAddressesSet,
    isAllChecked,
    canSelectMore,
    isSelectionLimitedBySwapMultichain,
    handleToggleSelect,
    handleToggleSelectAll,

    showOtherMainRewards,
    setShowOtherMainRewards,
    showSmallRewards,
    setShowSmallRewards,
    shouldShowSmallRewardsToggle,

    isSwapEnabled,
    setIsSwapEnabled,
    swapTargetTokenOptions,
    swapTargetTokenAddress,
    setSwapTargetTokenAddress,
    swapTargetToken,
    selectedClaimTokensUsd,
    toReceiveAmount,
    toReceiveUsd,
    isSwapRouteLoadingForSubmit,
    hasSwapRouteErrorForSubmit,
    failedSwapTokenSymbols,

    networkFeeInfo,

    errors,
    isOutOfTokenErrorToken,

    submitButtonState,
    handleSubmit,
  };
}
