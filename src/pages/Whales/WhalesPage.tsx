import { t } from "@lingui/macro";
import { useState } from "react";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";

import { MarketsOverviewTable } from "./components/MarketsOverviewTable";
import { useWhaleWindow } from "./components/useWhaleWindow";
import { WhaleLeaderboardTable } from "./components/WhaleLeaderboardTable";
import { WhalesModeToggle, type WhalesMode } from "./components/WhalesModeToggle";
import { WhaleWindowTabs } from "./components/WhaleWindowTabs";

export default function WhalesPage() {
  const [mode, setMode] = useState<WhalesMode>("markets");
  const [window, setWindow] = useWhaleWindow();

  return (
    <AppPageLayout title={t`Whale Monitor`}>
      <div className="default-container page-layout flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <WhalesModeToggle mode={mode} onChange={setMode} />
          <WhaleWindowTabs value={window} onChange={setWindow} />
        </div>
        {mode === "markets" ? <MarketsOverviewTable window={window} /> : <WhaleLeaderboardTable window={window} />}
      </div>
    </AppPageLayout>
  );
}
