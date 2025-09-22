import { t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useCallback, useState } from "react";

import ModalWithPortal from "components/Modal/ModalWithPortal";
import LanguageModalContent from "components/NetworkDropdown/LanguageModalContent";

import LanguageIcon from "img/ic_language.svg?react";

import { NavItem } from "./SideNav";
interface LanguageNavItemProps {
  isCollapsed: boolean | undefined;
  onClick?: () => void;
}

export function LanguageNavItem({ isCollapsed, onClick }: LanguageNavItemProps) {
  const currentLanguage = useLingui().i18n.locale;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpen = useCallback(() => {
    onClick?.();
    setIsModalOpen(true);
  }, [onClick]);

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <>
      <NavItem
        icon={<LanguageIcon className="size-24" />}
        label={t`Language`}
        isCollapsed={isCollapsed}
        onClick={handleOpen}
      />
      <ModalWithPortal
        className="language-popup"
        isVisible={isModalOpen}
        setIsVisible={setIsModalOpen}
        label={t`Select Language`}
      >
        <LanguageModalContent currentLanguage={currentLanguage} onClose={handleClose} />
      </ModalWithPortal>
    </>
  );
}
