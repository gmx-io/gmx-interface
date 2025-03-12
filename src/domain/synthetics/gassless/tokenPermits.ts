// This file is kept for backwards compatibility
// All permit functionality has been consolidated into permitUtils.ts

import { BigNumberish, Signature } from "ethers";
import { createTokenPermit, supportsPermit, createCollateralTokenPermit, createMultiTokenPermits } from "./permitUtils";
// Import and re-export types properly
import type { TokenPermit } from "./permitUtils";

// Re-export for backward compatibility
export { createTokenPermit, supportsPermit, createCollateralTokenPermit, createMultiTokenPermits };
// Re-export types
export type { TokenPermit };

// Legacy function kept for backward compatibility
export async function getTokenPermit(
  token: any,
  signer: any,
  spender: string,
  value: BigNumberish,
  nonce: BigNumberish,
  deadline: BigNumberish,
  chainId: BigNumberish
) {
  console.warn("getTokenPermit is deprecated. Use createTokenPermit from permitUtils.ts instead.");

  // Get owner address from signer
  const owner = await signer.getAddress();

  // Create permit using the new method but convert to the old format
  const tokenPermit = await createTokenPermit(
    signer,
    token.address,
    spender,
    BigInt(value.toString()),
    BigInt(deadline.toString()),
    Number(chainId)
  );

  return tokenPermit;
}

async function getPermitSignature(
  token: any,
  signer: any,
  spender: string,
  value: BigNumberish,
  nonce: BigNumberish,
  deadline: BigNumberish,
  chainId: BigNumberish
) {
  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const tokenName = await token.name();
  const tokenVersion = "1";
  const domain = {
    name: tokenName,
    version: tokenVersion,
    chainId,
    verifyingContract: token.address,
  };
  const typedData = {
    owner: signer.address,
    spender: spender,
    value: value,
    nonce: nonce,
    deadline: deadline,
  };
  return signer._signTypedData(domain, types, typedData);
}
