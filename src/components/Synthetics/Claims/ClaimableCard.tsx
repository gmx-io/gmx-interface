import { Trans, t } from "@lingui/macro";
import Tooltip from "components/Tooltip/Tooltip";
import { MarketsInfoData, getTotalClaimableFundingUsd } from "domain/synthetics/markets";
import { formatUsd } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";

type Props = {
  marketsInfoData: MarketsInfoData | undefined;
  onClaimClick: () => void;
};

export function ClaimableCard({ marketsInfoData, onClaimClick }: Props) {
  const { account } = useWallet();
  const markets = Object.values(marketsInfoData ?? {});
  const totalClaimableFundingUsd = getTotalClaimableFundingUsd(markets);
  const totalUsd = formatUsd(totalClaimableFundingUsd);

  return (
    <div className="TradeHistoryRow App-box">
      <div className="Claims-row">
        <div className="Claims-col Claims-col-title">
          <Trans>Claimable</Trans>
        </div>
        <div className="Claims-col">
          <span className="muted">
            <Trans>Funding fees</Trans>
          </span>
          <span>
            <Tooltip
              handle={totalUsd}
              position="left-bottom"
              renderContent={() => {
                return t`Positive Funding Fees for a position become claimable after the position is increased, decreased or closed.`;
              }}
            />
          </span>
        </div>
        <div className="Claims-col">
          <span className="muted">
            <Trans>Total claimable</Trans>
          </span>
          <span>{totalUsd}</span>
        </div>
        {account && totalClaimableFundingUsd.gt(0) && (
          <button className="App-button-option App-card-option Claims-claim-button" onClick={onClaimClick}>
            <Trans>Claim</Trans>
          </button>
        )}
      </div>
    </div>
  );
}
