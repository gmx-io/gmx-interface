import { t } from "@lingui/macro";
import Button from "components/Button/Button";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import Modal from "components/Modal/Modal";
import Tooltip from "components/Tooltip/Tooltip";
import { getMarketIndexName, getMarketPoolName, useMarketsInfoRequest } from "domain/synthetics/markets";
import { AffiliateReward } from "domain/synthetics/referrals/types";
import { useAffiliateRewards } from "domain/synthetics/referrals/useAffiliateRewards";
import { getTotalClaimableAffiliateRewardsUsd } from "domain/synthetics/referrals/utils";
import { convertToUsd } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { claimAffiliateRewardsTxn } from "domain/synthetics/referrals/claimAffiliateRewardsTxn";

import "./ClaimAffiliatesModal.scss";
import { useState } from "react";
import useWallet from "lib/wallets/useWallet";

type Props = {
  onClose: () => void;
  setPendingTxns?: (txns: any) => void;
};

export function ClaimAffiliatesModal(p: Props) {
  const { onClose, setPendingTxns = () => null } = p;
  const { account, signer } = useWallet();
  const { chainId } = useChainId();

  const { marketsInfoData } = useMarketsInfoRequest(chainId);
  const { affiliateRewardsData } = useAffiliateRewards(chainId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rewards = Object.values(affiliateRewardsData || {});

  const totalClaimableFundingUsd =
    marketsInfoData && affiliateRewardsData
      ? getTotalClaimableAffiliateRewardsUsd(marketsInfoData, affiliateRewardsData)
      : 0n;

  function renderRewardSection(reward: AffiliateReward) {
    const marketInfo = getByKey(marketsInfoData, reward.marketAddress);
    if (!marketInfo) {
      return null;
    }

    const { longToken, shortToken } = marketInfo;
    const indexName = getMarketIndexName(marketInfo);
    const poolName = getMarketPoolName(marketInfo);

    const { longTokenAmount, shortTokenAmount } = reward;

    const longRewardUsd = convertToUsd(longTokenAmount, longToken.decimals, longToken.prices.minPrice)!;
    const shortRewardUsd = convertToUsd(shortTokenAmount, shortToken.decimals, shortToken.prices.minPrice)!;

    const totalReward = longRewardUsd + shortRewardUsd;

    if (totalReward <= 0) {
      return null;
    }

    const claimableAmountsItems: string[] = [];

    if (longTokenAmount > 0) {
      claimableAmountsItems.push(formatTokenAmount(longTokenAmount, longToken.decimals, longToken.symbol)!);
    }

    if (shortTokenAmount > 0) {
      claimableAmountsItems.push(formatTokenAmount(shortTokenAmount, shortToken.decimals, shortToken.symbol)!);
    }

    return (
      <div key={marketInfo.marketTokenAddress} className="App-card-content">
        <ExchangeInfoRow
          className="ClaimModal-row"
          label={t`Market`}
          value={
            <div className="flex items-center">
              <span>{indexName}</span>
              <span className="subtext">[{poolName}]</span>
            </div>
          }
        />
        <ExchangeInfoRow
          className="ClaimModal-row"
          label={t`Rewards`}
          value={
            <Tooltip
              className="ClaimModal-row-tooltip"
              handle={formatUsd(totalReward)}
              position="top-end"
              renderContent={() => (
                <>
                  {claimableAmountsItems.map((item) => (
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
    if (!account || !signer || !affiliateRewardsData || !marketsInfoData) return;

    const marketAddresses: string[] = [];
    const tokenAddresses: string[] = [];

    for (const reward of rewards) {
      const market = getByKey(marketsInfoData, reward.marketAddress);

      if (!market) {
        continue;
      }

      if (reward.longTokenAmount > 0) {
        marketAddresses.push(market.marketTokenAddress);
        tokenAddresses.push(market.longTokenAddress);
      }

      if (reward.shortTokenAmount > 0) {
        marketAddresses.push(market.marketTokenAddress);
        tokenAddresses.push(market.shortTokenAddress);
      }
    }

    setIsSubmitting(true);

    claimAffiliateRewardsTxn(chainId, signer, {
      account,
      rewardsParams: {
        marketAddresses: marketAddresses,
        tokenAddresses: tokenAddresses,
      },
      setPendingTxns,
    })
      .then(onClose)
      .finally(() => setIsSubmitting(false));
  }

  return (
    <Modal className="Confirmation-box ClaimableModal" isVisible={true} setIsVisible={onClose} label={t`Confirm Claim`}>
      <div className="ConfirmationBox-main text-center">Claim {formatUsd(totalClaimableFundingUsd)}</div>
      <div className="ClaimModal-content">{rewards.map(renderRewardSection)}</div>
      <Button className="w-full" variant="primary-action" onClick={onSubmit} disabled={isSubmitting}>
        {isSubmitting ? t`Claiming...` : t`Claim`}
      </Button>
    </Modal>
  );
}
