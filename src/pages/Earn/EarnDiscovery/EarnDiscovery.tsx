import { Trans } from "@lingui/macro";

import { useBreakpoints } from "lib/useBreakpoints";

import discoverBg from "img/discover_bg.png";
import discoverBgMobile from "img/discover_bg_mobile.png";

import EarnPageLayout from "../EarnPageLayout";
import EarnDocumentation from "./components/EarnDocumentation";
import EarnFaq from "./components/EarnFaq";
import EarnProductCard from "./components/EarnProductCard";
import EarnYieldOverview from "./components/EarnYieldOverview";

const DISCOVER_STYLE = {
  backgroundImage: `url(${discoverBg})`,
  backgroundSize: "100% 100%",
  backgroundRepeat: "no-repeat",
};

const DISCOVER_MOBILE_STYLE = {
  backgroundImage: `url(${discoverBgMobile})`,
  backgroundSize: "100% 100%",
  backgroundRepeat: "no-repeat",
};

export default function EarnDiscoveryPage() {
  const { isDesktop } = useBreakpoints();

  return (
    <EarnPageLayout>
      <div className="flex gap-8 max-md:flex-col">
        <div className="flex grow flex-col gap-8">
          <div
            className="flex flex-col gap-8 rounded-8 bg-slate-900 p-20"
            style={isDesktop ? DISCOVER_MOBILE_STYLE : DISCOVER_STYLE}
          >
            <h4 className="text-16 font-medium text-typography-primary">
              <Trans>Discover GMX Earn</Trans>
            </h4>
            <p className="max-w-[600px] text-13 text-typography-secondary">
              <Trans>
                Welcome to GMX Earn. Learn how GMX, GLV, and GM work together to power a decentralized and efficient
                trading experience. Start your journey by understanding how each token fits into the bigger picture —
                and how you can participate.
              </Trans>
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <EarnProductCard type="gmx" />
            <EarnProductCard type="glv" />
            <EarnProductCard type="gm" />
          </div>
          <EarnYieldOverview />
        </div>

        <div className="flex w-[400px] shrink-0 flex-col gap-8">
          <EarnFaq />
          <EarnDocumentation />
        </div>
      </div>
    </EarnPageLayout>
  );
}
