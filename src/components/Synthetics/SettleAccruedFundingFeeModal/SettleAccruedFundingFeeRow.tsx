import { t } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import { PositionInfo } from "domain/synthetics/positions";
import { formatUsd } from "lib/numbers";
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

  return (
    <div className="SettleAccruedFundingFeeModal-info-row">
      <Checkbox
        isChecked={isSelected}
        setIsChecked={handleCheckboxChange}
        className="flex self-center SettleAccruedFundingFeeModal-checkbox"
      />
      <div className="Exchange-info-label">{label}</div>
      <div className="SettleAccruedFundingFeeModal-info-label-usd">{formatUsd(position.pendingFundingFeesUsd)}</div>
    </div>
  );
};
