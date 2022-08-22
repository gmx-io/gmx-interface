import React from "react";
import { Menu } from "@headlessui/react";
import cx from "classnames";
import "./SettingsDropdown.css";
import language16Icon from "../../img/ic_language16.svg";
import arbitrumIcon from "../../img/ic_arbitrum_24.svg";
import avaxIcon from "../../img/ic_avalanche_24.svg";
import { importImage } from "../../Helpers";

export default function SettingsDropdown({ networkOptions, selectorLabel, onNetworkSelect }) {
  return (
    <div className="App-header-networks">
      <NetworkDropdown
        networkOptions={networkOptions}
        selectorLabel={selectorLabel}
        onNetworkSelect={onNetworkSelect}
      />
      <div className="App-header-verticle-line" />
      <LanguageDropdown
        networkOptions={networkOptions}
        selectorLabel={selectorLabel}
        onNetworkSelect={onNetworkSelect}
      />
    </div>
  );
}

function NetworkDropdown({ networkOptions, selectorLabel, onNetworkSelect }) {
  async function handleNetworkSelect(option) {
    await onNetworkSelect(option);
  }
  return (
    <Menu>
      <Menu.Button as="div">
        <button className={cx("btn-primary small transparent App-header-networks-icon")}>
          <img src={selectorLabel === "Arbitrum" ? arbitrumIcon : avaxIcon} alt={selectorLabel} />
        </button>
      </Menu.Button>

      <Menu.Items as="div" className="menu-items network-dropdown-menu-items">
        {networkOptions.map((network) => {
          const networkIcon = importImage(network.icon);
          return (
            <Menu.Item key={network.value}>
              <div
                className="network-dropdown-menu-item menu-item"
                onClick={() => handleNetworkSelect({ value: network.value })}
              >
                <img src={networkIcon} alt={network.label} />
                <span className="network-dropdown-menu-item-label menu-item-label">{network.label}</span>
                <div className={cx("selected-icon", { [selectorLabel]: selectorLabel === network.label })} />
              </div>
            </Menu.Item>
          );
        })}
      </Menu.Items>
    </Menu>
  );
}
function LanguageDropdown({ networkOptions, selectorLabel, onNetworkSelect }) {
  async function handleNetworkSelect(option) {
    await onNetworkSelect(option);
  }
  return (
    <Menu>
      <Menu.Button as="div">
        <button className={cx("btn-primary small transparent settings-dropdown-icon")}>
          <img src={language16Icon} alt="settings-dropdown-icon" />
        </button>
      </Menu.Button>

      <Menu.Items as="div" className="menu-items network-dropdown-menu-items">
        {networkOptions.map((network) => {
          const networkIcon = importImage(network.icon);
          return (
            <Menu.Item key={network.value}>
              <div
                className="network-dropdown-menu-item menu-item"
                onClick={() => handleNetworkSelect({ value: network.value })}
              >
                <img src={networkIcon} alt={network.label} />
                <span className="network-dropdown-menu-item-label menu-item-label">{network.label}</span>
                <div className={cx("selected-icon", { [selectorLabel]: selectorLabel === network.label })} />
              </div>
            </Menu.Item>
          );
        })}
      </Menu.Items>
    </Menu>
  );
}
