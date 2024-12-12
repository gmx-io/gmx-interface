import { msg } from "@lingui/macro";
import cx from "classnames";
import { useCallback } from "react";
import { useHistory } from "react-router-dom";

import { selectTradeboxState } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { TradeType } from "domain/synthetics/trade";
import { useLocalizedMap } from "lib/i18n";

import Tab from "components/Tab/Tab";

import LongIcon from "img/long.svg?react";
import ShortIcon from "img/short.svg?react";
import SwapIcon from "img/swap.svg?react";

import "./TradeBox.scss";

const tradeTypeIcons = {
  [TradeType.Long]: <LongIcon />,
  [TradeType.Short]: <ShortIcon />,
  [TradeType.Swap]: <SwapIcon />,
};

const tradeTypeLabels = {
  [TradeType.Long]: msg`Long`,
  [TradeType.Short]: msg`Short`,
  [TradeType.Swap]: msg`Swap`,
};

export function TradeBoxHeaderTabs({ isInCurtain }: { isInCurtain?: boolean }) {
  const localizedTradeTypeLabels = useLocalizedMap(tradeTypeLabels);
  const history = useHistory();
  const { setTradeType: onSelectTradeType, tradeType } = useSelector(selectTradeboxState);

  const onTradeTypeChange = useCallback(
    (type: TradeType) => {
      onSelectTradeType(type);
      if (tradeType !== type) {
        history.push(`/trade/${type.toLowerCase()}`);
      }
    },
    [history, onSelectTradeType, tradeType]
  );

  return (
    <div className={cx(isInCurtain ? "shrink-0 px-15 pb-15 pt-10" : "")}>
      {isInCurtain && <div className={cx("mx-auto mb-14 h-4 w-32 rounded-full bg-gray-900")} />}
      <Tab
        icons={tradeTypeIcons}
        options={Object.values(TradeType)}
        optionLabels={localizedTradeTypeLabels}
        option={tradeType}
        onChange={onTradeTypeChange}
        tabOptionClassName="!p-[10.5px]"
        qa="trade-direction"
        theme="green"
      />
    </div>
  );
}
