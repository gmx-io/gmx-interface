import React, { useState, useRef } from "react";
import { Menu } from "@headlessui/react";
import cx from "classnames";
import "./SettingDropdown.css";
import setting24Icon from "../../img/ic_settings_24.svg";
import setting16Icon from "../../img/ic_settings_16.svg";
import arrowright16Icon from "../../img/ic_arrowright16.svg";
import language16Icon from "../../img/ic_language16.svg";
import arrowleft16Icon from "../../img/ic_arrowleft16.svg";
import checkedIcon from "../../img/ic_checked.svg";
import { Trans } from "@lingui/macro";
import { defaultLocale, dynamicActivate, locales } from "../../utils/i18n";
import { importImage, LANGUAGE_LOCALSTORAGE_KEY } from "../../Helpers";

const LANGUAGE_SUB_MENU = "LANGUAGE";

export default function SettingDropdown({ openSettings }) {
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
      <Menu.Button as="div">
        <button className={cx("btn-primary small transparent settings-dropdown-icon")}>
          <img src={setting24Icon} alt="settings-dropdown-icon" />
        </button>
      </Menu.Button>

      {!activeSubMenu && (
        <Menu.Items as="div" className="menu-items settings-dropdown-menu-items">
          <Menu.Item>
            <div className="settings-dropdown-menu-item menu-item" onClick={() => openSettings()}>
              <div className="settings-dropdown-menu-item__prepend">
                <img src={setting16Icon} alt="settings-open-icon" />
              </div>
              <span className="settings-dropdown-menu-item-label menu-item-label">
                <Trans>Trade Settings</Trans>
              </span>
              <div className="settings-dropdown-menu-item__append">
                <img src={arrowright16Icon} alt="arrow-right-icon" />
              </div>
            </div>
          </Menu.Item>
          <Menu.Item>
            <div
              className="settings-dropdown-menu-item menu-item"
              onClick={(e) => {
                openMenu(e, LANGUAGE_SUB_MENU);
              }}
            >
              <div className="settings-dropdown-menu-item__prepend">
                <img src={language16Icon} alt="language-menu-open-icon" />
              </div>
              <span className="settings-dropdown-menu-item-label menu-item-label">
                <Trans>Language</Trans>
              </span>
              <div className="settings-dropdown-menu-item__append">
                <img src={arrowright16Icon} alt="arrow-right-icon" />
              </div>
            </div>
          </Menu.Item>
        </Menu.Items>
      )}
      {activeSubMenu === LANGUAGE_SUB_MENU && (
        <Menu.Items as="div" className="menu-items settings-dropdown-menu-items">
          <Menu.Item>
            <div className="settings-dropdown-menu-item menu-item" onClick={closeMenu}>
              <div className="settings-dropdown-menu-item__prepend">
                <img src={arrowleft16Icon} alt="arrow-left-icon" />
              </div>
              <span className="settings-dropdown-menu-item-label menu-item-label">
                <Trans>Select Language</Trans>
              </span>
            </div>
          </Menu.Item>
          {Object.keys(locales).map((item) => {
            const image = importImage(`flag_${item}.svg`);
            return (
              <Menu.Item key={item}>
                <div
                  className="settings-dropdown-menu-item menu-item"
                  onClick={() => {
                    localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, item);
                    dynamicActivate(item);
                  }}
                >
                  <div className="settings-dropdown-menu-item__prepend menu-item__prepend">
                    <img className="language-image" src={image} alt="language-menu-open-icon" />
                  </div>
                  <span className="settings-dropdown-menu-item-label menu-item-label">
                    <Trans>{locales[item]}</Trans>
                  </span>
                  <div className="settings-dropdown-menu-item__append menu-item__append">
                    {currentLanguage.current === item && <img src={checkedIcon} alt="checked-icon" />}
                  </div>
                </div>
              </Menu.Item>
            );
          })}
        </Menu.Items>
      )}
    </Menu>
  );
}
