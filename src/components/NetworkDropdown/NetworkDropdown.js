import React from "react";
import { Menu } from "@headlessui/react";
import cx from "classnames";
import "./NetworkDropdown.css";
import arbitrumIcon from "../../img/ic_arbitrum_24.svg";
import avaxIcon from "../../img/ic_avalanche_24.svg";
import { Trans } from "@lingui/macro";
import { importImage } from "../../Helpers";

export default function NetworkDropdown({ networkOptions, selectorLabel, onNetworkSelect }) {
  async function handleNetworkSelect(option) {
    await onNetworkSelect(option);
  }
  return (
    <Menu>
      <Menu.Button as="div">
        <button className={cx("btn-primary small transparent settings-dropdown-icon")}>
          <img src={selectorLabel === "Arbitrum" ? arbitrumIcon : avaxIcon} alt="settings-dropdown-icon" />
        </button>
      </Menu.Button>

      <Menu.Items as="div" className="menu-items network-dropdown-menu-items">
        {/* <div className="Network-label">Networks</div>
        <div className="divider"></div> */}
        {networkOptions.map((network) => {
          const networkIcon = importImage(network.icon);
          return (
            <Menu.Item key={network.value}>
              <div
                className="network-dropdown-menu-item menu-item"
                onClick={() => handleNetworkSelect({ value: network.value })}
              >
                <img src={networkIcon} alt={network.label} />
                <span className="network-dropdown-menu-item-label menu-item-label">
                  <Trans>{network.label}</Trans>
                </span>
                <div className={cx("selected-icon", { [selectorLabel]: selectorLabel === network.label })} />
              </div>
            </Menu.Item>
          );
        })}
      </Menu.Items>
    </Menu>
  );
}
