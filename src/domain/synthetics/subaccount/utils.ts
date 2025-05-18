import cryptoJs from "crypto-js";
import { ethers, Provider, Signer } from "ethers";
import { decodeFunctionResult, encodeAbiParameters, encodeFunctionData, keccak256, maxUint256, zeroHash } from "viem";

import {
  SignedSubbacountApproval,
  Subaccount,
  SubaccountApproval,
  SubaccountSerializedConfig,
  SubaccountValidations,
} from "domain/synthetics/subaccount/types";
import { SubaccountOnchainData } from "domain/synthetics/subaccount/useSubaccountOnchainData";
import { WalletSigner } from "lib/wallets";
import { signTypedData } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";
import {
  maxAllowedSubaccountActionCountKey,
  SUBACCOUNT_ORDER_ACTION,
  subaccountActionCountKey,
  subaccountExpiresAtKey,
  subaccountListKey,
} from "sdk/configs/dataStore";
import {
  DEFAULT_SUBACCOUNT_DEADLINE_DURATION,
  DEFAULT_SUBACCOUNT_EXPIRY_DURATION,
  DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT,
} from "sdk/configs/express";
import { bigMath } from "sdk/utils/bigmath";
import { ZERO_DATA } from "sdk/utils/hash";
import { nowInSeconds, secondsToPeriod } from "sdk/utils/time";

import { getExpressContractAddress, getGelatoRelayRouterDomain } from "../express";

export function getSubaccountValidations({
  requiredActions,
  subaccount,
}: {
  requiredActions: number;
  subaccount: Subaccount;
}): SubaccountValidations {
  return {
    isExpired: getIsSubaccountExpired(subaccount),
    isActionsExceeded: getIsSubaccountActionsExceeded(subaccount, requiredActions),
    isNonceExpired: getIsNonceExpired(subaccount),
    isValid: getIsInvalidSubaccount(subaccount, requiredActions),
  };
}

export function getIsSubaccountActive(subaccount: {
  onchainData: SubaccountOnchainData;
  signedApproval: SignedSubbacountApproval | undefined;
}): boolean {
  let active = subaccount.onchainData.active;

  if (!active && subaccount.signedApproval && !getIsEmptySubaccountApproval(subaccount.signedApproval)) {
    active = subaccount.signedApproval.shouldAdd;
  }

  return active;
}

export function getSubaccountSigner(config: SubaccountSerializedConfig, account: string, provider?: ethers.Provider) {
  const decryptedPrivateKey = cryptoJs.AES.decrypt(config.privateKey, account).toString(cryptoJs.enc.Utf8);
  const wallet = new ethers.Wallet(decryptedPrivateKey, provider);

  return wallet;
}

export function getMaxSubaccountActions(subaccount: {
  onchainData: SubaccountOnchainData;
  signedApproval: SignedSubbacountApproval | undefined;
}): bigint {
  if (subaccount.signedApproval && !getIsEmptySubaccountApproval(subaccount.signedApproval)) {
    return BigInt(subaccount.signedApproval.maxAllowedCount);
  }

  return subaccount.onchainData.maxAllowedCount;
}

export function getSubaccountExpiresAt(subaccount: {
  onchainData: SubaccountOnchainData;
  signedApproval: SignedSubbacountApproval | undefined;
}): bigint {
  if (subaccount.signedApproval && !getIsEmptySubaccountApproval(subaccount.signedApproval)) {
    return BigInt(subaccount.signedApproval.expiresAt);
  }

  return subaccount.onchainData.expiresAt;
}

export function getRemainingSubaccountActions(subaccount: {
  onchainData: SubaccountOnchainData;
  signedApproval: SignedSubbacountApproval | undefined;
}): bigint {
  const maxAllowedCount = getMaxSubaccountActions(subaccount);
  const currentActionCount = subaccount.onchainData.currentActionsCount;

  return maxAllowedCount - currentActionCount;
}

export function getIsApprovalDeadlineExpired(approval: SubaccountApproval): boolean {
  const now = BigInt(nowInSeconds());
  const deadline = approval.deadline;

  return now >= deadline;
}

export function getIsSubaccountActionsExceeded(subaccount: Subaccount, requiredActions: number) {
  return getRemainingSubaccountActions(subaccount) < bigMath.max(1n, BigInt(requiredActions));
}

export function getRemainingSubaccountSeconds(subaccount: Subaccount): bigint {
  const expiresAt = getSubaccountExpiresAt(subaccount);

  const now = BigInt(nowInSeconds());

  return bigMath.max(0n, expiresAt - now);
}

export function getRemainingSubaccountDays(subaccount: Subaccount): bigint {
  const seconds = getRemainingSubaccountSeconds(subaccount);

  return BigInt(secondsToPeriod(Number(seconds), "1d"));
}

export function getIsApprovalExpired(subaccount: Subaccount): boolean {
  const { signedApproval } = subaccount;

  if (getIsEmptySubaccountApproval(signedApproval)) {
    return false;
  }

  const now = BigInt(nowInSeconds());

  const expiresAt = signedApproval.expiresAt;
  const deadline = signedApproval.deadline;

  return now >= expiresAt || now >= deadline;
}

export function getIsNonceExpired(subaccount: Subaccount): boolean {
  if (getIsEmptySubaccountApproval(subaccount.signedApproval)) {
    return false;
  }

  const onChainNonce = subaccount.onchainData.approvalNonce;
  const signedNonce = subaccount.signedApproval.nonce;

  return signedNonce !== onChainNonce;
}

export function getIsSubaccountExpired(subaccount: Subaccount): boolean {
  const now = BigInt(nowInSeconds());
  const isApprovalExpired = getIsApprovalExpired(subaccount);

  if (isApprovalExpired) {
    return true;
  }

  const expiresAt = getSubaccountExpiresAt(subaccount);
  const isExpired = now >= expiresAt;

  return isExpired;
}

export function getIsInvalidSubaccount(subaccount: Subaccount, requiredActions: number): boolean {
  const isExpired = getIsSubaccountExpired(subaccount);
  const isNonceExpired = getIsNonceExpired(subaccount);
  const actionsExceeded = getIsSubaccountActionsExceeded(subaccount, requiredActions);

  return isExpired || isNonceExpired || actionsExceeded;
}

export function getEmptySubaccountApproval(subaccountAddress: string): SignedSubbacountApproval {
  return {
    subaccount: subaccountAddress,
    shouldAdd: false,
    expiresAt: 0n,
    maxAllowedCount: 0n,
    actionType: SUBACCOUNT_ORDER_ACTION,
    nonce: 0n,
    deadline: maxUint256,
    signature: ZERO_DATA,
    signedAt: 0,
  };
}

export function getIsEmptySubaccountApproval(subaccountApproval: SignedSubbacountApproval): boolean {
  return (
    subaccountApproval.signature === ZERO_DATA &&
    subaccountApproval.nonce === 0n &&
    subaccountApproval.expiresAt === 0n &&
    subaccountApproval.maxAllowedCount === 0n &&
    subaccountApproval.shouldAdd === false
  );
}

export async function getInitialSubaccountApproval({
  chainId,
  signer,
  provider,
  subaccountAddress,
}: {
  chainId: number;
  signer: WalletSigner;
  provider: Provider;
  subaccountAddress: string;
}) {
  const onchainData = await getSubaccountOnchainData({ chainId, signer, provider, subaccountAddress });

  const defaultExpiresAt = BigInt(nowInSeconds() + DEFAULT_SUBACCOUNT_EXPIRY_DURATION);

  let expiresAt = getSubaccountExpiresAt({
    onchainData,
    signedApproval: undefined,
  });

  if (expiresAt < defaultExpiresAt) {
    expiresAt = defaultExpiresAt;
  }

  let maxAllowedCount = getRemainingSubaccountActions({
    onchainData,
    signedApproval: undefined,
  });

  const defaultMaxAllowedCount = BigInt(DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT);

  if (maxAllowedCount < defaultMaxAllowedCount) {
    maxAllowedCount = onchainData.maxAllowedCount + defaultMaxAllowedCount - maxAllowedCount;
  }

  const defaultSubaccountApproval = await createAndSignSubaccountApproval(
    chainId,
    signer,
    subaccountAddress,
    onchainData.approvalNonce,
    {
      shouldAdd: !onchainData.active,
      expiresAt,
      maxAllowedCount,
      deadline: BigInt(nowInSeconds() + DEFAULT_SUBACCOUNT_DEADLINE_DURATION),
    }
  );

  return defaultSubaccountApproval;
}

export function getActualApproval(subaccount: {
  address: string;
  signedApproval: SignedSubbacountApproval | undefined;
  onchainData: SubaccountOnchainData;
}): SignedSubbacountApproval {
  const { signedApproval, address, onchainData } = subaccount;

  if (!signedApproval || getIsSubaccountApprovalSynced({ signedApproval, onchainData })) {
    return getEmptySubaccountApproval(address);
  }

  return signedApproval;
}

export function getIsSubaccountApprovalSynced(subaccount: {
  signedApproval: SignedSubbacountApproval;
  onchainData: SubaccountOnchainData;
}): boolean {
  const { signedApproval, onchainData } = subaccount;

  return (
    onchainData.maxAllowedCount === signedApproval.maxAllowedCount &&
    onchainData.expiresAt === signedApproval.expiresAt &&
    onchainData.active === true
  );
}

export async function signUpdatedSubaccountSettings({
  chainId,
  signer,
  subaccount,
  nextRemainigActions,
  nextRemainingSeconds,
}: {
  chainId: number;
  signer: WalletSigner;
  subaccount: Subaccount;
  nextRemainigActions: bigint | undefined;
  nextRemainingSeconds: bigint | undefined;
}) {
  const oldMaxAllowedCount = getMaxSubaccountActions(subaccount);
  const oldRemainingActions = getRemainingSubaccountActions(subaccount);

  let nextMaxAllowedCount = oldMaxAllowedCount;

  if (nextRemainigActions !== undefined) {
    nextMaxAllowedCount = oldMaxAllowedCount + nextRemainigActions - oldRemainingActions;
  }

  const oldExpiresAt = getSubaccountExpiresAt(subaccount);
  const oldRemainingSeconds = getRemainingSubaccountSeconds(subaccount);

  let nextExpiresAt = oldExpiresAt;

  if (nextRemainingSeconds !== undefined) {
    nextExpiresAt = oldExpiresAt + nextRemainingSeconds - oldRemainingSeconds;
  }

  const nonce = await getSubaccountApprovalNonceForSigner(chainId, signer);

  const signedSubaccountApproval = await createAndSignSubaccountApproval(chainId, signer, subaccount.address, nonce, {
    deadline: BigInt(nowInSeconds() + DEFAULT_SUBACCOUNT_DEADLINE_DURATION),
    expiresAt: nextExpiresAt,
    maxAllowedCount: nextMaxAllowedCount,
    shouldAdd: !subaccount.onchainData.active,
  });

  return signedSubaccountApproval;
}

export async function createAndSignSubaccountApproval(
  chainId: number,
  mainAccountSigner: Signer,
  subaccountAddress: string,
  nonce: bigint,
  params: {
    shouldAdd: boolean;
    expiresAt: bigint;
    maxAllowedCount: bigint;
    deadline: bigint;
  }
): Promise<SignedSubbacountApproval> {
  const types = {
    SubaccountApproval: [
      { name: "subaccount", type: "address" },
      { name: "shouldAdd", type: "bool" },
      { name: "expiresAt", type: "uint256" },
      { name: "maxAllowedCount", type: "uint256" },
      { name: "actionType", type: "bytes32" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(chainId, true);

  const typedData = {
    subaccount: subaccountAddress,
    shouldAdd: params.shouldAdd,
    actionType: SUBACCOUNT_ORDER_ACTION,
    expiresAt: params.expiresAt,
    maxAllowedCount: params.maxAllowedCount,
    nonce,
    deadline: params.deadline,
  };

  const signature = await signTypedData({ signer: mainAccountSigner, domain, types, typedData });

  return {
    ...typedData,
    signature,
    signedAt: Date.now(),
  };
}

export function hashSubaccountApproval(subaccountApproval: SignedSubbacountApproval) {
  if (!subaccountApproval) {
    return zeroHash;
  }

  const encodedData = encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "subaccount", type: "address" },
          { name: "shouldAdd", type: "bool" },
          { name: "expiresAt", type: "uint256" },
          { name: "maxAllowedCount", type: "uint256" },
          { name: "actionType", type: "bytes32" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "signature", type: "bytes" },
        ],
      },
    ],
    [subaccountApproval as any]
  );

  return keccak256(encodedData);
}

export async function getSubaccountApprovalNonceForSigner(chainId: number, signer: WalletSigner) {
  const contractAddress = getExpressContractAddress(chainId, { isSubaccount: true });
  const contract = new ethers.Contract(contractAddress, abis.SubaccountGelatoRelayRouter, signer);

  return contract.subaccountApprovalNonces(signer.address);
}

export async function getSubaccountOnchainData({
  chainId,
  signer,
  provider,
  subaccountAddress,
}: {
  chainId: number;
  signer: WalletSigner;
  provider: Provider;
  subaccountAddress: string;
}) {
  const account = signer.address;

  const calls: {
    [key in keyof SubaccountOnchainData]: {
      contractAddress: string;
      abi: any;
      functionName: string;
      args: any[];
    };
  } = {
    approvalNonce: {
      contractAddress: getExpressContractAddress(chainId, { isSubaccount: true }),
      abi: abis.SubaccountGelatoRelayRouter,
      functionName: "subaccountApprovalNonces",
      args: [account],
    },
    active: {
      contractAddress: getContract(chainId, "DataStore"),
      abi: abis.DataStore,
      functionName: "containsAddress",
      args: [subaccountListKey(account), subaccountAddress],
    },
    maxAllowedCount: {
      contractAddress: getContract(chainId, "DataStore"),
      abi: abis.DataStore,
      functionName: "getUint",
      args: [maxAllowedSubaccountActionCountKey(account, subaccountAddress, SUBACCOUNT_ORDER_ACTION)],
    },
    currentActionsCount: {
      contractAddress: getContract(chainId, "DataStore"),
      abi: abis.DataStore,
      functionName: "getUint",
      args: [subaccountActionCountKey(account, subaccountAddress, SUBACCOUNT_ORDER_ACTION)],
    },
    expiresAt: {
      contractAddress: getContract(chainId, "DataStore"),
      abi: abis.DataStore,
      functionName: "getUint",
      args: [subaccountExpiresAtKey(account, subaccountAddress, SUBACCOUNT_ORDER_ACTION)],
    },
  };

  const callData = encodeFunctionData({
    abi: abis.Multicall,
    functionName: "aggregate",
    args: [
      Object.values(calls).map((call) => ({
        target: call.contractAddress,
        callData: encodeFunctionData(call),
      })),
    ],
  });

  const result = await provider.call({
    data: callData,
    to: getContract(chainId, "Multicall"),
  });

  const [_, decodedMulticallResults] = decodeFunctionResult({
    abi: abis.Multicall,
    data: result as `0x${string}`,
    functionName: "aggregate",
  }) as [bigint, string[]];

  const results: SubaccountOnchainData = Object.entries(calls).reduce((acc, [key, call], index) => {
    acc[key] = decodeFunctionResult({
      abi: call.abi,
      functionName: call.functionName,
      data: decodedMulticallResults[index] as `0x${string}`,
    });

    return acc;
  }, {} as SubaccountOnchainData);

  return results;
}
