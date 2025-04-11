import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ChangeEvent, useEffect } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { TWAPDuration } from "domain/synthetics/trade/twap/types";
import { changeTWAPNumberOfPartsValue } from "domain/synthetics/trade/twap/utils";
import { formatUsd } from "lib/numbers";
import { MarketInfo } from "sdk/types/markets";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import NumberInput from "components/NumberInput/NumberInput";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";

import { useTradeboxChanges } from "../hooks/useTradeboxChanges";

type Props = {
  duration: TWAPDuration;
  numberOfParts: number;
  setNumberOfParts: (numberOfParts: number) => void;
  setDuration: (duration: TWAPDuration) => void;
  sizeUsd: bigint | undefined;
  marketInfo: MarketInfo | undefined;
};

const HOURS_IN_A_DAY = 24;

const getTwapDurationText = (duration: TWAPDuration) => {
  const hours = Math.floor(duration.hours + duration.minutes / 60);
  const minutes = duration.minutes % 60;
  if (hours > HOURS_IN_A_DAY * 2) {
    const daysMessage = t`${Math.floor(hours / HOURS_IN_A_DAY)} days`;

    return hours % HOURS_IN_A_DAY > 0 ? `${daysMessage} and ${hours % HOURS_IN_A_DAY} hours` : daysMessage;
  }

  if (hours > 0 && minutes > 0) {
    return t`${hours} hours and ${minutes} minutes`;
  }

  if (hours > 0) {
    return t`${hours} hours`;
  }

  return t`${minutes} minutes`;
};

const TwapRows = ({ duration, numberOfParts, setNumberOfParts, setDuration, sizeUsd, marketInfo }: Props) => {
  const { savedTWAPNumberOfParts } = useSettings();
  const tradeboxChanges = useTradeboxChanges();

  useEffect(() => {
    if (tradeboxChanges.direction || tradeboxChanges.toTokenAddress) {
      setNumberOfParts(savedTWAPNumberOfParts);
    }
  }, [tradeboxChanges.direction, tradeboxChanges.toTokenAddress, savedTWAPNumberOfParts, setNumberOfParts]);

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
            onBlur={() => setNumberOfParts(changeTWAPNumberOfPartsValue(numberOfParts))}
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
            This TWAP order will execute {numberOfParts} long increase orders of {formatUsd(sizeUsd)} each over the next{" "}
            {getTwapDurationText(duration)} for the {marketInfo.name} pool.
          </Trans>
        </AlertInfoCard>
      )}
    </div>
  );
};

const FrequencyField = ({ duration, numberOfParts }: { duration: TWAPDuration; numberOfParts: number }) => {
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
    const remainSeconds = seconds % 60;
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
  duration: TWAPDuration;
  setDuration: (duration: TWAPDuration) => void;
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
