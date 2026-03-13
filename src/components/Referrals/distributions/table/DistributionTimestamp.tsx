import { useLingui } from "@lingui/react";
import { useMemo } from "react";

import { getDaysAgo } from "lib/dates";

export function DistributionTimestamp({ timestamp }: { timestamp: number }) {
  const { i18n } = useLingui();
  const locale = i18n.locale;

  const { dateTime, relativeTime } = useMemo(() => {
    const date = new Date(timestamp * 1000);
    const dateTime = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
    const daysAgo = getDaysAgo(timestamp);
    const relativeTime = new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(-daysAgo, "day");
    return { dateTime, relativeTime };
  }, [timestamp, locale]);

  return (
    <>
      <span className="text-typography-primary">{dateTime}</span>{" "}
      <span className="text-typography-secondary">({relativeTime})</span>
    </>
  );
}
