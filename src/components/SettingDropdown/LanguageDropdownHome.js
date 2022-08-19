import { useRef } from "react";
import { Menu } from "@headlessui/react";
import { Trans } from "@lingui/macro";
import cx from "classnames";
import { importImage, LANGUAGE_LOCALSTORAGE_KEY } from "../../Helpers";
import checkedIcon from "../../img/ic_checked.svg";
import { defaultLocale, dynamicActivate, locales } from "../../utils/i18n";

function getLanguageImage(name) {
  return importImage(`flag_${name}.svg`);
}

export default function LanguageDropdownHome() {
  const currentLanguage = useRef(localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY) || defaultLocale);
  return (
    <Menu>
      <Menu.Button as="div">
        <button className={cx("btn-primary small transparent settings-dropdown-icon")}>
          <img src={getLanguageImage(currentLanguage.current)} alt={currentLanguage.current} />
        </button>
      </Menu.Button>
      <Menu.Items as="div" className="menu-items settings-dropdown-menu-items">
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
    </Menu>
  );
}
