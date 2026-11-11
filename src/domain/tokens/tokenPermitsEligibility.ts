import { isAddressEqual, type Address, type PublicClient } from "viem";

import {
  IS_TOKEN_PERMITS_EIP7702_ENABLED_UI_FLAG,
  IS_TOKEN_PERMITS_EOA_ENABLED_UI_FLAG,
  type UiFlags,
} from "domain/synthetics/uiFlags/uiFlags";
import { AccountType, getAccountType } from "lib/wallets/useAccountType";
import { ARBITRUM, AVALANCHE } from "sdk/configs/chains";

// EIP-7702 delegates whose isValidSignature accepts a plain permit signature; some delegates reject USDC/USDT
// permits, so a new one is added only after a real-wallet check on mainnet, not on simulation alone
const TOKEN_PERMITS_EIP7702_DELEGATES: Address[] = [
  "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B", // MetaMask EIP7702StatelessDeleGator
];

// tokens whose permit to the Router was verified on-chain; the SDK's isPermitSupported list is wider
const TOKEN_PERMITS_ALLOWLIST: Partial<Record<number, Address[]>> = {
  [ARBITRUM]: [
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
    "0x004B506865409877C9fA29bfb1ebA929984B9bbC", // USDG
  ],
  [AVALANCHE]: [
    "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // USDC
    "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", // USDT
  ],
};

export type TokenPermitAccountType = "eoa" | "eip7702" | "unsupported";

export function getTokenPermitsAllowlist(chainId: number): Address[] {
  return TOKEN_PERMITS_ALLOWLIST[chainId] ?? [];
}

export function getIsTokenPermitAllowed(chainId: number, tokenAddress: string): boolean {
  return getTokenPermitsAllowlist(chainId).some((address) => isAddressEqual(address, tokenAddress as Address));
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

  return delegation !== undefined &&
    TOKEN_PERMITS_EIP7702_DELEGATES.some((delegate) => isAddressEqual(delegation, delegate))
    ? "eip7702"
    : "unsupported";
}

export type TokenPermitsDisabledReason = "accountTypeNotLoaded" | "unsupportedAccount" | "flagNotLoaded" | "flagOff";

// tokenDisabled: a permit for the token failed in a way a retry won't fix, so it stays on approvals for the account
export type TokenPermitUnavailableReason = TokenPermitsDisabledReason | "tokenNotAllowed" | "tokenDisabled";

export function getTokenPermitsDisabledReason({
  uiFlags,
  accountType,
  isQaOverrideEnabled,
}: {
  uiFlags: UiFlags | undefined;
  accountType: TokenPermitAccountType | undefined;
  isQaOverrideEnabled: boolean;
}): TokenPermitsDisabledReason | undefined {
  if (accountType === undefined) {
    return "accountTypeNotLoaded";
  }

  if (accountType === "unsupported") {
    return "unsupportedAccount";
  }

  if (isQaOverrideEnabled) {
    return undefined;
  }

  const flag =
    uiFlags?.[accountType === "eoa" ? IS_TOKEN_PERMITS_EOA_ENABLED_UI_FLAG : IS_TOKEN_PERMITS_EIP7702_ENABLED_UI_FLAG];

  // fail-closed: permits stay off until the keeper explicitly enables them for the account type, and the
  // flags restored from storage on first paint leave the permit flags out
  if (flag === undefined) {
    return "flagNotLoaded";
  }

  return flag.enabled === true ? undefined : "flagOff";
}
