import { Signer } from "ethers";
import { withRetry } from "viem";

import { parseError } from "lib/errors";

export type SignatureDomain = {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
};

export type SignatureTypes = Record<string, { name: string; type: string }[]>;

export type SignTypedDataParams = {
  signer: Signer;
  types: SignatureTypes;
  typedData: Record<string, any>;
  domain: SignatureDomain;
  shouldUseSignerMethod?: boolean;
};

export async function signTypedData({
  signer,
  domain,
  types,
  typedData,
  shouldUseSignerMethod = false,
}: SignTypedDataParams) {
  // filter inputs
  for (const [key, value] of Object.entries(domain)) {
    if (value === undefined) {
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

  if (shouldUseSignerMethod && signer.signTypedData) {
    try {
      return await signer.signTypedData(domain, types, typedData);
    } catch (e) {
      if (e.message.includes("requires a provider")) {
        // ignore and try to send request directly to provider
      } else {
        throw e;
      }
    }
  }

  const primaryType = Object.keys(types).filter((t) => t !== "EIP712Domain")[0];

  const provider = signer.provider;
  const from = await signer.getAddress();

  const eip712 = {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      ...types,
    },
    primaryType,
    domain,
    message: typedData,
  };

  const signature = await withRetry<string>(
    () => {
      return (provider as any).send("eth_signTypedData_v4", [from, JSON.stringify(eip712)]);
    },
    {
      retryCount: 1,
      delay: 100,
      shouldRetry: ({ error }) => {
        const errorData = parseError(error);
        return errorData?.errorMessage?.toLowerCase().includes("an error has occurred") || false;
      },
    }
  );

  return signature;
}

export function splitSignature(signature: string): { r: string; s: string; v: number } {
  const sig = signature.slice(2);
  const r = "0x" + sig.substring(0, 64);
  const s = "0x" + sig.substring(64, 128);
  const v = parseInt(sig.substring(128, 130), 16);

  // ECDSA signature components
  return { r, s, v };
}
