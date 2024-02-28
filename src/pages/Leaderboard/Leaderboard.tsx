import { Trans, t } from "@lingui/macro";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import Tab from "../../components/Tab/Tab";
import { useState } from "react";

const TAB_OPTIONS = ["accounts", "positions", "snapshots"] as const;

type TabOption = typeof TAB_OPTIONS[number];

export function Leaderboard() {
  const { chainId } = useChainId();
  const [tab, setTab] = useState<TabOption>("accounts");
  return (
    <div className="default-container page-layout LeaderboardTest">
      <div className="section-title-block">
        <div className="section-title-content">
          <div className="Page-title">
            <Trans>Leaderboard Data</Trans> <img alt={t`Chain Icon`} src={getIcon(chainId, "network")} />
          </div>
          <div className="Page-description">
            <Trans>Addresses V2 trading statistics.</Trans>
          </div>
        </div>
      </div>
      <Tab options={TAB_OPTIONS} option={tab} onChange={setTab} className="Exchange-swap-option-tabs" />
      {":)"}
    </div>
  );
}
