import { ethers } from "ethers";
import { decodeFunctionResult, encodeFunctionData, recoverTypedDataAddress } from "viem";

import { defined } from "lib/guards";
import { WalletSigner } from "lib/wallets";
import { signTypedData, splitSignature } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import ERC20PermitInterfaceAbi from "sdk/abis/ERC20PermitInterface.json";
import { getContract } from "sdk/configs/contracts";
import { DEFAULT_PERMIT_DEADLINE_DURATION } from "sdk/configs/express";
import { getToken } from "sdk/configs/tokens";
import { SignedTokenPermit } from "sdk/types/tokens";
import { nowInSeconds } from "sdk/utils/time";

export async function createAndSignTokenPermit(
  chainId: number,
  signer: WalletSigner,
  tokenAddress: string,
  spender: string,
  value: bigint
) {
  const onchainParams = await getTokenPermitParams(chainId, signer.address, tokenAddress, signer.provider);

  const owner = await signer.getAddress();

  const domain = {
    chainId,
    name: onchainParams.name,
    version: onchainParams.version,
    verifyingContract: tokenAddress,
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
    nonce: onchainParams.nonce,
    deadline: BigInt(nowInSeconds() + DEFAULT_PERMIT_DEADLINE_DURATION),
  };

  const signature = await signTypedData({ signer, domain, types, typedData: permitData });

  const { r, s, v } = splitSignature(signature);

  const permit: SignedTokenPermit = {
    token: tokenAddress,
    owner,
    spender,
    value: value,
    deadline: permitData.deadline,
    v,
    r,
    s,
  };

  return {
    permit,
    onchainParams,
  };
}

export function getIsPermitExpired(permit: SignedTokenPermit) {
  return Number(permit.deadline) < nowInSeconds();
}

export async function getTokenPermitParams(
  chainId: number,
  owner: string,
  tokenAddress: string,
  provider: ethers.Provider
): Promise<{
  name: string;
  version: string;
  nonce: bigint;
}> {
  const token = getToken(chainId, tokenAddress);

  const calls = [
    {
      contractAddress: tokenAddress,
      abi: abis.ERC20PermitInterface,
      functionName: "name",
      args: [],
    },
    {
      contractAddress: tokenAddress,
      abi: abis.ERC20PermitInterface,
      functionName: "nonces",
      args: [owner],
    },
    !token.contractVersion
      ? {
          contractAddress: tokenAddress,
          abi: abis.ERC20PermitInterface,
          functionName: "version",
          args: [],
        }
      : undefined,
  ].filter(defined);

  const callData = encodeFunctionData({
    abi: abis.Multicall,
    functionName: "aggregate",
    args: [
      calls.map((call) => ({
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

  const name = decodeFunctionResult({
    abi: ERC20PermitInterfaceAbi.abi,
    functionName: "name",
    data: decodedMulticallResults[0] as `0x${string}`,
  }) as string;

  const nonce = decodeFunctionResult({
    abi: ERC20PermitInterfaceAbi.abi,
    functionName: "nonces",
    data: decodedMulticallResults[1] as `0x${string}`,
  }) as bigint;

  const version =
    token.contractVersion ??
    (decodeFunctionResult({
      abi: ERC20PermitInterfaceAbi.abi,
      functionName: "version",
      data: decodedMulticallResults[2] as `0x${string}`,
    }) as string);

  return {
    nonce,
    name,
    version,
  };
}

export async function validateTokenPermitSignature(
  chainId: number,
  permit: SignedTokenPermit,
  onchainParams: {
    name: string;
    version: string;
    nonce: bigint;
  }
): Promise<{
  isValid: boolean;
  recoveredAddress?: string;
  error?: string;
}> {
  try {
    // Check if permit is expired
    if (getIsPermitExpired(permit)) {
      return {
        isValid: false,
        error: "Permit is expired",
      };
    }

    const domain = {
      chainId,
      name: onchainParams.name,
      version: onchainParams.version,
      verifyingContract: permit.token as `0x${string}`,
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
      owner: permit.owner,
      spender: permit.spender,
      value: permit.value,
      nonce: onchainParams.nonce,
      deadline: permit.deadline,
    };

    // Reconstruct the signature from v, r, s components
    const signature = ethers.Signature.from({
      r: permit.r,
      s: permit.s,
      v: permit.v,
    }).serialized;

    // Recover the signer address from the signature
    const recoveredAddress = await recoverTypedDataAddress({
      domain,
      types,
      primaryType: "Permit",
      message: permitData,
      signature: signature as `0x${string}`,
    });

    // Check if the recovered address matches the expected owner
    const isValid = recoveredAddress.toLowerCase() === permit.owner.toLowerCase();

    return {
      isValid,
      recoveredAddress,
      error: isValid ? undefined : "Recovered address does not match permit owner",
    };
  } catch (error) {
    return {
      isValid: false,
      recoveredAddress: undefined,
      error: `Signature validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
