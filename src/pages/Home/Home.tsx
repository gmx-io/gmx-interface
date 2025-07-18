import { useEffect } from "react";

import { userAnalytics } from "lib/userAnalytics";
import { LandingPageViewEvent } from "lib/userAnalytics/types";

import { HomePageContextProvider } from "./contexts/HomePageContext";
import { HeroSection } from "./sections/HeroSection/HeroSection";
import { LaunchSection } from "./sections/LaunchSection/LaunchSection";

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
    <HomePageContextProvider>
      <div className="overflow-hidden proportional-nums text-white">
        <HeroSection />
        <LaunchSection />
      </div>
    </HomePageContextProvider>
  );
}
