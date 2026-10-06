import { act, cleanup, render } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { GMX_ACCOUNT_PSEUDO_CHAIN_ID } from "sdk/configs/chains";

import type { DisplayToken } from "components/TokenSelector/types";

const { selectorValues } = vi.hoisted(() => ({
  selectorValues: new Map<string, unknown>(),
}));

vi.mock("context/PoolsDetailsContext/selectors", () => ({
  selectPoolsDetailsFirstTokenAddress: "firstTokenAddress",
  selectPoolsDetailsFlags: "flags",
  selectPoolsDetailsGlvOrMarketAddress: "glvOrMarketAddress",
  selectPoolsDetailsIsFirstTokenPinned: "isFirstTokenPinned",
  selectPoolsDetailsLongTokenAddress: "longTokenAddress",
  selectPoolsDetailsPaySource: "paySource",
  selectPoolsDetailsSecondTokenAmount: "secondTokenAmount",
  selectPoolsDetailsSecondTokenAddress: "secondTokenAddress",
  selectPoolsDetailsSetFirstTokenAddress: "setFirstTokenAddress",
  selectPoolsDetailsSetFocusedInput: "setFocusedInput",
  selectPoolsDetailsSetIsFirstTokenPinned: "setIsFirstTokenPinned",
  selectPoolsDetailsSetSecondTokenAddress: "setSecondTokenAddress",
  selectPoolsDetailsSetSecondTokenInputValue: "setSecondTokenInputValue",
  selectPoolsDetailsShortTokenAddress: "shortTokenAddress",
}));

vi.mock("context/SyntheticsStateContext/selectors/globalSelectors", () => ({
  selectAccount: "account",
  selectIsWalletBalancesLoaded: "isWalletBalancesLoaded",
}));

vi.mock("context/SyntheticsEvents", () => ({
  useSyntheticsEvents: () => ({ transitRouteProgress: selectorValues.get("transitRouteProgress") }),
}));

vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSelector: (key: string) => selectorValues.get(key),
}));

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: ARBITRUM, srcChainId: undefined }),
}));

import { useUpdateTokens } from "./useUpdateTokens";

const USDG = "0xusdg";
const USDC = "0xusdc";
const USDG_GLV = "0xglv";
const OTHER_POOL = "0xpool";
const ACCOUNT = "0xaccount";

const DEPOSIT_FLAGS = { isPair: false, isSingle: true, isDeposit: true };

function option(address: string, balanceUsd: bigint, chainId: number = ARBITRUM): DisplayToken {
  return { address, chainId, balanceUsd } as DisplayToken;
}

const DISCONNECTED_OPTIONS = [option(USDG, 0n), option(USDC, 0n)];
const USDC_HOLDER_OPTIONS = [option(USDC, 1000n), option(USDG, 0n)];
const USDG_HOLDER_OPTIONS = [option(USDG, 1000n), option(USDC, 0n)];
const MIXED_PAY_SOURCE_OPTIONS = [
  option(USDG, 5000n, GMX_ACCOUNT_PSEUDO_CHAIN_ID),
  option(USDC, 1000n),
  option(USDG, 0n),
  option(USDC, 0n, GMX_ACCOUNT_PSEUDO_CHAIN_ID),
];

type HarnessProps = {
  tokenOptions: DisplayToken[];
  account?: string;
  isWalletBalancesLoaded?: boolean;
  flags?: typeof DEPOSIT_FLAGS;
  paySource?: "settlementChain" | "gmxAccount";
  glvOrMarketAddress?: string;
  initialFirstTokenAddress?: string;
};

let latestFirstTokenAddress: string | undefined;
let latestUserPicksFirstToken: (address: string) => void;

function Harness({
  tokenOptions,
  account,
  isWalletBalancesLoaded = false,
  flags = DEPOSIT_FLAGS,
  paySource = "settlementChain",
  glvOrMarketAddress = USDG_GLV,
  initialFirstTokenAddress,
}: HarnessProps) {
  const [firstTokenAddress, setFirstTokenAddress] = useState<string | undefined>(initialFirstTokenAddress);
  const [pinnedPools, setPinnedPools] = useState<Record<string, boolean>>({});
  const setIsFirstTokenPinned = (value: boolean) =>
    setPinnedPools((prev) => ({ ...prev, [glvOrMarketAddress]: value }));

  selectorValues.set("flags", flags);
  selectorValues.set("paySource", paySource);
  selectorValues.set("glvOrMarketAddress", glvOrMarketAddress);
  selectorValues.set("longTokenAddress", USDG);
  selectorValues.set("shortTokenAddress", USDG);
  selectorValues.set("firstTokenAddress", firstTokenAddress);
  selectorValues.set("setFirstTokenAddress", setFirstTokenAddress);
  selectorValues.set("isFirstTokenPinned", pinnedPools[glvOrMarketAddress] ?? false);
  selectorValues.set("setIsFirstTokenPinned", setIsFirstTokenPinned);
  selectorValues.set("account", account);
  selectorValues.set("isWalletBalancesLoaded", isWalletBalancesLoaded);

  latestFirstTokenAddress = firstTokenAddress;
  latestUserPicksFirstToken = (address: string) => {
    setIsFirstTokenPinned(true);
    setFirstTokenAddress(address);
  };

  useUpdateTokens({ tokenOptions, marketInfo: undefined });

  return null;
}

describe("useUpdateTokens", () => {
  beforeEach(() => {
    selectorValues.clear();
    selectorValues.set("secondTokenAddress", undefined);
    selectorValues.set("secondTokenAmount", undefined);
    selectorValues.set("setSecondTokenAddress", vi.fn());
    selectorValues.set("setSecondTokenInputValue", vi.fn());
    selectorValues.set("setFocusedInput", vi.fn());
  });

  afterEach(cleanup);

  it("replaces a remembered token with the largest balance only once the wallet balances load", () => {
    const { rerender } = render(<Harness tokenOptions={DISCONNECTED_OPTIONS} initialFirstTokenAddress={USDG} />);

    rerender(<Harness tokenOptions={DISCONNECTED_OPTIONS} account={ACCOUNT} />);
    expect(latestFirstTokenAddress).toBe(USDG);

    rerender(<Harness tokenOptions={USDC_HOLDER_OPTIONS} account={ACCOUNT} isWalletBalancesLoaded />);
    expect(latestFirstTokenAddress).toBe(USDC);
  });

  it("keeps a token the user picked before the balances loaded", () => {
    const { rerender } = render(<Harness tokenOptions={DISCONNECTED_OPTIONS} />);

    act(() => latestUserPicksFirstToken(USDC));
    rerender(<Harness tokenOptions={USDG_HOLDER_OPTIONS} account={ACCOUNT} isWalletBalancesLoaded />);

    expect(latestFirstTokenAddress).toBe(USDC);
  });

  it("does not switch again when the balances change later", () => {
    const { rerender } = render(
      <Harness tokenOptions={USDC_HOLDER_OPTIONS} account={ACCOUNT} isWalletBalancesLoaded />
    );

    rerender(<Harness tokenOptions={USDG_HOLDER_OPTIONS} account={ACCOUNT} isWalletBalancesLoaded />);

    expect(latestFirstTokenAddress).toBe(USDC);
  });

  it.each([
    {
      name: "keeps the pinned token for another account",
      account: "0xother",
      glvOrMarketAddress: USDG_GLV,
      expected: USDC,
    },
    {
      name: "picks the largest balance again for another pool",
      account: ACCOUNT,
      glvOrMarketAddress: OTHER_POOL,
      expected: USDG,
    },
  ])("$name", ({ account, glvOrMarketAddress, expected }) => {
    const { rerender } = render(
      <Harness tokenOptions={USDC_HOLDER_OPTIONS} account={ACCOUNT} isWalletBalancesLoaded />
    );

    rerender(
      <Harness
        tokenOptions={USDG_HOLDER_OPTIONS}
        account={account}
        glvOrMarketAddress={glvOrMarketAddress}
        isWalletBalancesLoaded
      />
    );

    expect(latestFirstTokenAddress).toBe(expected);
  });

  it.each([
    { paySource: "settlementChain" as const, expected: USDC },
    { paySource: "gmxAccount" as const, expected: USDG },
  ])("picks the largest balance among the $paySource options", ({ paySource, expected }) => {
    render(
      <Harness tokenOptions={MIXED_PAY_SOURCE_OPTIONS} account={ACCOUNT} isWalletBalancesLoaded paySource={paySource} />
    );

    expect(latestFirstTokenAddress).toBe(expected);
  });

  it("leaves the pay token to a USDC to USDG conversion in progress on this pool", () => {
    selectorValues.set("transitRouteProgress", { account: ACCOUNT, glvOrMarketAddress: USDG_GLV });

    render(
      <Harness
        tokenOptions={USDC_HOLDER_OPTIONS}
        account={ACCOUNT}
        isWalletBalancesLoaded
        initialFirstTokenAddress={USDG}
      />
    );

    expect(latestFirstTokenAddress).toBe(USDG);
  });

  it.each([
    { name: "withdrawal receive token", flags: { isPair: false, isSingle: true, isDeposit: false } },
    { name: "pair deposit", flags: { isPair: true, isSingle: false, isDeposit: true } },
  ])("leaves the $name alone", ({ flags }) => {
    const { rerender } = render(<Harness tokenOptions={DISCONNECTED_OPTIONS} flags={flags} />);

    rerender(<Harness tokenOptions={USDC_HOLDER_OPTIONS} account={ACCOUNT} isWalletBalancesLoaded flags={flags} />);

    expect(latestFirstTokenAddress).toBe(USDG);
  });
});
