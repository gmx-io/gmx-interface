import { t } from "@lingui/macro";
import { Trans } from "@lingui/macro";
import { Link, useParams } from "react-router-dom";

import { getExplorerUrl } from "config/chains";
import { useAccountMarketBreakdown } from "domain/synthetics/whales/accountMarkets";
import { useChainId } from "lib/chains";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { Breadcrumbs, BreadcrumbItem } from "components/Breadcrumbs/Breadcrumbs";
import ExternalLink from "components/ExternalLink/ExternalLink";

import { AccountMarketsPie } from "./components/AccountMarketsPie";
import { AccountMarketsTable } from "./components/AccountMarketsTable";
import { useWhaleWindow } from "./components/useWhaleWindow";
import { WhaleLongWindowHint, WhalePieSkeleton } from "./components/WhaleSkeletons";
import { WhaleWindowTabs } from "./components/WhaleWindowTabs";
import { WHALES_PATH } from "./whaleRoutes";

export default function WhalesAccountPage() {
  const { account } = useParams<{ account: string }>();
  const { chainId } = useChainId();
  const [window, setWindow] = useWhaleWindow();
  const { rows, isLoading } = useAccountMarketBreakdown(chainId, account, window);

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
          <div className="text-body-small flex items-center gap-16">
            <Link to={buildAccountDashboardUrl(account, chainId, 2)} className="link-underline hover:text-blue-300">
              GMX account
            </Link>
            <ExternalLink href={`${getExplorerUrl(chainId)}address/${account}`} variant="icon">
              Explorer
            </ExternalLink>
            <ExternalLink href={`https://debank.com/profile/${account}`} variant="icon">
              DeBank
            </ExternalLink>
          </div>
          <WhaleWindowTabs value={window} onChange={setWindow} />
        </div>
        {isLoading && rows.length === 0 && <WhaleLongWindowHint window={window} />}
        <div className="flex gap-16">
          <AccountMarketsTable rows={rows} isLoading={isLoading} />
          {isLoading && rows.length === 0 ? <WhalePieSkeleton /> : <AccountMarketsPie rows={rows} />}
        </div>
      </div>
    </AppPageLayout>
  );
}
