import { t } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import Tooltip from "components/Tooltip/Tooltip";
import { PositionInfo } from "domain/synthetics/positions";
import { TokenData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { useCallback, useMemo } from "react";

type Props = {
  position: PositionInfo;
  isSelected: boolean;
  onCheckboxChange: (value: boolean, positionKey: string) => void;
};

export const SettleAccruedFundingFeeRow = ({ position, isSelected, onCheckboxChange }: Props) => {
  const [name1, name2] = useMemo(() => {
    const name = position.marketInfo.name;
    const split = name.split(" ");
    return split.length === 2 ? split : [name, ""];
  }, [position.marketInfo.name]);
  const label = (
    <div key={position.key}>
      <span className="SettleAccruedFundingFeeModal-row-text">
        {position.isLong ? t`Long` : t`Short`} {name1}
      </span>{" "}
      <span>{name2}</span>
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
        ] as [BigNumber, TokenData][]
      )
        .filter(([amount, token]) => amount.gt(0) && token)
        .map(([amount, token]) => <div>{formatTokenAmount(amount, token.decimals, token.symbol)}</div>),
    [longToken, position.claimableLongTokenAmount, position.claimableShortTokenAmount, shortToken]
  );

  return (
    <div className="SettleAccruedFundingFeeModal-info-row">
      <Checkbox
        isChecked={isSelected}
        setIsChecked={handleCheckboxChange}
        className="flex self-center SettleAccruedFundingFeeModal-checkbox"
      />
      <div className="Exchange-info-label">{label}</div>
      <div className="SettleAccruedFundingFeeModal-info-label-usd">
        <Tooltip
          className="SettleAccruedFundingFeeModal-tooltip"
          position="right-top"
          handle={formatUsd(position.pendingClaimableFundingFeesUsd)}
          renderContent={renderTooltipContent}
        />
      </div>
    </div>
  );
};
