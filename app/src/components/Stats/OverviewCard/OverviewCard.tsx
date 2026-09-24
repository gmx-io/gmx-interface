import { msg, t } from '@lingui/macro';
import type { MessageDescriptor } from '@lingui/core';
import { useLingui } from '@lingui/react';
import { differenceInDays, differenceInHours } from 'date-fns';
import { useEffect, useState } from 'react';
import { useMedia } from 'react-use';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import './overview.scss';
import { useStatsJson } from '@/hooks/statsHooks/useStatsJson';

const translate = (label: string, duration: string): MessageDescriptor =>
  ({
    '24h volume': msg`24h volume`,
    'Open interest': msg`Open interest`,
    'Long positions': msg`Long positions`,
    'Short positions': msg`Short positions`,
    TVL: msg`TVL`,
    'GM pools': msg`GM pools`,
    Solana: msg`Solana`,
    Arbitrum: msg`Arbitrum`,
    Avalanche: msg`Avalanche`,
    MegaETH: msg`MegaETH`,
    Total: msg`Total`,
    'Annualized fees': msg`Annualized fees`,
    'Annualized GMX buy pressure': msg`Annualized GMX buy pressure`,
    'Annualized data based on the past 7 days': msg`Annualized data based on the past 7 days`,
    'TVL includes GMX staked, GM pools, and position collateral': msg`TVL includes GMX staked, GM pools, and position collateral`,
    'Total value of tokens in GM pools': msg`Total value of tokens in GM pools`,
  })[label] ??
  (label === 'Fees for the past'
    ? msg`Fees for the past ${duration}`
    : msg`${label}`);

const DAY_OF_THE_WEEK_EPOCH_STARTS_UTC = 3;

const getFormattedFeesDuration = () => {
  const now = new Date();
  const daysSinceWednesday =
    (now.getUTCDay() + (7 - DAY_OF_THE_WEEK_EPOCH_STARTS_UTC)) % 7;
  const epochStartedDate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysSinceWednesday,
      0,
      0,
      0
    )
  );
  const days = differenceInDays(now, epochStartedDate);
  let restHours =
    differenceInHours(now, epochStartedDate, { roundingMethod: 'round' }) -
    days * 24;

  if (days === 0) {
    restHours = Math.max(restHours, 1);
  }

  return [days > 0 ? `${days}d` : '', restHours > 0 ? `${restHours}h` : '']
    .filter(Boolean)
    .join(' ');
};
const rows = [
  ['24h volume', 'Open interest', 'Long positions', 'Short positions'],
  ['Fees for the past', 'TVL', 'GM pools'],
];
const details: Record<string, string[]> = {
  '24h volume': ['Solana', 'Arbitrum', 'Avalanche', 'MegaETH', 'Total'],
  'Open interest': ['Solana', 'Arbitrum', 'Avalanche', 'MegaETH', 'Total'],
  'Long positions': ['Solana', 'Arbitrum', 'Avalanche', 'MegaETH', 'Total'],
  'Short positions': ['Solana', 'Arbitrum', 'Avalanche', 'MegaETH', 'Total'],
  'Fees for the past': [
    'Solana',
    'Arbitrum',
    'Avalanche',
    'MegaETH',
    'Total',
    'Annualized fees',
    'Annualized GMX buy pressure',
  ],
  TVL: ['Arbitrum', 'Solana', 'Avalanche', 'MegaETH', 'Total'],
  'GM pools': ['Arbitrum', 'Solana', 'Avalanche', 'MegaETH', 'Total'],
};
const descriptions: Record<string, string> = {
  'Fees for the past': 'Annualized data based on the past 7 days',
  TVL: 'TVL includes GMX staked, GM pools, and position collateral',
  'GM pools': 'Total value of tokens in GM pools',
};
const OverviewCard = () => {
  const isMobile = useMedia('(max-width:768px)');
  const [formattedDuration, setFormattedDuration] = useState(() =>
    getFormattedFeesDuration()
  );
  const { _ } = useLingui();
  const stats = useStatsJson();

  useEffect(() => {
    const interval = setInterval(
      () => setFormattedDuration(getFormattedFeesDuration()),
      60 * 1000
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="stats-card stats-overview-card bg-fill-surface-base flex-1 rounded-[0.8rem]">
      <p
        className={`card-key flex h-[48px] items-center border-b-[0.1rem] border-[#535353] px-[2rem] font-[500] leading-[2rem] ${isMobile ? 'text-[1.4rem]' : 'text-[1.6rem]'}`}
      >
        {t`Overview`}
      </p>
      <div className="flex flex-wrap">
        {rows.map((column, columnIndex) => (
          <div
            key={columnIndex}
            className={`min-w-[28rem] flex-1 px-[2rem] py-[1.3rem] ${columnIndex === 1 ? 'stats-overview-second-column border-l-[0.1rem] border-[#535353]' : ''}`}
          >
            <ul className="flex flex-col gap-[0.8rem] leading-[1.8rem]">
              {column.map((label) => (
                <li
                  key={label}
                  className="flex items-center justify-between gap-[0.8rem]"
                >
                  <span className="card-key text-[1.4rem] text-[#A3A3A3]">
                    {_(translate(label, formattedDuration))}
                  </span>
                  <TooltipWithPortal
                    tooltipClassName="stats-tooltip"
                    position="bottom-end"
                    handle={
                      <span className="card-value font-tnum text-[1.4rem]">
                        {stats[label]?.value ?? ''}
                      </span>
                    }
                    renderContent={() => (
                      <div className="font-tnum min-w-[20rem]">
                        {descriptions[label] &&
                          label !== 'Fees for the past' && (
                            <p className="mb-0 pb-[16px] leading-[17.5px]">
                              {_(
                                translate(
                                  descriptions[label],
                                  formattedDuration
                                )
                              )}
                            </p>
                          )}
                        {details[label].map((key, index, detailItems) => {
                          const isTotal = key === 'Total';
                          const isLast = index === detailItems.length - 1;

                          return (
                            <div
                              key={key}
                              className={`flex justify-between gap-[1.2rem] leading-[2.4rem] ${
                                isTotal
                                  ? `border-t border-[#535353] ${isLast ? '' : 'border-b'}`
                                  : ''
                              }`}
                            >
                              <span className="text-[#A3A3A3]">
                                {_(translate(key, formattedDuration))}:
                              </span>
                              <span>{stats[label]?.detail[key] ?? ''}</span>
                            </div>
                          );
                        })}
                        {descriptions[label] &&
                          label === 'Fees for the past' && (
                            <p className="mt-0 pt-[16px] leading-[17.5px]">
                              {_(
                                translate(
                                  descriptions[label],
                                  formattedDuration
                                )
                              )}
                            </p>
                          )}
                      </div>
                    )}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
export default OverviewCard;
