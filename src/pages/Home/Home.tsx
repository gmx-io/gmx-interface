import { useEffect } from "react";

import { userAnalytics } from "lib/userAnalytics";
import { LandingPageViewEvent } from "lib/userAnalytics/types";

import { HeroSection } from "./sections/HeroSection/HeroSection";
import { LaunchSection } from "./sections/LaunchSection/LaunchSection";

type Props = {
  showRedirectModal: (to: string) => void;
};

export default function Home({ showRedirectModal }: Props) {
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

  return (
    <div className="proportional-nums text-white">
      <HeroSection showRedirectModal={showRedirectModal} />
      <LaunchSection showRedirectModal={showRedirectModal} />
    </div>
  );
}
