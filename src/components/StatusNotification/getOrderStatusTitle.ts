import { t } from "@lingui/macro";

import type { MarketInfo } from "domain/synthetics/markets";
import {
  type OrderTxnType,
  type OrderType,
  isIncreaseOrderType,
  isLimitSwapOrderType,
  isMarketOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
} from "domain/synthetics/orders";
import { isMarginDepositOrder } from "domain/synthetics/orders/marginDeposit";
import { getNameByOrderType } from "domain/synthetics/positions";
import type { TokenData } from "domain/synthetics/tokens";
import { isFullPositionCloseSizeDeltaUsd } from "domain/tpsl/utils";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getTokenVisualMultiplier } from "sdk/configs/tokens";

export type OrderStatusTitleData = {
  txnType: OrderTxnType;
  orderType: OrderType;
  isLong: boolean;
  isTwap: boolean;
  sizeDeltaUsd: bigint;
  initialCollateralDeltaAmount: bigint;
  minOutputAmount: bigint;
  expectedOutputAmount?: bigint;
  shouldUnwrapNativeToken: boolean;
  marketInfo: MarketInfo | undefined;
  initialCollateralToken: TokenData | undefined;
  targetCollateralToken: TokenData | undefined;
};

export function getOrderStatusTitle(orderData: OrderStatusTitleData | undefined) {
  if (!orderData) {
    return t`Unknown order`;
  }

  if (isSwapOrderType(orderData.orderType)) {
    const {
      initialCollateralToken,
      targetCollateralToken,
      initialCollateralDeltaAmount,
      minOutputAmount,
      expectedOutputAmount,
    } = orderData;

    let orderTypeText = isLimitSwapOrderType(orderData.orderType) ? t`Limit Swap` : t`Swap`;

    if (orderData.isTwap) {
      orderTypeText = t`TWAP Swap`;
    }

    const outputAmount =
      expectedOutputAmount !== undefined && expectedOutputAmount > 0n ? expectedOutputAmount : minOutputAmount;

    return t`${orderTypeText} ${formatTokenAmount(
      initialCollateralDeltaAmount,
      initialCollateralToken?.decimals,
      initialCollateralToken?.symbol,
      { isStable: initialCollateralToken?.isStable }
    )} for ${formatTokenAmount(outputAmount, targetCollateralToken?.decimals, targetCollateralToken?.symbol, {
      isStable: targetCollateralToken?.isStable,
    })}`;
  } else {
    const {
      txnType,
      marketInfo,
      sizeDeltaUsd,
      orderType,
      isLong,
      initialCollateralDeltaAmount,
      initialCollateralToken,
    } = orderData;

    const visualMultiplierPrefix = marketInfo?.indexToken ? getTokenVisualMultiplier(marketInfo.indexToken) : "";
    const indexTokenText = `${visualMultiplierPrefix}${marketInfo?.indexToken.symbol}`;

    if (sizeDeltaUsd == 0n) {
      const symbol = orderData.shouldUnwrapNativeToken
        ? initialCollateralToken?.baseSymbol
        : initialCollateralToken?.symbol;
      const amountText = formatTokenAmount(initialCollateralDeltaAmount, initialCollateralToken?.decimals, symbol, {
        isStable: initialCollateralToken?.isStable,
      });

      if (isMarginDepositOrder(orderData)) {
        const longShortText = isLong ? t`Long` : t`Short`;
        const txnTypeText = {
          create: t`Create`,
          cancel: t`Cancel`,
          update: t`Update`,
        }[txnType];

        return t`${txnTypeText} margin deposit: ${amountText} to ${indexTokenText} ${longShortText}`;
      }

      if (isIncreaseOrderType(orderType)) {
        return isLong
          ? t`Depositing ${amountText} to ${indexTokenText} Long...`
          : t`Depositing ${amountText} to ${indexTokenText} Short...`;
      } else {
        return isLong
          ? t`Withdrawing ${amountText} from ${indexTokenText} Long...`
          : t`Withdrawing ${amountText} from ${indexTokenText} Short...`;
      }
    } else {
      if (isMarketOrderType(orderType)) {
        const sizeDeltaUsdText = formatUsd(sizeDeltaUsd);

        if (isIncreaseOrderType(orderType)) {
          return isLong
            ? t`Increasing ${indexTokenText} Long: +${sizeDeltaUsdText}`
            : t`Increasing ${indexTokenText} Short: +${sizeDeltaUsdText}`;
        }

        return isLong
          ? t`Decreasing ${indexTokenText} Long: -${sizeDeltaUsdText}`
          : t`Decreasing ${indexTokenText} Short: -${sizeDeltaUsdText}`;
      } else {
        const longShortText = isLong ? t`Long` : t`Short`;
        const txnTypeText = {
          create: t`Create`,
          cancel: t`Cancel`,
          update: t`Update`,
        }[txnType];

        const orderTypeText = t`${txnTypeText} ${getNameByOrderType(orderType, orderData.isTwap, {
          abbr: true,
          lower: true,
        })} order for`;
        const sign = isIncreaseOrderType(orderType) ? "+" : "-";
        const sizeText =
          isTriggerDecreaseOrderType(orderType) && isFullPositionCloseSizeDeltaUsd(sizeDeltaUsd)
            ? t`Full position close`
            : `${sign}${formatUsd(sizeDeltaUsd)}`;

        return t`${orderTypeText} ${visualMultiplierPrefix}${marketInfo?.indexToken?.symbol} ${longShortText}: ${sizeText}`;
      }
    }
  }
}
