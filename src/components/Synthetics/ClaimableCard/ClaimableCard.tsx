import { Trans, t } from "@lingui/macro";
import { InfoRow } from "components/InfoRow/InfoRow";
import { getTotalClaimableFundingUsd, useMarketsData, useMarketsPoolsData } from "domain/synthetics/markets";
import { useAvailableTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";
import { useWeb3React } from "@web3-react/core";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";

import "./ClaimableCard.scss";

type Props = {
  onClaimClick: () => void;
};

export function ClaimableCard(p: Props) {
  const { onClaimClick } = p;
  const { account } = useWeb3React();
  const { chainId } = useChainId();
  const { marketsData } = useMarketsData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  const totalClaimableFundingUsd = getTotalClaimableFundingUsd(marketsData, poolsData, tokensData);

  return (
    <div className="Exchange-swap-market-box App-box App-box-border">
      <div className="App-card-title">
        <Trans>Claimable funding and collateral</Trans>
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
