import { t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useCallback, useState } from "react";

import ModalWithPortal from "components/Modal/ModalWithPortal";
import LanguageModalContent from "components/NetworkDropdown/LanguageModalContent";

import LanguageIcon from "img/ic_language.svg?react";
interface LanguageNavItemProps {
  isCollapsed: boolean | undefined;
  NavItem: React.ComponentType<any>;
}

export function LanguageNavItem({ isCollapsed, NavItem }: LanguageNavItemProps) {
  const currentLanguage = useLingui().i18n.locale;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpen = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <>
      <NavItem
        icon={<LanguageIcon className="size-20" />}
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
