import { Signer } from "ethers";
import { useEffect, useMemo, useState } from "react";
import { PublicClient, size } from "viem";
import { usePublicClient } from "wagmi";

import { getIsFlagEnabled } from "config/ab";
import { ARBITRUM } from "config/chains";
import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
import { getSwapDebugSettings } from "config/externalSwaps";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  makeSelectIsExpressTransactionAvailable,
  makeSelectSubaccountForActions,
  selectGasLimits,
  selectGasPaymentToken,
  selectGasPrice,
  selectL1ExpressOrderGasReference,
  selectMarketsInfoData,
  selectRelayerFeeToken,
  selectSponsoredCallMultiplierFactor,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectSourceChainId } from "context/SyntheticsStateContext/selectors/multichainSelectors";
import { selectExecutionFeeBufferBps } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { selectTokenPermits } from "context/SyntheticsStateContext/selectors/tokenPermitsSelectors";
import { makeSelectFindSwapPath } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { SignedTokenPermit } from "domain/tokens";
import { useChainId } from "lib/chains";
import { estimateGasLimit, estimateGasLimitMultichain } from "lib/gas/estimateGasLimit";
import { metrics } from "lib/metrics";
import { getByKey } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { ExpressTxnData } from "lib/transactions";
import useWallet from "lib/wallets/useWallet";
import { UiContractsChain } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import { getGasPaymentTokens, getRelayerFeeToken } from "sdk/configs/express";
import { convertTokenAddress } from "sdk/configs/tokens";
import { MarketsInfoData } from "sdk/types/markets";
import { bigMath } from "sdk/utils/bigmath";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import { applyFactor, BASIS_POINTS_DIVISOR_BIGINT, expandDecimals, USD_DECIMALS } from "sdk/utils/numbers";
import { BatchOrderTxnParams, getTotalExecutionFeeForOrders } from "sdk/utils/orderTransactions";

import { ExpressParams, getRelayerFeeParams, OracleParamsPayload, RelayerFeeParams } from ".";
import { estimateExpressBatchOrderGasLimit, L1ExpressOrderGasReference, useGasLimits } from "../fees";
import { getExpressBatchOrderParams, getMultichainInfoFromSigner } from "../orders/expressOrderUtils";
import { Subaccount } from "../subaccount";
import { convertToTokenAmount, convertToUsd, TokensAllowanceData, TokensData, useTokensAllowanceData } from "../tokens";
import { FindSwapPath, getSwapAmountsByToValue } from "../trade";

export type ExpressOrdersParamsResult = {
  expressParams: ExpressParams | undefined;
  expressEstimateMethod: "approximate" | "estimateGas" | undefined;
};

const APPROXIMATE_THROTTLE_TIME = 2000;
const ASYNC_THROTTLE_TIME = 5000;

export function useExpressOrdersParams({
  orderParams,
  scope,
}: {
  orderParams: BatchOrderTxnParams | undefined;
  scope?: string;
}): ExpressOrdersParamsResult {
  const { chainId } = useChainId();
  const srcChainId = useSelector(selectSourceChainId);

  const requiredActions = orderParams
    ? orderParams?.createOrderParams.length +
      orderParams?.updateOrderParams.length +
      orderParams?.cancelOrderParams.length
    : 0;

  const isNativePayment = orderParams?.createOrderParams.some((o) => o.tokenTransfersParams?.isNativePayment) ?? false;
  const isExpressTxnAvailable = useSelector(makeSelectIsExpressTransactionAvailable(isNativePayment));

  const enabled = useMemo(() => {
    if (requiredActions === 0 || !isExpressTxnAvailable) {
      if (scope === "positionSeller") {
        console.log("useExpressOrdersParams is not enabled", {
          requiredActions,
          isExpressTxnAvailable,
        });
      }
      return false;
    }

    // Don't trigger on empty orders
    if (orderParams?.createOrderParams.length) {
      return orderParams.createOrderParams.every(
        (o) => o.orderPayload.numbers.sizeDeltaUsd !== 0n || o.orderPayload.numbers.initialCollateralDeltaAmount !== 0n
      );
    }

    return true;
  }, [isExpressTxnAvailable, orderParams?.createOrderParams, requiredActions, scope]);

  const { setGasPaymentTokenAddress } = useSettings();
  const tokenPermits = useSelector(selectTokenPermits);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const tokensData = useSelector(selectTokensData);
  const sponsoredCallMultiplierFactor = useSelector(selectSponsoredCallMultiplierFactor);
  const gasPrice = useSelector(selectGasPrice);
  const gasLimits = useSelector(selectGasLimits);

  const executionFeeBufferBps = useSelector(selectExecutionFeeBufferBps);

  const { signer } = useWallet();
  const subaccount = useSelector(makeSelectSubaccountForActions(requiredActions));
  const { provider } = useJsonRpcProvider(chainId);
  const settlementChainClient = usePublicClient({ chainId: chainId });

  const gasPaymentToken = useSelector(selectGasPaymentToken);
  const relayerFeeToken = useSelector(selectRelayerFeeToken);

  const findSwapPath = useSelector(makeSelectFindSwapPath(gasPaymentToken?.address, relayerFeeToken?.address, true));

  const [approximateExpressParams, setApproximateExpressParams] = useState<{
    params: ApproximateExpressTxnParams | undefined;
    lastEstimated: number;
  }>({ params: undefined, lastEstimated: 0 });

  const [asyncExpressParams, setAsyncExpressParams] = useState<{
    params: ExpressParams | undefined;
    lastEstimated: number;
  }>({ params: undefined, lastEstimated: 0 });

  const gasPaymentAllowanceData = useGasPaymentTokenAllowanceData(chainId, gasPaymentToken?.address);
  const l1Reference = useSelector(selectL1ExpressOrderGasReference);
  const isExpressEnabled = useSelector(makeSelectIsExpressTransactionAvailable(false));

  useEffect(
    function getBaseTxnData() {
      async function getFastParams() {
        if (!isExpressEnabled || Date.now() - approximateExpressParams.lastEstimated < APPROXIMATE_THROTTLE_TIME) {
          if (scope === "positionSeller") {
            console.log("getFastParams is not enabled", {
              isExpressEnabled,
              lastEstimated: approximateExpressParams.lastEstimated,
            });
          }
          return;
        }

        if (!enabled || !orderParams) {
          if (scope === "positionSeller") {
            console.log("getFastParams is not enabled", {
              enabled,
              orderParams,
            });
          }

          return;
        }

        if (scope === "positionSeller") {
          console.log("getFastParams is enabled", {
            enabled,
            orderParams,
          });
          // debugger;
        }

        const nextApproximateParams = await getApproximateEstimatedExpressParams({
          batchParams: orderParams,
          signer,
          settlementChainClient,
          chainId,
          tokensData,
          marketsInfoData,
          subaccount,
          tokenPermits,
          gasPaymentTokenAddress: gasPaymentToken?.address,
          findSwapPath,
          sponsoredCallMultiplierFactor,
          gasPaymentAllowanceData,
          gasPrice,
          gasLimits,
          l1Reference,
          bufferBps: executionFeeBufferBps,
        });

        if (!srcChainId) {
          if (nextApproximateParams?.expressParams?.relayFeeParams?.isOutGasTokenBalance) {
            const anotherGasToken = getGasPaymentTokens(chainId).find((token) => {
              const tokenData = getByKey(tokensData, token);
              const gasPaymentTokenData = getByKey(
                tokensData,
                nextApproximateParams.expressParams!.relayFeeParams.gasPaymentTokenAddress
              );

              const usdValue = convertToUsd(
                nextApproximateParams.expressParams!.relayFeeParams.gasPaymentTokenAmount,
                gasPaymentTokenData?.decimals,
                gasPaymentTokenData?.prices.minPrice
              );

              const requiredTokenAmount = convertToTokenAmount(
                usdValue,
                tokenData?.decimals,
                tokenData?.prices.minPrice
              )!;

              return (
                tokenData?.address !== nextApproximateParams.expressParams!.relayFeeParams.gasPaymentTokenAddress &&
                tokenData?.balance !== undefined &&
                requiredTokenAmount !== undefined &&
                tokenData.balance > requiredTokenAmount
              );
            });

            if (anotherGasToken) {
              setGasPaymentTokenAddress(anotherGasToken);
            }
          }
        }

        if (scope === "positionSeller") {
          // nextApproximateParams
          console.log("getFastParams is enabled", {
            nextApproximateParams,
          });
        }

        if (
          approximateExpressParams.lastEstimated === 0 ||
          Date.now() - approximateExpressParams.lastEstimated > APPROXIMATE_THROTTLE_TIME
        ) {
          setApproximateExpressParams({
            params: nextApproximateParams,
            lastEstimated: Date.now(),
          });
        }
      }

      getFastParams();
    },
    [
      approximateExpressParams.lastEstimated,
      chainId,
      enabled,
      executionFeeBufferBps,
      findSwapPath,
      gasLimits,
      gasPaymentAllowanceData,
      gasPaymentToken?.address,
      gasPrice,
      isExpressEnabled,
      l1Reference,
      marketsInfoData,
      orderParams,
      scope,
      setGasPaymentTokenAddress,
      settlementChainClient,
      signer,
      sponsoredCallMultiplierFactor,
      srcChainId,
      subaccount,
      tokenPermits,
      tokensData,
    ]
  );

  useEffect(
    function getAsyncExpressParams() {
      async function getAsyncParams() {
        if (
          getIsFlagEnabled("disableAsyncGasLimit") ||
          !approximateExpressParams.params ||
          !provider ||
          !signer ||
          !relayerFeeToken ||
          !gasPaymentToken ||
          !orderParams ||
          !tokensData ||
          !marketsInfoData ||
          !tokenPermits ||
          !gasPaymentAllowanceData ||
          gasPrice === undefined
        ) {
          if (scope === "positionSeller") {
            console.log("estimateBasTxnData is undefined", {
              approximateExpressParams: !!approximateExpressParams.params,
              provider: !!provider,
              signer: !!signer,
              relayerFeeToken: !!relayerFeeToken,
              gasPaymentToken: !!gasPaymentToken,
              orderParams: !!orderParams,
              tokensData: !!tokensData,
              marketsInfoData: !!marketsInfoData,
              tokenPermits: !!tokenPermits,
              gasPaymentAllowanceData: !!gasPaymentAllowanceData,
              gasPrice: gasPrice !== undefined,
            });
          }
          return;
        }

        if (Date.now() - asyncExpressParams.lastEstimated < ASYNC_THROTTLE_TIME) {
          return;
        }

        const account = await signer?.getAddress();
        const { baseTxnParams } = approximateExpressParams.params;
        const { txnData, totalExecutionFeeAmount } = baseTxnParams;

        // const gasLimit = await estimateGasLimit(provider, {
        //   from: GMX_SIMULATION_ORIGIN,
        //   to: txnData.to,
        //   data: txnData.callData,
        //   value: 0n,
        // });
        let gasLimit: bigint;
        if (srcChainId) {
          gasLimit = await estimateGasLimitMultichain(settlementChainClient!, {
            from: GMX_SIMULATION_ORIGIN,
            to: txnData.to,
            data: txnData.callData,
          });
        } else {
          gasLimit = await estimateGasLimit(provider, {
            from: GMX_SIMULATION_ORIGIN,
            to: txnData.to,
            data: txnData.callData,
            value: 0n,
          });
        }

        const buffer = bigMath.mulDiv(gasLimit, BigInt(executionFeeBufferBps ?? 0), BASIS_POINTS_DIVISOR_BIGINT);
        const finalGasLimit = gasLimit + buffer;

        let feeAmount: bigint;
        let isSponsoredCall = false;
        if (sponsoredCallMultiplierFactor !== undefined) {
          feeAmount = applyFactor(finalGasLimit * gasPrice, sponsoredCallMultiplierFactor);
          isSponsoredCall = true;
        } else {
          feeAmount = await gelatoRelay.getEstimatedFee(BigInt(chainId), relayerFeeToken.address, finalGasLimit, false);
        }

        const totalNetworkFeeAmount = feeAmount + totalExecutionFeeAmount;

        const finalSwapAmounts = getSwapAmountsByToValue({
          tokenIn: gasPaymentToken,
          tokenOut: relayerFeeToken,
          amountOut: totalNetworkFeeAmount,
          isLimit: false,
          uiFeeFactor: 0n,
          findSwapPath,
        });

        const finalRelayFeeSwapParams = getRelayerFeeParams({
          chainId,
          srcChainId,
          account,
          relayerFeeTokenAmount: feeAmount,
          totalNetworkFeeAmount,
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
          orderParams,
          signer,
          settlementChainClient,
          subaccount,
          tokenPermits: tokenPermits ?? [],
          tokensData,
          marketsInfoData,
          relayFeeParams: finalRelayFeeSwapParams,
          emptySignature: true,
        });

        if (!relayParamsPayload) {
          return;
        }

        if (
          asyncExpressParams.lastEstimated === 0 ||
          Date.now() - asyncExpressParams.lastEstimated > ASYNC_THROTTLE_TIME
        ) {
          setAsyncExpressParams({
            params: {
              subaccount,
              relayParamsPayload,
              relayFeeParams: finalRelayFeeSwapParams,
              isSponsoredCall: isSponsoredCall,
            },
            lastEstimated: Date.now(),
          });
        }
      }

      getAsyncParams();
    },
    [
      approximateExpressParams.params,
      asyncExpressParams.lastEstimated,
      chainId,
      executionFeeBufferBps,
      findSwapPath,
      gasPaymentAllowanceData,
      gasPaymentToken,
      gasPrice,
      marketsInfoData,
      orderParams,
      provider,
      relayerFeeToken,
      scope,
      settlementChainClient,
      signer,
      sponsoredCallMultiplierFactor,
      srcChainId,
      subaccount,
      tokenPermits,
      tokensData,
    ]
  );

  return useMemo(() => {
    if (!enabled) {
      return {
        expressParams: undefined,
        expressEstimateMethod: undefined,
      };
    }

    if (asyncExpressParams.params) {
      return {
        expressParams: asyncExpressParams.params,
        expressEstimateMethod: "estimateGas",
      };
    }

    return {
      expressParams: approximateExpressParams.params?.expressParams,
      expressEstimateMethod: "approximate",
    };
  }, [enabled, asyncExpressParams.params, approximateExpressParams.params]);
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
  settlementChainClient,
  chainId,
  batchParams,
  subaccount,
  gasPaymentTokenAddress,
  tokensData,
  marketsInfoData,
  findSwapPath,
  sponsoredCallMultiplierFactor,
  tokenPermits,
  gasPaymentAllowanceData,
  gasPrice,
  gasLimits,
  l1Reference,
  bufferBps,
}: {
  batchParams: BatchOrderTxnParams;
  signer: Signer | undefined;
  settlementChainClient: PublicClient | undefined;
  chainId: UiContractsChain;
  tokensData: TokensData | undefined;
  marketsInfoData: MarketsInfoData | undefined;
  subaccount: Subaccount | undefined;
  tokenPermits: SignedTokenPermit[] | undefined;
  gasPaymentTokenAddress: string | undefined;
  findSwapPath: FindSwapPath | undefined;
  sponsoredCallMultiplierFactor: bigint | undefined;
  gasPaymentAllowanceData: TokensAllowanceData | undefined;
  gasPrice: bigint | undefined;
  gasLimits: ReturnType<typeof useGasLimits>;
  l1Reference: L1ExpressOrderGasReference | undefined;
  bufferBps: number | undefined;
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

    const srcChainId = await getMultichainInfoFromSigner(signer, chainId);
    const totalExecutionFee = getTotalExecutionFeeForOrders(batchParams);

    const baseRelayerFeeAmount = convertToTokenAmount(
      expandDecimals(1, USD_DECIMALS),
      relayerFeeToken.decimals,
      relayerFeeToken.prices.maxPrice
    )!;

    let totalNetworkFeeAmount = baseRelayerFeeAmount + totalExecutionFee.totalExecutionFeeAmount;

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
      srcChainId,
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
      settlementChainClient,
      subaccount,
      tokenPermits: tokenPermits ?? [],
      tokensData,
      marketsInfoData,
      relayFeeParams: baseRelayFeeSwapParams,
      emptySignature: true,
    });

    const hasL1Gas = chainId === ARBITRUM;

    if (!baseRelayFeeSwapParams || baseRelayFeeSwapParams.needGasPaymentTokenApproval || (hasL1Gas && !l1Reference)) {
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
    let isSponsoredCall = false;
    if (sponsoredCallMultiplierFactor !== undefined) {
      feeAmount = applyFactor(finalGasLimit * gasPrice, sponsoredCallMultiplierFactor);
      isSponsoredCall = true;
    } else {
      feeAmount = await gelatoRelay.getEstimatedFee(BigInt(chainId), relayerFeeToken.address, gasLimit, false);
    }

    totalNetworkFeeAmount = feeAmount + totalExecutionFee.totalExecutionFeeAmount;

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
      srcChainId,
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
      settlementChainClient,
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
        totalExecutionFeeAmount: totalExecutionFee.totalExecutionFeeAmount,
      },
    };
  } catch (error) {
    metrics.pushError(error, "expressOrders");
    return undefined;
  }
}

export function useGasPaymentTokenAllowanceData(chainId: number, gasPaymentTokenAddress: string | undefined) {
  const { tokensAllowanceData, isLoaded: isTokensAllowanceDataLoaded } = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: gasPaymentTokenAddress ? [convertTokenAddress(chainId, gasPaymentTokenAddress, "wrapped")] : [],
  });

  return isTokensAllowanceDataLoaded ? tokensAllowanceData : undefined;
}
