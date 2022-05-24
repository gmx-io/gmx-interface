import React, { useState } from "react";
import { Menu } from "@headlessui/react";
import { i18n } from '@lingui/core'
import cx from "classnames";
import "./SettingDropdown.css";
import setting24Icon from "../../img/ic_settings_24.svg";
import setting16Icon from "../../img/ic_settings_16.svg";
import arrowright16Icon from "../../img/ic_arrowright16.svg";
import language16Icon from "../../img/ic_language16.svg";
import arrowleft16Icon from "../../img/ic_arrowleft16.svg";
import englishFlag from "../../img/flag_english.svg";
import frenchFlag from "../../img/flag-french.png";
import spanishFlag from "../../img/flag_spanish.png";
import checkedIcon from "../../img/ic_checked.svg";
import { messages as enMessages } from '../../locales/en/messages';
import { messages as esMessages } from '../../locales/es/messages';
import { Trans } from '@lingui/macro'

i18n.load({
  'en': enMessages,
  'es': esMessages
})
i18n.activate('en')

export default function SettingDropdown(props) {
  const {
    openSettings,
  } = props;

  let currentLanguage = localStorage.getItem('LANGUAGE_KEY')
  if (!currentLanguage) {
    currentLanguage = 'en'
  }

  const [languageMenuHidden, setLanguageMenuHidden] = useState(true)

  const toggleLanguageMenu = (e) => {
    e.preventDefault()
    setLanguageMenuHidden(!languageMenuHidden)
  }

  const availableLanguages = [{
    icon: englishFlag,
    name: 'English',
    language: 'en'
  }, {
    icon: spanishFlag,
    name: 'Spanish',
    language: 'es'
  }, {
    icon: frenchFlag,
    name: 'French',
    language: 'fr'
  }]

  const selectLanguage = (lang) => {
    console.log(lang)
    i18n.activate(lang)
    localStorage.setItem('LANGUAGE_KEY', lang)
  }

  return (
    <Menu>
      <Menu.Button as="div">
        <button className={cx("App-cta small transparent settings-dropdown-icon")}>
          <img src={setting24Icon} alt="settings-dropdown-icon" />
        </button>
      </Menu.Button>
      <div className="settings-dropdown-menu">
        {
          languageMenuHidden && (
            <Menu.Items as="div" className="menu-items settings-dropdown-menu-items">
              <Menu.Item>
                <div
                  className="settings-dropdown-menu-item"
                  onClick={() => openSettings()}
                >
                  <div className="settings-dropdown-menu-item__prepend">
                    <img src={setting16Icon} alt="settings-open-icon" />
                  </div>
                  <span className="settings-dropdown-menu-item-label">
                    <Trans>Trade settings</Trans>
                  </span>
                  <div className="settings-dropdown-menu-item__append">
                    <img src={arrowright16Icon} alt="arrow-right-icon" />
                  </div>
                </div>
              </Menu.Item>
              <Menu.Item>
                <div
                  className="settings-dropdown-menu-item"
                  onClick={toggleLanguageMenu}
                >
                  <div className="settings-dropdown-menu-item__prepend">
                    <img src={language16Icon} alt="language-menu-open-icon" />
                  </div>
                  <span className="settings-dropdown-menu-item-label">
                    <Trans>Language</Trans>
                  </span>
                  <div className="settings-dropdown-menu-item__append">
                    <img src={arrowright16Icon} alt="arrow-right-icon" />
                  </div>
                </div>
              </Menu.Item>
            </Menu.Items>
          )
        }
        {
          !languageMenuHidden &&
          (
            <Menu.Items as="div" className="menu-items settings-dropdown-menu-items">
              <Menu.Item>
                <div
                  className="settings-dropdown-menu-item"
                  onClick={toggleLanguageMenu}
                >
                  <div className="settings-dropdown-menu-item__prepend">
                    <img src={arrowleft16Icon} alt="arrow-left-icon" />
                  </div>
                  <span className="settings-dropdown-menu-item-label">
                    <Trans>Select Language</Trans>
                  </span>
                </div>
              </Menu.Item>
              {
                availableLanguages.map((item, index) => {
                  return (
                    <Menu.Item key={index}>
                      <div
                        className="settings-dropdown-menu-item"
                        onClick={() => selectLanguage(item.language)}
                      >
                        <div className="settings-dropdown-menu-item__prepend menu-item__prepend">
                          <img src={item.icon} alt="language-menu-open-icon" />
                        </div>
                        <span className="settings-dropdown-menu-item-label menu-item-label">
                          <Trans>{item.name}</Trans>
                        </span>
                        <div className="settings-dropdown-menu-item__append menu-item__append">
                          {
                            currentLanguage === item.language && <img src={checkedIcon} alt="checked-icon" />
                          }
                        </div>
                      </div>
                    </Menu.Item>
                  )
                })
              }
            </Menu.Items>
          )
        }
      </div>
    </Menu>
  );
}
