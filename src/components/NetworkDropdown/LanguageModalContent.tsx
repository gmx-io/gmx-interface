import cx from "classnames";

import { dynamicActivate, isTestLanguage, locales } from "lib/i18n";
import { importImage } from "lib/legacy";

import checkedIcon from "img/ic_checked.svg";

type Props = {
  currentLanguage: string | undefined;
  onClose: () => void;
};

export default function LanguageModalContent({ currentLanguage, onClose }: Props) {
  return (
    <>
      {Object.keys(locales).map((item) => {
        return (
          <div
            key={item}
            className={cx("network-dropdown-menu-item  menu-item language-modal-item", {
              active: currentLanguage === item,
            })}
            onClick={() => {
              dynamicActivate(item).then(onClose);
            }}
          >
            <div className="menu-item-group">
              <div className="menu-item-icon">
                {isTestLanguage(item) ? (
                  "🫐"
                ) : (
                  <img className="network-dropdown-icon" src={importImage(`flag_${item}.svg`)} alt={locales[item]} />
                )}
              </div>
              <span className="language-item">{locales[item]}</span>
            </div>
            <div className="network-dropdown-menu-item-img">
              {currentLanguage === item && <img src={checkedIcon} alt={locales[item]} />}
            </div>
          </div>
        );
      })}
    </>
  );
}
