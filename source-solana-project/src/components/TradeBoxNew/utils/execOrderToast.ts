import { CreateOrderKind } from '@gmsol-labs/gmsol-sdk';
import { t } from '@lingui/macro';
import type { TradingErrorInfo } from '@/domain/supportChat/tradingErrorTracker';

export type ExecOrderResult = {
  succeeded: CreateOrderKind[];
  failed: CreateOrderKind[];
  signatures: string[];
  intended: CreateOrderKind[];
  errors?: unknown[];
};

export function getExecOrderErrorInfo(
  result: ExecOrderResult,
  actionName: string,
  collateral?: string
): TradingErrorInfo {
  return {
    actionName,
    collateral,
    signatures: result.signatures,
    errorData: result.errors?.[0] ?? new Error(`Failed order types: ${result.failed.join(', ')}`),
  };
}

export function isExecOrderSuccess(result: ExecOrderResult): boolean {
  return result.failed.length === 0 && result.signatures.length > 0;
}

function hasKind(kinds: CreateOrderKind[], kind: CreateOrderKind): boolean {
  return kinds.includes(kind);
}

function isIncreaseKind(kind: CreateOrderKind): boolean {
  return kind === 'MarketIncrease' || kind === 'LimitIncrease';
}

type ToastScenario =
  | 'position-tpsl'
  | 'market-increase-tpsl'
  | 'limit-increase-tpsl';

function classifyScenario(intended: CreateOrderKind[]): ToastScenario | null {
  const hasTp = intended.includes('LimitDecrease');
  const hasSl = intended.includes('StopLossDecrease');
  if (!hasTp && !hasSl) {
    return null;
  }
  if (intended.includes('MarketIncrease')) {
    return 'market-increase-tpsl';
  }
  if (intended.includes('LimitIncrease')) {
    return 'limit-increase-tpsl';
  }
  return 'position-tpsl';
}

/** Pending toast while submitting increase + optional TP/SL */
export function getIncreaseTpslPendingMessage(
  marketType: 'Market' | 'Limit',
  hasTp: boolean,
  hasSl: boolean
): string {
  if (marketType === 'Limit') {
    if (hasTp && hasSl) {
      return t`Creating limit increase order with TP&SL order...`;
    }
    if (hasTp) {
      return t`Creating limit increase order with TP order...`;
    }
    if (hasSl) {
      return t`Creating limit increase order with SL order...`;
    }
    return t`Creating limit increase order...`;
  }
  if (hasTp && hasSl) {
    return t`Creating market increase order with TP&SL order...`;
  }
  if (hasTp) {
    return t`Creating market increase order with TP order...`;
  }
  if (hasSl) {
    return t`Creating market increase order with SL order...`;
  }
  return t`Creating market increase order...`;
}

/** Result toast for position TP/SL or increase + TP/SL batches */
export function getExecOrderResultMessage(
  intended: CreateOrderKind[],
  result: ExecOrderResult
): { type: 'success' | 'error'; message: string } | null {
  const scenario = classifyScenario(intended);
  if (!scenario) {
    return null;
  }

  const { succeeded, failed } = result;
  const intendedTp = intended.includes('LimitDecrease');
  const intendedSl = intended.includes('StopLossDecrease');
  const tpOk = intendedTp && hasKind(succeeded, 'LimitDecrease');
  const slOk = intendedSl && hasKind(succeeded, 'StopLossDecrease');
  const tpFail = intendedTp && hasKind(failed, 'LimitDecrease');
  const slFail = intendedSl && hasKind(failed, 'StopLossDecrease');
  const increaseIntended = intended.find(isIncreaseKind);
  const increaseOk =
    !!increaseIntended && hasKind(succeeded, increaseIntended);
  const increaseFail =
    !!increaseIntended && hasKind(failed, increaseIntended);

  if (scenario === 'position-tpsl') {
    if (intendedTp && intendedSl) {
      if (tpOk && slOk) {
        return { type: 'success', message: t`TP&SL order created.` };
      }
      if (tpFail && slFail) {
        return { type: 'error', message: t`Failed to create TP&SL order.` };
      }
      if (tpOk && slFail) {
        return {
          type: 'error',
          message: t`TP order created, but SL order failed.`,
        };
      }
      if (slOk && tpFail) {
        return {
          type: 'error',
          message: t`SL order created, but TP failed.`,
        };
      }
      return { type: 'error', message: t`Failed to create TP&SL order.` };
    }
    if (intendedTp && !intendedSl) {
      if (tpOk) {
        return { type: 'success', message: t`TP order created.` };
      }
      return { type: 'error', message: t`Failed to create TP order.` };
    }
    if (intendedSl && !intendedTp) {
      if (slOk) {
        return { type: 'success', message: t`SL order created.` };
      }
      return { type: 'error', message: t`Failed to create SL order.` };
    }
  }

  const isLimit = scenario === 'limit-increase-tpsl';

  if (increaseFail || (!increaseOk && !!increaseIntended)) {
    return {
      type: 'error',
      message: isLimit
        ? t`Failed to create limit increase order.`
        : t`Failed to create market increase order.`,
    };
  }

  if (intendedTp && intendedSl) {
    if (tpOk && slOk) {
      return {
        type: 'success',
        message: isLimit
          ? t`Limit increase order with TP&SL order created.`
          : t`Market increase order with TP&SL order created.`,
      };
    }
    if (tpFail && slFail) {
      return {
        type: 'error',
        message: isLimit
          ? t`Limit increase order created, but TP&SL order failed.`
          : t`Market increase order created, but TP&SL order failed.`,
      };
    }
    if (tpOk && slFail) {
      return {
        type: 'error',
        message: isLimit
          ? t`Limit increase order and TP order created, but SL order failed.`
          : t`Market increase order and TP order created, but SL order failed.`,
      };
    }
    if (slOk && tpFail) {
      return {
        type: 'error',
        message: isLimit
          ? t`Limit increase order and SL order created, but TP order failed.`
          : t`Market increase order and SL order created, but TP order failed.`,
      };
    }
  }

  if (intendedTp && !intendedSl) {
    if (tpOk) {
      return {
        type: 'success',
        message: isLimit
          ? t`Limit increase order with TP order created.`
          : t`Market increase order with TP order created.`,
      };
    }
    if (tpFail) {
      return {
        type: 'error',
        message: isLimit
          ? t`Limit increase order created, but TP order failed.`
          : t`Market increase order created, but TP order failed.`,
      };
    }
  }

  if (intendedSl && !intendedTp) {
    if (slOk) {
      return {
        type: 'success',
        message: isLimit
          ? t`Limit increase order with SL order created.`
          : t`Market increase order with SL order created.`,
      };
    }
    if (slFail) {
      return {
        type: 'error',
        message: isLimit
          ? t`Limit increase order created, but SL order failed.`
          : t`Market increase order created, but SL order failed.`,
      };
    }
  }

  return {
    type: 'error',
    message: isLimit
      ? t`Failed to create limit increase order.`
      : t`Failed to create market increase order.`,
  };
}
