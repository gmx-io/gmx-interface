import { useCallback, useEffect, useState } from "react";

import {
  AB_HIGH_LEVERAGE_WARNING_ALTCOIN_LEVERAGE,
  AB_HIGH_LEVERAGE_WARNING_GROUP,
  AB_HIGH_LEVERAGE_WARNING_MAJOR_TOKEN_LEVERAGE,
  AB_HIGH_LEVERAGE_WARNING_PROBABILITY,
} from "config/ab";
import { ARBITRUM, AVALANCHE, BOTANIX } from "config/chains";
import { getHighLeverageWarningDismissedTimestampKey } from "config/localStorage";
import { selectAccount, selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectIsLeverageSliderEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { selectTradeboxToTokenAddress } from "context/SyntheticsStateContext/selectors/shared/baseSelectors";
import {
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxLeverage,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useIsFreshAccountForHighLeverageTrading } from "domain/synthetics/accountStats/useIsFreshAccountForHighLeverageTrading";
import { useIsAddressInGroup } from "lib/userAnalytics/getIsAddressInGroup";
import { getToken } from "sdk/configs/tokens";

const IS_MAJOR_TOKEN_MAP: Record<number, string[]> = {
  [ARBITRUM]: ["BTC", "ETH", "SOL"],
  [AVALANCHE]: ["AVAX", "ETH", "BTC"],
  [BOTANIX]: ["BTC"],
};

const WAIVE_DISMISSAL_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours
const DISMISSAL_POLL_INTERVAL_MS = 5000;

function getDismissedTimestamp(account: string) {
  const value = localStorage.getItem(getHighLeverageWarningDismissedTimestampKey(account));
  if (value === null) {
    return 0;
  }

  const timestamp = Number(value);
  return isNaN(timestamp) ? 0 : timestamp;
}

export function useShowHighLeverageWarning(): {
  showHighLeverageWarning: boolean;
  dismissHighLeverageWarning: () => void;
} {
  const chainId = useSelector(selectChainId);
  const account = useSelector(selectAccount);
  const isFreshAccount = useIsFreshAccountForHighLeverageTrading();

  const isInGroup = useIsAddressInGroup({
    address: account,
    experimentGroupProbability: AB_HIGH_LEVERAGE_WARNING_PROBABILITY,
    grouping: AB_HIGH_LEVERAGE_WARNING_GROUP,
  });

  const toTokenAddress = useSelector(selectTradeboxToTokenAddress);
  const toTokenSymbol = toTokenAddress ? getToken(chainId, toTokenAddress).symbol : undefined;
  const isMajorToken = toTokenSymbol ? IS_MAJOR_TOKEN_MAP[chainId].includes(toTokenSymbol) : false;
  const isLeverageSliderEnabled = useSelector(selectIsLeverageSliderEnabled);
  const leverageSliderLeverage = useSelector(selectTradeboxLeverage);
  const amounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const leverage = isLeverageSliderEnabled ? leverageSliderLeverage : amounts?.estimatedLeverage ?? 0n;

  const isHighLeverage = isMajorToken
    ? leverage >= AB_HIGH_LEVERAGE_WARNING_MAJOR_TOKEN_LEVERAGE
    : leverage >= AB_HIGH_LEVERAGE_WARNING_ALTCOIN_LEVERAGE;

  const [dismissedTimestamp, setDismissedTimestamp] = useState(() => {
    if (!account) {
      return 0;
    }

    return getDismissedTimestamp(account);
  });

  useEffect(() => {
    if (!account) {
      return;
    }

    const timer = window.setInterval(() => {
      const freshDismissedTimestamp = getDismissedTimestamp(account);
      if (freshDismissedTimestamp !== dismissedTimestamp) {
        setDismissedTimestamp(freshDismissedTimestamp);
      }
    }, DISMISSAL_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [account, dismissedTimestamp]);

  const isDismissed = (dismissedTimestamp ?? 0) > Date.now() - WAIVE_DISMISSAL_PERIOD_MS;

  const dismissHighLeverageWarning = useCallback(() => {
    setDismissedTimestamp(Date.now());
    if (account) {
      localStorage.setItem(getHighLeverageWarningDismissedTimestampKey(account), Date.now().toString());
    }
  }, [setDismissedTimestamp, account]);

  return {
    showHighLeverageWarning: isFreshAccount && isInGroup && isHighLeverage && !isDismissed,
    dismissHighLeverageWarning,
  };
}
