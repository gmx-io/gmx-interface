// export async function getExpressBatchOrderParams({
//   chainId,
//   relayFeeSwapParams,
//   orderParams,
//   signer,
//   settlementChainClient,
//   subaccount,
//   tokenPermits,
//   tokensData,
//   marketsInfoData,
//   emptySignature = false,
// }: {
//   chainId: UiContractsChain;
//   relayFeeSwapParams: RelayFeeSwapParams;
//   orderParams: BatchOrderTxnParams;
//   signer: Signer;
//   settlementChainClient?: PublicClient;
//   subaccount: Subaccount | undefined;
//   tokenPermits: SignedTokenPermit[];
//   tokensData: TokensData;
//   marketsInfoData: MarketsInfoData;
//   emptySignature?: boolean;
// }) {
//   const feeOracleParams = getOraclePriceParamsForRelayFee({
//     chainId,
//     relayFeeParams: relayFeeSwapParams,
//     tokensData,
//     marketsInfoData,
//   });

import { Signer } from "ethers";
import { encodeFunctionData } from "viem";

import { UiSettlementChain, UiSourceChain } from "config/chains";
import {
  MultichainRelayParamsPayload,
  hashRelayParamsMultichain,
  getGelatoRelayRouterDomain,
} from "domain/synthetics/express";
import { signTypedData } from "lib/wallets/signing";
import { getContract } from "sdk/configs/contracts";
import { RelayUtils } from "typechain-types-arbitrum-sepolia/MultichainTransferRouter";
import { multichainTransferRouterAbi } from "wagmi-generated";

//   const ordersOracleParams = getOraclePriceParamsForOrders({
//     chainId,
//     createOrderParams: orderParams.createOrderParams,
//     marketsInfoData,
//     tokensData,
//   });

//   const oracleParamsPayload = getOracleParamsPayload([...feeOracleParams, ...ordersOracleParams]);

//   const txnData = await buildAndSignExpressBatchOrderTxn({
//     signer,
//     settlementChainClient,
//     chainId,
//     relayFeeParams: relayFeeSwapParams,
//     relayParamsPayload: {
//       oracleParams: oracleParamsPayload,
//       tokenPermits: tokenPermits ?? [],
//       externalCalls: relayFeeSwapParams.externalCalls,
//       fee: relayFeeSwapParams.feeParams,
//     },
//     batchParams: orderParams,
//     subaccount,
//     emptySignature,
//   });

//   return txnData;
// }

// export async function buildAndSignExpressUpdateOrderTxn({
//   chainId,
//   relayParamsPayload,
//   relayFeeParams,
//   subaccount,
//   signer,
//   orderKey,
//   increaseExecutionFee,
//   updateOrderParams,
// }: {
//   chainId: UiContractsChain;
//   relayParamsPayload: Omit<RelayParamsPayload, "deadline">;
//   relayFeeParams: RelayFeeSwapParams;
//   subaccount: Subaccount | undefined;
//   signer: Signer;
//   orderKey: string;
//   increaseExecutionFee: boolean;
//   updateOrderParams: UpdateOrderPayload;
// }) {
//   const finalRelayParamsPayload = {
//     ...relayParamsPayload,
//     deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
//   };

//   const params = {
//     signer: subaccount?.signer ?? signer,
//     account: await signer.getAddress(),
//     chainId,
//     orderKey,
//     updateOrderParams,
//     increaseExecutionFee,
//     relayParams: finalRelayParamsPayload,
//     subaccountApproval: subaccount?.signedApproval,
//   };

//   const signature = await signUpdateOrderPayload(params);

//   const updateOrderCallData = params.subaccountApproval
//     ? encodeFunctionData({
//         abi: SubaccountGelatoRelayRouterAbi.abi,
//         functionName: "updateOrder",
//         args: [
//           { ...params.relayParams, signature },
//           params.subaccountApproval,
//           params.account,
//           params.subaccountApproval.subaccount,
//           orderKey,
//           updateOrderParams,
//           increaseExecutionFee,
//         ],
//       })
//     : encodeFunctionData({
//         abi: GelatoRelayRouterAbi.abi,
//         functionName: "updateOrder",
//         args: [{ ...params.relayParams, signature }, params.account, orderKey, updateOrderParams, increaseExecutionFee],
//       });

//   return {
//     callData: updateOrderCallData,
//     contractAddress: getContract(
//       chainId,
//       params.subaccountApproval ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"
//     ),
//     feeToken: relayFeeParams.relayerTokenAddress,
//     feeAmount: relayFeeParams.relayerTokenAmount,
//   };
// }

// export async function buildAndSignExpressCancelOrderTxn({
//   chainId,
//   relayParamsPayload,
//   relayFeeParams,
//   subaccount,
//   signer,

//   orderKey,
// }: {
//   chainId: number;
//   subaccount: Subaccount | undefined;
//   signer: Signer;
//   relayParamsPayload: Omit<RelayParamsPayload, "deadline">;
//   relayFeeParams: RelayFeeSwapParams;
//   orderKey: string;
// }) {
//   const finalRelayParamsPayload = {
//     ...relayParamsPayload,
//     deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
//   };

//   const params = {
//     signer: subaccount?.signer ?? signer,
//     account: await signer.getAddress(),
//     chainId,
//     orderKey,
//     relayParams: finalRelayParamsPayload,
//     subaccountApproval: subaccount?.signedApproval,
//   };

//   const signature = await signCancelOrderPayload(params);

//   const cancelOrderCallData = encodeFunctionData({
//     abi: GelatoRelayRouterAbi.abi,
//     functionName: "cancelOrder",
//     args: [relayParamsPayload, orderKey, signature],
//   });

//   return {
//     callData: cancelOrderCallData,
//     contractAddress: getContract(chainId, "GelatoRelayRouter"),
//     feeToken: relayFeeParams.relayerTokenAddress,
//     feeAmount: relayFeeParams.relayerTokenAmount,
//   };
// }

// export type ExpressTxnData = {
//   callData: string;
//   contractAddress: string;
//   feeToken: string;
//   feeAmount: bigint;
// };

// export async function buildAndSignExpressCreateOrderTxn({
//   chainId,
//   relayFeeParams,
//   relayParamsPayload,
//   orderPayload,
//   subaccount,
//   signer,
//   emptySignature = false,
// }: {
//   chainId: number;
//   relayFeeParams: RelayFeeSwapParams;
//   relayParamsPayload: Omit<RelayParamsPayload, "deadline">;
//   orderPayload: CreateOrderPayload;
//   subaccount: Subaccount | undefined;
//   signer: Signer;
//   emptySignature?: boolean;
// }) {
//   const finalRelayParamsPayload = {
//     ...relayParamsPayload,
//     deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
//   };

//   const params = {
//     signer: subaccount?.signer ?? signer,
//     chainId,
//     relayPayload: finalRelayParamsPayload,
//     orderPayload: orderPayload,
//     subaccountApproval: subaccount?.signedApproval,
//   };

//   const signature = emptySignature ? "0x" : await signExpressOrderPayload(params);

//   const createOrderCallData =
//     params.subaccountApproval !== undefined
//       ? encodeFunctionData({
//           abi: SubaccountGelatoRelayRouterAbi.abi,
//           functionName: "createOrder",
//           args: [
//             { ...relayParamsPayload, signature },
//             params.subaccountApproval,
//             params.orderPayload.addresses.receiver,
//             params.subaccountApproval.subaccount,
//             params.orderPayload.numbers.initialCollateralDeltaAmount,
//             params.orderPayload,
//           ],
//         })
//       : encodeFunctionData({
//           abi: GelatoRelayRouterAbi.abi,
//           functionName: "createOrder",
//           args: [
//             { ...params.relayPayload, signature },
//             params.orderPayload.addresses.receiver,
//             params.orderPayload.numbers.initialCollateralDeltaAmount,
//             params.orderPayload,
//           ],
//         });

//   const relayRouterAddress = getContract(
//     chainId,
//     params.subaccountApproval ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"
//   );

//   return {
//     callData: createOrderCallData,
//     contractAddress: relayRouterAddress,
//     feeToken: relayFeeParams.relayerTokenAddress,
//     feeAmount: relayFeeParams.relayerTokenAmount,
//   };
// }

// export async function buildAndSignRemoveSubaccountTxn({
//   chainId,
//   relayParamsPayload,
//   subaccount,
//   signer,
// }: {
//   chainId: UiContractsChain;
//   relayParamsPayload: RelayParamsPayload;
//   subaccount: Subaccount;
//   signer: Signer;
// }) {
//   const signature = await signRemoveSubaccountPayload({
//     signer,
//     relayParams: relayParamsPayload,
//     subaccountAddress: subaccount.address,
//     chainId,
//   });

//   const removeSubaccountCallData = encodeFunctionData({
//     abi: SubaccountGelatoRelayRouterAbi.abi,
//     functionName: "removeSubaccount",
//     args: [{ ...relayParamsPayload, signature }, await signer.getAddress(), subaccount.address],
//   });

//   return {
//     callData: removeSubaccountCallData,
//     contractAddress: getContract(chainId, "SubaccountGelatoRelayRouter"),
//     feeToken: relayParamsPayload.fee.feeToken,
//     feeAmount: relayParamsPayload.fee.feeAmount,
//   };
// }
// >>>>>>> Stashed changes

export async function buildAndSignBridgeOutTxn({
  chainId,
  relayParamsPayload,
  params,
  signer,
}: {
  chainId: UiSettlementChain;
  relayParamsPayload: MultichainRelayParamsPayload;
  params: RelayUtils.BridgeOutParamsStruct;
  signer: Signer;
}) {
  const [address, srcChainId] = await Promise.all([
    signer.getAddress(),
    signer.provider!.getNetwork().then((n) => Number(n.chainId) as UiSourceChain),
  ]);

  const signature = await signBridgeOutPayload({
    relayParams: relayParamsPayload,
    params,
    signer,
    chainId,
    srcChainId,
  });

  const bridgeOutCallData = encodeFunctionData({
    abi: multichainTransferRouterAbi,
    functionName: "bridgeOut",
    args: [
      {
        ...relayParamsPayload,
        signature,
        desChainId: chainId,
      } satisfies RelayUtils.RelayParamsStruct,
      address,
      srcChainId,
      params,
    ],
  });

  return {
    callData: bridgeOutCallData,
    contractAddress: getContract(chainId, "MultichainTransferRouter"),
    feeToken: relayParamsPayload.fee.feeToken,
    feeAmount: relayParamsPayload.fee.feeAmount,
  };
}

// <<<<<<< Updated upstream
// =======
// export type RelayFeeSwapParams = {
//   feeParams: RelayFeePayload;
//   externalCalls: ExternalCallsPayload;
//   relayerTokenAddress: string;
//   relayerTokenAmount: bigint;
//   totalNetworkFeeAmount: bigint;
//   gasPaymentTokenAmount: bigint;
//   gasPaymentTokenAddress: string;
//   isOutGasTokenBalance: boolean;
//   needGasPaymentTokenApproval: boolean;
// };

// export function getRelayerFeeSwapParams({
//   chainId,
//   account,
//   relayerFeeTokenAmount,
//   relayerFeeTokenAddress,
//   gasPaymentTokenAddress,
//   totalNetworkFeeAmount,
//   internalSwapAmounts,
//   externalSwapQuote,
//   tokensData,
//   gasPaymentAllowanceData,
// }: {
//   chainId: number;
//   account: string;
//   relayerFeeTokenAmount: bigint;
//   totalNetworkFeeAmount: bigint;
//   relayerFeeTokenAddress: string;
//   gasPaymentTokenAddress: string;
//   internalSwapAmounts: SwapAmounts | undefined;
//   externalSwapQuote: ExternalSwapOutput | undefined;
//   tokensData: TokensData;
//   gasPaymentAllowanceData: TokensAllowanceData;
// }): RelayFeeSwapParams | undefined {
//   let feeParams: RelayFeePayload;
//   let externalCalls: ExternalCallsPayload;

//   let gasPaymentTokenAmount: bigint;

//   const isExternalSwapBetter =
//     externalSwapQuote?.usdOut &&
//     (getSwapDebugSettings()?.forceExternalSwaps ||
//       internalSwapAmounts?.usdOut === undefined ||
//       externalSwapQuote.usdOut > internalSwapAmounts.usdOut);

//   if (gasPaymentTokenAddress === relayerFeeTokenAddress) {
//     externalCalls = {
//       externalCallTargets: [],
//       externalCallDataList: [],
//       refundReceivers: [],
//       refundTokens: [],
//       sendTokens: [],
//       sendAmounts: [],
//     } as ExternalCallsPayload;
//     feeParams = {
//       feeToken: relayerFeeTokenAddress,
//       feeAmount: totalNetworkFeeAmount,
//       feeSwapPath: [],
//     };
//     gasPaymentTokenAmount = totalNetworkFeeAmount;
//   } else if (isExternalSwapBetter) {
//     externalCalls = getExternalCallsPayload({
//       chainId,
//       account,
//       quote: externalSwapQuote,
//     });
//     feeParams = {
//       feeToken: externalSwapQuote.outTokenAddress, // final token
//       feeAmount: 0n, // fee already sent in external calls
//       feeSwapPath: [],
//     };
//     gasPaymentTokenAmount = externalSwapQuote.amountIn;
//     totalNetworkFeeAmount = externalSwapQuote.amountOut;
//   } else if (internalSwapAmounts?.swapPathStats) {
//     feeParams = {
//       feeToken: internalSwapAmounts.swapPathStats.tokenInAddress,
//       feeAmount: internalSwapAmounts.amountIn,
//       feeSwapPath: internalSwapAmounts.swapPathStats.swapPath,
//     };
//     externalCalls = {
//       externalCallTargets: [],
//       externalCallDataList: [],
//       refundReceivers: [],
//       refundTokens: [],
//       sendTokens: [],
//       sendAmounts: [],
//     } as ExternalCallsPayload;
//     totalNetworkFeeAmount = internalSwapAmounts.amountOut;
//     gasPaymentTokenAmount = internalSwapAmounts.amountIn;
//     gasPaymentTokenAddress = internalSwapAmounts.swapPathStats.tokenInAddress;
//   } else {
//     // console.log("getRelayerFeeSwapParams is undefined", {
//     //   gasPaymentTokenAddress,
//     //   relayerFeeTokenAddress,
//     // });

//     return undefined;
//   }

//   const gasPaymentToken = getByKey(tokensData, gasPaymentTokenAddress);
//   const isOutGasTokenBalance =
//     gasPaymentToken?.balance === undefined || gasPaymentTokenAmount > gasPaymentToken.balance;

//   const needGasPaymentTokenApproval = getNeedTokenApprove(
//     gasPaymentAllowanceData,
//     gasPaymentTokenAddress,
//     gasPaymentTokenAmount
//   );

//   return {
//     feeParams,
//     externalCalls,
//     relayerTokenAddress: getRelayerFeeToken(chainId).address,
//     relayerTokenAmount: relayerFeeTokenAmount,
//     totalNetworkFeeAmount,
//     gasPaymentTokenAmount,
//     isOutGasTokenBalance,
//     needGasPaymentTokenApproval,
//     gasPaymentTokenAddress,
//   };
// }

// async function signCancelOrderPayload({
//   signer,
//   relayParams,
//   subaccountApproval,
//   account,
//   orderKey,
//   chainId,
// }: {
//   signer: Signer;
//   relayParams: RelayParamsPayload;
//   subaccountApproval: SignedSubbacountApproval | undefined;
//   account: Address;
//   orderKey: string;
//   chainId: UiContractsChain;
// }) {
//   const srcChainId = await getMultichainInfoFromSigner(signer, chainId);
//   const relayRouterAddress = getOrderRelayRouterAddress(
//     chainId,
//     subaccountApproval !== undefined,
//     srcChainId !== undefined
//   );

//   const types = {
//     CancelOrder: [
//       { name: "account", type: "address" },
//       { name: "key", type: "bytes32" },
//       { name: "relayParams", type: "bytes32" },
//       subaccountApproval ? { name: "subaccountApproval", type: "bytes32" } : undefined,
//     ].filter((type) => type !== undefined),
//   };

//   const domain = getGelatoRelayRouterDomain(chainId, relayRouterAddress, subaccountApproval !== undefined, srcChainId);

//   const typedData = {
//     account,
//     key: orderKey,
//     relayParams: srcChainId
//       ? hashRelayParamsMultichain({ ...relayParams, desChainId: BigInt(chainId) })
//       : hashRelayParams(relayParams),
//     subaccountApproval: subaccountApproval ? hashSubaccountApproval(subaccountApproval) : undefined,
//   };

//   return signTypedData(signer, domain, types, typedData);
// }

// // export async function signExpressOrderPayload({
// //   signer,
// //   relayPayload: relayParams,
// //   subaccountApproval,
// //   orderPayload,
// //   chainId,
// // }: {
// //   signer: Signer;
// //   relayPayload: RelayParamsPayload;
// //   orderPayload: CreateOrderPayload;
// //   subaccountApproval: SignedSubbacountApproval | undefined;
// //   chainId: UiContractsChain;
// // }) {
// //   const srcChainId = await getMultichainInfoFromSigner(signer, chainId);
// //   const relayRouterAddress = getOrderRelayRouterAddress(
// //     chainId,
// //     subaccountApproval !== undefined,
// //     srcChainId !== undefined
// //   );

// //   const types = {
// //     CreateOrder: [
// //       { name: "collateralDeltaAmount", type: "uint256" },
// //       subaccountApproval ? { name: "account", type: "address" } : undefined,
// //       { name: "addresses", type: "CreateOrderAddresses" },
// //       { name: "numbers", type: "CreateOrderNumbers" },
// //       { name: "orderType", type: "uint256" },
// //       { name: "decreasePositionSwapType", type: "uint256" },
// //       { name: "isLong", type: "bool" },
// //       { name: "shouldUnwrapNativeToken", type: "bool" },
// //       { name: "autoCancel", type: "bool" },
// //       { name: "referralCode", type: "bytes32" },
// //       { name: "relayParams", type: "bytes32" },
// //       subaccountApproval ? { name: "subaccountApproval", type: "bytes32" } : undefined,
// //     ].filter((type) => type !== undefined),

// //     CreateOrderAddresses: [
// //       { name: "receiver", type: "address" },
// //       { name: "cancellationReceiver", type: "address" },
// //       { name: "callbackContract", type: "address" },
// //       { name: "uiFeeReceiver", type: "address" },
// //       { name: "market", type: "address" },
// //       { name: "initialCollateralToken", type: "address" },
// //       { name: "swapPath", type: "address[]" },
// //     ],

// //     CreateOrderNumbers: [
// //       { name: "sizeDeltaUsd", type: "uint256" },
// //       { name: "initialCollateralDeltaAmount", type: "uint256" },
// //       { name: "triggerPrice", type: "uint256" },
// //       { name: "acceptablePrice", type: "uint256" },
// //       { name: "executionFee", type: "uint256" },
// //       { name: "callbackGasLimit", type: "uint256" },
// //       { name: "minOutputAmount", type: "uint256" },
// //       { name: "validFromTime", type: "uint256" },
// //     ],
// //   };

// //   const typedData = {
// //     collateralDeltaAmount: orderPayload.numbers.initialCollateralDeltaAmount,
// //     account: orderPayload.addresses.receiver,
// //     addresses: orderPayload.addresses,
// //     numbers: orderPayload.numbers,
// //     orderType: orderPayload.orderType,
// //     decreasePositionSwapType: orderPayload.decreasePositionSwapType,
// //     isLong: orderPayload.isLong,
// //     shouldUnwrapNativeToken: orderPayload.shouldUnwrapNativeToken,
// //     autoCancel: orderPayload.autoCancel || false,
// //     referralCode: orderPayload.referralCode,
// //     relayParams: srcChainId
// //       ? hashRelayParamsMultichain({ ...relayParams, desChainId: BigInt(chainId) })
// //       : hashRelayParams(relayParams),
// //     subaccountApproval: subaccountApproval ? hashSubaccountApproval(subaccountApproval) : undefined,
// //   };

// //   const domain = getGelatoRelayRouterDomain(chainId, relayRouterAddress, subaccountApproval !== undefined, srcChainId);

// //   return signTypedData(signer, domain, types, typedData);
// // }

// // async function signRemoveSubaccountPayload({
// //   signer,
// //   relayParams,
// //   subaccountAddress,
// //   chainId,
// // }: {
// //   signer: Signer;
// //   relayParams: RelayParamsPayload;
// //   subaccountAddress: string;
// //   chainId: UiContractsChain;
// // }) {
// //   const srcChainId = await getMultichainInfoFromSigner(signer, chainId);
// //   const relayRouterAddress = getOrderRelayRouterAddress(
// //     chainId,
// //     // isSubaccount
// //     true,
// //     srcChainId !== undefined
// //   );

// //   const types = {
// //     RemoveSubaccount: [
// //       { name: "subaccount", type: "address" },
// //       { name: "relayParams", type: "bytes32" },
// //     ],
// //   };

// //   const domain = getGelatoRelayRouterDomain(
// //     chainId,
// //     relayRouterAddress,
// //     // isSubaccount
// //     true,
// //     srcChainId
// //   );

// //   const typedData = {
// //     subaccountAddress,
// //     relayParams: srcChainId
// //       ? hashRelayParamsMultichain({ ...relayParams, desChainId: BigInt(chainId) })
// //       : hashRelayParams(relayParams),
// //   };

// //   return signTypedData(signer, domain, types, typedData);
// // }

// >>>>>>> Stashed changes
async function signBridgeOutPayload({
  signer,
  relayParams,
  params,
  chainId,
  srcChainId,
}: {
  signer: Signer;
  relayParams: MultichainRelayParamsPayload;
  params: RelayUtils.BridgeOutParamsStruct;
  chainId: UiSettlementChain;
  srcChainId: UiSourceChain;
}): Promise<string> {
  if (relayParams.userNonce === undefined) {
    throw new Error("userNonce is required");
  }

  const types = {
    BridgeOut: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "provider", type: "address" },
      { name: "data", type: "bytes" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  const typedData = {
    token: params.token,
    amount: params.amount,
    provider: params.provider,
    data: params.data,
    relayParams: hashRelayParamsMultichain(relayParams),
  };

  const domain = getGelatoRelayRouterDomain(
    chainId,
    getContract(chainId, "MultichainTransferRouter"),
    false,
    srcChainId
  );

  return signTypedData({ signer, domain, types, typedData });
}
// <<<<<<< Updated upstream
// =======

// export async function sendExpressTxn(p: {
//   chainId: number;
//   txnData: {
//     callData: string;
//     contractAddress: string;
//     feeToken: string;
//     feeAmount: bigint;
//   };
//   isSponsoredCall: boolean;
// }) {
//   const data = encodePacked(
//     ["bytes", "address", "address", "uint256"],
//     [
//       p.txnData.callData as Address,
//       p.txnData.contractAddress as Address,
//       p.txnData.feeToken as Address,
//       p.txnData.feeAmount,
//     ]
//   );

//   let gelatoPromise: Promise<{ taskId: string }> | undefined;

//   if (p.isSponsoredCall) {
//     gelatoPromise = gelatoRelay.sponsoredCall(
//       {
//         chainId: BigInt(p.chainId),
//         target: p.txnData.contractAddress,
//         data,
//       },
//       "FalsQh9loL6V0rwPy4gWgnQPR6uTHfWjSVT2qlTzUq4_"
//     );
//   } else {
//     gelatoPromise = gelatoRelay.callWithSyncFee({
//       chainId: BigInt(p.chainId),
//       target: p.txnData.contractAddress,
//       feeToken: p.txnData.feeToken,
//       isRelayContext: true,
//       data,
//     });
//   }

//   return gelatoPromise.then((res) => {
//     return {
//       taskId: res.taskId,
//       wait: makeExpressTxnResultWaiter(res),
//     };
//   });
// }

// export async function getIsSponsoredCallAllowed() {
//   const gelatoBalance = await fetch(
//     "https://api.gelato.digital/1balance/networks/mainnets/sponsors/0x88FcCAC36031949001Df4bB0b68CBbd07f033161"
//   );

//   const gelatoBalanceData = await gelatoBalance.json();

//   const mainBalance = gelatoBalanceData.sponsor.mainBalance;
//   const mainBalanceToken = mainBalance.token;
//   const remainingBalance = BigInt(mainBalance.remainingBalance);

//   return remainingBalance > expandDecimals(10, Number(mainBalanceToken.decimals));
// }

// // TODO: Tests
// function makeExpressTxnResultWaiter(res: { taskId: string }) {
//   return async () => {
//     const pollInterval = 500;
//     const maxAttempts = 60;
//     let attempts = 0;

//     while (attempts < maxAttempts) {
//       const status = await gelatoRelay.getTaskStatus(res.taskId);

//       const result = {
//         status: {
//           taskId: res.taskId,
//           taskState: status?.taskState,
//           lastCheckMessage: status?.lastCheckMessage,
//           creationDate: status?.creationDate,
//           executionDate: status?.executionDate,
//           chainId: status?.chainId,
//         },
//         receipt: status?.transactionHash
//           ? {
//               transactionHash: status.transactionHash,
//               blockNumber: status.blockNumber!,
//               status: status.taskState === "ExecSuccess" ? 1 : 0,
//               gasUsed: status.gasUsed ? BigInt(status.gasUsed) : undefined,
//               effectiveGasPrice: status.effectiveGasPrice ? BigInt(status.effectiveGasPrice) : undefined,
//               chainId: status.chainId,
//               timestamp: status.executionDate ? new Date(status.executionDate).getTime() : undefined,
//             }
//           : undefined,
//       };

//       switch (status?.taskState) {
//         case "ExecSuccess":
//         case "ExecReverted":
//         case "Cancelled":
//           return result;

//         case "CheckPending":
//         case "ExecPending":
//         case "WaitingForConfirmation":
//         default:
//           await new Promise((resolve) => setTimeout(resolve, pollInterval));
//           attempts++;
//           continue;
//       }
//     }

//     const timeoutStatus = await gelatoRelay.getTaskStatus(res.taskId);
//     const result = {
//       status: {
//         taskId: res.taskId,
//         taskState: "Timeout",
//         lastCheckMessage: "Transaction timeout - exceeded maximum wait time",
//         creationDate: timeoutStatus?.creationDate,
//         executionDate: timeoutStatus?.executionDate,
//         chainId: timeoutStatus?.chainId,
//       },
//       receipt: timeoutStatus?.transactionHash
//         ? {
//             transactionHash: timeoutStatus.transactionHash,
//             blockNumber: timeoutStatus.blockNumber!,
//             status: 0,
//             gasUsed: timeoutStatus.gasUsed ? BigInt(timeoutStatus.gasUsed) : undefined,
//             effectiveGasPrice: timeoutStatus.effectiveGasPrice ? BigInt(timeoutStatus.effectiveGasPrice) : undefined,
//             chainId: timeoutStatus.chainId,
//             timestamp: timeoutStatus.executionDate ? new Date(timeoutStatus.executionDate).getTime() : undefined,
//           }
//         : undefined,
//     };

//     return result;
//   };
// }

// async function getMultichainInfoFromSigner(
//   signer: Signer,
//   chainId: UiContractsChain
// ): Promise<UiSourceChain | undefined> {
//   const srcChainId = await signer.provider!.getNetwork().then((n) => Number(n.chainId) as UiSupportedChain);
//   const isMultichain = srcChainId !== chainId;

//   return isMultichain ? (srcChainId as UiSourceChain) : undefined;
// }

// function getOrderRelayRouterAddress(chainId: UiContractsChain, isSubaccount: boolean, isMultichain: boolean) {
//   let contractName: string;
//   if (isMultichain) {
//     if (isSubaccount) {
//       contractName = "MultichainSubaccountRouter";
//     } else {
//       contractName = "MultichainOrderRouter";
//     }
//   } else {
//     if (isSubaccount) {
//       contractName = "SubaccountGelatoRelayRouter";
//     } else {
//       contractName = "GelatoRelayRouter";
//     }
//   }

//   return getContract(chainId, contractName);
// }
// >>>>>>> Stashed changes
