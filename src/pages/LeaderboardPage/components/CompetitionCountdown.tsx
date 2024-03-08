import { Trans, t } from "@lingui/macro";
import { useLeaderboardTiming } from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import { ReactNode, useEffect, useState } from "react";

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
    return (
      <div className="CompetitionCountdown">
        <Trans>This competition has ended</Trans>
      </div>
    );
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
    <div className="CompetitionCountdown">
      <Trans>
        {prefix}{" "}
        <span className="CompetitionCountdown__time">
          {days}d {hours}h {minutes}m {isEndClose ? t`${seconds}s` : ""}
        </span>
      </Trans>
    </div>
  );
}

function calculateTimeLeft(end: number) {
  const now = Date.now() / 1000;
  return Math.ceil(end - now);
}
