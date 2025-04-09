import { useEffect, useMemo } from "react";
import useSWR from "swr";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { selectGasPrice, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectRelayerFeeState,
  selectSetRelayerFeeState,
} from "context/SyntheticsStateContext/selectors/relayserFeeSelectors";
import {
  selectTradeboxAllowedSlippage,
  selectTradeboxExecutionFee,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { makeSelectFindSwapPath } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import { getContract } from "sdk/configs/contracts";
import { getWrappedToken } from "sdk/configs/tokens";
import { gelatoRelay } from "sdk/utils/gelatoRelay";

import { useExternalSwapOutputRequest } from "../externalSwaps/useExternalSwapOutputRequest";
import { convertToTokenAmount, convertToUsd } from "../tokens";
import { getSwapAmountsByToValue } from "../trade";
import { RelayerFeeState } from "./types";
import { getSwapDebugSettings } from "config/externalSwaps";

const DEFAULT_GAS_LIMIT = 10000000n;

function roundBigIntToDecimals(value: bigint, tokenDecimals: number, roundToDecimals: number): bigint {
  const excessDecimals = tokenDecimals - roundToDecimals;
  const divisor = BigInt(10 ** excessDecimals);
  const scaledValue = value / divisor;
  const remainder = scaledValue % 10n;
  const roundedValue = remainder >= 5n ? scaledValue + 10n - remainder : scaledValue - remainder;
  return roundedValue * divisor;
}

export function useRelayerFeeHandler(): RelayerFeeState | undefined {
  const { chainId } = useChainId();
  const tokensData = useSelector(selectTokensData);
  const relayerFeeToken = getWrappedToken(chainId);
  const executionFee = useSelector(selectTradeboxExecutionFee);
  const gasPrice = useSelector(selectGasPrice);
  const slippage = useSelector(selectTradeboxAllowedSlippage);
  const storedRelayerFeeState = useSelector(selectRelayerFeeState);
  const setRelayerFeeState = useSelector(selectSetRelayerFeeState);
  const settings = useSettings();
  const isExpressOrdersEnabled = settings.expressOrdersEnabled;
  const gasPaymentTokenAddress = settings.gasPaymentTokenAddress;
  const is1ctEnabled = settings.oneClickTradingEnabled;

  const findSwapPath = useSelector(makeSelectFindSwapPath(gasPaymentTokenAddress, relayerFeeToken.address));

  const gasPaymentTokenData = getByKey(tokensData, gasPaymentTokenAddress);
  const relayerFeeTokenData = getByKey(tokensData, relayerFeeToken?.address);

  const { data: relayerFeeAmount } = useSWR(
    isExpressOrdersEnabled ? ["relayerFee", chainId, relayerFeeToken?.address] : null,
    async () => {
      if (!relayerFeeToken || !executionFee) {
        return undefined;
      }

      try {
        const feeAmount = await gelatoRelay.getEstimatedFee(
          BigInt(chainId),
          relayerFeeToken.address,
          executionFee.gasLimit,
          false
        );

        return feeAmount;
      } catch (error) {
        // TODO: metrics
        // console.error("relayerFeeAmount error", error);
        return undefined;
      }
    }
  );

  const totalNetworkFeeAmount = useMemo(() => {
    if (!executionFee || relayerFeeAmount === undefined) {
      return undefined;
    }

    return executionFee.feeTokenAmount + relayerFeeAmount;
  }, [executionFee, relayerFeeAmount]);

  const internalSwapAmounts = useMemo(() => {
    if (
      !isExpressOrdersEnabled ||
      totalNetworkFeeAmount === undefined ||
      !gasPaymentTokenData ||
      !relayerFeeTokenData ||
      !findSwapPath
    ) {
      return undefined;
    }

    return getSwapAmountsByToValue({
      tokenIn: gasPaymentTokenData,
      tokenOut: relayerFeeTokenData,
      amountOut: totalNetworkFeeAmount,
      isLimit: false,
      findSwapPath,
      uiFeeFactor: 0n,
    });
  }, [isExpressOrdersEnabled, totalNetworkFeeAmount, gasPaymentTokenData, relayerFeeTokenData, findSwapPath]);

  const feeUsd = convertToUsd(totalNetworkFeeAmount, relayerFeeToken.decimals, relayerFeeTokenData?.prices.maxPrice);

  let tokenInAmount = convertToTokenAmount(feeUsd, gasPaymentTokenData?.decimals, gasPaymentTokenData?.prices.minPrice);
  tokenInAmount =
    tokenInAmount !== undefined && gasPaymentTokenData
      ? roundBigIntToDecimals(tokenInAmount, gasPaymentTokenData?.decimals, 2)
      : undefined;

  const { externalSwapOutput } = useExternalSwapOutputRequest({
    tokenInAddress: gasPaymentTokenAddress,
    tokenOutAddress: relayerFeeToken?.address,
    amountIn: tokenInAmount,
    chainId,
    tokensData,
    receiverAddress: getContract(chainId, is1ctEnabled ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"),
    slippage,
    gasPrice,
    enabled: isExpressOrdersEnabled,
  });

  const relayerFeeState = useMemo(() => {
    if (
      !isExpressOrdersEnabled ||
      relayerFeeAmount === undefined ||
      executionFee?.feeTokenAmount === undefined ||
      totalNetworkFeeAmount === undefined
    ) {
      return undefined;
    }

    const relayerFeeeState: RelayerFeeState = {
      gasPaymentTokenAddress,
      relayerFeeTokenAddress: relayerFeeToken?.address,
      relayerFeeAmount,
      executionFeeAmount: executionFee?.feeTokenAmount,
      totalNetworkFeeAmount,
      gasPaymentTokenAmount: 0n,
      internalSwapStats: undefined,
      externalSwapOutput: undefined,
    };

    if (
      externalSwapOutput?.usdOut &&
      (getSwapDebugSettings()?.forceExternalSwaps ||
        internalSwapAmounts?.usdOut === undefined ||
        externalSwapOutput.usdOut > internalSwapAmounts.usdOut)
    ) {
      relayerFeeeState.externalSwapOutput = externalSwapOutput;
      relayerFeeeState.gasPaymentTokenAmount = externalSwapOutput.amountIn;
    } else if (internalSwapAmounts?.swapPathStats) {
      relayerFeeeState.internalSwapStats = internalSwapAmounts.swapPathStats;
      relayerFeeeState.gasPaymentTokenAmount = internalSwapAmounts.amountIn;
    }

    if (!relayerFeeeState.externalSwapOutput && !relayerFeeeState.internalSwapStats) {
      return undefined;
    }

    return relayerFeeeState;
  }, [
    executionFee?.feeTokenAmount,
    externalSwapOutput,
    gasPaymentTokenAddress,
    internalSwapAmounts,
    isExpressOrdersEnabled,
    relayerFeeAmount,
    relayerFeeToken,
    totalNetworkFeeAmount,
  ]);

  useEffect(() => {
    if (
      storedRelayerFeeState?.totalNetworkFeeAmount !== relayerFeeState?.totalNetworkFeeAmount ||
      storedRelayerFeeState?.internalSwapStats?.usdOut !== relayerFeeState?.internalSwapStats?.usdOut ||
      storedRelayerFeeState?.externalSwapOutput?.usdOut !== relayerFeeState?.externalSwapOutput?.usdOut
    ) {
      setRelayerFeeState(relayerFeeState);
    }
  }, [
    relayerFeeState,
    setRelayerFeeState,
    storedRelayerFeeState?.externalSwapOutput?.usdOut,
    storedRelayerFeeState?.internalSwapStats?.usdOut,
    storedRelayerFeeState?.totalNetworkFeeAmount,
  ]);

  return relayerFeeState;
}
