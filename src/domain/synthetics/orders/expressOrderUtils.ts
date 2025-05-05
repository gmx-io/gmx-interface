import { Signer } from "ethers";
import { encodeFunctionData, zeroAddress, zeroHash } from "viem";

import { getContract } from "config/contracts";
import {
  getGelatoRelayRouterDomain,
  getOracleParamsPayload,
  getOraclePriceParamsForOrders,
  getOraclePriceParamsForRelayFee,
  getRelayRouterNonceForSigner,
  hashRelayParams,
  RelayerFeeParams,
  RelayParamsPayload,
} from "domain/synthetics/express";
import { MarketsInfoData } from "domain/synthetics/markets/types";
import { hashSubaccountApproval, SignedSubbacountApproval, Subaccount } from "domain/synthetics/subaccount";
import { SignedTokenPermit, TokensData } from "domain/tokens";
import { getIsPermitExpired } from "domain/tokens/permitUtils";
import { ExpressTxnData } from "lib/transactions/sendExpressTransaction";
import { signTypedData, SignTypedDataParams } from "lib/wallets/signing";
import GelatoRelayRouterAbi from "sdk/abis/GelatoRelayRouter.json";
import SubaccountGelatoRelayRouterAbi from "sdk/abis/SubaccountGelatoRelayRouter.json";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { BatchOrderTxnParams } from "sdk/utils/orderTransactions";
import { nowInSeconds } from "sdk/utils/time";

export async function getExpressBatchOrderParams({
  chainId,
  relayFeeParams,
  orderParams,
  signer,
  subaccount,
  tokenPermits,
  tokensData,
  marketsInfoData,
  emptySignature = false,
}: {
  chainId: number;
  relayFeeParams: RelayerFeeParams;
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
}: {
  signer: Signer;
  chainId: number;
  batchParams: BatchOrderTxnParams;
  relayFeeParams: RelayerFeeParams;
  relayParamsPayload: RelayParamsPayload;
  subaccount: Subaccount | undefined;
  emptySignature?: boolean;
}): Promise<ExpressTxnData> {
  const mainAccountSigner = signer;
  const subaccountApproval = subaccount?.signedApproval;
  const messageSigner = subaccountApproval ? subaccount!.signer : mainAccountSigner;

  const params = {
    account: await mainAccountSigner.getAddress(),
    messageSigner,
    chainId,
    relayPayload: {
      ...relayParamsPayload,
      tokenPermits: relayParamsPayload.tokenPermits.filter((permit) => !getIsPermitExpired(permit)),
      userNonce: await getRelayRouterNonceForSigner(chainId, messageSigner, subaccountApproval !== undefined),
    },
    paramsLists: getBatchParamsLists(batchParams),
    subaccountApproval,
  };

  const signature = emptySignature
    ? "0x"
    : await signTypedData(
        getBatchSignatureParams({
          signer: params.messageSigner,
          relayParams: params.relayPayload,
          batchParams,
          chainId,
          account: params.account,
          subaccountApproval: params.subaccountApproval,
        })
      );

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
    callData: batchCalldata,
    to: relayRouterAddress,
    feeToken: relayFeeParams.relayerTokenAddress,
    feeAmount: relayFeeParams.relayerTokenAmount,
  };
}

export function getBatchSignatureParams({
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
}): SignTypedDataParams {
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

  const paramsLists = getBatchParamsLists(batchParams);

  const typedData = {
    account: subaccountApproval ? account : zeroAddress,
    createOrderParamsList: paramsLists.createOrderParamsList,
    updateOrderParamsList: paramsLists.updateOrderParamsList,
    cancelOrderKeys: paramsLists.cancelOrderKeys,
    relayParams: hashRelayParams(relayParams),
    subaccountApproval: subaccountApproval ? hashSubaccountApproval(subaccountApproval) : zeroHash,
  };

  return {
    signer,
    types,
    typedData,
    domain,
  };
}

function getBatchParamsLists(batchParams: BatchOrderTxnParams) {
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
