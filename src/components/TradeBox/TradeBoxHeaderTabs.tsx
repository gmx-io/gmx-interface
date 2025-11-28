import { useCallback, useMemo } from "react";
import { useHistory } from "react-router-dom";

import { selectTradeboxState } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { TradeType } from "domain/synthetics/trade";
import { useLocalizedMap } from "lib/i18n";

import { SwipeTabs } from "components/SwipeTabs/SwipeTabs";
import Tabs from "components/Tabs/Tabs";

import { mobileTradeTypeClassNames, tradeTypeClassNames, tradeTypeLabels } from "./tradeboxConstants";

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

  const longShortTabsOptions = useMemo(
    () =>
      [TradeType.Long, TradeType.Short].map((type) => ({
        value: type,
        label: localizedTradeTypeLabels[type],
        className: tradeTypeClassNames[type],
      })),
    [localizedTradeTypeLabels]
  );

  const swapTabOptions = useMemo(
    () => [
      {
        value: TradeType.Swap,
        label: localizedTradeTypeLabels[TradeType.Swap],
        className: tradeTypeClassNames[TradeType.Swap],
      },
    ],
    [localizedTradeTypeLabels]
  );

  if (!isInCurtain) {
    return (
      <div className="flex items-stretch gap-12 rounded-t-8 border-b-1/2 border-b-slate-600 bg-slate-900 px-12 py-10">
        <Tabs
          options={longShortTabsOptions}
          selectedValue={tradeType === TradeType.Swap ? undefined : tradeType}
          onChange={onTradeTypeChange}
          size="l"
          qa="trade-direction"
          className="rounded-none bg-transparent grow rounded-8 border-0 border-none bg-slate-800 p-0"
          regularOptionClassname="grow first:rounded-l-8 last:rounded-r-8"
        />
        <Tabs
          options={swapTabOptions}
          selectedValue={tradeType === TradeType.Swap ? TradeType.Swap : undefined}
          onChange={onTradeTypeChange}
          size="l"
          qa="trade-direction-swap"
          className="rounded-none bg-transparent flex-none rounded-8 border-0 border-none bg-slate-800 p-0"
          regularOptionClassname="rounded-8"
        />
      </div>
    );
  }

  return (
    <SwipeTabs
      options={OPTIONS}
      optionLabels={localizedTradeTypeLabels}
      option={tradeType}
      onChange={onTradeTypeChange}
      optionClassnames={mobileTradeTypeClassNames}
      qa="trade-direction"
    />
  );
}
