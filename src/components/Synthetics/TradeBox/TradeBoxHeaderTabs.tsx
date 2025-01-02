import { useCallback } from "react";
import { useHistory } from "react-router-dom";

import { selectTradeboxState } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { TradeType } from "domain/synthetics/trade";
import { useLocalizedMap } from "lib/i18n";

import Tab from "components/Tab/Tab";

import { mobileTradeTypeClassNames, tradeTypeClassNames, tradeTypeIcons, tradeTypeLabels } from "./tradeboxConstants";
import { SwipeTabs } from "components/Tab/SwipeTabs";

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

  if (!isInCurtain) {
    return (
      <Tab
        icons={tradeTypeIcons}
        options={Object.values(TradeType)}
        optionLabels={localizedTradeTypeLabels}
        option={tradeType}
        onChange={onTradeTypeChange}
        size="l"
        optionClassnames={tradeTypeClassNames}
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
