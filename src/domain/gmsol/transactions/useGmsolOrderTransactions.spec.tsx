import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { SOLANA_NETWORK_ID } from "config/chains";
import { GmxSdkProvider } from "context/GmxSdkContext/GmxSdkContext";

import { useGmsolOrderTransactions } from "./useGmsolOrderTransactions";

const mocks = vi.hoisted(() => ({ prepare: vi.fn(), send: vi.fn(), sign: vi.fn() }));
vi.mock("lib/chains", () => ({ useChainId: () => ({ networkId: SOLANA_NETWORK_ID }) }));
vi.mock("lib/wallets/solanaWalletSession", () => ({
  useSolanaWalletSession: () => ({ address: "owner", signTransaction: mocks.sign }),
}));
vi.mock("./sendOrderTransactions", () => ({
  prepareGmsolOrderTransactions: (...args: unknown[]) => mocks.prepare(...args),
  sendGmsolOrderTransactions: (...args: unknown[]) => mocks.send(...args),
}));
vi.mock("../useGmsolAccountData", () => ({ refreshGmsolAccountDataAfterTransaction: vi.fn() }));
vi.mock("domain/solana/useSolanaBalances", () => ({ getSolanaBalancesKey: vi.fn() }));
afterEach(cleanup);
it("does not sign or send a prepared order after its owning flow unmounts FESOL-56", async () => {
  let finishPreparation!: (value: unknown) => void;
  mocks.prepare.mockReturnValue(
    new Promise((resolve) => {
      finishPreparation = resolve;
    })
  );
  let state!: ReturnType<typeof useGmsolOrderTransactions>;
  function Probe() {
    state = useGmsolOrderTransactions();
    return null;
  }
  const view = render(
    <GmxSdkProvider>
      <Probe />
    </GmxSdkProvider>
  );
  const submit = state.submit;
  let pending!: ReturnType<typeof submit>;
  act(() => {
    pending = submit({ type: "create", orders: [], atomic: false });
  });
  const rejected = expect(pending).rejects.toThrow(/flow closed/);
  view.unmount();
  await act(async () => {
    finishPreparation({});
    await rejected;
  });
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.sign).not.toHaveBeenCalled();
  await expect(submit({ type: "create", orders: [], atomic: false })).rejects.toThrow(/flow is closed/);
});
