import { Signer } from "ethers";
import { Address, encodeFunctionData, Hex, PublicClient, zeroAddress, zeroHash } from "viem";

import { getContract } from "config/contracts";
import {
  getGelatoRelayRouterDomain,
  getOracleParamsPayload,
  getOraclePriceParamsForOrders,
  getOraclePriceParamsForRelayFee,
  getRelayRouterNonceForMultichain,
  getRelayRouterNonceForSigner,
  hashRelayParams,
  hashRelayParamsMultichain,
  MultichainRelayParamsPayload,
  RelayerFeeParams,
  RelayParamsPayload,
} from "domain/synthetics/express";
import { MarketsInfoData } from "domain/synthetics/markets/types";
import { hashSubaccountApproval, SignedSubbacountApproval, Subaccount } from "domain/synthetics/subaccount";
import { SignedTokenPermit, TokensData } from "domain/tokens";
import { ExpressTxnData } from "lib/transactions/sendExpressTransaction";
import { signTypedData, SignTypedDataParams } from "lib/wallets/signing";
import GelatoRelayRouterAbi from "sdk/abis/GelatoRelayRouter.json";
import SubaccountGelatoRelayRouterAbi from "sdk/abis/SubaccountGelatoRelayRouter.json";
import { UiContractsChain, UiSettlementChain, UiSourceChain, UiSupportedChain } from "sdk/configs/chains";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { BatchOrderTxnParams } from "sdk/utils/orderTransactions";
import { nowInSeconds } from "sdk/utils/time";
import { RelayUtils } from "typechain-types-arbitrum-sepolia/MultichainTransferRouter";
import { multichainOrderRouterAbi, multichainSubaccountRouterAbi, multichainTransferRouterAbi } from "wagmi-generated";

export async function getExpressBatchOrderParams({
  chainId,
  settlementChainClient,
  relayFeeParams,
  orderParams,
  signer,
  subaccount,
  tokenPermits,
  tokensData,
  marketsInfoData,
  emptySignature = false,
}: {
  chainId: UiContractsChain;
  relayFeeParams: RelayerFeeParams;
  orderParams: BatchOrderTxnParams;
  signer: Signer;
  settlementChainClient?: PublicClient;
  subaccount: Subaccount | undefined;
  tokenPermits: SignedTokenPermit[];
  tokensData: TokensData;
  marketsInfoData: MarketsInfoData;
  emptySignature?: boolean;
}) {
  const feeOracleParams = getOraclePriceParamsForRelayFee({
    chainId,
    relayFeeParams,
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
    externalCalls: relayFeeParams.externalCalls,
    fee: relayFeeParams.feeParams,
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
    userNonce: 0n,
  };

  const txnData = await buildAndSignExpressBatchOrderTxn({
    signer,
    settlementChainClient,
    chainId,
    relayFeeParams,
    relayParamsPayload,
    batchParams: orderParams,
    subaccount,
    emptySignature,
  });

  return {
    txnData,
    oracleParamsPayload,
    relayParamsPayload,
  };
}

export async function buildAndSignExpressBatchOrderTxn({
  chainId,
  relayFeeParams,
  relayParamsPayload,
  batchParams,
  subaccount,
  signer,
  emptySignature = false,
  settlementChainClient,
}: {
  signer: Signer;
  chainId: UiContractsChain;
  batchParams: BatchOrderTxnParams;
  relayFeeParams: RelayerFeeParams;
  relayParamsPayload: RelayParamsPayload;
  subaccount: Subaccount | undefined;
  emptySignature?: boolean;
  settlementChainClient?: PublicClient;
}) {
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);
  const signerAddress = (await signer.getAddress()) as Address;
  const mainAccountSigner = signer;
  const subaccountApproval = subaccount?.signedApproval;
  const messageSigner = subaccountApproval ? subaccount!.signer : mainAccountSigner;

  const relayRouterAddress = getOrderRelayRouterAddress(
    chainId,
    subaccountApproval !== undefined,
    srcChainId !== undefined
  );

  const userNonce = srcChainId
    ? await getRelayRouterNonceForMultichain(settlementChainClient!, signerAddress, relayRouterAddress)
    : await getRelayRouterNonceForSigner(chainId, signer, subaccountApproval !== undefined);

  const params = {
    account: (await mainAccountSigner.getAddress()) as Address,
    messageSigner,
    chainId,
    relayPayload: {
      ...relayParamsPayload,
      oracleParams: {
        tokens: [],
        providers: [],
        data: [],
      },
      userNonce,
    },
    paramsLists: getBatchParamsLists(batchParams, srcChainId !== undefined),
    subaccountApproval,
  };

  // const signature: Hex = emptySignature
  //   ? "0x"
  //   : await signTypedData(
  //       await getBatchSignatureParams({
  //         signer: params.messageSigner,
  //         relayParams: params.relayPayload,
  //         batchParams,
  //         chainId,
  //         account: params.account,
  //         subaccountApproval: params.subaccountApproval,
  //         relayRouterAddress,
  //       })
  //     );

  let signature: Hex;
  if (emptySignature) {
    signature = "0x";
  } else {
    const signatureParams = await getBatchSignatureParams({
      signer: params.messageSigner,
      relayParams: params.relayPayload,
      batchParams,
      chainId,
      account: params.account,
      subaccountApproval: params.subaccountApproval,
      relayRouterAddress,
    });
    console.log("signatureParams", batchParams, signatureParams);

    signature = await signTypedData(signatureParams);
  }

  let batchCalldata: Hex;
  if (srcChainId) {
    if (subaccountApproval) {
      batchCalldata = encodeFunctionData({
        abi: multichainSubaccountRouterAbi,
        functionName: "batch",
        args: [
          {
            ...params.relayPayload,
            desChainId: BigInt(chainId),
            signature,
          },
          { ...subaccountApproval, integrationId: "0x" },
          params.account,
          BigInt(srcChainId),
          subaccountApproval.subaccount,
          params.paramsLists,
        ],
      });
    } else {
      batchCalldata = encodeFunctionData({
        abi: multichainOrderRouterAbi,
        functionName: "batch",
        args: [
          {
            ...params.relayPayload,
            desChainId: BigInt(chainId),
            signature,
          },
          params.account,
          BigInt(srcChainId),
          params.paramsLists,
        ],
      });
    }
  } else {
    if (subaccountApproval) {
      batchCalldata = encodeFunctionData({
        abi: SubaccountGelatoRelayRouterAbi.abi,
        functionName: "batch",
        args: [
          { ...params.relayPayload, signature },
          subaccountApproval,
          params.account,
          subaccountApproval.subaccount,
          params.paramsLists,
        ],
      });
    } else {
      batchCalldata = encodeFunctionData({
        abi: GelatoRelayRouterAbi.abi,
        functionName: "batch",
        args: [{ ...params.relayPayload, signature }, params.account, params.paramsLists],
      });
    }
  }

  return {
    callData: batchCalldata,
    to: relayRouterAddress,
    feeToken: relayFeeParams.relayerTokenAddress,
    feeAmount: relayFeeParams.relayerTokenAmount,
  };
}

export async function getBatchSignatureParams({
  signer,
  relayParams,
  batchParams,
  chainId,
  account,
  subaccountApproval,
  relayRouterAddress,
}: {
  account: string;
  subaccountApproval: SignedSubbacountApproval | undefined;
  signer: Signer;
  relayParams: RelayParamsPayload;
  batchParams: BatchOrderTxnParams;
  chainId: UiContractsChain;
  relayRouterAddress: Address;
}): Promise<SignTypedDataParams> {
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);

  const types = {
    Batch: [
      { name: "account", type: "address" },
      { name: "createOrderParamsList", type: "CreateOrderParams[]" },
      { name: "updateOrderParamsList", type: "UpdateOrderParams[]" },
      { name: "cancelOrderKeys", type: "bytes32[]" },
      { name: "relayParams", type: "bytes32" },
      { name: "subaccountApproval", type: "bytes32" },
    ],
    CreateOrderParams: [
      { name: "addresses", type: "CreateOrderAddresses" },
      { name: "numbers", type: "CreateOrderNumbers" },
      { name: "orderType", type: "uint256" },
      { name: "decreasePositionSwapType", type: "uint256" },
      { name: "isLong", type: "bool" },
      { name: "shouldUnwrapNativeToken", type: "bool" },
      { name: "autoCancel", type: "bool" },
      { name: "referralCode", type: "bytes32" },
      srcChainId ? { name: "dataList", type: "bytes32[]" } : undefined,
    ].filter<{ name: string; type: string }>(Boolean as any),
    CreateOrderAddresses: [
      { name: "receiver", type: "address" },
      { name: "cancellationReceiver", type: "address" },
      { name: "callbackContract", type: "address" },
      { name: "uiFeeReceiver", type: "address" },
      { name: "market", type: "address" },
      { name: "initialCollateralToken", type: "address" },
      { name: "swapPath", type: "address[]" },
    ],
    CreateOrderNumbers: [
      { name: "sizeDeltaUsd", type: "uint256" },
      { name: "initialCollateralDeltaAmount", type: "uint256" },
      { name: "triggerPrice", type: "uint256" },
      { name: "acceptablePrice", type: "uint256" },
      { name: "executionFee", type: "uint256" },
      { name: "callbackGasLimit", type: "uint256" },
      { name: "minOutputAmount", type: "uint256" },
      { name: "validFromTime", type: "uint256" },
    ],
    UpdateOrderParams: [
      { name: "key", type: "bytes32" },
      { name: "sizeDeltaUsd", type: "uint256" },
      { name: "acceptablePrice", type: "uint256" },
      { name: "triggerPrice", type: "uint256" },
      { name: "minOutputAmount", type: "uint256" },
      { name: "validFromTime", type: "uint256" },
      { name: "autoCancel", type: "bool" },
      { name: "executionFeeIncrease", type: "uint256" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(chainId, relayRouterAddress, subaccountApproval !== undefined, srcChainId);

  const paramsLists = getBatchParamsLists(batchParams, srcChainId !== undefined);

  const typedData = {
    account: subaccountApproval ? account : zeroAddress,
    createOrderParamsList: paramsLists.createOrderParamsList,
    updateOrderParamsList: paramsLists.updateOrderParamsList,
    cancelOrderKeys: paramsLists.cancelOrderKeys,
    relayParams: srcChainId
      ? hashRelayParamsMultichain({ ...relayParams, desChainId: BigInt(chainId) })
      : hashRelayParams(relayParams),
    subaccountApproval: subaccountApproval ? hashSubaccountApproval(subaccountApproval) : zeroHash,
  };

  return {
    signer,
    types,
    typedData,
    domain,
  };
}

function getBatchParamsLists(batchParams: BatchOrderTxnParams, isMultichain: boolean) {
  return {
    createOrderParamsList: batchParams.createOrderParams.map((p) => ({
      addresses: p.orderPayload.addresses,
      numbers: p.orderPayload.numbers,
      orderType: p.orderPayload.orderType,
      decreasePositionSwapType: p.orderPayload.decreasePositionSwapType,
      isLong: p.orderPayload.isLong,
      shouldUnwrapNativeToken: p.orderPayload.shouldUnwrapNativeToken,
      autoCancel: p.orderPayload.autoCancel,
      referralCode: p.orderPayload.referralCode,
      // TODO add only in multichain
      dataList: isMultichain ? p.orderPayload.dataList : undefined,
    })),
    updateOrderParamsList: batchParams.updateOrderParams.map((p) => ({
      key: p.updatePayload.orderKey,
      sizeDeltaUsd: p.updatePayload.sizeDeltaUsd,
      acceptablePrice: p.updatePayload.acceptablePrice,
      triggerPrice: p.updatePayload.triggerPrice,
      minOutputAmount: p.updatePayload.minOutputAmount,
      validFromTime: p.updatePayload.validFromTime,
      autoCancel: p.updatePayload.autoCancel,
      executionFeeIncrease: p.updatePayload.executionFeeTopUp,
    })),
    cancelOrderKeys: batchParams.cancelOrderParams.map((p) => p.orderKey),
  };
}

export async function getMultichainInfoFromSigner(
  signer: Signer,
  chainId: UiContractsChain
): Promise<UiSourceChain | undefined> {
  const srcChainId = await signer.provider!.getNetwork().then((n) => Number(n.chainId) as UiSupportedChain);
  const isMultichain = srcChainId !== chainId;

  return isMultichain ? (srcChainId as UiSourceChain) : undefined;
}

export function getOrderRelayRouterAddress(
  chainId: UiContractsChain,
  isSubaccount: boolean,
  isMultichain: boolean
): Address {
  let contractName: string;
  if (isMultichain) {
    if (isSubaccount) {
      contractName = "MultichainSubaccountRouter";
    } else {
      contractName = "MultichainOrderRouter";
    }
  } else {
    if (isSubaccount) {
      contractName = "SubaccountGelatoRelayRouter";
    } else {
      contractName = "GelatoRelayRouter";
    }
  }

  return getContract(chainId, contractName);
}

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
}): Promise<ExpressTxnData> {
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
    to: getContract(chainId, "MultichainTransferRouter"),
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
}): Promise<Hex> {
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
