import { TradeModel } from '@/config/competitions';
import { CompetitionConfig } from '@/routes/Competition';
import { formatUsd } from '@/utils/legacy';
import { BN } from '@coral-xyz/anchor';
import { t, Trans } from '@lingui/macro';
import { ReactNode, useMemo, useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';

interface RuleNodeItem {
  label: string;
  content: ReactNode;
  status: boolean;
  display: boolean;
}

const RuleNodesBoard = ({
  competitionConfig,
  competitionInfo,
}: {
  competitionConfig: CompetitionConfig;
  competitionInfo: {
    volumeThreshold: BN;
    extensionDuration: number;
  };
}) => {
  const [ruleNodeStatus, setRuleNodeStatus] = useState({
    index: -1,
    status: false,
  });

  const rulesNodes = useMemo<RuleNodeItem[]>(() => {
    return [
      {
        label: t`How to Join?`,
        content: (
          <span>
            {t`All trades executed during the competition period are automatically counted as entries, unless you manually opt out before placing the trade.`}
          </span>
        ),
        status: false,
        display: true,
      },
      {
        label: t`What Counts as a Valid Trade?`,
        content:
          competitionConfig?.tradeModel === TradeModel.OPEN
            ? (
              <>
                <span>
                  {t`In this competition, only position increases count. Reducing a position won't add to the total volume or qualify for the last trade.`}
                </span>
                <span>
                  {t`Only regular trades during the competition window are counted. ADL or liquidations do not count.`}
                </span>
                <span>{t`Each wallet is treated independently.`}</span>
              </>
            )
            : (
              <>
                <span>
                  {t`Both opening and closing positions are counted toward the total trading volume.`}
                </span>
                <span>
                  {t`Only regular trades during the competition window are counted. ADL or liquidations do not count.`}
                </span>
                <span>{t`Each wallet is treated independently.`}</span>
              </>
            ),
        status: false,
        display: true,
      },
      {
        label: t`Timer & Extensions`,
        content: (
          <>
            <span>{t`The initial competition duration is 24 hours.`}</span>
            <span>
              {t`Each eligible trade over ${formatUsd(competitionInfo?.volumeThreshold, { displayDecimals: 0 })} extends the timer by ${competitionInfo?.extensionDuration.toString()} seconds, with a maximum extension that does not surpass the current 24-hour window.`}
            </span>
          </>
        ),
        status: false,
        display: true,
      },
      {
        label: t`Prize Pool`,
        content: (
          <span>
            {t`The prize pool starts at ${formatUsd(competitionConfig?.basePrize, { displayDecimals: 0 })} and grows dynamically in real-time, with ${(competitionConfig?.treasuryPriceFactor || 0) * 100}% of GMXSOL treasury revenue added during the competition period.`}
          </span>
        ),
        status: false,
        display: true,
      },
      {
        label: t`Prize Distribution`,
        content: (
          <>
            <span>
              {t`30% of the prize pool will be awarded to the final eligible trade over ${formatUsd(competitionInfo?.volumeThreshold, { displayDecimals: 0 })}.`}
            </span>
            <span>
              {t`The remaining 70% will be distributed among the Top 5 traders by volume as follows:`}
            </span>
            <ul>
              <li>{t`1st place`}: 35%</li>
              <li>{t`2nd place`}: 18%</li>
              <li>{t`3rd place`}: 10%</li>
              <li>{t`4th place`}: 5%</li>
              <li>{t`5th place`}: 2%</li>
            </ul>
            <span>
              {t`Rewards will be sent within 24 hours after the competition ends to the winning addresses.`}
            </span>
          </>
        ),
        display: true,
        status: false,
      },
      {
        label: t`More About the Competition`,
        content: (
          <>
            <span>
              {t`The GMXSOL trading competition will be held in multiple rounds. This is the kickoff round.`}
            </span>
            <span>
              {t`During this round, you can trade SOL, BTC, and ETH with 0% trading fees.`}
            </span>
            <span>{t`Participate now and stay tuned for future rounds!`}</span>
          </>
        ),
        display: competitionConfig?.showMoreAbout ?? false,
        status: false,
      },
    ];
  }, [
    competitionConfig?.basePrize,
    competitionConfig?.showMoreAbout,
    competitionConfig?.tradeModel,
    competitionConfig?.treasuryPriceFactor,
    competitionInfo?.extensionDuration,
    competitionInfo?.volumeThreshold,
  ]);
  return (
    <div className="rules mx-auto w-[120rem]">
      <p className="label">
        <Trans>About the Competition</Trans>
      </p>
      {rulesNodes &&
        rulesNodes.length > 0 &&
        rulesNodes
          .filter((item) => item.display)
          .map((item, index) => {
            return (
              <div className="group" key={index}>
                <p
                  onClick={() => {
                    setRuleNodeStatus((prevStatus) => ({
                      index: index,
                      status:
                        prevStatus.index === index ? !prevStatus.status : true,
                    }));
                  }}
                >
                  <em>{item.label}</em>
                  <FiChevronDown
                    className={`icon transition-transform ${item.status ? 'rotate-180' : ''}`}
                  />
                </p>
                <div
                  className={`desc ${ruleNodeStatus.index === index && ruleNodeStatus.status ? 'show' : 'hidden'}`}
                >
                  {item.content}
                </div>
              </div>
            );
          })}
    </div>
  );
};

export default RuleNodesBoard;
