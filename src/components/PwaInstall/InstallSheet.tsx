import { Trans } from "@lingui/macro";

import ModalWithPortal from "components/Modal/ModalWithPortal";

import { getInstallSteps, HomeScreenNote, InstallStepsList, IphoneInstallHelp } from "./InstallSteps";
import { PwaPlatform } from "./pwaPlatform";

/** Bottom sheet on phones, small modal on computers: the steps for browsers that can't open an install dialog. */
export function InstallSheet({
  platform,
  iosVersion,
  isVisible,
  setIsVisible,
}: {
  platform: PwaPlatform;
  iosVersion: number | undefined;
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
}) {
  const isIphone = platform.startsWith("iphone");
  const isComputer = platform.startsWith("desktop");

  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={
        isIphone ? (
          <Trans>Add GMX to your Home Screen</Trans>
        ) : isComputer ? (
          <Trans>Install GMX on this computer</Trans>
        ) : (
          <Trans>Install the GMX app</Trans>
        )
      }
      contentClassName="w-[420px]"
      withMobileBottomPosition={true}
      qa="pwa-install-sheet"
    >
      <div className="flex flex-col gap-16">
        <InstallStepsList steps={getInstallSteps(platform, iosVersion)} />
        {isIphone ? <HomeScreenNote platform={platform} /> : null}
        {isIphone ? <IphoneInstallHelp /> : null}
      </div>
    </ModalWithPortal>
  );
}
