import { t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import {
  Market,
  getClaimableFundingAmount,
  getMarketName,
  getTotalClaimableFundingUsd,
  useMarketsData,
  useMarketsPoolsData,
} from "domain/synthetics/markets";
import { convertToUsd, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { formatTokenAmount, formatUsd } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import Tooltip from "components/Tooltip/Tooltip";
import { claimCollateralTxn } from "domain/synthetics/markets/claimCollateralTxn";

import "./ClaimModal.scss";

type Props = {
  onClose: () => void;
  setPendingTxns: (txns: any) => void;
};

export function ClaimModal(p: Props) {
  const { onClose, setPendingTxns } = p;
  const { account, library } = useWeb3React();
  const { chainId } = useChainId();
  const { marketsData } = useMarketsData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  const totalClaimableFundingUsd = getTotalClaimableFundingUsd(marketsData, poolsData, tokensData);

  function renderMarketSection(market: Market) {
    const marketName = getMarketName(marketsData, tokensData, market.marketTokenAddress, false, false);
    const longToken = getTokenData(tokensData, market.longTokenAddress);
    const shortToken = getTokenData(tokensData, market.shortTokenAddress);

    const fundingLongAmount = getClaimableFundingAmount(poolsData, market.marketTokenAddress, true);
    const fundingShortAmount = getClaimableFundingAmount(poolsData, market.marketTokenAddress, false);

    const fundingLongUsd = convertToUsd(fundingLongAmount, longToken?.decimals, longToken?.prices?.minPrice);
    const fundingShortUsd = convertToUsd(fundingShortAmount, shortToken?.decimals, shortToken?.prices?.minPrice);

    const totalFundingUsd = BigNumber.from(0)
      .add(fundingLongUsd || 0)
      ?.add(fundingShortUsd || 0);

    if (!totalFundingUsd?.gt(0)) return null;

    return (
      <div key={market.marketTokenAddress} className="App-card-content">
        <ExchangeInfoRow className="ClaimModal-row" label={t`Market`} value={marketName} />
        <ExchangeInfoRow
          className="ClaimModal-row"
          label={t`Funding fee`}
          value={
            <Tooltip
              className="ClaimModal-row-tooltip"
              handle={formatUsd(totalFundingUsd)}
              position="right-bottom"
              renderContent={() => (
                <>
                  {fundingLongAmount?.gt(0) &&
                    formatTokenAmount(fundingLongAmount, longToken?.decimals, longToken?.symbol)}
                  {fundingShortAmount?.gt(0) &&
                    formatTokenAmount(fundingShortAmount, shortToken?.decimals, shortToken?.symbol)}
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
    if (!account || !library) return;

    const markets = Object.values(marketsData);

    const fundingMarketAddresses: string[] = [];
    const fundingTokenAddresses: string[] = [];

    for (const market of markets) {
      if (getClaimableFundingAmount(poolsData, market.marketTokenAddress, true)?.gt(0)) {
        fundingMarketAddresses.push(market.marketTokenAddress);
        fundingTokenAddresses.push(market.longTokenAddress);
      }

      if (getClaimableFundingAmount(poolsData, market.marketTokenAddress, false)?.gt(0)) {
        fundingMarketAddresses.push(market.marketTokenAddress);
        fundingTokenAddresses.push(market.shortTokenAddress);
      }
    }

    claimCollateralTxn(chainId, library, {
      account,
      fundingFees: {
        marketAddresses: fundingMarketAddresses,
        tokenAddresses: fundingTokenAddresses,
      },
      setPendingTxns,
    }).then(onClose);
  }

  return (
    <Modal className="Confirmation-box" isVisible={true} setIsVisible={onClose} label={t`Confirm Claim`}>
      <div className="ConfirmationBox-main text-center">Claim {formatUsd(totalClaimableFundingUsd)}</div>
      <div className="ClaimModal-content">{Object.values(marketsData).map(renderMarketSection)}</div>
      <SubmitButton onClick={onSubmit}>{t`Claim`}</SubmitButton>
    </Modal>
  );
}
