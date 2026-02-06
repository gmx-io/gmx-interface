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
import Tabs from "components/Tabs/Tabs";
import { useIsCurtainOpen } from "components/TradeBox/Curtain";
import { MarketPoolSelectorField } from "components/TradeBox/MarketPoolSelectorField";
import { SwapSlippageField } from "components/TradeBox/SwapSlippageField";
import { CollateralSelectorField } from "components/TradeBox/TradeBoxRows/CollateralSelectorField";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { tradeTypeClassNames, tradeTypeLabels } from "./tradeboxConstants";

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
  const { isIncrease, isPosition, isMarket, isLimit, isTwap } = useSelector(selectTradeboxTradeFlags);
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

  const isSwap = tradeType === TradeType.Swap;
  const leverageFieldVisible = isIncrease;

  const positionFields = (
    <div className="grid grid-cols-[minmax(48px,auto)_1fr_1fr] gap-8">
      {leverageFieldVisible ? (
        <LeverageField
          marks={leverageSliderMarks}
          value={isLeverageSliderEnabled ? leverageOption ?? null : null}
          onChange={setLeverageOption}
          disabled={false}
        />
      ) : null}

      <div className="overflow-hidden">
        <MarketPoolSelectorField disabled={false} />
      </div>

      <div className="overflow-hidden">
        <CollateralSelectorField
          selectedMarketAddress={marketInfo?.marketTokenAddress}
          onSelectCollateralAddress={onSelectCollateralAddress}
          isMarket={isMarket}
          disabled={false}
        />
      </div>
    </div>
  );

  const swapFields = <SwapSlippageField disabled={isLimit || isTwap} />;

  const fieldsRow = (
    <div className="h-40 rounded-t-8 border-b-1/2 border-b-slate-600 bg-slate-900 px-12 py-6">
      {isSwap ? swapFields : isPosition ? positionFields : null}
    </div>
  );

  const [isCurtainOpen, setIsCurtainOpen] = useIsCurtainOpen();

  const handleToggleCurtain = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCurtainOpen(!isCurtainOpen);
  };

  return (
    <>
      {isInCurtain && !isCurtainOpen ? null : fieldsRow}
      <div className={cx("flex gap-8 bg-slate-900", isInCurtain && !isCurtainOpen ? "p-8" : "p-12")}>
        <div className="flex grow items-stretch gap-12">
          <Tabs
            options={longShortTabsOptions}
            selectedValue={tradeType === TradeType.Swap ? undefined : tradeType}
            onChange={onTradeTypeChange}
            qa="trade-direction"
            className="grow overflow-hidden rounded-8 !border-0 bg-slate-800 p-0"
            regularOptionClassname={cx(
              "mb-0 grow",
              isSwap &&
                `last:relative last:after:absolute last:after:left-0 last:after:top-[calc(50%+1px)]
                last:after:block last:after:h-20 last:after:w-2 last:after:-translate-y-1/2 last:after:rounded-full
                last:after:bg-slate-600 last:after:content-[''] max-md:last:after:h-16`,
              {
                "!py-6 text-13": isInCurtain && !isCurtainOpen,
              }
            )}
          />
          <Tabs
            options={swapTabOptions}
            selectedValue={tradeType === TradeType.Swap ? TradeType.Swap : undefined}
            onChange={onTradeTypeChange}
            qa="trade-direction-swap"
            className="flex-none overflow-hidden rounded-8 !border-0 bg-slate-800 p-0"
            regularOptionClassname={cx("mb-0", { "!py-6 text-13": isInCurtain && !isCurtainOpen })}
          />
        </div>
        {isInCurtain && (
          <button onClick={handleToggleCurtain} className="group shrink-0 px-10">
            <ChevronDownIcon
              className={cx(
                "size-18 text-typography-secondary transition-transform duration-500 ease-out group-hover:text-typography-primary",
                isCurtainOpen ? undefined : "rotate-180"
              )}
            />
          </button>
        )}
      </div>
    </>
  );
}
