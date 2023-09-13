import { Trans } from "@lingui/macro";
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
        <div className="Claims-col">
          <Trans>Claimable</Trans>
        </div>
        <div className="Claims-col">
          <span className="muted">
            <Trans>Funding fees</Trans>
          </span>
          <span>{totalUsd}</span>
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
