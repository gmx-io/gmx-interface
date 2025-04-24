// import { JsonRpcProvider, Signer } from "ethers";
// import { Provider, useEffect, useMemo, useRef, useState } from "react";

// import { useSettings } from "context/SettingsContext/SettingsContextProvider";
// import {
//   makeSelectIsExpressTransactionAvailable,
//   makeSelectSubaccountForActions,
//   selectGasLimits,
//   selectGasPaymentToken,
//   selectGasPrice,
//   selectMarketsInfoData,
//   selectRelayerFeeToken,
//   selectSponsoredCallMultiplierFactor,
//   selectTokensData,
// } from "context/SyntheticsStateContext/selectors/globalSelectors";
// import { selectSavedAllowedSlippage } from "context/SyntheticsStateContext/selectors/settingsSelectors";
// import { selectTokenPermits } from "context/SyntheticsStateContext/selectors/tokenPermitsSelectors";
// import { makeSelectFindSwapPath } from "context/SyntheticsStateContext/selectors/tradeSelectors";
// import { useSelector } from "context/SyntheticsStateContext/utils";
// import { useChainId } from "lib/chains";
// import { parseError } from "lib/errors";
// import { getByKey } from "lib/objects";
// import { useJsonRpcProvider } from "lib/rpc";
// import useWallet from "lib/wallets/useWallet";
// import { getContract } from "sdk/configs/contracts";
// import { getGasPaymentTokens, NATIVE_TOKEN_ADDRESS, getRelayerFeeToken } from "sdk/configs/express";
// import { convertTokenAddress } from "sdk/configs/tokens";
// import { RelayParamsPayload } from "sdk/types/expressTransactions";
// import { MarketsInfoData } from "sdk/types/markets";
// import { gelatoRelay, gelatoRelay } from "sdk/utils/gelatoRelay";
// import { applyFactor, expandDecimals, roundBigIntToDecimals, USD_DECIMALS } from "sdk/utils/numbers";
// import { BatchOrderTxnParams, CancelOrderTxnParams, getTotalExecutionFeeForOrders } from "sdk/utils/orderTransactions";

// import { applyGasLimitBuffer, estimateGasLimit } from "lib/gas/estimateGasLimit";
// import { estimateExpressBatchOrderGasLimit } from "sdk/utils/fees/executionFee";
// import { size } from "viem";
// import { useExternalSwapOutputRequest } from "../externalSwaps/useExternalSwapOutputRequest";
// import {
//   convertToTokenAmount,
//   convertToUsd,
//   TokenData,
//   TokensAllowanceData,
//   TokensData,
//   useTokensAllowanceData,
// } from "../tokens";
// import {
//   ExternalSwapOutput,
//   ExternalSwapAggregator,
//   FindSwapPath,
//   getSwapAmountsByToValue,
//   SwapAmounts,
// } from "../trade";
// import {
//   getOracleParamsPayload,
//   getOraclePriceParamsForOrders,
//   getOraclePriceParamsForRelayFee,
// } from "./oracleParamsUtils";
// import { Subaccount } from "../subaccount";
// import { ProgressiveChain } from "context/SyntheticsStateContext/selectors/progressiveRace";
// import { getExpressBatchOrderParams } from "../orders/expressOrderUtils";
// import { GasLimitsConfig } from "../fees";
// import { getOpenOceanTxnData } from "../externalSwaps/openOcean";
// import { getRelayerFeeParams } from "./relayParamsUtils";
// import { getSwapDebugSettings } from "config/externalSwaps";
// import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
// import { ExpressParams } from "./types";

// export type ExpressOrdersParamsResult = {
//   needGasPaymentTokenApproval: boolean;
//   expressParams: ExpressParams | undefined;
// };

// export function useExpressOrdersParams({
//   orderParams,
// }: {
//   orderParams: BatchOrderTxnParams | undefined;
// }): ExpressOrdersParamsResult {
//   const { chainId } = useChainId();
//   const [relayerFeeTokenAmount, setRelayerFeeTokenAmount] = useState<bigint | undefined>(undefined);

//   const requiredActions = orderParams
//     ? orderParams?.createOrderParams.length +
//       orderParams?.updateOrderParams.length +
//       orderParams?.cancelOrderParams.length
//     : 0;

//   const isNativePayment = orderParams?.createOrderParams.some((o) => o.tokenTransfersParams?.isNativePayment) ?? false;
//   const isExpressTxnAvailable = useSelector(makeSelectIsExpressTransactionAvailable(isNativePayment));

//   const enabled = useMemo(() => {
//     if (requiredActions === 0 || !isExpressTxnAvailable) {
//       return false;
//     }

//     if (orderParams?.createOrderParams.length) {
//       return orderParams.createOrderParams.every(
//         (o) => o.orderPayload.numbers.sizeDeltaUsd !== 0n || o.orderPayload.numbers.initialCollateralDeltaAmount !== 0n
//       );
//     }

//     return true;
//   }, [isExpressTxnAvailable, orderParams?.createOrderParams, requiredActions]);

//   const { setGasPaymentTokenAddress } = useSettings();
//   const totalExecutionFee = orderParams ? getTotalExecutionFeeForOrders(orderParams) : undefined;
//   const tokenPermits = useSelector(selectTokenPermits);
//   const marketsInfoData = useSelector(selectMarketsInfoData);
//   const tokensData = useSelector(selectTokensData);
//   const sponsoredCallMultiplierFactor = useSelector(selectSponsoredCallMultiplierFactor);
//   const gasPrice = useSelector(selectGasPrice);
//   const gasLimits = useSelector(selectGasLimits);
//   const timer = useRef<number | undefined>(undefined);

//   const { signer, account } = useWallet();
//   const subaccount = useSelector(makeSelectSubaccountForActions(requiredActions));
//   const { provider } = useJsonRpcProvider(chainId);

//   const gasPaymentToken = useSelector(selectGasPaymentToken);
//   const relayerFeeToken = useSelector(selectRelayerFeeToken);

//   const baseRelayerFeeAmount = totalExecutionFee?.totalExecutionFeeAmount ?? 0n;

//   const baseFeeSwapParams = useRelayerFeeSwapParams({
//     chainId,
//     account,
//     relayerFeeTokenAmount: baseRelayerFeeAmount,
//     executionFeeAmount: totalExecutionFee?.totalExecutionFeeAmount ?? 0n,
//     relayerFeeToken: relayerFeeToken,
//     gasPaymentToken: gasPaymentToken,
//     isSubaccount: Boolean(subaccount),
//     enabled,
//   });

//   const chain
// }

// export function useGasPaymentTokenAllowanceData(chainId: number, gasPaymentTokenAddress: string | undefined) {
//   const { tokensAllowanceData, isLoaded: isTokensAllowanceDataLoaded } = useTokensAllowanceData(chainId, {
//     spenderAddress: getContract(chainId, "SyntheticsRouter"),
//     tokenAddresses: gasPaymentTokenAddress ? [convertTokenAddress(chainId, gasPaymentTokenAddress, "wrapped")] : [],
//   });

//   return isTokensAllowanceDataLoaded ? tokensAllowanceData : undefined;
// }

// function getExpressParamsEstimator({
//   subaccount,
//   gasPaymentTokenAddress,
//   chainId,
//   signer,
//   tokensData,
//   marketsInfoData,
//   findSwapPath,
//   sponsoredCallMultiplierFactor,
//   batchParams,
//   gasPaymentAllowanceData,
//   gasLimits,
//   gasPrice,
//   isExpressTxnAvailable,
//   provider,
// }: {
//   signer: Signer | undefined;
//   chainId: number;
//   tokensData: TokensData | undefined;
//   marketsInfoData: MarketsInfoData | undefined;
//   subaccount: Subaccount | undefined;
//   gasPaymentTokenAddress: string | undefined;
//   findSwapPath: FindSwapPath | undefined;
//   gasPaymentAllowanceData: TokensAllowanceData | undefined;
//   gasLimits: GasLimitsConfig | undefined;
//   gasPrice: bigint | undefined;
//   batchParams: BatchOrderTxnParams | undefined;
//   isExpressTxnAvailable: boolean;
//   provider: JsonRpcProvider | undefined;
//   sponsoredCallMultiplierFactor: bigint | undefined;
// }) {
//   async function getInitialParams() {
//     const account = await signer?.getAddress();
//     const gasPaymentToken = getByKey(tokensData, gasPaymentTokenAddress);
//     const relayerFeeToken = getByKey(tokensData, getRelayerFeeToken(chainId).address);

//     const requiredActions = batchParams
//       ? batchParams.createOrderParams.length +
//         batchParams.updateOrderParams.length +
//         batchParams.cancelOrderParams.length
//       : 0;

//     const isEmpty =
//       requiredActions === 0 ||
//       !isExpressTxnAvailable ||
//       batchParams?.createOrderParams.some(
//         (co) =>
//           co.orderPayload.numbers.sizeDeltaUsd === 0n && co.orderPayload.numbers.initialCollateralDeltaAmount === 0n
//       );

//     const { totalExecutionFeeAmount, totalExecutionGasLimit } = getTotalExecutionFeeForOrders(
//       batchParams ?? {
//         createOrderParams: [],
//         updateOrderParams: [],
//         cancelOrderParams: [],
//       }
//     );

//     if (
//       isEmpty ||
//       !isExpressTxnAvailable ||
//       !gasPaymentToken ||
//       !relayerFeeToken ||
//       !gasLimits ||
//       !findSwapPath ||
//       !account ||
//       !signer ||
//       !tokensData ||
//       gasPrice === undefined ||
//       !gasPaymentAllowanceData ||
//       !marketsInfoData ||
//       !provider
//     ) {
//       return undefined;
//     }

//     return {
//       isEmpty,
//       requiredActions,
//       account,
//       gasPaymentToken,
//       relayerFeeToken,
//       findSwapPath,
//       signer,
//       tokensData,
//       subaccount,
//       marketsInfoData,
//       gasPaymentAllowanceData,
//       gasPrice,
//       batchParams,
//       isExpressTxnAvailable,
//       baseRelayerFeeAmount: totalExecutionFeeAmount,
//       totalExecutionFeeAmount,
//       totalExecutionGasLimit,
//       sponsoredCallMultiplierFactor,
//       gasLimits,
//       totalNetworkFeeAmount: totalExecutionFeeAmount + totalExecutionFeeAmount,
//       provider,
//     };
//   }

//   type SwapStep = {
//     initialParams: Awaited<ReturnType<typeof getInitialParams>> | undefined;
//     externalSwapQuote: ExternalSwapOutput | undefined;
//     internalSwapAmounts: SwapAmounts | undefined;
//   };

//   async function getInternalSwapAmounts(p: Awaited<ReturnType<typeof getInitialParams>>): Promise<SwapStep> {
//     if (!p) {
//       return {
//         initialParams: p,
//         internalSwapAmounts: undefined,
//         externalSwapQuote: undefined,
//       };
//     }

//     return {
//       internalSwapAmounts: getSwapAmountsByToValue({
//         tokenIn: p.gasPaymentToken,
//         tokenOut: p.relayerFeeToken,
//         amountOut: p.totalNetworkFeeAmount,
//         isLimit: false,
//         findSwapPath: p.findSwapPath,
//         uiFeeFactor: 0n,
//       }),
//       externalSwapQuote: undefined,
//       initialParams: p,
//     };
//   }

//   async function getExternalSwapOutputForFee(p: Awaited<ReturnType<typeof getInitialParams>>): Promise<SwapStep> {
//     if (!p) {
//       return {
//         externalSwapQuote: undefined,
//         internalSwapAmounts: undefined,
//         initialParams: p,
//       };
//     }

//     const result = await getOpenOceanTxnData({
//       chainId,
//       senderAddress: getContract(chainId, "ExternalHandler"),
//       receiverAddress: getContract(chainId, p.subaccount ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"),
//       tokenInAddress: p.gasPaymentToken.address,
//       tokenOutAddress: p.relayerFeeToken.address,
//       amountIn: p.baseRelayerFeeAmount,
//       gasPrice: p.gasPrice,
//       slippage: 0,
//     });

//     if (!result) {
//       return {
//         externalSwapQuote: undefined,
//         internalSwapAmounts: undefined,
//         initialParams: p,
//       };
//     }

//     const quote: ExternalSwapOutput = {
//       aggregator: ExternalSwapAggregator.OpenOcean,
//       inTokenAddress: p.gasPaymentToken.address,
//       outTokenAddress: p.relayerFeeToken.address,
//       amountIn: p.baseRelayerFeeAmount,
//       amountOut: result.outputAmount,
//       usdIn: result.usdIn,
//       usdOut: result.usdOut,
//       priceIn: result.priceIn,
//       priceOut: result.priceOut,
//       feesUsd: result.usdIn !== undefined && result.usdOut !== undefined ? result.usdIn - result.usdOut : undefined,
//       txnData: {
//         to: result.to,
//         data: result.data,
//         value: result.value,
//         estimatedGas: result.estimatedGas,
//       },
//     };

//     return {
//       initialParams: p,
//       externalSwapQuote: quote,
//       internalSwapAmounts: undefined,
//     };
//   }

//   return (
//     ProgressiveChain.create()
//       .then(getInitialParams)
//       .parallel([getExternalSwapOutputForFee, getInternalSwapAmounts])
//       .then(async ([externalSwapOutput, internalSwapAmounts]) => {
//         const p = externalSwapOutput.initialParams;

//         if (!p) {
//           return undefined;
//         }

//         const relayFeeParams = getRelayerFeeParams({
//           chainId,
//           account: p.account,
//           relayerFeeTokenAmount: p.totalNetworkFeeAmount,
//           totalNetworkFeeAmount: p.totalNetworkFeeAmount,
//           relayerFeeTokenAddress: p.relayerFeeToken.address,
//           gasPaymentTokenAddress: p.gasPaymentToken.address,
//           internalSwapAmounts: internalSwapAmounts.internalSwapAmounts,
//           externalSwapQuote: externalSwapOutput.externalSwapQuote,
//           tokensData: p.tokensData,
//           gasPaymentAllowanceData: p.gasPaymentAllowanceData,
//           forceExternalSwaps: getSwapDebugSettings()?.forceExternalSwaps,
//         });

//         if (!relayFeeParams || !p.batchParams) {
//           return undefined;
//         }

//         const { txnData, oracleParamsPayload } = await getExpressBatchOrderParams({
//           chainId,
//           orderParams: p.batchParams,
//           signer: p.signer,
//           subaccount: p.subaccount,
//           tokenPermits: [],
//           tokensData: p.tokensData,
//           marketsInfoData: p.marketsInfoData,
//           RelayFeeParams: relayFeeParams,
//           emptySignature: true,
//         });

//         return {
//           initialParams: p,
//           txnData,
//           oracleParamsPayload,
//           relayFeeParams,
//         };
//       })
//       // handle out of balance
//       .parallel([
//         async (p) => {
//           if (!p) {
//             return;
//           }

//           const { txnData, oracleParamsPayload, relayFeeParams, initialParams } = p;
//           const { provider } = initialParams ?? {};

//           const gasLimit = await estimateGasLimit(provider, {
//             to: txnData.to,
//             data: txnData.callData,
//             from: GMX_SIMULATION_ORIGIN,
//             value: 0n,
//           });

//           return {
//             ...p,
//             gasLimit,
//           };
//         },

//         async (p) => {
//           if (!p || !p.initialParams.batchParams) {
//             return;
//           }

//           const gasLimit = estimateExpressBatchOrderGasLimit({
//             gasLimits: p.initialParams.gasLimits,
//             createOrdersCount: p.initialParams.batchParams.createOrderParams.length,
//             updateOrdersCount: p.initialParams.batchParams.updateOrderParams.length,
//             cancelOrdersCount: p.initialParams.batchParams.cancelOrderParams.length,
//             feeSwapsCount: p.relayFeeParams.feeParams.feeSwapPath.length,
//             externalSwapGasLimit: 0n,
//             oraclePriceCount: p.oracleParamsPayload.tokens.length,
//             isSubaccount: Boolean(subaccount),
//           });

//           return {
//             ...p,
//             gasLimit,
//           };
//         },
//       ])
//       .then(async ([p1, p2]) => {
//         const initialParams = p1?.initialParams ?? p2?.initialParams;
//         const gasLimit = p1?.gasLimit ?? p2?.gasLimit;

//         if (!initialParams || gasLimit === undefined) {
//           return undefined;
//         }

//         const buffer = gasLimit / 10n;
//         const finalGasLimit = gasLimit + buffer;

//         if (initialParams.sponsoredCallMultiplierFactor !== undefined) {
//           return {
//             ...initialParams,
//             gasLimit,
//             feeAmount: applyFactor(gasLimit * initialParams.gasPrice, initialParams.sponsoredCallMultiplierFactor),
//           };
//         } else {
//           const feeAmount = await gelatoRelay.getEstimatedFee(
//             BigInt(chainId),
//             initialParams.relayerFeeToken.address,
//             finalGasLimit,
//             false
//           );

//           return {
//             ...initialParams,
//             gasLimit: finalGasLimit,
//             feeAmount,
//           };
//         }
//       })
//       .parallel([
//         async (p) => {
//           if (!p) {
//             return;
//           }

//           const res = await getInternalSwapAmounts({
//             ...p,
//           });

//           return {
//             ...res,
//             ...p,
//           };
//         },

//         async (p) => {
//           if (!p) {
//             return;
//           }

//           const res = await getExternalSwapOutputForFee({
//             ...p,
//           });

//           return {
//             ...res,
//             ...p,
//           };
//         },
//       ])
//       .then(async ([p1, p2]) => {
//         const initialParams = p1?.initialParams ?? p2?.initialParams;
//         const gasLimit = p1?.gasLimit ?? p2?.gasLimit;

//         if (!initialParams || gasLimit === undefined) {
//           return undefined;
//         }

//         const finalRelayFeeParams = getRelayerFeeParams({
//           chainId,
//           account: initialParams.account,
//           relayerFeeTokenAmount: initialParams.totalNetworkFeeAmount,
//           totalNetworkFeeAmount: initialParams.totalNetworkFeeAmount,
//           relayerFeeTokenAddress: initialParams.relayerFeeToken.address,
//           gasPaymentTokenAddress: initialParams.gasPaymentToken.address,
//           internalSwapAmounts: p1?.internalSwapAmounts ?? p2?.internalSwapAmounts,
//           externalSwapQuote: p1?.externalSwapQuote ?? p2?.externalSwapQuote,
//           tokensData: initialParams.tokensData,
//           gasPaymentAllowanceData: initialParams.gasPaymentAllowanceData,
//           forceExternalSwaps: getSwapDebugSettings()?.forceExternalSwaps,
//         });

//         if (!finalRelayFeeParams || !initialParams.batchParams) {
//           return undefined;
//         }

//         const feeOracleParams = getOraclePriceParamsForRelayFee({
//           chainId,
//           relayFeeParams: finalRelayFeeParams,
//           tokensData: initialParams.tokensData,
//           marketsInfoData: initialParams.marketsInfoData,
//         });

//         const ordersOracleParams = getOraclePriceParamsForOrders({
//           chainId,
//           createOrderParams: initialParams.batchParams.createOrderParams,
//           marketsInfoData: initialParams.marketsInfoData,
//           tokensData: initialParams.tokensData,
//         });

//         const oracleParamsPayload = getOracleParamsPayload([...feeOracleParams, ...ordersOracleParams]);

//         const relayParamsPayload: Omit<RelayParamsPayload, "deadline" | "userNonce"> = {
//           oracleParams: oracleParamsPayload,
//           tokenPermits: [],
//           externalCalls: finalRelayFeeParams.externalCalls,
//           fee: finalRelayFeeParams.feeParams,
//         };

//         return {
//           ...initialParams,
//           expressParams: {
//             subaccount: initialParams.subaccount,
//             relayParamsPayload,
//             relayFeeParams: finalRelayFeeParams,
//             needGasPaymentTokenApproval: finalRelayFeeParams.needGasPaymentTokenApproval,
//             isSponsoredCall: initialParams.sponsoredCallMultiplierFactor !== undefined,
//           },
//         };
//       })
//       .build()
//   );
// }

// export async function getExpressCancelOrdersParams({
//   signer,
//   chainId,
//   params,
//   subaccount,
//   gasPaymentTokenAddress,
//   tokensData,
//   marketsInfoData,
//   findSwapPath,
//   sponsoredCallMultiplierFactor,
//   gasPaymentAllowanceData,
//   gasPrice,
// }: {
//   params: CancelOrderTxnParams[];
//   signer: Signer | undefined;
//   chainId: number;
//   tokensData: TokensData | undefined;
//   marketsInfoData: MarketsInfoData | undefined;
//   subaccount: Subaccount | undefined;
//   gasPaymentTokenAddress: string | undefined;
//   findSwapPath: FindSwapPath | undefined;
//   sponsoredCallMultiplierFactor: bigint | undefined;
//   gasPaymentAllowanceData: TokensAllowanceData | undefined;
//   gasPrice: bigint | undefined;
// }): Promise<ExpressParams | undefined> {
//   try {
//     const account = await signer?.getAddress();
//     const gasPaymentToken = getByKey(tokensData, gasPaymentTokenAddress);
//     const relayerFeeToken = getByKey(tokensData, getRelayerFeeToken(chainId).address);

//     if (
//       !gasPaymentToken ||
//       !relayerFeeToken ||
//       !findSwapPath ||
//       !account ||
//       !signer ||
//       !tokensData ||
//       gasPrice === undefined ||
//       !gasPaymentAllowanceData ||
//       !marketsInfoData
//     ) {
//       return undefined;
//     }

//     const baseRelayerFeeAmount = convertToTokenAmount(
//       expandDecimals(1, USD_DECIMALS),
//       relayerFeeToken.decimals,
//       relayerFeeToken.prices.maxPrice
//     )!;

//     const swapAmounts = getSwapAmountsByToValue({
//       tokenIn: gasPaymentToken,
//       tokenOut: relayerFeeToken,
//       amountOut: baseRelayerFeeAmount,
//       isLimit: false,
//       findSwapPath,
//       uiFeeFactor: 0n,
//     });

//     const baseRelayFeeParams = getRelayerFeeSwapParams({
//       chainId,
//       account,
//       relayerFeeTokenAmount: swapAmounts.amountOut,
//       totalNetworkFeeAmount: swapAmounts.amountOut,
//       relayerFeeTokenAddress: relayerFeeToken.address,
//       gasPaymentTokenAddress: gasPaymentToken.address,
//       internalSwapAmounts: swapAmounts,
//       externalSwapQuote: undefined,
//       tokensData,
//       gasPaymentAllowanceData,
//     });

//     if (!baseRelayFeeParams || baseRelayFeeParams.needGasPaymentTokenApproval) {
//       return undefined;
//     }

//     const { txnData } = await getExpressBatchOrderParams({
//       chainId,
//       orderParams: {
//         createOrderParams: [],
//         updateOrderParams: [],
//         cancelOrderParams: params,
//       },
//       signer,
//       subaccount,
//       tokenPermits: [],
//       tokensData,
//       marketsInfoData,
//       RelayFeeParams: baseRelayFeeParams,
//       emptySignature: true,
//     });

//     const gasLimit = await estimateGasLimit(txnData, signer.provider);
//     const buffer = gasLimit / 10n;
//     const finalGasLimit = gasLimit + buffer;

//     let feeAmount: bigint;

//     if (sponsoredCallMultiplierFactor !== undefined) {
//       feeAmount = finalGasLimit * gasPrice * sponsoredCallMultiplierFactor;
//     } else {
//       feeAmount = await gelatoRelay.getEstimatedFee(BigInt(chainId), relayerFeeToken.address, finalGasLimit, false);
//     }

//     const finalSwapAmounts = getSwapAmountsByToValue({
//       tokenIn: gasPaymentToken,
//       tokenOut: relayerFeeToken,
//       amountOut: feeAmount,
//       isLimit: false,
//       findSwapPath,
//       uiFeeFactor: 0n,
//     });

//     const finalRelayFeeParams = getRelayerFeeSwapParams({
//       chainId,
//       account,
//       relayerFeeTokenAmount: feeAmount,
//       totalNetworkFeeAmount: feeAmount,
//       relayerFeeTokenAddress: relayerFeeToken.address,
//       gasPaymentTokenAddress: gasPaymentToken.address,
//       internalSwapAmounts: finalSwapAmounts,
//       externalSwapQuote: undefined,
//       tokensData,
//       gasPaymentAllowanceData,
//     });

//     if (!finalRelayFeeParams) {
//       return undefined;
//     }

//     const feeOracleParams = getOraclePriceParamsForRelayFee({
//       chainId,
//       relayFeeParams: finalRelayFeeParams,
//       tokensData,
//       marketsInfoData,
//     });

//     const oracleParamsPayload = getOracleParamsPayload(feeOracleParams);

//     const relayParamsPayload: Omit<RelayParamsPayload, "deadline" | "userNonce"> = {
//       oracleParams: oracleParamsPayload,
//       tokenPermits: [],
//       externalCalls: finalRelayFeeParams.externalCalls,
//       fee: finalRelayFeeParams.feeParams,
//     };

//     return {
//       subaccount,
//       relayParamsPayload,
//       relayFeeParams: finalRelayFeeParams,
//       needGasPaymentTokenApproval:
//         baseRelayFeeParams.needGasPaymentTokenApproval || finalRelayFeeParams.needGasPaymentTokenApproval,
//       isSponsoredCall: sponsoredCallMultiplierFactor !== undefined,
//     };
//   } catch (error) {
//     const errorData = parseError(error);
//     // TEMP DEBUP
//     // eslint-disable-next-line no-console
//     console.error("cancel order expressParams error", errorData);
//     return undefined;
//   }
// }

// /**
//  *
//  * FIXME gassless: Playing with L1Gas
//  */
// // const referenceDataPart =
// //   "d555d7b3000000000000000000000000000000000000000000000000000000000000006000000000000000000000000072abbf5016fedfa2fb190138c59dae7e885c7fb1000000000000000000000000000000000000000000000000000000000000056000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000002a0000000000000000000000000000000000000000000000000000000000000042000000000000000000000000000000000000000000000000000000000000004400000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000006807f75c00000000000000000000000000000000000000000000000000000000000004e0000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab10000000000000000000000000000000000000000000000000000000000000002000000000000000000000000527fb0bcff63c47761039bb386cfe181a92a4701000000000000000000000000527fb0bcff63c47761039bb386cfe181a92a47010000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e5831000000000000000000000000000000000000000000000000000000000003f66b0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000100000000000000000000000070d95587d40a2caf56bd97485ab3eec10bee633600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000038000000000000000000000000000000000000000000000000000000000000003a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000004054de2d434838e9a3c71ea78000000000000000000000000000000000000000000000000000000000002dc6c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002fda6d1a114aadaff558d6e000000000000000000000000000000000000000000000000000045515fcdf28000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000072abbf5016fedfa2fb190138c59dae7e885c7fb100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ff0000000000000000000000000000000000000100000000000000000000000047c031236e19d024b42f8ae6780e44a573170703000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

// // function estimateCompressionSize(data: string): number {
// //   // Remove 0x prefix if present
// //   const hex = data.startsWith("0x") ? data.slice(2) : data;

// //   // Quick pattern analysis
// //   let repeatingZeros = 0;
// //   let repeatingPatterns = 0;
// //   let length = hex.length;

// //   // Count repeating zeros (common in addresses and uint256)
// //   for (let i = 0; i < length - 1; i += 2) {
// //     if (hex[i] === "0" && hex[i + 1] === "0") {
// //       repeatingZeros++;
// //     }
// //   }

// //   // Simple pattern detection (every 64 chars = 32 bytes)
// //   const chunks = hex.match(/.{1,64}/g) || [];
// //   const uniqueChunks = new Set(chunks);
// //   repeatingPatterns = chunks.length - uniqueChunks.size;

// //   // Quick ratio estimation
// //   // - High repetition = better compression (down to 0.2)
// //   // - Low repetition = worse compression (up to 0.9)
// //   const zeroRatio = repeatingZeros / (length / 2);
// //   const patternRatio = repeatingPatterns / chunks.length;

// //   // Base compression ratio between 0.2 and 0.9
// //   const estimatedRatio = Math.max(0.2, Math.min(0.9, 0.9 - zeroRatio * 0.3 - patternRatio * 0.4));

// //   return Math.ceil(length * estimatedRatio);
// // }

// // async function getL1GasReference(chainId: number, provider: any, data: `0x${string}`) {
// //   const mockResults: {
// //     name: string;
// //     l1Decoded: bigint;
// //     size: number;
// //     sizeDiff: number;
// //     sizeDiffPercent: number;
// //     gasDiff: bigint;
// //     gasDiffPercent: number;
// //     compressedSize: number;
// //     compressedSizeDiff: number;
// //     compressedSizeDiffPercent: number;
// //     zeroBytes: number;
// //     zeroBytesDiff: number;
// //     zeroBytesDiffPercent: number;
// //     nonZeroBytes: number;
// //     nonZeroBytesDiff: number;
// //     nonZeroBytesDiffPercent: number;
// //   }[] = [];

// //   for (const [name, p] of Object.entries(expressMocks)) {
// //     console.log("p", name, p);
// //     const callData = encodeFunctionData({
// //       abi: abis.GelatoRelayRouter,
// //       functionName: "batch",
// //       args: [{ ...p.relayParams, signature: "0x" }, zeroAddress, p.batchParams],
// //     });

// //     const l1Result = await provider.call({
// //       to: getContract(chainId, "ArbitrumNodeInterface"),
// //       data: encodeFunctionData({
// //         abi: abis.ArbitrumNodeInterface,
// //         functionName: "gasEstimateL1Component",
// //         args: [getContract(chainId, "GelatoRelayRouter"), false, callData],
// //       }),
// //       value: 0n,
// //     });

// //     const l1Decoded = decodeFunctionResult({
// //       abi: abis.ArbitrumNodeInterface,
// //       functionName: "gasEstimateL1Component",
// //       data: l1Result as `0x${string}`,
// //     });

// //     const sizeOfData = size(callData);
// //     const sizeDiff = sizeOfData - (mockResults[mockResults.length - 1]?.size ?? 0);
// //     const sizeDiffPercent = (sizeDiff / sizeOfData) * 100;
// //     const gasDiff = l1Decoded[0] - (mockResults[mockResults.length - 1]?.l1Decoded ?? 0n);
// //     const gasDiffPercent = (Number(gasDiff) / Number(l1Decoded[0])) * 100;
// //     const compressedSize = estimateCompressionSize(callData);
// //     const compressedSizeDiff = compressedSize - (mockResults[mockResults.length - 1]?.compressedSize ?? 0);
// //     const compressedSizeDiffPercent = (compressedSizeDiff / compressedSize) * 100;
// //     const splitted = callData.split("0x")[1].split("");

// //     const { zeroBytes, nonZeroBytes } = calculateBytes(callData);

// //     const zeroBytesDiff = zeroBytes - (mockResults[mockResults.length - 1]?.zeroBytes ?? 0);
// //     const zeroBytesDiffPercent = (zeroBytesDiff / zeroBytes) * 100;

// //     const nonZeroBytesDiff = nonZeroBytes - (mockResults[mockResults.length - 1]?.nonZeroBytes ?? 0);
// //     const nonZeroBytesDiffPercent = (nonZeroBytesDiff / nonZeroBytes) * 100;

// //     mockResults.push({
// //       name,
// //       sizeDiff,
// //       sizeDiffPercent,
// //       gasDiff,
// //       gasDiffPercent,
// //       compressedSize,
// //       compressedSizeDiff,
// //       compressedSizeDiffPercent,
// //       size: sizeOfData,
// //       l1Decoded: l1Decoded[0],
// //       zeroBytes,
// //       zeroBytesDiff,
// //       zeroBytesDiffPercent,
// //       nonZeroBytes,
// //       nonZeroBytesDiff,
// //       nonZeroBytesDiffPercent,
// //     });
// //   }

// //   console.log("mockResults", mockResults);
// //   console.table(
// //     mockResults.map((m) => ({
// //       name: m.name,
// //       size: m.size,
// //       compressedSize: m.compressedSize,
// //       gas: m.l1Decoded,
// //       sizeDiffPercent: m.sizeDiffPercent,
// //       compressedSizeDiffPercent: m.compressedSizeDiffPercent,
// //       gasDiffPercent: m.gasDiffPercent,
// //       sizeDiff: m.sizeDiff,
// //       compressedSizeDiff: m.compressedSizeDiff,
// //       gasDiff: m.gasDiff,
// //       zeroBytes: m.zeroBytes,
// //       zeroBytesDiff: m.zeroBytesDiff,
// //       zeroBytesDiffPercent: m.zeroBytesDiffPercent,
// //       nonZeroBytes: m.nonZeroBytes,
// //       nonZeroBytesDiff: m.nonZeroBytesDiff,
// //       nonZeroBytesDiffPercent: m.nonZeroBytesDiffPercent,
// //     }))
// //   );

// //   const referenceData = `0x${referenceDataPart}` as `0x${string}`;

// //   const zeroResult = await provider.call({
// //     to: getContract(chainId, "ArbitrumNodeInterface"),
// //     data: encodeFunctionData({
// //       abi: abis.ArbitrumNodeInterface,
// //       functionName: "gasEstimateL1Component",
// //       args: [getContract(chainId, "GelatoRelayRouter"), false, "0x"],
// //     }),
// //     value: 0n,
// //   });

// //   const zeroDecoded = decodeFunctionResult({
// //     abi: abis.ArbitrumNodeInterface,
// //     functionName: "gasEstimateL1Component",
// //     data: zeroResult as `0x${string}`,
// //   });

// //   const zeroGas = zeroDecoded[0];

// //   const referenceResult = await provider
// //     ?.call({
// //       to: getContract(chainId, "ArbitrumNodeInterface"),
// //       data: encodeFunctionData({
// //         abi: abis.ArbitrumNodeInterface,
// //         functionName: "gasEstimateL1Component",
// //         args: [getContract(chainId, "GelatoRelayRouter"), false, referenceData],
// //       }),
// //       value: 0n,
// //     })
// //     .catch((error) => {
// //       console.error("ArbitrumNodeInterface", error);
// //     });

// //   const referenceDecoded = decodeFunctionResult({
// //     abi: abis.ArbitrumNodeInterface,
// //     functionName: "gasEstimateL1Component",
// //     data: referenceResult as `0x${string}`,
// //   });

// //   const factResult = await provider.call({
// //     to: getContract(chainId, "ArbitrumNodeInterface"),
// //     data: encodeFunctionData({
// //       abi: abis.ArbitrumNodeInterface,
// //       functionName: "gasEstimateL1Component",
// //       args: [getContract(chainId, "GelatoRelayRouter"), false, data],
// //     }),
// //     value: 0n,
// //   });

// //   const factDecoded = decodeFunctionResult({
// //     abi: abis.ArbitrumNodeInterface,
// //     functionName: "gasEstimateL1Component",
// //     data: factResult as `0x${string}`,
// //   });

// //   const l1Reference = referenceDecoded[0];
// //   const l1Fact = factDecoded[0];

// //   const sizeOfData = estimateCompressionSize(data);
// //   const sizeOfReference = estimateCompressionSize(referenceData);

// //   // Fix it please....
// //   const evaluated = Math.round((Number(l1Reference) * Number(sizeOfData)) / Number(sizeOfReference));
// //   const evaluatedWithoutZeroGas = Math.round(
// //     (Number(l1Reference) * Math.log(Number(sizeOfData))) / Math.log(Number(sizeOfReference))
// //   );

// //   console.log("ArbitrumNodeInterface", {
// //     data,
// //     diffFact: l1Reference - l1Fact,
// //     diffEval: evaluated - Number(l1Fact),
// //     diffEvalWithZeroGas: evaluatedWithoutZeroGas - Number(l1Fact),
// //     zeroGas,
// //     sizeOfData,
// //     sizeOfReference,
// //     l1Reference,
// //     l1Fact,
// //     evaluated,
// //     evaluatedWithoutZeroGas,
// //     evaluatedWithZero: evaluatedWithoutZeroGas + Number(zeroGas),
// //   });

// //   return l1Reference;
// // }
