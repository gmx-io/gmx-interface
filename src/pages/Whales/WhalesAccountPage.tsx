import { t } from "@lingui/macro";
import { Trans } from "@lingui/macro";
import { useParams } from "react-router-dom";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { Breadcrumbs, BreadcrumbItem } from "components/Breadcrumbs/Breadcrumbs";

import { WHALES_PATH } from "./whaleRoutes";

export default function WhalesAccountPage() {
  const { account } = useParams<{ account: string }>();
  return (
    <AppPageLayout title={t`Account Whale Breakdown`}>
      <div className="default-container page-layout flex flex-col gap-8">
        <Breadcrumbs>
          <BreadcrumbItem to={WHALES_PATH} back>
            <Trans>Whale Monitor</Trans>
          </BreadcrumbItem>
          <BreadcrumbItem active>{account}</BreadcrumbItem>
        </Breadcrumbs>
        {/* Per-market table + pie added in a later task */}
      </div>
    </AppPageLayout>
  );
}
