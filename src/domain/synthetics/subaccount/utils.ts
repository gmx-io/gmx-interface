import cryptoJs from "crypto-js";
import { ethers, Provider } from "ethers";
import { decodeFunctionResult, encodeAbiParameters, encodeFunctionData, keccak256, maxUint256, zeroHash } from "viem";

import { ARBITRUM_SEPOLIA, UiContractsChain } from "config/static/chains";
import {
  SignedSubbacountApproval,
  Subaccount,
  SubaccountApproval,
  SubaccountSerializedConfig,
  SubaccountValidations,
} from "domain/synthetics/subaccount/types";
import { WalletSigner } from "lib/wallets";
import { signTypedData } from "lib/wallets/signing";
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
import { SubaccountGelatoRelayRouter } from "typechain-types";
import type { MultichainSubaccountRouter } from "typechain-types-arbitrum-sepolia";

import { getExpressContractAddress, getGelatoRelayRouterDomain } from "../express";
import { SubaccountOnchainData } from "./useSubaccountOnchainData";
import { getMultichainInfoFromSigner, getOrderRelayRouterAddress } from "../express/expressOrderUtils";

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
    isNonceExpired: getIsSubaccountNonceExpired(subaccount),
    isValid: !getIsInvalidSubaccount(subaccount, requiredActions),
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

export function getIsSubaccountNonceExpired(subaccount: {
  onchainData: SubaccountOnchainData;
  signedApproval: SignedSubbacountApproval;
}): boolean {
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
  const isNonceExpired = getIsSubaccountNonceExpired(subaccount);
  const actionsExceeded = getIsSubaccountActionsExceeded(subaccount, requiredActions);

  return isExpired || isNonceExpired || actionsExceeded;
}

export function getEmptySubaccountApproval(subaccountAddress: string, isMultichain: boolean): SignedSubbacountApproval {
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
    integrationId: isMultichain ? zeroHash : undefined,
  };
}

export function getIsEmptySubaccountApproval(subaccountApproval: SignedSubbacountApproval): boolean {
  return (
    subaccountApproval.signature === ZERO_DATA &&
    subaccountApproval.nonce === 0n &&
    subaccountApproval.expiresAt === 0n &&
    subaccountApproval.maxAllowedCount === 0n &&
    subaccountApproval.shouldAdd === false
    // TODO: Add integrationId check
  );
}

export async function getInitialSubaccountApproval({
  chainId,
  signer,
  provider,
  subaccountAddress,
}: {
  chainId: UiContractsChain;
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

  const defaultMaxAllowedCount = BigInt(DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT);
  const maxAllowedCount = onchainData.currentActionsCount + defaultMaxAllowedCount;

  const defaultSubaccountApproval = await createAndSignSubaccountApproval(
    chainId,
    signer,
    subaccountAddress,
    onchainData.approvalNonce,
    {
      shouldAdd: !onchainData.active,
      expiresAt,
      maxAllowedCount,
    }
  );

  return defaultSubaccountApproval;
}

export function getActualApproval(subaccount: {
  address: string;
  signedApproval: SignedSubbacountApproval | undefined;
  onchainData: SubaccountOnchainData;
  isMultichain: boolean;
}): SignedSubbacountApproval {
  const { signedApproval, address, onchainData, isMultichain } = subaccount;

  if (!signedApproval || getIsSubaccountApprovalSynced({ signedApproval, onchainData })) {
    return getEmptySubaccountApproval(address, isMultichain);
  }

  return signedApproval;
}

export function getIsSubaccountApprovalSynced(subaccount: {
  signedApproval: SignedSubbacountApproval;
  onchainData: SubaccountOnchainData;
}): boolean {
  const { signedApproval, onchainData } = subaccount;

  /**
   * If nonce is expired, we believe a newer settings have been applied in some other way e.g. different browser
   */
  if (getIsSubaccountNonceExpired(subaccount)) {
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
}: {
  chainId: UiContractsChain;
  signer: WalletSigner;
  provider: Provider;
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

  const nonce = await getSubaccountApprovalNonceForProvider(chainId, signer, provider);

  const signedSubaccountApproval = await createAndSignSubaccountApproval(chainId, signer, subaccount.address, nonce, {
    expiresAt: nextExpiresAt,
    maxAllowedCount: nextMaxAllowedCount,
    shouldAdd: !subaccount.onchainData.active,
  });

  return signedSubaccountApproval;
}

export async function createAndSignSubaccountApproval(
  chainId: UiContractsChain,
  mainAccountSigner: WalletSigner,
  subaccountAddress: string,
  nonce: bigint,
  params: {
    shouldAdd: boolean;
    expiresAt: bigint;
    maxAllowedCount: bigint;
  }
): Promise<SignedSubbacountApproval> {
  let srcChainId = await getMultichainInfoFromSigner(mainAccountSigner, chainId);

  const relayRouterAddress = getOrderRelayRouterAddress(chainId, true, srcChainId !== undefined);

  const types = {
    SubaccountApproval: [
      { name: "subaccount", type: "address" },
      { name: "shouldAdd", type: "bool" },
      { name: "expiresAt", type: "uint256" },
      { name: "maxAllowedCount", type: "uint256" },
      { name: "actionType", type: "bytes32" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
      chainId === ARBITRUM_SEPOLIA ? { name: "integrationId", type: "bytes32" } : undefined,
    ].filter((type) => type !== undefined),
  };

  const domain = getGelatoRelayRouterDomain(chainId, relayRouterAddress, true, srcChainId);

  const typedData = {
    subaccount: subaccountAddress,
    shouldAdd: params.shouldAdd,
    expiresAt: params.expiresAt,
    maxAllowedCount: params.maxAllowedCount,
    actionType: SUBACCOUNT_ORDER_ACTION,
    nonce,
    integrationId: chainId === ARBITRUM_SEPOLIA ? zeroHash : undefined,
    deadline: params.expiresAt,
  };

  const signature = await signTypedData({ signer: mainAccountSigner, domain, types, typedData });

  return {
    ...typedData,
    signature,
    signedAt: Date.now(),
  };
}

export function hashSubaccountApproval(subaccountApproval: SignedSubbacountApproval, isNewContracts: boolean) {
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
          isNewContracts ? { name: "integrationId", type: "bytes32" } : undefined,
          { name: "signature", type: "bytes" },
        ].filter((type) => type !== undefined),
      },
    ],
    [subaccountApproval as any]
  );

  return keccak256(encodedData);
}

async function getSubaccountApprovalNonceForProvider(
  chainId: UiContractsChain,
  signer: WalletSigner,
  provider: Provider
) {
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);

  if (srcChainId !== undefined && provider === undefined) {
    throw new Error("Provider is required for multicall");
  }

  const contractAddress = getExpressContractAddress(chainId, {
    isSubaccount: true,
    isMultichain: srcChainId !== undefined,
    scope: "subaccount",
  });

  const contract = new ethers.Contract(
    contractAddress,
    abis.AbstractSubaccountApprovalNonceable,
    provider
  ) as unknown as SubaccountGelatoRelayRouter | MultichainSubaccountRouter;

  return await contract.subaccountApprovalNonces(signer.address);
}

export async function getSubaccountOnchainData({
  chainId,
  signer,
  provider,
  subaccountAddress,
}: {
  chainId: UiContractsChain;
  signer: WalletSigner;
  provider: Provider;
  subaccountAddress: string;
}) {
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);
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
      contractAddress: getExpressContractAddress(chainId, {
        isSubaccount: true,
        isMultichain: srcChainId !== undefined,
        scope: "subaccount",
      }),
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
    integrationId:
      chainId === ARBITRUM_SEPOLIA
        ? {
            contractAddress: getContract(chainId, "DataStore"),
            abi: abis.DataStore,
            functionName: "getBytes32",
            args: [subaccountIntegrationIdKey(account, subaccountAddress)],
          }
        : undefined,
  };

  const callData = encodeFunctionData({
    abi: abis.Multicall,
    functionName: "aggregate",
    args: [
      Object.values(calls)
        .filter((call) => call !== undefined)
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
    data: result as `0x${string}`,
    functionName: "aggregate",
  }) as [bigint, string[]];

  const results: SubaccountOnchainData = Object.entries(calls).reduce((acc, [key, call], index) => {
    if (call === undefined) {
      return acc;
    }

    acc[key] = decodeFunctionResult({
      abi: call.abi,
      functionName: call.functionName,
      data: decodedMulticallResults[index] as `0x${string}`,
    });

    return acc;
  }, {} as SubaccountOnchainData);

  return results;
}
