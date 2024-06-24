import { Trans, t } from "@lingui/macro";
import Modal from "components/Modal/Modal";
import {
  MarketInfo,
  getMarketIndexName,
  getMarketPoolName,
  getTotalClaimableFundingUsd,
} from "domain/synthetics/markets";
import { convertToUsd } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatDeltaUsd, formatTokenAmount } from "lib/numbers";

import Tooltip from "components/Tooltip/Tooltip";
import { claimFundingFeesTxn } from "domain/synthetics/markets/claimFundingFeesTxn";

import Button from "components/Button/Button";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import useWallet from "lib/wallets/useWallet";
import { useState } from "react";
import "./ClaimModal.scss";

type Props = {
  isVisible: boolean;
  onClose: () => void;
  setPendingTxns: (txns: any) => void;
};

export function ClaimModal(p: Props) {
  const { isVisible, onClose, setPendingTxns } = p;
  const { account, signer } = useWallet();
  const { chainId } = useChainId();
  const marketsInfoData = useMarketsInfoData();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const markets = isVisible ? Object.values(marketsInfoData || {}) : [];

  const totalClaimableFundingUsd = getTotalClaimableFundingUsd(markets);

  function renderMarketSection(market: MarketInfo) {
    const indexName = getMarketIndexName(market);
    const poolName = getMarketPoolName(market);
    const longToken = market.longToken;
    const shortToken = market.shortToken;

    const fundingLongAmount = market.claimableFundingAmountLong;
    const fundingShortAmount = market.claimableFundingAmountShort;

    const fundingLongUsd = convertToUsd(fundingLongAmount, longToken?.decimals, longToken?.prices?.minPrice);
    const fundingShortUsd = convertToUsd(fundingShortAmount, shortToken?.decimals, shortToken?.prices?.minPrice);

    const totalFundingUsd = (fundingLongUsd ?? 0n) + (fundingShortUsd ?? 0n);

    if (totalFundingUsd <= 0) return null;

    const claimableAmountsItems: string[] = [];

    if (fundingLongAmount !== undefined) {
      claimableAmountsItems.push(formatTokenAmount(fundingLongAmount, longToken.decimals, longToken.symbol)!);
    }

    if (fundingShortAmount !== undefined) {
      claimableAmountsItems.push(formatTokenAmount(fundingShortAmount, shortToken.decimals, shortToken.symbol)!);
    }

    return (
      <div key={market.marketTokenAddress} className="ClaimSettleModal-info-row">
        <div className="flex">
          <div className="Exchange-info-label ClaimSettleModal-checkbox-label">
            <div className="ClaimSettleModal-row-text flex items-start">
              <span>{indexName}</span>
              {poolName ? <span className="subtext">[{poolName}]</span> : null}
            </div>
          </div>
        </div>
        <div className="ClaimSettleModal-info-label-usd">
          <Tooltip
            className="ClaimSettleModal-tooltip"
            position="top-end"
            handle={formatDeltaUsd(totalFundingUsd)}
            renderContent={() => (
              <>
                {claimableAmountsItems.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </>
            )}
          />
        </div>
      </div>
    );
  }

  function onSubmit() {
    if (!account || !signer) return;

    const fundingMarketAddresses: string[] = [];
    const fundingTokenAddresses: string[] = [];

    for (const market of markets) {
      if (market.claimableFundingAmountLong !== undefined) {
        fundingMarketAddresses.push(market.marketTokenAddress);
        fundingTokenAddresses.push(market.longTokenAddress);
      }

      if (market.claimableFundingAmountShort !== undefined) {
        fundingMarketAddresses.push(market.marketTokenAddress);
        fundingTokenAddresses.push(market.shortTokenAddress);
      }
    }

    setIsSubmitting(true);

    claimFundingFeesTxn(chainId, signer, {
      account,
      fundingFees: {
        marketAddresses: fundingMarketAddresses,
        tokenAddresses: fundingTokenAddresses,
      },
      setPendingTxns,
    })
      .then(onClose)
      .finally(() => setIsSubmitting(false));
  }

  return (
    <Modal
      className="Confirmation-box ClaimableModal"
      isVisible={p.isVisible}
      setIsVisible={onClose}
      label={t`Confirm Claim`}
    >
      <div className="ConfirmationBox-main">
        <div className="text-center">
          <Trans>
            Claim <span>{formatDeltaUsd(totalClaimableFundingUsd)}</span>
          </Trans>
        </div>
      </div>
      <div className="App-card-divider ClaimModal-divider" />
      <div className="ClaimSettleModal-info-row">
        <div className="flex">
          <div className="Exchange-info-label ClaimSettleModal-checkbox-label">
            <div className="flex items-start">
              <Trans>MARKET</Trans>
            </div>
          </div>
        </div>
        <div className="ClaimSettleModal-info-label-usd">
          <Tooltip
            className="ClaimSettleModal-tooltip-text-gray"
            position="top-end"
            handle={t`FUNDING FEE`}
            renderContent={() => (
              <Trans>
                <span className="text-white">Claimable Funding Fee.</span>
              </Trans>
            )}
          />
        </div>
      </div>
      <div className="ClaimModal-content">{markets.map(renderMarketSection)}</div>
      <Button className="w-full" variant="primary-action" onClick={onSubmit} disabled={isSubmitting}>
        {isSubmitting ? t`Claiming...` : t`Claim`}
      </Button>
    </Modal>
  );
}
