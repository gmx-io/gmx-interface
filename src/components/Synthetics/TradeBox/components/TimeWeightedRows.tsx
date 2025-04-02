import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ChangeEvent } from "react";

import { formatUsd } from "lib/numbers";

import NumberInput from "components/NumberInput/NumberInput";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";

export type Duration = {
  minutes: number;
  hours: number;
};

type Props = {
  duration: Duration;
  numberOfParts: number;
  setNumberOfParts: (numberOfParts: number) => void;
  setDuration: (duration: Duration) => void;
  sizeUsd: bigint | undefined;
};

const TimeWeightedRows = ({ duration, numberOfParts, setNumberOfParts, setDuration, sizeUsd }: Props) => {
  return (
    <div className="flex flex-col">
      <SyntheticsInfoRow label={t`Duration`} className="mb-11">
        <DurationField duration={duration} setDuration={setDuration} />
      </SyntheticsInfoRow>
      <SyntheticsInfoRow label={t`Number of Parts`} className="mb-14">
        <div className="flex">
          <ValueInput value={numberOfParts} onChange={(value) => setNumberOfParts(value)} />
        </div>
      </SyntheticsInfoRow>
      <SyntheticsInfoRow label={t`Frequency`} className="mb-14">
        <FrequencyField duration={duration} numberOfParts={numberOfParts} />
      </SyntheticsInfoRow>
      <SyntheticsInfoRow label={t`Size per part`} className="mb-14">
        {formatUsd(sizeUsd ? sizeUsd / BigInt(numberOfParts) : 0n)}
      </SyntheticsInfoRow>
    </div>
  );
};

const FrequencyField = ({ duration, numberOfParts }: { duration: Duration; numberOfParts: number }) => {
  const seconds = numberOfParts ? ((duration.hours * 60 + duration.minutes) * 60) / numberOfParts : 0;
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(seconds / 3600);

  if (hours > 10) {
    const remainder = seconds % 3600;
    return (
      <Trans>
        <span className="text-slate-100">every</span> {remainder ? "~" : ""}
        {hours} hours
      </Trans>
    );
  }

  if (minutes > 10) {
    const remainder = seconds % 60;
    return (
      <Trans>
        <span className="text-slate-100">every</span> {remainder ? "~" : ""}
        {minutes} minutes
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
  duration: Duration;
  setDuration: (duration: Duration) => void;
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
  min = 0,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
}) => {
  const onValueChange = (e: ChangeEvent<HTMLInputElement>) => {
    const parsedValue = parseInt(e.target.value);

    if (isNaN(parsedValue)) {
      onChange(min ?? 0);
    } else if (max && parsedValue > max) {
      onChange(max);
    } else if (parsedValue < min) {
      onChange(min);
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
        <NumberInput className="w-full p-0 text-right" value={value} onValueChange={onValueChange} />
      </div>
    </label>
  );
};

export default TimeWeightedRows;
