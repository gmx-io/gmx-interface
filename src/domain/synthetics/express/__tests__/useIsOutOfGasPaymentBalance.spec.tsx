import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TokenData, TokensData } from "domain/tokens";
import { ARBITRUM } from "sdk/configs/chainIds";
import { getGasPaymentTokens, getRelayerFeeToken } from "sdk/configs/express";
import { getToken } from "sdk/configs/tokens";

import { useIsOutOfGasPaymentBalance } from "../useIsOutOfGasPaymentBalance";

const mocks = vi.hoisted(() => ({
  account: undefined as string | undefined,
  chainId: 42161,
  srcChainId: undefined as number | undefined,
  tokensData: undefined as Record<string, unknown> | undefined,
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: mocks.account }),
}));

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: mocks.chainId, srcChainId: mocks.srcChainId }),
}));

vi.mock("../../tokens", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../tokens")>()),
  useTokensDataRequest: () => ({ tokensData: mocks.tokensData }),
}));

vi.mock("../../fees", () => ({
  useGasPrice: () => 10_000_000n,
  useGasLimits: () => ({}),
}));

vi.mock("../useL1ExpressGasReference", () => ({
  useL1ExpressOrderGasReference: () => undefined,
}));

// The GMX Account minimum is higher than the Wallet minimum (gmxAccountCollateralGasLimit in the real formula),
// so a balance of 2 units is enough for the Wallet but not for the GMX Account.
vi.mock("sdk/utils/fees/executionFee", async (importOriginal) => ({
  ...(await importOriginal<typeof import("sdk/utils/fees/executionFee")>()),
  estimateBatchMinGasPaymentTokenAmount: ({
    gasPaymentToken,
    isGmxAccount,
  }: {
    gasPaymentToken: TokenData;
    isGmxAccount: boolean;
  }) => (isGmxAccount ? 3n : 1n) * 10n ** BigInt(gasPaymentToken.decimals),
}));

const ACCOUNT = "0x1234567890123456789012345678901234567890";
const GAS_PAYMENT_TOKEN_ADDRESSES = getGasPaymentTokens(ARBITRUM);
const RELAY_FEE_TOKEN_ADDRESS = getRelayerFeeToken(ARBITRUM).address;

function buildTokensData({
  walletUnits,
  gmxAccountUnits,
  walletUnitsByAddress = {},
}: {
  walletUnits: number | undefined;
  gmxAccountUnits: number | undefined;
  walletUnitsByAddress?: Record<string, number>;
}): TokensData {
  const addresses = Array.from(new Set([...GAS_PAYMENT_TOKEN_ADDRESSES, RELAY_FEE_TOKEN_ADDRESS]));

  return addresses.reduce((acc: TokensData, address) => {
    const token = getToken(ARBITRUM, address);
    const toAmount = (units: number | undefined) =>
      units === undefined ? undefined : BigInt(units) * 10n ** BigInt(token.decimals);

    acc[address] = {
      ...token,
      prices: { minPrice: 10n ** 30n, maxPrice: 10n ** 30n },
      walletBalance: toAmount(walletUnitsByAddress[address] ?? walletUnits),
      gmxAccountBalance: toAmount(gmxAccountUnits),
    } as TokenData;

    return acc;
  }, {} as TokensData);
}

function renderIsOutOfGasPaymentBalance() {
  let result!: ReturnType<typeof useIsOutOfGasPaymentBalance>;

  function TestComponent() {
    result = useIsOutOfGasPaymentBalance();
    return null;
  }

  render(<TestComponent />);

  return result;
}

describe("useIsOutOfGasPaymentBalance", () => {
  beforeEach(() => {
    mocks.account = undefined;
    mocks.chainId = ARBITRUM;
    mocks.srcChainId = undefined;
    mocks.tokensData = undefined;
  });

  afterEach(() => {
    cleanup();
  });

  it("reports neither source as out of balance when no account is connected", () => {
    mocks.tokensData = buildTokensData({ walletUnits: undefined, gmxAccountUnits: undefined });

    expect(renderIsOutOfGasPaymentBalance()).toEqual({
      isWalletOutOfGasPaymentBalance: false,
      isGmxAccountOutOfGasPaymentBalance: false,
    });
  });

  it("reports neither source as out of balance when no account is connected on a source chain", () => {
    mocks.srcChainId = 8453;
    mocks.tokensData = buildTokensData({ walletUnits: undefined, gmxAccountUnits: undefined });

    expect(renderIsOutOfGasPaymentBalance()).toEqual({
      isWalletOutOfGasPaymentBalance: false,
      isGmxAccountOutOfGasPaymentBalance: false,
    });
  });

  it("reports only the Wallet as out of balance when the Wallet is empty and the GMX Account is funded", () => {
    mocks.account = ACCOUNT;
    mocks.tokensData = buildTokensData({ walletUnits: 0, gmxAccountUnits: 4 });

    expect(renderIsOutOfGasPaymentBalance()).toEqual({
      isWalletOutOfGasPaymentBalance: true,
      isGmxAccountOutOfGasPaymentBalance: false,
    });
  });

  it("reports only the GMX Account as out of balance when the Wallet is funded and the GMX Account is empty", () => {
    mocks.account = ACCOUNT;
    mocks.tokensData = buildTokensData({ walletUnits: 2, gmxAccountUnits: 0 });

    expect(renderIsOutOfGasPaymentBalance()).toEqual({
      isWalletOutOfGasPaymentBalance: false,
      isGmxAccountOutOfGasPaymentBalance: true,
    });
  });

  it("treats a source as funded when any single gas payment token of that source covers the minimum", () => {
    mocks.account = ACCOUNT;
    mocks.tokensData = buildTokensData({
      walletUnits: 0,
      gmxAccountUnits: 0,
      walletUnitsByAddress: { [GAS_PAYMENT_TOKEN_ADDRESSES[0]]: 2 },
    });

    expect(renderIsOutOfGasPaymentBalance()).toEqual({
      isWalletOutOfGasPaymentBalance: false,
      isGmxAccountOutOfGasPaymentBalance: true,
    });
  });

  it("applies the GMX Account minimum to the GMX Account balance and the Wallet minimum to the Wallet balance", () => {
    mocks.account = ACCOUNT;
    mocks.tokensData = buildTokensData({ walletUnits: 2, gmxAccountUnits: 2 });

    expect(renderIsOutOfGasPaymentBalance()).toEqual({
      isWalletOutOfGasPaymentBalance: false,
      isGmxAccountOutOfGasPaymentBalance: true,
    });
  });

  it("reports both sources as out of balance while the balances have not loaded yet", () => {
    mocks.account = ACCOUNT;
    mocks.tokensData = buildTokensData({ walletUnits: undefined, gmxAccountUnits: undefined });

    expect(renderIsOutOfGasPaymentBalance()).toEqual({
      isWalletOutOfGasPaymentBalance: true,
      isGmxAccountOutOfGasPaymentBalance: true,
    });
  });

  it("keys each source on its own balance regardless of the source chain", () => {
    mocks.account = ACCOUNT;
    mocks.srcChainId = 8453;
    mocks.tokensData = buildTokensData({ walletUnits: 0, gmxAccountUnits: 4 });

    expect(renderIsOutOfGasPaymentBalance()).toEqual({
      isWalletOutOfGasPaymentBalance: true,
      isGmxAccountOutOfGasPaymentBalance: false,
    });
  });
});
