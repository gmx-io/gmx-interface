import { t, Trans } from "@lingui/macro";
import { useChainId } from "lib/chains";
import { getIcon } from "config/icons";
import { bigNumberify, formatAmount, formatUsd } from "lib/numbers";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { BigNumber } from "ethers";
import { useLeaderboardData, useLeaderboardPositions } from "domain/synthetics/leaderboard";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { getToken } from "config/tokens";
import { useParams } from "react-router-dom";
import Tab from "../../components/Tab/Tab";

import "./LeaderboardTest.css";
import { useCallback, useState } from "react";

const TAB_OPTIONS = ["accounts", "positions", "snapshots"];

export default function LeaderboardTest() {
  const { chainId } = useChainId();
  const { account } = useParams<{ account?: string }>();

  const { data, error } = useLeaderboardData(chainId, account);
  const marketsInfoData = useMarketsInfoData();
  const { accounts, positions } = data;

  const { data: snapshotPositions } = useLeaderboardPositions(true, chainId, account, true, "snapshotTimestamp_DESC");

  const [tab, setTab] = useState<"accounts" | "positions" | "snapshots">("accounts");

  const renderAccounts = useCallback(() => {
    if (tab !== "accounts") {
      return null;
    }

    return (
      <>
        <h3>Accounts ({accounts?.length})</h3>
        <table>
          <thead>
            <tr>
              <th>account</th>
              <th>pnl (realized / pending)</th>
              <th>pnl % (total)</th>
              <th>cost (paid / pending)</th>
              <th>total / max collateral</th>
              <th>cum size / collateral</th>
              <th>avg size</th>
              <th>lev</th>
            </tr>
          </thead>
          <tbody>
            {accounts?.map((d) => {
              return (
                <tr key={d.account}>
                  <td>{d.account}</td>
                  <td>
                    {formatUsd(d.totalRealizedPnl)} / {formatUsd(d.totalPendingPnl)}
                  </td>
                  <td>{formatAmount(d.totalPnl.mul(10000).div(d.maxCollateral), 2, 2)}%</td>
                  <td>
                    {formatUsd(d.totalPaidCost)} / {formatUsd(d.totalPendingCost)}
                  </td>
                  <td>
                    {formatUsd(d.totalCollateral)} / {formatUsd(d.maxCollateral)}
                  </td>
                  <td>
                    {formatUsd(d.cumsumSize, { displayDecimals: 0 })} /{" "}
                    {formatUsd(d.cumsumCollateral, { displayDecimals: 0 })}
                  </td>
                  <td>{formatUsd(d.sumMaxSize.div(d.totalCount), { displayDecimals: 0 })}</td>
                  <td>{formatAmount(d.cumsumSize.mul(10000).div(d.cumsumCollateral), 4, 2)}x</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </>
    );
  }, [tab, accounts]);

  const renderPositions = useCallback(() => {
    if (tab !== "positions") {
      return null;
    }
    return (
      <>
        <h3>Positions ({positions?.length})</h3>
        <table>
          <thead>
            <tr>
              <th>account</th>
              <th>market</th>
              <th>collateral</th>
              <th>size</th>
              <th>size in tokens</th>
              <th>pending pnl (after fees)</th>
              <th>pending cost</th>
            </tr>
          </thead>
          <tbody>
            {positions?.map((p) => {
              const market = (marketsInfoData || {})[p.market];
              const collateralToken = getToken(chainId, p.collateralToken);

              if (!market || !collateralToken) {
                return null;
              }

              return (
                <tr key={p.key}>
                  <td>{p.account}</td>
                  <td>
                    <TooltipWithPortal handle={market?.indexToken.symbol} renderContent={() => p.market} />
                    &nbsp;{p.isLong ? "long" : "short"}
                  </td>
                  <td>
                    {formatAmount(p.collateralAmount, collateralToken.decimals)} {collateralToken.symbol}
                  </td>
                  <td>{formatUsd(bigNumberify(p.sizeInUsd))}</td>
                  <td>
                    {formatAmount(p.sizeInTokens, market.indexToken.decimals, 2, true)}&nbsp;{market.indexToken.symbol}
                  </td>
                  <td>
                    {formatUsd(p.pendingPnl)} ({formatUsd(p.pendingPnl.sub(p.totalPendingCost))})
                  </td>
                  <td>-{formatUsd(BigNumber.from(p.totalPendingCost))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </>
    );
  }, [tab, positions, marketsInfoData, chainId]);

  const renderSnapshotPositions = useCallback(() => {
    if (tab !== "snapshots") {
      return null;
    }
    return (
      <>
        <h3>Positions Snapshots ({snapshotPositions?.length})</h3>
        <table>
          <thead>
            <tr>
              <th>account</th>
              <th>market</th>
              <th>collateral</th>
              <th>size</th>
              <th>size in tokens</th>
              <th>pending pnl (after fees)</th>
              <th>pending cost</th>
              <th>date</th>
            </tr>
          </thead>
          <tbody>
            {snapshotPositions?.map((p) => {
              const market = (marketsInfoData || {})[p.market];
              const collateralToken = getToken(chainId, p.collateralToken);

              if (!market || !collateralToken) {
                return null;
              }

              return (
                <tr key={p.key}>
                  <td>{p.account}</td>
                  <td>
                    <TooltipWithPortal handle={market?.indexToken.symbol} renderContent={() => p.market} />
                    &nbsp;{p.isLong ? "long" : "short"}
                  </td>
                  <td>
                    {formatAmount(p.collateralAmount, collateralToken.decimals)} {collateralToken.symbol}
                  </td>
                  <td>{formatUsd(bigNumberify(p.sizeInUsd))}</td>
                  <td>
                    {formatAmount(p.sizeInTokens, market.indexToken.decimals, 2, true)}&nbsp;{market.indexToken.symbol}
                  </td>
                  <td>
                    {formatUsd(p.pendingPnl)} ({formatUsd(p.pendingPnl.sub(p.totalPendingCost))})
                  </td>
                  <td>-{formatUsd(BigNumber.from(p.totalPendingCost))}</td>
                  <td>{new Date(p.snapshotTimestamp * 1000).toISOString().substring(0, 10)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </>
    );
  }, [tab, snapshotPositions, marketsInfoData, chainId]);

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
      {error ? <div>{error.toString()}</div> : null}
      <Tab options={TAB_OPTIONS} option={tab} onChange={setTab} className="Exchange-swap-option-tabs" />
      {renderAccounts()}
      {renderPositions()}
      {renderSnapshotPositions()}
    </div>
  );
}
