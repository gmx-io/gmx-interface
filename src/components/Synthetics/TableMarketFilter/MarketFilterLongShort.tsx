import { Trans } from "@lingui/macro";

import Button from "components/Button/Button";
import { MarketFilterBase, MarketFilterBaseProps } from "./MarketFilterBase";

import "./MarketFilterLongShort.scss";

type MarketFilterProps = Omit<MarketFilterBaseProps, "beforeContent"> & {
  valueIsLong: boolean | undefined;
  onChangeIsLong: (value: boolean | undefined) => void;
};

export const MarketFilterLongShort = ({ onChangeIsLong, valueIsLong, ...restProps }: MarketFilterProps) => {
  return (
    <MarketFilterBase
      {...restProps}
      beforeContent={
        <div className="MarketFilterLongShort-container">
          <Button
            className="MarketFilterLongShort-button"
            variant={valueIsLong === true ? "primary" : "secondary"}
            onClick={() => onChangeIsLong(true)}
          >
            <Trans>Long</Trans>
          </Button>
          <Button
            className="MarketFilterLongShort-button"
            variant={valueIsLong === undefined ? "primary" : "secondary"}
            onClick={() => onChangeIsLong(undefined)}
          >
            <Trans comment="Filter option for all markets">All</Trans>
          </Button>
          <Button
            className="MarketFilterLongShort-button"
            variant={valueIsLong === false ? "primary" : "secondary"}
            onClick={() => onChangeIsLong(false)}
          >
            <Trans>Short</Trans>
          </Button>
        </div>
      }
    />
  );
};
