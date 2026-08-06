import { t } from "@lingui/macro";
import { TraderAffiliateWidget } from "landing/components/TraderAffiliateWidget/TraderAffiliateWidget";
import { HomePageContextProvider } from "landing/pages/Home/contexts/HomePageContext";
import { HeaderMenu } from "landing/pages/Home/HeaderMenu/HeaderMenu";

import { getPageTitle } from "lib/legacy";

import SEO from "components/Seo/SEO";

import { ContactSection } from "./ContactSection";
import { FaqSection } from "./FaqSection";
import { HeroSection } from "./HeroSection";

export default function TraderAffiliateProgram() {
  return (
    <SEO title={getPageTitle(t`Trader & Affiliate Program`)}>
      <HomePageContextProvider>
        <HeaderMenu />
        <HeroSection />
        <section className="bg-light-150 flex w-full justify-center px-16 py-80 sm:px-40 sm:pb-[114px] sm:pt-[120px]">
          <div id="program" className="w-full">
            <TraderAffiliateWidget />
          </div>
        </section>
        <FaqSection />
        <ContactSection />
      </HomePageContextProvider>
    </SEO>
  );
}
