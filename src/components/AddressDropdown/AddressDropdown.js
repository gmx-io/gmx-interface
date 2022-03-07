import "./AddressDropdown.css";
import { Menu } from "@headlessui/react";
import { helperToast, shortenAddress, useENS } from "../../Helpers";
import { useCopyToClipboard, createBreakpoint } from "react-use";
import externalLink from "../../img/ic_new_link_16.svg";
import copy from "../../img/ic_copy_16.svg";
import settings from "../../img/ic_settings_16.svg";
import disconnect from "../../img/ic_sign_out_16.svg";
import { FaChevronDown } from "react-icons/fa";
import Davatar from "@davatar/react";

function AddressDropdown({ account, accountUrl, disconnectAccountAndCloseSettings, openSettings }) {
  const useBreakpoint = createBreakpoint({ L: 600, M: 550, S: 400 });
  const breakpoint = useBreakpoint();
  const [, copyToClipboard] = useCopyToClipboard();
  const { ensName } = useENS(account);

  return (
    <Menu>
      <Menu.Button as="div">
        <button className="App-cta small transparent address-btn">
          <Davatar size={20} address={account} />
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
              <p>Copy Address</p>
            </div>
          </Menu.Item>
          <Menu.Item>
            <a href={accountUrl} target="_blank" rel="noopener noreferrer" className="menu-item">
              <img src={externalLink} alt="Open address in explorer" />
              <p>View in Explorer</p>
            </a>
          </Menu.Item>

          <Menu.Item>
            <div className="menu-item" onClick={openSettings}>
              <img src={settings} alt="Open settings" />
              <p>Settings</p>
            </div>
          </Menu.Item>
          <Menu.Item>
            <div className="menu-item" onClick={disconnectAccountAndCloseSettings}>
              <img src={disconnect} alt="Disconnect the wallet" />
              <p>Disconnect</p>
            </div>
          </Menu.Item>
        </Menu.Items>
      </div>
    </Menu>
  );
}

export default AddressDropdown;
