import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import SolanaWalletSessionSync from "./SolanaWalletSessionSync";

const state = vi.hoisted(() => ({ wallets: [], standardWallets: [], sign: vi.fn() }));
vi.mock("@privy-io/react-auth/solana", () => ({
  useWallets: () => ({ wallets: state.wallets, ready: true }),
  useStandardWallets: () => ({ wallets: state.standardWallets, ready: true }),
  useSignTransaction: () => ({ signTransaction: (...args: unknown[]) => state.sign(...args) }),
}));
afterEach(cleanup);
it("does not republish the session when Privy recreates its signing callback FESOL-56", () => {
  const onChange = vi.fn();
  const view = render(<SolanaWalletSessionSync walletId={undefined} onChange={onChange} />);
  expect(onChange).toHaveBeenCalledTimes(1);
  view.rerender(<SolanaWalletSessionSync walletId={undefined} onChange={onChange} />);
  expect(onChange).toHaveBeenCalledTimes(1);
});
