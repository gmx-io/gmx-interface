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
import { ProgramCards } from "./SocialSection/ProgramCards";
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
      <section className="w-full overflow-hidden bg-slate-900 pt-60 text-white sm:pt-[120px]">
        <ProgramCards />
      </section>
      <FaqSection />
      <RoadmapSection />
      <SocialSection />
    </HomePageContextProvider>
  );
}
