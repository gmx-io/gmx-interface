import { useEffect, useState } from "react";

import { userAnalytics } from "lib/userAnalytics";
import { LandingPageViewEvent } from "lib/userAnalytics/types";

import { HeroSection } from "./sections/HeroSection/HeroSection";
import { LaunchSection } from "./sections/LaunchSection/LaunchSection";
import { LiqiuditySection } from "./sections/LiqiuditySection/LiqiuditySection";
import { RedirectModal } from "./sections/RedirectModal/RedirectModal";
import { SponsorsSection } from "./sections/SponsorsSection/SponsorsSection";

export default function Home(_) {
  useEffect(() => {
    userAnalytics.pushEvent<LandingPageViewEvent>(
      {
        event: "LandingPageAction",
        data: {
          action: "PageView",
        },
      },
      { onlyOncePerSession: true }
    );
  }, []);

  const [redirectModalTo, setRedirectModalTo] = useState<string | null>(null);

  const showRedirectModal = (to: string) => {
    setRedirectModalTo(to);
  };

  return (
    <div className="overflow-hidden proportional-nums text-white">
      <HeroSection showRedirectModal={showRedirectModal} />
      <LaunchSection showRedirectModal={showRedirectModal} />
      <LiqiuditySection />
      <SponsorsSection />
      {redirectModalTo && <RedirectModal onClose={() => setRedirectModalTo(null)} to={redirectModalTo} />}
    </div>
  );
}
