import { useCallback, useState } from "react";

import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  selectBlockTimestampData,
  selectChainId,
  selectGasPriceData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExecutionFee } from "domain/synthetics/fees";
import { createDepositTxn, createWithdrawalTxn, GlvInfo, MarketInfo } from "domain/synthetics/markets";
import { createGlvDepositTxn } from "domain/synthetics/markets/createGlvDepositTxn";
import { createGlvWithdrawalTxn } from "domain/synthetics/markets/createGlvWithdrawalTxn";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { usePendingTxns } from "lib/usePendingTxns";
import useWallet from "lib/wallets/useWallet";

import { t } from "@lingui/macro";
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
import { Operation } from "../types";

interface Props {
  marketInfo?: MarketInfo;
  glvInfo?: GlvInfo;
  marketToken: TokenData;
  operation: Operation;
  longToken: TokenData | undefined;
  shortToken: TokenData | undefined;

  marketTokenAmount: bigint | undefined;
  marketTokenUsd: bigint | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;

  glvTokenAmount: bigint | undefined;
  glvTokenUsd: bigint | undefined;

  shouldDisableValidation?: boolean;

  tokensData: TokensData | undefined;
  executionFee: ExecutionFee | undefined;
  selectedMarketForGlv?: string;
  selectedMarketInfoForGlv?: MarketInfo;
  isMarketTokenDeposit?: boolean;
  isFirstBuy: boolean;
}

export const useDepositWithdrawalTransactions = ({
  marketInfo,
  marketToken,
  operation,
  longToken,
  longTokenAmount,
  shortToken,
  shortTokenAmount,
  glvTokenAmount,
  glvTokenUsd,

  marketTokenAmount,
  marketTokenUsd,
  shouldDisableValidation,
  tokensData,
  executionFee,
  selectedMarketForGlv,
  selectedMarketInfoForGlv,
  glvInfo,
  isMarketTokenDeposit,
  isFirstBuy,
}: Props) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const chainId = useSelector(selectChainId);
  const { signer, account } = useWallet();
  const { setPendingDeposit, setPendingWithdrawal } = useSyntheticsEvents();
  const [, setPendingTxns] = usePendingTxns();
  const blockTimestampData = useSelector(selectBlockTimestampData);
  const gasPriceData = useSelector(selectGasPriceData);

  const onCreateDeposit = useCallback(
    function onCreateDeposit() {
      const metricData =
        glvInfo && selectedMarketForGlv
          ? initGLVSwapMetricData({
              longToken,
              shortToken,
              selectedMarketForGlv,
              isDeposit: true,
              executionFee,
              glvAddress: glvInfo.glvTokenAddress,
              glvToken: glvInfo.glvToken,
              longTokenAmount,
              shortTokenAmount,
              marketTokenAmount,
              glvTokenAmount,
              marketName: selectedMarketInfoForGlv?.name,
              glvTokenUsd: glvTokenUsd,
              isFirstBuy,
            })
          : initGMSwapMetricData({
              longToken,
              shortToken,
              marketToken,
              isDeposit: true,
              executionFee,
              marketInfo,
              longTokenAmount,
              shortTokenAmount,
              marketTokenAmount,
              marketTokenUsd,
              isFirstBuy,
            });

      sendOrderSubmittedMetric(metricData.metricId);

      if (
        !account ||
        !executionFee ||
        !marketToken ||
        !marketInfo ||
        marketTokenAmount === undefined ||
        !tokensData ||
        !signer
      ) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metricData.metricId);
        return Promise.resolve();
      }

      sendUserAnalyticsOrderConfirmClickEvent(chainId, metricData.metricId);

      const initialLongTokenAddress = longToken?.address || marketInfo.longTokenAddress;
      const initialShortTokenAddress = marketInfo.isSameCollaterals
        ? initialLongTokenAddress
        : shortToken?.address || marketInfo.shortTokenAddress;

      if (glvInfo && selectedMarketForGlv) {
        return createGlvDepositTxn(chainId, signer, {
          account,
          initialLongTokenAddress,
          initialShortTokenAddress,
          minMarketTokens: glvTokenAmount ?? 0n,
          glvAddress: glvInfo.glvTokenAddress,
          marketTokenAddress: selectedMarketForGlv,
          longTokenSwapPath: [],
          shortTokenSwapPath: [],
          longTokenAmount: longTokenAmount ?? 0n,
          shortTokenAmount: shortTokenAmount ?? 0n,
          marketTokenAmount: marketTokenAmount ?? 0n,
          allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
          executionFee: executionFee.feeTokenAmount,
          skipSimulation: shouldDisableValidation,
          tokensData,
          blockTimestampData,
          setPendingTxns,
          setPendingDeposit,
          isMarketTokenDeposit: isMarketTokenDeposit ?? false,
          gasPriceData,
        })
          .then(makeTxnSentMetricsHandler(metricData.metricId))
          .catch(makeTxnErrorMetricsHandler(metricData.metricId))
          .catch(makeUserAnalyticsOrderFailResultHandler(chainId, metricData.metricId));
      }

      return createDepositTxn(chainId, signer, {
        account,
        initialLongTokenAddress,
        initialShortTokenAddress,
        longTokenSwapPath: [],
        shortTokenSwapPath: [],
        longTokenAmount: longTokenAmount ?? 0n,
        shortTokenAmount: shortTokenAmount ?? 0n,
        marketTokenAddress: marketToken.address,
        minMarketTokens: marketTokenAmount,
        executionFee: executionFee.feeTokenAmount,
        allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
        skipSimulation: shouldDisableValidation,
        tokensData,
        metricId: metricData.metricId,
        blockTimestampData,
        setPendingTxns,
        setPendingDeposit,
        gasPriceData,
      })
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId))
        .catch(makeUserAnalyticsOrderFailResultHandler(chainId, metricData.metricId));
    },
    [
      glvInfo,
      selectedMarketForGlv,
      longToken,
      shortToken,
      executionFee,
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
      account,
      tokensData,
      signer,
      chainId,
      shouldDisableValidation,
      blockTimestampData,
      setPendingTxns,
      setPendingDeposit,
      gasPriceData,
      isMarketTokenDeposit,
    ]
  );

  const onCreateWithdrawal = useCallback(
    function onCreateWithdrawal() {
      const metricData =
        glvInfo && selectedMarketForGlv
          ? initGLVSwapMetricData({
              longToken,
              shortToken,
              selectedMarketForGlv,
              isDeposit: false,
              executionFee,
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
              longToken,
              shortToken,
              marketToken,
              isDeposit: false,
              executionFee,
              marketInfo,
              longTokenAmount,
              shortTokenAmount,
              marketTokenAmount,
              marketTokenUsd,
              isFirstBuy,
            });

      if (
        !account ||
        !marketInfo ||
        !marketToken ||
        !executionFee ||
        longTokenAmount === undefined ||
        shortTokenAmount === undefined ||
        !tokensData ||
        !signer
      ) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metricData.metricId);
        return Promise.resolve();
      }

      if (glvInfo && selectedMarketForGlv) {
        return createGlvWithdrawalTxn(chainId, signer, {
          account,
          initialLongTokenAddress: longToken?.address || marketInfo.longTokenAddress,
          initialShortTokenAddress: shortToken?.address || marketInfo.shortTokenAddress,
          longTokenSwapPath: [],
          shortTokenSwapPath: [],
          glvTokenAddress: glvInfo.glvTokenAddress,
          glvTokenAmount: glvTokenAmount!,
          minLongTokenAmount: longTokenAmount,
          minShortTokenAmount: shortTokenAmount,
          executionFee: executionFee.feeTokenAmount,
          allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
          skipSimulation: shouldDisableValidation,
          tokensData,
          setPendingTxns,
          setPendingWithdrawal,
          selectedGmMarket: selectedMarketForGlv,
          glv: glvInfo.glvTokenAddress,
          blockTimestampData,
          gasPriceData,
        })
          .then(makeTxnSentMetricsHandler(metricData.metricId))
          .catch(makeTxnErrorMetricsHandler(metricData.metricId));
      }

      return createWithdrawalTxn(chainId, signer, {
        account,
        initialLongTokenAddress: longToken?.address || marketInfo.longTokenAddress,
        initialShortTokenAddress: shortToken?.address || marketInfo.shortTokenAddress,
        longTokenSwapPath: [],
        shortTokenSwapPath: [],
        marketTokenAmount: marketTokenAmount!,
        minLongTokenAmount: longTokenAmount,
        minShortTokenAmount: shortTokenAmount,
        marketTokenAddress: marketToken.address,
        executionFee: executionFee.feeTokenAmount,
        allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
        tokensData,
        skipSimulation: shouldDisableValidation,
        blockTimestampData,
        gasPriceData,
        setPendingTxns,
        setPendingWithdrawal,
      })
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId));
    },
    [
      glvInfo,
      selectedMarketForGlv,
      longToken,
      shortToken,
      executionFee,
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
      account,
      tokensData,
      signer,
      chainId,
      shouldDisableValidation,
      blockTimestampData,
      gasPriceData,
      setPendingTxns,
      setPendingWithdrawal,
    ]
  );

  const onSubmit = useCallback(() => {
    setIsSubmitting(true);

    let txnPromise: Promise<any>;

    if (operation === Operation.Deposit) {
      txnPromise = onCreateDeposit();
    } else if (operation === Operation.Withdrawal) {
      txnPromise = onCreateWithdrawal();
    } else {
      throw new Error("Invalid operation");
    }

    txnPromise
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [operation, onCreateDeposit, onCreateWithdrawal]);

  return {
    onSubmit,
    isSubmitting,
  };
};
