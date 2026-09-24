import { useEffect, useState } from 'react';

export function useTimeUntilMidnight() {
  const [timeLeft, setTimeLeft] = useState(() => {
    const now = new Date();
    const utcMidnight = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0
      )
    );
    return Math.floor((utcMidnight.getTime() - now.getTime()) / (1000 * 60));
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeLeft((prev) => (prev <= 0 ? 1440 : prev - 1)); // 1440 = 24 * 60 minutes
    }, 60000); // Update every minute

    return () => clearInterval(intervalId);
  }, []);

  const hours = Math.floor(timeLeft / 60);
  const minutes = timeLeft % 60;

  return {
    timeLeft: timeLeft * 60, // Convert to seconds for backward compatibility
    formattedTime: `${hours} h ${minutes} m`,
  };
}
