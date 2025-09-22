import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import { MobileSideNav } from "components/SideNav/MobileSideNav";

import { AppHeaderLogo } from "./AppHeaderLogo";
import { AppHeaderUser } from "./AppHeaderUser";

type Props = {
  leftContent?: React.ReactNode;
};

export function AppHeader({ leftContent }: Props) {
  const { setIsSettingsVisible } = useSettings();

  const openSettings = () => {
    setIsSettingsVisible(true);
  };

  return (
    <header
      data-qa="header"
      className="flex justify-between gap-16 max-md:border-b-1/2 max-md:border-slate-600 max-md:p-8"
    >
      <div className="flex items-center overflow-hidden">{leftContent ? leftContent : <AppHeaderLogo />}</div>

      <div className="shrink-0">
        <AppHeaderUser
          openSettings={openSettings}
          menuToggle={
            <div className="hidden max-[1024px]:block">
              <MobileSideNav />
            </div>
          }
        />
      </div>
    </header>
  );
}
