import { useEffect, useState } from "react";
import { Connector } from "@wagmi/connectors";
import { switchNetwork as switchNetworkWagmi } from "@wagmi/core";
import { InjectedConnector } from "@web3-react/injected-connector";
import {
  ARBITRUM,
  ARBITRUM_TESTNET,
  AVALANCHE,
  AVALANCHE_FUJI,
  DEFAULT_CHAIN_ID,
  getChainName,
  getRpcUrl,
  MAINNET,
  NETWORK_METADATA,
  SUPPORTED_CHAIN_IDS,
} from "config/chains";
import { UnsupportedChainIdError, useWeb3React } from "@web3-react/core";
import {
  CURRENT_PROVIDER_LOCALSTORAGE_KEY,
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY,
  WALLET_CONNECT_LOCALSTORAGE_KEY,
  WALLET_LINK_LOCALSTORAGE_PREFIX,
} from "config/localStorage";
import {
  UserRejectedRequestError as UserRejectedRequestErrorWalletConnect,
  WalletConnectConnector,
} from "@web3-react/walletconnect-connector";
import { helperToast } from "../helperToast";
import { t, Trans } from "@lingui/macro";

import { Web3ReactManagerFunctions } from "@web3-react/core/dist/types";

export type NetworkMetadata = {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
};

const injectedConnector = new InjectedConnector({
  supportedChainIds: SUPPORTED_CHAIN_IDS,
});

export function hasMetaMaskWalletExtension() {
  return window.ethereum;
}

export function hasCoinBaseWalletExtension() {
  const { ethereum } = window;

  if (!ethereum?.providers && !ethereum?.isCoinbaseWallet) {
    return false;
  }

  // return window.ethereum.isCoinbaseWallet || ethereum.providers.find(({ isCoinbaseWallet }) => isCoinbaseWallet);
}

export function activateInjectedProvider(providerName: string) {
  const { ethereum } = window;

  if (!ethereum?.providers && !ethereum?.isCoinbaseWallet && !ethereum?.isMetaMask) {
    return undefined;
  }

  let provider;
  if (ethereum?.providers) {
    switch (providerName) {
      case "CoinBase":
        provider = ethereum.providers.find(({ isCoinbaseWallet }) => isCoinbaseWallet);
        break;
      case "MetaMask":
      default:
        provider = ethereum.providers.find(({ isMetaMask }) => isMetaMask);
        break;
    }
  }

  if (provider) {
    // ethereum?.setSelectedProvider?.(provider);
  }
}

export function getInjectedConnector() {
  return injectedConnector;
}

export const getWalletConnectConnector = () => {
  const chainId = Number(localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY)) || DEFAULT_CHAIN_ID;

  return new WalletConnectConnector({
    rpc: {
      [AVALANCHE]: getRpcUrl(AVALANCHE)!,
      [ARBITRUM]: getRpcUrl(ARBITRUM)!,
      [ARBITRUM_TESTNET]: getRpcUrl(ARBITRUM_TESTNET)!,
      [AVALANCHE_FUJI]: getRpcUrl(AVALANCHE_FUJI)!,
    },
    qrcode: true,
    chainId,
  });
};

export function clearWalletConnectData() {
  localStorage.removeItem(WALLET_CONNECT_LOCALSTORAGE_KEY);
}

export function clearWalletLinkData() {
  Object.entries(localStorage)
    .map((x) => x[0])
    .filter((x) => x.startsWith(WALLET_LINK_LOCALSTORAGE_PREFIX))
    .map((x) => localStorage.removeItem(x));
}

export function useEagerConnect(setActivatingConnector: (connector: any) => void) {
  const { activate, active } = useWeb3React();
  const [tried, setTried] = useState(false);

  useEffect(() => {
    (async function () {
      if (Boolean(localStorage.getItem(SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY)) !== true) {
        // only works with WalletConnect
        clearWalletConnectData();
        // force clear localStorage connection for MM/CB Wallet (Brave legacy)
        clearWalletLinkData();
        return;
      }

      let shouldTryWalletConnect = false;
      try {
        // naive validation to not trigger Wallet Connect if data is corrupted
        const rawData = localStorage.getItem(WALLET_CONNECT_LOCALSTORAGE_KEY);
        if (rawData) {
          const data = JSON.parse(rawData);
          if (data && data.connected) {
            shouldTryWalletConnect = true;
          }
        }
      } catch (ex) {
        if (ex instanceof SyntaxError) {
          // rawData is not a valid json
          clearWalletConnectData();
        }
      }

      if (shouldTryWalletConnect) {
        try {
          const connector = getWalletConnectConnector();
          setActivatingConnector(connector);
          await activate(connector, undefined, true);
          // in case Wallet Connect is activated no need to check injected wallet
          return;
        } catch (ex) {
          // assume data in localstorage is corrupted and delete it to not retry on next page load
          clearWalletConnectData();
        }
      }

      try {
        const connector = getInjectedConnector();
        const currentProviderName = localStorage.getItem(CURRENT_PROVIDER_LOCALSTORAGE_KEY) ?? false;
        if (currentProviderName !== false) {
          activateInjectedProvider(currentProviderName);
        }
        const authorized = await connector.isAuthorized();
        if (authorized) {
          setActivatingConnector(connector);
          await activate(connector, undefined, true);
        }
      } catch (ex) {}

      setTried(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only running on mount (make sure it's only mounted once :))

  // if the connection worked, wait until we get confirmation of that to flip the flag
  useEffect(() => {
    if (!tried && active) {
      setTried(true);
    }
  }, [tried, active]);

  return tried;
}

export function useInactiveListener(suppress = false) {
  const injected = getInjectedConnector();
  const { active, error, activate } = useWeb3React();

  useEffect(() => {
    const { ethereum } = window;
    if (ethereum && ethereum.on && !active && !error && !suppress) {
      const handleConnect = () => {
        activate(injected);
      };
      const handleChainChanged = (chainId) => {
        activate(injected);
      };
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          activate(injected);
        }
      };
      const handleNetworkChanged = (networkId) => {
        activate(injected);
      };

      ethereum.on("connect", handleConnect);
      ethereum.on("chainChanged", handleChainChanged);
      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("networkChanged", handleNetworkChanged);

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener("connect", handleConnect);
          ethereum.removeListener("chainChanged", handleChainChanged);
          ethereum.removeListener("accountsChanged", handleAccountsChanged);
          ethereum.removeListener("networkChanged", handleNetworkChanged);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, error, suppress, activate]);
}

export const addBscNetwork = async () => {
  return addNetwork(NETWORK_METADATA[MAINNET]);
};

export const addNetwork = async (metadata: NetworkMetadata) => {
  // await window.ethereum.request({ method: "wallet_addEthereumChain", params: [metadata] }).catch();
};

export const switchNetwork = async (chainId: number, active?: boolean) => {
  if (!active) {
    // chainId in localStorage allows to switch network even if wallet is not connected
    // or there is no wallet at all
    localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(chainId));
    document.location.reload();
    return;
  }

  try {
    await switchNetworkWagmi({ chainId });
    helperToast.success(t`Connected to ${getChainName(chainId)}`);
    return getChainName(chainId);
  } catch (ex) {
    helperToast.error(t`Connection to ${getChainName(chainId)} failed!`);
    // eslint-disable-next-line no-console
    console.error("error", ex);
  }
};

export const getWalletConnectHandler = (
  activate: Web3ReactManagerFunctions["activate"],
  deactivate: Web3ReactManagerFunctions["deactivate"],
  setActivatingConnector: (connector?: WalletConnectConnector) => void
) => {
  const fn = async () => {
    const walletConnect = getWalletConnectConnector();
    setActivatingConnector(walletConnect);
    activate(walletConnect, (ex) => {
      if (ex instanceof UnsupportedChainIdError) {
        helperToast.error(t`Unsupported chain. Switch to Arbitrum network on your wallet and try again`);
        // eslint-disable-next-line no-console
        console.warn(ex);
      } else if (!(ex instanceof UserRejectedRequestErrorWalletConnect)) {
        helperToast.error(ex.message);
        // eslint-disable-next-line no-console
        console.warn(ex);
      }
      clearWalletConnectData();
      deactivate();
    });
  };
  return fn;
};

export const getInjectedHandler = (
  activate: Web3ReactManagerFunctions["activate"],
  deactivate: Web3ReactManagerFunctions["deactivate"]
) => {
  const fn = async () => {
    activate(getInjectedConnector(), (e) => {
      if (e instanceof UnsupportedChainIdError) {
        showUnsupportedNetworkToast();

        deactivate();

        return;
      }

      const errString = e.message ?? e.toString();
      helperToast.error(errString);
    });
  };
  return fn;
};

export async function addTokenToMetamask(
  token: {
    address: string;
    symbol: string;
    decimals?: number;
    imageUrl?: string;
  },
  connector?: Connector
) {
  try {
    const wasAdded = await connector?.watchAsset?.({
      address: token.address,
      symbol: token.symbol,
      decimals: token.decimals,
      image: token.imageUrl,
    });

    if (wasAdded) {
      // https://github.com/MetaMask/metamask-extension/issues/11377
      helperToast.success(t`${token.symbol} is added to the wallet!`);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
}

export function showUnsupportedNetworkToast() {
  const chainId = Number(localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY)) || DEFAULT_CHAIN_ID;

  helperToast.error(
    <div>
      <Trans>
        <div>Your wallet is not connected to {getChainName(chainId)}.</div>
        <br />
        <div className="clickable underline" onClick={() => switchNetwork(chainId, true)}>
          Switch to {getChainName(chainId)}
        </div>
      </Trans>
    </div>
  );
}

export function useHandleUnsupportedNetwork() {
  const { error, deactivate } = useWeb3React();

  useEffect(() => {
    if (error instanceof UnsupportedChainIdError) {
      showUnsupportedNetworkToast();

      deactivate();
    }
  }, [error, deactivate]);
}
