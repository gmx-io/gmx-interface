import { ethers, Provider, Signer } from "ethers";
import { encodeFunctionData } from "viem";

import type { ContractsChainId, SourceChainId } from "config/chains";
import {
  estimateArbitraryRelayFee,
  getArbitraryRelayParamsAndPayload,
  getRawBaseRelayerParams,
} from "domain/multichain/arbitraryRelayParams";
import { callContract } from "lib/contracts";
import { ExpressTxnData, sendExpressTransaction } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { signTypedData } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import SubaccountRouterAbi from "sdk/abis/SubaccountRouter";
import { getContract } from "sdk/configs/contracts";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";

import {
  ExpressTransactionBuilder,
  getExpressContractAddress,
  getGelatoRelayRouterDomain,
  GlobalExpressParams,
  hashRelayParams,
  RelayParamsPayload,
} from "../express";
import { getMultichainInfoFromSigner, getOrderRelayRouterAddress } from "../express/expressOrderUtils";
import { Subaccount } from "../subaccount";

export async function removeSubaccountWalletTxn(
  chainId: ContractsChainId,
  signer: Signer,
  subaccountAddress: string
): Promise<void> {
  const subaccountRouter = new ethers.Contract(getContract(chainId, "SubaccountRouter"), SubaccountRouterAbi, signer);

  return callContract(chainId, subaccountRouter, "removeSubaccount", [subaccountAddress], {
    value: 0n,
    hideSuccessMsg: true,
    hideSentMsg: true,
    hideErrorMsg: true,
  });
}

export async function buildAndSignRemoveSubaccountTxn({
  chainId,
  relayParamsPayload,
  subaccount,
  signer,
  relayerFeeTokenAddress,
  relayerFeeAmount,
  emptySignature,
}: {
  chainId: ContractsChainId;
  relayParamsPayload: RelayParamsPayload;
  subaccount: Subaccount;
  signer: WalletSigner;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
  emptySignature?: boolean;
}): Promise<ExpressTxnData> {
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);

  const isMultichain = srcChainId !== undefined;

  const relayRouterAddress = getExpressContractAddress(chainId, {
    isSubaccount: true,
    isMultichain,
    scope: "subaccount",
  });

  let signature: string;

  if (emptySignature) {
    signature = "0x";
  } else {
    signature = await signRemoveSubaccountPayload({
      signer,
      relayParams: relayParamsPayload,
      subaccountAddress: subaccount.address,
      chainId,
    });
  }

  let removeSubaccountCallData: string;
  if (isMultichain) {
    removeSubaccountCallData = encodeFunctionData({
      abi: abis.MultichainSubaccountRouter,
      functionName: "removeSubaccount",
      args: [{ ...relayParamsPayload, signature }, signer.address, BigInt(srcChainId ?? chainId), subaccount.address],
    });
  } else {
    removeSubaccountCallData = encodeFunctionData({
      abi: abis.SubaccountGelatoRelayRouter,
      functionName: "removeSubaccount",
      args: [{ ...relayParamsPayload, signature }, signer.address, subaccount.address],
    });
  }

  return {
    callData: removeSubaccountCallData,
    to: relayRouterAddress,
    feeToken: relayerFeeTokenAddress,
    feeAmount: relayerFeeAmount,
  };
}

async function signRemoveSubaccountPayload({
  signer,
  relayParams,
  subaccountAddress,
  chainId,
}: {
  signer: WalletSigner;
  relayParams: RelayParamsPayload | RelayParamsPayload;
  subaccountAddress: string;
  chainId: ContractsChainId;
}) {
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);

  const relayRouterAddress = getOrderRelayRouterAddress(chainId, true, srcChainId !== undefined);

  const types = {
    RemoveSubaccount: [
      { name: "subaccount", type: "address" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(srcChainId ?? chainId, relayRouterAddress);

  const typedData = {
    subaccount: subaccountAddress,
    relayParams: hashRelayParams(relayParams),
  };

  return signTypedData({
    signer,
    types,
    typedData,
    domain,
  });
}

export async function removeSubaccountExpressTxn({
  chainId,
  provider,
  account,
  srcChainId,
  signer,
  subaccount,
  globalExpressParams,
  isSponsoredCallAvailable,
}: {
  chainId: ContractsChainId;
  provider: Provider;
  account: string;
  srcChainId: SourceChainId | undefined;
  signer: WalletSigner;
  subaccount: Subaccount;
  globalExpressParams: GlobalExpressParams;
  isSponsoredCallAvailable: boolean;
}) {
  if (!provider || !account) {
    throw new Error("No provider or account");
  }

  const { rawBaseRelayParamsPayload, baseRelayFeeSwapParams } = getRawBaseRelayerParams({
    chainId,
    account,
    globalExpressParams: globalExpressParams,
  });

  if (!rawBaseRelayParamsPayload || !baseRelayFeeSwapParams) {
    throw new Error("No base express params");
  }

  const getTxnData: ExpressTransactionBuilder = async ({ relayParams, gasPaymentParams, subaccount }) => {
    if (!subaccount) {
      throw new Error("No subaccount");
    }

    const txnData = await buildAndSignRemoveSubaccountTxn({
      chainId,
      signer,
      subaccount,
      relayParamsPayload: {
        ...relayParams,
        deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
      },
      relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
      relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
      emptySignature: true,
    });

    return {
      txnData,
    };
  };

  const relayerFeeAmount = await estimateArbitraryRelayFee({
    chainId,
    client: getPublicClientWithRpc(chainId),
    account,
    rawRelayParamsPayload: rawBaseRelayParamsPayload,
    expressTransactionBuilder: getTxnData,
    gasPaymentParams: baseRelayFeeSwapParams.gasPaymentParams,
    subaccount: subaccount,
  });

  if (relayerFeeAmount === undefined) {
    throw new Error("No relay fee amount");
  }

  const { relayFeeParams, relayParamsPayload } = getArbitraryRelayParamsAndPayload({
    chainId,
    account,
    isGmxAccount: srcChainId !== undefined,
    relayerFeeAmount,
    globalExpressParams: globalExpressParams,
    subaccount,
  });

  if (!relayFeeParams || !relayParamsPayload) {
    throw new Error("No relayFeeParams or relayParamsPayload");
  }

  const txnData = await buildAndSignRemoveSubaccountTxn({
    chainId,
    signer,
    subaccount,
    relayParamsPayload: {
      ...relayParamsPayload,
      deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
    },
    relayerFeeAmount: relayFeeParams.gasPaymentParams.relayerFeeAmount,
    relayerFeeTokenAddress: relayFeeParams.gasPaymentParams.relayerFeeTokenAddress,
    emptySignature: false,
  });

  if (!txnData) {
    throw new Error("No txnData");
  }

  await sendExpressTransaction({
    chainId,
    isSponsoredCall: isSponsoredCallAvailable,
    txnData,
  });
}
