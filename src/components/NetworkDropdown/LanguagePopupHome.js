import React, { useRef, useState } from "react";
import ModalWithPortal from "../Modal/ModalWithPortal";
import { t } from "@lingui/macro";
import cx from "classnames";
import "./NetworkDropdown.css";
import language24Icon from "../../img/ic_language24.svg";
import checkedIcon from "../../img/ic_checked.svg";
import { importImage, isHomeSite, LANGUAGE_LOCALSTORAGE_KEY } from "../../lib/legacy";
import { defaultLocale, dynamicActivate, locales } from "../../lib/i18n";

export default function LanguagePopupHome() {
  const currentLanguage = useRef(localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY) || defaultLocale);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  return (
    <>
      <div className="App-header-network App-header-language" onClick={() => setIsLanguageModalOpen(true)}>
        <div className={cx("network-dropdown", { "homepage-header": isHomeSite() })}>
          <button className={cx("btn-primary small transparent")}>
            <img className="network-dropdown-icon" src={language24Icon} alt="Select Language" />
          </button>
        </div>
      </div>

      <ModalWithPortal
        className="language-popup"
        isVisible={isLanguageModalOpen}
        setIsVisible={setIsLanguageModalOpen}
        label={t`Select Language`}
      >
        {Object.keys(locales).map((item) => {
          const image = importImage(`flag_${item}.svg`);
          return (
            <div
              key={item}
              className={cx("network-dropdown-menu-item  menu-item language-modal-item", {
                active: currentLanguage.current === item,
              })}
              onClick={() => {
                localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, item);
                dynamicActivate(item);
              }}
            >
              <div className="menu-item-group">
                <div className="menu-item-icon">
                  <img className="network-dropdown-icon" src={image} alt="language-menu-open-icon" />
                </div>
                <span className="network-dropdown-item-label menu-item-label">{locales[item]}</span>
              </div>
              <div className="network-dropdown-menu-item-img">
                {currentLanguage.current === item && <img src={checkedIcon} alt={locales[item]} />}
              </div>
            </div>
          );
        })}
      </ModalWithPortal>
    </>
  );
}
