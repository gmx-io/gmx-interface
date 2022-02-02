import "./AddressDropdown.css";
import { Menu } from "@headlessui/react";
import { shortenAddress } from "../../Helpers";
import { useCopyToClipboard } from "react-use";
import externalLink from "../../img/ic_new_link_16.svg";
import copy from "../../img/ic_copy_16.svg";
import settings from "../../img/ic_settings_16.svg";
import disconnect from "../../img/ic_sign in_16.svg";
import { FaChevronDown } from "react-icons/fa";
import cx from "classnames";

function AddressDropdown({
  account,
  small,
  accountUrl,
  disconnectAccountAndCloseSettings,
  openSettings
}) {
  const [, copyToClipboard] = useCopyToClipboard();
  return (
    <Menu>
      {({ open }) => (
        <>
          <Menu.Button as="div">
            <button
              className={cx(
                "App-cta small transparent address-btn",
                open && "open"
              )}
            >
              <span>{shortenAddress(account, small ? 11 : 13)}</span>
              <FaChevronDown />
            </button>
          </Menu.Button>
          <Menu.Items as="div" className="menu-items">
            <Menu.Item>
              <div
                className="menu-item"
                onClick={() => copyToClipboard(account)}
              >
                <img src={copy} alt="Copy user address" />
                <p>Copy Address</p>
              </div>
            </Menu.Item>
            <Menu.Item>
              <a
                href={accountUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="menu-item"
              >
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
              <div
                className="menu-item"
                onClick={disconnectAccountAndCloseSettings}
              >
                <img src={disconnect} alt="Disconnect the wallet" />
                <p>Disconnect</p>
              </div>
            </Menu.Item>
          </Menu.Items>
        </>
      )}
    </Menu>
  );
}

export default AddressDropdown;
