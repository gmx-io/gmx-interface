import { t } from "@lingui/macro";
import { Trans } from "@lingui/macro";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAccountMarketBreakdown } from "domain/synthetics/whales/accountMarkets";
import type { WhaleWindow } from "domain/synthetics/whales/period";
import { useChainId } from "lib/chains";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { Breadcrumbs, BreadcrumbItem } from "components/Breadcrumbs/Breadcrumbs";

import { AccountMarketsPie } from "./components/AccountMarketsPie";
import { AccountMarketsTable } from "./components/AccountMarketsTable";
import { WhaleWindowTabs } from "./components/WhaleWindowTabs";
import { WHALES_PATH } from "./whaleRoutes";

export default function WhalesAccountPage() {
  const { account } = useParams<{ account: string }>();
  const { chainId } = useChainId();
  const [window, setWindow] = useState<WhaleWindow>("total");
  const { rows } = useAccountMarketBreakdown(chainId, account, window);

  return (
    <AppPageLayout title={t`Account Whale Breakdown`}>
      <div className="default-container page-layout flex flex-col gap-8">
        <Breadcrumbs>
          <BreadcrumbItem to={WHALES_PATH} back>
            <Trans>Whale Monitor</Trans>
          </BreadcrumbItem>
          <BreadcrumbItem active>{account}</BreadcrumbItem>
        </Breadcrumbs>
        <div className="flex items-center justify-between">
          <Link to={buildAccountDashboardUrl(account, chainId, 2)} target="_blank">
            <Trans>Open full dashboard</Trans>
          </Link>
          <WhaleWindowTabs value={window} onChange={setWindow} />
        </div>
        <div className="flex gap-16">
          <AccountMarketsTable rows={rows} />
          <AccountMarketsPie rows={rows} />
        </div>
      </div>
    </AppPageLayout>
  );
}
