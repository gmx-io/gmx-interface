import { t } from "@lingui/macro";
import { useEffect, useState } from "react";

import { isMarketOrderType } from ".";
import { OrderInfo } from ".";
import { OracleSettingsData } from "../common/useOracleSettingsData";

export const useDisabledCancelMarketOrderMessage = (
  order: OrderInfo,
  oracleSettings: OracleSettingsData | undefined
) => {
  const [diff, setDiff] = useState(
    oracleSettings
      ? Number(order.updatedAtTime) + Number(oracleSettings.requestExpirationTime) - Date.now() / 1000
      : null
  );

  useEffect(() => {
    if (!oracleSettings) return;
    const interval = setInterval(() => {
      if (diff && diff > 0) {
        const time = Date.now() / 1000;
        setDiff(Number(order.updatedAtTime) + Number(oracleSettings.requestExpirationTime) - time);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [order.updatedAtTime, oracleSettings, diff]);

  if (!oracleSettings || !isMarketOrderType(order.orderType)) return undefined;

  if (diff && diff > 0) {
    const minutes = Math.floor(diff / 60);
    const seconds = Math.floor(diff % 60);

    const minutesText = minutes > 0 ? `${minutes}m ` : "";
    return t`Market order will be cancellable in ${minutesText}${seconds}s.`;
  }

  if (diff === null) return t`Market order will be cancellable in ...`;

  return undefined;
};
