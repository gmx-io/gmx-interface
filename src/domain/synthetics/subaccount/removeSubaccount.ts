import { ethers, Provider, Signer } from "ethers";
import { decodeFunctionResult, encodeFunctionData, isHex } from "viem";

import type { ContractsChainId, SourceChainId } from "config/chains";
import {
  estimateArbitraryRelayFee,
  getArbitraryRelayParamsAndPayload,
  getRawBaseRelayerParams,
} from "domain/multichain/arbitraryRelayParams";
import { callContract } from "lib/contracts";
import { ExpressTxnData, sendExpressTransaction } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { signTypedData } from "lib/wallets/signing";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { abis } from "sdk/abis";
import SubaccountRouterAbi from "sdk/abis/SubaccountRouter";
import { getContract } from "sdk/configs/contracts";
import { subaccountListKey } from "sdk/configs/dataStore";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import {
  ExpressEstimationInsufficientGasPaymentTokenBalanceError,
  getIsConfirmedOutOfGasPaymentTokenBalance,
} from "sdk/utils/express";
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
  subaccountAddress: string,
  cachedOnchainActive?: boolean
): Promise<void> {
  const account = await signer.getAddress();
  const freshOnchainActive = signer.provider
    ? await getIsSubaccountActiveOnchain({ chainId, provider: signer.provider, account, subaccountAddress })
    : undefined;

  if (freshOnchainActive === false && cachedOnchainActive === false) {
    return;
  }

  const subaccountRouter = new ethers.Contract(getContract(chainId, "SubaccountRouter"), SubaccountRouterAbi, signer);

  const res = await callContract(chainId, subaccountRouter, "removeSubaccount", [subaccountAddress], {
    value: 0n,
    hideSuccessMsg: true,
    hideSentMsg: true,
    hideErrorMsg: true,
  });

  await res?.wait();
}

export async function getIsSubaccountActiveOnchain({
  chainId,
  provider,
  account,
  subaccountAddress,
}: {
  chainId: ContractsChainId;
  provider: Provider;
  account: string;
  subaccountAddress: string;
}): Promise<boolean | undefined> {
  try {
    const callData = encodeFunctionData({
      abi: abis.DataStore,
      functionName: "containsAddress",
      args: [subaccountListKey(account), subaccountAddress],
    });

    const result = await provider.call({
      to: getContract(chainId, "DataStore"),
      data: callData,
    });

    if (!isHex(result)) {
      return undefined;
    }

    return decodeFunctionResult({
      abi: abis.DataStore,
      functionName: "containsAddress",
      data: result,
    }) as boolean;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return undefined;
  }
}

async function buildAndSignRemoveSubaccountTxn({
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
  cachedOnchainActive,
}: {
  chainId: ContractsChainId;
  provider: Provider;
  account: string;
  srcChainId: SourceChainId | undefined;
  signer: WalletSigner;
  subaccount: Subaccount;
  globalExpressParams: GlobalExpressParams;
  cachedOnchainActive?: boolean;
}) {
  if (!provider || !account) {
    throw new Error("No provider or account");
  }

  const freshOnchainActive = await getIsSubaccountActiveOnchain({
    chainId,
    provider,
    account,
    subaccountAddress: subaccount.address,
  });

  if (freshOnchainActive === false && cachedOnchainActive === false) {
    return;
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
    globalExpressParams: globalExpressParams,
  });

  if (relayerFeeAmount === undefined) {
    throw new Error("No relay fee amount");
  }

  const { relayFeeParams, relayParamsPayload, gasPaymentValidations } = getArbitraryRelayParamsAndPayload({
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

  if (getIsConfirmedOutOfGasPaymentTokenBalance(gasPaymentValidations)) {
    throw new ExpressEstimationInsufficientGasPaymentTokenBalanceError({
      balance:
        srcChainId !== undefined
          ? globalExpressParams.gasPaymentToken.gmxAccountBalance
          : globalExpressParams.gasPaymentToken.walletBalance,
      requiredAmount: relayFeeParams.gasPaymentParams.totalRelayerFeeTokenAmount,
    });
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

  const txnResult = await sendExpressTransaction({
    chainId,
    txnData,
  });

  const receipt = await txnResult.wait();

  if (receipt.status === "failed") {
    throw new Error(`Remove subaccount transaction failed: ${receipt.relayStatus?.message ?? "reverted"}`);
  }
}
