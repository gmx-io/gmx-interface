import cryptoJs from "crypto-js";
import { ethers, Signer } from "ethers";
import { encodeAbiParameters, keccak256, maxUint256, zeroHash } from "viem";

import { SubaccountSerializedConfig } from "domain/synthetics/subaccount/types";
import { SubaccountOnchainData } from "domain/synthetics/subaccount/useSubaccountFromContractsRequest";
import { SUBACCOUNT_ORDER_ACTION } from "sdk/configs/dataStore";
import {
  DEFAULT_SUBACCOUNT_DEADLINE_DURATION,
  DEFAULT_SUBACCOUNT_EXPIRY_DURATION,
  DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT,
} from "sdk/configs/express";
import { bigMath } from "sdk/utils/bigmath";
import { ZERO_DATA } from "sdk/utils/hash";
import { nowInSeconds } from "sdk/utils/time";

import { getGelatoRelayRouterDomain } from "./relayParams";
import { signTypedData } from "./signing";

export type Subaccount = {
  address: string;
  signedApproval: SignedSubbacountApproval | undefined;
  onchainData: SubaccountOnchainData;
  signer: ethers.Wallet;
  optimisticActive: boolean;
  optimisticMaxAllowedCount: bigint;
  optimisticExpiresAt: bigint;
};

export type SubaccountApproval = {
  subaccount: string;
  nonce: bigint;
  shouldAdd: boolean;
  expiresAt: bigint;
  maxAllowedCount: bigint;
  actionType: string;
  deadline: bigint;
};

export function getIsSubaccountActive(subaccount: {
  onchainData: SubaccountOnchainData;
  signedApproval: SignedSubbacountApproval | undefined;
}): boolean {
  return (subaccount.onchainData.active || subaccount.signedApproval?.shouldAdd) ?? false;
}

export function getSubaccountSigner(config: SubaccountSerializedConfig, account: string, provider?: ethers.Provider) {
  const decryptedPrivateKey = cryptoJs.AES.decrypt(config.privateKey, account).toString(cryptoJs.enc.Utf8);
  const wallet = new ethers.Wallet(decryptedPrivateKey, provider);

  return wallet;
}

export function getMaxSubaccountActions(subaccount: Pick<Subaccount, "signedApproval" | "onchainData">): bigint {
  const signedValue = subaccount.signedApproval?.maxAllowedCount
    ? BigInt(subaccount.signedApproval?.maxAllowedCount)
    : undefined;

  return signedValue ?? subaccount.onchainData.maxAllowedCount;
}

export function getRemainingSubaccountActions(subaccount: Subaccount): bigint {
  const maxAllowedCount = getMaxSubaccountActions(subaccount);
  const currentActionCount = subaccount.onchainData.currentActionsCount;

  return maxAllowedCount - currentActionCount;
}

export function getSubaccountExpiresAt(subaccount: Pick<Subaccount, "signedApproval" | "onchainData">): bigint {
  const signedValue = subaccount.signedApproval?.expiresAt ? BigInt(subaccount.signedApproval?.expiresAt) : undefined;
  return signedValue ?? subaccount.onchainData.expiresAt;
}

export function getInitialSubaccountApprovalParams({
  onchainData,
}: {
  onchainData: SubaccountOnchainData | undefined;
}) {
  const oldCurrentActionsCount = onchainData?.currentActionsCount ?? 0n;

  const newMaxAllowedCount = oldCurrentActionsCount + BigInt(DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT);

  const newExpiresAt = BigInt(nowInSeconds()) + BigInt(DEFAULT_SUBACCOUNT_EXPIRY_DURATION);
  const newDeadline = BigInt(nowInSeconds()) + BigInt(DEFAULT_SUBACCOUNT_DEADLINE_DURATION);

  return {
    maxAllowedCount: newMaxAllowedCount,
    expiresAt: newExpiresAt,
    deadline: newDeadline,
  };
}

export function getRemainingSubaccountSeconds(subaccount: Subaccount): bigint {
  const expiresAt = getSubaccountExpiresAt(subaccount);

  const now = BigInt(nowInSeconds());

  return expiresAt - now;
}

export type SignedSubbacountApproval = SubaccountApproval & {
  signature: string;
};

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

export function getActualApproval(subaccount: Subaccount | undefined): SignedSubbacountApproval | undefined {
  if (!subaccount) {
    return undefined;
  }

  const { signedApproval, address } = subaccount;

  if (!signedApproval || getIsSubaccountApprovalSynced(subaccount)) {
    return getEmptySubaccountApproval(address);
  }

  return signedApproval;
}

export function getIsSubaccountApprovalSynced(subaccount: Subaccount): boolean {
  const { signedApproval, onchainData } = subaccount;

  if (!signedApproval) {
    return false;
  }

  return (
    onchainData.maxAllowedCount === signedApproval.maxAllowedCount && onchainData.expiresAt === signedApproval.expiresAt
  );
}

export function getIsApprovalExpired(subaccount: Subaccount): boolean {
  const { signedApproval, onchainData } = subaccount;

  if (!signedApproval || getIsEmptySubaccountApproval(signedApproval)) {
    return false;
  }

  const now = BigInt(nowInSeconds());

  const expiresAt = signedApproval.expiresAt;
  const deadline = signedApproval.deadline;

  return now >= expiresAt || now >= deadline || onchainData.approvalNonce !== signedApproval.nonce;
}

export function getIsApprovalDeadlineExpired(approval: SubaccountApproval): boolean {
  const now = BigInt(nowInSeconds());
  const deadline = approval.deadline;

  return now >= deadline;
}

export function getIsSubaccountActionsExceeded(subaccount: Subaccount, requiredActions: number) {
  return getRemainingSubaccountActions(subaccount) < bigMath.max(1n, BigInt(requiredActions));
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

export function getIsNonceExpired(subaccount: Subaccount): boolean {
  const onChainNonce = subaccount.onchainData.approvalNonce;
  const signedNonce = subaccount.signedApproval?.nonce;

  return Boolean(signedNonce !== undefined && signedNonce > onChainNonce);
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

  // Create domain separator
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

  const signature = await signTypedData(mainAccountSigner, domain, types, typedData);

  return {
    ...typedData,
    signature,
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
