import { t, Trans } from "@lingui/macro";
import { useChainId } from "lib/chains";
import { getIcon } from "config/icons";
import { bigNumberify, formatAmount, formatUsd } from "lib/numbers";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { BigNumber } from "ethers";
import { useLeaderboardData, useLeaderboardPositions } from "domain/synthetics/leaderboard";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { getToken } from "config/tokens";
import Tab from "../../components/Tab/Tab";
import { ethers } from "ethers";

import "./LeaderboardTest.css";
import { useCallback, useMemo, useState } from "react";
import { useLocalStorage } from "react-use";

const TAB_OPTIONS = ["accounts", "positions", "snapshots"];

export default function LeaderboardTest() {
  const { chainId } = useChainId();
  const [from, setFrom] = useLocalStorage<string | undefined>("LeaderboardTest-from");
  const [to, setTo] = useLocalStorage<string | undefined>("LeaderboardTest-to");
  const [account, setAccount] = useLocalStorage<string | undefined>("LeaderboardTest-account");
  const [market, setMarket] = useLocalStorage<string | undefined>("LeaderboardTest-market");

  const accountNormalized = useMemo(() => {
    if (account?.length === 42) {
      try {
        return ethers.utils.getAddress(account);
        // eslint-disable-next-line
      } catch (ex) {}
    }
  }, [account]);

  const marketNormalized = useMemo(() => {
    if (market?.length === 42) {
      try {
        return ethers.utils.getAddress(market);
        // eslint-disable-next-line
      } catch (ex) {}
    }
  }, [market]);

  const { data, error } = useLeaderboardData(chainId, {
    account: accountNormalized,
    market: marketNormalized,
    from: from ? Number(new Date(from)) / 1000 : undefined,
    to: to ? Number(new Date(to)) / 1000 : undefined,
  });
  const marketsInfoData = useMarketsInfoData();
  const { accounts, positions } = data;

  const { data: snapshotPositions } = useLeaderboardPositions(chainId, { account, market, isSnapshot: true }, [
    "snapshotTimestamp_DESC",
  ]);

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
              <th>pnl</th>
              <th>pnl %</th>
              <th>fees (paid / pending)</th>
              <th>total / max collateral</th>
              <th>cum size / collateral</th>
              <th>avg size</th>
              <th>lev</th>
              <th>count</th>
              <th>volume</th>
            </tr>
          </thead>
          <tbody>
            {accounts?.map((d) => {
              return (
                <tr key={d.account}>
                  <td>
                    <TooltipWithPortal handle={d.account.substring(0, 10)} renderContent={() => d.account} />
                  </td>
                  <td>
                    <TooltipWithPortal
                      handle={formatUsd(d.totalPnlAfterFees)}
                      renderContent={() => (
                        <>
                          <div>realized pnl {formatUsd(d.realizedPnl)}</div>
                          <div>pending pnl {formatUsd(d.pendingPnl)}</div>
                          <div>pending pnl at the start {formatUsd(d.startPendingPnl)}</div>
                          <div>paid fees {formatUsd(d.paidFees)}</div>
                          <div>pending fees {formatUsd(d.pendingFees)}</div>
                          <div>pending fees at the start {formatUsd(d.startPendingFees)}</div>
                        </>
                      )}
                    />
                  </td>
                  <td>{formatAmount(d.totalPnlAfterFees.mul(10000).div(d.maxCollateral), 2, 2)}%</td>
                  <td>
                    {formatUsd(d.paidFees)} / {formatUsd(d.pendingFees)}
                  </td>
                  <td>
                    {formatUsd(d.netCollateral)} / {formatUsd(d.maxCollateral)}
                  </td>
                  <td>
                    {formatUsd(d.cumsumSize, { displayDecimals: 0 })} /{" "}
                    {formatUsd(d.cumsumCollateral, { displayDecimals: 0 })}
                  </td>
                  <td>{d.totalCount > 0 ? formatUsd(d.sumMaxSize.div(d.totalCount), { displayDecimals: 0 }) : null}</td>
                  <td>{formatAmount(d.cumsumSize.mul(10000).div(d.cumsumCollateral), 4, 2)}x</td>
                  <td>
                    {d.closedCount} ({d.totalCount - d.closedCount})
                  </td>
                  <td>{formatUsd(d.volume)}</td>
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
              <th>key</th>
              <th>market</th>
              <th>collateral</th>
              <th>size</th>
              <th>size in tokens</th>
              <th>pending pnl (after fees)</th>
              <th>pending fees</th>
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
                  <td>
                    <TooltipWithPortal handle={p.account.substring(0, 10)} renderContent={() => p.account} />
                  </td>
                  <td>
                    <TooltipWithPortal handle={p.key.substring(0, 10)} renderContent={() => p.key} />
                  </td>
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
                    {formatUsd(p.pendingPnl)} ({formatUsd(p.pendingPnl.sub(p.pendingFees))})
                  </td>
                  <td>-{formatUsd(BigNumber.from(p.pendingFees))}</td>
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
              <th>key</th>
              <th>market</th>
              <th>collateral</th>
              <th>size</th>
              <th>size in tokens</th>
              <th>pending pnl (after fees)</th>
              <th>fees (paid / pending)</th>
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
                  <td>
                    <TooltipWithPortal handle={p.account.substring(0, 10)} renderContent={() => p.account} />
                  </td>
                  <td>
                    <TooltipWithPortal handle={p.key.substring(0, 10)} renderContent={() => p.key} />
                  </td>
                  <td>
                    <TooltipWithPortal
                      handle={market?.indexToken.symbol}
                      renderContent={() => (
                        <>
                          {p.market}
                          <br />
                          {market.indexToken.symbol} {market.indexToken.address}
                          <br />
                          {market.longToken.symbol} {market.longToken.address}
                          <br />
                          {market.shortToken.symbol} {market.shortToken.address}
                          <br />
                        </>
                      )}
                    />
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
                    {formatUsd(p.pendingPnl)} ({formatUsd(p.pendingPnl.sub(p.pendingFees))})
                  </td>
                  <td>
                    {formatUsd(BigNumber.from(p.paidFees).add(p.pendingFees))} ({formatUsd(BigNumber.from(p.paidFees))}{" "}
                    / {formatUsd(BigNumber.from(p.pendingFees))})
                  </td>
                  <td>
                    <TooltipWithPortal
                      handle={new Date(p.snapshotTimestamp * 1000).toISOString().substring(0, 10)}
                      renderContent={() => p.snapshotTimestamp}
                    />
                  </td>
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
          <div className="LeaderboardTest-form">
            <div>
              <label>Account:</label> <input type="text" value={account} onChange={(e) => setAccount(e.target.value)} />
            </div>
            {tab === "accounts" ? (
              <>
                <div>
                  <label>From:</label> <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <label>To:</label> <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </>
            ) : (
              <div>
                <label>Market:</label> <input type="text" value={market} onChange={(e) => setMarket(e.target.value)} />
              </div>
            )}
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
