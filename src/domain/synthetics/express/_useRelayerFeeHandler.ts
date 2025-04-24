// import { Signer } from "ethers";
// import { useEffect, useMemo, useRef, useState } from "react";

// import { useSettings } from "context/SettingsContext/SettingsContextProvider";
// import {
//   makeSelectSubaccountForActions,
//   selectGasLimits,
//   selectGasPaymentToken,
//   selectGasPrice,
//   selectMarketsInfoData,
//   selectRelayerFeeToken,
//   selectSponsoredCallMultiplierFactor,
//   selectTokensData,
// } from "context/SyntheticsStateContext/selectors/globalSelectors";
// import { makeSelectIsExpressTransactionAvailable } from "context/SyntheticsStateContext/selectors/makeSelectIsExpressTransactionAvailable";
// import { selectSavedAllowedSlippage } from "context/SyntheticsStateContext/selectors/settingsSelectors";
// import { selectTokenPermits } from "context/SyntheticsStateContext/selectors/tokenPermitsSelectors";
// import { makeSelectFindSwapPath } from "context/SyntheticsStateContext/selectors/globalSelectors";
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
// import { gelatoRelay } from "sdk/utils/gelatoRelay";
// import { applyFactor, expandDecimals, roundBigIntToDecimals, USD_DECIMALS } from "sdk/utils/numbers";
// import { BatchOrderTxnParams, CancelOrderTxnParams, getTotalExecutionFeeForOrders } from "sdk/utils/orderTransactions";

// import { estimateGasLimit } from "lib/gas/estimateGasLimit";
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
// import { FindSwapPath, getSwapAmountsByToValue } from "../trade";
// import {
//   getOracleParamsPayload,
//   getOraclePriceParamsForOrders,
//   getOraclePriceParamsForRelayFee,
// } from "./oracleParamsUtils";

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

//   useEffect(
//     function getBaseTxnData() {
//       if (!enabled || !baseFeeSwapParams || baseFeeSwapParams.needGasPaymentTokenApproval) {
//         return;
//       }

//       const throttleTime = 1000;
//       if (timer.current !== undefined && Date.now() - timer.current < throttleTime) {
//         return;
//       }
//       timer.current = Date.now();

//       if (baseFeeSwapParams?.isOutGasTokenBalance) {
//         const anotherGasToken = getGasPaymentTokens(chainId).find((token) => {
//           const tokenData = getByKey(tokensData, token);
//           const gasPaymentTokenData = getByKey(tokensData, baseFeeSwapParams.gasPaymentTokenAddress);

//           const usdValue = convertToUsd(
//             baseFeeSwapParams.gasPaymentTokenAmount,
//             gasPaymentTokenData?.decimals,
//             gasPaymentTokenData?.prices.minPrice
//           );

//           const requiredTokenAmount = convertToTokenAmount(usdValue, tokenData?.decimals, tokenData?.prices.minPrice)!;

//           return (
//             tokenData?.address !== baseFeeSwapParams.gasPaymentTokenAddress &&
//             tokenData?.balance !== undefined &&
//             requiredTokenAmount !== undefined &&
//             tokenData.balance > requiredTokenAmount
//           );
//         });

//         if (anotherGasToken) {
//           setGasPaymentTokenAddress(anotherGasToken);
//         }
//       }

//       async function estimateBasTxnData() {
//         if (
//           !tokensData ||
//           !marketsInfoData ||
//           !baseFeeSwapParams ||
//           !signer ||
//           !totalExecutionFee ||
//           !tokenPermits ||
//           !relayerFeeToken ||
//           !provider ||
//           gasPrice === undefined ||
//           !gasLimits ||
//           !orderParams
//         ) {
//           return;
//         }

//         try {
//           const { txnData, oracleParamsPayload } = await getExpressBatchOrderParams({
//             chainId,
//             orderParams,
//             signer,
//             subaccount,
//             tokenPermits,
//             tokensData,
//             marketsInfoData,
//             relayFeeSwapParams: baseFeeSwapParams,
//             emptySignature: true,
//           });

//           const l1Reference = await getL1GasReference(chainId, provider, txnData.callData);

//           console.log("ActualSize", {
//             l1Reference,
//             size: size(txnData.callData),
//           });

//           const gasLimit = await estimateGasLimit(txnData, provider);

//           const _gasLimit = estimateExpressBatchOrderGasLimit({
//             gasLimits,
//             createOrdersCount: orderParams.createOrderParams.length,
//             updateOrdersCount: orderParams.updateOrderParams.length,
//             cancelOrdersCount: orderParams.cancelOrderParams.length,
//             feeSwapsCount: baseFeeSwapParams.feeParams.feeSwapPath.length,
//             externalSwapGasLimit: 0n,
//             oraclePriceCount: oracleParamsPayload.tokens.length,
//             isSubaccount: Boolean(subaccount),
//           });

//           console.log("compare gaslimits", {
//             asyncGasLimit: gasLimit,
//             gasLimit: _gasLimit,
//           });

//           const buffer = gasLimit / 10n;
//           const finalGasLimit = gasLimit + buffer;

//           let feeAmount: bigint;

//           if (sponsoredCallMultiplierFactor !== undefined) {
//             feeAmount = applyFactor(finalGasLimit * gasPrice, sponsoredCallMultiplierFactor);
//           } else {
//             feeAmount = await gelatoRelay.getEstimatedFee(
//               BigInt(chainId),
//               relayerFeeToken.address,
//               finalGasLimit,
//               false
//             );
//           }

//           // FIXME gasless: TEMP DEBUG
//           // eslint-disable-next-line no-console
//           console.log("feeAmount", feeAmount);
//           setRelayerFeeTokenAmount(feeAmount);
//         } catch (error) {
//           const errorData = parseError(error);
//           // TEMP DEBUP
//           // eslint-disable-next-line no-console
//           console.error("gasLimit error", errorData);
//           throw error;
//         }
//       }

//       estimateBasTxnData();
//     },
//     [
//       tokensData,
//       marketsInfoData,
//       baseFeeSwapParams,
//       chainId,
//       orderParams,
//       signer,
//       subaccount,
//       tokenPermits,
//       provider,
//       relayerFeeToken,
//       totalExecutionFee,
//       enabled,
//       setGasPaymentTokenAddress,
//       gasPrice,
//       sponsoredCallMultiplierFactor,
//       gasLimits,
//     ]
//   );

//   const finalRelayFeeSwapParams = useRelayerFeeSwapParams({
//     chainId,
//     account,
//     relayerFeeTokenAmount,
//     executionFeeAmount: totalExecutionFee?.totalExecutionFeeAmount,
//     relayerFeeToken: relayerFeeToken,
//     gasPaymentToken: gasPaymentToken,
//     isSubaccount: Boolean(subaccount),
//     enabled,
//   });

//   return useMemo(() => {
//     if (!orderParams || !baseFeeSwapParams || !tokensData || !marketsInfoData || !finalRelayFeeSwapParams) {
//       return {
//         needGasPaymentTokenApproval: Boolean(baseFeeSwapParams?.needGasPaymentTokenApproval),
//         expressParams: undefined,
//       };
//     }

//     const feeOracleParams = getOraclePriceParamsForRelayFee({
//       chainId,
//       relayFeeParams: finalRelayFeeSwapParams,
//       tokensData,
//       marketsInfoData,
//     });

//     const ordersOracleParams = getOraclePriceParamsForOrders({
//       chainId,
//       createOrderParams: orderParams.createOrderParams,
//       marketsInfoData,
//       tokensData,
//     });

//     const oracleParamsPayload = getOracleParamsPayload([...feeOracleParams, ...ordersOracleParams]);

//     const relayParamsPayload: Omit<RelayParamsPayload, "deadline" | "userNonce"> = {
//       oracleParams: oracleParamsPayload,
//       tokenPermits: tokenPermits ?? [],
//       externalCalls: finalRelayFeeSwapParams.externalCalls,
//       fee: finalRelayFeeSwapParams.feeParams,
//     };

//     return {
//       needGasPaymentTokenApproval: finalRelayFeeSwapParams.needGasPaymentTokenApproval,
//       expressParams: {
//         subaccount,
//         relayParamsPayload,
//         relayFeeParams: finalRelayFeeSwapParams,
//         needGasPaymentTokenApproval: baseFeeSwapParams.needGasPaymentTokenApproval,
//         isSponsoredCall: sponsoredCallMultiplierFactor !== undefined,
//       },
//     };
//   }, [
//     orderParams,
//     baseFeeSwapParams,
//     tokensData,
//     marketsInfoData,
//     finalRelayFeeSwapParams,
//     chainId,
//     tokenPermits,
//     sponsoredCallMultiplierFactor,
//     subaccount,
//   ]);
// }

// function useRelayerFeeSwapParams({
//   chainId,
//   account,
//   relayerFeeTokenAmount,
//   executionFeeAmount,
//   relayerFeeToken,
//   gasPaymentToken,
//   isSubaccount,
//   enabled,
// }: {
//   chainId: number;
//   account: string | undefined;
//   relayerFeeTokenAmount: bigint | undefined;
//   executionFeeAmount: bigint | undefined;
//   relayerFeeToken: TokenData | undefined;
//   gasPaymentToken: TokenData | undefined;
//   isSubaccount: boolean;
//   enabled: boolean;
// }) {
//   const tokensData = useSelector(selectTokensData);
//   const slippage = useSelector(selectSavedAllowedSlippage);
//   const gasPrice = useSelector(selectGasPrice);

//   const findSwapPath = useSelector(makeSelectFindSwapPath(gasPaymentToken?.address, relayerFeeToken?.address, true));

//   const totalNetworkFeeAmount =
//     relayerFeeTokenAmount !== undefined && executionFeeAmount !== undefined
//       ? relayerFeeTokenAmount + executionFeeAmount
//       : undefined;

//   const internalSwapAmounts = useMemo(() => {
//     if (!findSwapPath || !gasPaymentToken || !relayerFeeToken || totalNetworkFeeAmount === undefined || !enabled) {
//       return undefined;
//     }

//     return getSwapAmountsByToValue({
//       tokenIn: gasPaymentToken,
//       tokenOut: relayerFeeToken,
//       amountOut: totalNetworkFeeAmount,
//       isLimit: false,
//       findSwapPath,
//       uiFeeFactor: 0n,
//     });
//   }, [enabled, findSwapPath, gasPaymentToken, relayerFeeToken, totalNetworkFeeAmount]);

//   const approximateGasPaymentTokenAmountForExternalSwap = useMemo(() => {
//     if (!gasPaymentToken || !relayerFeeToken || totalNetworkFeeAmount === undefined || !enabled) {
//       return undefined;
//     }

//     const relayerFeeUsd = convertToUsd(
//       totalNetworkFeeAmount,
//       relayerFeeToken.decimals,
//       relayerFeeToken.prices.maxPrice
//     );

//     let gasPaymentTokenAmount = convertToTokenAmount(
//       relayerFeeUsd,
//       gasPaymentToken.decimals,
//       gasPaymentToken.prices.minPrice
//     );

//     if (gasPaymentTokenAmount === undefined || !gasPaymentToken) {
//       return undefined;
//     }

//     // avoid re-fetch on small changes
//     return roundBigIntToDecimals(gasPaymentTokenAmount, gasPaymentToken.decimals, 2);
//   }, [enabled, gasPaymentToken, relayerFeeToken, totalNetworkFeeAmount]);

//   const { externalSwapOutput } = useExternalSwapOutputRequest({
//     chainId,
//     tokensData,
//     slippage,
//     gasPrice,
//     tokenInAddress: gasPaymentToken?.address,
//     tokenOutAddress: relayerFeeToken?.address,
//     amountIn: approximateGasPaymentTokenAmountForExternalSwap,
//     receiverAddress: getContract(chainId, isSubaccount ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"),
//     enabled: false,
//   });

//   const gasPaymentAllowanceData = useGasPaymentTokenAllowanceData(chainId, gasPaymentToken?.address);

//   return useMemo(() => {
//     if (
//       !account ||
//       relayerFeeTokenAmount === undefined ||
//       !tokensData ||
//       !relayerFeeToken ||
//       !gasPaymentToken ||
//       totalNetworkFeeAmount === undefined ||
//       !gasPaymentAllowanceData
//     ) {
//       return undefined;
//     }

//     return getRelayerFeeSwapParams({
//       chainId,
//       account,
//       relayerFeeTokenAmount,
//       totalNetworkFeeAmount,
//       relayerFeeTokenAddress: relayerFeeToken.address,
//       gasPaymentTokenAddress: gasPaymentToken.address,
//       internalSwapAmounts,
//       externalSwapQuote: externalSwapOutput,
//       tokensData,
//       gasPaymentAllowanceData: gasPaymentAllowanceData,
//     });
//   }, [
//     account,
//     chainId,
//     externalSwapOutput,
//     gasPaymentToken,
//     internalSwapAmounts,
//     gasPaymentAllowanceData,
//     relayerFeeToken,
//     relayerFeeTokenAmount,
//     tokensData,
//     totalNetworkFeeAmount,
//   ]);
// }

// export function useGasPaymentTokenAllowanceData(chainId: number, gasPaymentTokenAddress: string | undefined) {
//   const { tokensAllowanceData, isLoaded: isTokensAllowanceDataLoaded } = useTokensAllowanceData(chainId, {
//     spenderAddress: getContract(chainId, "SyntheticsRouter"),
//     tokenAddresses: gasPaymentTokenAddress ? [convertTokenAddress(chainId, gasPaymentTokenAddress, "wrapped")] : [],
//   });

//   return isTokensAllowanceDataLoaded ? tokensAllowanceData : undefined;
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

//     const baseRelayFeeSwapParams = getRelayerFeeSwapParams({
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

//     if (!baseRelayFeeSwapParams || baseRelayFeeSwapParams.needGasPaymentTokenApproval) {
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
//       relayFeeSwapParams: baseRelayFeeSwapParams,
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

//     const finalRelayFeeSwapParams = getRelayerFeeSwapParams({
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

//     if (!finalRelayFeeSwapParams) {
//       return undefined;
//     }

//     const feeOracleParams = getOraclePriceParamsForRelayFee({
//       chainId,
//       relayFeeParams: finalRelayFeeSwapParams,
//       tokensData,
//       marketsInfoData,
//     });

//     const oracleParamsPayload = getOracleParamsPayload(feeOracleParams);

//     const relayParamsPayload: Omit<RelayParamsPayload, "deadline" | "userNonce"> = {
//       oracleParams: oracleParamsPayload,
//       tokenPermits: [],
//       externalCalls: finalRelayFeeSwapParams.externalCalls,
//       fee: finalRelayFeeSwapParams.feeParams,
//     };

//     return {
//       subaccount,
//       relayParamsPayload,
//       relayFeeParams: finalRelayFeeSwapParams,
//       needGasPaymentTokenApproval:
//         baseRelayFeeSwapParams.needGasPaymentTokenApproval || finalRelayFeeSwapParams.needGasPaymentTokenApproval,
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
