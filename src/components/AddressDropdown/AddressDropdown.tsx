import Davatar from "@davatar/react";
import { Menu } from "@headlessui/react";
import { t, Trans } from "@lingui/macro";
import { ETH_MAINNET } from "config/chains";
import copy from "img/ic_copy_16.svg";
import externalLink from "img/ic_new_link_16.svg";
import disconnect from "img/ic_sign_out_16.svg";
import { helperToast } from "lib/helperToast";
import { shortenAddress, useENS } from "lib/legacy";
import { useJsonRpcProvider } from "lib/rpc";
import { FaChevronDown } from "react-icons/fa";
import { createBreakpoint, useCopyToClipboard } from "react-use";
import "./AddressDropdown.css";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { useEnsName } from "wagmi";

type Props = {
  account: string;
  accountUrl: string;
  disconnectAccountAndCloseSettings: () => void;
};

function AddressDropdown({ account, accountUrl, disconnectAccountAndCloseSettings }: Props) {
  const useBreakpoint = createBreakpoint({ L: 600, M: 550, S: 400 });
  const breakpoint = useBreakpoint();
  const [, copyToClipboard] = useCopyToClipboard();
  // const { ensName } = useENS(account);
  const ensName = useEnsName({
    address: "0x6a928643e35e254fcc6927c689694897712d3827",
    chainId: 1,
  });
  console.log(ensName);
  const { provider: ethereumProvider } = useJsonRpcProvider(ETH_MAINNET);

  return (
    <Menu>
      <Menu.Button as="div">
        <button className="App-cta small transparent address-btn">
          <div className="user-avatar">
            {ethereumProvider && <Davatar size={20} address={account} provider={ethereumProvider} />}
          </div>
          <span className="user-address">{shortenAddress(account, breakpoint === "S" ? 9 : 13)}</span>
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
                helperToast.success(t`Address copied to your clipboard`);
              }}
            >
              <img src={copy} alt="Copy user address" />
              <p>
                <Trans>Copy Address</Trans>
              </p>
            </div>
          </Menu.Item>
          <Menu.Item>
            <ExternalLink href={accountUrl} className="menu-item">
              <img src={externalLink} alt="Open address in explorer" />
              <p>
                <Trans>View in Explorer</Trans>
              </p>
            </ExternalLink>
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
