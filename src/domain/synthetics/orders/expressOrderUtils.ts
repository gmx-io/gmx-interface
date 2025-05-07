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
import { BridgeOutParamsStruct, RelayParamsStruct } from "typechain-types-arbitrum-sepolia/MultichainTransferRouter";
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
  settlementChainClient: PublicClient | undefined;
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
  settlementChainClient: PublicClient | undefined;
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

export async function buildAndSignBridgeOutTxn({
  chainId,
  relayParamsPayload,
  params,
  signer,
  emptySignature = false,
}: {
  chainId: UiSettlementChain;
  relayParamsPayload: MultichainRelayParamsPayload;
  params: BridgeOutParamsStruct;
  signer: Signer;
  emptySignature?: boolean;
}): Promise<ExpressTxnData> {
  const [address, srcChainId] = await Promise.all([
    signer.getAddress(),
    signer.provider!.getNetwork().then((n) => Number(n.chainId) as UiSourceChain),
  ]);

  let signature: Hex;

  if (emptySignature) {
    signature = "0x";
  } else {
    signature = await signBridgeOutPayload({
      relayParams: relayParamsPayload,
      params,
      signer,
      chainId,
      srcChainId,
    });
  }

  const bridgeOutCallData = encodeFunctionData({
    abi: multichainTransferRouterAbi,
    functionName: "bridgeOut",
    args: [
      {
        ...relayParamsPayload,
        signature,
        desChainId: BigInt(chainId),
      } satisfies RelayParamsStruct,
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

async function signBridgeOutPayload({
  signer,
  relayParams,
  params,
  chainId,
  srcChainId,
}: {
  signer: Signer;
  relayParams: MultichainRelayParamsPayload;
  params: BridgeOutParamsStruct;
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
