import { t } from "@lingui/macro";
import { useCallback, useMemo } from "react";
import { zeroAddress } from "viem";

import type { SettlementChainId } from "config/chains";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import {
  selectPoolsDetailsFirstTokenAddress,
  selectPoolsDetailsFlags,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsIsFirstBuy,
  selectPoolsDetailsIsMarketTokenDeposit,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsMarketInfo,
  selectPoolsDetailsMarketTokenAddress,
  selectPoolsDetailsMarketTokenData,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSecondTokenAddress,
  selectPoolsDetailsSelectedMarketAddressForGlv,
  selectPoolsDetailsSelectedMarketInfoForGlv,
  selectPoolsDetailsShortTokenAddress,
} from "context/PoolsDetailsContext/selectors";
import { selectDepositWithdrawalAmounts } from "context/PoolsDetailsContext/selectors/selectDepositWithdrawalAmounts";
import { selectPoolsDetailsParams } from "context/PoolsDetailsContext/selectors/selectPoolsDetailsParams";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  selectBlockTimestampData,
  selectChainId,
  selectSrcChainId,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectGasPaymentTokenAddress } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  TokensBalancesUpdates,
  useTokensBalancesUpdates,
} from "context/TokensBalancesContext/TokensBalancesContextProvider";
import { GlvBuyTask, GmBuyTask } from "domain/multichain/progress/GmOrGlvBuyProgress";
import { toastCustomOrStargateError } from "domain/multichain/toastCustomOrStargateError";
import type { TransferRequests } from "domain/multichain/types";
import {
  CreateDepositParams,
  createDepositTxn,
  CreateGlvDepositParams,
  RawCreateDepositParams,
  RawCreateGlvDepositParams,
} from "domain/synthetics/markets";
import { buildDepositTransferRequests } from "domain/synthetics/markets/buildDepositTransferRequests";
import { createGlvDepositTxn } from "domain/synthetics/markets/createGlvDepositTxn";
import { createMultichainDepositTxn } from "domain/synthetics/markets/createMultichainDepositTxn";
import { createMultichainGlvDepositTxn } from "domain/synthetics/markets/createMultichainGlvDepositTxn";
import { createSourceChainDepositTxn } from "domain/synthetics/markets/createSourceChainDepositTxn";
import { createSourceChainGlvDepositTxn } from "domain/synthetics/markets/createSourceChainGlvDepositTxn";
import type { TechnicalGmFees } from "domain/synthetics/markets/technicalFees/technical-fees-types";
import { ERC20Address, NativeTokenSupportedAddress, TokenBalanceType } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import {
  initGLVSwapMetricData,
  initGMSwapMetricData,
  makeTxnErrorMetricsHandler,
  makeTxnSentMetricsHandler,
  sendOrderSubmittedMetric,
  sendTxnValidationErrorMetric,
} from "lib/metrics";
import { makeUserAnalyticsOrderFailResultHandler, sendUserAnalyticsOrderConfirmClickEvent } from "lib/userAnalytics";
import useWallet from "lib/wallets/useWallet";
import { convertTokenAddress, getWrappedToken } from "sdk/configs/tokens";
import { getGlvToken, getGmToken } from "sdk/utils/tokens";

import type { UseLpTransactionProps } from "./useLpTransactions";
import { useMultichainDepositExpressTxnParams } from "./useMultichainDepositExpressTxnParams";

export const useDepositTransactions = ({
  shouldDisableValidation,
  technicalFees,
}: Pick<UseLpTransactionProps, "shouldDisableValidation" | "technicalFees">): {
  onCreateDeposit: () => Promise<void>;
  isLoading: boolean;
  error: Error | undefined;
} => {
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const { signer } = useWallet();
  const { setPendingDeposit } = useSyntheticsEvents();
  const { addOptimisticTokensBalancesUpdates } = useTokensBalancesUpdates();
  const { setPendingTxns } = usePendingTxns();
  const blockTimestampData = useSelector(selectBlockTimestampData);
  const { isDeposit } = useSelector(selectPoolsDetailsFlags);

  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);
  const marketInfo = useSelector(selectPoolsDetailsMarketInfo);
  const marketToken = useSelector(selectPoolsDetailsMarketTokenData);
  const firstTokenAddress = useSelector(selectPoolsDetailsFirstTokenAddress);
  const secondTokenAddress = useSelector(selectPoolsDetailsSecondTokenAddress);
  const longTokenAddress = useSelector(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = useSelector(selectPoolsDetailsShortTokenAddress);
  const paySource = useSelector(selectPoolsDetailsPaySource);
  const selectedMarketForGlv = useSelector(selectPoolsDetailsSelectedMarketAddressForGlv);

  const tokensData = useSelector(selectTokensData);
  const amounts = useSelector(selectDepositWithdrawalAmounts);

  const {
    longTokenAmount = 0n,
    shortTokenAmount = 0n,
    glvTokenAmount = 0n,
    glvTokenUsd = 0n,
    marketTokenAmount = 0n,
    marketTokenUsd = 0n,
  } = amounts ?? {};

  const selectedMarketInfoForGlv = useSelector(selectPoolsDetailsSelectedMarketInfoForGlv);

  const isFirstBuy = useSelector(selectPoolsDetailsIsFirstBuy);

  const isGlv = glvInfo !== undefined && selectedMarketForGlv !== undefined;

  const transferRequests = useDepositTransferRequests({ technicalFees });

  const rawParams = useSelector(selectPoolsDetailsParams);

  const params = useMemo((): CreateDepositParams | CreateGlvDepositParams | undefined => {
    if (!rawParams || !technicalFees || !isDeposit || !technicalFees.isDeposit) {
      return undefined;
    }

    let executionFee: bigint | undefined;
    if (technicalFees.kind === "sourceChain") {
      executionFee = technicalFees.fees.executionFee;
    } else if (technicalFees.kind === "gmxAccount") {
      executionFee = technicalFees.fees.executionFee.feeTokenAmount;
    } else if (technicalFees.kind === "settlementChain") {
      executionFee = technicalFees.fees.feeTokenAmount;
    }

    if (executionFee === undefined) {
      return undefined;
    }

    return {
      ...(rawParams as RawCreateDepositParams),
      executionFee,
    };
  }, [rawParams, technicalFees, isDeposit]);

  const gasPaymentTokenAddress = useSelector(selectGasPaymentTokenAddress);
  const gasPaymentTokenAsCollateralAmount = useMemo((): bigint | undefined => {
    if (longTokenAddress === gasPaymentTokenAddress) {
      return longTokenAmount;
    }
    if (shortTokenAddress === gasPaymentTokenAddress) {
      return shortTokenAmount;
    }
    return undefined;
  }, [longTokenAddress, shortTokenAddress, longTokenAmount, shortTokenAmount, gasPaymentTokenAddress]);

  const multichainDepositExpressTxnParams = useMultichainDepositExpressTxnParams({
    transferRequests,
    paySource,
    params,
    isGlv,
    isDeposit,
    gasPaymentTokenAsCollateralAmount,
  });

  const getDepositMetricData = useCallback(() => {
    if (isGlv) {
      return initGLVSwapMetricData({
        chainId,
        longTokenAddress,
        shortTokenAddress,
        selectedMarketForGlv,
        isDeposit: true,
        executionFeeTokenAmount: params?.executionFee,
        executionFeeTokenDecimals: getWrappedToken(chainId)!.decimals,
        glvAddress: glvInfo!.glvTokenAddress,
        glvToken: glvInfo!.glvToken,
        longTokenAmount,
        shortTokenAmount,
        marketTokenAmount,
        glvTokenAmount,
        marketName: selectedMarketInfoForGlv?.name,
        glvTokenUsd: glvTokenUsd,
        isFirstBuy,
      });
    }

    return initGMSwapMetricData({
      chainId,
      longTokenAddress,
      shortTokenAddress,
      marketToken,
      isDeposit: true,
      executionFeeTokenAmount: params?.executionFee,
      executionFeeTokenDecimals: getWrappedToken(chainId)!.decimals,
      marketInfo,
      longTokenAmount,
      shortTokenAmount,
      marketTokenAmount,
      marketTokenUsd,
      isFirstBuy,
    });
  }, [
    chainId,
    glvInfo,
    params?.executionFee,
    glvTokenAmount,
    glvTokenUsd,
    isFirstBuy,
    isGlv,
    longTokenAddress,
    longTokenAmount,
    marketInfo,
    marketToken,
    marketTokenAmount,
    marketTokenUsd,
    selectedMarketForGlv,
    selectedMarketInfoForGlv?.name,
    shortTokenAddress,
    shortTokenAmount,
  ]);

  const { setMultichainTransferProgress } = useSyntheticsEvents();

  const onCreateGmDeposit = useCallback(
    async function onCreateGmDeposit(): Promise<void> {
      if (!isDeposit) {
        return Promise.reject();
      }

      const metricData = getDepositMetricData();

      sendOrderSubmittedMetric(metricData.metricId);

      if (!signer || !rawParams) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metricData.metricId);
        return Promise.resolve();
      }

      sendUserAnalyticsOrderConfirmClickEvent(chainId, metricData.metricId);

      let promise: Promise<void>;

      if (paySource === "sourceChain") {
        if (!transferRequests) {
          helperToast.error(t`Error submitting order`);
          sendTxnValidationErrorMetric(metricData.metricId);
          return;
        }

        if (longTokenAmount! > 0n && shortTokenAmount! > 0n) {
          throw new Error("Pay source sourceChain does not support both long and short token deposits");
        }

        let tokenAddress: ERC20Address | NativeTokenSupportedAddress =
          longTokenAmount! > 0n ? longTokenAddress! : shortTokenAddress!;
        tokenAddress = convertTokenAddress(chainId, tokenAddress, "native");
        const tokenAmount = longTokenAmount! > 0n ? longTokenAmount! : shortTokenAmount!;

        const fees = technicalFees?.kind === "sourceChain" && technicalFees.isDeposit ? technicalFees.fees : undefined;
        if (!fees) {
          throw new Error("Technical fees are not set");
        }

        promise = createSourceChainDepositTxn({
          chainId: chainId as SettlementChainId,
          srcChainId: srcChainId!,
          signer,
          transferRequests,
          params: rawParams as RawCreateDepositParams,
          tokenAddress,
          tokenAmount,
          fees,
        })
          .then((res) => {
            if (res.transactionHash) {
              setMultichainTransferProgress(
                new GmBuyTask({
                  sourceChainId: srcChainId!,
                  initialTxHash: res.transactionHash,
                  token: getGmToken(chainId, (rawParams as RawCreateDepositParams).addresses.market),
                  amount: marketTokenAmount!,
                  settlementChainId: chainId,
                  estimatedFeeUsd: fees.relayFeeUsd,
                })
              );
            }
          })
          .catch((error) => {
            throw toastCustomOrStargateError(chainId, error);
          });
      } else if (paySource === "gmxAccount") {
        const expressTxnParams = multichainDepositExpressTxnParams.data;
        if (!transferRequests || !expressTxnParams) {
          helperToast.error(t`Error submitting order`);
          sendTxnValidationErrorMetric(metricData.metricId);
          return;
        }

        promise = createMultichainDepositTxn({
          chainId,
          srcChainId,
          signer,
          transferRequests,
          expressTxnParams,
          params: params as CreateDepositParams,
        }).then((result) => {
          if (result?.taskId) {
            const balanceUpdates: TokensBalancesUpdates = {};
            transferRequests.tokens.forEach((token, i) => {
              const amount = transferRequests.amounts[i];

              balanceUpdates[token] = {
                balanceType: TokenBalanceType.GmxAccount,
                diff: -amount,
                isPending: true,
              };
            });
            addOptimisticTokensBalancesUpdates(balanceUpdates);

            const depositParams = params as CreateDepositParams;
            setPendingDeposit({
              account: depositParams.addresses.receiver,
              marketAddress: depositParams.addresses.market,
              initialLongTokenAddress: depositParams.addresses.initialLongToken,
              initialShortTokenAddress: depositParams.addresses.initialShortToken,
              longTokenSwapPath: depositParams.addresses.longTokenSwapPath,
              shortTokenSwapPath: depositParams.addresses.shortTokenSwapPath,
              initialLongTokenAmount: longTokenAmount ?? 0n,
              initialShortTokenAmount: shortTokenAmount ?? 0n,
              minMarketTokens: depositParams.minMarketTokens,
              shouldUnwrapNativeToken: depositParams.shouldUnwrapNativeToken,
              isGlvDeposit: false,
            });
          }
        });
      } else if (paySource === "settlementChain") {
        const fees = technicalFees?.kind === "settlementChain" ? technicalFees.fees : undefined;
        if (!fees || !tokensData) {
          helperToast.error(t`Error submitting order`);
          sendTxnValidationErrorMetric(metricData.metricId);
          return;
        }

        promise = createDepositTxn({
          chainId,
          signer,
          blockTimestampData,
          longTokenAmount: longTokenAmount ?? 0n,
          shortTokenAmount: shortTokenAmount ?? 0n,
          executionFee: fees.feeTokenAmount,
          executionGasLimit: fees.gasLimit,
          skipSimulation: shouldDisableValidation,
          tokensData,
          metricId: metricData.metricId,
          params: params as CreateDepositParams,
          setPendingTxns,
          setPendingDeposit,
        });
      } else {
        throw new Error(`Invalid pay source: ${paySource}`);
      }

      return await promise
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId))
        .catch(makeUserAnalyticsOrderFailResultHandler(chainId, metricData.metricId));
    },
    [
      isDeposit,
      getDepositMetricData,
      tokensData,
      signer,
      rawParams,
      transferRequests,
      chainId,
      paySource,
      longTokenAmount,
      shortTokenAmount,
      technicalFees,
      longTokenAddress,
      shortTokenAddress,
      srcChainId,
      setMultichainTransferProgress,
      marketTokenAmount,
      multichainDepositExpressTxnParams.data,
      params,
      addOptimisticTokensBalancesUpdates,
      setPendingDeposit,
      blockTimestampData,
      shouldDisableValidation,
      setPendingTxns,
    ]
  );

  const onCreateGlvDeposit = useCallback(
    async function onCreateGlvDeposit(): Promise<void> {
      if (!isDeposit) {
        return Promise.reject();
      }

      const metricData = getDepositMetricData();

      sendOrderSubmittedMetric(metricData.metricId);

      if (!signer || !rawParams) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metricData.metricId);
        return Promise.resolve();
      }

      sendUserAnalyticsOrderConfirmClickEvent(chainId, metricData.metricId);

      let promise: Promise<void>;
      if (paySource === "sourceChain") {
        if (!transferRequests || !technicalFees) {
          helperToast.error(t`Error submitting order`);
          sendTxnValidationErrorMetric(metricData.metricId);
          return;
        }

        if (longTokenAmount! > 0n && shortTokenAmount! > 0n) {
          throw new Error("Pay source sourceChain does not support both long and short token deposits");
        }

        const fees = technicalFees.kind === "sourceChain" && technicalFees.isDeposit ? technicalFees.fees : undefined;
        if (!fees) {
          throw new Error("Technical fees are not set");
        }

        if (!longTokenAddress || !shortTokenAddress) {
          throw new Error("Long or short token address is not set");
        }

        let tokenAddress: string;
        let tokenAmount: bigint;
        if ((rawParams as RawCreateGlvDepositParams).isMarketTokenDeposit) {
          tokenAddress = (rawParams as RawCreateGlvDepositParams).addresses.market;
          tokenAmount = marketTokenAmount;
        } else if (longTokenAmount > 0n) {
          tokenAddress = longTokenAddress;
          tokenAmount = longTokenAmount;
        } else if (shortTokenAmount > 0n) {
          tokenAddress = shortTokenAddress;
          tokenAmount = shortTokenAmount;
        } else {
          throw new Error("No token amount specified for deposit");
        }

        promise = createSourceChainGlvDepositTxn({
          chainId: chainId as SettlementChainId,
          srcChainId: srcChainId!,
          signer,
          transferRequests,
          params: rawParams as RawCreateGlvDepositParams,
          tokenAddress,
          tokenAmount,
          fees,
        })
          .then((res) => {
            if (res.transactionHash) {
              setMultichainTransferProgress(
                new GlvBuyTask({
                  sourceChainId: srcChainId!,
                  initialTxHash: res.transactionHash,
                  token: getGlvToken(chainId, (rawParams as RawCreateGlvDepositParams).addresses.glv),
                  amount: glvTokenAmount!,
                  settlementChainId: chainId,
                  estimatedFeeUsd: fees.relayFeeUsd,
                })
              );
            }
          })
          .catch((error) => {
            throw toastCustomOrStargateError(chainId, error);
          });
      } else if (paySource === "gmxAccount") {
        const expressTxnParams = multichainDepositExpressTxnParams.data;

        if (!transferRequests || !expressTxnParams) {
          helperToast.error(t`Error submitting order`);
          sendTxnValidationErrorMetric(metricData.metricId);
          return;
        }

        promise = createMultichainGlvDepositTxn({
          chainId,
          srcChainId,
          signer,
          transferRequests,
          expressTxnParams,
          params: params as CreateGlvDepositParams,
        }).then((result) => {
          if (result?.taskId) {
            const balanceUpdates: TokensBalancesUpdates = {};
            transferRequests.tokens.forEach((token, i) => {
              const amount = transferRequests.amounts[i];

              balanceUpdates[token] = {
                balanceType: TokenBalanceType.GmxAccount,
                diff: -amount,
                isPending: true,
              };
            });
            addOptimisticTokensBalancesUpdates(balanceUpdates);

            const glvDepositParams = params as CreateGlvDepositParams;
            setPendingDeposit({
              account: glvDepositParams.addresses.receiver,
              marketAddress: glvDepositParams.addresses.market,
              glvAddress: glvDepositParams.addresses.glv,
              initialLongTokenAddress: glvDepositParams.addresses.initialLongToken,
              initialShortTokenAddress: glvDepositParams.addresses.initialShortToken,
              longTokenSwapPath: glvDepositParams.addresses.longTokenSwapPath,
              shortTokenSwapPath: glvDepositParams.addresses.shortTokenSwapPath,
              initialLongTokenAmount: longTokenAmount ?? 0n,
              initialShortTokenAmount: shortTokenAmount ?? 0n,
              initialMarketTokenAmount: glvDepositParams.isMarketTokenDeposit ? marketTokenAmount ?? 0n : 0n,
              minMarketTokens: glvDepositParams.minGlvTokens,
              shouldUnwrapNativeToken: glvDepositParams.shouldUnwrapNativeToken,
              isGlvDeposit: true,
              isMarketDeposit: glvDepositParams.isMarketTokenDeposit,
              marketTokenAmount: glvDepositParams.isMarketTokenDeposit ? marketTokenAmount : undefined,
            });
          }
        });
      } else if (paySource === "settlementChain") {
        if (!tokensData) {
          helperToast.error(t`Error submitting order`);
          sendTxnValidationErrorMetric(metricData.metricId);
          return;
        }

        const someInputTokenIsNative = firstTokenAddress === zeroAddress || secondTokenAddress === zeroAddress;

        const maybeNativeLongTokenAddress =
          someInputTokenIsNative && getWrappedToken(chainId).address === longTokenAddress
            ? zeroAddress
            : longTokenAddress;

        const maybeNativeShortTokenAddress =
          someInputTokenIsNative && getWrappedToken(chainId).address === shortTokenAddress
            ? zeroAddress
            : shortTokenAddress;

        const fees = technicalFees?.kind === "settlementChain" ? technicalFees.fees : undefined;
        if (!fees) {
          throw new Error("Technical fees are not set");
        }

        promise = createGlvDepositTxn({
          chainId,
          signer,
          params: params as CreateGlvDepositParams,
          longTokenAddress: maybeNativeLongTokenAddress!,
          shortTokenAddress: maybeNativeShortTokenAddress!,
          longTokenAmount: longTokenAmount ?? 0n,
          shortTokenAmount: shortTokenAmount ?? 0n,
          marketTokenAmount: marketTokenAmount ?? 0n,
          executionFee: fees.feeTokenAmount,
          executionGasLimit: fees.gasLimit,
          skipSimulation: shouldDisableValidation,
          tokensData,
          blockTimestampData,
          setPendingTxns,
          setPendingDeposit,
        });
      } else {
        throw new Error(`Invalid pay source: ${paySource}`);
      }

      return await promise
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId))
        .catch(makeUserAnalyticsOrderFailResultHandler(chainId, metricData.metricId));
    },
    [
      isDeposit,
      getDepositMetricData,
      tokensData,
      signer,
      rawParams,
      transferRequests,
      chainId,
      paySource,
      longTokenAmount,
      shortTokenAmount,
      technicalFees,
      longTokenAddress,
      shortTokenAddress,
      srcChainId,
      marketTokenAmount,
      setMultichainTransferProgress,
      glvTokenAmount,
      multichainDepositExpressTxnParams.data,
      params,
      addOptimisticTokensBalancesUpdates,
      setPendingDeposit,
      firstTokenAddress,
      secondTokenAddress,
      shouldDisableValidation,
      blockTimestampData,
      setPendingTxns,
    ]
  );

  const onCreateDeposit = isGlv ? onCreateGlvDeposit : onCreateGmDeposit;

  return {
    onCreateDeposit,
    isLoading:
      paySource === "gmxAccount" && !multichainDepositExpressTxnParams.error && !multichainDepositExpressTxnParams.data,
    error: paySource === "gmxAccount" ? multichainDepositExpressTxnParams.error : undefined,
  };
};

function useDepositTransferRequests({
  technicalFees,
}: {
  technicalFees: TechnicalGmFees | undefined;
}): TransferRequests | undefined {
  const chainId = useSelector(selectChainId);
  const { isDeposit } = useSelector(selectPoolsDetailsFlags);
  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);
  const selectedMarketForGlv = useSelector(selectPoolsDetailsSelectedMarketAddressForGlv);
  const marketInfo = useSelector(selectPoolsDetailsMarketInfo);
  const paySource = useSelector(selectPoolsDetailsPaySource);
  const isMarketTokenDeposit = useSelector(selectPoolsDetailsIsMarketTokenDeposit);
  const marketTokenAddress = useSelector(selectPoolsDetailsMarketTokenAddress);
  const longTokenAddress = useSelector(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = useSelector(selectPoolsDetailsShortTokenAddress);
  const amounts = useSelector(selectDepositWithdrawalAmounts);

  const { longTokenAmount = 0n, shortTokenAmount = 0n, marketTokenAmount = 0n } = amounts ?? {};

  const isGlv = glvInfo !== undefined && selectedMarketForGlv !== undefined;

  const initialLongTokenAddress = longTokenAddress
    ? convertTokenAddress(chainId, longTokenAddress, "wrapped")
    : undefined;
  const initialShortTokenAddress =
    shortTokenAddress && initialLongTokenAddress
      ? convertTokenAddress(
          chainId,
          marketInfo?.isSameCollaterals ? initialLongTokenAddress : shortTokenAddress,
          "wrapped"
        )
      : undefined;

  return useMemo((): TransferRequests | undefined => {
    return buildDepositTransferRequests({
      isDeposit,
      isGlv,
      chainId,
      paySource,
      isMarketTokenDeposit,
      marketTokenAddress,
      marketTokenAmount,
      longTokenAmount,
      shortTokenAmount,
      initialLongTokenAddress,
      initialShortTokenAddress,
      technicalFees,
    });
  }, [
    isDeposit,
    isGlv,
    chainId,
    paySource,
    initialLongTokenAddress,
    longTokenAmount,
    initialShortTokenAddress,
    shortTokenAmount,
    isMarketTokenDeposit,
    technicalFees,
    marketTokenAddress,
    marketTokenAmount,
  ]);
}
