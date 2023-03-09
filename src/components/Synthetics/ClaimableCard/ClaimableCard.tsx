import { Trans, t } from "@lingui/macro";
import { InfoRow } from "components/InfoRow/InfoRow";
import { getTotalClaimableFundingUsd, useMarketsData, useMarketsPoolsData } from "domain/synthetics/markets";
import { useAvailableTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";
import "./ClaimableCard.scss";
import { useWeb3React } from "@web3-react/core";

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
    <div className="App-card">
      <div className="App-card-title">
        <Trans>Claimable Assets</Trans>
      </div>
      <div className="App-card-divider" />
      <div className="App-card-content">
        <InfoRow className="info-row" label={t`Total Claimable`} value={formatUsd(totalClaimableFundingUsd)} />
        <InfoRow className="info-row" label={t`Funding Fees`} value={formatUsd(totalClaimableFundingUsd)} />
      </div>
      <div className="App-card-options ClaimableCard-actions">
        {account && (
          <button className="App-button-option App-card-option" onClick={onClaimClick}>
            <Trans>Claim</Trans>
          </button>
        )}
      </div>
    </div>
  );
}
