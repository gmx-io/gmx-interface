import { Menu } from "@headlessui/react";
import { FiChevronDown } from "react-icons/fi";
import "./AssetDropdown.css";
import coingeckoIcon from "../../img/ic_coingecko_16.svg";
import arbitrumIcon from "../../img/ic_arbitrum_16.svg";
import avalancheIcon from "../../img/ic_avalanche_16.svg";
import metamaskIcon from "../../img/ic_metamask_16.svg";
import {
  addTokenToMetamask,
  ICONLINKS,
  platformTokens,
} from "../../Helpers";

function AssetDropdown({ assetName, assetInfo, chainId, active }) {
  let { coingecko, arbitrum, avalanche } = ICONLINKS[chainId][assetName];

  return (
    <Menu>
      <Menu.Button as="div" className="dropdown-arrow">
        <FiChevronDown size={20} />
      </Menu.Button>
      <Menu.Items as="div" className="asset-menu-items">
        <Menu.Item>
          <>
            {coingecko && (
              <a
                href={coingecko}
                className="asset-item"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={coingeckoIcon} alt="Open in Coingecko" />
                <p>Open in Coingecko</p>
              </a>
            )}
          </>
        </Menu.Item>
        <Menu.Item>
          <>
            {arbitrum && (
              <a
                href={arbitrum}
                className="asset-item"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={arbitrumIcon} alt="Open in explorer" />
                <p>Open in Explorer</p>
              </a>
            )}
            {avalanche && (
              <a href={avalanche} className="asset-item">
                <img src={avalancheIcon} alt="Open in explorer" />
                <p>Open in Explorer</p>
              </a>
            )}
          </>
        </Menu.Item>
        <Menu.Item>
          <>
            {active && (
              <div
                onClick={() => {
                  let token = assetInfo
                    ? {...assetInfo, image: assetInfo.imageUrl}
                    : platformTokens[chainId][assetName];
                  addTokenToMetamask(token);
                }}
                className="asset-item"
              >
                <img src={metamaskIcon} alt="Add to Metamask" />
                <p>Add to Metamask</p>
              </div>
            )}
          </>
        </Menu.Item>
      </Menu.Items>
    </Menu>
  );
}

export default AssetDropdown;
