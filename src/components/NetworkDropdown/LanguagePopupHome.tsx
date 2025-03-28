import { t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { useCallback, useState } from "react";

import { isHomeSite } from "lib/legacy";

import language24Icon from "img/ic_language24.svg";

import LanguageModalContent from "./LanguageModalContent";
import ModalWithPortal from "../Modal/ModalWithPortal";
import "./NetworkDropdown.css";

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
        <LanguageModalContent currentLanguage={currentLanguage} onClose={handleLanguageModalClose} />
      </ModalWithPortal>
    </>
  );
}
