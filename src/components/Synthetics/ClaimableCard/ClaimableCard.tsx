import { Trans, t } from "@lingui/macro";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { MarketsInfoData, getTotalClaimableFundingUsd } from "domain/synthetics/markets";
import { formatUsd } from "lib/numbers";

import Tooltip from "components/Tooltip/Tooltip";
import "./ClaimableCard.scss";
import useWallet from "lib/wallets/useWallet";

type Props = {
  marketsInfoData?: MarketsInfoData;
  onClaimClick: () => void;
};

export function ClaimableCard(p: Props) {
  const { onClaimClick, marketsInfoData } = p;
  const { account } = useWallet();

  const markets = Object.values(marketsInfoData || {});

  const totalClaimableFundingUsd = getTotalClaimableFundingUsd(markets);

  return (
    <div className="Exchange-swap-market-box App-box App-box-border">
      <div className="App-card-title">
        <Trans>Claimable Funding</Trans>
      </div>
      <div className="App-card-divider" />

      <ExchangeInfoRow
        label={t`Funding Fees`}
        value={
          <Tooltip
            handle={formatUsd(totalClaimableFundingUsd)}
            position="right-bottom"
            renderContent={() => {
              return t`Positive Funding Fees for a position become claimable after the position is increased, decreased or closed.`;
            }}
          />
        }
      />
      <ExchangeInfoRow label={t`Total Claimable`} value={formatUsd(totalClaimableFundingUsd)} />

      <div className="App-card-options ClaimableCard-actions">
        {account && totalClaimableFundingUsd.gt(0) && (
          <button className="App-button-option App-card-option" onClick={onClaimClick}>
            <Trans>Claim</Trans>
          </button>
        )}
      </div>
    </div>
  );
}
