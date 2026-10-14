import { isAddressEqual, type Address, type PublicClient } from "viem";

import {
  getIsTokenPermitsEoaEnabled,
  getIsTokenPermitsMetaMask7702Enabled,
  type UiFlags,
} from "domain/synthetics/uiFlags/uiFlags";
import { AccountType, getAccountType } from "lib/wallets/useAccountType";
import { ARBITRUM, AVALANCHE } from "sdk/configs/chains";

// MetaMask EIP7702StatelessDeleGator, verified to accept permits on Arbitrum
export const METAMASK_EIP7702_DELEGATOR_ADDRESS: Address = "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B";

// tokens whose permit to the Router was verified on-chain; the SDK's isPermitSupported list is wider
const TOKEN_PERMITS_ALLOWLIST: Partial<Record<number, Address[]>> = {
  [ARBITRUM]: [
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
  ],
  [AVALANCHE]: [
    "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // USDC
    "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", // USDT
  ],
};

export type TokenPermitAccountType = "eoa" | "metaMask7702" | "unsupported";

export function getIsTokenPermitAllowed(chainId: number, tokenAddress: string): boolean {
  return (TOKEN_PERMITS_ALLOWLIST[chainId] ?? []).some((address) => isAddressEqual(address, tokenAddress as Address));
}

export async function getTokenPermitAccountType(
  address: string,
  client: PublicClient
): Promise<TokenPermitAccountType> {
  const accountType = await getAccountType(address, client);

  if (accountType === AccountType.EOA) {
    return "eoa";
  }

  if (accountType !== AccountType.PostEip7702EOA) {
    return "unsupported";
  }

  const delegation = await client.getDelegation({ address: address as Address });

  return delegation !== undefined && isAddressEqual(delegation, METAMASK_EIP7702_DELEGATOR_ADDRESS)
    ? "metaMask7702"
    : "unsupported";
}

export function getIsTokenPermitsEnabled({
  uiFlags,
  accountType,
  isQaOverrideEnabled,
}: {
  uiFlags: UiFlags | undefined;
  accountType: TokenPermitAccountType | undefined;
  isQaOverrideEnabled: boolean;
}): boolean {
  if (accountType === undefined || accountType === "unsupported") {
    return false;
  }

  if (isQaOverrideEnabled) {
    return true;
  }

  return accountType === "eoa" ? getIsTokenPermitsEoaEnabled(uiFlags) : getIsTokenPermitsMetaMask7702Enabled(uiFlags);
}
