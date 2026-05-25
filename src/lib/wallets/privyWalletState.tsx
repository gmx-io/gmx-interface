import type { ConnectedWallet, User } from "@privy-io/react-auth";
import { createContext, useContext } from "react";

export type PrivyWalletState = {
  ready: boolean;
  user: User | null;
  wallets: ConnectedWallet[];
  logout: (() => Promise<void>) | undefined;
};

export const defaultPrivyWalletState: PrivyWalletState = {
  ready: false,
  user: null,
  wallets: [],
  logout: undefined,
};

export const PrivyWalletStateContext = createContext<PrivyWalletState>(defaultPrivyWalletState);

export function usePrivyWalletState() {
  return useContext(PrivyWalletStateContext);
}
