import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { getCollateralCloseDestinationKey } from "config/localStorage";
import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { StateCtx } from "context/SyntheticsStateContext/utils";
import type { TokenData, TokensData } from "domain/synthetics/tokens/types";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { useInitCollateralCloseDestination } from "../useInitCollateralCloseDestination";

const ACCOUNT_A = "0x1234567890AbcdEF1234567890aBcdef12345678";
const ACCOUNT_B = "0xAbCdEf1234567890aBcDeF1234567890AbCdEf12";

const mocks = vi.hoisted(() => ({
  chainId: 42161,
  account: "",
  tokensData: undefined as TokensData | undefined,
  isGmxAccountBalancesLoaded: false,
}));

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: mocks.chainId, srcChainId: undefined }),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ account: mocks.account }),
}));

vi.mock("lib/wallets/useAccountType", async (importOriginal) => {
  const original = await importOriginal<typeof import("lib/wallets/useAccountType")>();
  return { ...original, useAccountType: () => ({ accountType: original.AccountType.EOA, isLoading: false }) };
});

vi.mock("lib/wallets/useWalletSessionChains", () => ({
  useWalletCanSignTypedData: () => ({ canSignTypedData: true, isLoading: false }),
}));

// same storage hook and key as SettingsContextProvider, so a switch reproduces its one-render stale value
vi.mock("context/SettingsContext/SettingsContextProvider", async () => {
  const { useLocalStorageSerializeKey } = await import("lib/localStorage");
  return {
    useSettings: () => {
      const [receiveToGmxAccount, setReceiveToGmxAccount] = useLocalStorageSerializeKey<boolean | null>(
        getCollateralCloseDestinationKey(mocks.chainId, mocks.account),
        null
      );
      return { receiveToGmxAccount: receiveToGmxAccount ?? null, setReceiveToGmxAccount };
    },
  };
});

const USDC = getTokenBySymbol(ARBITRUM, "USDC");
const LINK = getTokenBySymbol(ARBITRUM, "LINK");

function setGmxAccountBalances(balances: { usdc?: bigint; link?: bigint } | undefined) {
  mocks.isGmxAccountBalancesLoaded = balances !== undefined;
  mocks.tokensData = {
    [USDC.address]: {
      ...USDC,
      prices: { minPrice: 10n ** 30n, maxPrice: 10n ** 30n },
      gmxAccountBalance: balances?.usdc,
    },
    [LINK.address]: {
      ...LINK,
      prices: { minPrice: 50n * 10n ** 30n, maxPrice: 50n * 10n ** 30n },
      gmxAccountBalance: balances?.link,
    },
  } as Record<string, TokenData>;
}

function getSaved(account: string) {
  return localStorage.getItem(JSON.stringify(getCollateralCloseDestinationKey(ARBITRUM, account)));
}

function Harness() {
  useInitCollateralCloseDestination();
  return null;
}

// real use-context-selector provider: a consumer re-rendering with it reads the previous value for one render
function App() {
  const state = {
    globals: {
      tokensDataResult: {
        tokensData: mocks.tokensData,
        isGmxAccountBalancesLoaded: mocks.isGmxAccountBalancesLoaded,
      },
    },
  } as unknown as SyntheticsState;

  return (
    <StateCtx.Provider value={state}>
      <Harness />
    </StateCtx.Provider>
  );
}

describe("useInitCollateralCloseDestination", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.chainId = ARBITRUM;
    mocks.account = ACCOUNT_A;
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps the saved wallet destination when someone credits the GMX Account TRD-19", () => {
    localStorage.setItem(JSON.stringify(getCollateralCloseDestinationKey(ARBITRUM, ACCOUNT_A)), "false");
    setGmxAccountBalances({ usdc: 0n });
    const { rerender } = render(<App />);

    for (const usdc of [1n, undefined, 1_000n * 10n ** 6n]) {
      setGmxAccountBalances(usdc === undefined ? undefined : { usdc });
      rerender(<App />);
      expect(getSaved(ACCOUNT_A)).toBe("false");
    }
  });

  it("keeps the saved destination when switching to Arbitrum from a chain without one TRD-19", () => {
    localStorage.setItem(JSON.stringify(getCollateralCloseDestinationKey(ARBITRUM, ACCOUNT_A)), "false");
    setGmxAccountBalances({ usdc: 1_000n * 10n ** 6n });
    mocks.chainId = AVALANCHE;
    const { rerender } = render(<App />);

    mocks.chainId = ARBITRUM;
    rerender(<App />);

    expect(getSaved(ACCOUNT_A)).toBe("false");
  });

  it("picks a newly connected account's default from its own gas-token balance TRD-19", () => {
    setGmxAccountBalances({ usdc: 1_000n * 10n ** 6n });
    const { rerender } = render(<App />);
    expect(getSaved(ACCOUNT_A)).toBe("true");

    mocks.account = ACCOUNT_B;
    setGmxAccountBalances(undefined);
    rerender(<App />);
    expect(getSaved(ACCOUNT_B)).toBe(null);

    setGmxAccountBalances({ usdc: 0n, link: 10n * 10n ** 18n });
    rerender(<App />);
    expect(getSaved(ACCOUNT_B)).toBe("false");
  });
});
