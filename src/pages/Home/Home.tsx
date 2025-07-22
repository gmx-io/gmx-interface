import { useEffect } from "react";

import { userAnalytics } from "lib/userAnalytics";
import { LandingPageViewEvent } from "lib/userAnalytics/types";

import { HomePageContextProvider } from "./contexts/HomePageContext";
import { FaqSection } from "./FaqSection/FaqSection";
import { HeroSection } from "./HeroSection/HeroSection";
import { LaunchSection } from "./LaunchSection/LaunchSection";
import { LiqiuditySection } from "./LiqiuditySection/LiqiuditySection";
import { SponsorsSection } from "./SponsorsSection/SponsorsSection";

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
        <LiqiuditySection />
        <SponsorsSection />
        <FaqSection />
      </div>
    </HomePageContextProvider>
  );
}
