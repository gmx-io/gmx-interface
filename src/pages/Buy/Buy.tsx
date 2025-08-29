import { t } from "@lingui/macro";

import { getPageTitle } from "lib/legacy";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import SEO from "components/Common/SEO";
import PageTitle from "components/PageTitle/PageTitle";
import TokenCard from "components/TokenCard/TokenCard";

import "./Buy.css";

export default function BuyGMXGLP() {
  return (
    <SEO title={getPageTitle(t`Buy GLP or GMX`)}>
      <AppPageLayout>
        <div className="BuyGMXGLP page-layout">
          <div className="default-container">
            <div className="BuyGMXGLP-container">
              <PageTitle isTop title={t`Protocol Tokens`} qa="buy-page" />
              <TokenCard />
            </div>
          </div>
        </div>
      </AppPageLayout>
    </SEO>
  );
}
