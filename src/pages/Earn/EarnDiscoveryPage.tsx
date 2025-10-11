import { Trans } from "@lingui/macro";
import { useMemo, useState } from "react";

import { Theme, useTheme } from "context/ThemeContext/ThemeContext";
import { useBreakpoints } from "lib/useBreakpoints";
import { BuyGmxModal } from "pages/BuyGMX/BuyGmxModal";
import EarnPageLayout from "pages/Earn/EarnPageLayout";

import EarnDocumentation from "components/Earn/Discovery/EarnDocumentation";
import EarnFaq from "components/Earn/Discovery/EarnFaq";
import EarnProductCard from "components/Earn/Discovery/EarnProductCard";
import EarnYieldOverview from "components/Earn/Discovery/EarnYieldOverview";

import discoverBgDesktopDark from "img/discover_bg_desktop_dark.png";
import discoverBgDesktopLight from "img/discover_bg_desktop_light.png";
import discoverBgMobileDark from "img/discover_bg_mobile_dark.png";
import discoverBgMobileLight from "img/discover_bg_mobile_light.png";

const getDiscoverStyle = ({ theme, isMobileBg }: { theme: Theme; isMobileBg: boolean }) => ({
  backgroundImage: `url(${theme === "dark" ? (isMobileBg ? discoverBgMobileDark : discoverBgDesktopDark) : isMobileBg ? discoverBgMobileLight : discoverBgDesktopLight})`,
  backgroundSize: isMobileBg ? "100% 100%" : "auto 100%",
  backgroundPosition: "right",
  backgroundRepeat: "no-repeat",
});

export default function EarnDiscoveryPage() {
  const { isDesktop } = useBreakpoints();
  const { theme } = useTheme();

  const style = useMemo(() => getDiscoverStyle({ theme, isMobileBg: isDesktop }), [theme, isDesktop]);

  const [isBuyGmxModalVisible, setIsBuyGmxModalVisible] = useState(false);

  return (
    <EarnPageLayout>
      <BuyGmxModal isVisible={isBuyGmxModalVisible} setIsVisible={setIsBuyGmxModalVisible} />

      <div className="flex gap-8 max-md:flex-col">
        <div className="flex grow flex-col gap-8">
          <div className="flex flex-col gap-8 rounded-8 bg-slate-900 p-20" style={style}>
            <h4 className="text-16 font-medium text-typography-primary">
              <Trans>Discover GMX Earn</Trans>
            </h4>
            <p className="text-13 text-typography-secondary xl:max-w-[50%]">
              <Trans>
                Welcome to GMX Earn. Learn how GMX, GLV, and GM work together to power a decentralized and efficient
                trading experience. Start your journey by understanding how each token fits into the bigger picture —
                and how you can participate.
              </Trans>
            </p>
          </div>

          <div className="grid gap-8 xl:grid-cols-3">
            <EarnProductCard type="gmx" openBuyGmxModal={() => setIsBuyGmxModalVisible(true)} />
            <EarnProductCard type="glv" openBuyGmxModal={() => setIsBuyGmxModalVisible(true)} />
            <EarnProductCard type="gm" openBuyGmxModal={() => setIsBuyGmxModalVisible(true)} />
          </div>
          <EarnYieldOverview />
        </div>

        <div className="flex w-[400px] shrink-0 flex-col gap-8 max-md:w-full">
          <EarnFaq />
          <EarnDocumentation />
        </div>
      </div>
    </EarnPageLayout>
  );
}
