import { t } from "@lingui/macro";
import { useLeaderboardTiming } from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import { ReactNode, useEffect, useMemo, useState } from "react";

export function CompetitionCountdown() {
  const { isEndInFuture, isStartInFuture, timeframe } = useLeaderboardTiming();

  let counter: null | ReactNode = null;

  if (isStartInFuture) {
    counter = <Countdown prefix={t`Starts in`} end={timeframe.from} />;
  } else if (isEndInFuture) {
    if (timeframe.to) {
      counter = <Countdown prefix={t`Ends in`} end={timeframe.to} />;
    } else {
      return null;
    }
  } else {
    return null;
  }

  return counter;
}

function Countdown({ end, prefix }: { end: number; prefix: string }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(end));
  const isEndClose = timeLeft < 600;
  const interval = isEndClose ? 200 : 3000;

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(end));
  }, [end]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeLeft(calculateTimeLeft(end));
    }, interval);
    return () => clearInterval(intervalId);
  }, [end, interval]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setTimeLeft(calculateTimeLeft(end));
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [end]);

  const days = Math.floor(timeLeft / 86400);
  const hours = Math.floor((timeLeft % 86400) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="CompetitionCountdown__countdown">
      <Section labelClassname="CompetitionCountdown__prefix" number={undefined} label={prefix} />
      <Section
        number={days}
        label={plural(days, {
          one: t`day`,
          other: t`days`,
        })}
      />
      <div className="CompetitionCountdown-separator">:</div>
      <Section
        number={hours}
        padNumber
        label={plural(hours, {
          one: t`hour`,
          other: t`hours`,
        })}
      />
      <div className="CompetitionCountdown-separator">:</div>
      <Section
        number={minutes}
        padNumber
        label={plural(minutes, {
          one: t`minute`,
          other: t`minutes`,
        })}
      />

      {isEndClose && <div className="CompetitionCountdown-separator">:</div>}
      {isEndClose && (
        <Section
          number={seconds}
          padNumber
          label={plural(seconds, {
            one: t`second`,
            other: t`seconds`,
          })}
        />
      )}
    </div>
  );
}

function calculateTimeLeft(end: number) {
  const now = Date.now() / 1000;
  return Math.ceil(end - now);
}

function Section({
  labelClassname,
  number,
  label,
  padNumber,
}: {
  labelClassname?: string;
  number: number | undefined | string;
  label: string;
  padNumber?: boolean;
}) {
  const numberString = useMemo(() => {
    if (typeof number === "undefined") return "";
    if (!padNumber) return number.toString();
    if (typeof number === "string") return number;
    if (number < 10) return `0${number}`;
    return number.toString();
  }, [number, padNumber]);
  return (
    <div className="CompetitionCountdown__section">
      <div className="CompetitionCountdown__section-number">{numberString}</div>
      <div className={`CompetitionCountdown__section-label ${labelClassname}`}>{label}</div>
    </div>
  );
}

function plural(value: number | string, options: { one: string; other: string }): string {
  const numberString = value.toString();
  const isOne = numberString.charAt(numberString.length - 1) === "1";
  return isOne ? options.one : options.other;
}
