import { getAccount, getChainId, getWalletClient } from "@wagmi/core";
import { AbstractSigner, type Wallet } from "ethers";
import { hashTypedData, isHex, size, withRetry, type Hex } from "viem";

import { extendError, parseError } from "lib/errors";
import { metrics } from "lib/metrics";
import { ISigner } from "lib/transactions/iSigner";
import type { IAbstractSigner } from "sdk/utils/signer";

import { switchNetwork, type WalletSigner } from ".";
import { AccountType, getAccountType } from "./useAccountType";
import { clientToSigner } from "./useEthersSigner";
import { getPublicClientWithRpc, getWagmiConfig } from "./walletConfig";

export type SignatureDomain = {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
};

/** WARNING: the root struct must be declared FIRST — its key is taken as the EIP-712 primary type. */
export type SignatureTypes = Record<string, { name: string; type: string }[]>;

export type SignTypedDataParams = {
  signer: WalletSigner | Wallet | AbstractSigner | ISigner | IAbstractSigner;
  types: SignatureTypes;
  typedData: Record<string, any>;
  domain: SignatureDomain;
  shouldUseSignerMethod?: boolean;
  minified?: boolean;
  /** Chain the on-chain verifier runs on; smart wallets must sign with their wallet on this chain. */
  verificationChainId: number;
};

type RpcSendable = Pick<WalletSigner["provider"], "send">;

type AnySigner = WalletSigner | Wallet | AbstractSigner | ISigner;

/**
 * Contract accounts mix the connected chainId into the hash they sign, so they only produce a valid
 * signature while the wallet sits on the chain that verifies it. Plain and 7702-delegated EOAs sign
 * with their own key, which works from any chain.
 */
function mustSignOnVerificationChain(accountType: AccountType | undefined): boolean {
  return accountType !== undefined && accountType !== AccountType.EOA && accountType !== AccountType.PostEip7702EOA;
}

async function needsChainSwapForSmartWallet({
  address,
  currentChainId,
  targetChainId,
}: {
  address: string;
  currentChainId: number;
  targetChainId: number | undefined;
}): Promise<boolean> {
  if (targetChainId === undefined || targetChainId === currentChainId) {
    return false;
  }

  // Smart wallets deploy lazily per chain, so the current chain alone would misread a
  // not-yet-deployed one as an EOA and skip the swap.
  const accountTypes = await Promise.all(
    [currentChainId, targetChainId].map((chainId) =>
      getAccountType(address, getPublicClientWithRpc(chainId)).catch((error) => {
        metrics.pushError(extendError(error, { data: { chainId, address } }), "signing.accountTypeProbe");

        return undefined;
      })
    )
  );

  return accountTypes.some(mustSignOnVerificationChain);
}

function providerSendSign(signer: AnySigner, from: string, eip712: object) {
  return withRetry<string>(
    () => (signer.provider as RpcSendable).send("eth_signTypedData_v4", [from, JSON.stringify(eip712)]),
    {
      retryCount: 1,
      delay: 100,
      shouldRetry: ({ error }) => {
        const errorData = parseError(error);
        return errorData?.errorMessage?.toLowerCase().includes("an error has occurred") || false;
      },
    }
  );
}

async function withSmartWalletChainSwap<T>(
  {
    signer,
    address,
    targetChainId,
  }: {
    signer: AnySigner;
    address: string;
    targetChainId: number | undefined;
  },
  action: (signer: AnySigner) => Promise<T>
): Promise<T> {
  const config = getWagmiConfig();
  const startingChainId = getChainId(config);
  const needsSwap = await needsChainSwapForSmartWallet({
    address,
    currentChainId: startingChainId,
    targetChainId,
  });

  if (!needsSwap) {
    return action(signer);
  }

  await switchNetwork(targetChainId!, true);
  const account = getAccount(config).address;
  if (!account) {
    throw new Error("No account after chain swap");
  }
  const swappedWalletClient = await getWalletClient(config, { chainId: targetChainId! });
  const swappedSigner = clientToSigner(swappedWalletClient, account);
  try {
    return await action(swappedSigner);
  } finally {
    await switchNetwork(startingChainId, true).catch((error) => {
      metrics.pushError(
        extendError(error, { data: { startingChainId, targetChainId, address } }),
        "signing.chainSwapRestore"
      );
    });
  }
}

function hashTypedDataWithViem({
  domain,
  types,
  message,
}: {
  domain: SignatureDomain;
  types: SignatureTypes;
  message: Record<string, any>;
}): Hex {
  const primaryType = Object.keys(types).find((t) => t !== "EIP712Domain");

  if (!primaryType) {
    throw new Error("Unable to determine EIP-712 primary type");
  }

  return hashTypedData({
    domain,
    types,
    primaryType,
    message,
  });
}

type TypedDataToSign = { types: SignatureTypes; message: Record<string, any> };

function minifyTypedData({
  domain,
  types,
  message,
}: {
  domain: SignatureDomain;
  types: SignatureTypes;
  message: Record<string, any>;
}): TypedDataToSign {
  return {
    types: { Minified: [{ name: "digest", type: "bytes32" }] },
    message: { digest: hashTypedDataWithViem({ domain, types, message }) },
  };
}

/** Trailing marker an ERC-6492 wrapper appends to a counterfactual-account signature. */
export const ERC6492_MAGIC_SUFFIX = "6492649264926492649264926492649264926492649264926492649264926492";

export type SignatureKind = "eoa" | "erc6492" | "erc1271" | "malformed";

export function getSignatureKind(signature: string): SignatureKind {
  if (!isHex(signature) || size(signature) === 0) {
    return "malformed";
  }

  if (signature.endsWith(ERC6492_MAGIC_SUFFIX)) {
    return "erc6492";
  }

  return size(signature) === 65 ? "eoa" : "erc1271";
}

export function hashSignedTypedData({
  domain,
  types,
  typedData,
  minified = true,
}: Pick<SignTypedDataParams, "domain" | "types" | "typedData" | "minified">): Hex {
  const toSign = minified ? minifyTypedData({ domain, types, message: typedData }) : { types, message: typedData };

  return hashTypedDataWithViem({ domain, ...toSign });
}

export async function signTypedData({
  signer,
  domain,
  types,
  typedData,
  shouldUseSignerMethod = false,
  minified = true,
  verificationChainId,
}: SignTypedDataParams) {
  // filter inputs
  for (const [key, value] of Object.entries(domain)) {
    if (value === undefined) {
      // @ts-expect-error
      delete domain[key];
    }
  }

  for (const [key, value] of Object.entries(types)) {
    if (value === undefined) {
      delete types[key];
    }
  }

  for (const [key, value] of Object.entries(typedData)) {
    if (value === undefined) {
      delete typedData[key];
    }
  }

  const { types: typesToSign, message: messageToSign } = minified
    ? minifyTypedData({ domain, types, message: typedData })
    : { types, message: typedData };

  const primaryType = Object.keys(typesToSign).filter((t) => t !== "EIP712Domain")[0];

  if (!("provider" in signer) || !("getAddress" in signer)) {
    if (signer.signTypedData) {
      return signer.signTypedData(domain, typesToSign, messageToSign);
    }
    throw new Error("Signer does not support provider-based signing or signTypedData");
  }

  const from = await signer.getAddress();

  const eip712 = {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      ...typesToSign,
    },
    primaryType,
    domain,
    message: messageToSign,
  };

  return withSmartWalletChainSwap({ signer, address: from, targetChainId: verificationChainId }, (signWith) => {
    if (shouldUseSignerMethod && signWith.signTypedData) {
      return signWith.signTypedData(domain, typesToSign, messageToSign).catch((e) => {
        if (!e.message.includes("requires a provider")) throw e;
        return providerSendSign(signWith, from, eip712);
      });
    }
    return providerSendSign(signWith, from, eip712);
  });
}

export function splitSignature(signature: string): { r: string; s: string; v: number } {
  const sig = signature.slice(2);
  const r = "0x" + sig.substring(0, 64);
  const s = "0x" + sig.substring(64, 128);
  const v = parseInt(sig.substring(128, 130), 16);

  // ECDSA signature components
  return { r, s, v };
}
