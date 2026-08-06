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

vi.mock("../../tokens", () => ({
  useTokensDataRequest: () => ({ tokensData: mocks.tokensData }),
}));

vi.mock("../../fees", () => ({
  useGasPrice: () => 10_000_000n,
  useGasLimits: () => ({}),
}));

vi.mock("../useL1ExpressGasReference", () => ({
  useL1ExpressOrderGasReference: () => undefined,
}));

vi.mock("sdk/utils/fees/executionFee", async (importOriginal) => ({
  ...(await importOriginal<typeof import("sdk/utils/fees/executionFee")>()),
  estimateBatchMinGasPaymentTokenAmount: ({ gasPaymentToken }: { gasPaymentToken: TokenData }) =>
    10n ** BigInt(gasPaymentToken.decimals),
}));

const ACCOUNT = "0x1234567890123456789012345678901234567890";
const GAS_PAYMENT_TOKEN_ADDRESSES = getGasPaymentTokens(ARBITRUM);
const RELAY_FEE_TOKEN_ADDRESS = getRelayerFeeToken(ARBITRUM).address;

function buildTokensData(balanceUnits: number | undefined): TokensData {
  const addresses = Array.from(new Set([...GAS_PAYMENT_TOKEN_ADDRESSES, RELAY_FEE_TOKEN_ADDRESS]));

  return addresses.reduce((acc: TokensData, address) => {
    const token = getToken(ARBITRUM, address);

    acc[address] = {
      ...token,
      prices: { minPrice: 10n ** 30n, maxPrice: 10n ** 30n },
      balance: balanceUnits === undefined ? undefined : BigInt(balanceUnits) * 10n ** BigInt(token.decimals),
    } as TokenData;

    return acc;
  }, {} as TokensData);
}

function renderIsOutOfGasPaymentBalance(): boolean {
  let result!: boolean;

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

  it("returns false when no account is connected", () => {
    mocks.tokensData = buildTokensData(undefined);

    expect(renderIsOutOfGasPaymentBalance()).toBe(false);
  });

  it("returns false when no account is connected on a source chain", () => {
    mocks.srcChainId = 8453;
    mocks.tokensData = buildTokensData(undefined);

    expect(renderIsOutOfGasPaymentBalance()).toBe(false);
  });

  it("returns true when the connected account is below the min balance on every gas payment token", () => {
    mocks.account = ACCOUNT;
    mocks.tokensData = buildTokensData(0);

    expect(renderIsOutOfGasPaymentBalance()).toBe(true);
  });

  it("returns false when the connected account has a sufficient balance", () => {
    mocks.account = ACCOUNT;
    mocks.tokensData = buildTokensData(2);

    expect(renderIsOutOfGasPaymentBalance()).toBe(false);
  });

  it("still returns true when the account is connected but balances have not loaded yet", () => {
    mocks.account = ACCOUNT;
    mocks.tokensData = buildTokensData(undefined);

    expect(renderIsOutOfGasPaymentBalance()).toBe(true);
  });
});
