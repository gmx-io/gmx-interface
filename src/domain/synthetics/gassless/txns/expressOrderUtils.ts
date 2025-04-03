import { Signer } from "ethers";
import uniq from "lodash/uniq";
import { Address, encodeFunctionData, encodePacked } from "viem";

import { getContract } from "config/contracts";
import { MarketsInfoData } from "domain/synthetics/markets/types";
import { getSwapPathTokenAddresses } from "domain/synthetics/trade/utils";
import GelatoRelayRouterAbi from "sdk/abis/GelatoRelayRouter.json";
import SubaccountGelatoRelayRouterAbi from "sdk/abis/SubaccountGelatoRelayRouter.json";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import { RelayerFeeState } from "../types";
import { OrderPayload } from "./createOrderBuilders";
import {
  ExternalCallsPayload,
  getGelatoRelayRouterDomain,
  hashRelayParams,
  OracleParamsPayload,
  RelayFeeParamsPayload,
  RelayParamsPayload,
} from "./relayRouterUtils";
import { signTypedData } from "./signing";
import { getActualApproval, hashSubaccountApproval, SignedSubbacountApproval, Subaccount } from "./subaccountUtils";

export type ExpressOrderParams = {
  chainId: number;
  signer: Signer;
  relayPayload: RelayParamsPayload;
  orderPayload: OrderPayload;
  subaccountApproval: SignedSubbacountApproval | undefined;
};

type UpdateOrderParams = {
  sizeDeltaUsd: bigint;
  acceptablePrice: bigint;
  triggerPrice: bigint;
  minOutputAmount: bigint;
  validFromTime: bigint;
  autoCancel: boolean;
};

export async function buildAndSignExpressUpdateOrderTxn({
  chainId,
  relayParamsPayload,
  subaccount,
  signer,
  orderKey,
  increaseExecutionFee,
  updateOrderParams,
}: {
  chainId: number;
  relayParamsPayload: RelayParamsPayload;
  orderPayload: OrderPayload;
  subaccount: Subaccount | undefined;
  signer: Signer;
  orderKey: string;
  increaseExecutionFee: boolean;
  updateOrderParams: UpdateOrderParams;
}) {
  const params = {
    signer: subaccount?.signer ?? signer,
    account: await signer.getAddress(),
    chainId,
    orderKey,
    updateOrderParams,
    increaseExecutionFee,
    relayParams: relayParamsPayload,
    subaccountApproval: await getActualApproval(chainId, subaccount),
  };

  const signature = await signUpdateOrderPayload(params);

  const updateOrderCallData = params.subaccountApproval
    ? encodeFunctionData({
        abi: SubaccountGelatoRelayRouterAbi.abi,
        functionName: "updateOrder",
        args: [
          { ...relayParamsPayload, signature },
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
        args: [{ ...relayParamsPayload, signature }, params.account, orderKey, updateOrderParams, increaseExecutionFee],
      });

  return {
    callData: updateOrderCallData,
    contractAddress: getContract(
      chainId,
      params.subaccountApproval ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"
    ),
    feeToken: relayParamsPayload.fee.feeToken,
    feeAmount: relayParamsPayload.fee.feeAmount,
  };
}

export async function buildAndSignExpressCancelOrderTxn({
  chainId,
  subaccount,
  signer,
  relayParamsPayload,
  orderKey,
}: {
  chainId: number;
  subaccount: Subaccount | undefined;
  signer: Signer;
  relayParamsPayload: RelayParamsPayload;
  orderKey: string;
}) {
  const params = {
    signer: subaccount?.signer ?? signer,
    account: await signer.getAddress(),
    chainId,
    orderKey,
    relayParams: relayParamsPayload,
    subaccountApproval: await getActualApproval(chainId, subaccount),
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
    feeToken: relayParamsPayload.fee.feeToken,
    feeAmount: relayParamsPayload.fee.feeAmount,
  };
}

export async function buildAndSignExpressCreateOrderTxn({
  chainId,
  relayParamsPayload,
  orderPayload,
  subaccount,
  signer,
}: {
  chainId: number;
  relayParamsPayload: RelayParamsPayload;
  orderPayload: OrderPayload;
  subaccount: Subaccount | undefined;
  signer: Signer;
}) {
  const params = {
    signer: subaccount?.signer ?? signer,
    chainId,
    relayPayload: relayParamsPayload,
    orderPayload: orderPayload,
    subaccountApproval: await getActualApproval(chainId, subaccount),
  };

  const signature = await signExpressOrderPayload(params);

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
    feeToken: relayParamsPayload.fee.feeToken,
    feeAmount: relayParamsPayload.fee.feeAmount,
  };
}

export function getExpressOrderOracleParams({
  marketsInfoData,
  chainId,
  initialCollateralAddress,
  collateralSwapPath: swapPath,
  feeSwapPath,
  gasPaymentTokenAddress,
}: {
  marketsInfoData: MarketsInfoData;
  chainId: number;
  initialCollateralAddress: string;
  collateralSwapPath: string[];
  gasPaymentTokenAddress: string;
  feeSwapPath: string[];
}): OracleParamsPayload {
  const collateralSwapAddresses =
    getSwapPathTokenAddresses({
      marketsInfoData,
      chainId,
      initialCollateralAddress,
      swapPath,
    }) ?? [];

  const feeSwapAddresses =
    getSwapPathTokenAddresses({
      marketsInfoData,
      chainId,
      initialCollateralAddress: gasPaymentTokenAddress,
      swapPath: feeSwapPath,
    }) ?? [];

  const allSwapAddresses = uniq([
    initialCollateralAddress,
    gasPaymentTokenAddress,
    ...collateralSwapAddresses,
    ...feeSwapAddresses,
  ]);

  const priceProviders = allSwapAddresses.map(() => getContract(chainId, "ChainlinkPriceFeedProvider"));
  const data = Array(allSwapAddresses.length).fill("0x");

  return {
    tokens: allSwapAddresses,
    providers: priceProviders,
    data,
  };
}

export function getRelayerFeeSwapParams(account: string, relayFeeParams: RelayerFeeState) {
  const relayFeeToken = relayFeeParams.relayerFeeTokenAddress;
  const relayFeeAmount = relayFeeParams.relayerFeeAmount;

  let feeParams: RelayFeeParamsPayload;
  let externalCalls: ExternalCallsPayload;

  if (relayFeeParams.externalSwapOutput) {
    externalCalls = {
      externalCallTargets: [relayFeeParams.externalSwapOutput.txnData.to],
      externalCallDataList: [relayFeeParams.externalSwapOutput.txnData.data],
      refundReceivers: [account, account],
      refundTokens: [relayFeeParams.gasPaymentTokenAddress, relayFeeParams.relayerFeeTokenAddress],
    };
    feeParams = {
      feeToken: relayFeeParams.gasPaymentTokenAddress,
      feeAmount: relayFeeParams.gasPaymentTokenAmount,
      feeSwapPath: [],
    };
  } else {
    feeParams = {
      feeToken: relayFeeParams.gasPaymentTokenAddress,
      feeAmount: relayFeeParams.gasPaymentTokenAmount,
      feeSwapPath: relayFeeParams.internalSwapStats?.swapPath ?? [],
    };
    externalCalls = {
      externalCallTargets: [],
      externalCallDataList: [],
      refundReceivers: [],
      refundTokens: [],
    };
  }

  return {
    feeParams,
    externalCalls,
    relayFeeToken,
    relayFeeAmount,
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
  updateOrderParams: UpdateOrderParams;
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
  orderPayload: OrderPayload;
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

export async function sendExpressOrderTxn(p: {
  chainId: number;
  txnData: {
    callData: string;
    contractAddress: string;
    feeToken: string;
    feeAmount: bigint;
  };
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

  return gelatoRelay.callWithSyncFee({
    chainId: BigInt(p.chainId),
    target: p.txnData.contractAddress,
    feeToken: p.txnData.feeToken,
    isRelayContext: true,
    data,
  });
}
