import { t } from "@lingui/macro";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";

export default function WhalesPage() {
  return (
    <AppPageLayout title={t`Whale Monitor`}>
      <div className="default-container page-layout flex flex-col gap-8">
        <div className="text-h2">Whale Monitor</div>
        {/* Toggle + tables added in later tasks */}
      </div>
    </AppPageLayout>
  );
}
