import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { getTotalClaimableFundingUsd, useMarketsInfo } from "domain/synthetics/markets";
import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";

import "./ClaimableCard.scss";

type Props = {
  onClaimClick: () => void;
};

export function ClaimableCard(p: Props) {
  const { onClaimClick } = p;
  const { account } = useWeb3React();
  const { chainId } = useChainId();
  const { marketsInfoData } = useMarketsInfo(chainId);

  const markets = Object.values(marketsInfoData || {});

  const totalClaimableFundingUsd = getTotalClaimableFundingUsd(markets);

  return (
    <div className="Exchange-swap-market-box App-box App-box-border">
      <div className="App-card-title">
        <Trans>Claimable funding</Trans>
      </div>
      <div className="App-card-divider" />

      <ExchangeInfoRow label={t`Funding Fees`} value={formatUsd(totalClaimableFundingUsd)} />
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
