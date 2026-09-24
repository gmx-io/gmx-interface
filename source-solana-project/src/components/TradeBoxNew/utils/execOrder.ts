import { getGmw351Enabled } from '@/config/featureFlagEnable';
import * as ExecOrderOld from './execOrderOld';
import * as ExecOrderNew from './execOrderNew';

const impl = getGmw351Enabled() ? ExecOrderNew : ExecOrderOld;

export const useExecOrder = impl.useExecOrder;
export const useExecUpdateOrder = impl.useExecUpdateOrder;
export const useCreateOrderParamsByMarketIncrease =
  impl.useCreateOrderParamsByMarketIncrease;
export const useCreateOrderParamsByMarketDecrease =
  impl.useCreateOrderParamsByMarketDecrease;
export const useCreateOrderParamsByLimitIncrease =
  impl.useCreateOrderParamsByLimitIncrease;
export const useCreateOrderParamsByLimitDecrease =
  impl.useCreateOrderParamsByLimitDecrease;
export const useCreateOrderParamsByMarketSwap =
  impl.useCreateOrderParamsByMarketSwap;
export const useCreateOrderParamsByLimitSwap =
  impl.useCreateOrderParamsByLimitSwap;
export const useCreateOrderParamsByStopLossDecrease =
  impl.useCreateOrderParamsByStopLossDecrease;
export const useCreateOrderParamsByMarketTpsl =
  impl.useCreateOrderParamsByMarketTpsl;
export const useCreateOrderParamsByLimitTpsl =
  impl.useCreateOrderParamsByLimitTpsl;
export const useCreateOrderParamsByTpSlDecrease =
  impl.useCreateOrderParamsByTpSlDecrease;
export const useCreateOrderParamsByDepositMarketIncrease =
  impl.useCreateOrderParamsByDepositMarketIncrease;
export const useUpdateOrderByLongShortLimitIncrease =
  impl.useUpdateOrderByLongShortLimitIncrease;
export const useUpdateOrderByLimitSwap = impl.useUpdateOrderByLimitSwap;
export const useUpdateOrderByTpDecrease = impl.useUpdateOrderByTpDecrease;
export const useUpdateOrderBySlDecrease = impl.useUpdateOrderBySlDecrease;

export const isExecOrderSuccess = ExecOrderNew.isExecOrderSuccess;
export const getIncreaseTpslPendingMessage =
  ExecOrderNew.getIncreaseTpslPendingMessage;
export const getExecOrderResultMessage = ExecOrderNew.getExecOrderResultMessage;
export type { ExecOrderResult } from './execOrderNew';
export { getExecOrderErrorInfo } from './execOrderToast';
