import { useCallback, useMemo } from "react";
import { useHistory } from "react-router-dom";

import { selectTradeboxState } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { TradeType } from "domain/synthetics/trade";
import { useLocalizedMap } from "lib/i18n";

import { SwipeTabs } from "components/SwipeTabs/SwipeTabs";
import Tabs from "components/Tabs/Tabs";

import { mobileTradeTypeClassNames, tradeTypeClassNames, tradeTypeIcons, tradeTypeLabels } from "./tradeboxConstants";

const OPTIONS = Object.values(TradeType);

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

  const tabsOptions = useMemo(() => {
    return Object.values(TradeType).map((type) => ({
      value: type,
      label: localizedTradeTypeLabels[type],
      className: tradeTypeClassNames[type],
      icon: tradeTypeIcons[type],
    }));
  }, [localizedTradeTypeLabels]);

  if (!isInCurtain) {
    return (
      <Tabs
        options={tabsOptions}
        selectedValue={tradeType}
        onChange={onTradeTypeChange}
        size="l"
        qa="trade-direction"
      />
    );
  }

  return (
    <SwipeTabs
      icons={tradeTypeIcons}
      options={OPTIONS}
      optionLabels={localizedTradeTypeLabels}
      option={tradeType}
      onChange={onTradeTypeChange}
      optionClassnames={mobileTradeTypeClassNames}
      qa="trade-direction"
    />
  );
}
