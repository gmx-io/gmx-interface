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
  selectPoolsDetailsTradeTokensDataWithSourceChainBalances,
} from "context/PoolsDetailsContext/selectors";
import { selectDepositWithdrawalAmounts } from "context/PoolsDetailsContext/selectors/selectDepositWithdrawalAmounts";
import { selectPoolsDetailsParams } from "context/PoolsDetailsContext/selectors/selectPoolsDetailsParams";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectBlockTimestampData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  TokensBalancesUpdates,
  useTokensBalancesUpdates,
} from "context/TokensBalancesContext/TokensBalancesContextProvider";
import { getTransferRequests } from "domain/multichain/getTransferRequests";
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
import { SourceChainGlvWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvWithdrawalFees";
import { SourceChainWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainWithdrawalFees";
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
import { getContract } from "sdk/configs/contracts";
import { getWrappedToken } from "sdk/configs/tokens";
import { ExecutionFee } from "sdk/types/fees";
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
  const { signer, account } = useWallet();
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
  const tokensData = useSelector(selectPoolsDetailsTradeTokensDataWithSourceChainBalances);

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
  const marketTokenAddress = marketToken?.address;
  const glvTokenAddress = glvInfo?.glvTokenAddress;
  const executionFeeTokenDecimals = getWrappedToken(chainId)!.decimals;

  const transferRequests = useMemo((): TransferRequests | undefined => {
    if (!isWithdrawal) {
      return undefined;
    }

    if (isGlv) {
      if (!glvTokenAddress) {
        return undefined;
      }
      return getTransferRequests([
        {
          to: getContract(chainId, "GlvVault"),
          token: glvTokenAddress,
          amount: glvTokenAmount,
        },
      ]);
    }

    if (!marketTokenAddress) {
      return undefined;
    }

    return getTransferRequests([
      {
        to: getContract(chainId, "WithdrawalVault"),
        token: marketTokenAddress,
        amount: marketTokenAmount,
      },
    ]);
  }, [chainId, glvTokenAddress, glvTokenAmount, isGlv, isWithdrawal, marketTokenAddress, marketTokenAmount]);

  const rawParams = useSelector(selectPoolsDetailsParams);

  const params = useMemo((): CreateWithdrawalParams | CreateGlvWithdrawalParams | undefined => {
    if (!rawParams || !technicalFees || !isWithdrawal) {
      return undefined;
    }

    const executionFee =
      paySource === "sourceChain"
        ? (technicalFees as SourceChainWithdrawalFees | SourceChainGlvWithdrawalFees).executionFee
        : (technicalFees as ExecutionFee).feeTokenAmount;

    return {
      ...(rawParams as RawCreateWithdrawalParams),
      executionFee,
    };
  }, [rawParams, technicalFees, isWithdrawal, paySource]);

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

      if (
        !account ||
        !marketInfo ||
        !marketToken ||
        !amounts ||
        !transferRequests ||
        !tokensData ||
        !signer ||
        !params ||
        !isGlv
      ) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metricData.metricId);
        return Promise.resolve();
      }

      let promise: Promise<void>;

      if (paySource === "sourceChain") {
        if (!isSettlementChain(chainId) || !srcChainId || !globalExpressParams) {
          throw new Error("An error occurred");
        }

        promise = createSourceChainGlvWithdrawalTxn({
          chainId,
          srcChainId,
          signer,
          transferRequests,
          params: rawParams as CreateGlvWithdrawalParams,
          tokenAmount: glvTokenAmount!,
          fees: technicalFees as SourceChainGlvWithdrawalFees,
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
                  estimatedFeeUsd: (technicalFees as SourceChainGlvWithdrawalFees).relayFeeUsd,
                })
              );
            }
          })
          .catch((error) => {
            throw toastCustomOrStargateError(chainId, error);
          });
      } else if (paySource === "gmxAccount") {
        const expressTxnParams = multichainWithdrawalExpressTxnParams.data;
        if (!expressTxnParams) {
          throw new Error("Express txn params are not set");
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
        promise = createGlvWithdrawalTxn({
          chainId,
          signer,
          params: params as CreateGlvWithdrawalParams,
          executionGasLimit: (technicalFees as ExecutionFee).gasLimit,
          tokensData,
          setPendingTxns,
          setPendingWithdrawal,
          blockTimestampData,
          glvTokenAmount: glvTokenAmount!,
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
      account,
      marketInfo,
      marketToken,
      amounts,
      transferRequests,
      tokensData,
      signer,
      params,
      isGlv,
      paySource,
      chainId,
      srcChainId,
      globalExpressParams,
      rawParams,
      glvTokenAmount,
      technicalFees,
      setMultichainTransferProgress,
      multichainWithdrawalExpressTxnParams.data,
      setPendingTxns,
      setPendingWithdrawal,
      blockTimestampData,
      addOptimisticTokensBalancesUpdates,
    ]
  );

  const onCreateGmWithdrawal = useCallback(
    async function onCreateWithdrawal(): Promise<void> {
      if (!isWithdrawal) {
        return Promise.reject();
      }

      const metricData = getWithdrawalMetricData();

      if (
        !account ||
        !marketInfo ||
        !marketToken ||
        !amounts ||
        !transferRequests ||
        !tokensData ||
        !signer ||
        !params ||
        isGlv
      ) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metricData.metricId);
        return Promise.resolve();
      }

      let promise: Promise<void>;

      if (paySource === "sourceChain") {
        if (!isSettlementChain(chainId) || !srcChainId || !globalExpressParams || !technicalFees || !rawParams) {
          throw new Error("An error occurred");
        }

        promise = createSourceChainWithdrawalTxn({
          chainId,
          srcChainId,
          signer,
          fees: technicalFees as SourceChainWithdrawalFees,
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
                estimatedFeeUsd: (technicalFees as SourceChainWithdrawalFees).relayFeeUsd,
              })
            );
          }
        });
      } else if (paySource === "gmxAccount") {
        const expressTxnParams = multichainWithdrawalExpressTxnParams.data;
        if (!expressTxnParams) {
          throw new Error("Express txn params are not set");
        }

        promise = createMultichainWithdrawalTxn({
          chainId,
          signer,
          params: params as CreateWithdrawalParams,
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

            const withdrawalParams = params as CreateWithdrawalParams;
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
        promise = createWithdrawalTxn({
          chainId,
          signer,
          marketTokenAmount: marketTokenAmount!,
          executionGasLimit: (technicalFees as ExecutionFee).gasLimit,
          params: params as CreateWithdrawalParams,
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
      account,
      marketInfo,
      marketToken,
      amounts,
      transferRequests,
      tokensData,
      signer,
      params,
      isGlv,
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
