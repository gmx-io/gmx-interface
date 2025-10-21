import { t } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import { SettlementChainId } from "config/chains";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import {
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsMarketInfo,
  selectPoolsDetailsMarketTokenData,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSelectedMarketForGlv,
  selectPoolsDetailsShortTokenAddress,
} from "context/PoolsDetailsContext/PoolsDetailsContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  selectBlockTimestampData,
  selectChainId,
  selectSrcChainId,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getTransferRequests } from "domain/multichain/getTransferRequests";
import { TransferRequests } from "domain/multichain/types";
import {
  CreateDepositParams,
  createDepositTxn,
  CreateGlvDepositParams,
  RawCreateDepositParams,
  RawCreateGlvDepositParams,
} from "domain/synthetics/markets";
import { createGlvDepositTxn } from "domain/synthetics/markets/createGlvDepositTxn";
import { createMultichainDepositTxn } from "domain/synthetics/markets/createMultichainDepositTxn";
import { createMultichainGlvDepositTxn } from "domain/synthetics/markets/createMultichainGlvDepositTxn";
import { createSourceChainDepositTxn } from "domain/synthetics/markets/createSourceChainDepositTxn";
import { createSourceChainGlvDepositTxn } from "domain/synthetics/markets/createSourceChainGlvDepositTxn";
import { SourceChainDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainDepositFees";
import { SourceChainGlvDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvDepositFees";
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
import { getContract } from "sdk/configs/contracts";
import { convertTokenAddress, getWrappedToken } from "sdk/configs/tokens";
import { ExecutionFee } from "sdk/types/fees";

import { selectPoolsDetailsParams } from "./selectPoolsDetailsParams";
import type { UseLpTransactionProps } from "./useLpTransactions";
import { useMultichainDepositExpressTxnParams } from "./useMultichainDepositExpressTxnParams";

export const useDepositTransactions = ({
  longTokenAmount,
  shortTokenAmount,
  glvTokenAmount,
  glvTokenUsd,
  marketTokenAmount,
  marketTokenUsd,
  shouldDisableValidation,
  tokensData,
  technicalFees,
  // selectedMarketForGlv,
  selectedMarketInfoForGlv,
  isFirstBuy,
  // paySource,
}: UseLpTransactionProps): {
  onCreateDeposit: () => Promise<void>;
} => {
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const { signer, account } = useWallet();
  const { setPendingDeposit } = useSyntheticsEvents();
  const { setPendingTxns } = usePendingTxns();
  const blockTimestampData = useSelector(selectBlockTimestampData);

  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);
  const marketInfo = useSelector(selectPoolsDetailsMarketInfo);
  const marketToken = useSelector(selectPoolsDetailsMarketTokenData);
  const longTokenAddress = useSelector(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = useSelector(selectPoolsDetailsShortTokenAddress);
  const paySource = useSelector(selectPoolsDetailsPaySource);
  const selectedMarketForGlv = useSelector(selectPoolsDetailsSelectedMarketForGlv);

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

  const isGlv = glvInfo !== undefined && selectedMarketForGlv !== undefined;

  const transferRequests = useMemo((): TransferRequests => {
    const vaultAddress = isGlv ? getContract(chainId, "GlvVault") : getContract(chainId, "DepositVault");

    if (paySource === "sourceChain") {
      const tokenAddress =
        longTokenAmount !== undefined && longTokenAmount > 0n ? initialLongTokenAddress : initialShortTokenAddress;

      const estimatedReceivedAmount =
        (technicalFees as SourceChainDepositFees | SourceChainGlvDepositFees | undefined)?.txnEstimatedReceivedAmount ??
        0n;

      let amount = longTokenAmount !== undefined && longTokenAmount > 0n ? longTokenAmount : shortTokenAmount!;

      return getTransferRequests([
        {
          to: vaultAddress,
          token: tokenAddress,
          amount: estimatedReceivedAmount ?? amount,
        },
      ]);
    }

    return getTransferRequests([
      {
        to: vaultAddress,
        token: initialLongTokenAddress,
        amount: longTokenAmount,
      },
      {
        to: vaultAddress,
        token: initialShortTokenAddress,
        amount: shortTokenAmount,
      },
    ]);
  }, [
    chainId,
    initialLongTokenAddress,
    initialShortTokenAddress,
    isGlv,
    longTokenAmount,
    paySource,
    shortTokenAmount,
    technicalFees,
  ]);

  const rawParams = useSelector(selectPoolsDetailsParams);

  const tokenAddress = longTokenAmount! > 0n ? longTokenAddress! : shortTokenAddress!;
  const tokenAmount = longTokenAmount! > 0n ? longTokenAmount! : shortTokenAmount!;

  const gmParams = useMemo((): CreateDepositParams | undefined => {
    if (!rawParams || !technicalFees) {
      // console.log("no gm params becayse no", { rawGmParams, technicalFees });

      return undefined;
    }

    const executionFee =
      paySource === "sourceChain"
        ? (technicalFees as SourceChainDepositFees).executionFee
        : (technicalFees as ExecutionFee).feeTokenAmount;

    return {
      ...(rawParams as RawCreateDepositParams),
      executionFee,
    };
  }, [rawParams, technicalFees, paySource]);

  const glvParams = useMemo((): CreateGlvDepositParams | undefined => {
    if (!rawParams || !technicalFees) {
      return undefined;
    }

    const executionFee =
      paySource === "sourceChain"
        ? (technicalFees as SourceChainGlvDepositFees).executionFee
        : (technicalFees as ExecutionFee).feeTokenAmount;

    return {
      ...(rawParams as RawCreateGlvDepositParams),
      executionFee,
    };
  }, [paySource, rawParams, technicalFees]);

  const multichainDepositExpressTxnParams = useMultichainDepositExpressTxnParams({
    transferRequests,
    paySource,
    gmParams,
    glvParams,
  });

  const getDepositMetricData = useCallback(() => {
    if (isGlv) {
      return initGLVSwapMetricData({
        chainId,
        longTokenAddress,
        shortTokenAddress,
        selectedMarketForGlv,
        isDeposit: true,
        executionFeeTokenAmount: glvParams?.executionFee,
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
      executionFeeTokenAmount: gmParams?.executionFee,
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
    glvParams?.executionFee,
    glvTokenAmount,
    glvTokenUsd,
    gmParams?.executionFee,
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

  const onCreateGmDeposit = useCallback(
    async function onCreateGmDeposit() {
      const metricData = getDepositMetricData();

      sendOrderSubmittedMetric(metricData.metricId);

      if (!tokensData || !account || !signer || !rawParams) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metricData.metricId);
        return Promise.resolve();
      }

      sendUserAnalyticsOrderConfirmClickEvent(chainId, metricData.metricId);

      let promise: Promise<void>;

      if (paySource === "sourceChain") {
        if (longTokenAmount! > 0n && shortTokenAmount! > 0n) {
          throw new Error("Pay source sourceChain does not support both long and short token deposits");
        }

        if (!technicalFees) {
          throw new Error("Technical fees are not set");
        }

        const tokenAddress = longTokenAmount! > 0n ? longTokenAddress! : shortTokenAddress!;
        const tokenAmount = longTokenAmount! > 0n ? longTokenAmount! : shortTokenAmount!;

        promise = createSourceChainDepositTxn({
          chainId: chainId as SettlementChainId,
          srcChainId: srcChainId!,
          signer,
          transferRequests,
          params: rawParams as RawCreateDepositParams,
          tokenAddress,
          tokenAmount,
          fees: technicalFees as SourceChainDepositFees,
        });
      } else if (paySource === "gmxAccount") {
        promise = createMultichainDepositTxn({
          chainId,
          srcChainId,
          signer,
          transferRequests,
          asyncExpressTxnResult: multichainDepositExpressTxnParams,
          params: gmParams!,
        });
      } else if (paySource === "settlementChain") {
        promise = createDepositTxn({
          chainId,
          signer,
          blockTimestampData,
          longTokenAmount: longTokenAmount ?? 0n,
          shortTokenAmount: shortTokenAmount ?? 0n,
          executionFee: (technicalFees as ExecutionFee).feeTokenAmount,
          executionGasLimit: (technicalFees as ExecutionFee).gasLimit,
          skipSimulation: shouldDisableValidation,
          tokensData,
          metricId: metricData.metricId,
          params: gmParams!,
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
      getDepositMetricData,
      tokensData,
      account,
      signer,
      rawParams,
      chainId,
      paySource,
      longTokenAmount,
      shortTokenAmount,
      technicalFees,
      longTokenAddress,
      shortTokenAddress,
      srcChainId,
      transferRequests,
      multichainDepositExpressTxnParams,
      gmParams,
      blockTimestampData,
      shouldDisableValidation,
      setPendingTxns,
      setPendingDeposit,
    ]
  );

  // TODO MLTCH make it pretty
  // const tokenAddress = longTokenAmount! > 0n ? longTokenAddress! : shortTokenAddress!;
  // const tokenAmount = longTokenAmount! > 0n ? longTokenAmount! : shortTokenAmount!;

  const onCreateGlvDeposit = useCallback(
    async function onCreateGlvDeposit() {
      const metricData = getDepositMetricData();

      sendOrderSubmittedMetric(metricData.metricId);

      if (
        !account ||
        !marketInfo ||
        marketTokenAmount === undefined ||
        !tokensData ||
        !signer ||
        (isGlv && !rawParams)
      ) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metricData.metricId);
        return Promise.resolve();
      }

      sendUserAnalyticsOrderConfirmClickEvent(chainId, metricData.metricId);

      let promise: Promise<void>;
      if (paySource === "sourceChain") {
        if (longTokenAmount! > 0n && shortTokenAmount! > 0n) {
          throw new Error("Pay source sourceChain does not support both long and short token deposits");
        }

        if (!technicalFees) {
          throw new Error("Technical fees are not set");
        }

        promise = createSourceChainGlvDepositTxn({
          chainId: chainId as SettlementChainId,
          srcChainId: srcChainId!,
          signer,
          transferRequests,
          params: rawParams as RawCreateGlvDepositParams,
          tokenAddress,
          tokenAmount,
          fees: technicalFees as SourceChainGlvDepositFees,
        });
      } else if (paySource === "gmxAccount") {
        const expressTxnParams = await multichainDepositExpressTxnParams.promise;
        if (!expressTxnParams) {
          throw new Error("Express txn params are not set");
        }

        promise = createMultichainGlvDepositTxn({
          chainId,
          srcChainId,
          signer,
          transferRequests,
          expressTxnParams,
          params: glvParams!,
        });
      } else if (paySource === "settlementChain") {
        promise = createGlvDepositTxn({
          chainId,
          signer,
          params: glvParams!,
          longTokenAddress: longTokenAddress!,
          shortTokenAddress: shortTokenAddress!,
          longTokenAmount: longTokenAmount ?? 0n,
          shortTokenAmount: shortTokenAmount ?? 0n,
          marketTokenAmount: marketTokenAmount ?? 0n,
          executionFee: (technicalFees as ExecutionFee).feeTokenAmount,
          executionGasLimit: (technicalFees as ExecutionFee).gasLimit,
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
      getDepositMetricData,
      account,
      marketInfo,
      marketTokenAmount,
      tokensData,
      signer,
      isGlv,
      rawParams,
      chainId,
      paySource,
      longTokenAmount,
      shortTokenAmount,
      technicalFees,
      srcChainId,
      transferRequests,
      tokenAddress,
      tokenAmount,
      multichainDepositExpressTxnParams.promise,
      glvParams,
      longTokenAddress,
      shortTokenAddress,
      shouldDisableValidation,
      blockTimestampData,
      setPendingTxns,
      setPendingDeposit,
    ]
  );

  const onCreateDeposit = isGlv ? onCreateGlvDeposit : onCreateGmDeposit;

  return {
    onCreateDeposit,
  };
};
