import { t } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import Tooltip from "components/Tooltip/Tooltip";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { PositionInfo } from "domain/synthetics/positions";
import { TokenData } from "domain/synthetics/tokens";
import { formatDeltaUsd, formatTokenAmount } from "lib/numbers";
import { useCallback, useMemo } from "react";

type Props = {
  position: PositionInfo;
  isSelected: boolean;
  onCheckboxChange: (value: boolean, positionKey: string) => void;
};

export const SettleAccruedFundingFeeRow = ({ position, isSelected, onCheckboxChange }: Props) => {
  const [indexName, poolName] = useMemo(
    () => [getMarketIndexName(position.marketInfo), getMarketPoolName(position.marketInfo)],
    [position.marketInfo]
  );
  const label = (
    <div key={position.key} className="flex items-start">
      <span className="ClaimSettleModal-row-text">
        {position.isLong ? t`Long` : t`Short`} {indexName}
      </span>{" "}
      <span className="subtext">[{poolName}]</span>
    </div>
  );
  const handleCheckboxChange = useCallback(
    (value: boolean) => onCheckboxChange(value, position.key),
    [onCheckboxChange, position.key]
  );

  const shortToken = position.marketInfo.shortToken;
  const longToken = position.marketInfo.longToken;

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
          <div key={token.address}>{formatTokenAmount(amount, token.decimals, token.symbol)}</div>
        )),
    [longToken, position.claimableLongTokenAmount, position.claimableShortTokenAmount, shortToken]
  );

  return (
    <div className="ClaimSettleModal-info-row">
      <Checkbox
        isChecked={isSelected}
        setIsChecked={handleCheckboxChange}
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
