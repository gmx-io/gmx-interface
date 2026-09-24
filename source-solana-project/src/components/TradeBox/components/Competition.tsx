import React, { useState, useCallback, useMemo, useEffect } from 'react';
import useCompetitionList from '@/hooks/competition/useCompetitionList';
import useCountdownTimer from '@/hooks/competition/useCountdownTimer';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react';
import { BiChevronDown, BiChevronUp } from 'react-icons/bi';
import { Popover } from '@headlessui/react';
import cx from 'classnames';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import useCompetitionAccountChange from '@/hooks/competition/useCompetitionAccountChange';
import { Trans, t } from '@lingui/macro';
import { useBatchReferralCodes } from '@/hooks/referralHooks/useBatchReferralCodes';
import CopyReferralCode from '@/components/CopyReferralCode';
import { getGmw465Enabled } from '@/config/featureFlagEnable';
import { EXPLORER_URL, getAddressUrl } from '@/utils/lib/explorer';
import { FiExternalLink } from 'react-icons/fi';

dayjs.extend(utc);

function getExplorerAccountUrl(address: string) {
  if (getGmw465Enabled()) {
    return getAddressUrl(address);
  }
  return `${EXPLORER_URL}/address/${address}`;
}

interface CompetitionItem {
  competitionId: PublicKey;
  name: string;
  startTime: BN;
  endTime: BN;
}

interface CompetitionProps {
  onCompetitionSelect?: (competitionId) => void;
}
interface CompetitionTimeTooltipProps {
  startTime: number;
  endTime: number;
  className?: string;
}
interface CompetitionWinnerTooltipProps {
  address: string;
  referralCode: string;
}

const emptyKey = new PublicKey('11111111111111111111111111111111');
const COMPETITION_END_DELAY_SECONDS = 10;

export function SelectCompetition({ onCompetitionSelect }: CompetitionProps) {
  const { competitionList }: { competitionList: CompetitionItem[] } =
    useCompetitionList();
  const [nextCompetition, setNextCompetition] =
    useState<CompetitionItem | null>(null);
  const [isEnd, setIsEnd] = useState(false);

  const { connected, publicKey } = useWallet();
  const address = connected && publicKey ? publicKey.toBase58() : '';

  const competitionRunningList = useMemo(() => {
    if (!competitionList) return [];
    const nowTime = new BN(dayjs.utc().unix());
    const list = (competitionList || []).filter((competition) => {
      // endTime gt now and startTime lt now
      return (
        competition?.endTime?.gt(nowTime) && competition?.startTime?.lt(nowTime)
      );
    });

    if (!list.length) {
      const nextCompetition = competitionList.find((competition) => {
        return competition?.startTime?.gt(nowTime);
      });
      if (nextCompetition) {
        setNextCompetition(nextCompetition);
      } else {
        setNextCompetition(null);
      }
      return [];
    } else {
      setNextCompetition(null);
    }

    list.push({
      competitionId: emptyKey,
      name: <Trans>Do not participate</Trans>,
      startTime: new BN(0),
      endTime: new BN(0),
    });
    return list;
  }, [competitionList]);

  const [selectCompetitionId, setSelectCompetitionId] = useState<PublicKey>();

  const selectOriginCompetition = useMemo(() => {
    if (!selectCompetitionId || selectCompetitionId.equals(emptyKey)) return;
    return competitionRunningList.find((item) =>
      item.competitionId.equals(selectCompetitionId)
    );
  }, [competitionRunningList, selectCompetitionId]);

  const { competitionAccount: selectCompetition } =
    useCompetitionAccountChange(selectCompetitionId);

  const startTimeUtc = Number(
    selectCompetition?.startTime.toString() ||
      nextCompetition?.startTime.toString()
  );
  const endTimeUtc = Number(
    selectCompetition?.endTime.toString() || nextCompetition?.endTime.toString()
  );
  const { timeText } = useCountdownTimer(startTimeUtc, endTimeUtc);

  const { referralCodes: competitionInfoTradeDataCodes } =
    useBatchReferralCodes(
      selectCompetition?.extensionTriggerer
        ? [selectCompetition?.extensionTriggerer].map((user) => user)
        : []
    );

  const handleSelectCompetition = useCallback(
    (competitionId: PublicKey) => {
      localStorage.setItem('select-competition-id', competitionId.toString());
      if (competitionId.equals(emptyKey)) {
        onCompetitionSelect(null);
      } else {
        onCompetitionSelect(competitionId);
      }
      setSelectCompetitionId(competitionId);
    },
    [onCompetitionSelect]
  );

  useEffect(() => {
    if (!competitionRunningList || !competitionRunningList.length) return;
    const selectCompetitionIdHistory = localStorage.getItem(
      'select-competition-id'
    );
    if (selectCompetitionIdHistory) {
      // competition is running
      if (
        competitionRunningList.find((item) =>
          item.competitionId.equals(new PublicKey(selectCompetitionIdHistory))
        )
      ) {
        return handleSelectCompetition(
          new PublicKey(selectCompetitionIdHistory)
        );
      }
    }
    if (competitionRunningList && competitionRunningList.length) {
      handleSelectCompetition(competitionRunningList[0].competitionId);
    } else {
      handleSelectCompetition(emptyKey);
    }
  }, [competitionRunningList, handleSelectCompetition]);

  // Delayed end
  useEffect(() => {
    if (!selectCompetition) return;

    const endTime = Number(selectCompetition.endTime.toString());
    const nowTime = dayjs.utc().unix();

    if (nowTime >= endTime) {
      const timeout = setTimeout(() => {
        setIsEnd(true);
      }, COMPETITION_END_DELAY_SECONDS * 1000);
      return () => clearTimeout(timeout);
    }
  }, [timeText]);

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return '';
    return dayjs(timestamp * 1000).format('YYYY/MM/DD HH:mm:ss');
  };

  const { refs, floatingStyles } = useFloating({
    middleware: [
      offset({
        mainAxis: 10,
        crossAxis: 10,
      }),
      flip(),
      shift(),
    ],
    placement: 'bottom-end',
    whileElementsMounted: autoUpdate,
  });

  const getChevronClassName = () => {
    return 'text-24 -my-5 -mr-4 ml-4 inline-block align-middle';
  };

  const suppressPointerDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const CompetitionTimeTooltip = ({
    startTime,
    endTime,
    className = '',
  }: CompetitionTimeTooltipProps) => (
    <div className={`space-y-1 text-xs ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-gray-400">
          <Trans>Start Time</Trans>:
        </span>
        <span className="font-medium text-white">
          {formatDate(Number(startTime))}
        </span>
      </div>
      <div className="mt-[0.4rem] flex items-center justify-between">
        <span className="text-gray-400">
          <Trans>End Time</Trans>:
        </span>
        <span className="font-medium text-white">
          {formatDate(Number(endTime))}
        </span>
      </div>
    </div>
  );

  const CompetitionWinnerTooltip = ({
    address,
    referralCode,
  }: CompetitionWinnerTooltipProps) => (
    <div className={`text-xs`}>
      <div className="mb-[0.5rem] flex items-center">
        <p>
          <span className="text-gray-400">
            <Trans>Address</Trans>：
          </span>
          <span>{address.slice(0, 4) + '...' + address.slice(-4)}</span>
        </p>
        <a
          href={getExplorerAccountUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 mt-1 text-[#A3A3A3] hover:text-white"
        >
          <FiExternalLink size={16} />
        </a>
      </div>
      <div className="flex items-center">
        <span className="text-gray-400">
          <Trans>Referral Code</Trans>：
        </span>
        <CopyReferralCode referralCode={referralCode} />
      </div>
    </div>
  );

  return (
    <div className="competition">
      {!isEnd &&
      ((competitionRunningList && competitionRunningList.length >= 2) ||
        nextCompetition) ? (
        <div>
          <p className="title">
            <Trans>Competition</Trans>
          </p>
          <div className="">
            {competitionRunningList && competitionRunningList.length > 0 && (
              <div className="relative mt-[0.8rem] flex w-[100%] cursor-pointer items-center justify-between rounded-[0.2rem] bg-[#212440] px-[1.2rem] py-[0.5rem] text-[rgba(255,255,255,0.85)]">
                <Popover className="w-[100%]">
                  {(popoverProps) => (
                    <>
                      <Popover.Button
                        as="div"
                        className={cx(
                          'group/selector-base flex w-[100%] cursor-pointer items-center justify-between',
                          'hover:text-primary-300 group-hover/selector-base:text-primary-300'
                        )}
                        ref={refs.setReference}
                      >
                        {selectOriginCompetition?.name ||
                          t`Please Select Competition`}
                        {popoverProps.open ? (
                          <BiChevronUp
                            className={getChevronClassName()}
                            size={24}
                          />
                        ) : (
                          <BiChevronDown
                            className={getChevronClassName()}
                            size={24}
                          />
                        )}
                      </Popover.Button>
                      {popoverProps.open && (
                        <FloatingPortal>
                          <Popover.Panel
                            static
                            ref={(el) => {
                              refs.setFloating(el);
                              if (refs.reference.current && el) {
                                console.log('201', refs.reference.current);
                                el.style.width = `${refs.reference.current.offsetWidth + 22}px`;
                              }
                            }}
                            className="text-body-medium rounded-4 relative !z-[9000] max-h-[48vh] overflow-hidden overflow-y-auto border border-gray-800 bg-slate-800"
                            // ref={refs.setFloating}
                            style={floatingStyles}
                            onPointerDown={suppressPointerDown}
                          >
                            {competitionRunningList.map((item) => (
                              <div
                                key={item.competitionId.toString()}
                                className="flex w-full cursor-pointer px-[.8rem] py-[.5rem] hover:bg-[#212440]"
                                onClick={() => {
                                  handleSelectCompetition(item.competitionId);
                                  popoverProps.close();
                                }}
                              >
                                <p>{item.name}</p>
                              </div>
                            ))}
                          </Popover.Panel>
                        </FloatingPortal>
                      )}
                    </>
                  )}
                </Popover>
              </div>
            )}
            {(selectOriginCompetition || nextCompetition) && (
              <div className="mb-[0.5rem] mt-[1rem] rounded-[0.4rem] bg-[#212440] px-[1.2rem] py-[1.2rem] text-[rgba(255,255,255,0.65)]">
                <p className="mb-[0.5rem]">
                  {selectOriginCompetition
                    ? t`This order will qualify for the ${selectOriginCompetition?.name} competition,`
                    : t`The upcoming ${selectOriginCompetition?.name || nextCompetition?.name} competition`}
                  &nbsp;
                  <TooltipWithPortal
                    handle={
                      <p>
                        {selectOriginCompetition
                          ? t`which will end in ${timeText}`
                          : t`will start in ${timeText}`}
                        .
                      </p>
                    }
                    position="bottom-end"
                    content={
                      <CompetitionTimeTooltip
                        startTime={Number(
                          (
                            selectCompetition ||
                            selectOriginCompetition ||
                            nextCompetition
                          ).startTime.toString()
                        )}
                        endTime={Number(
                          (
                            selectCompetition ||
                            selectOriginCompetition ||
                            nextCompetition
                          ).endTime.toString()
                        )}
                      />
                    }
                  />
                </p>
                {address && selectCompetition?.extensionTriggerer && (
                  <>
                    <div className="App-card-divider bg-[#33364b]"></div>
                    <div className="flex items-center justify-between">
                      <p>
                        <Trans>Current Final Trade Winner</Trans>
                      </p>
                      <div className="flex items-center">
                        <TooltipWithPortal
                          handle={
                            <span className="ml-[0.5rem]">
                              {address ===
                              selectCompetition?.extensionTriggerer?.toString()
                                ? t`You`
                                : `${selectCompetition?.extensionTriggerer?.toString().slice(0, 4)}...${selectCompetition?.extensionTriggerer?.toString().slice(-4)}`}
                            </span>
                          }
                          position="bottom-end"
                          content={
                            <CompetitionWinnerTooltip
                              address={
                                selectCompetition?.extensionTriggerer?.toString() ||
                                '-'
                              }
                              referralCode={
                                competitionInfoTradeDataCodes[
                                  selectCompetition?.extensionTriggerer?.toString() ||
                                    '-'
                                ]
                              }
                            />
                          }
                        />
                        {/* <a
                            href={`${EXPLORER_URL}/address/${selectCompetition?.extensionTriggerer?.toString()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#A3A3A3] hover:text-white ml-2 mt-1"
                          >
                            <FiExternalLink size={16} />
                          </a> */}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        ''
      )}
    </div>
  );
}
