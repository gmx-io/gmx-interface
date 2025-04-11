import { Signer } from "ethers";
import uniq from "lodash/uniq";
import { Address, encodeFunctionData, encodePacked } from "viem";

import { getContract } from "config/contracts";
import { MarketsInfoData } from "domain/synthetics/markets/types";
import { getSwapPathTokens } from "domain/synthetics/trade/utils";
import { abis } from "sdk/abis";
import GelatoRelayRouterAbi from "sdk/abis/GelatoRelayRouter.json";
import SubaccountGelatoRelayRouterAbi from "sdk/abis/SubaccountGelatoRelayRouter.json";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { OracleParamsPayload, RelayFeePayload, RelayParamsPayload } from "sdk/types/expressTransactions";
import { TokensData } from "sdk/types/tokens";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import { MaxUint256 } from "sdk/utils/numbers";
import { getByKey } from "sdk/utils/objects";
import {
  CreateOrderPayload,
  CreateOrderTxnParams,
  DecreasePositionOrderParams,
  ExternalCallsPayload,
  IncreasePositionOrderParams,
  SwapOrderParams,
  UpdateOrderPayload,
} from "sdk/utils/orderTransactions";
import { nowInSeconds } from "sdk/utils/time";
import { RelayUtils } from "typechain-types-arbitrum-sepolia/MultichainTransferRouter";

import { RelayerFeeState } from "../types";
import { getGelatoRelayRouterDomain, hashRelayParams } from "./relayParams";
import { signTypedData } from "./signing";
import { getActualApproval, hashSubaccountApproval, SignedSubbacountApproval, Subaccount } from "./subaccountUtils";

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
  relayFeeParams: RelayFeeParams;
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
    subaccountApproval: await getActualApproval(chainId, subaccount),
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
    feeToken: relayFeeParams.relayFeeToken,
    feeAmount: relayFeeParams.relayFeeAmount,
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
  relayFeeParams: RelayFeeParams;
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
    feeToken: relayFeeParams.relayFeeToken,
    feeAmount: relayFeeParams.relayFeeAmount,
  };
}

export async function buildAndSignExpressCreateOrderTxn({
  chainId,
  relayFeeParams,
  relayParamsPayload,
  orderPayload,
  subaccount,
  signer,
}: {
  chainId: number;
  relayFeeParams: RelayFeeParams;
  relayParamsPayload: Omit<RelayParamsPayload, "deadline">;
  orderPayload: CreateOrderPayload;
  subaccount: Subaccount | undefined;
  signer: Signer;
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
    feeToken: relayFeeParams.relayFeeToken,
    feeAmount: relayFeeParams.relayFeeAmount,
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

export async function buildAndSignBridgeOutTxn({
  chainId,
  relayParamsPayload,
  params,
  signer,
}: {
  chainId: number;
  relayParamsPayload: RelayParamsPayload;
  params: RelayUtils.BridgeOutParamsStruct;
  signer: Signer;
}) {
  const [address, srcChainId] = await Promise.all([
    signer.getAddress(),
    signer.provider!.getNetwork().then((n) => Number(n.chainId)),
  ]);

  const signature = await signBridgeOutPayload({
    relayParams: relayParamsPayload,
    params,
    signer,
    chainId,
    srcChainId,
  });

  const bridgeOutCallData = encodeFunctionData({
    abi: abis.MultichainTransferRouterArbitrumSepolia,
    functionName: "bridgeOut",
    args: [
      {
        ...relayParamsPayload,
        signature,
        desChainId: chainId,
      } satisfies RelayUtils.RelayParamsStruct,
      // address account,
      address,
      // uint256 srcChainId,
      srcChainId,
      // (await signer.provider!.getNetwork()).chainId,
      // RelayUtils.BridgeOutParams calldata params
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

export function getExpressOrderOracleParams({
  createOrderParams,
  marketsInfoData,
  tokensData,
  chainId,
  feeSwapPath,
  gasPaymentTokenAddress,
  feeTokenAddress,
}: {
  createOrderParams: CreateOrderTxnParams<any>[];
  marketsInfoData: MarketsInfoData;
  tokensData: TokensData;
  chainId: number;
  gasPaymentTokenAddress: string;
  feeSwapPath: string[];
  feeTokenAddress: string;
}): OracleParamsPayload {
  const collateralSwapTokens = createOrderParams
    .map((p) => {
      const swapTokens =
        getSwapPathTokens({
          tokensData,
          marketsInfoData,
          chainId,
          initialCollateralAddress: p.orderPayload.addresses.initialCollateralToken,
          swapPath: p.orderPayload.addresses.swapPath,
        }) ?? [];

      const targetCollateralAddress =
        (p.params as SwapOrderParams).receiveTokenAddress ||
        (p.params as IncreasePositionOrderParams).collateralTokenAddress ||
        (p.params as DecreasePositionOrderParams).receiveTokenAddress;

      const targetCollateralToken = getByKey(tokensData, targetCollateralAddress);

      if (targetCollateralToken) {
        swapTokens.push(targetCollateralToken);
      }

      return swapTokens;
    })
    .flat();

  const feeSwapTokens =
    getSwapPathTokens({
      tokensData,
      marketsInfoData,
      chainId,
      initialCollateralAddress: gasPaymentTokenAddress,
      swapPath: feeSwapPath,
    }) ?? [];

  const feeToken = getByKey(tokensData, feeTokenAddress);

  if (feeToken) {
    feeSwapTokens.push(feeToken);
  }

  const allSwapTokens = uniq([...collateralSwapTokens, ...feeSwapTokens]);
  const allSwapAddresses = allSwapTokens.map((t) => t.wrappedAddress ?? t.address);
  const priceProviders = allSwapTokens.map((t) => getContract(chainId, "ChainlinkPriceFeedProvider"));
  const data = allSwapTokens.map(() => "0x");

  return {
    tokens: allSwapAddresses,
    providers: priceProviders,
    data,
  };
}

export type RelayFeeParams = ReturnType<typeof getRelayerFeeSwapParams>;

export function getRelayerFeeSwapParams(account: string, relayFeeParams: RelayerFeeState) {
  const relayFeeToken = relayFeeParams.relayerFeeTokenAddress;
  const relayFeeAmount = relayFeeParams.relayerFeeAmount;

  let feeParams: RelayFeePayload;
  let externalCalls: ExternalCallsPayload;

  if (relayFeeParams.externalSwapOutput) {
    externalCalls = {
      externalCallTargets: [relayFeeParams.gasPaymentTokenAddress, relayFeeParams.externalSwapOutput.txnData.to],
      externalCallDataList: [
        encodeFunctionData({
          abi: abis.ERC20,
          functionName: "approve",
          args: [relayFeeParams.externalSwapOutput.txnData.to, MaxUint256],
        }),
        relayFeeParams.externalSwapOutput.txnData.data,
      ],
      refundReceivers: [account, account],
      refundTokens: [relayFeeParams.gasPaymentTokenAddress, relayFeeParams.relayerFeeTokenAddress],
    } as ExternalCallsPayload;
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
      sendTokens: [],
      sendAmounts: [],
    } as ExternalCallsPayload;
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

async function signBridgeOutPayload({
  signer,
  relayParams,
  params,
  chainId,
  srcChainId,
}: {
  signer: Signer;
  relayParams: RelayParamsPayload;
  params: RelayUtils.BridgeOutParamsStruct;
  chainId: number;
  srcChainId: number;
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
    relayParams: hashRelayParams(relayParams),
  };

  // const domain = getGelatoRelayRouterDomain(chainId, true, srcChainId);
  const domain = getGelatoRelayRouterDomain(chainId, true);

  return signTypedData(signer, { ...domain, chainId: srcChainId }, types, typedData);
}

export async function sendExpressTxn(p: {
  chainId: number;
  txnData: {
    callData: string;
    contractAddress: string;
    feeToken: string;
    feeAmount: bigint;
  };
  sponsored?: boolean;
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

  if (p.sponsored) {
    // request: BaseRelayParams, sponsorApiKey: string, options?: RelayRequestOptions | undefined
    return gelatoRelay.sponsoredCall(
      {
        chainId: BigInt(p.chainId),
        target: p.txnData.contractAddress,
        data,
      },
      "5rbFWd0Xff9IpEqy80FC8oBpVzWXVDSu4i05d3CuReA_",
      {}
    );
  }

  console.log("sending express txn", p.txnData);
  return gelatoRelay
    .callWithSyncFee({
      chainId: BigInt(p.chainId),
      target: p.txnData.contractAddress,
      feeToken: p.txnData.feeToken,
      isRelayContext: true,
      data,
    })
    .then((res) => {
      console.log("express txn res", res);
    });
}
