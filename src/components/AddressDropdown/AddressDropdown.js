import "./AddressDropdown.css";
import { Menu } from "@headlessui/react";
import { shortenAddress } from "../../Helpers";
import { FiCopy, FiExternalLink } from "react-icons/fi";
import { BiLogIn } from "react-icons/bi";
import { useCopyToClipboard } from "react-use";

function AddressDropdown({
  account,
  small,
  accountUrl,
  disconnectAccountAndCloseSettings
}) {
  const [, copyToClipboard] = useCopyToClipboard();
  return (
    <Menu>
      <Menu.Button as="div">
        <p className="App-cta small transparent App-header-user-account">
          {shortenAddress(account, small ? 11 : 13)}
        </p>
      </Menu.Button>
      <Menu.Items as="div" className="menu-items">
        <Menu.Item>
          <div className="menu-item" onClick={() => copyToClipboard(account)}>
            <FiCopy fontSize={16} />
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
            <FiExternalLink fontSize={16} />
            <p>View in Explorer</p>
          </a>
        </Menu.Item>

        <Menu.Item>
          <div
            className="menu-item"
            onClick={disconnectAccountAndCloseSettings}
          >
            <BiLogIn fontSize={16} />
            <p>Disconnect</p>
          </div>
        </Menu.Item>
      </Menu.Items>
    </Menu>
  );
}

export default AddressDropdown;
