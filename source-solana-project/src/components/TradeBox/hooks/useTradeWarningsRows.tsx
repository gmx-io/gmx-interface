import { HighPriceImpactWarning } from '@/components/HighPriceImpactWarning/HighPriceImpactWarning';
import { useAnchor } from '@/contexts/anchor';
import { usePriceImpactWarningState } from '@/hooks/tradeHooks/usePriceImpactWarningState';
import { selectTradeboxFromToken } from '@/selectors/tradebox/selectTradeboxFromToken';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';
import { useMemo } from 'react';

export function useTradeboxWarningsRows(
  priceImpactWarningState: ReturnType<typeof usePriceImpactWarningState>
) {
  const { owner } = useAnchor();
  const fromToken = useAppStore(selectTradeboxFromToken);

  const isBalanceLoading =
    owner && fromToken?.address && fromToken.balance === undefined;

  const consentError: string | undefined = useMemo(() => {
    if (priceImpactWarningState.validationError) {
      return t`Acknowledgment Required`;
    }

    if (isBalanceLoading) {
      return t`Loading...`;
    }

    return undefined;
  }, [priceImpactWarningState, isBalanceLoading]);

  const element = (
    <>
      <HighPriceImpactWarning
        priceImpactWarningState={priceImpactWarningState}
      />
    </>
  );

  return [element, consentError] as const;
}
