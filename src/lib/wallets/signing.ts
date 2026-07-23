import { getAccount, getChainId, getWalletClient } from "@wagmi/core";
import { AbstractSigner, TypedDataEncoder, type Wallet } from "ethers";
import { type Address, isAddressEqual, withRetry } from "viem";

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
  verificationChainId?: number;
};

type ProviderSigner = WalletSigner | Wallet | AbstractSigner | ISigner;
type RpcSendable = Pick<WalletSigner["provider"], "send">;

export function shouldSwitchToVerificationChain({
  currentChainId,
  verificationChainId,
  hasCodeOnCurrentChain,
  hasCodeOnVerificationChain,
  isKnownSmartAccount,
}: {
  currentChainId: number;
  verificationChainId: number | undefined;
  hasCodeOnCurrentChain: boolean;
  hasCodeOnVerificationChain: boolean;
  isKnownSmartAccount: boolean;
}): boolean {
  return Boolean(
    verificationChainId !== undefined &&
      verificationChainId !== currentChainId &&
      (hasCodeOnCurrentChain || hasCodeOnVerificationChain || isKnownSmartAccount)
  );
}

async function hasCode(chainId: number, address: string): Promise<boolean> {
  const code = await getPublicClientWithRpc(chainId).getCode({ address });
  return Boolean(code && code !== "0x");
}

async function needsChainSwapForSmartWallet({
  address,
  currentChainId,
  verificationChainId,
  isKnownSmartAccount,
}: {
  address: string;
  currentChainId: number;
  verificationChainId: number | undefined;
  isKnownSmartAccount: boolean;
}): Promise<boolean> {
  if (verificationChainId === undefined || verificationChainId === currentChainId) {
    return false;
  }

  if (isKnownSmartAccount) {
    return true;
  }

  const [currentChainCodeResult, verificationChainCodeResult] = await Promise.allSettled([
    hasCode(currentChainId, address),
    hasCode(verificationChainId, address),
  ]);
  const hasCodeOnCurrentChain = currentChainCodeResult.status === "fulfilled" && currentChainCodeResult.value;
  const hasCodeOnVerificationChain =
    verificationChainCodeResult.status === "fulfilled" && verificationChainCodeResult.value;

  return shouldSwitchToVerificationChain({
    currentChainId,
    verificationChainId,
    hasCodeOnCurrentChain,
    hasCodeOnVerificationChain,
    isKnownSmartAccount,
  });
}

function providerSendSign(signer: ProviderSigner, from: string, eip712: object) {
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
    verificationChainId,
  }: {
    signer: ProviderSigner;
    address: string;
    verificationChainId: number | undefined;
  },
  action: (signer: ProviderSigner) => Promise<T>
): Promise<T> {
  const config = getWagmiConfig();
  const startingChainId = getChainId(config);
  const needsChainSwap = await needsChainSwapForSmartWallet({
    address,
    currentChainId: startingChainId,
    verificationChainId,
    isKnownSmartAccount: "isSmartAccount" in signer && signer.isSmartAccount === true,
  });

  if (!needsChainSwap) {
    return action(signer);
  }

  await switchNetwork(verificationChainId!, true);

  try {
    const account = getAccount(config).address;
    if (!account) {
      throw new Error("Wallet disconnected while switching to the Express signing network");
    }
    if (!isAddressEqual(account, address as Address)) {
      throw new Error("Wallet account changed while switching to the Express signing network");
    }

    const walletClient = await getWalletClient(config);
    const chainSigner = clientToSigner(walletClient, account);

    return await action(chainSigner);
  } finally {
    await switchNetwork(startingChainId, true).catch(() => undefined);
  }
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
    const digest = TypedDataEncoder.hash(domain, types, typedData);
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

  return withSmartWalletChainSwap(
    { signer, address: from, verificationChainId },
    async (signerForVerificationChain) => {
      if (shouldUseSignerMethod && signerForVerificationChain.signTypedData) {
        try {
          return await signerForVerificationChain.signTypedData(domain, typesToSign, messageToSign);
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes("requires a provider")) {
            throw error;
          }
        }
      }

      const signingAddress = await signerForVerificationChain.getAddress();
      return providerSendSign(signerForVerificationChain, signingAddress, eip712);
    }
  );
}

export function splitSignature(signature: string): { r: string; s: string; v: number } {
  const sig = signature.slice(2);
  const r = "0x" + sig.substring(0, 64);
  const s = "0x" + sig.substring(64, 128);
  const v = parseInt(sig.substring(128, 130), 16);

  // ECDSA signature components
  return { r, s, v };
}
