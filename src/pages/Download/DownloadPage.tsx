import { t, Trans } from "@lingui/macro";
import { ReactNode, useMemo, useState } from "react";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Button from "components/Button/Button";
import PageTitle from "components/PageTitle/PageTitle";
import {
  getInstallSteps,
  HomeScreenNote,
  InstallStepsList,
  IphoneInstallHelp,
} from "components/PwaInstall/InstallSteps";
import { startInstall } from "components/PwaInstall/pwaActions";
import { getIsAndroidUserAgent, PwaPlatform } from "components/PwaInstall/pwaPlatform";
import { usePwaEnvironment } from "components/PwaInstall/usePwaEnvironment";
import Tabs from "components/Tabs/Tabs";

type DeviceTab = "iphone" | "android" | "computer";

function getDefaultTab(platform: PwaPlatform): DeviceTab {
  if (platform.startsWith("iphone")) return "iphone";
  if (platform.startsWith("android")) return "android";
  if (platform === "in-app") return /Android/i.test(window.navigator.userAgent) ? "android" : "iphone";
  return "computer";
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-16 rounded-12 border-1/2 border-slate-600 bg-slate-900 p-16 md:p-20">
      {children}
    </div>
  );
}

/**
 * The page behind the computer popup's QR code (and a link marketing can share). It opens on the visitor's own device
 * with that device's steps; the tabs show the others.
 */
export default function DownloadPage() {
  const env = usePwaEnvironment();
  const { platform, iosVersion } = env;
  const [tab, setTab] = useState<DeviceTab>(() => getDefaultTab(platform));

  const iphonePlatform: PwaPlatform = platform === "iphone-chrome" ? "iphone-chrome" : "iphone-safari";
  const computerPlatform: PwaPlatform = platform === "desktop-safari" ? "desktop-safari" : "desktop-chromium";

  const tabOptions = useMemo(
    () => [
      { value: "iphone" as const, label: <Trans>iPhone</Trans> },
      { value: "android" as const, label: <Trans>Android</Trans> },
      { value: "computer" as const, label: <Trans>Computer</Trans> },
    ],
    []
  );

  return (
    <AppPageLayout title={t`Get the GMX app`}>
      <div className="default-container page-layout">
        <div className="mx-auto flex w-full max-w-[560px] flex-col gap-16">
          <PageTitle
            isTop
            title={t`Get the GMX app`}
            subtitle={t`Full-screen charts, one tap to open, and notifications when an order executes or a position is liquidated on Arbitrum`}
            qa="download-page"
          />

          {env.isInstalled ? (
            <Card>
              <div className="text-body-large font-medium text-typography-primary">
                <Trans>You're already using the GMX app</Trans>
              </div>
              <Button variant="primary" size="medium" to="/trade">
                <Trans>Go to Trade</Trans>
              </Button>
            </Card>
          ) : (
            <>
              {platform === "in-app" ? (
                <AlertInfoCard type="warning" hideClose>
                  {getIsAndroidUserAgent() ? (
                    <Trans>Wallet and messenger browsers can't install apps. Open this page in Chrome.</Trans>
                  ) : (
                    <Trans>
                      Wallet and messenger browsers can't add apps to the Home Screen. Open this page in Safari or
                      Chrome.
                    </Trans>
                  )}
                </AlertInfoCard>
              ) : null}

              <Tabs type="inline" selectedValue={tab} onChange={setTab} options={tabOptions} />

              {tab === "iphone" ? (
                <Card>
                  <InstallStepsList steps={getInstallSteps(iphonePlatform, iosVersion)} />
                  <HomeScreenNote platform={iphonePlatform} />
                  <IphoneInstallHelp />
                </Card>
              ) : null}

              {tab === "android" ? (
                <Card>
                  {platform === "android-chrome" ? (
                    <>
                      <Button variant="primary" size="medium" onClick={() => startInstall("android-chrome", "menu")}>
                        <Trans>Install</Trans>
                      </Button>
                      <div className="text-body-small text-typography-secondary">
                        <Trans>Or use the browser menu</Trans>
                      </div>
                    </>
                  ) : null}
                  <InstallStepsList steps={getInstallSteps("android-chrome", iosVersion)} />
                </Card>
              ) : null}

              {tab === "computer" ? (
                <Card>
                  {platform === "desktop-chromium" ? (
                    <>
                      <Button variant="primary" size="medium" onClick={() => startInstall("desktop-chromium", "menu")}>
                        <Trans>Install on this computer</Trans>
                      </Button>
                      <div className="text-body-small text-typography-secondary">
                        <Trans>Or use the browser menu</Trans>
                      </div>
                    </>
                  ) : null}
                  {platform === "desktop-other" ? (
                    <div className="text-body-small text-typography-secondary">
                      <Trans>This browser can't install apps. Open GMX in Chrome, Edge or Safari on a Mac.</Trans>
                    </div>
                  ) : null}
                  <InstallStepsList steps={getInstallSteps(computerPlatform, iosVersion)} />
                </Card>
              ) : null}
            </>
          )}
        </div>
      </div>
    </AppPageLayout>
  );
}
