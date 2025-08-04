import { useDisconnect } from "wagmi";

import { CURRENT_PROVIDER_LOCALSTORAGE_KEY } from "config/localStorage";
import { SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import { MobileSideNav } from "components/SideNav/MobileSideNav";

import { AppHeaderLogo } from "./AppHeaderLogo";
import { AppHeaderUser } from "./AppHeaderUser";

type Props = {
  leftContent?: React.ReactNode;
};

export function AppHeader({ leftContent }: Props) {
  const { disconnect } = useDisconnect();
  const { setIsSettingsVisible } = useSettings();

  const disconnectAccountAndCloseSettings = () => {
    disconnect();
    localStorage.removeItem(SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY);
    localStorage.removeItem(CURRENT_PROVIDER_LOCALSTORAGE_KEY);
    setIsSettingsVisible(false);
  };

  const openSettings = () => {
    setIsSettingsVisible(true);
  };

  return (
    <header
      data-qa="header"
      className="flex justify-between gap-16 max-md:border-b-[0.5px] max-md:border-slate-600 max-md:p-8"
    >
      <div className="flex items-center overflow-hidden">{leftContent ? leftContent : <AppHeaderLogo />}</div>

      <div className="shrink-0">
        <AppHeaderUser
          disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
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
