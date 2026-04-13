import cx from "classnames";
import { useCallback } from "react";

import { getMarketIndexName, getMarketPoolName, MarketsInfoData } from "domain/synthetics/markets";
import { AffiliateReward } from "domain/synthetics/referrals/types";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";

import Checkbox from "components/Checkbox/Checkbox";
import { TableTd } from "components/Table/Table";
import Tooltip from "components/Tooltip/Tooltip";

export function ClaimRewardRow({
  reward,
  rewardUsd,
  marketsInfoData,
  isSelected,
  onToggleSelect,
  isSelectionDisabled,
}: {
  reward: AffiliateReward;
  rewardUsd: bigint;
  marketsInfoData: MarketsInfoData | undefined;
  isSelected: boolean;
  onToggleSelect: (marketAddress: string) => void;
  isSelectionDisabled: boolean;
}) {
  const handleToggleSelect = useCallback(() => {
    if (isSelectionDisabled) {
      return;
    }

    onToggleSelect(reward.marketAddress);
  }, [isSelectionDisabled, onToggleSelect, reward.marketAddress]);

  const marketInfo = getByKey(marketsInfoData, reward.marketAddress);
  if (!marketInfo) {
    return null;
  }

  const { longToken, shortToken, isSameCollaterals } = marketInfo;
  const indexName = getMarketIndexName(marketInfo);
  const poolName = getMarketPoolName(marketInfo);
  const { longTokenAmount, shortTokenAmount } = reward;

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
    <tr className={cx(isSelectionDisabled && !isSelected && "opacity-50")}>
      <TableTd className="w-[20px] !pl-0">
        <Checkbox isChecked={isSelected} setIsChecked={handleToggleSelect} disabled={isSelectionDisabled} />
      </TableTd>
      <TableTd>
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center">
            <span>{indexName}</span>
            <span className="subtext">[{poolName}]</span>
          </div>
        </div>
      </TableTd>

      <TableTd className="!pr-0">
        <Tooltip
          className="ClaimModal-row-tooltip"
          handle={formatUsd(rewardUsd)}
          position="top-end"
          content={
            <>
              {claimableAmountsItems.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </>
          }
        />
      </TableTd>
    </tr>
  );
}
