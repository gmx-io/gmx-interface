import { t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { useCallback, useState } from "react";

import { isHomeSite } from "lib/legacy";

import LanguageIcon from "img/ic_language.svg?react";

import LanguageModalContent from "./LanguageModalContent";
import ModalWithPortal from "../Modal/ModalWithPortal";

import "./NetworkDropdown.scss";

export default function LanguagePopupHome() {
  const currentLanguage = useLingui().i18n.locale;
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  const handleLanguageModalClose = useCallback(() => {
    setIsLanguageModalOpen(false);
  }, []);

  return (
    <>
      <div className="App-header-network App-header-language" onClick={() => setIsLanguageModalOpen(true)}>
        <div className={cx("network-dropdown", { "homepage-header": isHomeSite() })}>
          <button className="transparent">
            <LanguageIcon className="network-dropdown-icon size-24" />
          </button>
        </div>
      </div>

      <ModalWithPortal
        className="language-popup"
        isVisible={isLanguageModalOpen}
        setIsVisible={setIsLanguageModalOpen}
        label={t`Select Language`}
      >
        <LanguageModalContent currentLanguage={currentLanguage} onClose={handleLanguageModalClose} />
      </ModalWithPortal>
    </>
  );
}
