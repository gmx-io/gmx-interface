import Tooltip from '@/components/Common/Tooltip/Tooltip';
import StatsTooltipRow from '@/components/Common/Tooltip/StatsTooltipRow';
import { BN_ZERO } from '@/config/constants';
import { formatAmount } from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { useCallback } from 'react';

export function AprInfo({
  apr,
  showTooltip = true,
}: {
  apr?: BN;
  showTooltip?: boolean;
}) {
  const totalApr = apr ?? BN_ZERO;
  const aprNode = <>{apr ? `${formatAmount(totalApr, 2, 2)}%` : '...'}</>;
  const renderTooltipContent = useCallback(() => {
    return (
      <StatsTooltipRow
        showDollar={false}
        label={t`Base APR`}
        value={`${formatAmount(apr ?? BN_ZERO, 2, 2)}%`}
      />
    );
  }, [apr]);
  return showTooltip ? (
    <Tooltip
      maxAllowedWidth={280}
      handle={aprNode}
      position="bottom-end"
      renderContent={renderTooltipContent}
    />
  ) : (
    aprNode
  );
}
