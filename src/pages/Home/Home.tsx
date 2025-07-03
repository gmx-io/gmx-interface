import { useEffect } from "react";

import { userAnalytics } from "lib/userAnalytics";
import { LandingPageViewEvent } from "lib/userAnalytics/types";

import { HeroSection } from "./sections/HeroSection";

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

  return (
    <div className="proportional-nums">
      <HeroSection />
    </div>
  );
}
