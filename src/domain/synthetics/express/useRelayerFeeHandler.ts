import { Provider, Signer } from "ethers";
import { useEffect, useMemo, useRef, useState } from "react";
import { Address, Hex, PublicClient } from "viem";
import { usePublicClient } from "wagmi";

import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
import { getSwapDebugSettings } from "config/externalSwaps";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  makeSelectIsExpressTransactionAvailable,
  makeSelectSubaccountForActions,
  selectGasLimits,
  selectGasPaymentToken,
  selectGasPrice,
  selectMarketsInfoData,
  selectRelayerFeeToken,
  selectSponsoredCallMultiplierFactor,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectSourceChainId } from "context/SyntheticsStateContext/selectors/multichainSelectors";
import { selectSavedAllowedSlippage } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { selectTokenPermits } from "context/SyntheticsStateContext/selectors/tokenPermitsSelectors";
import { makeSelectFindSwapPath } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { parseError } from "lib/errors";
import { estimateGasLimit, estimateGasLimitMultichain } from "lib/gas/estimateGasLimit";
import { getByKey } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import useWallet from "lib/wallets/useWallet";
import { UiContractsChain } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import {
  DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION,
  getGasPaymentTokens,
  getRelayerFeeToken,
  MIN_RELAYER_FEE_USD,
} from "sdk/configs/express";
import { convertTokenAddress } from "sdk/configs/tokens";
import { MarketsInfoData } from "sdk/types/markets";
import { estimateExpressBatchOrderGasLimit } from "sdk/utils/fees/executionFee";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import { applyFactor, expandDecimals, roundBigIntToDecimals, USD_DECIMALS } from "sdk/utils/numbers";
import { BatchOrderTxnParams, CancelOrderTxnParams, getTotalExecutionFeeForOrders } from "sdk/utils/orderTransactions";
import { nowInSeconds } from "sdk/utils/time";

import { ExpressParams, getRelayerFeeParams, RelayerFeeParams, RelayParamsPayload } from ".";
import { useExternalSwapOutputRequest } from "../externalSwaps/useExternalSwapOutputRequest";
import { getExpressBatchOrderParams, getMultichainInfoFromSigner } from "../orders/expressOrderUtils";
import { Subaccount } from "../subaccount";
import {
  convertToTokenAmount,
  convertToUsd,
  TokenData,
  TokensAllowanceData,
  TokensData,
  useTokensAllowanceData,
} from "../tokens";
import { FindSwapPath, getSwapAmountsByToValue } from "../trade";
import {
  getOracleParamsPayload,
  getOraclePriceParamsForOrders,
  getOraclePriceParamsForRelayFee,
} from "./oracleParamsUtils";

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
  const [relayerFeeTokenAmount, setRelayerFeeTokenAmount] = useState<bigint | undefined>(1n);

  const requiredActions = orderParams
    ? orderParams?.createOrderParams.length +
      orderParams?.updateOrderParams.length +
      orderParams?.cancelOrderParams.length
    : 0;

  const isNativePayment = orderParams?.createOrderParams.some((o) => o.tokenTransfersParams?.isNativePayment) ?? false;
  const isExpressTxnAvailable = useSelector(makeSelectIsExpressTransactionAvailable(isNativePayment));

  const enabled = useMemo(() => {
    if (requiredActions === 0 || !isExpressTxnAvailable) {
      return false;
    }

    if (orderParams?.createOrderParams.length) {
      return orderParams.createOrderParams.every(
        (o) => o.orderPayload.numbers.sizeDeltaUsd !== 0n || o.orderPayload.numbers.initialCollateralDeltaAmount !== 0n
      );
    }

    return true;
  }, [isExpressTxnAvailable, orderParams?.createOrderParams, requiredActions]);

  const { setGasPaymentTokenAddress } = useSettings();
  const totalExecutionFee = orderParams ? getTotalExecutionFeeForOrders(orderParams) : undefined;
  // useEffect(() => {
  //   console.log("orderParams", { orderParams, totalExecutionFee });
  // }, [orderParams]);
  // const totalExecutionFee = DEV_TOTAL_EXECUTION_FEE;
  const tokenPermits = useSelector(selectTokenPermits);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const tokensData = useSelector(selectTokensData);
  const sponsoredCallMultiplierFactor = useSelector(selectSponsoredCallMultiplierFactor);
  const gasPrice = useSelector(selectGasPrice);
  const gasLimits = useSelector(selectGasLimits);
  const timer = useRef<number | undefined>(undefined);
  const throttleTime = useRef(1000);
  const srcChainId = useSelector(selectSourceChainId);

  const { signer, account } = useWallet();
  const settlementChainClient = usePublicClient({ chainId: chainId });
  const subaccount = useSelector(makeSelectSubaccountForActions(requiredActions));
  const { provider } = useJsonRpcProvider(chainId);

  const gasPaymentToken = useSelector(selectGasPaymentToken);
  const relayerFeeToken = useSelector(selectRelayerFeeToken);

  let baseRelayerFeeAmount = totalExecutionFee?.totalExecutionFeeAmount ?? 0n;

  if (baseRelayerFeeAmount === 0n) {
    baseRelayerFeeAmount = convertToTokenAmount(
      MIN_RELAYER_FEE_USD,
      relayerFeeToken?.decimals,
      relayerFeeToken?.prices.maxPrice
    )!;
  }

  // console.log("useExpressOrdersParams", {
  //   baseRelayerFeeAmount,
  //   totalExecutionFee,
  // });

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

      if (timer.current !== undefined && Date.now() - timer.current < throttleTime.current) {
        return;
      }

      timer.current = Date.now();

      if (!srcChainId) {
        if (baseFeeSwapParams?.isOutGasTokenBalance) {
          const anotherGasToken = getGasPaymentTokens(chainId).find((token) => {
            const tokenData = getByKey(tokensData, token);
            const gasPaymentTokenData = getByKey(tokensData, baseFeeSwapParams.gasPaymentTokenAddress);

            const usdValue = convertToUsd(
              baseFeeSwapParams.gasPaymentTokenAmount,
              gasPaymentTokenData?.decimals,
              gasPaymentTokenData?.prices.minPrice
            );

            const requiredTokenAmount = convertToTokenAmount(
              usdValue,
              tokenData?.decimals,
              tokenData?.prices.minPrice
            )!;

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
      }

      async function handleGasLimit({
        gasLimit,
        gasPrice,
        relayerFeeToken,
        isAsync,
      }: {
        gasLimit: bigint;
        gasPrice: bigint;
        relayerFeeToken: TokenData;
        isAsync: boolean;
      }) {
        const buffer = gasLimit / 10n;
        const finalGasLimit = gasLimit + buffer;

        // FIXME gassless: TEMP DEBUG
        // eslint-disable-next-line no-console
        console.log(`gasLimit ${isAsync ? "async" : "fast"}:`, finalGasLimit);

        let feeAmount: bigint;
        if (sponsoredCallMultiplierFactor !== undefined) {
          feeAmount = applyFactor(finalGasLimit * gasPrice, sponsoredCallMultiplierFactor);
        } else {
          feeAmount = await gelatoRelay.getEstimatedFee(BigInt(chainId), relayerFeeToken.address, finalGasLimit, false);
        }

        setRelayerFeeTokenAmount(feeAmount);
        throttleTime.current = 5000;
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
          !gasLimits ||
          !orderParams
        ) {
          return;
        }

        try {
          const { txnData, oracleParamsPayload } = await getExpressBatchOrderParams({
            chainId,
            orderParams,
            signer,
            settlementChainClient,
            subaccount,
            tokenPermits,
            tokensData,
            marketsInfoData,
            relayFeeParams: baseFeeSwapParams,
            emptySignature: true,
          });

          // estimateGasLimit(provider, {
          //   to: txnData.to,
          //   data: txnData.callData,
          //   from: GMX_SIMULATION_ORIGIN,
          //   value: 0n,
          // }).then((gasLimit) => handleGasLimit({ gasLimit, gasPrice, relayerFeeToken, isAsync: true }));
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

          await handleGasLimit({ gasLimit, gasPrice, relayerFeeToken, isAsync: false });

          const fastGasLimit = estimateExpressBatchOrderGasLimit({
            gasLimits,
            createOrdersCount: orderParams.createOrderParams.length,
            updateOrdersCount: orderParams.updateOrderParams.length,
            cancelOrdersCount: orderParams.cancelOrderParams.length,
            feeSwapsCount: baseFeeSwapParams.feeParams.feeSwapPath.length,
            externalSwapGasLimit: 0n,
            oraclePriceCount: oracleParamsPayload.tokens.length,
            isSubaccount: Boolean(subaccount),
          });

          handleGasLimit({ gasLimit: fastGasLimit, gasPrice, relayerFeeToken, isAsync: false });
        } catch (error) {
          const errorData = parseError(error);
          // TEMP DEBUP
          // eslint-disable-next-line no-console
          console.error("gasLimit error", errorData);
          throttleTime.current = 1000;
          throw error;
        }
      }

      estimateBasTxnData();
    },
    [
      baseFeeSwapParams,
      chainId,
      enabled,
      gasLimits,
      gasPrice,
      marketsInfoData,
      orderParams,
      provider,
      relayerFeeToken,
      setGasPaymentTokenAddress,
      settlementChainClient,
      signer,
      sponsoredCallMultiplierFactor,
      srcChainId,
      subaccount,
      tokenPermits,
      tokensData,
      totalExecutionFee,
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
      // if (isInTradebox) {
      //   console.log("useExpressOrdersParams", {
      //     orderParams,
      //     baseFeeSwapParams, // undefined
      //     tokensData,
      //     marketsInfoData,
      //     finalRelayFeeSwapParams, // undefined
      //   });
      // }
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

    const relayParamsPayload: RelayParamsPayload = {
      oracleParams: oracleParamsPayload,
      tokenPermits: tokenPermits ?? [],
      externalCalls: finalRelayFeeSwapParams.externalCalls,
      fee: finalRelayFeeSwapParams.feeParams,
      deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
      userNonce: 0n,
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
  chainId: UiContractsChain;
  account: string | undefined;
  relayerFeeTokenAmount: bigint | undefined;
  executionFeeAmount: bigint | undefined;
  relayerFeeToken: TokenData | undefined;
  gasPaymentToken: TokenData | undefined;
  isSubaccount: boolean;
  enabled: boolean;
}): RelayerFeeParams | undefined {
  const tokensData = useSelector(selectTokensData);
  const slippage = useSelector(selectSavedAllowedSlippage);
  const gasPrice = useSelector(selectGasPrice);
  const srcChainId = useSelector(selectSourceChainId);

  const findSwapPath = useSelector(makeSelectFindSwapPath(gasPaymentToken?.address, relayerFeeToken?.address, true));

  const totalNetworkFeeAmount =
    relayerFeeTokenAmount !== undefined && executionFeeAmount !== undefined
      ? relayerFeeTokenAmount + executionFeeAmount
      : undefined;

  const internalSwapAmounts = useMemo(() => {
    if (!findSwapPath || !gasPaymentToken || !relayerFeeToken || totalNetworkFeeAmount === undefined || !enabled) {
      // console.log("internal swap amounts is undefined", {
      //   findSwapPath: !!findSwapPath,
      //   gasPaymentToken: !!gasPaymentToken,
      //   relayerFeeToken: !!relayerFeeToken,
      //   totalNetworkFeeAmount: totalNetworkFeeAmount !== undefined,
      //   enabled: !!enabled,
      // });

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
      // console.log("approximateGasPaymentTokenAmountForExternalSwap is undefined");

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
    } else {
      // console.log("useRelayerFeeSwapParams is defined");
    }

    return getRelayerFeeParams({
      chainId,
      srcChainId,
      account,
      relayerFeeTokenAmount,
      totalNetworkFeeAmount,
      relayerFeeTokenAddress: relayerFeeToken.address,
      gasPaymentTokenAddress: gasPaymentToken.address,
      internalSwapAmounts,
      externalSwapQuote: externalSwapOutput,
      tokensData,
      gasPaymentAllowanceData: gasPaymentAllowanceData,
      forceExternalSwaps: getSwapDebugSettings()?.forceExternalSwaps ?? false,
    });
  }, [
    account,
    relayerFeeTokenAmount,
    tokensData,
    relayerFeeToken,
    gasPaymentToken,
    totalNetworkFeeAmount,
    gasPaymentAllowanceData,
    chainId,
    srcChainId,
    internalSwapAmounts,
    externalSwapOutput,
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
  settlementChainClient,
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
  settlementChainClient?: PublicClient;
  chainId: UiContractsChain;
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

    const srcChainId = await getMultichainInfoFromSigner(signer, chainId);

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

    const baseRelayFeeSwapParams = getRelayerFeeParams({
      chainId,
      srcChainId,
      account,
      relayerFeeTokenAmount: swapAmounts.amountOut,
      totalNetworkFeeAmount: swapAmounts.amountOut,
      relayerFeeTokenAddress: relayerFeeToken.address,
      gasPaymentTokenAddress: gasPaymentToken.address,
      internalSwapAmounts: swapAmounts,
      externalSwapQuote: undefined,
      tokensData,
      gasPaymentAllowanceData,
      forceExternalSwaps: getSwapDebugSettings()?.forceExternalSwaps ?? false,
    });

    if (!baseRelayFeeSwapParams || baseRelayFeeSwapParams.needGasPaymentTokenApproval) {
      return undefined;
    }

    const { txnData } = await getExpressBatchOrderParams({
      chainId,
      orderParams: {
        createOrderParams: [],
        updateOrderParams: [],
        cancelOrderParams: params,
      },
      signer,
      settlementChainClient,
      subaccount,
      tokenPermits: [],
      tokensData,
      marketsInfoData,
      relayFeeParams: baseRelayFeeSwapParams,
      emptySignature: true,
    });

    // const gasLimit = await estimateGasLimit(signer.provider!, {
    //   to: txnData.to,
    //   data: txnData.callData,
    //   from: GMX_SIMULATION_ORIGIN,
    //   value: 0n,
    // });

    let gasLimit: bigint;
    if (srcChainId) {
      gasLimit = await estimateGasLimitMultichain(settlementChainClient!, {
        to: txnData.to,
        data: txnData.callData,
        from: GMX_SIMULATION_ORIGIN,
      });
    } else {
      gasLimit = await estimateGasLimit(signer.provider!, {
        to: txnData.to,
        data: txnData.callData,
        from: GMX_SIMULATION_ORIGIN,
        value: 0n,
      });
    }

    let feeAmount: bigint;

    if (sponsoredCallMultiplierFactor !== undefined) {
      feeAmount = gasLimit * gasPrice * sponsoredCallMultiplierFactor;
    } else {
      feeAmount = await gelatoRelay.getEstimatedFee(BigInt(chainId), relayerFeeToken.address, gasLimit, false);
    }

    const finalSwapAmounts = getSwapAmountsByToValue({
      tokenIn: gasPaymentToken,
      tokenOut: relayerFeeToken,
      amountOut: feeAmount,
      isLimit: false,
      findSwapPath,
      uiFeeFactor: 0n,
    });

    const finalRelayFeeSwapParams = getRelayerFeeParams({
      chainId,
      srcChainId,
      account,
      relayerFeeTokenAmount: feeAmount,
      totalNetworkFeeAmount: feeAmount,
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

    const feeOracleParams = getOraclePriceParamsForRelayFee({
      chainId,
      relayFeeParams: finalRelayFeeSwapParams,
      tokensData,
      marketsInfoData,
    });

    const oracleParamsPayload = getOracleParamsPayload(feeOracleParams);

    const relayParamsPayload: RelayParamsPayload = {
      oracleParams: oracleParamsPayload,
      tokenPermits: [],
      externalCalls: finalRelayFeeSwapParams.externalCalls,
      fee: finalRelayFeeSwapParams.feeParams,
      deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
      userNonce: 0n,
    };

    return {
      subaccount,
      relayParamsPayload,
      relayFeeParams: finalRelayFeeSwapParams,
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
