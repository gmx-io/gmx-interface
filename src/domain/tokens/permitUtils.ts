import { Contract, ethers } from "ethers";
import { decodeFunctionResult, encodeFunctionData } from "viem";

import { WalletSigner } from "lib/wallets";
import { signTypedData, splitSignature } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import ERC20PermitInterfaceAbi from "sdk/abis/ERC20PermitInterface.json";
import { getContract } from "sdk/configs/contracts";
import { getToken } from "sdk/configs/tokens";
import { SignedTokenPermit } from "sdk/types/tokens";
import { nowInSeconds } from "sdk/utils/time";
import { DEFAULT_PERMIT_DEADLINE_DURATION } from "sdk/configs/express";

export async function createAndSignTokenPermit(
  chainId: number,
  signer: WalletSigner,
  tokenAddress: string,
  spender: string,
  value: bigint
): Promise<SignedTokenPermit> {
  const onchainParams = await getTokenPermitParams(chainId, signer.address, tokenAddress, signer.provider);

  const owner = await signer.getAddress();

  if (!signer.provider) {
    throw new Error("Signer must be connected to a provider");
  }

  const domain = {
    name: onchainParams.name,
    version: onchainParams.version,
    chainId,
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

  return {
    token: tokenAddress,
    owner,
    spender,
    value: value,
    deadline: permitData.deadline,
    v,
    r,
    s,
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
  ].filter(Boolean);

  const callData = encodeFunctionData({
    abi: abis.Multicall,
    functionName: "aggregate",
    args: [
      calls.map((call) => ({
        target: call!.contractAddress,
        callData: encodeFunctionData(call!),
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

export function getTokenPermitParamsCalls(tokenAddress: string, owner: string) {
  const tokenContract = new Contract(tokenAddress, ERC20PermitInterfaceAbi.abi);

  return {
    nonce: {
      target: tokenAddress,
      methodName: "nonces",
      callData: tokenContract.interface.encodeFunctionData("nonces", [owner]),
    },
    name: {
      target: tokenAddress,
      methodName: "name",
      callData: tokenContract.interface.encodeFunctionData("name", []),
    },
    version: {
      target: tokenAddress,
      methodName: "version",
      callData: tokenContract.interface.encodeFunctionData("version", []),
    },
  };
}
