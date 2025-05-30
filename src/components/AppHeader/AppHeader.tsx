import { AppHeaderUser } from "./AppHeaderUser";

type Props = {
  disconnectAccountAndCloseSettings: () => void;
  openSettings: () => void;
};

export function AppHeader({ disconnectAccountAndCloseSettings, openSettings }: Props) {
  return (
    <header data-qa="header" className="flex items-center justify-between">
      <div className="">leftContent</div>
      <div className="">
        <AppHeaderUser
          disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
          openSettings={openSettings}
        />
      </div>
    </header>
  );
}
