import { t } from "@lingui/macro";
import { HeaderMenu } from "landing/pages/Home/HeaderMenu/HeaderMenu";

import { getPageTitle } from "lib/legacy";

import SEO from "components/Seo/SEO";

import ctaGlow from "img/builders_cta_glow.svg";

import { ApiSurfacesSection } from "./ApiSurfacesSection/ApiSurfacesSection";
import { CtaSection } from "./CtaSection/CtaSection";
import { EcosystemSection } from "./EcosystemSection/EcosystemSection";
import { BuildersFaqSection } from "./FaqSection/FaqSection";
import { BuildersFooter } from "./Footer/BuildersFooter";
import { HeroSection } from "./HeroSection/HeroSection";
import { RevenueSection } from "./RevenueSection/RevenueSection";
import { SupportSection } from "./SupportSection/SupportSection";

export default function Builders() {
  return (
    <SEO title={getPageTitle(t`Builders`)}>
      <HeaderMenu />
      <HeroSection />
      <ApiSurfacesSection />
      <RevenueSection />
      <EcosystemSection />
      <SupportSection />
      <BuildersFaqSection />
      <div className="relative overflow-hidden bg-slate-900">
        <img
          src={ctaGlow}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
        />
        <CtaSection />
        <BuildersFooter />
      </div>
    </SEO>
  );
}
