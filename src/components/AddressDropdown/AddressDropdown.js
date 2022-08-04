import React, { useState, useEffect } from "react";
import cx from "classnames";
import "./AddressDropdown.css";
import { Menu } from "@headlessui/react";
import { ARBITRUM, AVALANCHE, helperToast, shortenAddress, useENS } from "../../Helpers";
import { useCopyToClipboard, createBreakpoint } from "react-use";
import externalLink from "../../img/ic_new_link_16.svg";
import copy from "../../img/ic_copy_16.svg";
import disconnect from "../../img/ic_sign_out_16.svg";
import { FaChevronDown } from "react-icons/fa";
import Davatar from "@davatar/react";
import { Trans, t } from "@lingui/macro";
import arbitrum16Icon from "../../img/ic_arbitrum_16.svg";
import avalanche16Icon from "../../img/ic_avalanche_16.svg";

function AddressDropdown(props) {
  const { account, accountUrl, disconnectAccountAndCloseSettings, label } = props;

  const [selectedLabel, setSelectedLabel] = useState(label);
  const [networkChanged, setNetworkChanged] = useState(false);

  const useBreakpoint = createBreakpoint({ L: 600, M: 550, S: 400 });
  const breakpoint = useBreakpoint();
  const [, copyToClipboard] = useCopyToClipboard();
  const { ensName } = useENS(account);

  useEffect(() => {
    setSelectedLabel(label);
  }, [label, networkChanged]);

  const onSelect = async (token) => {
    let network;
    try {
      network = await props.onSelect(token);
      setSelectedLabel(network);
    } catch (error) {
      console.error(error);
    }
    setNetworkChanged(true);
  };

  return (
    <div>
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
            <div className="network-selector-menu-items">
              <p className="network-selector-menu-items-title">
                <Trans>Networks</Trans>
              </p>
              <Menu.Item>
                <div
                  className={cx("menu-item", { selected: selectedLabel === "Arbitrum" })}
                  onClick={() => {
                    onSelect({ value: ARBITRUM });
                  }}
                >
                  <div className="menu-item__prepend">
                    <img src={arbitrum16Icon} alt="arbitrum icon" />
                  </div>
                  <span className="menu-item-label">
                    <Trans>Arbitrum</Trans>
                  </span>
                </div>
              </Menu.Item>
              <Menu.Item>
                <div
                  className={cx("menu-item", { selected: selectedLabel === "Avalanche" })}
                  onClick={() => {
                    onSelect({ value: AVALANCHE });
                  }}
                >
                  <div className="menu-item__prepend">
                    <img src={avalanche16Icon} alt="avalanche icon" />
                  </div>
                  <span className="menu-item-label">
                    <Trans>Avalanche</Trans>
                  </span>
                </div>
              </Menu.Item>
            </div>
            <Menu.Item>
              <div
                className="menu-item"
                onClick={() => {
                  copyToClipboard(account);
                  helperToast.success(t`Address copied to your clipboard`);
                }}
              >
                <div className="menu-item__prepend">
                  <img src={copy} alt="Copy user address" />
                </div>
                <span className="menu-item-label">
                  <Trans>Copy Address</Trans>
                </span>
              </div>
            </Menu.Item>
            <Menu.Item>
              <a href={accountUrl} target="_blank" rel="noopener noreferrer" className="menu-item">
                <div className="menu-item__prepend">
                  <img src={externalLink} alt="Open address in explorer" />
                </div>
                <span className="menu-item-label">
                  <Trans>View in Explorer</Trans>
                </span>
              </a>
            </Menu.Item>
            <Menu.Item>
              <div className="menu-item" onClick={disconnectAccountAndCloseSettings}>
                <div className="menu-item__prepend">
                  <img src={disconnect} alt="Disconnect the wallet" />
                </div>
                <span className="menu-item-label">
                  <Trans>Disconnect</Trans>
                </span>
              </div>
            </Menu.Item>
          </Menu.Items>
        </div>
      </Menu>
    </div>
  );
}

export default AddressDropdown;
