import { t } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import { SettlementChainId } from "config/chains";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import {
  selectPoolsDetailsFlags,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsMarketInfo,
  selectPoolsDetailsMarketTokenData,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSelectedMarketForGlv,
  selectPoolsDetailsShortTokenAddress,
} from "context/PoolsDetailsContext/selectors";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  selectBlockTimestampData,
  selectChainId,
  selectSrcChainId,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getTransferRequests } from "domain/multichain/getTransferRequests";
import { GlvBuyTask, GmBuyTask } from "domain/multichain/progress/GmOrGlvBuyProgress";
import { toastCustomOrStargateError } from "domain/multichain/toastCustomOrStargateError";
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
import { getGlvToken, getGmToken } from "sdk/utils/tokens";
import { applySlippageToMinOut } from "sdk/utils/trade";

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
  const { isDeposit } = useSelector(selectPoolsDetailsFlags);

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

  const transferRequests = useMemo((): TransferRequests | undefined => {
    if (!isDeposit) {
      return undefined;
    }

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
          amount: applySlippageToMinOut(1, estimatedReceivedAmount ?? amount),
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
    isDeposit,
    isGlv,
    longTokenAmount,
    paySource,
    shortTokenAmount,
    technicalFees,
  ]);

  const rawParams = useSelector(selectPoolsDetailsParams);

  const tokenAddress = longTokenAmount! > 0n ? longTokenAddress! : shortTokenAddress!;
  const tokenAmount = longTokenAmount! > 0n ? longTokenAmount! : shortTokenAmount!;

  const params = useMemo((): CreateDepositParams | CreateGlvDepositParams | undefined => {
    if (!rawParams || !technicalFees || !isDeposit) {
      return undefined;
    }

    const executionFee =
      paySource === "sourceChain"
        ? (technicalFees as SourceChainDepositFees | SourceChainGlvDepositFees).executionFee
        : (technicalFees as ExecutionFee).feeTokenAmount;

    return {
      ...(rawParams as RawCreateDepositParams),
      executionFee,
    };
  }, [rawParams, technicalFees, isDeposit, paySource]);

  const multichainDepositExpressTxnParams = useMultichainDepositExpressTxnParams({
    transferRequests,
    paySource,
    params,
    isGlv,
    isDeposit,
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
    async function onCreateGmDeposit() {
      if (!isDeposit) {
        return Promise.reject();
      }

      const metricData = getDepositMetricData();

      sendOrderSubmittedMetric(metricData.metricId);

      if (!tokensData || !account || !signer || !rawParams || !transferRequests) {
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

        let tokenAddress = longTokenAmount! > 0n ? longTokenAddress! : shortTokenAddress!;
        tokenAddress = convertTokenAddress(chainId, tokenAddress, "native");
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
        })
          .then((res) => {
            if (res.transactionHash) {
              setMultichainTransferProgress(
                new GmBuyTask(
                  srcChainId!,
                  res.transactionHash,
                  getGmToken(chainId, (rawParams as RawCreateDepositParams).addresses.market),
                  tokenAmount
                )
              );
            }
          })
          .catch((error) => {
            throw toastCustomOrStargateError(chainId, error);
          });
      } else if (paySource === "gmxAccount") {
        promise = createMultichainDepositTxn({
          chainId,
          srcChainId,
          signer,
          transferRequests,
          asyncExpressTxnResult: multichainDepositExpressTxnParams,
          params: params as CreateDepositParams,
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
      account,
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
      multichainDepositExpressTxnParams,
      params,
      blockTimestampData,
      shouldDisableValidation,
      setPendingTxns,
      setPendingDeposit,
    ]
  );

  const onCreateGlvDeposit = useCallback(
    async function onCreateGlvDeposit() {
      if (!isDeposit) {
        return Promise.reject();
      }

      const metricData = getDepositMetricData();

      sendOrderSubmittedMetric(metricData.metricId);

      if (
        !account ||
        !marketInfo ||
        marketTokenAmount === undefined ||
        !tokensData ||
        !signer ||
        (isGlv && !rawParams) ||
        !transferRequests
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
        })
          .then((res) => {
            if (res.transactionHash) {
              setMultichainTransferProgress(
                new GlvBuyTask(
                  srcChainId!,
                  res.transactionHash,
                  getGlvToken(chainId, (rawParams as RawCreateGlvDepositParams).addresses.glv),
                  tokenAmount
                )
              );
            }
          })
          .catch((error) => {
            throw toastCustomOrStargateError(chainId, error);
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
          params: params as CreateGlvDepositParams,
        });
      } else if (paySource === "settlementChain") {
        promise = createGlvDepositTxn({
          chainId,
          signer,
          params: params as CreateGlvDepositParams,
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
      isDeposit,
      getDepositMetricData,
      account,
      marketInfo,
      marketTokenAmount,
      tokensData,
      signer,
      isGlv,
      rawParams,
      transferRequests,
      chainId,
      paySource,
      longTokenAmount,
      shortTokenAmount,
      technicalFees,
      srcChainId,
      tokenAddress,
      tokenAmount,
      setMultichainTransferProgress,
      multichainDepositExpressTxnParams.promise,
      params,
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
