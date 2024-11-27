import { Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getLeaderboardLink } from "config/links";
import cx from "classnames";
import { useDynamicChainId } from "lib/chains";

export default function UsefulLinks({ className }) {
  const { chainId } = useDynamicChainId();
  const leaderBoardLink = getLeaderboardLink(chainId);
  const classNames = cx("Exchange-swap-market-box App-box App-box-border", className);
  return (
    <div className={classNames}>
      <div className="Exchange-swap-market-box-title">
        <Trans>Useful Links</Trans>
      </div>
      <div className="App-card-divider"></div>
      <div className="Exchange-info-row">
        <div className="Exchange-info-label-button">
          <ExternalLink href="https://docs.t3.money/tmx/trading">
            <Trans>Trading guide</Trans>
          </ExternalLink>
        </div>
      </div>
      <div className="Exchange-info-row">
        <div className="Exchange-info-label-button">
          <ExternalLink href={leaderBoardLink}>
            <Trans>Leaderboard</Trans>
          </ExternalLink>
        </div>
      </div>
      <div className="Exchange-info-row">
        <div className="Exchange-info-label-button">
          <ExternalLink href="https://docs.t3.money/tmx/trading#backup-rpc-urls">
            <Trans>Speed up page loading</Trans>
          </ExternalLink>
        </div>
      </div>
    </div>
  );
}
