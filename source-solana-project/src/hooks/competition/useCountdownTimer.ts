import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

export type CountdownStatus = 'notStarted' | 'running' | 'ended';

interface CountdownTimerResult {
  status: CountdownStatus;
  timeText: string;
  rawSeconds: number;
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return '00h 00m 00s';
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${h}h ${m}m ${s}s`;
}

export default function useCountdownTimer(
  startTimeUtc?: number,
  endTimeUtc?: number
): CountdownTimerResult {
  const [status, setStatus] = useState<CountdownStatus>('notStarted');
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!startTimeUtc || !endTimeUtc) return;

    const update = () => {
      const now = dayjs().utc().unix();
      let nextStatus: CountdownStatus;
      let nextSeconds = 0;

      if (now < startTimeUtc) {
        nextStatus = 'notStarted';
        nextSeconds = startTimeUtc - now;
      } else if (now >= startTimeUtc && now < endTimeUtc) {
        nextStatus = 'running';
        nextSeconds = endTimeUtc - now;
      } else {
        nextStatus = 'ended';
      }

      setStatus(nextStatus);
      setSecondsLeft(nextSeconds);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startTimeUtc, endTimeUtc]);

  let timeText = '';
  if (status === 'notStarted') timeText = `${formatTime(secondsLeft)}`;
  else if (status === 'running') timeText = `${formatTime(secondsLeft)}`;
  else timeText = '00h 00m 00s';

  return { status, timeText, rawSeconds: secondsLeft };
}
