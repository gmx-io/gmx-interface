import { useState } from "react";

import Button from "components/Button/Button";
import Portal from "components/Common/Portal";
import Footer from "components/Footer/Footer";

import BurgerMenuIcon from "img/ic_burger_menu.svg?react";
import CloseIcon from "img/ic_close.svg?react";

import { LanguageNavItem } from "./LanguageNavItem";
import { SettingsNavItem } from "./SettingsNavItem";
import { DocsNavItem, LogoSection, MenuSection } from "./SideNav";

export function MobileSideNav() {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div>
      <Button variant="secondary" size="controlled" className="size-32 !p-0 md:size-40" onClick={handleToggle}>
        <BurgerMenuIcon className="size-20" />
      </Button>
      {isOpen ? (
        <Portal>
          <div className="fixed inset-0 z-[999] bg-[#090A1480]" onClick={handleToggle} />
          <div className="fixed right-0 top-0 z-[1000] flex h-full w-[360px] flex-col border-l-1/2 border-slate-600 bg-slate-900 max-md:w-[min(320px,100dvw)]">
            <div className="flex grow flex-col overflow-y-auto">
              <div className="flex items-center justify-between p-8 pb-0">
                <LogoSection isCollapsed={false} />

                <button
                  onClick={handleToggle}
                  className="p-8 text-typography-secondary hover:text-typography-primary active:text-typography-primary"
                >
                  <CloseIcon className="size-20" />
                </button>
              </div>
              <div className="grow border-b-1/2 border-slate-600 p-8">
                <MenuSection isCollapsed={false} onMenuItemClick={handleToggle} />
              </div>

              <div className="border-b-1/2 border-slate-600 p-8">
                <ul className="flex list-none flex-col px-0">
                  <SettingsNavItem isCollapsed={false} onClick={handleToggle} />
                  <LanguageNavItem isCollapsed={false} onClick={handleToggle} />
                  <DocsNavItem isCollapsed={false} />
                </ul>
              </div>
              <div className="py-8">
                <Footer isMobileSideNav />
              </div>
            </div>
          </div>
        </Portal>
      ) : null}
    </div>
  );
}
