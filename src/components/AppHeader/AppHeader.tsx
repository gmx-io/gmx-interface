import { useDisconnect } from "wagmi";

import { CURRENT_PROVIDER_LOCALSTORAGE_KEY } from "config/localStorage";
import { SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";

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
    <header data-qa="header" className="flex justify-between gap-16">
      {leftContent}

      <div className="shrink-0">
        <AppHeaderUser
          disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
          openSettings={openSettings}
        />
      </div>
    </header>
  );
}
