import React, { useRef, useState } from "react";
import { Menu } from "@headlessui/react";
import { Trans } from "@lingui/macro";
import cx from "classnames";
import "./NetworkDropdown.css";
import language24Icon from "../../img/ic_language24.svg";
import arbitrumIcon from "../../img/ic_arbitrum_24.svg";
import avaxIcon from "../../img/ic_avalanche_24.svg";
import checkedIcon from "../../img/ic_checked.svg";
import arrowleft16Icon from "../../img/ic_arrowleft16.svg";
import arrowright16Icon from "../../img/ic_arrowright16.svg";
import { importImage, isHomeSite, LANGUAGE_LOCALSTORAGE_KEY } from "../../Helpers";
import { defaultLocale, dynamicActivate, locales } from "../../utils/i18n";

const LANGUAGE_SUBMENU = "LANGUAGE";

export default function NetworkDropdown({ networkOptions, selectorLabel, onNetworkSelect }) {
  const currentLanguage = useRef(localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY) || defaultLocale);
  const [activeSubMenu, setActiveSubMenu] = useState(null);

  function openMenu(e, name) {
    e.preventDefault();
    setActiveSubMenu(name);
  }
  function closeMenu(e) {
    e.preventDefault();
    setActiveSubMenu(null);
  }
  return (
    <Menu>
      <Menu.Button as="div" className="network-dropdown">
        {!isHomeSite() && (
          <>
            <button className={cx("btn-primary small transparent network-dropdown-icon")}>
              <img src={selectorLabel === "Arbitrum" ? arbitrumIcon : avaxIcon} alt={selectorLabel} />
            </button>
            <div className="network-dropdown-seperator" />
          </>
        )}

        <button className={cx("btn-primary small transparent network-dropdown-icon")}>
          <img src={language24Icon} alt={locales[currentLanguage]} />
        </button>
      </Menu.Button>

      {!activeSubMenu && (
        <Menu.Items as="div" className="menu-items network-dropdown-items">
          {!isHomeSite() && (
            <>
              <div className="network-dropdown-list">
                <NetworkMenuItems
                  networkOptions={networkOptions}
                  selectorLabel={selectorLabel}
                  onNetworkSelect={onNetworkSelect}
                />
              </div>
            </>
          )}
          <Menu.Item>
            <div className="network-dropdown-menu-item menu-item" onClick={(e) => openMenu(e, LANGUAGE_SUBMENU)}>
              <div className="menu-item-group">
                <div className="menu-item-icon">
                  <img src={language24Icon} alt="" />
                </div>
                <span className="network-dropdown-item-label">Language</span>
              </div>
              <div className="menu-item-icon">
                <img src={arrowright16Icon} alt="arrow-right-icon" />
              </div>
            </div>
          </Menu.Item>
        </Menu.Items>
      )}
      {activeSubMenu === LANGUAGE_SUBMENU && (
        <Menu.Items as="div" className="menu-items network-dropdown-items">
          <LanguageDropdown currentLanguage={currentLanguage} closeMenu={closeMenu} />
        </Menu.Items>
      )}
    </Menu>
  );
}

function NetworkMenuItems({ networkOptions, selectorLabel, onNetworkSelect }) {
  async function handleNetworkSelect(option) {
    await onNetworkSelect(option);
  }
  return networkOptions.map((network) => {
    const networkIcon = importImage(network.icon);
    return (
      <Menu.Item key={network.value}>
        <div
          className="network-dropdown-menu-item menu-item"
          onClick={() => handleNetworkSelect({ value: network.value })}
        >
          <div className="menu-item-group">
            <div className="menu-item-icon">
              <img src={networkIcon} alt={network.label} />
            </div>
            <span className="network-dropdown-item-label">{network.label}</span>
          </div>
          <div className="network-dropdown-menu-item-img">
            <div className={cx("active-dot", { [selectorLabel]: selectorLabel === network.label })} />
          </div>
        </div>
      </Menu.Item>
    );
  });
}

function LanguageDropdown({ currentLanguage, closeMenu }) {
  return (
    <>
      <Menu.Item>
        <div className="network-dropdown-menu-item menu-item" onClick={closeMenu}>
          <div className="menu-item-group">
            <img src={arrowleft16Icon} alt="arrow-left-icon" />
            <Trans>Select Language</Trans>
          </div>
        </div>
      </Menu.Item>
      {Object.keys(locales).map((item) => {
        const image = importImage(`flag_${item}.svg`);
        return (
          <Menu.Item key={item}>
            <div
              className="network-dropdown-menu-item  menu-item"
              onClick={() => {
                localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, item);
                dynamicActivate(item);
              }}
            >
              <div className="menu-item-group">
                <div className="menu-item-icon">
                  <img src={image} alt="language-menu-open-icon" />
                </div>
                <span className="network-dropdown-item-label menu-item-label">{locales[item]}</span>
              </div>
              <div className="network-dropdown-menu-item-img">
                {currentLanguage.current === item && <img src={checkedIcon} alt={locales[item]} />}
              </div>
            </div>
          </Menu.Item>
        );
      })}
    </>
  );
}
