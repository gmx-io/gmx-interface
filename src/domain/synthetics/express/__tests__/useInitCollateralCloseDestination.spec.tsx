import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { getCollateralCloseDestinationKey } from "config/localStorage";
import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { StateCtx } from "context/SyntheticsStateContext/utils";
import type { TokenData, TokensData } from "domain/synthetics/tokens/types";
import { AccountType } from "lib/wallets/useAccountType";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { useInitCollateralCloseDestination } from "../useInitCollateralCloseDestination";

const ACCOUNT = "0x1234567890AbcdEF1234567890aBcdef12345678";
const PREVIOUS_ACCOUNT = "0xAbCdEf1234567890aBcDeF1234567890AbCdEf12";

const mocks = vi.hoisted(() => ({
  chainId: 42161,
  account: undefined as string | undefined,
  accountType: undefined as AccountType | undefined,
  staleAccountTypeRenders: 0,
  canSignTypedData: true,
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
  return {
    ...original,
    // like SWR right after its key changes on a mounted hook: no data and not loading
    useAccountType: () => {
      if (mocks.staleAccountTypeRenders > 0) {
        mocks.staleAccountTypeRenders--;
        return { accountType: undefined, isLoading: false };
      }
      return { accountType: mocks.accountType, isLoading: false };
    },
  };
});

vi.mock("lib/wallets/useWalletSessionChains", () => ({
  useWalletCanSignTypedData: () => ({ canSignTypedData: mocks.canSignTypedData, isLoading: false }),
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

function setGmxAccountUsdc(usdc: bigint | undefined) {
  mocks.isGmxAccountBalancesLoaded = usdc !== undefined;
  mocks.tokensData = {
    [USDC.address]: { ...USDC, prices: { minPrice: 10n ** 30n, maxPrice: 10n ** 30n }, gmxAccountBalance: usdc },
  } as Record<string, TokenData>;
}

function save(value: string, account = ACCOUNT) {
  localStorage.setItem(JSON.stringify(getCollateralCloseDestinationKey(ARBITRUM, account)), value);
}

function getSaved() {
  return localStorage.getItem(JSON.stringify(getCollateralCloseDestinationKey(ARBITRUM, ACCOUNT)));
}

function Harness() {
  useInitCollateralCloseDestination();
  return null;
}

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
    mocks.account = ACCOUNT;
    mocks.accountType = AccountType.EOA;
    mocks.staleAccountTypeRenders = 0;
    mocks.canSignTypedData = true;
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps the saved wallet destination when someone credits the GMX Account TRD-19", () => {
    save("false");
    setGmxAccountUsdc(0n);
    const { rerender } = render(<App />);

    for (const usdc of [1n, undefined, 1_000n * 10n ** 6n]) {
      setGmxAccountUsdc(usdc);
      rerender(<App />);
      expect(getSaved()).toBe("false");
    }
  });

  it.each(["false", "true"])(
    "keeps the saved destination %s when switching to Arbitrum from a chain without one TRD-19",
    (saved) => {
      save(saved);
      setGmxAccountUsdc(1_000n * 10n ** 6n);
      mocks.chainId = AVALANCHE;
      const { rerender } = render(<App />);

      mocks.chainId = ARBITRUM;
      rerender(<App />);

      expect(getSaved()).toBe(saved);
    }
  );

  it.each([
    { accountType: AccountType.EOA, canSignTypedData: true, saved: null, expected: "false" },
    { accountType: AccountType.PostEip7702EOA, canSignTypedData: true, saved: null, expected: "false" },
    { accountType: undefined, canSignTypedData: true, saved: null, expected: null },
    { accountType: AccountType.SmartAccount, canSignTypedData: true, saved: null, expected: "true" },
    { accountType: AccountType.SmartAccount, canSignTypedData: false, saved: null, expected: "false" },
    { accountType: AccountType.SmartAccount, canSignTypedData: true, saved: "false", expected: "false" },
  ])(
    "defaults only a smart wallet to the GMX Account whatever it holds, also after a reconnect: %o TRD-19",
    ({ accountType, canSignTypedData, saved, expected }) => {
      save("false", PREVIOUS_ACCOUNT);
      if (saved !== null) {
        save(saved);
      }
      mocks.account = PREVIOUS_ACCOUNT;
      setGmxAccountUsdc(undefined);
      const { rerender } = render(<App />);

      mocks.account = undefined;
      rerender(<App />);

      mocks.account = ACCOUNT;
      mocks.accountType = accountType;
      mocks.canSignTypedData = canSignTypedData;
      mocks.staleAccountTypeRenders = 1;
      setGmxAccountUsdc(1_000n * 10n ** 6n);
      rerender(<App />);
      rerender(<App />);

      expect(getSaved()).toBe(expected);
    }
  );
});
