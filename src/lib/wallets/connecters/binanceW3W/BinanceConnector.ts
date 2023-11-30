import {
  Connector,
  Chain,
  UserRejectedRequestError,
  SwitchChainError,
  AddChainError,
  ProviderRpcError,
  ChainNotConfiguredError,
} from "wagmi";
import type WalletConnectProvider from "@binance/w3w-ethereum-provider";
import { getAddress, hexValue } from "ethers/lib/utils.js";
import { normalizeChainId } from "../helper";
import { providers } from "ethers";

type WalletConnectOptions = ConstructorParameters<typeof WalletConnectProvider>[0];

export class BinanceW3WConnector extends Connector<WalletConnectProvider, WalletConnectOptions> {
  readonly id = "BinanceW3W";
  readonly name = "BinanceW3W";
  readonly ready = true;

  #provider?: WalletConnectProvider;
  #chainId?: number;
  #lng?: string;

  constructor(config: { chains?: Chain[]; options: WalletConnectOptions }) {
    super(config);
  }

  async getProvider({ chainId, create }: { chainId?: number; create?: boolean } = {}) {
    if (!this.#provider || chainId || create) {
      const rpc = !this.options?.infuraId
        ? this.chains.reduce(
            (rpcProps, chain) => ({
              ...rpcProps,
              [chain.id]: chain.rpcUrls.default.http[0],
            }),
            {}
          )
        : {};

      const WalletConnectProvider = (await import("@binance/w3w-ethereum-provider")).default;
      this.#provider = new WalletConnectProvider({
        ...this.options,
        chainId,
        rpc: { ...rpc, ...this.options?.rpc },
      });
    }

    return this.#provider;
  }

  async connect({ chainId }: { chainId?: number } = {}) {
    try {
      const provider = await this.getProvider();
      provider.on("accountsChanged", this.onAccountsChanged);
      provider.on("chainChanged", this.onChainChanged);
      provider.on("disconnect", this.onDisconnect);

      this.emit("message", { type: "connecting" });

      const accounts = await provider.enable();
      const account = getAddress(accounts[0] as string);
      let id = await this.getChainId();
      let unsupported = this.isChainUnsupported(id);
      if (chainId && id !== chainId) {
        const chain = await this.switchChain(chainId);
        id = chain.id;
        unsupported = this.isChainUnsupported(id);
      }

      return {
        account,
        chain: { id, unsupported },
        provider,
      };
    } catch (error) {
      if (/(user closed modal|accounts received is empty)/i.test((error as ProviderRpcError).message))
        throw new UserRejectedRequestError(error);
      throw error;
    }
  }

  async switchChain(chainId: number) {
    const provider = await this.getProvider();
    const id = hexValue(chainId);

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: id }],
      });
      return (
        this.chains.find((x) => x.id === chainId) ?? {
          id: chainId,
          name: `Chain ${id}`,
          network: `${id}`,
          nativeCurrency: { name: "Ether", decimals: 18, symbol: "ETH" },
          rpcUrls: { default: { http: [""] }, public: { http: [""] } },
        }
      );
    } catch (error) {
      const chain = this.chains.find((x) => x.id === chainId);
      if (!chain) throw new ChainNotConfiguredError({ chainId, connectorId: this.id });

      // Indicates chain is not added to provider
      if ((error as ProviderRpcError).code === 4902) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: id,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: [chain.rpcUrls.public?.http[0] ?? ""],
                blockExplorerUrls: this.getBlockExplorerUrls(chain),
              },
            ],
          });
          return chain;
        } catch (addError) {
          if (this.#isUserRejectedRequestError(addError)) throw new UserRejectedRequestError(addError);
          throw new AddChainError();
        }
      }

      if (this.#isUserRejectedRequestError(error)) throw new UserRejectedRequestError(error);
      throw new SwitchChainError(error);
    }
  }

  async disconnect() {
    const provider = await this.getProvider();
    provider.disconnect();

    provider.removeListener("accountsChanged", this.onAccountsChanged);
    provider.removeListener("chainChanged", this.onChainChanged);
    provider.removeListener("disconnect", this.onDisconnect);

    typeof localStorage !== "undefined" && localStorage.removeItem("walletconnect");
  }

  async getAccount() {
    const provider = await this.getProvider();
    const accounts = provider.accounts;
    // return checksum address
    return getAddress(accounts[0]);
  }

  async getChainId() {
    const provider = await this.getProvider();
    const chainId = normalizeChainId(provider.chainId);
    return chainId;
  }

  async getSigner({ chainId }: { chainId?: number } = {}) {
    const [provider, account] = await Promise.all([this.getProvider(), this.getAccount()]);
    return new providers.Web3Provider(provider as providers.ExternalProvider, chainId).getSigner(account);
  }

  async isAuthorized() {
    try {
      const account = await this.getAccount();
      return !!account;
    } catch {
      return false;
    }
  }

  protected onAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) this.emit("disconnect");
    else this.emit("change", { account: getAddress(accounts[0]) });
  };

  protected onChainChanged = (chainId: number | string) => {
    const id = normalizeChainId(chainId);
    const unsupported = this.isChainUnsupported(id);
    this.emit("change", { chain: { id, unsupported } });
  };

  protected onDisconnect = () => {
    this.emit("disconnect");
  };

  #isUserRejectedRequestError(error: unknown) {
    return /(user rejected)/i.test((error as Error).message);
  }
}
