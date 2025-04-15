import { Signer } from "ethers";
import throttle from "lodash/throttle";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  makeSelectSubaccountForActions,
  selectGasPaymentToken,
  selectGasPrice,
  selectMarketsInfoData,
  selectRelayerFeeToken,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectSavedAllowedSlippage } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { selectTokenPermits } from "context/SyntheticsStateContext/selectors/tokenPermitsSelectors";
import { makeSelectFindSwapPath } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { parseError } from "lib/errors";
import { getByKey } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import useWallet from "lib/wallets/useWallet";
import { getContract } from "sdk/configs/contracts";
import { GMX_SIMULATION_ORIGIN } from "sdk/configs/dataStore";
import { getRelayerFeeToken } from "sdk/configs/express";
import { RelayParamsPayload } from "sdk/types/expressTransactions";
import { MarketsInfoData } from "sdk/types/markets";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import { expandDecimals, roundBigIntToDecimals, USD_DECIMALS } from "sdk/utils/numbers";
import { BatchOrderTxnParams, CancelOrderTxnParams, getTotalExecutionFeeForOrders } from "sdk/utils/orderTransactions";

import { useExternalSwapOutputRequest } from "../externalSwaps/useExternalSwapOutputRequest";
import { convertToTokenAmount, convertToUsd, TokenData, TokensData } from "../tokens";
import { FindSwapPath, getSwapAmountsByToValue } from "../trade";
import { ExpressTxnData, getExpressBatchOrderParams, getRelayerFeeSwapParams } from "./txns/expressOrderUtils";
import {
  getOracleParamsPayload,
  getOraclePriceParamsForOrders,
  getOraclePriceParamsForRelayFee,
} from "./txns/oracleParamsUtils";
import { Subaccount } from "./txns/subaccountUtils";

const estimateGasLimit = throttle(async (chainId: number, txnData: ExpressTxnData, provider: any) => {
  const gasLimit = await provider.estimateGas({
    to: txnData.contractAddress,
    data: txnData.callData,
    from: GMX_SIMULATION_ORIGIN,
    value: 0n,
  });

  return gasLimit;
}, 10000);

export function useExpressOrdersParams({ orderParams }: { orderParams: BatchOrderTxnParams | undefined }) {
  const { chainId } = useChainId();
  const [relayerFeeTokenAmount, setRelayerFeeTokenAmount] = useState<bigint | undefined>(undefined);

  const requiredActions = orderParams
    ? orderParams?.createOrderParams.length +
      orderParams?.updateOrderParams.length +
      orderParams?.cancelOrderParams.length
    : 0;

  const enabled = useMemo(() => {
    if (requiredActions === 0) {
      return false;
    }

    if (orderParams?.createOrderParams.length) {
      return orderParams.createOrderParams.every(
        (o) => o.orderPayload.numbers.sizeDeltaUsd !== 0n || o.orderPayload.numbers.initialCollateralDeltaAmount !== 0n
      );
    }

    return true;
  }, [orderParams?.createOrderParams, requiredActions]);

  const totalExecutionFee = orderParams ? getTotalExecutionFeeForOrders(orderParams) : undefined;
  const tokenPermits = useSelector(selectTokenPermits);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const tokensData = useSelector(selectTokensData);
  const timer = useRef<number | undefined>(undefined);

  const { signer, account } = useWallet();
  const subaccount = useSelector(makeSelectSubaccountForActions(requiredActions));
  const { provider } = useJsonRpcProvider(chainId);

  const gasPaymentToken = useSelector(selectGasPaymentToken);
  const relayerFeeToken = useSelector(selectRelayerFeeToken);

  const baseRelayerFeeAmount = totalExecutionFee?.totalExecutionFeeAmount ?? 0n;

  const baseFeeSwapParams = useRelayerFeeSwapParams({
    chainId,
    account,
    // Base fee
    relayerFeeTokenAmount: baseRelayerFeeAmount,
    executionFeeAmount: totalExecutionFee?.totalExecutionFeeAmount ?? 0n,
    relayerFeeToken: relayerFeeToken,
    gasPaymentToken: gasPaymentToken,
    isSubaccount: Boolean(subaccount),
    enabled,
  });

  useEffect(
    function getBaseTxnData() {
      if (!enabled) {
        return;
      }

      const throttleTime = 1000;

      async function estimateBasTxnData() {
        if (
          !tokensData ||
          !marketsInfoData ||
          !baseFeeSwapParams ||
          !signer ||
          !totalExecutionFee ||
          !tokenPermits ||
          !relayerFeeToken ||
          !provider ||
          !orderParams
        ) {
          return;
        }

        if (timer.current !== undefined && Date.now() - timer.current < throttleTime) {
          return;
        }

        timer.current = Date.now();

        try {
          const txnData = await getExpressBatchOrderParams({
            chainId,
            orderParams,
            signer,
            subaccount,
            tokenPermits,
            tokensData,
            marketsInfoData,
            relayFeeSwapParams: baseFeeSwapParams,
            emptySignature: true,
          });

          // TEMP DEBUP
          // eslint-disable-next-line no-console
          console.log("txnData", txnData);

          const gasLimit = await estimateGasLimit(chainId, txnData, provider);
          const buffer = gasLimit / 10n;

          const feeAmount = await gelatoRelay.getEstimatedFee(
            BigInt(chainId),
            relayerFeeToken.address,
            gasLimit + buffer,
            false
          );

          // TEMP DEBUP
          // eslint-disable-next-line no-console
          console.log("gasLimit", gasLimit);
          setRelayerFeeTokenAmount(feeAmount);
        } catch (error) {
          const errorData = parseError(error);
          // TEMP DEBUP
          // eslint-disable-next-line no-console
          console.error("gasLimit error", errorData);
          throw error;
        }
      }

      estimateBasTxnData();
    },
    [
      tokensData,
      marketsInfoData,
      baseFeeSwapParams,
      chainId,
      orderParams,
      signer,
      subaccount,
      tokenPermits,
      provider,
      relayerFeeToken,
      totalExecutionFee,
      enabled,
    ]
  );

  const finalRelayFeeSwapParams = useRelayerFeeSwapParams({
    chainId,
    account,
    relayerFeeTokenAmount,
    executionFeeAmount: totalExecutionFee?.totalExecutionFeeAmount,
    relayerFeeToken: relayerFeeToken,
    gasPaymentToken: gasPaymentToken,
    isSubaccount: Boolean(subaccount),
    enabled,
  });

  return useMemo(() => {
    if (!orderParams || !baseFeeSwapParams || !tokensData || !marketsInfoData || !finalRelayFeeSwapParams) {
      return undefined;
    }

    const feeOracleParams = getOraclePriceParamsForRelayFee({
      chainId,
      relayFeeParams: finalRelayFeeSwapParams,
      tokensData,
      marketsInfoData,
    });

    const ordersOracleParams = getOraclePriceParamsForOrders({
      chainId,
      createOrderParams: orderParams.createOrderParams,
      marketsInfoData,
      tokensData,
    });

    const oracleParamsPayload = getOracleParamsPayload([...feeOracleParams, ...ordersOracleParams]);

    const relayParamsPayload: Omit<RelayParamsPayload, "deadline" | "userNonce"> = {
      oracleParams: oracleParamsPayload,
      tokenPermits: tokenPermits ?? [],
      externalCalls: finalRelayFeeSwapParams.externalCalls,
      fee: finalRelayFeeSwapParams.feeParams,
    };

    return {
      subaccount,
      relayParamsPayload,
      relayFeeParams: finalRelayFeeSwapParams,
    };
  }, [
    orderParams,
    baseFeeSwapParams,
    tokensData,
    marketsInfoData,
    finalRelayFeeSwapParams,
    chainId,
    tokenPermits,
    subaccount,
  ]);
}

function useRelayerFeeSwapParams({
  chainId,
  account,
  relayerFeeTokenAmount,
  executionFeeAmount,
  relayerFeeToken,
  gasPaymentToken,
  isSubaccount,
  enabled,
}: {
  chainId: number;
  account: string | undefined;
  relayerFeeTokenAmount: bigint | undefined;
  executionFeeAmount: bigint | undefined;
  relayerFeeToken: TokenData | undefined;
  gasPaymentToken: TokenData | undefined;
  isSubaccount: boolean;
  enabled: boolean;
}) {
  const tokensData = useSelector(selectTokensData);
  const slippage = useSelector(selectSavedAllowedSlippage);
  const gasPrice = useSelector(selectGasPrice);

  const findSwapPath = useSelector(makeSelectFindSwapPath(gasPaymentToken?.address, relayerFeeToken?.address, true));

  const totalNetworkFeeAmount =
    relayerFeeTokenAmount !== undefined && executionFeeAmount !== undefined
      ? relayerFeeTokenAmount + executionFeeAmount
      : undefined;

  const internalSwapAmounts = useMemo(() => {
    if (!findSwapPath || !gasPaymentToken || !relayerFeeToken || totalNetworkFeeAmount === undefined || !enabled) {
      return undefined;
    }

    return getSwapAmountsByToValue({
      tokenIn: gasPaymentToken,
      tokenOut: relayerFeeToken,
      amountOut: totalNetworkFeeAmount,
      isLimit: false,
      findSwapPath,
      uiFeeFactor: 0n,
    });
  }, [enabled, findSwapPath, gasPaymentToken, relayerFeeToken, totalNetworkFeeAmount]);

  const approximateGasPaymentTokenAmountForExternalSwap = useMemo(() => {
    if (!gasPaymentToken || !relayerFeeToken || totalNetworkFeeAmount === undefined || !enabled) {
      return undefined;
    }

    const relayerFeeUsd = convertToUsd(
      totalNetworkFeeAmount,
      relayerFeeToken.decimals,
      relayerFeeToken.prices.maxPrice
    );

    let gasPaymentTokenAmount = convertToTokenAmount(
      relayerFeeUsd,
      gasPaymentToken.decimals,
      gasPaymentToken.prices.minPrice
    );

    if (gasPaymentTokenAmount === undefined || !gasPaymentToken) {
      return undefined;
    }

    // avoid re-fetch on small changes
    return roundBigIntToDecimals(gasPaymentTokenAmount, gasPaymentToken.decimals, 2);
  }, [enabled, gasPaymentToken, relayerFeeToken, totalNetworkFeeAmount]);

  const { externalSwapOutput } = useExternalSwapOutputRequest({
    chainId,
    tokensData,
    slippage,
    gasPrice,
    tokenInAddress: gasPaymentToken?.address,
    tokenOutAddress: relayerFeeToken?.address,
    amountIn: approximateGasPaymentTokenAmountForExternalSwap,
    receiverAddress: getContract(chainId, isSubaccount ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"),
    enabled: false,
  });

  return useMemo(() => {
    if (!account || relayerFeeTokenAmount === undefined) {
      return undefined;
    }

    return getRelayerFeeSwapParams({
      chainId,
      account,
      relayerFeeTokenAmount,
      internalSwapAmounts,
      externalSwapQuote: externalSwapOutput,
    });
  }, [account, chainId, externalSwapOutput, internalSwapAmounts, relayerFeeTokenAmount]);
}

export async function getExpressCancelOrdersParams({
  signer,
  chainId,
  params,
  subaccount,
  gasPaymentTokenAddress,
  tokensData,
  marketsInfoData,
  findSwapPath,
}: {
  params: CancelOrderTxnParams[];
  signer: Signer | undefined;
  chainId: number;
  tokensData: TokensData | undefined;
  marketsInfoData: MarketsInfoData | undefined;
  subaccount: Subaccount | undefined;
  gasPaymentTokenAddress: string | undefined;
  findSwapPath: FindSwapPath | undefined;
}) {
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
      !marketsInfoData
    ) {
      return undefined;
    }

    const baseRelayerFeeAmount = convertToTokenAmount(
      expandDecimals(1, USD_DECIMALS),
      relayerFeeToken.decimals,
      relayerFeeToken.prices.maxPrice
    )!;

    const swapAmounts = getSwapAmountsByToValue({
      tokenIn: gasPaymentToken,
      tokenOut: relayerFeeToken,
      amountOut: baseRelayerFeeAmount,
      isLimit: false,
      findSwapPath,
      uiFeeFactor: 0n,
    });

    const relayFeeSwapParams = getRelayerFeeSwapParams({
      chainId,
      account,
      relayerFeeTokenAmount: swapAmounts.amountOut,
      internalSwapAmounts: swapAmounts,
      externalSwapQuote: undefined,
    });

    if (!relayFeeSwapParams) {
      return undefined;
    }

    const txnData = await getExpressBatchOrderParams({
      chainId,
      orderParams: {
        createOrderParams: [],
        updateOrderParams: [],
        cancelOrderParams: params,
      },
      signer,
      subaccount,
      tokenPermits: [],
      tokensData,
      marketsInfoData,
      relayFeeSwapParams,
      emptySignature: true,
    });

    const gasLimit = await estimateGasLimit(chainId, txnData, signer.provider);
    const buffer = gasLimit / 10n;

    const feeAmount = await gelatoRelay.getEstimatedFee(
      BigInt(chainId),
      relayerFeeToken.address,
      gasLimit + buffer,
      false
    );

    const finalSwapAmounts = getSwapAmountsByToValue({
      tokenIn: gasPaymentToken,
      tokenOut: relayerFeeToken,
      amountOut: feeAmount,
      isLimit: false,
      findSwapPath,
      uiFeeFactor: 0n,
    });

    const finalRelayFeeSwapParams = getRelayerFeeSwapParams({
      chainId,
      account,
      relayerFeeTokenAmount: feeAmount,
      internalSwapAmounts: finalSwapAmounts,
      externalSwapQuote: undefined,
    });

    if (!finalRelayFeeSwapParams) {
      return undefined;
    }

    const feeOracleParams = getOraclePriceParamsForRelayFee({
      chainId,
      relayFeeParams: finalRelayFeeSwapParams,
      tokensData,
      marketsInfoData,
    });

    const oracleParamsPayload = getOracleParamsPayload(feeOracleParams);

    const relayParamsPayload: Omit<RelayParamsPayload, "deadline" | "userNonce"> = {
      oracleParams: oracleParamsPayload,
      tokenPermits: [],
      externalCalls: finalRelayFeeSwapParams.externalCalls,
      fee: finalRelayFeeSwapParams.feeParams,
    };

    return {
      subaccount,
      relayParamsPayload,
      relayFeeParams: finalRelayFeeSwapParams,
    };
  } catch (error) {
    const errorData = parseError(error);
    // TEMP DEBUP
    // eslint-disable-next-line no-console
    console.error("cancel order expressParams error", errorData);
    return undefined;
  }
}
