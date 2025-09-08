import { t } from "@lingui/macro";

import { getPageTitle } from "lib/legacy";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import BuyCards from "components/BuyCards/BuyCards";
import SEO from "components/Common/SEO";
import PageTitle from "components/PageTitle/PageTitle";

export default function Buy() {
  return (
    <SEO title={getPageTitle(t`Buy GLP or GMX`)}>
      <AppPageLayout>
        <PageTitle isTop title={t`Protocol Tokens`} qa="buy-page" />
        <BuyCards />
      </AppPageLayout>
    </SEO>
  );
}
