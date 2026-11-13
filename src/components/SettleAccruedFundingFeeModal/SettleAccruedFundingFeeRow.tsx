import { t } from "@lingui/macro";
import { useCallback } from "react";

import { PositionInfo } from "domain/synthetics/positions";
import { TokenData } from "domain/synthetics/tokens";
import { formatTokenAmount } from "lib/numbers";

import Checkbox from "components/Checkbox/Checkbox";
import { DeltaUsdValue } from "components/NumericValue/DeltaUsdValue";
import StandardTooltip from "components/Tooltip/StandardTooltip";
import { TooltipText } from "components/Tooltip/TooltipBlocks";

import WarnIcon from "img/ic_warn.svg?react";

import { SettlementBlockReason } from "./utils";

type Props = {
  position: PositionInfo;
  isMarketDisabled: boolean;
  blockReason: SettlementBlockReason | undefined;
  isSelected: boolean;
  onCheckboxChange: (value: boolean, positionKey: string) => void;
};

function getBlockedTooltipContent(
  isMarketDisabled: boolean,
  blockReason: SettlementBlockReason | undefined
): string | undefined {
  if (isMarketDisabled) {
    return t`This market is disabled. Contact support to claim your remaining funding fees.`;
  }

  if (blockReason === "negativeMargin") {
    return t`This position has a negative margin after pending borrow and funding fees, so settlement is likely to fail: positive funding only becomes claimable after a successful settlement. Add margin, or close enough of the position for the realized profit to cover the shortfall.`;
  }

  if (blockReason === "belowMinCollateral") {
    return t`This position's margin is below the minimum required for its size, so settlement will fail. Add margin, or close the position. Closing settles the funding automatically.`;
  }

  return undefined;
}

export const SettleAccruedFundingFeeRow = ({
  position,
  isMarketDisabled,
  blockReason,
  isSelected,
  onCheckboxChange,
}: Props) => {
  const { indexName, poolName } = position;

  const handleCheckboxChange = useCallback(
    (value: boolean) => onCheckboxChange(value, position.key),
    [onCheckboxChange, position.key]
  );

  const shortToken = position.shortToken;
  const longToken = position.longToken;

  const renderTooltipContent = useCallback(
    () => (
      <TooltipText>
        {(
          [
            [position.claimableLongTokenAmount, longToken],
            [position.claimableShortTokenAmount, shortToken],
          ] as [bigint, TokenData][]
        )
          .filter(([amount, token]) => amount > 0 && token)
          .map(([amount, token]) => (
            <div key={token.address}>
              {formatTokenAmount(amount, token.decimals, token.symbol, { isStable: token.isStable })}
            </div>
          ))}
      </TooltipText>
    ),
    [longToken, position.claimableLongTokenAmount, position.claimableShortTokenAmount, shortToken]
  );

  const blockedTooltipContent = getBlockedTooltipContent(isMarketDisabled, blockReason);

  const checkbox = (
    <Checkbox
      isChecked={isSelected}
      setIsChecked={handleCheckboxChange}
      disabled={blockedTooltipContent !== undefined}
      className="ClaimSettleModal-checkbox flex self-center"
    >
      <div className="Exchange-info-label ClaimSettleModal-checkbox-label">
        <div className="flex items-start">
          <span className="ClaimSettleModal-row-text">
            {position.isLong ? t`Long` : t`Short`} {indexName}
          </span>{" "}
          <span className="subtext">[{poolName}]</span>
          {blockedTooltipContent !== undefined && (
            <WarnIcon className="ml-4 self-center text-yellow-300" aria-label={t`Warning icon`} />
          )}
        </div>
      </div>
    </Checkbox>
  );

  return (
    <div className="ClaimSettleModal-info-row">
      {blockedTooltipContent === undefined ? (
        checkbox
      ) : (
        <StandardTooltip variant="none" isHandlerDisabled handle={checkbox} content={blockedTooltipContent} />
      )}
      <div className="ClaimSettleModal-info-label-usd">
        <StandardTooltip
          position="bottom-end"
          handle={<DeltaUsdValue deltaUsd={position.pendingClaimableFundingFeesUsd} />}
          renderContent={renderTooltipContent}
        />
      </div>
    </div>
  );
};
