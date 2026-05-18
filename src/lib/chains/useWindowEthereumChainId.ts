import { useSyncExternalStore } from "react";

function readInjectedChainId(): number | undefined {
  const hex = window.ethereum?.chainId;
  if (hex == null || hex === "") {
    return undefined;
  }
  return parseInt(hex, 16);
}

function subscribeInjectedChainId(onStoreChange: () => void): () => void {
  const ethereum = window.ethereum;
  if (!ethereum?.on) {
    return () => undefined;
  }

  const onChange = () => {
    onStoreChange();
  };

  ethereum.on("chainChanged", onChange);
  ethereum.on("connect", onChange);

  return () => {
    ethereum.removeListener("chainChanged", onChange);
    ethereum.removeListener("connect", onChange);
  };
}

/**
 * Live chain id from `window.ethereum` (EIP-1193 `chainId`), via `useSyncExternalStore`.
 * Updates on `chainChanged` and `connect`. Undefined when no injected provider or no `chainId` yet.
 */
export function useWindowEthereumChainId(): number | undefined {
  return useSyncExternalStore(subscribeInjectedChainId, readInjectedChainId, () => undefined);
}
