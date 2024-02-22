import SEO from "components/Common/SEO";
import { getPageTitle } from "lib/legacy";
import { t, Trans } from "@lingui/macro";
import { useChainId } from "lib/chains";
import { getIcon } from "config/icons";
import { bigNumberify, formatAmount, formatUsd } from "lib/numbers";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { BigNumber } from "ethers";
import { useLeaderboardData } from "domain/synthetics/leaderboard";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { getToken } from "config/tokens";
import { useParams } from "react-router-dom";

export default function LeaderboardTest() {
  const { chainId } = useChainId();
  const { account } = useParams<{ account?: string }>();

  const { accounts, positions } = useLeaderboardData(chainId, account);
  const marketsInfoData = useMarketsInfoData();

  return (
    <SEO title={getPageTitle("Leaderboards")}>
      <div className="default-container page-layout Leaderboard">
        <div className="section-title-block">
          <div className="section-title-content">
            <div className="Page-title">
              <Trans>Leaderboards</Trans> <img alt={t`Chain Icon`} src={getIcon(chainId, "network")} />
            </div>
            <div className="Page-description">
              <Trans>Addresses V2 trading statistics.</Trans>
            </div>
          </div>
        </div>
        <h3>Accounts ({accounts?.length})</h3>
        <table>
          <thead>
            <tr>
              <th>account</th>
              <th>pnl (realized / pending)</th>
              <th>%</th>
              <th>total cost (pending)</th>
              <th>total / max collateral</th>
              <th>cum size / collateral</th>
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
                  <td>{formatAmount(d.totalPnl.mul(10000).div(d.maxCollateral), 2, 0)}%</td>
                  <td>
                    {formatUsd(d.totalPaidCost)} / {formatUsd(d.totalPendingCost)})
                  </td>
                  <td>
                    {formatUsd(d.totalCollateral)} / {formatUsd(d.maxCollateral)}
                  </td>
                  <td>
                    {formatUsd(d.cumsumSize, { displayDecimals: 0 })} /{" "}
                    {formatUsd(d.cumsumCollateral, { displayDecimals: 0 })}
                  </td>
                  <td>{formatAmount(d.cumsumSize.mul(10000).div(d.cumsumCollateral), 4, 2)}x</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <h3>Positions ({positions?.length})</h3>
        <table>
          <thead>
            <tr>
              <th>account</th>
              <th>market</th>
              <th>collateral</th>
              <th>size</th>
              <th>size in tokens</th>
              <th>pending pnl</th>
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
      </div>
    </SEO>
  );
}
