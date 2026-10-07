import { act, cleanup, render } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { GMX_ACCOUNT_PSEUDO_CHAIN_ID } from "sdk/configs/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";

import type { DisplayToken } from "components/TokenSelector/types";

const { selectorValues } = vi.hoisted(() => ({
  selectorValues: new Map<string, unknown>(),
}));

vi.mock("context/PoolsDetailsContext/selectors", () => ({
  selectPoolsDetailsFirstTokenAddress: "firstTokenAddress",
  selectPoolsDetailsFirstTokenInputValue: "firstTokenInputValue",
  selectPoolsDetailsFlags: "flags",
  selectPoolsDetailsGlvOrMarketAddress: "glvOrMarketAddress",
  selectPoolsDetailsIsFirstTokenPinned: "isFirstTokenPinned",
  selectPoolsDetailsLongTokenAddress: "longTokenAddress",
  selectPoolsDetailsMarketOrGlvTokenInputValue: "marketOrGlvTokenInputValue",
  selectPoolsDetailsPaySource: "paySource",
  selectPoolsDetailsSecondTokenAmount: "secondTokenAmount",
  selectPoolsDetailsSecondTokenAddress: "secondTokenAddress",
  selectPoolsDetailsSetFirstTokenAddress: "setFirstTokenAddress",
  selectPoolsDetailsSetFocusedInput: "setFocusedInput",
  selectPoolsDetailsSetSecondTokenAddress: "setSecondTokenAddress",
  selectPoolsDetailsSetSecondTokenInputValue: "setSecondTokenInputValue",
  selectPoolsDetailsShortTokenAddress: "shortTokenAddress",
}));

vi.mock("context/SyntheticsEvents", () => ({
  useSyntheticsEvents: () => ({ transitRouteProgress: selectorValues.get("transitRouteProgress") }),
}));

vi.mock("context/SyntheticsStateContext/selectors/globalSelectors", () => ({
  selectAccount: "account",
  selectIsWalletBalancesLoaded: "isWalletBalancesLoaded",
}));

vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSelector: (key: string) => selectorValues.get(key),
}));

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: ARBITRUM, srcChainId: undefined }),
}));

import { useUpdateTokens } from "./useUpdateTokens";

const USDG = getTokenBySymbol(ARBITRUM, "USDG").address;
const USDC = getTokenBySymbol(ARBITRUM, "USDC").address;
const WETH = getTokenBySymbol(ARBITRUM, "WETH").address;
const USDG_GLV = "0xglv";
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
  longTokenAddress?: string;
  shortTokenAddress?: string;
  firstTokenInputValue?: string;
  marketOrGlvTokenInputValue?: string;
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
  longTokenAddress = USDG,
  shortTokenAddress = USDG,
  firstTokenInputValue = "",
  marketOrGlvTokenInputValue = "",
  initialFirstTokenAddress,
}: HarnessProps) {
  const [firstTokenAddress, setFirstTokenAddress] = useState<string | undefined>(initialFirstTokenAddress);
  const [isFirstTokenPinned, setIsFirstTokenPinned] = useState(false);

  selectorValues.set("flags", flags);
  selectorValues.set("paySource", paySource);
  selectorValues.set("glvOrMarketAddress", USDG_GLV);
  selectorValues.set("longTokenAddress", longTokenAddress);
  selectorValues.set("shortTokenAddress", shortTokenAddress);
  selectorValues.set("firstTokenAddress", firstTokenAddress);
  selectorValues.set("setFirstTokenAddress", setFirstTokenAddress);
  selectorValues.set("isFirstTokenPinned", isFirstTokenPinned);
  selectorValues.set("firstTokenInputValue", firstTokenInputValue);
  selectorValues.set("marketOrGlvTokenInputValue", marketOrGlvTokenInputValue);
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

  it("shows USDG without a wallet, even when USDC was remembered", () => {
    render(<Harness tokenOptions={DISCONNECTED_OPTIONS} initialFirstTokenAddress={USDC} />);

    expect(latestFirstTokenAddress).toBe(USDG);
  });

  it("switches to the larger balance only once the wallet balances load", () => {
    const { rerender } = render(<Harness tokenOptions={DISCONNECTED_OPTIONS} initialFirstTokenAddress={USDG} />);

    rerender(<Harness tokenOptions={USDC_HOLDER_OPTIONS} account={ACCOUNT} />);
    expect(latestFirstTokenAddress).toBe(USDG);

    rerender(<Harness tokenOptions={USDC_HOLDER_OPTIONS} account={ACCOUNT} isWalletBalancesLoaded />);
    expect(latestFirstTokenAddress).toBe(USDC);
  });

  it("follows the larger balance while nothing is typed", () => {
    const { rerender } = render(
      <Harness tokenOptions={USDC_HOLDER_OPTIONS} account={ACCOUNT} isWalletBalancesLoaded />
    );

    rerender(<Harness tokenOptions={USDG_HOLDER_OPTIONS} account={ACCOUNT} isWalletBalancesLoaded />);

    expect(latestFirstTokenAddress).toBe(USDG);
  });

  it.each([
    { input: "Pay", firstTokenInputValue: "10", marketOrGlvTokenInputValue: "" },
    { input: "GLV", firstTokenInputValue: "", marketOrGlvTokenInputValue: "10" },
  ])("keeps the token once an amount is typed in $input", ({ firstTokenInputValue, marketOrGlvTokenInputValue }) => {
    const { rerender } = render(
      <Harness tokenOptions={USDC_HOLDER_OPTIONS} account={ACCOUNT} isWalletBalancesLoaded />
    );

    rerender(
      <Harness
        tokenOptions={USDG_HOLDER_OPTIONS}
        account={ACCOUNT}
        isWalletBalancesLoaded
        firstTokenInputValue={firstTokenInputValue}
        marketOrGlvTokenInputValue={marketOrGlvTokenInputValue}
      />
    );

    expect(latestFirstTokenAddress).toBe(USDC);
  });

  it("keeps a token the user picked", () => {
    const { rerender } = render(<Harness tokenOptions={DISCONNECTED_OPTIONS} />);

    act(() => latestUserPicksFirstToken(USDC));
    rerender(<Harness tokenOptions={USDG_HOLDER_OPTIONS} account={ACCOUNT} isWalletBalancesLoaded />);

    expect(latestFirstTokenAddress).toBe(USDC);
  });

  it.each([
    { paySource: "settlementChain" as const, expected: USDC },
    { paySource: "gmxAccount" as const, expected: USDG },
  ])("picks the larger balance among the $paySource options", ({ paySource, expected }) => {
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
    { name: "withdrawal receive token", props: { flags: { isPair: false, isSingle: true, isDeposit: false } } },
    { name: "pair deposit", props: { flags: { isPair: true, isSingle: false, isDeposit: true } } },
    { name: "pay token of a non-USDG pool", props: { longTokenAddress: WETH, shortTokenAddress: USDC } },
  ])("leaves the $name alone", ({ props }) => {
    const { rerender } = render(<Harness tokenOptions={DISCONNECTED_OPTIONS} {...props} />);

    rerender(<Harness tokenOptions={USDC_HOLDER_OPTIONS} account={ACCOUNT} isWalletBalancesLoaded {...props} />);

    expect(latestFirstTokenAddress).toBe(USDG);
  });
});
