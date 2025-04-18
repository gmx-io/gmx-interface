import { Contract, Provider, Signer } from "ethers";
import { Address, encodeFunctionData, encodePacked, zeroAddress, zeroHash } from "viem";

import { getContract } from "config/contracts";
import { getSwapDebugSettings } from "config/externalSwaps";
import { MarketsInfoData } from "domain/synthetics/markets/types";
import { getNeedTokenApprove } from "domain/synthetics/tokens";
import { ExternalSwapOutput, SwapAmounts } from "domain/synthetics/trade";
import { SignedTokenPermit, TokensAllowanceData, TokensData } from "domain/tokens";
import { expandDecimals } from "lib/numbers";
import { getByKey } from "lib/objects";
import GelatoRelayRouterAbi from "sdk/abis/GelatoRelayRouter.json";
import SubaccountGelatoRelayRouterAbi from "sdk/abis/SubaccountGelatoRelayRouter.json";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION, getRelayerFeeToken } from "sdk/configs/express";
import { RelayFeePayload, RelayParamsPayload } from "sdk/types/expressTransactions";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import {
  BatchOrderTxnParams,
  CreateOrderPayload,
  ExternalCallsPayload,
  getExternalCallsPayload,
  UpdateOrderPayload,
} from "sdk/utils/orderTransactions";
import { nowInSeconds } from "sdk/utils/time";

import {
  getOracleParamsPayload,
  getOraclePriceParamsForOrders,
  getOraclePriceParamsForRelayFee,
} from "./oracleParamsUtils";
import { getGelatoRelayRouterDomain, hashRelayParams } from "./relayParams";
import { signTypedData } from "./signing";
import { hashSubaccountApproval, SignedSubbacountApproval, Subaccount } from "./subaccountUtils";
import { getRelayRouterNonceForSigner } from "./useRelayRouterNonce";

export function getExpressOrdersContract(chainId: number, provider: Provider, isSubaccount: boolean) {
  const contractAddress = isSubaccount
    ? getContract(chainId, "SubaccountGelatoRelayRouter")
    : getContract(chainId, "GelatoRelayRouter");

  const abi = isSubaccount ? SubaccountGelatoRelayRouterAbi.abi : GelatoRelayRouterAbi.abi;

  const contract = new Contract(contractAddress, abi, provider);

  return contract;
}

export async function getExpressBatchOrderParams({
  chainId,
  relayFeeSwapParams,
  orderParams,
  signer,
  subaccount,
  tokenPermits,
  tokensData,
  marketsInfoData,
  emptySignature = false,
}: {
  chainId: number;
  relayFeeSwapParams: RelayFeeSwapParams;
  orderParams: BatchOrderTxnParams;
  signer: Signer;
  subaccount: Subaccount | undefined;
  tokenPermits: SignedTokenPermit[];
  tokensData: TokensData;
  marketsInfoData: MarketsInfoData;
  emptySignature?: boolean;
}) {
  const feeOracleParams = getOraclePriceParamsForRelayFee({
    chainId,
    relayFeeParams: relayFeeSwapParams,
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

  const txnData = await buildAndSignExpressBatchOrderTxn({
    signer,
    chainId,
    relayFeeParams: relayFeeSwapParams,
    relayParamsPayload: {
      oracleParams: oracleParamsPayload,
      tokenPermits: tokenPermits ?? [],
      externalCalls: relayFeeSwapParams.externalCalls,
      fee: relayFeeSwapParams.feeParams,
    },
    batchParams: orderParams,
    subaccount,
    emptySignature,
  });

  return txnData;
}

export async function buildAndSignExpressUpdateOrderTxn({
  chainId,
  relayParamsPayload,
  relayFeeParams,
  subaccount,
  signer,
  orderKey,
  increaseExecutionFee,
  updateOrderParams,
}: {
  chainId: number;
  relayParamsPayload: Omit<RelayParamsPayload, "deadline">;
  relayFeeParams: RelayFeeSwapParams;
  subaccount: Subaccount | undefined;
  signer: Signer;
  orderKey: string;
  increaseExecutionFee: boolean;
  updateOrderParams: UpdateOrderPayload;
}) {
  const finalRelayParamsPayload = {
    ...relayParamsPayload,
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
  };

  const params = {
    signer: subaccount?.signer ?? signer,
    account: await signer.getAddress(),
    chainId,
    orderKey,
    updateOrderParams,
    increaseExecutionFee,
    relayParams: finalRelayParamsPayload,
    subaccountApproval: subaccount?.signedApproval,
  };

  const signature = await signUpdateOrderPayload(params);

  const updateOrderCallData = params.subaccountApproval
    ? encodeFunctionData({
        abi: SubaccountGelatoRelayRouterAbi.abi,
        functionName: "updateOrder",
        args: [
          { ...params.relayParams, signature },
          params.subaccountApproval,
          params.account,
          params.subaccountApproval.subaccount,
          orderKey,
          updateOrderParams,
          increaseExecutionFee,
        ],
      })
    : encodeFunctionData({
        abi: GelatoRelayRouterAbi.abi,
        functionName: "updateOrder",
        args: [{ ...params.relayParams, signature }, params.account, orderKey, updateOrderParams, increaseExecutionFee],
      });

  return {
    callData: updateOrderCallData,
    contractAddress: getContract(
      chainId,
      params.subaccountApproval ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"
    ),
    feeToken: relayFeeParams.relayerTokenAddress,
    feeAmount: relayFeeParams.relayerTokenAmount,
  };
}

export async function buildAndSignExpressCancelOrderTxn({
  chainId,
  relayParamsPayload,
  relayFeeParams,
  subaccount,
  signer,
  orderKey,
}: {
  chainId: number;
  subaccount: Subaccount | undefined;
  signer: Signer;
  relayParamsPayload: Omit<RelayParamsPayload, "deadline">;
  relayFeeParams: RelayFeeSwapParams;
  orderKey: string;
}) {
  const finalRelayParamsPayload = {
    ...relayParamsPayload,
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
  };

  const params = {
    signer: subaccount?.signer ?? signer,
    account: await signer.getAddress(),
    chainId,
    orderKey,
    relayParams: finalRelayParamsPayload,
    subaccountApproval: subaccount?.signedApproval,
  };

  const signature = await signCancelOrderPayload(params);

  const cancelOrderCallData = encodeFunctionData({
    abi: GelatoRelayRouterAbi.abi,
    functionName: "cancelOrder",
    args: [relayParamsPayload, orderKey, signature],
  });

  return {
    callData: cancelOrderCallData,
    contractAddress: getContract(chainId, "GelatoRelayRouter"),
    feeToken: relayFeeParams.relayerTokenAddress,
    feeAmount: relayFeeParams.relayerTokenAmount,
  };
}

export type ExpressTxnData = {
  callData: string;
  contractAddress: string;
  feeToken: string;
  feeAmount: bigint;
};

export async function buildAndSignExpressBatchOrderTxn({
  chainId,
  relayFeeParams,
  relayParamsPayload,
  batchParams,
  subaccount,
  signer,
  emptySignature = false,
}: {
  signer: Signer;
  chainId: number;
  batchParams: BatchOrderTxnParams;
  relayFeeParams: RelayFeeSwapParams;
  relayParamsPayload: Omit<RelayParamsPayload, "deadline" | "userNonce">;
  subaccount: Subaccount | undefined;
  emptySignature?: boolean;
}) {
  const mainAccountSigner = signer;
  const subaccountApproval = subaccount?.signedApproval;
  const messageSigner = subaccountApproval ? subaccount!.signer : mainAccountSigner;

  const params = {
    account: await mainAccountSigner.getAddress(),
    messageSigner,
    chainId,
    relayPayload: {
      ...relayParamsPayload,
      deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
      userNonce: await getRelayRouterNonceForSigner(chainId, messageSigner, subaccountApproval !== undefined),
    },
    paramsLists: getBatchContractOrderParamsLists(batchParams),
    subaccountApproval,
  };

  const signature = emptySignature
    ? "0x"
    : await getBatchSignature({
        signer: params.messageSigner,
        relayParams: params.relayPayload,
        batchParams,
        chainId,
        account: params.account,
        subaccountApproval: params.subaccountApproval,
      });

  const batchCalldata =
    params.subaccountApproval !== undefined
      ? encodeFunctionData({
          abi: SubaccountGelatoRelayRouterAbi.abi,
          functionName: "batch",
          args: [
            { ...params.relayPayload, signature },
            params.subaccountApproval,
            params.account,
            params.subaccountApproval.subaccount,
            params.paramsLists,
          ],
        })
      : encodeFunctionData({
          abi: GelatoRelayRouterAbi.abi,
          functionName: "batch",
          args: [{ ...params.relayPayload, signature }, params.account, params.paramsLists],
        });

  const relayRouterAddress = getContract(
    chainId,
    params.subaccountApproval ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"
  );

  return {
    isSubaccount: params.subaccountApproval !== undefined,
    isEmptySubaccountApproval: !params.subaccountApproval || params.subaccountApproval.signature === zeroHash,
    tokenPermits: params.relayPayload.tokenPermits,
    callData: batchCalldata,
    contractAddress: relayRouterAddress,
    feeToken: relayFeeParams.relayerTokenAddress,
    feeAmount: relayFeeParams.relayerTokenAmount,
  };
}

export async function buildAndSignExpressCreateOrderTxn({
  chainId,
  relayFeeParams,
  relayParamsPayload,
  orderPayload,
  subaccount,
  signer,
  emptySignature = false,
}: {
  chainId: number;
  relayFeeParams: RelayFeeSwapParams;
  relayParamsPayload: Omit<RelayParamsPayload, "deadline">;
  orderPayload: CreateOrderPayload;
  subaccount: Subaccount | undefined;
  signer: Signer;
  emptySignature?: boolean;
}) {
  const finalRelayParamsPayload = {
    ...relayParamsPayload,
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
  };

  const params = {
    signer: subaccount?.signer ?? signer,
    chainId,
    relayPayload: finalRelayParamsPayload,
    orderPayload: orderPayload,
    subaccountApproval: subaccount?.signedApproval,
  };

  const signature = emptySignature ? "0x" : await signExpressOrderPayload(params);

  const createOrderCallData =
    params.subaccountApproval !== undefined
      ? encodeFunctionData({
          abi: SubaccountGelatoRelayRouterAbi.abi,
          functionName: "createOrder",
          args: [
            { ...relayParamsPayload, signature },
            params.subaccountApproval,
            params.orderPayload.addresses.receiver,
            params.subaccountApproval.subaccount,
            params.orderPayload.numbers.initialCollateralDeltaAmount,
            params.orderPayload,
          ],
        })
      : encodeFunctionData({
          abi: GelatoRelayRouterAbi.abi,
          functionName: "createOrder",
          args: [
            { ...params.relayPayload, signature },
            params.orderPayload.addresses.receiver,
            params.orderPayload.numbers.initialCollateralDeltaAmount,
            params.orderPayload,
          ],
        });

  const relayRouterAddress = getContract(
    chainId,
    params.subaccountApproval ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"
  );

  return {
    callData: createOrderCallData,
    contractAddress: relayRouterAddress,
    feeToken: relayFeeParams.relayerTokenAddress,
    feeAmount: relayFeeParams.relayerTokenAmount,
  };
}

export async function buildAndSignRemoveSubaccountTxn({
  chainId,
  relayParamsPayload,
  subaccount,
  signer,
}: {
  chainId: number;
  relayParamsPayload: RelayParamsPayload;
  subaccount: Subaccount;
  signer: Signer;
}) {
  const signature = await signRemoveSubaccountPayload({
    signer,
    relayParams: relayParamsPayload,
    subaccountAddress: subaccount.address,
    chainId,
  });

  const removeSubaccountCallData = encodeFunctionData({
    abi: SubaccountGelatoRelayRouterAbi.abi,
    functionName: "removeSubaccount",
    args: [{ ...relayParamsPayload, signature }, await signer.getAddress(), subaccount.address],
  });

  return {
    callData: removeSubaccountCallData,
    contractAddress: getContract(chainId, "SubaccountGelatoRelayRouter"),
    feeToken: relayParamsPayload.fee.feeToken,
    feeAmount: relayParamsPayload.fee.feeAmount,
  };
}

export type RelayFeeSwapParams = {
  feeParams: RelayFeePayload;
  externalCalls: ExternalCallsPayload;
  relayerTokenAddress: string;
  relayerTokenAmount: bigint;
  totalNetworkFeeAmount: bigint;
  gasPaymentTokenAmount: bigint;
  gasPaymentTokenAddress: string;
  isOutGasTokenBalance: boolean;
  needGasPaymentTokenApproval: boolean;
};

export function getRelayerFeeSwapParams({
  chainId,
  account,
  relayerFeeTokenAmount,
  relayerFeeTokenAddress,
  gasPaymentTokenAddress,
  totalNetworkFeeAmount,
  internalSwapAmounts,
  externalSwapQuote,
  tokensData,
  gasPaymentAllowanceData,
}: {
  chainId: number;
  account: string;
  relayerFeeTokenAmount: bigint;
  totalNetworkFeeAmount: bigint;
  relayerFeeTokenAddress: string;
  gasPaymentTokenAddress: string;
  internalSwapAmounts: SwapAmounts | undefined;
  externalSwapQuote: ExternalSwapOutput | undefined;
  tokensData: TokensData;
  gasPaymentAllowanceData: TokensAllowanceData;
}): RelayFeeSwapParams | undefined {
  let feeParams: RelayFeePayload;
  let externalCalls: ExternalCallsPayload;

  let gasPaymentTokenAmount: bigint;

  const isExternalSwapBetter =
    externalSwapQuote?.usdOut &&
    (getSwapDebugSettings()?.forceExternalSwaps ||
      internalSwapAmounts?.usdOut === undefined ||
      externalSwapQuote.usdOut > internalSwapAmounts.usdOut);

  if (gasPaymentTokenAddress === relayerFeeTokenAddress) {
    externalCalls = {
      externalCallTargets: [],
      externalCallDataList: [],
      refundReceivers: [],
      refundTokens: [],
      sendTokens: [],
      sendAmounts: [],
    } as ExternalCallsPayload;
    feeParams = {
      feeToken: relayerFeeTokenAddress,
      feeAmount: totalNetworkFeeAmount,
      feeSwapPath: [],
    };
    gasPaymentTokenAmount = totalNetworkFeeAmount;
  } else if (isExternalSwapBetter) {
    externalCalls = getExternalCallsPayload({
      chainId,
      account,
      quote: externalSwapQuote,
    });
    feeParams = {
      feeToken: externalSwapQuote.outTokenAddress, // final token
      feeAmount: 0n, // fee already sent in external calls
      feeSwapPath: [],
    };
    gasPaymentTokenAmount = externalSwapQuote.amountIn;
    totalNetworkFeeAmount = externalSwapQuote.amountOut;
  } else if (internalSwapAmounts?.swapPathStats) {
    feeParams = {
      feeToken: internalSwapAmounts.swapPathStats.tokenInAddress,
      feeAmount: internalSwapAmounts.amountIn,
      feeSwapPath: internalSwapAmounts.swapPathStats.swapPath,
    };
    externalCalls = {
      externalCallTargets: [],
      externalCallDataList: [],
      refundReceivers: [],
      refundTokens: [],
      sendTokens: [],
      sendAmounts: [],
    } as ExternalCallsPayload;
    totalNetworkFeeAmount = internalSwapAmounts.amountOut;
    gasPaymentTokenAmount = internalSwapAmounts.amountIn;
    gasPaymentTokenAddress = internalSwapAmounts.swapPathStats.tokenInAddress;
  } else {
    return undefined;
  }

  const gasPaymentToken = getByKey(tokensData, gasPaymentTokenAddress);
  const isOutGasTokenBalance =
    gasPaymentToken?.balance === undefined || gasPaymentTokenAmount > gasPaymentToken.balance;

  const needGasPaymentTokenApproval = getNeedTokenApprove(
    gasPaymentAllowanceData,
    gasPaymentTokenAddress,
    gasPaymentTokenAmount
  );

  return {
    feeParams,
    externalCalls,
    relayerTokenAddress: getRelayerFeeToken(chainId).address,
    relayerTokenAmount: relayerFeeTokenAmount,
    totalNetworkFeeAmount,
    gasPaymentTokenAmount,
    isOutGasTokenBalance,
    needGasPaymentTokenApproval,
    gasPaymentTokenAddress,
  };
}

export async function getBatchSignature({
  signer,
  relayParams,
  batchParams,
  chainId,
  account,
  subaccountApproval,
}: {
  account: string;
  subaccountApproval: SignedSubbacountApproval | undefined;
  signer: Signer;
  relayParams: RelayParamsPayload;
  batchParams: BatchOrderTxnParams;
  chainId: number;
}) {
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
    ],
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

  const domain = getGelatoRelayRouterDomain(chainId, subaccountApproval !== undefined);

  const paramsLists = getBatchContractOrderParamsLists(batchParams);

  const typedData = {
    account: subaccountApproval ? account : zeroAddress,
    createOrderParamsList: paramsLists.createOrderParamsList,
    updateOrderParamsList: paramsLists.updateOrderParamsList,
    cancelOrderKeys: paramsLists.cancelOrderKeys,
    relayParams: hashRelayParams(relayParams),
    subaccountApproval: subaccountApproval ? hashSubaccountApproval(subaccountApproval) : zeroHash,
  };

  return signTypedData(signer, domain, types, typedData);
}

function getBatchContractOrderParamsLists(batchParams: BatchOrderTxnParams) {
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

async function signCancelOrderPayload({
  signer,
  relayParams,
  subaccountApproval,
  account,
  orderKey,
  chainId,
}: {
  signer: Signer;
  relayParams: RelayParamsPayload;
  subaccountApproval: SignedSubbacountApproval | undefined;
  account: string;
  orderKey: string;
  chainId: number;
}) {
  const types = {
    CancelOrder: [
      { name: "account", type: "address" },
      { name: "key", type: "bytes32" },
      { name: "relayParams", type: "bytes32" },
      subaccountApproval ? { name: "subaccountApproval", type: "bytes32" } : undefined,
    ].filter((type) => type !== undefined),
  };

  const domain = getGelatoRelayRouterDomain(chainId, subaccountApproval !== undefined);

  const typedData = {
    account,
    key: orderKey,
    relayParams: hashRelayParams(relayParams),
    subaccountApproval: subaccountApproval ? hashSubaccountApproval(subaccountApproval) : undefined,
  };

  return signTypedData(signer, domain, types, typedData);
}

export function signUpdateOrderPayload({
  chainId,
  signer,
  orderKey,
  updateOrderParams,
  increaseExecutionFee,
  relayParams,
  subaccountApproval,
}: {
  chainId: number;
  signer: Signer;
  orderKey: string;
  updateOrderParams: UpdateOrderPayload;
  increaseExecutionFee: boolean;
  relayParams: RelayParamsPayload;
  subaccountApproval: SignedSubbacountApproval | undefined;
}) {
  const types = {
    UpdateOrder: [
      { name: "key", type: "bytes32" },
      { name: "params", type: "UpdateOrderParams" },
      { name: "increaseExecutionFee", type: "bool" },
      { name: "relayParams", type: "bytes32" },
      subaccountApproval ? { name: "subaccountApproval", type: "bytes32" } : undefined,
    ].filter((type) => type !== undefined),
    UpdateOrderParams: [
      { name: "sizeDeltaUsd", type: "uint256" },
      { name: "acceptablePrice", type: "uint256" },
      { name: "triggerPrice", type: "uint256" },
      { name: "minOutputAmount", type: "uint256" },
      { name: "validFromTime", type: "uint256" },
      { name: "autoCancel", type: "bool" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(chainId, subaccountApproval !== undefined);

  const typedData = {
    key: orderKey,
    params: updateOrderParams,
    increaseExecutionFee,
    relayParams: hashRelayParams(relayParams),
    subaccountApproval: subaccountApproval ? hashSubaccountApproval(subaccountApproval) : undefined,
  };

  return signTypedData(signer, domain, types, typedData);
}

export async function signExpressOrderPayload({
  signer,
  relayPayload: relayParams,
  subaccountApproval,
  orderPayload,
  chainId,
}: {
  signer: Signer;
  relayPayload: RelayParamsPayload;
  orderPayload: CreateOrderPayload;
  subaccountApproval: SignedSubbacountApproval | undefined;
  chainId: number;
}) {
  const types = {
    CreateOrder: [
      { name: "collateralDeltaAmount", type: "uint256" },
      subaccountApproval ? { name: "account", type: "address" } : undefined,
      { name: "addresses", type: "CreateOrderAddresses" },
      { name: "numbers", type: "CreateOrderNumbers" },
      { name: "orderType", type: "uint256" },
      { name: "decreasePositionSwapType", type: "uint256" },
      { name: "isLong", type: "bool" },
      { name: "shouldUnwrapNativeToken", type: "bool" },
      { name: "autoCancel", type: "bool" },
      { name: "referralCode", type: "bytes32" },
      { name: "relayParams", type: "bytes32" },
      subaccountApproval ? { name: "subaccountApproval", type: "bytes32" } : undefined,
    ].filter((type) => type !== undefined),

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
  };

  const typedData = {
    collateralDeltaAmount: orderPayload.numbers.initialCollateralDeltaAmount,
    account: orderPayload.addresses.receiver,
    addresses: orderPayload.addresses,
    numbers: orderPayload.numbers,
    orderType: orderPayload.orderType,
    decreasePositionSwapType: orderPayload.decreasePositionSwapType,
    isLong: orderPayload.isLong,
    shouldUnwrapNativeToken: orderPayload.shouldUnwrapNativeToken,
    autoCancel: orderPayload.autoCancel || false,
    referralCode: orderPayload.referralCode,
    relayParams: hashRelayParams(relayParams),
    subaccountApproval: subaccountApproval ? hashSubaccountApproval(subaccountApproval) : undefined,
  };

  const domain = getGelatoRelayRouterDomain(chainId, subaccountApproval !== undefined);

  return signTypedData(signer, domain, types, typedData);
}

async function signRemoveSubaccountPayload({
  signer,
  relayParams,
  subaccountAddress,
  chainId,
}: {
  signer: Signer;
  relayParams: RelayParamsPayload;
  subaccountAddress: string;
  chainId: number;
}) {
  const types = {
    RemoveSubaccount: [
      { name: "subaccount", type: "address" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(chainId, true);

  const typedData = {
    subaccountAddress,
    relayParams: hashRelayParams(relayParams),
  };

  return signTypedData(signer, domain, types, typedData);
}

export async function sendExpressTxn(p: {
  chainId: number;
  txnData: {
    callData: string;
    contractAddress: string;
    feeToken: string;
    feeAmount: bigint;
  };
  isSponsoredCall: boolean;
}) {
  const data = encodePacked(
    ["bytes", "address", "address", "uint256"],
    [
      p.txnData.callData as Address,
      p.txnData.contractAddress as Address,
      p.txnData.feeToken as Address,
      p.txnData.feeAmount,
    ]
  );

  let gelatoPromise: Promise<{ taskId: string }> | undefined;

  if (p.isSponsoredCall) {
    gelatoPromise = gelatoRelay.sponsoredCall(
      {
        chainId: BigInt(p.chainId),
        target: p.txnData.contractAddress,
        data,
      },
      "FalsQh9loL6V0rwPy4gWgnQPR6uTHfWjSVT2qlTzUq4_"
    );
  } else {
    gelatoPromise = gelatoRelay.callWithSyncFee({
      chainId: BigInt(p.chainId),
      target: p.txnData.contractAddress,
      feeToken: p.txnData.feeToken,
      isRelayContext: true,
      data,
    });
  }

  return gelatoPromise.then((res) => {
    return {
      taskId: res.taskId,
      wait: makeExpressTxnResultWaiter(res),
    };
  });
}

export async function getIsSponsoredCallAllowed() {
  const gelatoBalance = await fetch(
    "https://api.gelato.digital/1balance/networks/mainnets/sponsors/0x88FcCAC36031949001Df4bB0b68CBbd07f033161"
  );

  const gelatoBalanceData = await gelatoBalance.json();

  const mainBalance = gelatoBalanceData.sponsor.mainBalance;
  const mainBalanceToken = mainBalance.token;
  const remainingBalance = BigInt(mainBalance.remainingBalance);

  return remainingBalance > expandDecimals(10, Number(mainBalanceToken.decimals));
}

// TODO: Tests
function makeExpressTxnResultWaiter(res: { taskId: string }) {
  return async () => {
    const pollInterval = 500;
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await gelatoRelay.getTaskStatus(res.taskId);

      const result = {
        status: {
          taskId: res.taskId,
          taskState: status?.taskState,
          lastCheckMessage: status?.lastCheckMessage,
          creationDate: status?.creationDate,
          executionDate: status?.executionDate,
          chainId: status?.chainId,
        },
        receipt: status?.transactionHash
          ? {
              transactionHash: status.transactionHash,
              blockNumber: status.blockNumber!,
              status: status.taskState === "ExecSuccess" ? 1 : 0,
              gasUsed: status.gasUsed ? BigInt(status.gasUsed) : undefined,
              effectiveGasPrice: status.effectiveGasPrice ? BigInt(status.effectiveGasPrice) : undefined,
              chainId: status.chainId,
              timestamp: status.executionDate ? new Date(status.executionDate).getTime() : undefined,
            }
          : undefined,
      };

      switch (status?.taskState) {
        case "ExecSuccess":
        case "ExecReverted":
        case "Cancelled":
          return result;

        case "CheckPending":
        case "ExecPending":
        case "WaitingForConfirmation":
        default:
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          attempts++;
          continue;
      }
    }

    const timeoutStatus = await gelatoRelay.getTaskStatus(res.taskId);
    const result = {
      status: {
        taskId: res.taskId,
        taskState: "Timeout",
        lastCheckMessage: "Transaction timeout - exceeded maximum wait time",
        creationDate: timeoutStatus?.creationDate,
        executionDate: timeoutStatus?.executionDate,
        chainId: timeoutStatus?.chainId,
      },
      receipt: timeoutStatus?.transactionHash
        ? {
            transactionHash: timeoutStatus.transactionHash,
            blockNumber: timeoutStatus.blockNumber!,
            status: 0,
            gasUsed: timeoutStatus.gasUsed ? BigInt(timeoutStatus.gasUsed) : undefined,
            effectiveGasPrice: timeoutStatus.effectiveGasPrice ? BigInt(timeoutStatus.effectiveGasPrice) : undefined,
            chainId: timeoutStatus.chainId,
            timestamp: timeoutStatus.executionDate ? new Date(timeoutStatus.executionDate).getTime() : undefined,
          }
        : undefined,
    };

    return result;
  };
}
