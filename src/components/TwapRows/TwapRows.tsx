import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { formatDuration, type Locale as DateLocale } from "date-fns";
import { useEffect } from "react";
import { useLocalStorage } from "react-use";

import { TWAP_INFO_CARD_CLOSED_KEY } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { formatUsd } from "lib/numbers";
import { MarketInfo } from "sdk/utils/markets/types";
import { changeTwapNumberOfPartsValue } from "sdk/utils/twap";
import { TwapDuration } from "sdk/utils/twap/types";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { ValueInput } from "components/ValueInput/ValueInput";

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

  const [isTwapInfoCardClosed, setIsTwapInfoCardClosed] = useLocalStorage(TWAP_INFO_CARD_CLOSED_KEY, false);

  const handleCloseTwapInfoCard = () => {
    setIsTwapInfoCardClosed(true);
  };

  useEffect(() => {
    if (tradeboxChanges.direction || tradeboxChanges.toTokenAddress) {
      setNumberOfParts(savedTwapNumberOfParts);
    }
  }, [tradeboxChanges.direction, tradeboxChanges.toTokenAddress, savedTwapNumberOfParts, setNumberOfParts]);

  return (
    <div className="flex flex-col gap-14">
      <SyntheticsInfoRow label={t`Duration`} className="h-20">
        <DurationField duration={duration} setDuration={setDuration} />
      </SyntheticsInfoRow>
      <SyntheticsInfoRow label={t`Number of parts`}>
        <div className="flex">
          <ValueInput
            value={numberOfParts}
            onChange={(value) => setNumberOfParts(value)}
            onBlur={() => setNumberOfParts(changeTwapNumberOfPartsValue(numberOfParts))}
            className="w-[112px]"
          />
        </div>
      </SyntheticsInfoRow>
      <SyntheticsInfoRow label={t`Frequency`}>
        <FrequencyField duration={duration} numberOfParts={numberOfParts} />
      </SyntheticsInfoRow>
      <SyntheticsInfoRow
        label={t`Size per part`}
        value={formatUsd(typeof sizeUsd === "bigint" && numberOfParts ? sizeUsd / BigInt(numberOfParts) : 0n)}
        valueClassName="numbers"
      />

      {!isTwapInfoCardClosed && marketInfo && typeof sizeUsd === "bigint" && sizeUsd > 0n && (
        <AlertInfoCard onClose={handleCloseTwapInfoCard}>
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
  const seconds = numberOfParts ? Math.round(((duration.hours * 60 + duration.minutes) * 60) / numberOfParts) : 0;
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(seconds / 3600);

  if (hours >= 2) {
    const remainMinutes = Math.floor((seconds % 3600) / 60);
    return (
      <Trans>
        <span className="text-typography-secondary">every</span> {hours} hours
        {remainMinutes > 0 ? <> and {remainMinutes} minutes</> : undefined}
      </Trans>
    );
  }

  if (minutes > 2) {
    const remainSeconds = Math.floor(seconds % 60);
    return (
      <Trans>
        <span className="text-typography-secondary">every</span> {minutes} minutes
        {remainSeconds > 0 ? <> and {remainSeconds} seconds</> : undefined}
      </Trans>
    );
  }

  return (
    <Trans>
      <span className="text-typography-secondary">every</span> {seconds} seconds
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
        label={t`Hours`}
        value={duration.hours}
        onChange={(value) => setDuration({ ...duration, hours: value })}
        className="w-[112px]"
      />
      <ValueInput
        label={t`Minutes`}
        value={duration.minutes}
        onChange={(value) => setDuration({ ...duration, minutes: value })}
        className="w-[112px]"
      />
    </div>
  );
};

export default TwapRows;
