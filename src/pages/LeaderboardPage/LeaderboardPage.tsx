import { Trans, t } from "@lingui/macro";
import { getIcon } from "config/icons";
import { useLeaderboardAccounts } from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import { useChainId } from "lib/chains";
import { useMemo } from "react";
import { LeaderboardAccountsTable } from "./components/LeaderboardAccountsTable";
import "./LeaderboardPage.scss";

export function Leaderboard() {
  const { chainId } = useChainId();
  const accounts = useLeaderboardAccounts();
  const accountsStruct = useMemo(
    () => ({
      isLoading: !accounts,
      data: accounts ? accounts : [],
      error: null,
      updatedAt: 0,
    }),
    [accounts]
  );

  return (
    <div className="default-container page-layout LeaderboardTest">
      <div className="section-title-block">
        <div className="section-title-content">
          <div className="Page-title">
            <Trans>Leaderboard</Trans> <img alt={t`Chain Icon`} src={getIcon(chainId, "network")} />
          </div>
          <div className="Page-description">
            <Trans>Leaderboard for traders on GMX V2.</Trans>
          </div>
        </div>
      </div>
      <LeaderboardAccountsTable accounts={accountsStruct} search={""} />
    </div>
  );
}
