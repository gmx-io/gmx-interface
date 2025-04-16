import { Signer } from "ethers";
import { useEffect, useMemo, useRef, useState } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  makeSelectSubaccountForActions,
  selectGasPaymentToken,
  selectGasPrice,
  selectMarketsInfoData,
  selectRelayerFeeToken,
  selectSponsoredCallMultiplierFactor,
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
import { getGasPaymentTokens, getRelayerFeeToken } from "sdk/configs/express";
import { convertTokenAddress } from "sdk/configs/tokens";
import { RelayParamsPayload } from "sdk/types/expressTransactions";
import { MarketsInfoData } from "sdk/types/markets";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import { applyFactor, expandDecimals, roundBigIntToDecimals, USD_DECIMALS } from "sdk/utils/numbers";
import { BatchOrderTxnParams, CancelOrderTxnParams, getTotalExecutionFeeForOrders } from "sdk/utils/orderTransactions";

import { useExternalSwapOutputRequest } from "../externalSwaps/useExternalSwapOutputRequest";
import {
  convertToTokenAmount,
  convertToUsd,
  TokenData,
  TokensAllowanceData,
  TokensData,
  useTokensAllowanceData,
} from "../tokens";
import { FindSwapPath, getSwapAmountsByToValue } from "../trade";
import { ExpressTxnData, getExpressBatchOrderParams, getRelayerFeeSwapParams } from "./txns/expressOrderUtils";
import {
  getOracleParamsPayload,
  getOraclePriceParamsForOrders,
  getOraclePriceParamsForRelayFee,
} from "./txns/oracleParamsUtils";
import { Subaccount } from "./txns/subaccountUtils";
import { ExpressParams } from "./txns/universalTxn";

const estimateGasLimit = async (txnData: ExpressTxnData, provider: any): Promise<bigint> => {
  const gasLimit = await provider.estimateGas({
    to: txnData.contractAddress,
    data: txnData.callData,
    from: GMX_SIMULATION_ORIGIN,
    value: 0n,
  });

  return gasLimit;
};

export type ExpressOrdersParamsResult = {
  needGasPaymentTokenApproval: boolean;
  expressParams: ExpressParams | undefined;
};

export function useExpressOrdersParams({
  orderParams,
}: {
  orderParams: BatchOrderTxnParams | undefined;
}): ExpressOrdersParamsResult {
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

  const { setGasPaymentTokenAddress } = useSettings();
  const totalExecutionFee = orderParams ? getTotalExecutionFeeForOrders(orderParams) : undefined;
  const tokenPermits = useSelector(selectTokenPermits);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const tokensData = useSelector(selectTokensData);
  const sponsoredCallMultiplierFactor = useSelector(selectSponsoredCallMultiplierFactor);
  const gasPrice = useSelector(selectGasPrice);
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
    relayerFeeTokenAmount: baseRelayerFeeAmount,
    executionFeeAmount: totalExecutionFee?.totalExecutionFeeAmount ?? 0n,
    relayerFeeToken: relayerFeeToken,
    gasPaymentToken: gasPaymentToken,
    isSubaccount: Boolean(subaccount),
    enabled,
  });

  useEffect(
    function getBaseTxnData() {
      if (!enabled || !baseFeeSwapParams || baseFeeSwapParams.needGasPaymentTokenApproval) {
        return;
      }

      const throttleTime = 1000;
      if (timer.current !== undefined && Date.now() - timer.current < throttleTime) {
        return;
      }
      timer.current = Date.now();

      if (baseFeeSwapParams?.isOutGasTokenBalance) {
        const anotherGasToken = getGasPaymentTokens(chainId).find((token) => {
          const tokenData = getByKey(tokensData, token);
          const gasPaymentTokenData = getByKey(tokensData, baseFeeSwapParams.gasPaymentTokenAddress);

          const usdValue = convertToUsd(
            baseFeeSwapParams.gasPaymentTokenAmount,
            gasPaymentTokenData?.decimals,
            gasPaymentTokenData?.prices.minPrice
          );

          const requiredTokenAmount = convertToTokenAmount(usdValue, tokenData?.decimals, tokenData?.prices.minPrice)!;

          return (
            tokenData?.address !== baseFeeSwapParams.gasPaymentTokenAddress &&
            tokenData?.balance !== undefined &&
            requiredTokenAmount !== undefined &&
            tokenData.balance > requiredTokenAmount
          );
        });

        if (anotherGasToken) {
          setGasPaymentTokenAddress(anotherGasToken);
        }
      }

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
          gasPrice === undefined ||
          !orderParams
        ) {
          return;
        }

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

          const gasLimit = await estimateGasLimit(txnData, provider);
          const buffer = gasLimit / 10n;
          const finalGasLimit = gasLimit + buffer;

          let feeAmount: bigint;

          if (sponsoredCallMultiplierFactor !== undefined) {
            feeAmount = applyFactor(finalGasLimit * gasPrice, sponsoredCallMultiplierFactor);
          } else {
            feeAmount = await gelatoRelay.getEstimatedFee(
              BigInt(chainId),
              relayerFeeToken.address,
              finalGasLimit,
              false
            );
          }

          // TEMP DEBUG
          // eslint-disable-next-line no-console
          console.log("feeAmount", feeAmount);
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
      setGasPaymentTokenAddress,
      gasPrice,
      sponsoredCallMultiplierFactor,
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
      return {
        needGasPaymentTokenApproval: Boolean(baseFeeSwapParams?.needGasPaymentTokenApproval),
        expressParams: undefined,
      };
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
      needGasPaymentTokenApproval: finalRelayFeeSwapParams.needGasPaymentTokenApproval,
      expressParams: {
        subaccount,
        relayParamsPayload,
        relayFeeParams: finalRelayFeeSwapParams,
        needGasPaymentTokenApproval: baseFeeSwapParams.needGasPaymentTokenApproval,
        isSponsoredCall: sponsoredCallMultiplierFactor !== undefined,
      },
    };
  }, [
    orderParams,
    baseFeeSwapParams,
    tokensData,
    marketsInfoData,
    finalRelayFeeSwapParams,
    chainId,
    tokenPermits,
    sponsoredCallMultiplierFactor,
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

  const gasPaymentAllowanceData = useGasPaymentTokenAllowanceData(chainId, gasPaymentToken?.address);

  return useMemo(() => {
    if (
      !account ||
      relayerFeeTokenAmount === undefined ||
      !tokensData ||
      !relayerFeeToken ||
      !gasPaymentToken ||
      totalNetworkFeeAmount === undefined ||
      !gasPaymentAllowanceData
    ) {
      return undefined;
    }

    return getRelayerFeeSwapParams({
      chainId,
      account,
      relayerFeeTokenAmount,
      totalNetworkFeeAmount,
      relayerFeeTokenAddress: relayerFeeToken.address,
      gasPaymentTokenAddress: gasPaymentToken.address,
      internalSwapAmounts,
      externalSwapQuote: externalSwapOutput,
      tokensData,
      gasPaymentAllowanceData: gasPaymentAllowanceData,
    });
  }, [
    account,
    chainId,
    externalSwapOutput,
    gasPaymentToken,
    internalSwapAmounts,
    gasPaymentAllowanceData,
    relayerFeeToken,
    relayerFeeTokenAmount,
    tokensData,
    totalNetworkFeeAmount,
  ]);
}

export function useGasPaymentTokenAllowanceData(chainId: number, gasPaymentTokenAddress: string | undefined) {
  const { tokensAllowanceData, isLoaded: isTokensAllowanceDataLoaded } = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: gasPaymentTokenAddress ? [convertTokenAddress(chainId, gasPaymentTokenAddress, "wrapped")] : [],
  });

  return isTokensAllowanceDataLoaded ? tokensAllowanceData : undefined;
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
  sponsoredCallMultiplierFactor,
  gasPaymentAllowanceData,
  gasPrice,
}: {
  params: CancelOrderTxnParams[];
  signer: Signer | undefined;
  chainId: number;
  tokensData: TokensData | undefined;
  marketsInfoData: MarketsInfoData | undefined;
  subaccount: Subaccount | undefined;
  gasPaymentTokenAddress: string | undefined;
  findSwapPath: FindSwapPath | undefined;
  sponsoredCallMultiplierFactor: bigint | undefined;
  gasPaymentAllowanceData: TokensAllowanceData | undefined;
  gasPrice: bigint | undefined;
}): Promise<ExpressParams | undefined> {
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

    const baseRelayFeeSwapParams = getRelayerFeeSwapParams({
      chainId,
      account,
      relayerFeeTokenAmount: swapAmounts.amountOut,
      totalNetworkFeeAmount: swapAmounts.amountOut,
      relayerFeeTokenAddress: relayerFeeToken.address,
      gasPaymentTokenAddress: gasPaymentToken.address,
      internalSwapAmounts: swapAmounts,
      externalSwapQuote: undefined,
      tokensData,
      gasPaymentAllowanceData,
    });

    if (!baseRelayFeeSwapParams || baseRelayFeeSwapParams.needGasPaymentTokenApproval) {
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
      relayFeeSwapParams: baseRelayFeeSwapParams,
      emptySignature: true,
    });

    const gasLimit = await estimateGasLimit(txnData, signer.provider);
    const buffer = gasLimit / 10n;
    const finalGasLimit = gasLimit + buffer;

    let feeAmount: bigint;

    if (sponsoredCallMultiplierFactor !== undefined) {
      feeAmount = finalGasLimit * gasPrice * sponsoredCallMultiplierFactor;
    } else {
      feeAmount = await gelatoRelay.getEstimatedFee(BigInt(chainId), relayerFeeToken.address, finalGasLimit, false);
    }

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
      totalNetworkFeeAmount: feeAmount,
      relayerFeeTokenAddress: relayerFeeToken.address,
      gasPaymentTokenAddress: gasPaymentToken.address,
      internalSwapAmounts: finalSwapAmounts,
      externalSwapQuote: undefined,
      tokensData,
      gasPaymentAllowanceData,
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
      needGasPaymentTokenApproval:
        baseRelayFeeSwapParams.needGasPaymentTokenApproval || finalRelayFeeSwapParams.needGasPaymentTokenApproval,
      isSponsoredCall: sponsoredCallMultiplierFactor !== undefined,
    };
  } catch (error) {
    const errorData = parseError(error);
    // TEMP DEBUP
    // eslint-disable-next-line no-console
    console.error("cancel order expressParams error", errorData);
    return undefined;
  }
}
