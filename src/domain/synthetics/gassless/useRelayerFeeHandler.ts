import { GelatoRelay } from "@gelatonetwork/relay-sdk";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { selectGasPrice, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxAllowedSlippage,
  selectTradeboxExecutionFee,
  selectTradeboxFindSwapPath,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import { useEffect, useMemo } from "react";
import { getWrappedToken } from "sdk/configs/tokens";
import useSWR from "swr";
import { useExternalSwapOutputRequest } from "../externalSwaps/useExternalSwapOutputRequest";
import { convertToTokenAmount, convertToUsd } from "../tokens";
import { getSwapAmountsByToValue } from "../trade";
import { getContract } from "sdk/configs/contracts";
import { RelayerFeeState } from "./types";
import {
  selectRelayerFeeState,
  selectSetRelayerFeeState,
} from "context/SyntheticsStateContext/selectors/relayserFeeSelectors";

const DEFAULT_GAS_LIMIT = 10000000n;
const relay = new GelatoRelay();

export function useRelayerFeeHandler(): RelayerFeeState | undefined {
  const { chainId } = useChainId();
  const tokensData = useSelector(selectTokensData);
  const findSwapPath = useSelector(selectTradeboxFindSwapPath);
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

  const gasPaymentTokenData = getByKey(tokensData, gasPaymentTokenAddress);
  const relayerFeeTokenData = getByKey(tokensData, relayerFeeToken?.address);

  const { data: relayerFeeAmount } = useSWR(
    isExpressOrdersEnabled ? ["relayerFee", chainId, relayerFeeToken?.address] : null,
    async () => {
      if (!relayerFeeToken) {
        return undefined;
      }

      const feeAmount = await relay.getEstimatedFee(BigInt(chainId), relayerFeeToken.address, DEFAULT_GAS_LIMIT, false);

      return feeAmount;
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
      !totalNetworkFeeAmount ||
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
  const tokenInAmount = convertToTokenAmount(
    feeUsd,
    gasPaymentTokenData?.decimals,
    gasPaymentTokenData?.prices.minPrice
  );

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
      internalSwapAmounts?.usdOut &&
      externalSwapOutput.usdOut > internalSwapAmounts.usdOut
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
    internalSwapAmounts?.amountIn,
    internalSwapAmounts?.swapPathStats,
    internalSwapAmounts?.usdOut,
    isExpressOrdersEnabled,
    relayerFeeAmount,
    relayerFeeToken?.address,
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
