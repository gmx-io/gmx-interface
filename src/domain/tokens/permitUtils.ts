import { ethers } from "ethers";
import {
  Abi,
  type Address,
  decodeFunctionResult,
  encodeFunctionData,
  EncodeFunctionDataParameters,
  type Hex,
  isAddressEqual,
  recoverTypedDataAddress,
} from "viem";

import { parseError } from "lib/errors";
import { defined } from "lib/guards";
import { EMPTY_ARRAY } from "lib/objects";
import { WalletSigner } from "lib/wallets";
import { signTypedData, splitSignature } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import ERC20PermitInterfaceAbi from "sdk/abis/ERC20PermitInterface";
import type { ContractsChainId } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import { DEFAULT_PERMIT_DEADLINE_DURATION } from "sdk/configs/express";
import { getToken } from "sdk/configs/tokens";
import { nowInSeconds } from "sdk/utils/time";
import { SignedTokenPermit } from "sdk/utils/tokens/types";

export async function createAndSignTokenPermit(
  chainId: ContractsChainId,
  signer: WalletSigner,
  tokenAddress: string,
  spender: string,
  value: bigint
) {
  const onchainParams = await getTokenPermitParams(chainId, signer.address, tokenAddress, signer.provider);

  const owner = signer.address;

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

  const signature = await signTypedData({
    signer,
    domain,
    types,
    typedData: permitData,
    minified: false,
    verificationChainId: chainId,
  });

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
    onchainParams,
  };

  return {
    permit,
  };
}

export function getIsPermitExpired(permit: SignedTokenPermit) {
  return Number(permit.deadline) < nowInSeconds();
}

export function getIsSameTokenPermit(a: SignedTokenPermit, b: SignedTokenPermit) {
  return a.token === b.token && a.r === b.r && a.s === b.s;
}

// setTimeout fires immediately for delays above 2^31-1 ms
const MAX_TIMEOUT_MS = 2 ** 31 - 1;
const PERMIT_EXPIRY_BUFFER_MS = 500;

export function getPermitsExpiryTimeoutMs(permits: SignedTokenPermit[], now: number): number {
  const nearestDeadline = Math.min(...permits.map((p) => Number(p.deadline)));
  const msUntilExpiry = (nearestDeadline - now + 1) * 1000 + PERMIT_EXPIRY_BUFFER_MS;

  return Math.min(Math.max(0, msUntilExpiry), MAX_TIMEOUT_MS);
}

/**
 * Each permit costs relay gas and only Router permits are accepted, so a relay call carries just
 * the permits for tokens it spends. GMX Account routers reject permits entirely.
 */
export function getRelayTokenPermits({
  chainId,
  isGmxAccount,
  tokenPermits,
  spentTokenAddresses,
}: {
  chainId: ContractsChainId;
  isGmxAccount: boolean;
  tokenPermits: SignedTokenPermit[];
  spentTokenAddresses: string[];
}): SignedTokenPermit[] {
  if (isGmxAccount || tokenPermits.length === 0) {
    return EMPTY_ARRAY;
  }

  const router = getContract(chainId, "SyntheticsRouter");

  return tokenPermits.filter(
    (permit) =>
      !getIsPermitExpired(permit) &&
      isAddressEqual(permit.spender as Address, router) &&
      spentTokenAddresses.some((address) => isAddressEqual(address as Address, permit.token as Address))
  );
}

export async function getTokenPermitParams(
  chainId: ContractsChainId,
  owner: string,
  tokenAddress: string,
  provider: ethers.Provider
): Promise<{
  name: string;
  version: string;
  nonce: bigint;
}> {
  const token = getToken(chainId, tokenAddress);

  const calls: {
    contractAddress: string;
    abi: Abi;
    functionName: string;
    args: any[];
  }[] = [
    {
      contractAddress: tokenAddress,
      abi: abis.ERC20PermitInterface,
      functionName: "name",
      args: [],
    } satisfies EncodeFunctionDataParameters<typeof abis.ERC20PermitInterface, "name"> & { contractAddress: string },
    {
      contractAddress: tokenAddress,
      abi: abis.ERC20PermitInterface,
      functionName: "nonces",
      args: [owner],
    } satisfies EncodeFunctionDataParameters<typeof abis.ERC20PermitInterface, "nonces"> & { contractAddress: string },
    !token.contractVersion
      ? ({
          contractAddress: tokenAddress,
          abi: abis.ERC20PermitInterface,
          functionName: "version",
          args: [],
        } satisfies EncodeFunctionDataParameters<typeof abis.ERC20PermitInterface, "version"> & {
          contractAddress: string;
        })
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
  }) as [bigint, Hex[]];

  const name = decodeFunctionResult({
    abi: ERC20PermitInterfaceAbi,
    functionName: "name",
    data: decodedMulticallResults[0] as `0x${string}`,
  }) as string;

  const nonce = decodeFunctionResult({
    abi: ERC20PermitInterfaceAbi,
    functionName: "nonces",
    data: decodedMulticallResults[1],
  }) as bigint;

  const version =
    token.contractVersion ??
    (decodeFunctionResult({
      abi: ERC20PermitInterfaceAbi,
      functionName: "version",
      data: decodedMulticallResults[2] as `0x${string}`,
    }) as string);

  return {
    nonce,
    name,
    version,
  };
}

export async function validateTokenPermitSignature(chainId: number, permit: SignedTokenPermit) {
  try {
    const domain = {
      chainId,
      name: permit.onchainParams.name,
      version: permit.onchainParams.version,
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
      nonce: permit.onchainParams.nonce,
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
    const isValid = isAddressEqual(recoveredAddress, permit.owner as Address);

    return {
      isValid,
      recoveredAddress,
      error: isValid ? undefined : parseError("Recovered address does not match permit owner"),
    };
  } catch (error) {
    return {
      isValid: false,
      recoveredAddress: undefined,
      error: parseError(error),
    };
  }
}
