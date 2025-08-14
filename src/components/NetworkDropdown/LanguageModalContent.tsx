import cx from "classnames";

import { dynamicActivate, isTestLanguage, locales } from "lib/i18n";
import { importImage } from "lib/legacy";

import Button from "components/Button/Button";

import CheckedIcon from "img/ic_checked.svg?react";

type Props = {
  currentLanguage: string | undefined;
  onClose: () => void;
};

export default function LanguageModalContent({ currentLanguage, onClose }: Props) {
  return (
    <>
      {Object.keys(locales).map((item) => {
        return (
          <Button
            variant="secondary"
            key={item}
            className={cx("", {
              "!bg-slate-800 !text-white": currentLanguage === item,
            })}
            onClick={() => {
              dynamicActivate(item).then(onClose);
            }}
          >
            <div className="flex items-center gap-8">
              <div className="menu-item-icon">
                {isTestLanguage(item) ? (
                  "🫐"
                ) : (
                  <img className="network-dropdown-icon" src={importImage(`flag_${item}.svg`)} alt={locales[item]} />
                )}
              </div>
              <span className="text-body-medium font-medium">{locales[item]}</span>
            </div>
            <div className="network-dropdown-menu-item-img ml-auto py-4">
              {currentLanguage === item && <CheckedIcon />}
            </div>
          </Button>
        );
      })}
    </>
  );
}
