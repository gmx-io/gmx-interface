import { useState } from "react";
import { HiMenu } from "react-icons/hi";
import { IoCloseOutline } from "react-icons/io5";

import Button from "components/Button/Button";
import Portal from "components/Common/Portal";
import Footer from "components/Footer/Footer";

import { LanguageNavItem } from "./LanguageNavItem";
import { DocsNavItem, LogoSection, MenuSection, NavItem } from "./SideNav";

export function MobileSideNav() {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div>
      <Button variant="secondary" className="md:h-40" onClick={handleToggle}>
        <HiMenu className="h-20 w-20" />
      </Button>
      {isOpen ? (
        <Portal>
          <div className="fixed inset-0 z-[99] bg-[#090A1480]" onClick={handleToggle} />
          <div className="fixed right-0 top-0 z-[100] flex h-full w-[36rem] flex-col border-l border-slate-600 bg-slate-900 max-lg:pb-40">
            <div className="grow border-b border-slate-600 p-8">
              <div className="flex items-center justify-between">
                <LogoSection isCollapsed={false} />

                <button onClick={handleToggle} className="p-8 text-slate-100 hover:text-white active:text-white">
                  <IoCloseOutline size={24} />
                </button>
              </div>
              <MenuSection isCollapsed={false} />
            </div>
            <div className="border-b border-slate-600 p-8">
              <ul className="flex list-none flex-col gap-8 px-0">
                <LanguageNavItem isCollapsed={false} NavItem={NavItem} />
                <DocsNavItem isCollapsed={false} />
              </ul>
            </div>
            <div className="py-8">
              <Footer isMobileSideNav />
            </div>
          </div>
        </Portal>
      ) : null}
    </div>
  );
}
