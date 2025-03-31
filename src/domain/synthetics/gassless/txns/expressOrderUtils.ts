import { GelatoRelay } from "@gelatonetwork/relay-sdk";
import { Signer } from "ethers";
import uniq from "lodash/uniq";
import { Address, encodeFunctionData, encodePacked } from "viem";

import { getContract } from "config/contracts";
import GelatoRelayRouterAbi from "sdk/abis/GelatoRelayRouter.json";
import SubaccountGelatoRelayRouterAbi from "sdk/abis/SubaccountGelatoRelayRouter.json";
import { getRelayerFeeToken } from "sdk/configs/express";

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
import { hashSubaccountApproval, SignedSubbacountApproval } from "./subaccountUtils";
const relay = new GelatoRelay();

export type ExpressOrderParams = {
  chainId: number;
  signer: Signer;
  relayPayload: RelayParamsPayload;
  orderPayload: OrderPayload;
  relayFeeParams: RelayFeeParams;
  collateralDeltaAmount: bigint;
  subaccountApproval: SignedSubbacountApproval | undefined;
};

export type RelayFeeParams = {
  gasPaymentTokenAddress: string;
  relayerFeeTokenAddress: string;
  gasPaymentTokenAmount: bigint;
  relayerFeeTokenAmount: bigint;
  swapPath: string[];
  externalSwapQuote?: {
    to: string;
    data: string;
  };
};

export function getExpressOrderOracleParams({
  chainId,
  swapCollateralAddresses,
  swapFeeAddresses,
  initialCollateralAddress,
  relayFeeTokenAddress,
  gasPaymentTokenAddress,
}: {
  chainId: number;
  swapCollateralAddresses: string[];
  swapFeeAddresses: string[];
  initialCollateralAddress: string;
  relayFeeTokenAddress: string;
  gasPaymentTokenAddress: string;
}): OracleParamsPayload {
  const allSwapAddresses = uniq([
    ...swapCollateralAddresses,
    ...swapFeeAddresses,
    initialCollateralAddress,
    gasPaymentTokenAddress,
    relayFeeTokenAddress,
  ]);

  const priceProviders = allSwapAddresses.map(() => getContract(chainId, "ChainlinkPriceFeedProvider"));
  const data = Array(allSwapAddresses.length).fill("0x");

  return {
    tokens: allSwapAddresses,
    providers: priceProviders,
    data,
  };
}

export async function buildExpressOrderCallData(p: ExpressOrderParams, signature: string) {
  const createOrderCallData = p.subaccountApproval
    ? encodeCreateSubaccountOrderCallData(p, signature)
    : encodeCreateExpressOrderCallData(p, signature);

  const relayRouterAddress = getContract(
    p.chainId,
    p.subaccountApproval ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"
  );

  const gelatoCallData = encodePacked(
    ["bytes", "address", "address", "uint256"],
    [
      createOrderCallData as Address,
      relayRouterAddress,
      p.relayFeeParams.relayerFeeTokenAddress as Address,
      p.relayFeeParams.relayerFeeTokenAmount,
    ]
  );

  return {
    relayRouterAddress,
    createOrderCallData,
    gelatoCallData,
  };
}

export function getRelayerFeeSwapParams(account: string, relayFeeParams: RelayFeeParams) {
  const relayFeeToken = relayFeeParams.relayerFeeTokenAddress;
  const relayFeeAmount = relayFeeParams.relayerFeeTokenAmount;

  let feeParams: RelayFeeParamsPayload;
  let externalCalls: ExternalCallsPayload;

  if (relayFeeParams.externalSwapQuote) {
    externalCalls = {
      externalCallTargets: [relayFeeParams.externalSwapQuote.to],
      externalCallDataList: [relayFeeParams.externalSwapQuote.data],
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
      feeSwapPath: relayFeeParams.swapPath,
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

function encodeCreateExpressOrderCallData(p: ExpressOrderParams, signature: string) {
  return encodeFunctionData({
    abi: GelatoRelayRouterAbi.abi,
    functionName: "createOrder",
    args: [
      { ...p.relayPayload, signature },
      p.orderPayload.addresses.receiver,
      p.collateralDeltaAmount,
      p.orderPayload,
    ],
  });
}

function encodeCreateSubaccountOrderCallData(p: ExpressOrderParams, signature: string) {
  return encodeFunctionData({
    abi: SubaccountGelatoRelayRouterAbi.abi,
    functionName: "createOrder",
    args: [
      { ...p.relayPayload, signature },
      p.subaccountApproval,
      p.orderPayload.addresses.receiver,
      p.collateralDeltaAmount,
      p.orderPayload,
    ],
  });
}

export async function signExpressOrderPayload({
  signer,
  relayPayload: relayParams,
  subaccountApproval,
  collateralDeltaAmount,
  orderPayload,
  chainId,
}: {
  signer: Signer;
  relayPayload: RelayParamsPayload;
  orderPayload: OrderPayload;
  subaccountApproval: SignedSubbacountApproval | undefined;
  collateralDeltaAmount: bigint;
  chainId: number;
}) {
  const verifyingContract = getContract(
    chainId,
    subaccountApproval ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"
  );

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
    collateralDeltaAmount,
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

  const domain = getGelatoRelayRouterDomain(chainId, verifyingContract);

  return signTypedData(signer, domain, types, typedData);
}

export async function sendExpressOrderTxn(p: {
  chainId: number;
  relayRouterAddress: string;
  gelatoCallData: string;
  relayFeeToken: string;
}) {
  const relayRequest = {
    chainId: BigInt(p.chainId),
    target: p.relayRouterAddress,
    data: p.gelatoCallData,
    feeToken: getRelayerFeeToken(p.chainId).address,
    isRelayContext: true,
  };

  return relay.callWithSyncFee(relayRequest);
}
