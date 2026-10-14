import { expect, type BrowserContext, type Page } from "@playwright/test";

export type WalletRequest = { method: string; params?: unknown[] };
export type WalletHandler = (request: WalletRequest, chainId: number) => Promise<unknown>;

export async function connectInjectedWallet(page: Page, address: string) {
  // Opening Privy also starts an iframe navigation; wait for wallet UI instead.
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .first()
    .click({ timeout: 45_000, noWaitAfter: true });
  const dialog = page.getByRole("dialog").filter({ has: page.getByRole("button", { name: /MetaMask/i }) });
  await expect(dialog.getByRole("button", { name: /MetaMask/i }).first()).toBeVisible({ timeout: 45_000 });
  await expect(dialog).not.toHaveAttribute("data-transition", /.*/);
  await dialog
    .getByRole("button", { name: /MetaMask/i })
    .first()
    .click({ timeout: 45_000, noWaitAfter: true });
  await expect(page.getByTestId("user-address")).toContainText(
    new RegExp(`${address.slice(0, 6)}.*${address.slice(-4)}`),
    { timeout: 45_000 }
  );
}

export async function installInjectedWallet(
  context: BrowserContext,
  options: {
    address: string;
    chainId: number;
    request: WalletHandler;
    allowedOrigin?: string;
    // Throw to reject a chain switch, as a user declining the wallet prompt would.
    onSwitchChain?: (chainId: number) => void;
  }
) {
  let chainId = options.chainId;
  let connected = false;
  const requests: string[] = [];
  const permissions = [{ parentCapability: "eth_accounts" }];
  const handleRequest = async (request: WalletRequest) => {
    switch (request.method) {
      case "eth_chainId":
        return `0x${chainId.toString(16)}`;
      case "net_version":
        return String(chainId);
      case "eth_accounts":
        return connected ? [options.address] : [];
      case "eth_requestAccounts":
      case "wallet_requestPermissions":
        connected = true;
        return request.method === "eth_requestAccounts" ? [options.address] : permissions;
      case "wallet_getPermissions":
        return connected ? permissions : [];
      case "wallet_revokePermissions":
        connected = false;
        return null;
      case "wallet_switchEthereumChain": {
        const nextChainId = Number((request.params?.[0] as { chainId: string }).chainId);
        options.onSwitchChain?.(nextChainId);
        chainId = nextChainId;
        return null;
      }
      case "wallet_addEthereumChain":
        return null;
      // a wallet without EIP-5792, which the app reports as "unsupported" in its capabilities metric
      case "wallet_getCapabilities":
        throw Object.assign(new Error("Method not supported: wallet_getCapabilities"), { code: 4200 });
      default:
        return options.request(request, chainId);
    }
  };
  // Route every request through the runner, as an extension would through its transport.
  await context.exposeBinding("__regressionWalletRequest", async (source, request: WalletRequest) => {
    if (
      options.allowedOrigin &&
      (source.frame !== source.page.mainFrame() || new URL(source.frame.url()).origin !== options.allowedOrigin)
    ) {
      return { error: { code: 4100, message: "Wallet access is restricted to the selected deployment" } };
    }
    if (requests.length < 100) requests.push(request.method);
    try {
      return { result: await handleRequest(request), chainId, connected };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: (error as { code?: number }).code ?? -32603,
        },
      };
    }
  });

  await context.addInitScript(
    ({ address, initialChainId }) => {
      if (window.top !== window || !/^https?:$/.test(location.protocol)) return;
      let chainId = Number(sessionStorage.getItem("regression-wallet-chain") || initialChainId);
      let connected = sessionStorage.getItem("regression-wallet-connected") === "true";
      const listeners = new Map<string, Set<(value: unknown) => void>>();
      const emit = (event: string, value: unknown) => listeners.get(event)?.forEach((listener) => listener(value));
      const provider = {
        isMetaMask: true,
        isConnected: () => true,
        get chainId() {
          return `0x${chainId.toString(16)}`;
        },
        get selectedAddress() {
          return connected ? address : null;
        },
        on(event: string, listener: (value: unknown) => void) {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event)!.add(listener);
          return provider;
        },
        removeListener(event: string, listener: (value: unknown) => void) {
          listeners.get(event)?.delete(listener);
          return provider;
        },
        async request({ method, params = [] }: { method: string; params?: unknown[] }): Promise<unknown> {
          const bridge = (
            window as unknown as {
              __regressionWalletRequest: (request: WalletRequest) => Promise<{
                result?: unknown;
                chainId: number;
                connected: boolean;
                error?: { code: number; message: string };
              }>;
            }
          ).__regressionWalletRequest;
          const response = await bridge({ method, params });
          if (response.error) throw Object.assign(new Error(response.error.message), { code: response.error.code });
          if (connected !== response.connected) {
            connected = response.connected;
            sessionStorage.setItem("regression-wallet-connected", String(connected));
            emit("accountsChanged", connected ? [address] : []);
          }
          if (chainId !== response.chainId) {
            chainId = response.chainId;
            sessionStorage.setItem("regression-wallet-chain", String(chainId));
            emit("chainChanged", provider.chainId);
          }
          return response.result;
        },
      };
      Object.defineProperty(window, "ethereum", { value: provider, configurable: true });
      const announce = () =>
        window.dispatchEvent(
          new CustomEvent("eip6963:announceProvider", {
            detail: {
              info: {
                uuid: "e873935f-e541-4a5a-92b9-3b33a49c4414",
                name: "MetaMask",
                rdns: "io.metamask",
                icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect width='32' height='32' fill='orange'/></svg>",
              },
              provider,
            },
          })
        );
      window.addEventListener("eip6963:requestProvider", announce);
      announce();
      window.dispatchEvent(new Event("ethereum#initialized"));
    },
    { address: options.address, initialChainId: options.chainId }
  );
  return { getState: () => ({ chainId, connected, requests }) };
}
