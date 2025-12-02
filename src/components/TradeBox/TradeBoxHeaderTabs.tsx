import cx from "classnames";
import { useCallback, useMemo } from "react";
import { useHistory } from "react-router-dom";

import { selectIsLeverageSliderEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { selectTradeboxState } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import {
  selectTradeboxLeverageSliderMarks,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { TradeType } from "domain/synthetics/trade";
import { useLocalizedMap } from "lib/i18n";

import { LeverageField } from "components/LeverageField/LeverageField";
import { SwipeTabs } from "components/SwipeTabs/SwipeTabs";
import Tabs from "components/Tabs/Tabs";
import { useIsCurtainOpen } from "components/TradeBox/Curtain";
import { MarketPoolSelectorRow } from "components/TradeBox/MarketPoolSelectorRow";
import { CollateralSelectorRow } from "components/TradeBox/TradeBoxRows/CollateralSelectorRow";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import {
  mobileTradeTypeClassNames,
  mobileTradeTypeContentClassNames,
  tradeTypeClassNames,
  tradeTypeLabels,
} from "./tradeboxConstants";

const OPTIONS = Object.values(TradeType);

export function TradeBoxHeaderTabs({ isInCurtain }: { isInCurtain?: boolean }) {
  const localizedTradeTypeLabels = useLocalizedMap(tradeTypeLabels);
  const history = useHistory();
  const {
    setTradeType: onSelectTradeType,
    tradeType,
    leverageOption,
    setLeverageOption,
    marketInfo,
    setCollateralAddress: onSelectCollateralAddress,
  } = useSelector(selectTradeboxState);
  const leverageSliderMarks = useSelector(selectTradeboxLeverageSliderMarks);
  const { isIncrease, isPosition, isMarket } = useSelector(selectTradeboxTradeFlags);
  const isLeverageSliderEnabled = useSelector(selectIsLeverageSliderEnabled);

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

  const leverageFieldVisible = isIncrease;
  const fieldsColumnsClass = leverageFieldVisible ? "md:grid-cols-3" : "md:grid-cols-2";

  const fields = (
    <div className="flex gap-8">
      {leverageFieldVisible ? (
        <div className="w-44 shrink-0">
          <LeverageField
            marks={leverageSliderMarks}
            value={isLeverageSliderEnabled ? leverageOption ?? null : null}
            onChange={setLeverageOption}
          />
        </div>
      ) : null}

      <div className="grow overflow-hidden">
        <MarketPoolSelectorRow />
      </div>

      <div className="grow overflow-hidden">
        <CollateralSelectorRow
          selectedMarketAddress={marketInfo?.marketTokenAddress}
          onSelectCollateralAddress={onSelectCollateralAddress}
          isMarket={isMarket}
        />
      </div>
    </div>
  );

  const fieldsRow = isPosition ? (
    <div className={cx("rounded-t-8 border-b-1/2 border-b-slate-600 bg-slate-900 px-12 py-10", fieldsColumnsClass)}>
      {fields}
    </div>
  ) : null;

  const [isCurtainOpen, setIsCurtainOpen] = useIsCurtainOpen();

  const handleToggleCurtain = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCurtainOpen(!isCurtainOpen);
  };

  if (!isInCurtain) {
    return (
      <>
        {fieldsRow}
        <div className="flex flex-col gap-8 bg-slate-900 p-12 pb-0">
          <div className="flex items-stretch gap-12">
            <Tabs
              options={longShortTabsOptions}
              selectedValue={tradeType === TradeType.Swap ? undefined : tradeType}
              onChange={onTradeTypeChange}
              size="l"
              qa="trade-direction"
              className="grow overflow-hidden rounded-8 !border-0 bg-slate-800 p-0"
              regularOptionClassname="grow"
            />
            <Tabs
              options={swapTabOptions}
              selectedValue={tradeType === TradeType.Swap ? TradeType.Swap : undefined}
              onChange={onTradeTypeChange}
              size="l"
              qa="trade-direction-swap"
              className="flex-none overflow-hidden rounded-8 !border-0 bg-slate-800 p-0"
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col bg-slate-900">
      {isCurtainOpen ? <div className="p-12">{fields}</div> : null}
      <div className="flex border-b-1/2 border-t-1/2 border-slate-600 pr-8">
        <div className="grow">
          <SwipeTabs
            options={OPTIONS}
            optionLabels={localizedTradeTypeLabels}
            option={tradeType}
            onChange={onTradeTypeChange}
            optionClassnames={mobileTradeTypeClassNames}
            optionContentClassnames={mobileTradeTypeContentClassNames}
            qa="trade-direction"
          />
        </div>

        <button onClick={handleToggleCurtain} className="group shrink-0 px-10">
          <ChevronDownIcon
            className={cx(
              "size-18 text-typography-secondary transition-transform duration-500 ease-out group-hover:text-typography-primary",
              isCurtainOpen ? undefined : "rotate-180"
            )}
          />
        </button>
      </div>
    </div>
  );
}
