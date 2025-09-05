import { t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { useCallback, useState } from "react";

import { isHomeSite } from "lib/legacy";

import LanguageIcon from "img/ic_language24.svg?react";

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
      <div className="" onClick={() => setIsLanguageModalOpen(true)}>
        <div
          className={cx("network-dropdown rounded-4 border border-slate-600 px-6 py-6 text-typography-secondary", {
            "homepage-header": isHomeSite(),
          })}
        >
          <button className="transparent">
            <LanguageIcon />
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
