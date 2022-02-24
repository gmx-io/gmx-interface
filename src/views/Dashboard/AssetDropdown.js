import { Menu } from "@headlessui/react";
import { FiChevronDown } from "react-icons/fi";
import "./AssetDropdown.css";
import coingecko from "../../img/ic_coingecko_16.svg";
import arbitrum from "../../img/ic_arbitrum_16.svg";
import metamask from "../../img/ic_metamask_16.svg";

function AssetDropdown() {
  return (
    <Menu>
      <Menu.Button as="div" className="dropdown-arrow">
        <FiChevronDown size={20} />
      </Menu.Button>
      <Menu.Items as="div" className="asset-menu-items">
        <Menu.Item>
          <div className="asset-item">
            <img src={coingecko} alt="" />
            <p>Open in Coingecko</p>
          </div>
        </Menu.Item>
        <Menu.Item>
          <div className="asset-item">
            <img src={arbitrum} alt="" />
            <p>Open in explorer</p>
          </div>
        </Menu.Item>
        <Menu.Item>
          <div className="asset-item">
            <img src={metamask} alt="" />
            <p>Add to Metamask</p>
          </div>
        </Menu.Item>
      </Menu.Items>
    </Menu>
  );
}

export default AssetDropdown;
