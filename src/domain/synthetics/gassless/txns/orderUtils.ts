import { solidityPacked, ZeroHash } from "ethers";

import { getContract } from "config/contracts";
import { Contract, Signer } from "ethers";
import GelatoRelayRouterAbi from "sdk/abis/GelatoRelayRouter.json";
import SubaccountGelatoRelayRouterAbi from "sdk/abis/SubaccountGelatoRelayRouter.json";
import { getGelatoRelayRouterDomain, hashRelayParams, hashSubaccountApproval, signTypedData } from "./signing";
import { SignedSubbacountApproval } from "./subaccountUtils";
import { getRelayParams } from "./txnsRefactor/types";

export type ExpressOrderParams = {
  signer: Signer;
  oracleParams: {
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
    owner?: string;
    spender?: string;
    value?: bigint;
    deadline?: bigint;
    v?: number;
    r?: string;
    s?: string;
    token?: string;
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
  chainId: number;
  relayFeeToken: string;
  relayFeeAmount: bigint;
  subaccountApproval?: SignedSubbacountApproval;
  signatureValidator?: string;
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

export function getRelayerFeeSwapParams(account: string, relayFeeParams: RelayFeeParams) {
  const relayFeeToken = relayFeeParams.relayerFeeTokenAddress;
  const relayFeeAmount = relayFeeParams.relayerFeeTokenAmount;

  let feeParams: ExpressOrderParams["feeParams"];
  let externalCalls: ExpressOrderParams["externalCalls"];

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

export async function getCreateOrderCalldata(chainId: number, p: ExpressOrderParams) {
  const relayRouterAddress = getContract(
    chainId,
    p.subaccountApproval ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"
  );

  const relayRouter = new Contract(
    relayRouterAddress,
    p.subaccountApproval ? SubaccountGelatoRelayRouterAbi.abi : GelatoRelayRouterAbi.abi,
    p.signer
  );

  const relayParams = await getRelayParams({
    ...p,
    relayRouter,
    account: p.account,
  });

  let signature = await getCreateOrderSignature({
    account: p.account,
    signer: p.signer,
    relayParams,
    collateralDeltaAmount: p.collateralDeltaAmount,
    verifyingContract: await relayRouter.getAddress(),
    params: p.params,
    chainId: p.chainId,
    subaccountApproval: p.subaccountApproval,
  });

  console.log("Using signature:", signature);

  // Determine which function to call based on whether we're using a subaccount or not
  let createOrderCalldata: string;

  if (p.subaccountApproval) {
    // For subaccount transactions, use the createOrder method in SubaccountGelatoRelayRouter
    // Note the different parameter order in this contract compared to GelatoRelayRouter
    console.log("Creating subaccount order calldata");

    createOrderCalldata = relayRouter.interface.encodeFunctionData("createOrder", [
      { ...relayParams, signature, tokenPermits: p.tokenPermits },
      p.subaccountApproval,
      p.account, // Main account address
      p.subaccountApproval.subaccount, // Subaccount address
      p.collateralDeltaAmount,
      p.params,
    ]);
  } else {
    console.log("Creating main account order calldata");

    createOrderCalldata = relayRouter.interface.encodeFunctionData("createOrder", [
      { ...relayParams, signature, tokenPermits: p.tokenPermits },
      p.account,
      p.collateralDeltaAmount,
      p.params,
    ]);
  }

  const calldata = solidityPacked(
    ["bytes", "address", "address", "uint256"],
    [createOrderCalldata, relayRouterAddress, p.relayFeeToken, p.relayFeeAmount]
  );

  return {
    relayRouter,
    createOrderCalldata,
    calldata,
  };
}

async function getCreateOrderSignature({
  signer,
  relayParams,
  subaccountApproval,
  collateralDeltaAmount,
  account,
  verifyingContract,
  params,
  chainId,
}: {
  signer: Signer;
  relayParams: any;
  subaccountApproval?: SignedSubbacountApproval;
  collateralDeltaAmount: bigint;
  account: string;
  verifyingContract: string;
  params: CreateOrderParams;
  chainId: number;
}) {
  // These types MUST match exactly what's in the contract's CREATE_ORDER_TYPEHASH
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

  const domain = getGelatoRelayRouterDomain(BigInt(chainId), verifyingContract);
  const typedData = {
    collateralDeltaAmount,
    account,
    addresses: params.addresses,
    numbers: params.numbers,
    orderType: params.orderType,
    decreasePositionSwapType: params.decreasePositionSwapType,
    isLong: params.isLong,
    shouldUnwrapNativeToken: params.shouldUnwrapNativeToken,
    autoCancel: params.autoCancel || false,
    referralCode: params.referralCode,
    relayParams: hashRelayParams(relayParams),
    subaccountApproval: subaccountApproval ? hashSubaccountApproval(subaccountApproval) : ZeroHash,
  };

  console.log("Creating order signature", {
    domain,
    signerAddress: await signer.getAddress(),
    relayParams,
    subaccountApproval,
    types,
    typedData,
  });

  return subaccountApproval
    ? signer.signTypedData(domain, types, typedData)
    : signTypedData(signer, domain, types, typedData);
}
