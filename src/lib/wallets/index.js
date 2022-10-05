import { InjectedConnector } from "@web3-react/injected-connector";
import {
  ARBITRUM,
  ARBITRUM_RPC_PROVIDERS,
  ARBITRUM_TESTNET,
  AVALANCHE,
  AVALANCHE_RPC_PROVIDERS,
  DEFAULT_CHAIN_ID,
  getChainName,
  MAINNET,
  NETWORK_METADATA,
  SUPPORTED_CHAIN_IDS,
} from "config/chains";
import { UnsupportedChainIdError, useWeb3React } from "@web3-react/core";
import React, { useEffect, useState } from "react";
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

  return window.ethereum.isCoinbaseWallet || ethereum.providers.find(({ isCoinbaseWallet }) => isCoinbaseWallet);
}

export function activateInjectedProvider(providerName) {
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
    ethereum.setSelectedProvider(provider);
  }
}

export function getInjectedConnector() {
  return injectedConnector;
}

export const getWalletConnectConnector = () => {
  const chainId = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY) || DEFAULT_CHAIN_ID;
  return new WalletConnectConnector({
    rpc: {
      [AVALANCHE]: AVALANCHE_RPC_PROVIDERS[0],
      [ARBITRUM]: ARBITRUM_RPC_PROVIDERS[0],
      [ARBITRUM_TESTNET]: "https://rinkeby.arbitrum.io/rpc",
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

export function useEagerConnect(setActivatingConnector) {
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

export const addNetwork = async (metadata) => {
  await window.ethereum.request({ method: "wallet_addEthereumChain", params: [metadata] }).catch();
};

export const switchNetwork = async (chainId, active) => {
  if (!active) {
    // chainId in localStorage allows to switch network even if wallet is not connected
    // or there is no wallet at all
    localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, chainId);
    document.location.reload();
    return;
  }

  try {
    const chainIdHex = "0x" + chainId.toString(16);
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    helperToast.success("Connected to " + getChainName(chainId));
    return getChainName(chainId);
  } catch (ex) {
    // https://docs.metamask.io/guide/rpc-api.html#other-rpc-methods
    // This error code indicates that the chain has not been added to MetaMask.
    // 4001 error means user has denied the request
    // If the error code is not 4001, then we need to add the network
    if (ex.code !== 4001) {
      return await addNetwork(NETWORK_METADATA[chainId]);
    }

    console.error("error", ex);
  }
};

export const getWalletConnectHandler = (activate, deactivate, setActivatingConnector) => {
  const fn = async () => {
    const walletConnect = getWalletConnectConnector();
    setActivatingConnector(walletConnect);
    activate(walletConnect, (ex) => {
      if (ex instanceof UnsupportedChainIdError) {
        helperToast.error("Unsupported chain. Switch to Arbitrum network on your wallet and try again");
        console.warn(ex);
      } else if (!(ex instanceof UserRejectedRequestErrorWalletConnect)) {
        helperToast.error(ex.message);
        console.warn(ex);
      }
      clearWalletConnectData();
      deactivate();
    });
  };
  return fn;
};

export const getInjectedHandler = (activate) => {
  const fn = async () => {
    activate(getInjectedConnector(), (e) => {
      const chainId = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY) || DEFAULT_CHAIN_ID;

      if (e instanceof UnsupportedChainIdError) {
        helperToast.error(
          <div>
            <div>Your wallet is not connected to {getChainName(chainId)}.</div>
            <br />
            <div className="clickable underline margin-bottom" onClick={() => switchNetwork(chainId, true)}>
              Switch to {getChainName(chainId)}
            </div>
            <div className="clickable underline" onClick={() => switchNetwork(chainId, true)}>
              Add {getChainName(chainId)}
            </div>
          </div>
        );
        return;
      }
      const errString = e.message ?? e.toString();
      helperToast.error(errString);
    });
  };
  return fn;
};

export async function addTokenToMetamask(token) {
  try {
    const wasAdded = await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: token.address,
          symbol: token.symbol,
          decimals: token.decimals,
          image: token.imageUrl,
        },
      },
    });
    if (wasAdded) {
      // https://github.com/MetaMask/metamask-extension/issues/11377
      // We can show a toast message when the token is added to metamask but because of the bug we can't. Once the bug is fixed we can show a toast message.
    }
  } catch (error) {
    console.error(error);
  }
}
