import { useCallback, useState } from "react";

import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExecutionFee } from "domain/synthetics/fees";
import { createDepositTxn, createWithdrawalTxn, GlvInfo, MarketInfo } from "domain/synthetics/markets";
import { createGlvDepositTxn } from "domain/synthetics/markets/createGlvDepositTxn";
import { createGlvWithdrawalTxn } from "domain/synthetics/markets/createGlvWithdrawalTxn";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { usePendingTxns } from "lib/usePendingTxns";
import useWallet from "lib/wallets/useWallet";

import { Operation } from "../types";
import {
  initGLVSwapMetricData,
  initGMSwapMetricData,
  makeTxnErrorMetricsHandler,
  makeTxnSentMetricsHandler,
  sendOrderSubmittedMetric,
  sendTxnValidationErrorMetric,
} from "lib/metrics";
import { helperToast } from "lib/helperToast";
import { t } from "@lingui/macro";

interface Props {
  marketInfo?: MarketInfo;
  glvInfo?: GlvInfo;
  marketToken: TokenData;
  operation: Operation;
  longToken: TokenData | undefined;
  shortToken: TokenData | undefined;

  marketTokenAmount: bigint | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;

  glvTokenAmount: bigint | undefined;

  shouldDisableValidation?: boolean;

  tokensData: TokensData | undefined;
  executionFee: ExecutionFee | undefined;
  selectedMarketForGlv?: string;
  isMarketTokenDeposit?: boolean;
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

  marketTokenAmount,
  shouldDisableValidation,
  tokensData,
  executionFee,
  selectedMarketForGlv,
  glvInfo,
  isMarketTokenDeposit,
}: Props) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const chainId = useSelector(selectChainId);
  const { signer, account } = useWallet();
  const { setPendingDeposit, setPendingWithdrawal } = useSyntheticsEvents();
  const [, setPendingTxns] = usePendingTxns();

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
          setPendingTxns,
          setPendingDeposit,
          isMarketTokenDeposit: isMarketTokenDeposit ?? false,
        })
          .then(makeTxnSentMetricsHandler(metricData.metricId))
          .catch(makeTxnErrorMetricsHandler(metricData.metricId));
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
        setPendingTxns,
        setPendingDeposit,
      })
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId));
    },
    [
      account,
      executionFee,
      longToken,
      longTokenAmount,
      marketInfo,
      marketToken,
      marketTokenAmount,
      shortToken,
      shortTokenAmount,
      signer,
      tokensData,
      shouldDisableValidation,
      chainId,
      setPendingDeposit,
      setPendingTxns,
      selectedMarketForGlv,
      glvInfo,
      isMarketTokenDeposit,
      glvTokenAmount,
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
        setPendingTxns,
        setPendingWithdrawal,
      })
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId));
    },
    [
      account,
      executionFee,
      longToken,
      longTokenAmount,
      marketInfo,
      marketToken,
      marketTokenAmount,
      shortToken,
      shortTokenAmount,
      signer,
      tokensData,
      shouldDisableValidation,
      chainId,
      setPendingWithdrawal,
      setPendingTxns,
      selectedMarketForGlv,
      glvInfo,
      glvTokenAmount,
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
