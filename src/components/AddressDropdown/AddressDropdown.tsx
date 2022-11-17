import "./AddressDropdown.css";
import { Menu } from "@headlessui/react";
import { Trans } from "@lingui/macro";
import { shortenAddress, useENS } from "lib/legacy";
import { useCopyToClipboard, createBreakpoint } from "react-use";
import externalLink from "img/ic_new_link_16.svg";
import copy from "img/ic_copy_16.svg";
import disconnect from "img/ic_sign_out_16.svg";
import { FaChevronDown } from "react-icons/fa";
import Davatar from "@davatar/react";
import { helperToast } from "lib/helperToast";
import { ethers } from "ethers";
import { ETH_MAINNET, getRpcUrl } from "config/chains";
import { useEffect, useState } from "react";
import { StaticJsonRpcProvider } from "@ethersproject/providers";

type Props = {
  account: string;
  accountUrl: string;
  disconnectAccountAndCloseSettings: () => void;
};

function AddressDropdown({ account, accountUrl, disconnectAccountAndCloseSettings }: Props) {
  const useBreakpoint = createBreakpoint({ L: 600, M: 550, S: 400 });
  const [ethProvider, setEthProvider] = useState<StaticJsonRpcProvider>();
  const breakpoint = useBreakpoint();
  const [, copyToClipboard] = useCopyToClipboard();
  const { ensName } = useENS(account);

  useEffect(() => {
    async function initializeProvider() {
      const provider = new ethers.providers.StaticJsonRpcProvider(getRpcUrl(ETH_MAINNET));

      await provider.ready;

      setEthProvider(provider);
    }

    initializeProvider();
  }, []);

  return (
    <Menu>
      <Menu.Button as="div">
        <button className="App-cta small transparent address-btn">
          <div className="user-avatar">
            {ethProvider && <Davatar size={20} address={account} provider={ethProvider} />}
          </div>
          <span className="user-address">{ensName || shortenAddress(account, breakpoint === "S" ? 9 : 13)}</span>
          <FaChevronDown />
        </button>
      </Menu.Button>
      <div>
        <Menu.Items as="div" className="menu-items">
          <Menu.Item>
            <div
              className="menu-item"
              onClick={() => {
                copyToClipboard(account);
                helperToast.success("Address copied to your clipboard");
              }}
            >
              <img src={copy} alt="Copy user address" />
              <p>
                <Trans>Copy Address</Trans>
              </p>
            </div>
          </Menu.Item>
          <Menu.Item>
            <a href={accountUrl} target="_blank" rel="noopener noreferrer" className="menu-item">
              <img src={externalLink} alt="Open address in explorer" />
              <p>
                <Trans>View in Explorer</Trans>
              </p>
            </a>
          </Menu.Item>
          <Menu.Item>
            <div className="menu-item" onClick={disconnectAccountAndCloseSettings}>
              <img src={disconnect} alt="Disconnect the wallet" />
              <p>
                <Trans>Disconnect</Trans>
              </p>
            </div>
          </Menu.Item>
        </Menu.Items>
      </div>
    </Menu>
  );
}

export default AddressDropdown;
