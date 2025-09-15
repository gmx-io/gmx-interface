import { useEffect } from "react";

import type { LandingPageViewEvent } from "lib/userAnalytics/types";
import { userAnalytics } from "lib/userAnalytics/UserAnalytics";

import { HomePageContextProvider } from "./contexts/HomePageContext";
import { FaqSection } from "./FaqSection/FaqSection";
import { HeaderMenu } from "./HeaderMenu/HeaderMenu";
import { HeroSection } from "./HeroSection/HeroSection";
import { LaunchSection } from "./LaunchSection/LaunchSection";
import { LiqiuditySection } from "./LiqiuditySection/LiqiuditySection";
import { RoadmapSection } from "./RoadmapSection/RoadmapSection";
import { SocialSection } from "./SocialSection/SocialSection";
import { SponsorsSection } from "./SponsorsSection/SponsorsSection";

export default function Home() {
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
      <HeaderMenu />
      <HeroSection />
      <LaunchSection />
      <LiqiuditySection />
      <SponsorsSection />
      <FaqSection />
      <RoadmapSection />
      <SocialSection />
    </HomePageContextProvider>
  );
}
