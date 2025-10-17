import { t, Trans } from "@lingui/macro";
import { useCallback, useMemo, useState } from "react";

import {
  getMarketIndexName,
  getMarketPoolName,
  MarketsInfoData,
  useMarketsInfoRequest,
} from "domain/synthetics/markets";
import { claimAffiliateRewardsTxn } from "domain/synthetics/referrals/claimAffiliateRewardsTxn";
import { AffiliateReward } from "domain/synthetics/referrals/types";
import { useAffiliateRewards } from "domain/synthetics/referrals/useAffiliateRewards";
import { getTotalClaimableAffiliateRewardsUsd } from "domain/synthetics/referrals/utils";
import { convertToUsd, useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import Modal from "components/Modal/Modal";
import { Table, TableTd, TableTh, TableTheadTr } from "components/Table/Table";
import Tooltip from "components/Tooltip/Tooltip";

type Props = {
  onClose: () => void;
  setPendingTxns?: (txns: any) => void;
};

export function ClaimAffiliatesModal(p: Props) {
  const { onClose, setPendingTxns = () => null } = p;
  const { account, signer } = useWallet();
  const { chainId, srcChainId } = useChainId();

  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });
  const { affiliateRewardsData } = useAffiliateRewards(chainId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rewards = Object.values(affiliateRewardsData || {});

  const [selectedMarketAddresses, setSelectedMarketAddresses] = useState<string[]>([]);

  const handleToggleSelect = useCallback((marketAddress: string) => {
    setSelectedMarketAddresses((prev) => {
      if (prev.includes(marketAddress)) {
        return prev.filter((address) => address !== marketAddress);
      }
      return [...prev, marketAddress];
    });
  }, []);

  const totalClaimableFundingUsd =
    marketsInfoData && affiliateRewardsData
      ? getTotalClaimableAffiliateRewardsUsd(marketsInfoData, affiliateRewardsData)
      : 0n;

  const selectedRewards = rewards.filter((reward) => selectedMarketAddresses.includes(reward.marketAddress));

  function onSubmit() {
    if (!account || !signer || !affiliateRewardsData || !marketsInfoData) return;

    const marketAddresses: string[] = [];
    const tokenAddresses: string[] = [];

    for (const reward of selectedRewards) {
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

  const isButtonDisabled = isSubmitting || selectedMarketAddresses.length === 0;
  const buttonText = useMemo(() => {
    if (isSubmitting) {
      return t`Claiming...`;
    }
    if (selectedMarketAddresses.length === 0) {
      return t`No rewards selected`;
    }
    return t`Claim`;
  }, [isSubmitting, selectedMarketAddresses.length]);

  const isAllChecked = selectedMarketAddresses.length === rewards.length;

  const handleToggleSelectAll = useCallback(() => {
    if (isAllChecked) {
      setSelectedMarketAddresses([]);
    } else {
      setSelectedMarketAddresses(rewards.map((reward) => reward.marketAddress));
    }
  }, [isAllChecked, rewards, setSelectedMarketAddresses]);

  return (
    <Modal
      contentClassName="w-[400px] overflow-y-auto"
      isVisible={true}
      setIsVisible={onClose}
      label={t`Confirm Claim`}
    >
      <div className="flex flex-col gap-12">
        <div className="text-center text-20 font-medium">Claim {formatUsd(totalClaimableFundingUsd)}</div>

        <Table>
          <TableTheadTr>
            <TableTh className="w-[20px] !pl-0">
              <Checkbox
                isChecked={isAllChecked}
                setIsChecked={handleToggleSelectAll}
                isPartialChecked={selectedMarketAddresses.length > 0 && selectedMarketAddresses.length < rewards.length}
              />
            </TableTh>
            <TableTh>
              <Trans>Market</Trans>
            </TableTh>
            <TableTh className="!pr-0">
              <Trans>Rewards</Trans>
            </TableTh>
          </TableTheadTr>
          {rewards.map((reward) => (
            <ClaimRewardRow
              key={reward.marketAddress}
              reward={reward}
              marketsInfoData={marketsInfoData}
              isSelected={selectedMarketAddresses.includes(reward.marketAddress)}
              onToggleSelect={handleToggleSelect}
            />
          ))}
        </Table>

        <Button className="w-full" variant="primary-action" onClick={onSubmit} disabled={isButtonDisabled}>
          {buttonText}
        </Button>
      </div>
    </Modal>
  );
}

function ClaimRewardRow({
  reward,
  marketsInfoData,
  isSelected,
  onToggleSelect,
}: {
  reward: AffiliateReward;
  marketsInfoData: MarketsInfoData | undefined;
  isSelected: boolean;
  onToggleSelect: (marketAddress: string) => void;
}) {
  const handleToggleSelect = useCallback(() => {
    onToggleSelect(reward.marketAddress);
  }, [onToggleSelect, reward.marketAddress]);

  const marketInfo = getByKey(marketsInfoData, reward.marketAddress);
  if (!marketInfo) {
    return null;
  }

  const { longToken, shortToken, isSameCollaterals } = marketInfo;
  const indexName = getMarketIndexName(marketInfo);
  const poolName = getMarketPoolName(marketInfo);

  const { longTokenAmount, shortTokenAmount } = reward;

  const longRewardUsd = convertToUsd(longTokenAmount, longToken.decimals, longToken.prices.minPrice)!;

  let totalReward = longRewardUsd;

  if (!isSameCollaterals) {
    const shortRewardUsd = convertToUsd(shortTokenAmount, shortToken.decimals, shortToken.prices.minPrice)!;
    totalReward += shortRewardUsd;
  }

  if (totalReward <= 0) {
    return null;
  }

  const claimableAmountsItems: string[] = [];

  if (longTokenAmount > 0) {
    claimableAmountsItems.push(
      formatTokenAmount(longTokenAmount, longToken.decimals, longToken.symbol, { isStable: longToken.isStable })!
    );
  }

  if (!isSameCollaterals && shortTokenAmount > 0) {
    claimableAmountsItems.push(
      formatTokenAmount(shortTokenAmount, shortToken.decimals, shortToken.symbol, { isStable: shortToken.isStable })!
    );
  }

  return (
    <tr>
      <TableTd className="!pl-0">
        <Checkbox isChecked={isSelected} setIsChecked={handleToggleSelect} />
      </TableTd>
      <TableTd>
        <div className="flex items-center">
          <span>{indexName}</span>
          <span className="subtext">[{poolName}]</span>
        </div>
      </TableTd>

      <TableTd className="!pr-0">
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
      </TableTd>
    </tr>
  );
}
