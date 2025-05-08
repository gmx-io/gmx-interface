import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { formatDuration, type Locale as DateLocale } from "date-fns";
import { ChangeEvent, useEffect } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { formatUsd } from "lib/numbers";
import { MarketInfo } from "sdk/types/markets";
import { TwapDuration } from "sdk/types/twap";
import { changeTwapNumberOfPartsValue } from "sdk/utils/twap/index";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import NumberInput from "components/NumberInput/NumberInput";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";

import { LOCALE_DATE_LOCALE_MAP } from "../DateRangeSelect/DateRangeSelect";
import { useTradeboxChanges } from "../TradeBox/hooks/useTradeboxChanges";

type Props = {
  duration: TwapDuration;
  numberOfParts: number;
  setNumberOfParts: (numberOfParts: number) => void;
  setDuration: (duration: TwapDuration) => void;
  sizeUsd: bigint | undefined;
  marketInfo: MarketInfo | undefined;
  type: "swap" | "increase" | "decrease";
  isLong: boolean;
};

export const getTwapDurationText = (duration: TwapDuration, locale: DateLocale) => {
  const hours = Math.floor(duration.hours + duration.minutes / 60);
  const minutes = duration.minutes % 60;

  if (hours * 60 + minutes < 1) {
    return t`less than a minute`;
  }

  return formatDuration(
    {
      hours,
      minutes,
    },
    {
      format: ["hours", "minutes"],
      delimiter: " and ",
      locale,
    }
  );
};

const TwapRows = ({
  duration,
  numberOfParts,
  setNumberOfParts,
  setDuration,
  sizeUsd,
  marketInfo,
  type,
  isLong,
}: Props) => {
  const { _, i18n } = useLingui();
  const localeStr = i18n.locale;
  const locale: DateLocale = LOCALE_DATE_LOCALE_MAP[localeStr] ?? LOCALE_DATE_LOCALE_MAP.en;

  const { savedTwapNumberOfParts } = useSettings();
  const tradeboxChanges = useTradeboxChanges();

  useEffect(() => {
    if (tradeboxChanges.direction || tradeboxChanges.toTokenAddress) {
      setNumberOfParts(savedTwapNumberOfParts);
    }
  }, [tradeboxChanges.direction, tradeboxChanges.toTokenAddress, savedTwapNumberOfParts, setNumberOfParts]);

  return (
    <div className="flex flex-col">
      <SyntheticsInfoRow label={t`Duration`} className="mb-11">
        <DurationField duration={duration} setDuration={setDuration} />
      </SyntheticsInfoRow>
      <SyntheticsInfoRow label={t`Number of Parts`} className="mb-14">
        <div className="flex">
          <ValueInput
            value={numberOfParts}
            onChange={(value) => setNumberOfParts(value)}
            onBlur={() => setNumberOfParts(changeTwapNumberOfPartsValue(numberOfParts))}
          />
        </div>
      </SyntheticsInfoRow>
      <SyntheticsInfoRow label={t`Frequency`} className="mb-14">
        <FrequencyField duration={duration} numberOfParts={numberOfParts} />
      </SyntheticsInfoRow>
      <SyntheticsInfoRow label={t`Size per part`} className="mb-14">
        {formatUsd(typeof sizeUsd === "bigint" && numberOfParts ? sizeUsd / BigInt(numberOfParts) : 0n)}
      </SyntheticsInfoRow>

      {marketInfo && typeof sizeUsd === "bigint" && sizeUsd > 0n && (
        <AlertInfoCard>
          <Trans>
            This TWAP order will execute {numberOfParts} {isLong ? "long" : "short"} {type} orders of{" "}
            {formatUsd(numberOfParts ? sizeUsd / BigInt(numberOfParts) : 0n)} each over the next{" "}
            {getTwapDurationText(duration, locale)} for the {marketInfo.name} market.
          </Trans>
        </AlertInfoCard>
      )}
    </div>
  );
};

const FrequencyField = ({ duration, numberOfParts }: { duration: TwapDuration; numberOfParts: number }) => {
  const seconds = numberOfParts ? ((duration.hours * 60 + duration.minutes) * 60) / numberOfParts : 0;
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(seconds / 3600);

  if (hours >= 2) {
    const remainMinutes = Math.floor((seconds % 3600) / 60);
    return (
      <Trans>
        <span className="text-slate-100">every</span> {hours} hours
        {remainMinutes > 0 ? <> and {remainMinutes} minutes</> : undefined}
      </Trans>
    );
  }

  if (minutes > 2) {
    const remainSeconds = Math.floor(seconds % 60);
    return (
      <Trans>
        <span className="text-slate-100">every</span> {minutes} minutes
        {remainSeconds > 0 ? <> and {remainSeconds} seconds</> : undefined}
      </Trans>
    );
  }

  return (
    <Trans>
      <span className="text-slate-100">every</span> {seconds} seconds
    </Trans>
  );
};

const DurationField = ({
  duration,
  setDuration,
}: {
  duration: TwapDuration;
  setDuration: (duration: TwapDuration) => void;
}) => {
  return (
    <div className="flex gap-4">
      <ValueInput
        label={t`Hour(s)`}
        value={duration.hours}
        onChange={(value) => setDuration({ ...duration, hours: value })}
      />
      <ValueInput
        label={t`Minute(s)`}
        value={duration.minutes}
        onChange={(value) => setDuration({ ...duration, minutes: value })}
      />
    </div>
  );
};

const ValueInput = ({
  value,
  onChange,
  label,
  onBlur,
}: {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  label?: string;
}) => {
  const onValueChange = (e: ChangeEvent<HTMLInputElement>) => {
    const parsedValue = parseInt(e.target.value);

    if (isNaN(parsedValue)) {
      onChange(0);
    } else {
      onChange(parsedValue);
    }
  };

  return (
    <label
      className={cx("w-[114px] rounded-2 bg-fill-tertiary px-6 py-3", label && "flex items-center", {
        "grid grid-cols-[1fr_1fr]": label,
      })}
    >
      {label && <span className="opacity-70">{label}</span>}
      <div>
        <NumberInput className="w-full p-0 text-right" value={value} onValueChange={onValueChange} onBlur={onBlur} />
      </div>
    </label>
  );
};

export default TwapRows;
