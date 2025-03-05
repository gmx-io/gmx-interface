import { solidityPacked } from "ethers";

import { Contract } from "ethers";

import { getContract } from "config/contracts";
import { Signer } from "ethers";
import { getRelayParams, hashRelayParams, signTypedData } from "./signing";

// Define the type for CreateOrderParams
export interface CreateOrderParams {
  addresses: {
    receiver: string;
    cancellationReceiver: string;
    callbackContract: string;
    uiFeeReceiver: string;
    market: string;
    initialCollateralToken: string;
    swapPath: string[];
  };
  numbers: {
    sizeDeltaUsd: string | bigint;
    initialCollateralDeltaAmount: string | bigint;
    triggerPrice: string | bigint;
    acceptablePrice: string | bigint;
    executionFee: string | bigint;
    callbackGasLimit: string | bigint;
    minOutputAmount: string | bigint;
    validFromTime: string | bigint;
  };
  orderType: number;
  decreasePositionSwapType: number;
  isLong: boolean;
  shouldUnwrapNativeToken: boolean;
  autoCancel: boolean;
  referralCode: string;
}

export async function getCreateOrderCalldata(
  chainId: number,
  p: {
    signer: Signer;
    sender: Signer;
    oracleParams?: {
      tokens: string[];
      providers: string[];
      data: string[];
    };
    externalCalls?: {
      externalCallTargets: string[];
      externalCallDataList: string[];
      refundTokens: string[];
      refundReceivers: string[];
    };
    tokenPermits?: {
      token: string;
      spender: string;
      value: bigint;
      deadline: bigint;
    }[];
    feeParams: {
      feeToken: string;
      feeAmount: bigint;
      feeSwapPath: string[];
    };
    collateralDeltaAmount: bigint;
    account: string;
    params: CreateOrderParams;
    signature?: string;
    userNonce?: bigint;
    deadline: bigint;
    relayRouter: Contract;
    chainId: number;
    relayFeeToken: string;
    relayFeeAmount: bigint;
  }
) {
  const relayParams = await getRelayParams(p);

  let signature = p.signature;
  if (!signature) {
    signature = await getCreateOrderSignature({
      ...p,
      relayParams,
      verifyingContract: await p.relayRouter.getAddress(),
    });
  }

  const createOrderCalldata = p.relayRouter.interface.encodeFunctionData("createOrder", [
    { ...relayParams, signature },
    p.account,
    p.collateralDeltaAmount,
    p.params,
  ]);

  const calldata = solidityPacked(
    ["bytes", "address", "address", "uint256"],
    [createOrderCalldata, getContract(chainId, "GelatoRelayRouter"), p.relayFeeToken, p.relayFeeAmount]
  );

  return {
    createOrderCalldata,
    calldata,
  };
}

async function getCreateOrderSignature({
  signer,
  relayParams,
  collateralDeltaAmount,
  verifyingContract,
  params,
  chainId,
}: {
  signer: Signer;
  relayParams: any;
  collateralDeltaAmount: bigint;
  verifyingContract: string;
  params: CreateOrderParams;
  chainId: number;
}) {
  if (relayParams.userNonce === undefined) {
    throw new Error("userNonce is required");
  }
  const types = {
    CreateOrder: [
      { name: "collateralDeltaAmount", type: "uint256" },
      { name: "addresses", type: "CreateOrderAddresses" },
      { name: "numbers", type: "CreateOrderNumbers" },
      { name: "orderType", type: "uint256" },
      { name: "decreasePositionSwapType", type: "uint256" },
      { name: "isLong", type: "bool" },
      { name: "shouldUnwrapNativeToken", type: "bool" },
      { name: "autoCancel", type: "bool" },
      { name: "referralCode", type: "bytes32" },
      { name: "relayParams", type: "bytes32" },
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
  };
  const domain = {
    name: "GmxBaseGelatoRelayRouter",
    version: "1",
    chainId,
    verifyingContract,
  };
  const typedData = {
    collateralDeltaAmount,
    addresses: params.addresses,
    numbers: params.numbers,
    orderType: params.orderType,
    decreasePositionSwapType: params.decreasePositionSwapType,
    isLong: params.isLong,
    shouldUnwrapNativeToken: params.shouldUnwrapNativeToken,
    autoCancel: false,
    referralCode: params.referralCode,
    relayParams: hashRelayParams(relayParams),
  };

  return signTypedData(signer, domain, types, typedData);
}
