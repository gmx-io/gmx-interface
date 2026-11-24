import { Trans } from "@lingui/macro";
import { QRCodeSVG } from "qrcode.react";

import Button from "components/Button/Button";

import { getCanInstallOnComputer, PwaPlatform } from "./pwaPlatform";

export function getDownloadPageUrl() {
  return `${window.location.origin}/download`;
}

/**
 * Computers: "Install app" opens this popup. The phone is where the app matters most (full screen, notifications),
 * so the QR code comes first. It works in every browser, also where the computer itself can't install.
 */
export function DesktopInstallPopup({ platform, onInstallHere }: { platform: PwaPlatform; onInstallHere: () => void }) {
  const canInstallHere = getCanInstallOnComputer(platform);
  const isMacSafari = platform === "desktop-safari";

  return (
    <div
      data-qa="pwa-desktop-install-popup"
      className="flex w-[320px] max-w-[calc(100vw-32px)] flex-col gap-12 rounded-12 border-1/2 border-slate-600 bg-slate-800 p-16"
    >
      <div className="flex flex-col gap-4">
        <div className="text-body-large font-medium text-typography-primary">
          <Trans>Get GMX on your phone</Trans>
        </div>
        <div className="text-body-small text-typography-secondary">
          <Trans>Scan with your phone's camera to open GMX with the steps to add it to your Home Screen</Trans>
        </div>
      </div>
      <div className="self-center rounded-8 bg-white p-8">
        <QRCodeSVG value={getDownloadPageUrl()} size={152} level="M" />
      </div>
      <div className="border-t-1/2 border-slate-600" />
      {canInstallHere ? (
        <>
          <div className="text-body-small text-typography-secondary">
            {isMacSafari ? (
              <Trans>Or add GMX to the Dock on this Mac</Trans>
            ) : (
              <Trans>Or install it on this computer. It opens in its own window, without browser tabs.</Trans>
            )}
          </div>
          <Button variant="secondary" size="medium" className="w-full" onClick={onInstallHere}>
            {isMacSafari ? <Trans>Add to Dock</Trans> : <Trans>Install on this computer</Trans>}
          </Button>
        </>
      ) : (
        <div className="text-body-small text-typography-secondary">
          <Trans>This browser can't install apps on a computer</Trans>
        </div>
      )}
    </div>
  );
}
