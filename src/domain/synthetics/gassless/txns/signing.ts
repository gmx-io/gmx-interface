import { ethers } from "ethers";

export async function signTypedData(
  signer: ethers.Signer,
  domain: Record<string, any>,
  types: Record<string, any>,
  typedData: Record<string, any>
) {
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

  const primaryType = Object.keys(types).filter((t) => t !== "EIP712Domain")[0];

  if (signer.signTypedData) {
    return await signer.signTypedData(domain, types, typedData);
  }

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

  // eslint-disable-next-line no-console
  console.log("Sending EIP-712 data:", JSON.stringify(eip712, null, 2));

  // Use the standard JSON-RPC method for EIP-712 signing
  const signature = await (provider as any).send("eth_signTypedData_v4", [from, JSON.stringify(eip712)]);

  // eslint-disable-next-line no-console
  console.log("Signature received:", signature);

  return signature;
}

export function splitSignature(signature: string): { r: string; s: string; v: number } {
  const sig = signature.slice(2);
  const r = "0x" + sig.substring(0, 64);
  const s = "0x" + sig.substring(64, 128);
  const v = parseInt(sig.substring(128, 130), 16);

  return { r, s, v };
}
