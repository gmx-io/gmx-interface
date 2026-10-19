import { isAddressEqual, type Address, type PublicClient } from "viem";

import {
  getIsTokenPermitsEoaEnabled,
  getIsTokenPermitsEip7702Enabled,
  type UiFlags,
} from "domain/synthetics/uiFlags/uiFlags";
import { AccountType, getAccountType } from "lib/wallets/useAccountType";
import { ARBITRUM, AVALANCHE } from "sdk/configs/chains";

// EIP-7702 delegates whose isValidSignature accepts a plain permit signature for every token below
// (simulated on Arbitrum); other delegates reject USDC/USDT permits and keep the approval transaction
export const TOKEN_PERMITS_EIP7702_DELEGATES: Address[] = [
  "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B", // MetaMask EIP7702StatelessDeleGator
  "0x7702cb554e6bFb442cb743A7dF23154544a7176C",
  "0xe40ccB2D94975c51bff0C004eFDfd9B3a5796fA4",
  "0x000000005c84F8Fd50b21CAC312528A64437030e",
  "0x612373D7003d694220f7800EeaF8E3924c0951D3",
  "0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00", // Uniswap Calibur
  "0x64fc23203FCC4BCF09Fc4b30669131333Ba7936B",
  "0xcc0c946EecF01A4Bc76Bc333Ea74CEb04756f17b",
];

// tokens whose permit to the Router was verified on-chain, independent of the SDK's isPermitSupported flags
const TOKEN_PERMITS_ALLOWLIST: Partial<Record<number, Address[]>> = {
  [ARBITRUM]: [
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
    "0x004B506865409877C9fA29bfb1ebA929984B9bbC", // USDG
    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // WBTC
    "0x912CE59144191C1204E64559FE8253a0e49E6548", // ARB
  ],
  [AVALANCHE]: [
    "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // USDC
    "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", // USDT
  ],
};

export type TokenPermitAccountType = "eoa" | "eip7702" | "unsupported";

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

  return delegation !== undefined &&
    TOKEN_PERMITS_EIP7702_DELEGATES.some((delegate) => isAddressEqual(delegation, delegate))
    ? "eip7702"
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

  return accountType === "eoa" ? getIsTokenPermitsEoaEnabled(uiFlags) : getIsTokenPermitsEip7702Enabled(uiFlags);
}
