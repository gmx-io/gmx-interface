import cryptoJs from "crypto-js";
import { ethers, Provider } from "ethers";
import {
  decodeFunctionResult,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  maxUint256,
  zeroAddress,
  zeroHash,
} from "viem";

import type { AnyChainId, ContractsChainId } from "config/chains";
import { isSourceChain } from "config/multichain";
import type {
  SignedSubacсountApproval,
  Subaccount,
  SubaccountApproval,
  SubaccountSerializedConfig,
  SubaccountValidations,
} from "domain/synthetics/subaccount/types";
import { WalletSigner } from "lib/wallets";
import { SignatureTypes, signTypedData } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";
import {
  maxAllowedSubaccountActionCountKey,
  SUBACCOUNT_ORDER_ACTION,
  subaccountActionCountKey,
  subaccountExpiresAtKey,
  subaccountIntegrationIdKey,
  subaccountListKey,
} from "sdk/configs/dataStore";
import { DEFAULT_SUBACCOUNT_EXPIRY_DURATION, DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT } from "sdk/configs/express";
import { bigMath } from "sdk/utils/bigmath";
import { ZERO_DATA } from "sdk/utils/hash";
import { nowInSeconds, secondsToPeriod } from "sdk/utils/time";
import type { SubaccountGelatoRelayRouter } from "typechain-types";

import { getGelatoRelayRouterDomain } from "../express";
import { SubaccountOnchainData } from "./useSubaccountOnchainData";
import { getMultichainInfoFromSigner, getOrderRelayRouterAddress } from "../express/expressOrderUtils";

export function getSubaccountValidations({
  requiredActions,
  subaccount,
  subaccountRouterAddress,
}: {
  requiredActions: number;
  subaccount: Subaccount;
  subaccountRouterAddress: string;
}): SubaccountValidations {
  return {
    isExpired: getIsSubaccountExpired(subaccount),
    isActionsExceeded: getIsSubaccountActionsExceeded(subaccount, requiredActions),
    isNonceExpired: getIsSubaccountNonceExpired(subaccount),
    isApprovalInvalid: getIsSubaccountApprovalInvalid({
      chainId: subaccount.chainId,
      signerChainId: subaccount.signerChainId,
      onchainData: subaccount.onchainData,
      signedApproval: subaccount.signedApproval,
      subaccountRouterAddress,
    }),
    isValid: !getIsInvalidSubaccount({ subaccount, requiredActions, subaccountRouterAddress }),
  };
}

export function getIsSubaccountActive(subaccount: {
  onchainData: SubaccountOnchainData;
  signedApproval: SignedSubacсountApproval | undefined;
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
  signedApproval: SignedSubacсountApproval | undefined;
}): bigint {
  if (subaccount.signedApproval && !getIsEmptySubaccountApproval(subaccount.signedApproval)) {
    return BigInt(subaccount.signedApproval.maxAllowedCount);
  }

  return subaccount.onchainData.maxAllowedCount;
}

export function getSubaccountExpiresAt(subaccount: {
  onchainData: SubaccountOnchainData;
  signedApproval: SignedSubacсountApproval | undefined;
}): bigint {
  if (subaccount.signedApproval && !getIsEmptySubaccountApproval(subaccount.signedApproval)) {
    return BigInt(subaccount.signedApproval.expiresAt);
  }

  return subaccount.onchainData.expiresAt;
}

export function getRemainingSubaccountActions(subaccount: {
  onchainData: SubaccountOnchainData;
  signedApproval: SignedSubacсountApproval | undefined;
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

/**
 * Returns false for empty subaccount approval
 */
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

/**
 * Returns false for empty subaccount approval
 */
export function getIsSubaccountNonceExpired({
  chainId,
  onchainData,
  signedApproval,
}: {
  chainId: ContractsChainId;
  onchainData: SubaccountOnchainData;
  signedApproval: SignedSubacсountApproval;
}): boolean {
  if (getIsEmptySubaccountApproval(signedApproval)) {
    return false;
  }

  if (chainId !== signedApproval.signatureChainId) {
    return false;
  }

  let onChainNonce: bigint;
  if (signedApproval.subaccountRouterAddress === getContract(chainId, "SubaccountGelatoRelayRouter")) {
    onChainNonce = onchainData.approvalNonce;
  } else if (signedApproval.subaccountRouterAddress === getContract(chainId, "MultichainSubaccountRouter")) {
    onChainNonce = onchainData.multichainApprovalNonce;
  } else if (!signedApproval.subaccountRouterAddress) {
    if (isSourceChain(signedApproval.signatureChainId)) {
      onChainNonce = onchainData.multichainApprovalNonce;
    } else {
      onChainNonce = onchainData.approvalNonce;
    }
  } else {
    // eslint-disable-next-line no-console
    console.error(
      `Invalid subaccount router address: ${signedApproval.subaccountRouterAddress} at ${signedApproval.signatureChainId} for chainId: ${chainId}`
    );
    return false;
  }

  const signedNonce = signedApproval.nonce;

  return signedNonce !== onChainNonce;
}

/**
 * Returns false for empty subaccount approval
 */
export function getIsSubaccountApprovalInvalid({
  chainId,
  signerChainId,
  signedApproval,
  onchainData,
  subaccountRouterAddress,
}: {
  chainId: ContractsChainId;
  signerChainId: AnyChainId;
  signedApproval: SignedSubacсountApproval;
  onchainData: SubaccountOnchainData;
  subaccountRouterAddress: string;
}): boolean {
  if (getIsEmptySubaccountApproval(signedApproval)) {
    return false;
  }

  const isSignedSubaccountFresh = !onchainData.active;

  let relatedOnchainNonce: bigint | undefined;
  if (signedApproval.subaccountRouterAddress === getContract(chainId, "MultichainSubaccountRouter")) {
    relatedOnchainNonce = onchainData.multichainApprovalNonce;
  } else if (
    signedApproval.subaccountRouterAddress === getContract(chainId, "SubaccountGelatoRelayRouter") ||
    !signedApproval.subaccountRouterAddress
  ) {
    relatedOnchainNonce = onchainData.approvalNonce;
  } else {
    return true;
  }

  // Technically it is possible to create a new subaccount without deactivating the old one
  // For this we need to check approval signature even if currently there is a subaccount but our nonce
  // would be able to update it
  const isSignedSubaccountPossibleUpdate = signedApproval.nonce === relatedOnchainNonce;

  const result =
    (isSignedSubaccountFresh || isSignedSubaccountPossibleUpdate) &&
    (signedApproval.signatureChainId !== signerChainId ||
      signedApproval.subaccountRouterAddress !== subaccountRouterAddress);

  return result;
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

export function getIsInvalidSubaccount({
  subaccount,
  requiredActions,
  subaccountRouterAddress,
}: {
  subaccount: Subaccount;
  requiredActions: number;
  subaccountRouterAddress: string;
}): boolean {
  const isExpired = getIsSubaccountExpired(subaccount);
  const isNonceExpired = getIsSubaccountNonceExpired(subaccount);
  const actionsExceeded = getIsSubaccountActionsExceeded(subaccount, requiredActions);
  const isApprovalInvalid = getIsSubaccountApprovalInvalid({
    chainId: subaccount.chainId,
    signedApproval: subaccount.signedApproval,
    subaccountRouterAddress,
    signerChainId: subaccount.signerChainId,
    onchainData: subaccount.onchainData,
  });

  return isExpired || isNonceExpired || actionsExceeded || isApprovalInvalid;
}

export function getEmptySubaccountApproval(
  chainId: ContractsChainId,
  subaccountAddress: string
): SignedSubacсountApproval {
  return {
    subaccount: subaccountAddress,
    shouldAdd: false,
    expiresAt: 0n,
    maxAllowedCount: 0n,
    actionType: SUBACCOUNT_ORDER_ACTION,
    nonce: 0n,
    deadline: maxUint256,
    desChainId: BigInt(chainId),
    signature: ZERO_DATA,
    signedAt: 0,
    integrationId: zeroHash,
    subaccountRouterAddress: zeroAddress,
    signatureChainId: chainId,
  };
}

export function getIsEmptySubaccountApproval(subaccountApproval: SignedSubacсountApproval): boolean {
  return (
    subaccountApproval.signature === ZERO_DATA &&
    subaccountApproval.nonce === 0n &&
    subaccountApproval.expiresAt === 0n &&
    subaccountApproval.maxAllowedCount === 0n &&
    subaccountApproval.shouldAdd === false &&
    subaccountApproval.integrationId === zeroHash
  );
}

export async function getInitialSubaccountApproval({
  chainId,
  signer,
  provider,
  subaccountAddress,
  isGmxAccount,
}: {
  chainId: ContractsChainId;
  signer: WalletSigner;
  provider: Provider;
  subaccountAddress: string;
  isGmxAccount: boolean;
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

  const defaultMaxAllowedCount = BigInt(DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT);
  const maxAllowedCount = onchainData.currentActionsCount + defaultMaxAllowedCount;

  const defaultSubaccountApproval = await createAndSignSubaccountApproval(
    chainId,
    signer,
    provider,
    subaccountAddress,
    {
      shouldAdd: !onchainData.active,
      expiresAt,
      maxAllowedCount,
    },
    isGmxAccount
  );

  return defaultSubaccountApproval;
}

export function getActualApproval(params: {
  chainId: ContractsChainId;
  address: string;
  signedApproval: SignedSubacсountApproval | undefined;
  onchainData: SubaccountOnchainData;
}): SignedSubacсountApproval {
  const { chainId, signedApproval, address, onchainData } = params;

  if (
    !signedApproval ||
    getIsSubaccountApprovalSynced({
      chainId,
      signedApproval,
      onchainData,
    })
  ) {
    return getEmptySubaccountApproval(chainId, address);
  }

  return signedApproval;
}

export function getIsSubaccountApprovalSynced(params: {
  chainId: ContractsChainId;
  signedApproval: SignedSubacсountApproval;
  onchainData: SubaccountOnchainData;
}): boolean {
  const { signedApproval, onchainData } = params;

  /**
   * If nonce is expired, we believe a newer settings have been applied in some other way e.g. different browser
   */
  if (getIsSubaccountNonceExpired(params)) {
    return true;
  }

  return (
    onchainData.maxAllowedCount === signedApproval.maxAllowedCount &&
    onchainData.expiresAt === signedApproval.expiresAt &&
    onchainData.active === true
  );
}

export async function signUpdatedSubaccountSettings({
  chainId,
  signer,
  provider,
  subaccount,
  nextRemainigActions,
  nextRemainingSeconds,
  isGmxAccount,
}: {
  chainId: ContractsChainId;
  signer: WalletSigner;
  provider: Provider;
  subaccount: Subaccount;
  nextRemainigActions: bigint | undefined;
  nextRemainingSeconds: bigint | undefined;
  isGmxAccount: boolean;
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

  const signedSubaccountApproval = await createAndSignSubaccountApproval(
    chainId,
    signer,
    provider,
    subaccount.address,
    {
      expiresAt: nextExpiresAt,
      maxAllowedCount: nextMaxAllowedCount,
      shouldAdd: !subaccount.onchainData.active,
    },
    isGmxAccount
  );

  return signedSubaccountApproval;
}

export async function createAndSignSubaccountApproval(
  chainId: ContractsChainId,
  mainAccountSigner: WalletSigner,
  provider: Provider,
  subaccountAddress: string,
  params: {
    shouldAdd: boolean;
    expiresAt: bigint;
    maxAllowedCount: bigint;
  },
  isGmxAccount: boolean
): Promise<SignedSubacсountApproval> {
  const srcChainId = await getMultichainInfoFromSigner(mainAccountSigner, chainId);

  const nonce = await getSubaccountApprovalNonceForProvider(chainId, mainAccountSigner, provider, isGmxAccount);

  const subaccountRouterAddress = getOrderRelayRouterAddress(chainId, true, isGmxAccount);

  const types: SignatureTypes = {
    SubaccountApproval: [
      { name: "subaccount", type: "address" },
      { name: "shouldAdd", type: "bool" },
      { name: "expiresAt", type: "uint256" },
      { name: "maxAllowedCount", type: "uint256" },
      { name: "actionType", type: "bytes32" },
      { name: "nonce", type: "uint256" },
      { name: "desChainId", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "integrationId", type: "bytes32" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(srcChainId ?? chainId, subaccountRouterAddress);

  const typedData = {
    subaccount: subaccountAddress,
    shouldAdd: params.shouldAdd,
    expiresAt: params.expiresAt,
    maxAllowedCount: params.maxAllowedCount,
    desChainId: BigInt(chainId),
    actionType: SUBACCOUNT_ORDER_ACTION,
    nonce,
    integrationId: zeroHash,
    deadline: params.expiresAt,
  };

  const signature = await signTypedData({ signer: mainAccountSigner, domain, types, typedData });

  return {
    ...typedData,
    signature,
    signedAt: Date.now(),
    signatureChainId: domain.chainId as AnyChainId,
    subaccountRouterAddress,
  };
}

export function hashSubaccountApproval(subaccountApproval: SignedSubacсountApproval) {
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
          { name: "desChainId", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "integrationId", type: "bytes32" },
          { name: "signature", type: "bytes" },
        ],
      },
    ],
    [subaccountApproval as any]
  );

  return keccak256(encodedData);
}

async function getSubaccountApprovalNonceForProvider(
  chainId: ContractsChainId,
  signer: WalletSigner,
  provider: Provider,
  isGmxAccount: boolean
): Promise<bigint> {
  if (provider === undefined) {
    throw new Error("Provider is required for multicall");
  }

  const subaccountRouterAddress = getOrderRelayRouterAddress(chainId, true, isGmxAccount);

  const contract = new ethers.Contract(
    subaccountRouterAddress,
    abis.AbstractSubaccountApprovalNonceable,
    provider
  ) as unknown as SubaccountGelatoRelayRouter;

  return await contract.subaccountApprovalNonces(signer.address);
}

export async function getSubaccountOnchainData({
  chainId,
  signer,
  provider,
  subaccountAddress,
}: {
  chainId: ContractsChainId;
  signer: WalletSigner;
  provider: Provider;
  subaccountAddress: string;
}) {
  const account = signer.address;

  const calls: {
    [key in keyof SubaccountOnchainData]:
      | {
          contractAddress: string;
          abi: any;
          functionName: string;
          args: any[];
        }
      | undefined;
  } = {
    approvalNonce: {
      contractAddress: getContract(chainId, "SubaccountGelatoRelayRouter"),
      abi: abis.AbstractSubaccountApprovalNonceable,
      functionName: "subaccountApprovalNonces",
      args: [account],
    },
    multichainApprovalNonce: {
      contractAddress: getContract(chainId, "MultichainSubaccountRouter"),
      abi: abis.AbstractSubaccountApprovalNonceable,
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
    integrationId: {
      contractAddress: getContract(chainId, "DataStore"),
      abi: abis.DataStore,
      functionName: "getBytes32",
      args: [subaccountIntegrationIdKey(account, subaccountAddress)],
    },
  };

  const callData = encodeFunctionData({
    abi: abis.Multicall,
    functionName: "aggregate",
    args: [
      Object.values(calls)
        .filter(
          (call): call is { contractAddress: string; abi: any; functionName: string; args: any[] } => call !== undefined
        )
        .map((call) => ({
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
    data: result,
    functionName: "aggregate",
  }) as [bigint, string[]];

  const results: SubaccountOnchainData = Object.entries(calls).reduce((acc, [key, call], index) => {
    if (call === undefined) {
      return acc;
    }

    acc[key] = decodeFunctionResult({
      abi: call.abi,
      functionName: call.functionName,
      data: decodedMulticallResults[index],
    });

    return acc;
  }, {} as SubaccountOnchainData);

  return results;
}
