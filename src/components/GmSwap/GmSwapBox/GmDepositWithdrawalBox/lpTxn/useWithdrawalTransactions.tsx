import { t } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import { isSettlementChain } from "config/multichain";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import {
  selectPoolsDetailsFlags,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsIsFirstBuy,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsMarketInfo,
  selectPoolsDetailsMarketTokenData,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSelectedMarketAddressForGlv,
  selectPoolsDetailsSelectedMarketInfoForGlv,
  selectPoolsDetailsShortTokenAddress,
} from "context/PoolsDetailsContext/selectors";
import { selectDepositWithdrawalAmounts } from "context/PoolsDetailsContext/selectors/selectDepositWithdrawalAmounts";
import { selectPoolsDetailsParams } from "context/PoolsDetailsContext/selectors/selectPoolsDetailsParams";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectBlockTimestampData,
  selectChainId,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  TokensBalancesUpdates,
  useTokensBalancesUpdates,
} from "context/TokensBalancesContext/TokensBalancesContextProvider";
import { buildWithdrawalTransferRequests } from "domain/multichain/buildWithdrawalTransferRequests";
import { GlvSellTask, GmSellTask } from "domain/multichain/progress/GmOrGlvSellProgress";
import { toastCustomOrStargateError } from "domain/multichain/toastCustomOrStargateError";
import { TransferRequests } from "domain/multichain/types";
import {
  CreateGlvWithdrawalParams,
  CreateWithdrawalParams,
  createWithdrawalTxn,
  RawCreateGlvWithdrawalParams,
  RawCreateWithdrawalParams,
} from "domain/synthetics/markets";
import { createGlvWithdrawalTxn } from "domain/synthetics/markets/createGlvWithdrawalTxn";
import { createMultichainGlvWithdrawalTxn } from "domain/synthetics/markets/createMultichainGlvWithdrawalTxn";
import { createMultichainWithdrawalTxn } from "domain/synthetics/markets/createMultichainWithdrawalTxn";
import { createSourceChainGlvWithdrawalTxn } from "domain/synthetics/markets/createSourceChainGlvWithdrawalTxn";
import { createSourceChainWithdrawalTxn } from "domain/synthetics/markets/createSourceChainWithdrawalTxn";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import {
  initGLVSwapMetricData,
  initGMSwapMetricData,
  makeTxnErrorMetricsHandler,
  makeTxnSentMetricsHandler,
  sendTxnValidationErrorMetric,
} from "lib/metrics";
import useWallet from "lib/wallets/useWallet";
import { getWrappedToken } from "sdk/configs/tokens";
import { TokenBalanceType } from "sdk/types/tokens";
import { WithdrawalAmounts } from "sdk/types/trade";
import { getGlvToken, getGmToken } from "sdk/utils/tokens";

import type { UseLpTransactionProps } from "./useLpTransactions";
import { useMultichainWithdrawalExpressTxnParams } from "./useMultichainWithdrawalExpressTxnParams";

export const useWithdrawalTransactions = ({
  technicalFees,
  shouldDisableValidation,
}: Pick<UseLpTransactionProps, "technicalFees" | "shouldDisableValidation">): {
  onCreateWithdrawal: () => Promise<void>;
  isLoading: boolean;
  error: Error | undefined;
} => {
  const { chainId, srcChainId } = useChainId();
  const { signer } = useWallet();
  const { setPendingWithdrawal } = useSyntheticsEvents();
  const { setPendingTxns } = usePendingTxns();
  const { addOptimisticTokensBalancesUpdates } = useTokensBalancesUpdates();
  const blockTimestampData = useSelector(selectBlockTimestampData);
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const longTokenAddress = useSelector(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = useSelector(selectPoolsDetailsShortTokenAddress);
  const { isWithdrawal } = useSelector(selectPoolsDetailsFlags);
  const amounts = useSelector(selectDepositWithdrawalAmounts);
  const paySource = useSelector(selectPoolsDetailsPaySource);
  const selectedMarketForGlv = useSelector(selectPoolsDetailsSelectedMarketAddressForGlv);
  const tokensData = useSelector(selectTokensData);

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

  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);
  const isGlv = glvInfo !== undefined && selectedMarketForGlv !== undefined;
  const marketInfo = useSelector(selectPoolsDetailsMarketInfo);
  const marketToken = useSelector(selectPoolsDetailsMarketTokenData);
  const executionFeeTokenDecimals = getWrappedToken(chainId)!.decimals;

  const transferRequests = useWithdrawalTransferRequests();

  const rawParams = useSelector(selectPoolsDetailsParams);

  const params = useMemo((): CreateWithdrawalParams | CreateGlvWithdrawalParams | undefined => {
    if (!rawParams || !technicalFees || !isWithdrawal || technicalFees.isDeposit) {
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
      ...(rawParams as RawCreateWithdrawalParams),
      executionFee,
    };
  }, [rawParams, technicalFees, isWithdrawal]);

  const multichainWithdrawalExpressTxnParams = useMultichainWithdrawalExpressTxnParams({
    transferRequests,
    paySource,
    params,
    isGlv,
    isWithdrawal,
  });

  const getWithdrawalMetricData = useCallback(() => {
    const metricData =
      glvInfo && selectedMarketForGlv
        ? initGLVSwapMetricData({
            chainId,
            longTokenAddress,
            shortTokenAddress,
            selectedMarketForGlv,
            isDeposit: false,
            executionFeeTokenAmount: params?.executionFee,
            executionFeeTokenDecimals,
            glvAddress: glvInfo.glvTokenAddress,
            glvToken: glvInfo.glvToken,
            longTokenAmount,
            shortTokenAmount,
            marketTokenAmount,
            glvTokenAmount,
            marketName: selectedMarketInfoForGlv?.name,
            glvTokenUsd,
            isFirstBuy,
          })
        : initGMSwapMetricData({
            chainId,
            longTokenAddress,
            shortTokenAddress,
            marketToken,
            isDeposit: false,

            executionFeeTokenAmount: params?.executionFee,
            executionFeeTokenDecimals,
            marketInfo,
            longTokenAmount,
            shortTokenAmount,
            marketTokenAmount,
            marketTokenUsd,
            isFirstBuy,
          });

    return metricData;
  }, [
    glvInfo,
    selectedMarketForGlv,
    chainId,
    longTokenAddress,
    shortTokenAddress,
    params?.executionFee,
    executionFeeTokenDecimals,
    longTokenAmount,
    shortTokenAmount,
    marketTokenAmount,
    glvTokenAmount,
    selectedMarketInfoForGlv?.name,
    glvTokenUsd,
    isFirstBuy,
    marketToken,
    marketInfo,
    marketTokenUsd,
  ]);

  const { setMultichainTransferProgress } = useSyntheticsEvents();

  const onCreateGlvWithdrawal = useCallback(
    async function onCreateWithdrawal(): Promise<void> {
      if (!isWithdrawal) {
        return Promise.reject();
      }

      const metricData = getWithdrawalMetricData();

      if (!amounts || !signer || !params) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metricData.metricId);
        return Promise.resolve();
      }

      let promise: Promise<void>;

      if (paySource === "sourceChain") {
        if (!isSettlementChain(chainId) || !srcChainId || !globalExpressParams) {
          throw new Error("An error occurred");
        }

        const fees =
          technicalFees?.kind === "sourceChain" && !technicalFees.isDeposit && technicalFees.isGlv
            ? technicalFees.fees
            : undefined;

        if (!fees || !transferRequests) {
          helperToast.error(t`Error submitting order`);
          sendTxnValidationErrorMetric(metricData.metricId);
          return;
        }

        promise = createSourceChainGlvWithdrawalTxn({
          chainId,
          srcChainId,
          signer,
          transferRequests,
          params: rawParams as CreateGlvWithdrawalParams,
          tokenAmount: glvTokenAmount!,
          fees,
        })
          .then((res) => {
            if (res.transactionHash) {
              setMultichainTransferProgress(
                new GlvSellTask({
                  sourceChainId: srcChainId!,
                  initialTxHash: res.transactionHash,
                  token: getGlvToken(chainId, (rawParams as RawCreateGlvWithdrawalParams).addresses.glv),
                  amount: (amounts as WithdrawalAmounts).glvTokenAmount,
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
        const expressTxnParams = multichainWithdrawalExpressTxnParams.data;
        if (!transferRequests || !expressTxnParams) {
          helperToast.error(t`Error submitting order`);
          sendTxnValidationErrorMetric(metricData.metricId);
          return;
        }

        promise = createMultichainGlvWithdrawalTxn({
          chainId,
          signer,
          params: params as CreateGlvWithdrawalParams,
          expressTxnParams,
          transferRequests,
          srcChainId,
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

            const glvWithdrawalParams = params as CreateGlvWithdrawalParams;
            setPendingWithdrawal({
              account: glvWithdrawalParams.addresses.receiver,
              marketAddress: glvWithdrawalParams.addresses.glv,
              marketTokenAmount: glvTokenAmount!,
              minLongTokenAmount: glvWithdrawalParams.minLongTokenAmount,
              minShortTokenAmount: glvWithdrawalParams.minShortTokenAmount,
              shouldUnwrapNativeToken: glvWithdrawalParams.shouldUnwrapNativeToken,
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

        promise = createGlvWithdrawalTxn({
          chainId,
          signer,
          params: params as CreateGlvWithdrawalParams,
          executionGasLimit: fees.gasLimit,
          tokensData,
          setPendingTxns,
          setPendingWithdrawal,
          blockTimestampData,
          glvTokenAmount: glvTokenAmount!,
          skipSimulation: shouldDisableValidation,
        });
      } else {
        throw new Error(`Invalid pay source: ${paySource}`);
      }

      return promise
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId));
    },
    [
      isWithdrawal,
      getWithdrawalMetricData,
      amounts,
      transferRequests,
      tokensData,
      signer,
      params,
      paySource,
      chainId,
      srcChainId,
      globalExpressParams,
      rawParams,
      glvTokenAmount,
      technicalFees,
      setMultichainTransferProgress,
      multichainWithdrawalExpressTxnParams.data,
      addOptimisticTokensBalancesUpdates,
      setPendingWithdrawal,
      setPendingTxns,
      blockTimestampData,
      shouldDisableValidation,
    ]
  );

  const onCreateGmWithdrawal = useCallback(
    async function onCreateWithdrawal(): Promise<void> {
      if (!isWithdrawal) {
        return Promise.reject();
      }

      const metricData = getWithdrawalMetricData();

      if (!amounts || !signer || !params) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metricData.metricId);
        return Promise.resolve();
      }

      let promise: Promise<void>;

      if (paySource === "sourceChain") {
        if (!isSettlementChain(chainId) || !srcChainId || !globalExpressParams || !technicalFees || !rawParams) {
          throw new Error("An error occurred");
        }

        const fees =
          technicalFees.kind === "sourceChain" && !technicalFees.isDeposit && !technicalFees.isGlv
            ? technicalFees.fees
            : undefined;
        if (!fees || !transferRequests) {
          helperToast.error(t`Error submitting order`);
          sendTxnValidationErrorMetric(metricData.metricId);
          return;
        }

        promise = createSourceChainWithdrawalTxn({
          chainId,
          srcChainId,
          signer,
          fees,
          transferRequests,
          params: rawParams as RawCreateWithdrawalParams,
          tokenAmount: marketTokenAmount!,
        }).then((res) => {
          if (res.transactionHash) {
            setMultichainTransferProgress(
              new GmSellTask({
                sourceChainId: srcChainId,
                initialTxHash: res.transactionHash,
                token: getGmToken(chainId, (rawParams as RawCreateWithdrawalParams).addresses.market),
                amount: (amounts as WithdrawalAmounts).marketTokenAmount,
                settlementChainId: chainId,
                estimatedFeeUsd: fees.relayFeeUsd,
              })
            );
          }
        });
      } else if (paySource === "gmxAccount") {
        const expressTxnParams = multichainWithdrawalExpressTxnParams.data;
        if (!transferRequests || !expressTxnParams) {
          helperToast.error(t`Error submitting order`);
          sendTxnValidationErrorMetric(metricData.metricId);
          return;
        }

        const withdrawalParams = params as CreateWithdrawalParams;

        promise = createMultichainWithdrawalTxn({
          chainId,
          signer,
          params: withdrawalParams,
          expressTxnParams,
          transferRequests,
          srcChainId,
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

            setPendingWithdrawal({
              account: withdrawalParams.addresses.receiver,
              marketAddress: withdrawalParams.addresses.market,
              marketTokenAmount: marketTokenAmount!,
              minLongTokenAmount: withdrawalParams.minLongTokenAmount,
              minShortTokenAmount: withdrawalParams.minShortTokenAmount,
              shouldUnwrapNativeToken: withdrawalParams.shouldUnwrapNativeToken,
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

        const withdrawalParams = params as CreateWithdrawalParams;

        promise = createWithdrawalTxn({
          chainId,
          signer,
          marketTokenAmount: marketTokenAmount!,
          params: withdrawalParams,
          executionGasLimit: fees.gasLimit,
          tokensData,
          skipSimulation: shouldDisableValidation,
          setPendingTxns,
          setPendingWithdrawal,
          blockTimestampData,
        });
      } else {
        throw new Error(`Invalid pay source: ${paySource}`);
      }

      return promise
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId))
        .catch((error) => {
          toastCustomOrStargateError(chainId, error);
        });
    },
    [
      isWithdrawal,
      getWithdrawalMetricData,
      amounts,
      transferRequests,
      tokensData,
      signer,
      params,
      paySource,
      chainId,
      srcChainId,
      globalExpressParams,
      technicalFees,
      rawParams,
      marketTokenAmount,
      setMultichainTransferProgress,
      multichainWithdrawalExpressTxnParams.data,
      addOptimisticTokensBalancesUpdates,
      setPendingWithdrawal,
      shouldDisableValidation,
      setPendingTxns,
      blockTimestampData,
    ]
  );

  const onCreateWithdrawal = isGlv ? onCreateGlvWithdrawal : onCreateGmWithdrawal;

  return {
    onCreateWithdrawal,
    isLoading:
      paySource === "gmxAccount" &&
      !multichainWithdrawalExpressTxnParams.error &&
      !multichainWithdrawalExpressTxnParams.data,
    error: paySource === "gmxAccount" ? multichainWithdrawalExpressTxnParams.error : undefined,
  };
};

function useWithdrawalTransferRequests(): TransferRequests | undefined {
  const chainId = useSelector(selectChainId);
  const { isWithdrawal } = useSelector(selectPoolsDetailsFlags);
  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);
  const selectedMarketForGlv = useSelector(selectPoolsDetailsSelectedMarketAddressForGlv);
  const marketToken = useSelector(selectPoolsDetailsMarketTokenData);
  const amounts = useSelector(selectDepositWithdrawalAmounts);

  const { glvTokenAmount = 0n, marketTokenAmount = 0n } = amounts ?? {};

  const isGlv = glvInfo !== undefined && selectedMarketForGlv !== undefined;
  const marketTokenAddress = marketToken?.address;
  const glvTokenAddress = glvInfo?.glvTokenAddress;

  return useMemo((): TransferRequests | undefined => {
    return buildWithdrawalTransferRequests({
      isWithdrawal,
      isGlv,
      chainId: chainId,
      glvTokenAddress,
      glvTokenAmount,
      marketTokenAddress,
      marketTokenAmount,
    });
  }, [chainId, glvTokenAddress, glvTokenAmount, isGlv, isWithdrawal, marketTokenAddress, marketTokenAmount]);
}
