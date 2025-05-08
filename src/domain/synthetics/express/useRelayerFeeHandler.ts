import { Signer } from "ethers";
import { useEffect, useMemo } from "react";
import { size } from "viem";

import { ARBITRUM } from "config/chains";
import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
import { getSwapDebugSettings } from "config/externalSwaps";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  makeSelectIsExpressTransactionAvailable,
  makeSelectSubaccountForActions,
  selectGasLimits,
  selectGasPaymentToken,
  selectGasPaymentTokenAllowance,
  selectGasPrice,
  selectIsSponsoredCallAvailable,
  selectL1ExpressOrderGasReference,
  selectMarketsInfoData,
  selectRelayerFeeToken,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectExecutionFeeBufferBps,
  selectSetExpressTradingGasTokenSwitched,
  selectSetSettingsWarningDotVisible,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { selectTokenPermits } from "context/SyntheticsStateContext/selectors/tokenPermitsSelectors";
import { makeSelectFindSwapPath } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { convertToUsd, SignedTokenPermit } from "domain/tokens";
import { useChainId } from "lib/chains";
import { estimateGasLimit } from "lib/gas/estimateGasLimit";
import { metrics } from "lib/metrics";
import { getByKey } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { ExpressTxnData } from "lib/transactions";
import { useThrottledAsyncEstimation } from "lib/useThrottledAsyncEstimation";
import useWallet from "lib/wallets/useWallet";
import { getGasPaymentTokens, getRelayerFeeToken } from "sdk/configs/express";
import { MarketsInfoData } from "sdk/types/markets";
import { bigMath } from "sdk/utils/bigmath";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import { applyFactor, BASIS_POINTS_DIVISOR_BIGINT, expandDecimals, USD_DECIMALS } from "sdk/utils/numbers";
import { BatchOrderTxnParams, getTotalExecutionFeeForBatch } from "sdk/utils/orderTransactions";

import { ExpressParams, getRelayerFeeParams, OracleParamsPayload, RelayerFeeParams } from ".";
import { estimateExpressBatchOrderGasLimit, L1ExpressOrderGasReference, useGasLimits } from "../fees";
import { getExpressBatchOrderParams } from "../orders/expressOrderUtils";
import { Subaccount } from "../subaccount";
import { convertToTokenAmount, TokensAllowanceData, TokensData } from "../tokens";
import { FindSwapPath, getSwapAmountsByToValue } from "../trade";

export type ExpressOrdersParamsResult = {
  expressParams: ExpressParams | undefined;
  expressEstimateMethod: "approximate" | "estimateGas" | undefined;
  isLoading: boolean;
};

function getBatchRequiredActions(orderParams: BatchOrderTxnParams | undefined) {
  if (!orderParams) {
    return 0;
  }

  return (
    orderParams.createOrderParams.length + orderParams.updateOrderParams.length + orderParams.cancelOrderParams.length
  );
}

function getIsEmptyBatch(orderParams: BatchOrderTxnParams | undefined) {
  if (!orderParams) {
    return true;
  }

  if (getBatchRequiredActions(orderParams) === 0) {
    return true;
  }

  const hasEmptyOrder = orderParams.createOrderParams.some(
    (o) => o.orderPayload.numbers.sizeDeltaUsd === 0n && o.orderPayload.numbers.initialCollateralDeltaAmount === 0n
  );

  return hasEmptyOrder;
}

export function useExpressOrdersParams({
  orderParams,
  totalExecutionFee,
}: {
  orderParams: BatchOrderTxnParams | undefined;
  totalExecutionFee?: bigint;
}): ExpressOrdersParamsResult {
  const { chainId } = useChainId();

  const requiredActions = getBatchRequiredActions(orderParams);
  const isNativePayment = orderParams?.createOrderParams.some((o) => o.tokenTransfersParams?.isNativePayment) ?? false;
  const isExpressTxnAvailable = useSelector(makeSelectIsExpressTransactionAvailable(isNativePayment));

  const isEnabled = isExpressTxnAvailable && !getIsEmptyBatch(orderParams);

  const { setGasPaymentTokenAddress } = useSettings();
  const tokenPermits = useSelector(selectTokenPermits);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const tokensData = useSelector(selectTokensData);
  const gasPrice = useSelector(selectGasPrice);
  const gasLimits = useSelector(selectGasLimits);
  const setSettingsWarningDotVisible = useSelector(selectSetSettingsWarningDotVisible);
  const setExpressTradingGasTokenSwitched = useSelector(selectSetExpressTradingGasTokenSwitched);

  const executionFeeBufferBps = useSelector(selectExecutionFeeBufferBps);

  const { signer } = useWallet();
  const subaccount = useSelector(makeSelectSubaccountForActions(requiredActions));
  const { provider } = useJsonRpcProvider(chainId);
  const isSponsoredCallAvailable = useSelector(selectIsSponsoredCallAvailable);

  const gasPaymentToken = useSelector(selectGasPaymentToken);
  const relayerFeeToken = useSelector(selectRelayerFeeToken);

  const findSwapPath = useSelector(makeSelectFindSwapPath(gasPaymentToken?.address, relayerFeeToken?.address, true));

  const gasPaymentAllowance = useSelector(selectGasPaymentTokenAllowance);
  const l1Reference = useSelector(selectL1ExpressOrderGasReference);

  const { data: approximateExpressParams } = useThrottledAsyncEstimation(
    async ({ params: [p], skip }) => {
      if (!p.orderParams || !p.isExpressTxnAvailable || getIsEmptyBatch(p.orderParams)) {
        skip(500);
        return undefined;
      }

      const nextApproximateParams = await getApproximateEstimatedExpressParams({
        batchParams: p.orderParams,
        signer: p.signer,
        chainId: p.chainId,
        tokensData: p.tokensData,
        marketsInfoData: p.marketsInfoData,
        subaccount: p.subaccount,
        tokenPermits: p.tokenPermits,
        gasPaymentTokenAddress: p.gasPaymentToken?.address,
        gasPaymentAllowanceData: p.gasPaymentAllowance?.tokensAllowanceData,
        gasPrice: p.gasPrice,
        gasLimits: p.gasLimits,
        l1Reference: p.l1Reference,
        bufferBps: p.executionFeeBufferBps,
        isSponsoredCall: p.isSponsoredCallAvailable,
        totalExecutionFee: p.totalExecutionFee,
        findSwapPath: p.findSwapPath,
      });

      if (!nextApproximateParams) {
        skip(500);
        return undefined;
      }

      return nextApproximateParams;
    },
    [
      {
        isExpressTxnAvailable,
        chainId,
        signer,
        provider,
        orderParams,
        gasPaymentToken,
        gasPaymentAllowance,
        gasPrice,
        gasLimits,
        l1Reference,
        executionFeeBufferBps,
        isSponsoredCallAvailable,
        totalExecutionFee,
        findSwapPath,
        tokenPermits,
        marketsInfoData,
        tokensData,
        subaccount,
      },
    ],
    { throttleMs: 2000, enabled: isEnabled }
  );

  useEffect(
    function switchGasPaymentToken() {
      if (approximateExpressParams?.expressParams?.relayFeeParams?.isOutGasTokenBalance) {
        const anotherGasToken = getGasPaymentTokens(chainId).find((token) => {
          const tokenData = getByKey(tokensData, token);

          const gasPaymentTokenData = getByKey(
            tokensData,
            approximateExpressParams.expressParams!.relayFeeParams.gasPaymentTokenAddress
          );

          const usdValue = convertToUsd(
            approximateExpressParams.expressParams!.relayFeeParams.gasPaymentTokenAmount,
            gasPaymentTokenData?.decimals,
            gasPaymentTokenData?.prices.minPrice
          );

          const requiredTokenAmount = convertToTokenAmount(usdValue, tokenData?.decimals, tokenData?.prices.minPrice)!;
          return (
            tokenData?.address !== approximateExpressParams.expressParams!.relayFeeParams.gasPaymentTokenAddress &&
            tokenData?.balance !== undefined &&
            requiredTokenAmount !== undefined &&
            tokenData.balance > requiredTokenAmount
          );
        });

        if (anotherGasToken) {
          setSettingsWarningDotVisible(true);
          setGasPaymentTokenAddress(anotherGasToken);
          setExpressTradingGasTokenSwitched(true);
        }
      }
    },
    [
      approximateExpressParams?.expressParams,
      chainId,
      setExpressTradingGasTokenSwitched,
      setGasPaymentTokenAddress,
      setSettingsWarningDotVisible,
      tokensData,
    ]
  );

  const { data: asyncExpressParams } = useThrottledAsyncEstimation(
    async ({ params: [p], skip }) => {
      const account = await p.signer?.getAddress();

      if (
        !account ||
        !p.isExpressTxnAvailable ||
        !p.orderParams ||
        getIsEmptyBatch(p.orderParams) ||
        !p.signer ||
        !p.tokensData ||
        !p.marketsInfoData ||
        !p.tokenPermits ||
        !p.approximateExpressParams ||
        !p.provider ||
        p.gasPrice === undefined ||
        !p.gasLimits ||
        !p.relayerFeeToken ||
        !p.gasPaymentToken ||
        !p.gasPaymentAllowance?.tokensAllowanceData
      ) {
        return skip(500);
      }

      const { baseTxnParams } = p.approximateExpressParams;
      const { txnData, totalExecutionFeeAmount } = baseTxnParams;

      const gasLimit = await estimateGasLimit(p.provider, {
        from: GMX_SIMULATION_ORIGIN,
        to: txnData.to,
        data: txnData.callData,
        value: 0n,
      });

      const buffer = bigMath.mulDiv(gasLimit, BigInt(executionFeeBufferBps ?? 0), BASIS_POINTS_DIVISOR_BIGINT);
      const finalGasLimit = gasLimit + buffer;

      let feeAmount: bigint;
      if (isSponsoredCallAvailable) {
        feeAmount = applyFactor(finalGasLimit * p.gasPrice, p.gasLimits.gelatoRelayFeeMultiplierFactor);
      } else {
        feeAmount = await gelatoRelay.getEstimatedFee(BigInt(chainId), p.relayerFeeToken.address, finalGasLimit, false);
      }

      const totalNetworkFeeAmount = feeAmount + totalExecutionFeeAmount;

      const finalSwapAmounts = getSwapAmountsByToValue({
        tokenIn: p.gasPaymentToken,
        tokenOut: p.relayerFeeToken,
        amountOut: totalNetworkFeeAmount,
        isLimit: false,
        uiFeeFactor: 0n,
        findSwapPath: p.findSwapPath,
      });

      const finalRelayFeeSwapParams = getRelayerFeeParams({
        chainId,
        account,
        relayerFeeTokenAmount: feeAmount,
        totalNetworkFeeAmount,
        relayerFeeTokenAddress: p.relayerFeeToken.address,
        gasPaymentTokenAddress: p.gasPaymentToken.address,
        internalSwapAmounts: finalSwapAmounts,
        externalSwapQuote: undefined,
        tokensData: p.tokensData,
        gasPaymentAllowanceData: p.gasPaymentAllowance?.tokensAllowanceData,
        forceExternalSwaps: getSwapDebugSettings()?.forceExternalSwaps ?? false,
      });

      if (!finalRelayFeeSwapParams) {
        return undefined;
      }

      const { relayParamsPayload } = await getExpressBatchOrderParams({
        chainId,
        orderParams: p.orderParams,
        signer: p.signer,
        subaccount: p.subaccount,
        tokenPermits: p.tokenPermits ?? [],
        tokensData: p.tokensData,
        marketsInfoData: p.marketsInfoData,
        relayFeeParams: finalRelayFeeSwapParams,
        emptySignature: true,
      });

      if (!relayParamsPayload) {
        return;
      }

      return {
        subaccount,
        relayParamsPayload,
        relayFeeParams: finalRelayFeeSwapParams,
        isSponsoredCall: isSponsoredCallAvailable,
      };
    },
    [
      {
        chainId,
        isExpressTxnAvailable,
        signer,
        provider,
        approximateExpressParams,
        findSwapPath,
        gasPaymentAllowance,
        gasPaymentToken,
        gasPrice,
        gasLimits,
        marketsInfoData,
        orderParams,
        tokenPermits,
        tokensData,
        relayerFeeToken,
        subaccount,
      },
    ],
    { throttleMs: 2000 }
  );

  return useMemo(() => {
    if (!isEnabled) {
      return {
        expressParams: undefined,
        expressEstimateMethod: undefined,
        isLoading: false,
      };
    }

    if (asyncExpressParams) {
      return {
        expressParams: asyncExpressParams,
        expressEstimateMethod: "estimateGas",
        isLoading: false,
      };
    }

    return {
      expressParams: approximateExpressParams?.expressParams,
      expressEstimateMethod: "approximate",
      isLoading: !approximateExpressParams,
    };
  }, [isEnabled, asyncExpressParams, approximateExpressParams]);
}

type ApproximateExpressTxnParams = {
  expressParams: ExpressParams | undefined;
  baseTxnParams: {
    relayFeeParams: RelayerFeeParams;
    txnData: ExpressTxnData;
    oracleParamsPayload: OracleParamsPayload;
    totalExecutionFeeAmount: bigint;
  };
};

export async function getApproximateEstimatedExpressParams({
  signer,
  chainId,
  batchParams,
  subaccount,
  gasPaymentTokenAddress,
  tokensData,
  marketsInfoData,
  findSwapPath,
  tokenPermits,
  gasPaymentAllowanceData,
  gasPrice,
  gasLimits,
  l1Reference,
  bufferBps,
  isSponsoredCall,
  totalExecutionFee,
}: {
  batchParams: BatchOrderTxnParams;
  signer: Signer | undefined;
  chainId: number;
  tokensData: TokensData | undefined;
  marketsInfoData: MarketsInfoData | undefined;
  subaccount: Subaccount | undefined;
  tokenPermits: SignedTokenPermit[] | undefined;
  gasPaymentTokenAddress: string | undefined;
  findSwapPath: FindSwapPath | undefined;
  gasPaymentAllowanceData: TokensAllowanceData | undefined;
  gasPrice: bigint | undefined;
  gasLimits: ReturnType<typeof useGasLimits>;
  l1Reference: L1ExpressOrderGasReference | undefined;
  bufferBps: number | undefined;
  isSponsoredCall: boolean;
  totalExecutionFee?: bigint;
}): Promise<ApproximateExpressTxnParams | undefined> {
  try {
    const account = await signer?.getAddress();
    const gasPaymentToken = getByKey(tokensData, gasPaymentTokenAddress);
    const relayerFeeToken = getByKey(tokensData, getRelayerFeeToken(chainId).address);

    if (
      !gasPaymentToken ||
      !relayerFeeToken ||
      !findSwapPath ||
      !account ||
      !signer ||
      !tokensData ||
      gasPrice === undefined ||
      !gasPaymentAllowanceData ||
      !gasLimits ||
      !marketsInfoData
    ) {
      return undefined;
    }

    if (totalExecutionFee === undefined) {
      totalExecutionFee = getTotalExecutionFeeForBatch({ batchParams, chainId, tokensData })?.feeTokenAmount;
    }

    if (totalExecutionFee === undefined) {
      return undefined;
    }

    const baseRelayerFeeAmount = convertToTokenAmount(
      expandDecimals(1, USD_DECIMALS),
      relayerFeeToken.decimals,
      relayerFeeToken.prices.maxPrice
    )!;

    let totalNetworkFeeAmount = baseRelayerFeeAmount + totalExecutionFee;

    const swapAmounts = getSwapAmountsByToValue({
      tokenIn: gasPaymentToken,
      tokenOut: relayerFeeToken,
      amountOut: totalNetworkFeeAmount,
      isLimit: false,
      findSwapPath,
      uiFeeFactor: 0n,
    });

    const baseRelayFeeSwapParams = getRelayerFeeParams({
      chainId,
      account,
      relayerFeeTokenAmount: baseRelayerFeeAmount,
      totalNetworkFeeAmount: totalNetworkFeeAmount,
      relayerFeeTokenAddress: relayerFeeToken.address,
      gasPaymentTokenAddress: gasPaymentToken.address,
      internalSwapAmounts: swapAmounts,
      externalSwapQuote: undefined,
      tokensData,
      gasPaymentAllowanceData,
      forceExternalSwaps: getSwapDebugSettings()?.forceExternalSwaps ?? false,
    });

    if (!baseRelayFeeSwapParams) {
      return undefined;
    }

    const { txnData, oracleParamsPayload } = await getExpressBatchOrderParams({
      chainId,
      orderParams: batchParams,
      signer,
      subaccount,
      tokenPermits: tokenPermits ?? [],
      tokensData,
      marketsInfoData,
      relayFeeParams: baseRelayFeeSwapParams,
      emptySignature: true,
    });

    const hasL1Gas = chainId === ARBITRUM;

    if (!baseRelayFeeSwapParams || (hasL1Gas && !l1Reference)) {
      return undefined;
    }

    const gasLimit = estimateExpressBatchOrderGasLimit({
      gasLimits,
      createOrdersCount: batchParams.createOrderParams.length,
      updateOrdersCount: batchParams.updateOrderParams.length,
      cancelOrdersCount: batchParams.cancelOrderParams.length,
      feeSwapsCount: baseRelayFeeSwapParams.feeParams.feeSwapPath.length,
      externalSwapGasLimit: 0n,
      oraclePriceCount: oracleParamsPayload.tokens.length,
      isSubaccount: Boolean(subaccount),
      sizeOfData: BigInt(size(txnData.callData as `0x${string}`)),
      l1Reference,
    });

    const buffer = bigMath.mulDiv(gasLimit, BigInt(bufferBps ?? 0), BASIS_POINTS_DIVISOR_BIGINT);
    const finalGasLimit = gasLimit + buffer;

    let feeAmount: bigint;
    if (isSponsoredCall) {
      feeAmount = applyFactor(finalGasLimit * gasPrice, gasLimits.gelatoRelayFeeMultiplierFactor);
    } else {
      feeAmount = await gelatoRelay.getEstimatedFee(BigInt(chainId), relayerFeeToken.address, finalGasLimit, false);
    }

    totalNetworkFeeAmount = feeAmount + totalExecutionFee;

    const finalSwapAmounts = getSwapAmountsByToValue({
      tokenIn: gasPaymentToken,
      tokenOut: relayerFeeToken,
      amountOut: totalNetworkFeeAmount,
      isLimit: false,
      findSwapPath,
      uiFeeFactor: 0n,
    });

    const finalRelayFeeSwapParams = getRelayerFeeParams({
      chainId,
      account,
      relayerFeeTokenAmount: feeAmount,
      totalNetworkFeeAmount: totalNetworkFeeAmount,
      relayerFeeTokenAddress: relayerFeeToken.address,
      gasPaymentTokenAddress: gasPaymentToken.address,
      internalSwapAmounts: finalSwapAmounts,
      externalSwapQuote: undefined,
      tokensData,
      gasPaymentAllowanceData,
      forceExternalSwaps: getSwapDebugSettings()?.forceExternalSwaps ?? false,
    });

    if (!finalRelayFeeSwapParams) {
      return undefined;
    }

    const { relayParamsPayload } = await getExpressBatchOrderParams({
      chainId,
      orderParams: batchParams,
      signer,
      subaccount,
      tokenPermits: tokenPermits ?? [],
      tokensData,
      marketsInfoData,
      relayFeeParams: finalRelayFeeSwapParams,
      emptySignature: true,
    });

    return {
      expressParams: {
        subaccount,
        relayParamsPayload,
        relayFeeParams: finalRelayFeeSwapParams,
        isSponsoredCall,
      },
      baseTxnParams: {
        relayFeeParams: baseRelayFeeSwapParams,
        txnData,
        oracleParamsPayload,
        totalExecutionFeeAmount: totalExecutionFee,
      },
    };
  } catch (error) {
    metrics.pushError(error, "expressOrders.getApproximateEstimatedExpressParams");
    return undefined;
  }
}
