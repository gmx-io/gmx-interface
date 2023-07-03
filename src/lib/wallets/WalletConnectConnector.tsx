import { AbstractConnector } from "@web3-react/abstract-connector";
import { ConnectorUpdate } from "@web3-react/types";
import {
  EthereumProvider,
  EthereumProviderOptions,
} from "@walletconnect/ethereum-provider/dist/types/EthereumProvider";

export const URI_AVAILABLE = "URI_AVAILABLE";

export class UserRejectedRequestError extends Error {
  public constructor() {
    super();
    this.name = this.constructor.name;
    this.message = "The user rejected the request!";
  }
}

export class WalletConnectConnector extends AbstractConnector {
  private readonly config: EthereumProviderOptions;

  public walletConnectProvider?: EthereumProvider;

  constructor({
    projectId,
    showQrModal,
    chainId,
    supportedChainIds,
    rpcMap,
  }: {
    projectId: string;
    showQrModal: boolean;
    chainId: number;
    supportedChainIds: number[];
    rpcMap: { [networkId: number]: string };
  }) {
    super();

    this.config = {
      chains: [chainId],
      optionalChains: supportedChainIds.filter((id) => id !== chainId),
      rpcMap,
      projectId,
      showQrModal,
      qrModalOptions: {
        enableExplorer: true,
        themeMode: "dark",
        themeVariables: {
          "--wcm-font-family": '"Relative",sans-serif',
          "--wcm-z-index": "1100",
        },
      },
    };

    this.handleChainChanged = this.handleChainChanged.bind(this);
    this.handleAccountsChanged = this.handleAccountsChanged.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
  }

  private handleChainChanged(chainId: number | string): void {
    this.emitUpdate({ chainId });
  }

  private handleAccountsChanged(accounts: string[]): void {
    this.emitUpdate({ account: accounts[0] });
  }

  private handleDisconnect(): void {
    this.emitDeactivate();
  }

  private handleDisplayURI = (uri: string): void => {
    this.emit(URI_AVAILABLE, uri);
  };

  public async activate(): Promise<ConnectorUpdate> {
    if (!this.walletConnectProvider) {
      const WalletConnectProvider = await import("@walletconnect/ethereum-provider").then((m) => m?.default ?? m);
      this.walletConnectProvider = await WalletConnectProvider.init(this.config);
    }

    this.walletConnectProvider.on("chainChanged", this.handleChainChanged);
    this.walletConnectProvider.on("accountsChanged", this.handleAccountsChanged);
    this.walletConnectProvider.on("disconnect", this.handleDisconnect);
    this.walletConnectProvider.on("display_uri", this.handleDisplayURI);
    try {
      // If there is an active session, disconnect the current session.
      if (this.walletConnectProvider.session) await this.walletConnectProvider.disconnect();

      const accounts = await this.walletConnectProvider.enable();
      const defaultAccount = accounts[0];
      const chainId = await this.getChainId();
      return { provider: this.walletConnectProvider, account: defaultAccount, chainId };
    } catch (error) {
      if (/request reset/i.test(error.message)) {
        throw new UserRejectedRequestError();
      }
      throw error;
    }
  }

  async getProvider(): Promise<typeof this.walletConnectProvider> {
    return this.walletConnectProvider;
  }

  async getChainId(): Promise<number | string> {
    return Promise.resolve(this.walletConnectProvider!.chainId);
  }

  async getAccount(): Promise<null | string> {
    return Promise.resolve(this.walletConnectProvider!.accounts).then((accounts: string[]): string => accounts[0]);
  }

  async deactivate() {
    if (!this.walletConnectProvider) return;
    try {
      this.walletConnectProvider.disconnect();
    } catch (error) {
      if (!/No matching key/i.test((error as Error).message)) throw error;
    } finally {
      this.walletConnectProvider.removeListener("disconnect", this.handleDisconnect);
      this.walletConnectProvider.removeListener("chainChanged", this.handleChainChanged);
      this.walletConnectProvider.removeListener("accountsChanged", this.handleAccountsChanged);
      this.walletConnectProvider.removeListener("display_uri", this.handleDisplayURI);
    }
  }

  async close() {
    this.emitDeactivate();
  }
}
