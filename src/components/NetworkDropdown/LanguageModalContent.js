import { dynamicActivate, isTestLanguage, locales } from "lib/i18n";
import { importImage } from "lib/legacy";
import cx from "classnames";
import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";
import checkedIcon from "img/ic_checked.svg";

export default function LanguageModalContent({ currentLanguage }) {
  return Object.keys(locales).map((item) => {
    const image = !isTestLanguage(item) && importImage(`flag_${item}.svg`);
    return (
      <div
        key={item}
        className={cx("network-dropdown-menu-item  menu-item language-modal-item", {
          active: currentLanguage.current === item,
        })}
        onClick={() => {
          if (!isTestLanguage(item)) {
            localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, item);
          }
          dynamicActivate(item);
        }}
      >
        <div className="menu-item-group">
          <div className="menu-item-icon">
            {isTestLanguage(item) ? "🫐" : <img className="network-dropdown-icon" src={image} alt={locales[item]} />}
          </div>
          <span className="network-dropdown-item-label menu-item-label">{locales[item]}</span>
        </div>
        <div className="network-dropdown-menu-item-img">
          {currentLanguage.current === item && <img src={checkedIcon} alt={locales[item]} />}
        </div>
      </div>
    );
  });
}
