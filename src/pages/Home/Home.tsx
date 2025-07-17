import { useEffect } from "react";

import { userAnalytics } from "lib/userAnalytics";
import { LandingPageViewEvent } from "lib/userAnalytics/types";

import { HomePageContextProvider } from "./contexts/HomePageContext";
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

  return (
    <HomePageContextProvider>
      <div className="overflow-hidden proportional-nums text-white">
        <HeroSection />
        <LaunchSection />
        <LiqiuditySection />
        <SponsorsSection />
      </div>
    </HomePageContextProvider>
  );
}
