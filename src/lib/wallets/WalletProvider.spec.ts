import type { ConnectedWallet, User } from "@privy-io/react-auth";
import { describe, expect, it } from "vitest";

import { getActiveWalletForWagmi } from "./WalletProvider";

function mockWallet(address: string, connectedAt: number, linked: boolean) {
  return { address, connectedAt, linked } as ConnectedWallet;
}

describe("getActiveWalletForWagmi", () => {
  it("keeps Privy's most-recently connected wallet active", () => {
    const latestWallet = mockWallet("0x2", 200, false);
    const linkedWallet = mockWallet("0x1", 100, true);

    expect(getActiveWalletForWagmi({ wallets: [latestWallet, linkedWallet], user: {} as User })).toBe(latestWallet);
  });

  it("does not select a wallet when Privy has no connected wallets", () => {
    expect(getActiveWalletForWagmi({ wallets: [], user: {} as User })).toBeUndefined();
  });
});
