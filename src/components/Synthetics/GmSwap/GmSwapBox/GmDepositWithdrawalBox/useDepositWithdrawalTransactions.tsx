import { t } from "@lingui/macro";
import { useCallback, useMemo, useState } from "react";
import { zeroAddress } from "viem";

import { getContract } from "config/contracts";
import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectBlockTimestampData,
  selectChainId,
  selectSrcChainId,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useArbitraryRelayParamsAndPayload } from "domain/multichain/arbitraryRelayParams";
import { ExecutionFee } from "domain/synthetics/fees";
import { createDepositTxn, createWithdrawalTxn, GlvInfo, MarketInfo } from "domain/synthetics/markets";
import { createGlvDepositTxn } from "domain/synthetics/markets/createGlvDepositTxn";
import { createGlvWithdrawalTxn } from "domain/synthetics/markets/createGlvWithdrawalTxn";
import { buildAndSignMultichainDepositTxn } from "domain/synthetics/markets/createMultichainDepositTxn";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { helperToast } from "lib/helperToast";
import {
  initGLVSwapMetricData,
  initGMSwapMetricData,
  makeTxnErrorMetricsHandler,
  makeTxnSentMetricsHandler,
  sendOrderSubmittedMetric,
  sendTxnValidationErrorMetric,
} from "lib/metrics";
import { ExpressTxnData, sendExpressTransaction } from "lib/transactions";
import { makeUserAnalyticsOrderFailResultHandler, sendUserAnalyticsOrderConfirmClickEvent } from "lib/userAnalytics";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { getWrappedToken } from "sdk/configs/tokens";
import { nowInSeconds } from "sdk/utils/time";
import { IRelayUtils } from "typechain-types/MultichainGmRouter";

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
  const srcChainId = useSelector(selectSrcChainId);
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const { signer, account } = useWallet();
  const { setPendingDeposit, setPendingWithdrawal } = useSyntheticsEvents();
  const { setPendingTxns } = usePendingTxns();
  const blockTimestampData = useSelector(selectBlockTimestampData);

  const transferRequests = useMemo((): IRelayUtils.TransferRequestsStruct => {
    const requests: IRelayUtils.TransferRequestsStruct = {
      tokens: [],
      receivers: [],
      amounts: [],
    };

    if (longToken && longTokenAmount !== undefined && longTokenAmount > 0n) {
      requests.tokens.push(longToken.address);
      requests.receivers.push(getContract(chainId, "DepositVault"));
      requests.amounts.push(longTokenAmount);
    }

    if (shortToken && shortTokenAmount !== undefined && shortTokenAmount > 0n) {
      requests.tokens.push(shortToken.address);
      requests.receivers.push(getContract(chainId, "DepositVault"));
      requests.amounts.push(shortTokenAmount);
    }

    if (executionFee?.feeTokenAmount !== undefined) {
      requests.tokens.push(getWrappedToken(chainId).address);
      requests.receivers.push(getContract(chainId, "MultichainGmRouter"));
      requests.amounts.push(executionFee.feeTokenAmount);
    }

    return requests;
  }, [chainId, executionFee?.feeTokenAmount, longToken, longTokenAmount, shortToken, shortTokenAmount]);

  const asyncResult = useArbitraryRelayParamsAndPayload({
    isGmxAccount: srcChainId !== undefined,
    expressTransactionBuilder: async ({ relayParams, gasPaymentParams }) => {
      if (!account || !marketInfo || marketTokenAmount === undefined || !srcChainId || !signer || !executionFee) {
        throw new Error("Account is not set");
      }

      const initialLongTokenAddress = longToken?.address || marketInfo.longTokenAddress;
      const initialShortTokenAddress = marketInfo.isSameCollaterals
        ? initialLongTokenAddress
        : shortToken?.address || marketInfo.shortTokenAddress;

      const txnData = await buildAndSignMultichainDepositTxn({
        emptySignature: true,
        account,
        chainId,
        params: {
          addresses: {
            receiver: account,
            callbackContract: zeroAddress,
            uiFeeReceiver: zeroAddress,
            market: marketToken.address,
            initialLongToken: initialLongTokenAddress,
            initialShortToken: initialShortTokenAddress,
            longTokenSwapPath: [],
            shortTokenSwapPath: [],
          },
          callbackGasLimit: 0n,
          dataList: [],
          minMarketTokens: marketTokenAmount,
          shouldUnwrapNativeToken: false,
          executionFee: executionFee.feeTokenAmount,
        },
        srcChainId,
        relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
        relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
        relayParams: {
          ...relayParams,
          deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
        },
        signer,
        transferRequests,
      });

      return {
        txnData,
      };
    },
  });

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

      if (srcChainId !== undefined) {
        if (glvInfo && selectedMarketForGlv) {
          throw new Error("Not implemented");
        }

        if (!globalExpressParams?.relayerFeeTokenAddress) {
          throw new Error("Relayer fee token address is not set");
        }

        if (!asyncResult.data) {
          throw new Error("Async result is not set");
        }

        return buildAndSignMultichainDepositTxn({
          chainId,
          srcChainId,
          signer,
          account,
          relayerFeeAmount: asyncResult.data.gasPaymentParams.relayerFeeAmount,
          relayerFeeTokenAddress: asyncResult.data.gasPaymentParams.relayerFeeTokenAddress,
          relayParams: {
            ...asyncResult.data.relayParamsPayload,
            deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          },
          transferRequests,
          params: {
            addresses: {
              receiver: account,
              callbackContract: zeroAddress,
              uiFeeReceiver: zeroAddress,
              market: marketToken.address,
              initialLongToken: initialLongTokenAddress,
              initialShortToken: initialShortTokenAddress,
              longTokenSwapPath: [],
              shortTokenSwapPath: [],
            },
            callbackGasLimit: 0n,
            dataList: [],
            minMarketTokens: marketTokenAmount,
            shouldUnwrapNativeToken: false,
            executionFee: executionFee.feeTokenAmount,
          },
        })
          .then(async (txnData: ExpressTxnData) => {
            await sendExpressTransaction({
              chainId,
              // TODO MLTCH: pass true when we can
              isSponsoredCall: false,
              txnData,
            });
          })
          .then(makeTxnSentMetricsHandler(metricData.metricId))
          .catch(makeTxnErrorMetricsHandler(metricData.metricId))
          .catch(makeUserAnalyticsOrderFailResultHandler(chainId, metricData.metricId));
      }

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
          executionGasLimit: executionFee.gasLimit,
          skipSimulation: shouldDisableValidation,
          tokensData,
          blockTimestampData,
          isMarketTokenDeposit: isMarketTokenDeposit ?? false,
          isFirstDeposit: glvInfo.glvToken.totalSupply === 0n,
          setPendingTxns,
          setPendingDeposit,
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
        executionGasLimit: executionFee.gasLimit,
        allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
        skipSimulation: shouldDisableValidation,
        tokensData,
        metricId: metricData.metricId,
        blockTimestampData,
        setPendingTxns,
        setPendingDeposit,
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
      srcChainId,
      shouldDisableValidation,
      blockTimestampData,
      setPendingTxns,
      setPendingDeposit,
      globalExpressParams?.relayerFeeTokenAddress,
      asyncResult.data,
      isMarketTokenDeposit,
      transferRequests,
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
          executionGasLimit: executionFee.gasLimit,
          allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
          skipSimulation: shouldDisableValidation,
          tokensData,
          setPendingTxns,
          setPendingWithdrawal,
          selectedGmMarket: selectedMarketForGlv,
          glv: glvInfo.glvTokenAddress,
          blockTimestampData,
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
        executionGasLimit: executionFee.gasLimit,
        allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
        tokensData,
        skipSimulation: shouldDisableValidation,
        setPendingTxns,
        setPendingWithdrawal,
        blockTimestampData,
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
      setPendingTxns,
      setPendingWithdrawal,
      blockTimestampData,
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
