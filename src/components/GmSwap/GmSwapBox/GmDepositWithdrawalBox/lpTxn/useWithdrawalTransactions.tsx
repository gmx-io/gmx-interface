import { t } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import { isSettlementChain } from "config/multichain";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import {
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsMarketInfo,
  selectPoolsDetailsMarketTokenData,
  selectPoolsDetailsShortTokenAddress,
} from "context/PoolsDetailsContext/PoolsDetailsContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectBlockTimestampData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getTransferRequests } from "domain/multichain/getTransferRequests";
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

import { selectPoolsDetailsParams } from "./selectPoolsDetailsParams";
import type { UseLpTransactionProps } from "./useLpTransactions";
import { useMultichainWithdrawalExpressTxnParams } from "./useMultichainWithdrawalExpressTxnParams";

export const useWithdrawalTransactions = ({
  selectedMarketForGlv,
  longTokenAmount,
  shortTokenAmount,
  marketTokenAmount,
  marketTokenUsd,
  glvTokenAmount,
  glvTokenUsd,
  isFirstBuy,
  paySource,
  technicalFees,
  selectedMarketInfoForGlv,
  tokensData,
  shouldDisableValidation,
}: UseLpTransactionProps) => {
  const { chainId, srcChainId } = useChainId();
  const { signer, account } = useWallet();
  const { setPendingWithdrawal } = useSyntheticsEvents();
  const { setPendingTxns } = usePendingTxns();
  const blockTimestampData = useSelector(selectBlockTimestampData);
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const longTokenAddress = useSelector(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = useSelector(selectPoolsDetailsShortTokenAddress);

  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);
  const isGlv = glvInfo !== undefined && selectedMarketForGlv !== undefined;
  const marketInfo = useSelector(selectPoolsDetailsMarketInfo);
  const marketToken = useSelector(selectPoolsDetailsMarketTokenData);
  const marketTokenAddress = marketToken?.address;
  const glvTokenAddress = glvInfo?.glvTokenAddress;
  const executionFeeTokenDecimals = getWrappedToken(chainId)!.decimals;

  const transferRequests = useMemo((): TransferRequests | undefined => {
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
  }, [chainId, glvTokenAddress, glvTokenAmount, isGlv, marketTokenAddress, marketTokenAmount]);

  const rawParams = useSelector(selectPoolsDetailsParams);

  const gmParams = useMemo((): CreateWithdrawalParams | undefined => {
    if (!rawParams || !technicalFees) {
      return undefined;
    }

    const executionFee =
      paySource === "sourceChain"
        ? (technicalFees as SourceChainWithdrawalFees).executionFee
        : (technicalFees as ExecutionFee).feeTokenAmount;

    return {
      ...(rawParams as RawCreateWithdrawalParams),
      executionFee,
    };
  }, [rawParams, technicalFees, paySource]);

  const glvParams = useMemo((): CreateGlvWithdrawalParams | undefined => {
    if (!rawParams || !technicalFees) {
      return undefined;
    }

    const executionFee =
      paySource === "sourceChain"
        ? (technicalFees as SourceChainGlvWithdrawalFees).executionFee
        : (technicalFees as ExecutionFee).feeTokenAmount;

    return {
      ...(rawParams as RawCreateGlvWithdrawalParams),
      executionFee,
    };
  }, [paySource, rawParams, technicalFees]);

  const multichainWithdrawalExpressTxnParams = useMultichainWithdrawalExpressTxnParams({
    transferRequests,
    paySource,
    gmParams,
    glvParams,
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
            executionFeeTokenAmount: glvParams?.executionFee,
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

            executionFeeTokenAmount: gmParams?.executionFee,
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
    chainId,
    glvParams?.executionFee,
    gmParams?.executionFee,
    executionFeeTokenDecimals,
    glvInfo,
    glvTokenAmount,
    glvTokenUsd,
    isFirstBuy,
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

  const onCreateGlvWithdrawal = useCallback(
    async function onCreateWithdrawal() {
      const metricData = getWithdrawalMetricData();

      if (
        !account ||
        !marketInfo ||
        !marketToken ||
        longTokenAmount === undefined ||
        shortTokenAmount === undefined ||
        !transferRequests ||
        !tokensData ||
        !signer ||
        !glvParams
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
          params: glvParams,
          tokenAmount: glvTokenAmount!,
          fees: technicalFees as SourceChainGlvWithdrawalFees,
        });
      } else if (paySource === "gmxAccount") {
        const expressTxnParams = await multichainWithdrawalExpressTxnParams.promise;
        if (!expressTxnParams) {
          throw new Error("Express txn params are not set");
        }

        promise = createMultichainGlvWithdrawalTxn({
          chainId,
          signer,
          params: glvParams,
          expressTxnParams,
          transferRequests,
          srcChainId,
        });
      } else if (paySource === "settlementChain") {
        promise = createGlvWithdrawalTxn({
          chainId,
          signer,
          params: glvParams,
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
      getWithdrawalMetricData,
      account,
      marketInfo,
      marketToken,
      longTokenAmount,
      shortTokenAmount,
      tokensData,
      signer,
      glvParams,
      paySource,
      chainId,
      srcChainId,
      globalExpressParams,
      transferRequests,
      glvTokenAmount,
      technicalFees,
      multichainWithdrawalExpressTxnParams.promise,
      setPendingTxns,
      setPendingWithdrawal,
      blockTimestampData,
    ]
  );

  const onCreateGmWithdrawal = useCallback(
    async function onCreateWithdrawal() {
      const metricData = getWithdrawalMetricData();

      if (
        !account ||
        !marketInfo ||
        !marketToken ||
        longTokenAmount === undefined ||
        shortTokenAmount === undefined ||
        !transferRequests ||
        !tokensData ||
        !signer ||
        !gmParams
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
        });
      } else if (paySource === "gmxAccount") {
        const expressTxnParams = await multichainWithdrawalExpressTxnParams.promise;
        if (!expressTxnParams) {
          throw new Error("Express txn params are not set");
        }

        promise = createMultichainWithdrawalTxn({
          chainId,
          signer,
          params: gmParams,
          expressTxnParams,
          transferRequests,
          srcChainId,
        });
      } else if (paySource === "settlementChain") {
        promise = createWithdrawalTxn({
          chainId,
          signer,
          marketTokenAmount: marketTokenAmount!,
          executionGasLimit: (technicalFees as ExecutionFee).gasLimit,
          params: gmParams,
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
        .catch(makeTxnErrorMetricsHandler(metricData.metricId));
    },
    [
      getWithdrawalMetricData,
      account,
      marketInfo,
      marketToken,
      longTokenAmount,
      shortTokenAmount,
      transferRequests,
      tokensData,
      signer,
      gmParams,
      paySource,
      chainId,
      srcChainId,
      globalExpressParams,
      technicalFees,
      rawParams,
      marketTokenAmount,
      multichainWithdrawalExpressTxnParams.promise,
      shouldDisableValidation,
      setPendingTxns,
      setPendingWithdrawal,
      blockTimestampData,
    ]
  );

  const onCreateWithdrawal = isGlv ? onCreateGlvWithdrawal : onCreateGmWithdrawal;

  return {
    onCreateWithdrawal,
  };
};
