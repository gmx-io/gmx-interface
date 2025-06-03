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
    <header data-qa="header" className="flex items-center justify-between">
      <div className="">{leftContent}</div>

      <AppHeaderUser
        disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
        openSettings={openSettings}
      />
    </header>
  );
}
