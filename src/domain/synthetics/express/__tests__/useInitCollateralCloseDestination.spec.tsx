import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { getCollateralCloseDestinationKey } from "config/localStorage";
import type { TokenData, TokensData } from "domain/synthetics/tokens/types";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { useInitCollateralCloseDestination } from "../useInitCollateralCloseDestination";

const ACCOUNT = "0x1234567890AbcdEF1234567890aBcdef12345678";

const mocks = vi.hoisted(() => ({
  chainId: 42161,
  tokensData: undefined as TokensData | undefined,
  isGmxAccountBalancesLoaded: false,
}));

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: mocks.chainId, srcChainId: undefined }),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ account: ACCOUNT }),
}));

vi.mock("lib/wallets/useAccountType", async (importOriginal) => {
  const original = await importOriginal<typeof import("lib/wallets/useAccountType")>();
  return { ...original, useAccountType: () => ({ accountType: original.AccountType.EOA, isLoading: false }) };
});

vi.mock("lib/wallets/useWalletSessionChains", () => ({
  useWalletCanSignTypedData: () => ({ canSignTypedData: true, isLoading: false }),
}));

// same storage hook and key as SettingsContextProvider, so a chain switch reproduces its one-render stale value
vi.mock("context/SettingsContext/SettingsContextProvider", async () => {
  const { useLocalStorageSerializeKey } = await import("lib/localStorage");
  return {
    useSettings: () => {
      const [receiveToGmxAccount, setReceiveToGmxAccount] = useLocalStorageSerializeKey<boolean | null>(
        getCollateralCloseDestinationKey(mocks.chainId, ACCOUNT),
        null
      );
      return { receiveToGmxAccount: receiveToGmxAccount ?? null, setReceiveToGmxAccount };
    },
  };
});

vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      globals: {
        tokensDataResult: {
          tokensData: mocks.tokensData,
          isGmxAccountBalancesLoaded: mocks.isGmxAccountBalancesLoaded,
        },
      },
    }),
}));

const USDC = getTokenBySymbol(ARBITRUM, "USDC");
const SAVED_KEY = JSON.stringify(getCollateralCloseDestinationKey(ARBITRUM, ACCOUNT));

function setGmxAccountUsdc(gmxAccountBalance: bigint | undefined) {
  mocks.isGmxAccountBalancesLoaded = gmxAccountBalance !== undefined;
  mocks.tokensData = {
    [USDC.address]: {
      ...USDC,
      prices: { minPrice: 10n ** 30n, maxPrice: 10n ** 30n },
      gmxAccountBalance,
    } as TokenData,
  };
}

function Harness() {
  useInitCollateralCloseDestination();
  return null;
}

describe("useInitCollateralCloseDestination", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.chainId = ARBITRUM;
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps the saved wallet destination when someone credits the GMX Account TRD-19", () => {
    localStorage.setItem(SAVED_KEY, "false");
    setGmxAccountUsdc(0n);
    const { rerender } = render(<Harness />);

    for (const balance of [1n, 1n, undefined, 1_000n * 10n ** 6n]) {
      setGmxAccountUsdc(balance);
      rerender(<Harness />);
      expect(localStorage.getItem(SAVED_KEY)).toBe("false");
    }
  });

  it("keeps the saved destination when switching to Arbitrum from a chain without one TRD-19", () => {
    localStorage.setItem(SAVED_KEY, "false");
    setGmxAccountUsdc(1_000n * 10n ** 6n);
    mocks.chainId = AVALANCHE;
    const { rerender } = render(<Harness />);

    mocks.chainId = ARBITRUM;
    rerender(<Harness />);

    expect(localStorage.getItem(SAVED_KEY)).toBe("false");
  });
});
