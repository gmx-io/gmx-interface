import { getIsSolanaNetworkSelected } from "config/solanaNetwork";
import type { SolanaWalletSession } from "lib/wallets/solanaWalletSession";

type PublishedWallet = Pick<SolanaWalletSession, "address" | "signTransaction">;

export type ActiveSolanaSession = { readonly owner: string };

let wallet: PublishedWallet | undefined;
let isSolanaSelected = false;
let session: ActiveSolanaSession | undefined;
const listeners = new Set<() => void>();

// A new object on every owner or network change, so a flow holding the old one also notices a switch and back.
function renew() {
  isSolanaSelected = getIsSolanaNetworkSelected();
  session = wallet?.address && isSolanaSelected ? { owner: wallet.address } : undefined;
  listeners.forEach((listener) => listener());
}

document.addEventListener("networkChange", () => {
  if (getIsSolanaNetworkSelected() !== isSolanaSelected) renew();
});

export function publishSolanaWalletSession(next: PublishedWallet | undefined) {
  const isOwnerChanged = next?.address !== wallet?.address;
  wallet = next;
  if (isOwnerChanged) renew();
}

// Order sends and tracking read it at every step: unlike React state, it outlives a remount or a route change.
export function getActiveSolanaSession() {
  return getIsSolanaNetworkSelected() ? session : undefined;
}

export function getActiveSolanaSigner() {
  return wallet?.signTransaction;
}

export function subscribeActiveSolanaSession(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
