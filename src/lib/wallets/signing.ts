import { getAccount, getChainId, getWalletClient } from "@wagmi/core";
import { AbstractSigner, type Wallet } from "ethers";
import { hashTypedData, withRetry, type Hex } from "viem";

import { parseError } from "lib/errors";
import { ISigner } from "lib/transactions/iSigner";
import type { IAbstractSigner } from "sdk/utils/signer";

import { switchNetwork, type WalletSigner } from ".";
import { clientToSigner } from "./useEthersSigner";
import { getPublicClientWithRpc, getWagmiConfig } from "./walletConfig";

export type SignatureDomain = {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
};

export type SignatureTypes = Record<string, { name: string; type: string }[]>;

export type SignTypedDataParams = {
  signer: WalletSigner | Wallet | AbstractSigner | ISigner | IAbstractSigner;
  types: SignatureTypes;
  typedData: Record<string, any>;
  domain: SignatureDomain;
  shouldUseSignerMethod?: boolean;
  minified?: boolean;
  /** Chain the on-chain verifier runs on; smart wallets must sign with their wallet on this chain. */
  verificationChainId?: number;
};

type RpcSendable = Pick<WalletSigner["provider"], "send">;

type AnySigner = WalletSigner | Wallet | AbstractSigner | ISigner;

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
  try {
    const code = await getPublicClientWithRpc(currentChainId).getCode({ address });
    return Boolean(code && code !== "0x");
  } catch {
    return false;
  }
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

  if (!needsSwap) return action(signer);

  await switchNetwork(targetChainId!, true);
  const account = getAccount(config).address;
  if (!account) throw new Error("No account after chain swap");
  const swappedWalletClient = await getWalletClient(config);
  const swappedSigner = clientToSigner(swappedWalletClient, account);
  try {
    return await action(swappedSigner);
  } finally {
    await switchNetwork(startingChainId, true).catch(() => {
      // restoring is best-effort
    });
  }
}

// TODO: it this needed or we can just use [0] as primaryType?
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

  let typesToSign = types;
  let messageToSign = typedData;

  if (minified) {
    const digest = hashTypedDataWithViem({
      domain,
      types,
      message: typedData,
    });
    const minifiedTypes = {
      Minified: [{ name: "digest", type: "bytes32" }],
    };
    typesToSign = minifiedTypes;
    messageToSign = {
      digest,
    };
  }

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
