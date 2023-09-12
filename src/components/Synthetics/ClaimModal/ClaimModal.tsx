import { t } from "@lingui/macro";
import Modal from "components/Modal/Modal";
import {
  MarketInfo,
  MarketsInfoData,
  getMarketIndexName,
  getMarketPoolName,
  getTotalClaimableFundingUsd,
} from "domain/synthetics/markets";
import { convertToUsd } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { formatTokenAmount, formatUsd } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import Tooltip from "components/Tooltip/Tooltip";
import { claimCollateralTxn } from "domain/synthetics/markets/claimCollateralTxn";

import Button from "components/Button/Button";
import { useState } from "react";
import "./ClaimModal.scss";
import useWallet from "lib/wallets/useWallet";

type Props = {
  isVisible: boolean;
  marketsInfoData?: MarketsInfoData;
  onClose: () => void;
  setPendingTxns: (txns: any) => void;
};

export function ClaimModal(p: Props) {
  const { isVisible, onClose, setPendingTxns, marketsInfoData } = p;
  const { account, signer } = useWallet();
  const { chainId } = useChainId();

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

    const totalFundingUsd = BigNumber.from(0)
      .add(fundingLongUsd || 0)
      ?.add(fundingShortUsd || 0);

    if (!totalFundingUsd?.gt(0)) return null;

    const claimableAmountsItems: string[] = [];

    if (fundingLongAmount?.gt(0)) {
      claimableAmountsItems.push(formatTokenAmount(fundingLongAmount, longToken.decimals, longToken.symbol)!);
    }

    if (fundingShortAmount?.gt(0)) {
      claimableAmountsItems.push(formatTokenAmount(fundingShortAmount, shortToken.decimals, shortToken.symbol)!);
    }

    return (
      <div key={market.marketTokenAddress} className="App-card-content">
        <ExchangeInfoRow
          className="ClaimModal-row"
          label={t`Market`}
          value={
            <div className="items-center">
              <span>{indexName && indexName}</span>
              <span className="subtext">{poolName && `[${poolName}]`}</span>
            </div>
          }
        />
        <ExchangeInfoRow
          className="ClaimModal-row"
          label={t`Funding fee`}
          value={
            <Tooltip
              className="ClaimModal-row-tooltip"
              handle={formatUsd(totalFundingUsd)}
              position="right-top"
              renderContent={() => (
                <>
                  {claimableAmountsItems.map((item, index) => (
                    <div key={item}>{item}</div>
                  ))}
                </>
              )}
            />
          }
        />

        <div className="App-card-divider ClaimModal-divider" />
      </div>
    );
  }

  function onSubmit() {
    if (!account || !signer) return;

    const fundingMarketAddresses: string[] = [];
    const fundingTokenAddresses: string[] = [];

    for (const market of markets) {
      if (market.claimableFundingAmountLong?.gt(0)) {
        fundingMarketAddresses.push(market.marketTokenAddress);
        fundingTokenAddresses.push(market.longTokenAddress);
      }

      if (market.claimableFundingAmountShort?.gt(0)) {
        fundingMarketAddresses.push(market.marketTokenAddress);
        fundingTokenAddresses.push(market.shortTokenAddress);
      }
    }

    setIsSubmitting(true);

    claimCollateralTxn(chainId, signer, {
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
      <div className="ConfirmationBox-main text-center">Claim {formatUsd(totalClaimableFundingUsd)}</div>
      <div className="ClaimModal-content">{markets.map(renderMarketSection)}</div>
      <Button className="w-full" variant="primary-action" onClick={onSubmit} disabled={isSubmitting}>
        {isSubmitting ? t`Claiming...` : t`Claim`}
      </Button>
    </Modal>
  );
}
