import { useEffect, useState } from "react";

import { userAnalytics } from "lib/userAnalytics";
import { LandingPageViewEvent } from "lib/userAnalytics/types";

import { HeroSection } from "./sections/HeroSection/HeroSection";
import { LaunchSection } from "./sections/LaunchSection/LaunchSection";
import { RedirectModal } from "./sections/RedirectModal/RedirectModal";

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
    <div className="proportional-nums text-white">
      <HeroSection showRedirectModal={showRedirectModal} />
      <LaunchSection showRedirectModal={showRedirectModal} />
      {redirectModalTo && <RedirectModal onClose={() => setRedirectModalTo(null)} to={redirectModalTo} />}
    </div>
  );
}
