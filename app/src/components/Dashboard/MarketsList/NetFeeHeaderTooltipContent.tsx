import './NetFeeHeaderTooltipContent.scss';

import { Trans } from '@lingui/macro';

export function renderNetFeeHeaderTooltipContent() {
  return (
    <div className="NetFeeHeaderTooltipContent-netfee-header-tooltip">
      <Trans>
        Net fee combines funding and borrowing fees but excludes open, swap or
        impact fees.
        <br />
        <br />
        Funding fees help to balance longs and shorts and are exchanged between
        both sides. <br />
        <br />
        Borrowing fees help ensure available liquidity.{' '}
      </Trans>
    </div>
  );
}
