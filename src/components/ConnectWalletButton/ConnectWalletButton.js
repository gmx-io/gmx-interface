import React, { useState, useEffect } from "react";
import cx from "classnames";
import { Menu } from "@headlessui/react";
import './ConnectWalletButton.css';
import { FaChevronDown } from "react-icons/fa";
import { Trans } from '@lingui/macro'
import arbitrum16Icon from '../../img/ic_arbitrum_16.svg';
import avalanche16Icon from '../../img/ic_avalanche_16.svg';
import {
  ARBITRUM,
  AVALANCHE
} from "../../Helpers";

function ConnectWalletButton(props) {
  const {
    imgSrc,
    children,
    onClick,
    className,
    label
  } = props
  const [selectedLabel, setSelectedLabel] = useState(label);
  const [networkChanged, setNetworkChanged] = useState(false);
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

  const onLabelClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  }
  let classNames = cx("btn btn-primary btn-sm connect-wallet-btn", className);
  return (
    <div className="connect-wallet">
      <div className={classNames} onClick={onLabelClick}>
        {imgSrc && <img className="btn-image" src={imgSrc} alt={children} />}
        <span className="btn-label">{children}</span>
      </div>
      <Menu>
        <Menu.Button as="div">
          <div className="network-dropdown-trigger-btn">
            <FaChevronDown />
          </div>
        </Menu.Button>
        <Menu.Items as="div" className="menu-items">
          <div className="network-selector-menu-items">
            <p className="network-selector-menu-items-title"><Trans>Networks</Trans></p>
            <Menu.Item>
              <div
                className={cx("menu-item", { selected: selectedLabel === 'Arbitrum' } )}
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
                className={cx("menu-item", { selected: selectedLabel === 'Avalanche' } )}
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
        </Menu.Items>
      </Menu>
    </div>
  );
}

export default ConnectWalletButton;
