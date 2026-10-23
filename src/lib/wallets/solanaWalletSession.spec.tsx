import { act, cleanup, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SOLANA_WALLET_LOCAL_STORAGE_KEY } from "config/localStorage";

import { type SolanaConnectedWallet, SolanaWalletSessionProvider, useSolanaWalletSession } from "./solanaWalletSession";

const mocks = vi.hoisted(() => ({
  wallets: [] as SolanaConnectedWallet[],
  syncMounted: false,
}));

vi.mock("lib/solana/SolanaWalletSessionSync", () => ({
  default: function SolanaWalletSessionSyncMock({
    onChange,
  }: {
    onChange: (update: { ready: boolean; wallets: SolanaConnectedWallet[] }) => void;
  }) {
    useEffect(() => {
      onChange({ ready: true, wallets: mocks.wallets });
      mocks.syncMounted = true;
    }, [onChange]);
    return null;
  },
}));

function createWallet(address: string, walletId: string): SolanaConnectedWallet {
  return { address, walletId, disconnect: vi.fn().mockResolvedValue(undefined) };
}

async function setup() {
  let session!: ReturnType<typeof useSolanaWalletSession>;

  function TestComponent() {
    session = useSolanaWalletSession();
    return null;
  }

  // The sync component loads with React.lazy; let it resolve inside act.
  await act(async () => {
    render(
      <SolanaWalletSessionProvider enabled>
        <TestComponent />
      </SolanaWalletSessionProvider>
    );
    await import("lib/solana/SolanaWalletSessionState");
  });

  return () => session;
}

describe("SolanaWalletSessionProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.syncMounted = false;
  });

  afterEach(() => {
    cleanup();
  });

  it("ignores Solana accounts that were not connected through the Solana flow", async () => {
    mocks.wallets = [createWallet("MetaMaskSolana111", "MetaMask"), createWallet("Embedded111", "Privy")];
    const getSession = await setup();

    await waitFor(() => expect(mocks.syncMounted).toBe(true));

    expect(getSession().address).toBeUndefined();
  });

  it("restores the connected wallet and forgets it after a disconnect", async () => {
    const phantom = createWallet("Phantom111", "Phantom");
    mocks.wallets = [createWallet("MetaMaskSolana111", "MetaMask"), phantom];
    localStorage.setItem(SOLANA_WALLET_LOCAL_STORAGE_KEY, JSON.stringify({ walletId: "Phantom" }));
    const getSession = await setup();

    await waitFor(() => expect(getSession().address).toBe("Phantom111"));

    await act(async () => {
      await getSession().disconnect?.();
    });

    expect(phantom.disconnect).toHaveBeenCalledTimes(1);
    expect(getSession().address).toBeUndefined();
    const stored = localStorage.getItem(SOLANA_WALLET_LOCAL_STORAGE_KEY);
    expect(stored ? JSON.parse(stored).walletId : undefined).toBeUndefined();
  });
});
