import { t } from "@lingui/macro";
import { Trans } from "@lingui/macro";
import { useParams } from "react-router-dom";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { Breadcrumbs, BreadcrumbItem } from "components/Breadcrumbs/Breadcrumbs";

import { MarketWhalesTable } from "./components/MarketWhalesTable";
import { useWhaleWindow } from "./components/useWhaleWindow";
import { WhaleWindowTabs } from "./components/WhaleWindowTabs";
import { WHALES_PATH } from "./whaleRoutes";

export default function WhalesMarketPage() {
  const { market } = useParams<{ market: string }>();
  const [window, setWindow] = useWhaleWindow();
  const marketsInfoData = useMarketsInfoData();
  const marketName = (market && marketsInfoData?.[market]?.name) || market;

  return (
    <AppPageLayout title={t`Market Whales`}>
      <div className="default-container page-layout flex flex-col gap-8">
        <Breadcrumbs>
          <BreadcrumbItem to={WHALES_PATH} back>
            <Trans>Whale Monitor</Trans>
          </BreadcrumbItem>
          <BreadcrumbItem active>{marketName}</BreadcrumbItem>
        </Breadcrumbs>
        <div className="flex justify-end">
          <WhaleWindowTabs value={window} onChange={setWindow} />
        </div>
        {market && <MarketWhalesTable market={market} window={window} />}
      </div>
    </AppPageLayout>
  );
}
