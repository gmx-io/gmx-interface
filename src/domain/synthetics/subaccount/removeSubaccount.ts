import { ethers, Signer } from "ethers";
import { encodeFunctionData } from "viem";

import type { ContractsChainId, SourceChainId } from "config/chains";
import {
  estimateArbitraryRelayFee,
  getArbitraryRelayParamsAndPayload,
  getRawBaseRelayerParams,
} from "domain/multichain/arbitraryRelayParams";
import { callContract } from "lib/contracts";
import { sleepWithSignal } from "lib/sleep";
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
import { createViemRpc } from "sdk/utils/rpc";
import type { Subaccount } from "sdk/utils/subaccount";
import { nowInSeconds } from "sdk/utils/time";

import {
  ExpressTransactionBuilder,
  ExpressTxnParams,
  GasPaymentParams,
  getExpressContractAddress,
  getGelatoRelayRouterDomain,
  GlobalExpressParams,
  hashRelayParams,
  RawRelayParamsPayload,
  RelayParamsPayload,
} from "../express";
import { SubaccountRemovalRelayFailedError, SubaccountRemovalResultUnknownError } from "./errors";
import {
  estimateExpressParams,
  getMultichainInfoFromSigner,
  getOrderRelayRouterAddress,
} from "../express/expressOrderUtils";

const SUBACCOUNT_REMOVAL_POLL_INTERVAL_MS = 2000;

export type SubaccountRemovalTarget = Pick<Subaccount, "address">;

export async function removeSubaccountWalletTxn(
  chainId: ContractsChainId,
  signer: Signer,
  subaccountAddress: string
): Promise<void> {
  const subaccountRouter = new ethers.Contract(getContract(chainId, "SubaccountRouter"), SubaccountRouterAbi, signer);

  const res = await callContract(chainId, subaccountRouter, "removeSubaccount", [subaccountAddress], {
    value: 0n,
    hideSuccessMsg: true,
    hideSentMsg: true,
    hideErrorMsg: true,
  });

  if (!res) {
    return;
  }

  const account = await signer.getAddress();
  const abortController = new AbortController();

  try {
    await Promise.race([
      res.wait(),
      waitForSubaccountRemoval({ chainId, account, subaccountAddress, signal: abortController.signal }),
    ]);
  } finally {
    abortController.abort();
  }
}

export async function removeSubaccountsWalletTxn(
  chainId: ContractsChainId,
  signer: Signer,
  subaccountAddresses: string[]
): Promise<void> {
  if (subaccountAddresses.length === 1) {
    return removeSubaccountWalletTxn(chainId, signer, subaccountAddresses[0]);
  }

  const subaccountRouter = new ethers.Contract(getContract(chainId, "SubaccountRouter"), SubaccountRouterAbi, signer);

  const calls = subaccountAddresses.map((subaccountAddress) =>
    encodeFunctionData({ abi: SubaccountRouterAbi, functionName: "removeSubaccount", args: [subaccountAddress] })
  );

  const res = await callContract(chainId, subaccountRouter, "multicall", [calls], {
    value: 0n,
    hideSuccessMsg: true,
    hideSentMsg: true,
    hideErrorMsg: true,
  });

  if (!res) {
    return;
  }

  const account = await signer.getAddress();
  const abortController = new AbortController();

  try {
    await Promise.race([
      res.wait(),
      Promise.all(
        subaccountAddresses.map((subaccountAddress) =>
          waitForSubaccountRemoval({ chainId, account, subaccountAddress, signal: abortController.signal })
        )
      ),
    ]);
  } finally {
    abortController.abort();
  }
}

async function waitForSubaccountRemoval({
  chainId,
  account,
  subaccountAddress,
  signal,
}: {
  chainId: ContractsChainId;
  account: string;
  subaccountAddress: string;
  signal: AbortSignal;
}): Promise<void> {
  const getIsDisabled = async () => {
    const isActive = await getIsSubaccountActiveOnchain({ chainId, account, subaccountAddress });
    return isActive === false;
  };

  while (!(await getIsDisabled())) {
    await sleepWithSignal(SUBACCOUNT_REMOVAL_POLL_INTERVAL_MS, signal);
  }
}

export async function getIsSubaccountActiveOnchain({
  chainId,
  account,
  subaccountAddress,
}: {
  chainId: ContractsChainId;
  account: string;
  subaccountAddress: string;
}): Promise<boolean | undefined> {
  try {
    const isActive = await getPublicClientWithRpc(chainId).readContract({
      address: getContract(chainId, "DataStore"),
      abi: abis.DataStore,
      functionName: "containsAddress",
      args: [subaccountListKey(account), subaccountAddress],
    });

    return isActive;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return undefined;
  }
}

export async function getIsSubaccountRemovalRequired({
  chainId,
  subaccount,
  account,
  isAfterUnknownResult = false,
}: {
  chainId: ContractsChainId;
  subaccount: SubaccountRemovalTarget & { onchainData: Pick<Subaccount["onchainData"], "active"> };
  account: string;
  // after a removal with an unknown result the cached active flag can be stale, so only the chain decides;
  // otherwise a cached active flag is trusted over a single read that may come from a lagging node
  isAfterUnknownResult?: boolean;
}): Promise<boolean> {
  if (subaccount.onchainData.active && !isAfterUnknownResult) {
    return true;
  }

  const freshOnchainActive = await getIsSubaccountActiveOnchain({
    chainId,
    account,
    subaccountAddress: subaccount.address,
  });

  return freshOnchainActive !== false;
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
  subaccount: SubaccountRemovalTarget;
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
    verificationChainId: chainId,
  });
}

export async function removeSubaccountExpressTxn({
  chainId,
  account,
  srcChainId,
  signer,
  subaccount,
  globalExpressParams,
}: {
  chainId: ContractsChainId;
  account: string;
  srcChainId: SourceChainId | undefined;
  signer: WalletSigner;
  subaccount: SubaccountRemovalTarget;
  globalExpressParams: GlobalExpressParams;
}) {
  if (!account) {
    throw new Error("No account");
  }

  const { rawBaseRelayParamsPayload, baseRelayFeeSwapParams } = getRawBaseRelayerParams({
    chainId,
    account,
    globalExpressParams: globalExpressParams,
  });

  if (!rawBaseRelayParamsPayload || !baseRelayFeeSwapParams) {
    throw new Error("No base express params");
  }

  const getTxnData: ExpressTransactionBuilder = async ({ relayParams, gasPaymentParams }) => {
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
    subaccount: undefined,
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
    subaccount: undefined,
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
      requiredAmount: relayFeeParams.gasPaymentParams.gasPaymentTokenAmount,
    });
  }

  await signAndSendRemoveSubaccountTxn({
    chainId,
    signer,
    subaccount,
    relayParamsPayload,
    gasPaymentParams: relayFeeParams.gasPaymentParams,
  });
}

// a signed removal paid from the wallet gas payment token; undefined when the wallet lacks balance
// or Router allowance for the estimated fee, or the simulated removal reverts
export async function estimateSettlementChainRemoveSubaccountExpressParams({
  chainId,
  account,
  signer,
  subaccount,
  globalExpressParams,
}: {
  chainId: ContractsChainId;
  account: string;
  signer: WalletSigner;
  subaccount: SubaccountRemovalTarget;
  globalExpressParams: GlobalExpressParams;
}): Promise<ExpressTxnParams | undefined> {
  const expressTransactionBuilder: ExpressTransactionBuilder = async ({ relayParams, gasPaymentParams }) => ({
    txnData: await buildAndSignRemoveSubaccountTxn({
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
    }),
  });

  return estimateExpressParams({
    chainId,
    isGmxAccount: false,
    globalExpressParams,
    estimationMethod: "estimateGas",
    requireValidations: true,
    // signed by the main account, the subaccount is only the one being removed
    subaccount: undefined,
    rpc: createViemRpc(getPublicClientWithRpc(chainId)),
    transactionParams: {
      account,
      isValid: true,
      gasPaymentTokenAsCollateralAmount: 0n,
      executionFeeAmount: 0n,
      executionGasLimit: 0n,
      transactionPayloadGasLimit: 0n,
      transactionExternalCalls: undefined,
      subaccountActions: 0,
      expressTransactionBuilder,
    },
  });
}

export async function removeSubaccountSettlementChainExpressTxn({
  chainId,
  signer,
  subaccount,
  expressParams,
}: {
  chainId: ContractsChainId;
  signer: WalletSigner;
  subaccount: SubaccountRemovalTarget;
  expressParams: ExpressTxnParams;
}) {
  await signAndSendRemoveSubaccountTxn({
    chainId,
    signer,
    subaccount,
    relayParamsPayload: expressParams.relayParamsPayload,
    gasPaymentParams: expressParams.gasPaymentParams,
  });
}

async function signAndSendRemoveSubaccountTxn({
  chainId,
  signer,
  subaccount,
  relayParamsPayload,
  gasPaymentParams,
}: {
  chainId: ContractsChainId;
  signer: WalletSigner;
  subaccount: SubaccountRemovalTarget;
  relayParamsPayload: RawRelayParamsPayload;
  gasPaymentParams: GasPaymentParams;
}) {
  const txnData = await buildAndSignRemoveSubaccountTxn({
    chainId,
    signer,
    subaccount,
    relayParamsPayload: {
      ...relayParamsPayload,
      deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
    },
    relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
    relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
    emptySignature: false,
  });

  if (!txnData) {
    throw new Error("No txnData");
  }

  const txnResult = await sendExpressTransaction({
    chainId,
    txnData,
  });

  let receipt: Awaited<ReturnType<typeof txnResult.wait>>;

  try {
    receipt = await txnResult.wait();
  } catch (error) {
    throw new SubaccountRemovalResultUnknownError(txnResult.taskId, error);
  }

  if (receipt.status === "failed") {
    throw new SubaccountRemovalRelayFailedError(txnResult.taskId, receipt.relayStatus?.message);
  }
}
