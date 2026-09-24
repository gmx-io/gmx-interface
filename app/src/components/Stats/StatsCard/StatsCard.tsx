import { msg, t } from '@lingui/macro';
import type { MessageDescriptor } from '@lingui/core';
import { useLingui } from '@lingui/react';
import { useMedia } from 'react-use';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import './statsCard.scss';
import { useStatsJson } from '@/hooks/statsHooks/useStatsJson';

const translate = (label: string): MessageDescriptor =>
  ({
    Fees: msg`Fees`,
    Volume: msg`Volume`,
    Users: msg`Users`,
    Treasury: msg`Treasury`,
    Solana: msg`Solana`,
    Arbitrum: msg`Arbitrum`,
    Avalanche: msg`Avalanche`,
    MegaETH: msg`MegaETH`,
    Total: msg`Total`,
    'In other tokens': msg`In other tokens`,
    'In GMX': msg`In GMX`,
  })[label] ?? msg`${label}`;

const stats = ['Fees', 'Volume', 'Users', 'Treasury'];
const details: Record<string, string[]> = {
  Fees: ['Arbitrum', 'Avalanche', 'Solana', 'MegaETH', 'Total'],
  Volume: ['Arbitrum', 'Solana', 'Avalanche', 'MegaETH', 'Total'],
  Users: ['Arbitrum', 'Avalanche', 'Solana', 'MegaETH', 'Total'],
  Treasury: ['In other tokens', 'In GMX'],
};

const StatsCard = () => {
  const isMobile = useMedia('(max-width:768px)');
  const { _ } = useLingui();
  const statsData = useStatsJson();

  return (
    <div className="stats-card flex-1 rounded-[0.8rem] bg-[#181818]">
      <p
        className={`card-key flex h-[48px] items-center border-b-[0.1rem] border-[#535353] px-[2rem] font-[500] leading-[2rem] ${isMobile ? 'text-[1.4rem]' : 'text-[1.6rem]'}`}
      >
        {t`Stats`}
      </p>
      <div className="px-[2rem] py-[1.3rem]">
        <ul className="flex flex-col gap-[0.8rem] leading-[1.8rem]">
          {stats.map((label) => (
            <li
              key={label}
              className="flex items-center justify-between gap-[0.8rem]"
            >
              <span className="card-key text-[1.4rem] text-[#A3A3A3]">
                {_(translate(label))}
              </span>
              <TooltipWithPortal
                tooltipClassName="stats-tooltip"
                position="bottom-end"
                handle={
                  <span className="card-value font-tnum text-[1.4rem]">
                    {statsData[label]?.value ?? ''}
                  </span>
                }
                renderContent={() => (
                  <div className="font-tnum min-w-[20rem]">
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
                            {_(translate(key))}:
                          </span>
                          <span>{statsData[label]?.detail[key] ?? ''}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
export default StatsCard;
