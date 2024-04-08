import { useLingui } from "@lingui/react";
import { defineMessage } from "@lingui/macro";
import mapValues from "lodash/mapValues";
import { useCallback, useMemo } from "react";
import type { MessageDescriptor } from "@lingui/core";

import Tab from "components/Tab/Tab";
import { MarketFilterBase, MarketFilterBaseProps } from "./MarketFilterBase";

import "./MarketFilterLongShort.scss";

type MarketFilterProps = Omit<MarketFilterBaseProps, "beforeContent" | "extraIsActive"> & {
  valueIsLong: boolean | undefined;
  onChangeIsLong: (value: boolean | undefined) => void;
};

type State = "all" | "long" | "short";
const OPTIONS: State[] = ["all", "long", "short"];
const OPTION_LABELS: Record<State, MessageDescriptor> = {
  all: defineMessage({ message: "All", comment: "Filter option for all markets" }),
  long: defineMessage({ message: "Long" }),
  short: defineMessage({ message: "Short" }),
};

export const MarketFilterLongShort = ({ onChangeIsLong, valueIsLong, ...restProps }: MarketFilterProps) => {
  const { i18n } = useLingui();
  const localizedOptionLabels = useMemo(() => mapValues(OPTION_LABELS, (label) => i18n._(label)), [i18n]);
  const onChange = useCallback(
    (option: State) => {
      if (option === "all") {
        onChangeIsLong(undefined);
      } else {
        onChangeIsLong(option === "long");
      }
    },
    [onChangeIsLong]
  );

  const value: State = valueIsLong === undefined ? "all" : valueIsLong ? "long" : "short";

  return (
    <MarketFilterBase
      {...restProps}
      extraIsActive={value !== "all"}
      beforeContent={
        <>
          <div className="MarketFilterLongShort-container">
            <Tab
              onChange={onChange}
              option={value}
              options={OPTIONS}
              optionLabels={localizedOptionLabels}
              className="MarketFilterLongShort-tabs"
            />
          </div>
        </>
      }
    />
  );
};
