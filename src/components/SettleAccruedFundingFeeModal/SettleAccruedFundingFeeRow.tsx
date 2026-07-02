import { t, Trans } from "@lingui/macro";
import { useCallback } from "react";

import { PositionInfo } from "domain/synthetics/positions";
import { TokenData } from "domain/synthetics/tokens";
import { formatDeltaUsd, formatTokenAmount } from "lib/numbers";

import Checkbox from "components/Checkbox/Checkbox";
import Tooltip from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import WarnIcon from "img/ic_warn.svg?react";

type Props = {
  position: PositionInfo;
  isMarketDisabled: boolean;
  isSettlementLikelyToFail: boolean;
  isSelected: boolean;
  onCheckboxChange: (value: boolean, positionKey: string) => void;
};

export const SettleAccruedFundingFeeRow = ({
  position,
  isMarketDisabled,
  isSettlementLikelyToFail,
  isSelected,
  onCheckboxChange,
}: Props) => {
  const { indexName, poolName } = position;

  const labelContent = (
    <div key={position.key} className="flex items-start">
      <span className="ClaimSettleModal-row-text">
        {position.isLong ? t`Long` : t`Short`} {indexName}
      </span>{" "}
      <span className="subtext">[{poolName}]</span>
      {!isMarketDisabled && isSettlementLikelyToFail && (
        <WarnIcon className="ml-4 self-center text-yellow-300" aria-label={t`Warning icon`} />
      )}
    </div>
  );
  const label = isMarketDisabled ? (
    <TooltipWithPortal
      position="top-start"
      handle={labelContent}
      content={<Trans>This market is disabled. Contact support to claim your remaining funding fees.</Trans>}
    />
  ) : isSettlementLikelyToFail ? (
    <TooltipWithPortal
      position="top-start"
      handle={labelContent}
      content={
        <Trans>
          This position has a negative margin after pending borrow and funding fees, so settlement is likely to fail:
          positive funding only becomes claimable after a successful settlement. Add margin, or reduce or close enough
          of the position for the realized profit to cover the shortfall.
        </Trans>
      }
    />
  ) : (
    labelContent
  );
  const handleCheckboxChange = useCallback(
    (value: boolean) => onCheckboxChange(value, position.key),
    [onCheckboxChange, position.key]
  );

  const shortToken = position.shortToken;
  const longToken = position.longToken;

  const renderTooltipContent = useCallback(
    () =>
      (
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
        )),
    [longToken, position.claimableLongTokenAmount, position.claimableShortTokenAmount, shortToken]
  );

  return (
    <div className="ClaimSettleModal-info-row">
      <Checkbox
        isChecked={isSelected}
        setIsChecked={handleCheckboxChange}
        disabled={isMarketDisabled}
        className="ClaimSettleModal-checkbox flex self-center"
      >
        <div className="Exchange-info-label ClaimSettleModal-checkbox-label">{label}</div>
      </Checkbox>
      <div className="ClaimSettleModal-info-label-usd">
        <Tooltip
          className="ClaimSettleModal-tooltip"
          position="top-end"
          handle={formatDeltaUsd(position.pendingClaimableFundingFeesUsd)}
          renderContent={renderTooltipContent}
        />
      </div>
    </div>
  );
};
