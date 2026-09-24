import { ExchangeInfo } from '@/components/Exchange/ExchangeInfo';
import { BN_ZERO } from '@/config/constants';
import { selectTradeboxToToken } from '@/selectors/tradebox/selectTradeboxToToken';
import { selectSavedAllowedSlippage } from '@/selectors/setting/baseSelectors';
import { applySlippageToMinOut } from '@/utils/tradebox/applySlippageToMinOut';
import { selectTradeboxSwapAmounts } from '@/selectors/tradebox/selectTradeboxSwapAmounts';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';

import { formatTokenAmount } from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { Trans } from '@lingui/macro';

export function MinReceiveRow() {
  const { isMarket, isSwap } = useAppStore(selectTradeboxTradeFlags);
  const swapAmounts = useAppStore(selectTradeboxSwapAmounts);
  const allowedSlippage = useAppStore(selectSavedAllowedSlippage);
  const toToken = useAppStore(selectTradeboxToToken);

  if (!isSwap) {
    return null;
  }

  return (
    <ExchangeInfo.Row label={<Trans>Min. Receive</Trans>}>
      {isMarket && swapAmounts?.minOutputAmount
        ? formatTokenAmount(
            applySlippageToMinOut(allowedSlippage, swapAmounts.minOutputAmount),
            toToken?.decimals,
            toToken?.symbol
          )
        : formatTokenAmount(
            swapAmounts?.minOutputAmount ?? BN_ZERO,
            toToken?.decimals,
            toToken?.symbol
          )}
    </ExchangeInfo.Row>
  );
}
