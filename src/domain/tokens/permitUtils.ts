import { Contract, Signer, ethers } from "ethers";

import { getChainName } from "config/chains";
import { signTypedData, splitSignature } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import ERC20PermitInterfaceAbi from "sdk/abis/ERC20PermitInterface.json";
import { getContract } from "sdk/configs/contracts";
import { SignedTokenPermit } from "sdk/types/tokens";
import { ZERO_DATA } from "sdk/utils/hash";

export async function createAndSignTokenPermit(
  chainId: number,
  signer: Signer,
  tokenAddress: string,
  spender: string,
  value: bigint,
  permitParams: {
    name: string;
    version: string;
    nonce: bigint;
    domainSeparator: string;
    deadline: bigint;
    verifyingContract: string;
  }
): Promise<SignedTokenPermit> {
  const owner = await signer.getAddress();

  if (!signer.provider) {
    throw new Error("Signer must be connected to a provider");
  }

  const domain = {
    name: permitParams.name,
    version: permitParams.version,
    chainId,
    verifyingContract: permitParams.verifyingContract,
  };

  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const permitData = {
    owner,
    spender,
    value,
    nonce: permitParams.nonce,
    deadline: permitParams.deadline,
  };

  const signature = await signTypedData({ signer, domain, types, typedData: permitData });

  const { r, s, v } = splitSignature(signature);

  return {
    token: tokenAddress,
    owner,
    spender,
    value,
    deadline: permitData.deadline,
    v,
    r,
    s,
  };
}

/**
 * Have to use ethers.js because it supports reading proxy contracts,
 * that have the required methods implemented
 */
export async function getTokenPermitParams(
  chainId: number,
  owner: string,
  token: string,
  provider: ethers.Provider
): Promise<{
  typeHash: string;
  domainSeparator: string;
  nonce: bigint;
  name: string;
  version: string;
}> {
  const multicall = new Contract(getContract(chainId, "Multicall"), abis.Multicall, provider);

  const checks = getTokenPermitParamsCalls(token, owner);

  const results = await multicall.tryAggregate.staticCall(true, Object.values(checks));

  const params = Object.fromEntries(Object.entries(checks).map(([key], index) => [key, results[index][1]]));

  const isValid = [params.typeHash, params.domainSeparator, params.name, params.version, params.nonce].every(
    (value) => typeof value === "string" && value !== ZERO_DATA
  );

  if (!isValid) {
    throw new Error(`Invalid token permit params for ${getChainName(chainId)} token: ${token}`);
  }

  return {
    typeHash: params.typeHash,
    domainSeparator: params.domainSeparator,
    nonce: BigInt(params.nonce),
    name: params.name,
    version: params.version,
  };
}

export function getTokenPermitParamsCalls(tokenAddress: string, owner: string) {
  const tokenContract = new Contract(tokenAddress, ERC20PermitInterfaceAbi.abi);

  return {
    typeHash: {
      target: tokenAddress,
      callData: tokenContract.interface.encodeFunctionData("PERMIT_TYPEHASH", []),
    },
    domainSeparator: {
      target: tokenAddress,
      callData: tokenContract.interface.encodeFunctionData("DOMAIN_SEPARATOR", []),
    },
    nonce: {
      target: tokenAddress,
      callData: tokenContract.interface.encodeFunctionData("nonces", [owner]),
    },
    name: {
      target: tokenAddress,
      callData: tokenContract.interface.encodeFunctionData("name", []),
    },
    version: {
      target: tokenAddress,
      callData: tokenContract.interface.encodeFunctionData("version", []),
    },
  };
}
