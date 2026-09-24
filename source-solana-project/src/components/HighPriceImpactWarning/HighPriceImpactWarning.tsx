import Checkbox from '@/components/Common/CheckBox/CheckBox';
import { PriceImpactWarningState } from '@/hooks/tradeHooks/usePriceImpactWarningState';
import { t, Trans } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { useMemo } from 'react';

export type Props = {
  priceImpactWarningState: PriceImpactWarningState;
  className?: string;
};

export function HighPriceImpactWarning({
  priceImpactWarningState,
  className,
}: Props) {
  const { i18n } = useLingui();
  const warnings = useMemo(() => {
    const warnings: string[] = [];
    if (priceImpactWarningState.shouldShowWarningForPosition) {
      warnings.push(t`price impact`);
    }

    if (priceImpactWarningState.shouldShowWarningForCollateral) {
      warnings.push(t`impact on collateral`);
    }

    if (priceImpactWarningState.shouldShowWarningForSwap) {
      warnings.push(t`swap price impact`);
    }

    if (priceImpactWarningState.shouldShowWarningForSwapProfitFee) {
      warnings.push(t`swap profit fee`);
    }

    if (priceImpactWarningState.shouldShowWarningForExecutionFee) {
      warnings.push(t`network fees`);
    }

    return warnings;
  }, [
    priceImpactWarningState.shouldShowWarningForCollateral,
    priceImpactWarningState.shouldShowWarningForExecutionFee,
    priceImpactWarningState.shouldShowWarningForPosition,
    priceImpactWarningState.shouldShowWarningForSwap,
    priceImpactWarningState.shouldShowWarningForSwapProfitFee,
    i18n.locale,
  ]);

  if (!priceImpactWarningState.shouldShowWarning) {
    return null;
  }

  return (
    <div className={className}>
      <Checkbox
        asRow
        isChecked={priceImpactWarningState.isAccepted}
        setIsChecked={priceImpactWarningState.setIsAccepted}
        qa="high-price-impact-warning"
      >
        <span className="text-body-medium text-yellow-500">
          {warnings.length > 1 ? (
            <Trans>
              Acknowledge high {warnings.slice(0, -1).join(', ')} and{' '}
              {warnings.slice(-1)}
            </Trans>
          ) : (
            <Trans>Acknowledge high {warnings[0]}</Trans>
          )}
        </span>
      </Checkbox>
    </div>
  );
}
