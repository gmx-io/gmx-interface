import { t } from "@lingui/macro";
import { useState } from "react";

import { LEADERBOARD_WINDOWS, WHALE_WINDOWS } from "domain/synthetics/whales/period";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";

import { MarketsOverviewTable } from "./components/MarketsOverviewTable";
import { useWhaleWindow } from "./components/useWhaleWindow";
import { WhaleLeaderboardTable } from "./components/WhaleLeaderboardTable";
import { WhalesModeToggle, type WhalesMode } from "./components/WhalesModeToggle";
import { WhaleWindowTabs } from "./components/WhaleWindowTabs";

export default function WhalesPage() {
  const [mode, setMode] = useState<WhalesMode>("markets");
  const [window, setWindow] = useWhaleWindow();

  const isWhales = mode === "whales";
  // The leaderboard only supports a reduced window set; longer selections fall back to All time.
  const windows = isWhales ? LEADERBOARD_WINDOWS : WHALE_WINDOWS;
  const effectiveWindow = isWhales && !LEADERBOARD_WINDOWS.includes(window) ? "total" : window;

  return (
    <AppPageLayout title={t`Whale Monitor`}>
      <div className="default-container page-layout flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <WhalesModeToggle mode={mode} onChange={setMode} />
          <WhaleWindowTabs value={effectiveWindow} onChange={setWindow} windows={windows} />
        </div>
        {isWhales ? <WhaleLeaderboardTable window={effectiveWindow} /> : <MarketsOverviewTable window={window} />}
      </div>
    </AppPageLayout>
  );
}
