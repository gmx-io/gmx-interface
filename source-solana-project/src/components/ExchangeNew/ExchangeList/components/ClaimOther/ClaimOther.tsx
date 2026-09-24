import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';

import { t, Trans } from '@lingui/macro';
import { useMemo, useState } from 'react';
import { useMedia } from 'react-use';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';

import './ClaimOther.scss'
export function ClaimOther({
  autoClaimedFundingFees,
  autoClaimedPriceImpact,
  penddingFundingFees,
  pendingPriceImpact
}: {
  autoClaimedFundingFees: number | undefined;
  autoClaimedPriceImpact: number | undefined;
  penddingFundingFees: number | undefined;
  pendingPriceImpact: number | undefined;
}) {
  return (
    <div className='claim-other-view'>
      <div className='comm left'>
        <p className='label'> <Trans>ACCRUED</Trans></p>
        <div className='info'>
          <div className='item'>
            <div className='amount'>
              <TooltipWithPortal
                className="TradeFeesRow-tooltip"
                handle={
                  <p style={{ fontSize:'1.4rem' }}>${penddingFundingFees.toFixed(2)}</p>
                }
                position="top-end"
                renderContent={() => (
                  <div>
                    <p>{t`Accrued positive funding fees in positions not yet claimable.`}</p>
                    <p className='claim-subtitle'>{t`They become available after modifying the position by increasing or decreasing it, depositing or withdrawing collateral.`}</p>
                  </div>
                )}
              />
            </div>
            <div><Trans>Positive Funding Fees</Trans></div>
          </div>
          {/* <div className='item'>
            <div className='amount'>
              <TooltipWithPortal
                className="TradeFeesRow-tooltip"
                handle={
                  <p>${pendingPriceImpact.toFixed(2)}</p>
                }
                position="top-end"
                renderContent={() => (
                  <div>
                    <p>{t`Accrued price impact rebates. They will become claimable after approximately ten days.`}</p>
                    <p className='claim-subtitle'>
                      <a href="https://docs.gmxsol.io/about/trading_fees_and_rebates/#price-impact-rebates" target='_blank' rel="noopener noreferrer">{t`Read more.`}</a>
                    </p>
                  </div>
                )}
              />
            </div>
            <div><Trans>Positive Price Impact</Trans></div>
          </div> */}
        </div>
      </div>
      <div className='comm right'>
        <p className='label'><Trans>AUTO CLAIMED</Trans></p>
        <div className='info'>
          <div className='item'>
            <div className='amount'>
              <TooltipWithPortal
                className="TradeFeesRow-tooltip"
                handle={
                  <p style={{ fontSize:'1.4rem' }}>${autoClaimedFundingFees?.toFixed(2)}</p>
                }
                position="top-end"
                renderContent={() => (
                  <div>
                    <p>{t`Auto claimed positive funding fees.`}</p>
                    <p className='claim-subtitle'>{t`They are automatically claimed after modifying the position by increasing or decreasing it, depositing or withdrawing collateral.`}</p>
                  </div>
                )}
              />
            </div>
            <div><Trans>Positive Funding Fees</Trans></div>
          </div>
          {/* <div className='item'>
            <div className='amount'>
              <TooltipWithPortal
                className="TradeFeesRow-tooltip"
                handle={
                  <p>${autoClaimedPriceImpact?.toFixed(2)}</p>
                }
                position="top-end"
                renderContent={() => (
                  <div>
                    <p>{t`Claimable price impact rebates.`}</p>
                    <p className='claim-subtitle'>
                      <a href="https://docs.gmxsol.io/about/trading_fees_and_rebates#price-impact-rebates" target='_blank' rel="noopener noreferrer">{t`Read more.`}</a>
                    </p>
                  </div>
                )}
              />
            </div>
            <div><Trans>Positive Price Impact</Trans></div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
