import './Competition.scss';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useMedia } from 'react-use';
import { Trans, t } from '@lingui/macro';
import { FiExternalLink } from 'react-icons/fi';
import 'animate.css';

import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
import { BottomTablePagination } from '@/components/Common/Pagination/BottomTablePagination';
import { MarketListSkeleton } from '@/components/Common/Skeleton/Skeleton';
import {
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
// import { VerticalSwiper } from '@/components/Common/VerticalSwiper/VerticalSwiper';
import { HeaderLink } from '@/components/Header/HeaderLink';
import ExternalLink from '@/components/Common/Link/ExternalLink';
// import Modal from '@/components/Common/Modal/Modal';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';

// import IconTime from '@/img/competition/time.png';
// import IconPool from '@/img/competition/pool.png';
import IconLogo from '@/img/competition/GMX-SOLANA-LOGO-text-tr.svg';
// import IconUse from '@/img/competition/use.png';
// import IconClose from '@/img/close.png';
import IconLock from '@/img/competition/lock.png';
import IconCrown from '@/img/competition/crown.svg';

import IconRank01 from '@/img/competition/rank-01.png';
import IconRank02 from '@/img/competition/rank-02.svg';
import IconRank03 from '@/img/competition/rank-03.svg';
import IconRank04 from '@/img/competition/rank-04.svg';
import IconRank05 from '@/img/competition/rank-05.svg';

// import { SwiperSlide } from 'swiper/react';
import { PublicKey } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCompetitionProgram } from '@/contexts/anchor';
import { useAnchorProvider, useStoreProgram } from '@/contexts/anchor';

import useCompetitionVol from '@/hooks/competition/useCompetitionVol';
import useCountdownTimer from '@/hooks/competition/useCountdownTimer';
import { getGmw378Enabled, getGmw465Enabled } from '@/config/featureFlagEnable';
import { useCurrentRpcUrl } from '@/hooks/utilsHooks/useCurrentRpcUrl';
import useCompetitionTradeHistory from '@/hooks/competition/useCompetitionTradeHistory';
import { useBatchReferralCodes } from '@/hooks/referralHooks/useBatchReferralCodes';

import { formatAmount, formatUsd } from '@/utils/legacy/format';
import { helperToast } from '@/utils/lib/helperToast';
import { EXPLORER_URL, getAddressUrl, getTransactionUrl } from '@/utils/lib/explorer';
import { getTransactionUrl as getTransactionUrlNew } from '@/utils/lib/explorerNew';
import { generateAccountInfo, formatTime } from '@/utils';
import { selectCompetitionItem } from '@/utils/competition/selectCompetitionItem';

import { GmsolCompetition } from 'gmsol/dist/gmsol/idl/gmsol_competition';
import { findPartitionedDataAccountPDA, invokeCloseParticipant } from 'gmsol';
import useCompetitionList from '@/hooks/competition/useCompetitionList';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import CopyReferralCode from '@/components/CopyReferralCode';
import { TradeModel } from '@/config/competitions';
import RuleNodesBoard from '@/components/Competition/RuleNodes';
import { selectGtGlobalDetailsDecimals } from '@/selectors/gt/gtGlobalDetailsSelectors';
import { useAppStore } from '@/zustand/useAppStore';

dayjs.extend(utc);

function getExplorerAccountUrl(address: string) {
  if (getGmw465Enabled()) {
    return getAddressUrl(address);
  }
  return `${EXPLORER_URL}/address/${address}`;
}

type LeaderboardItem = {
  name: string;
  address: string;
  volume: BN;
  time: string;
  index?: number;
  lasttest?: boolean;
};

type CompetitionInfo = {
  competitionId: PublicKey;
  startTime: BN;
  endTime: BN;
  leaderboard: LeaderboardItem[];
};
interface TradeHistoryItem {
  user: PublicKey;
  timestamp: number;
  volumeUsd: BN;
}

export interface CompetitionConfig {
  startTime: string;
  endTime: string;
  treasuryPriceFactor: number;
  basePrize: BN;
  tradeModel: TradeModel;
  showMoreAbout?: boolean;
}

const Competition = () => {
  const provider = useAnchorProvider();
  const program =
    useCompetitionProgram() as Program<GmsolCompetition>;
  const storeProgram = useStoreProgram();
  const [competitionInfo, setCompetitionInfo] = useState<{
    startTime: BN;
    endTime: BN;
    volumeMergeWindow?: BN;
    volumeThreshold?: BN;
    extensionDuration?: BN;
    extensionTriggerer?: PublicKey;
  }>();

  const [competitionConfig, setCompetitionConfig] =
    useState<CompetitionConfig>();
  const { vol } = useCompetitionVol(competitionConfig);
  const [competitionNewId, setCompetitionNewId] = useState();

  const isGmw378Enabled = getGmw378Enabled();
  const currentRpcUrl = useCurrentRpcUrl();
  const isMobile = useMedia('(max-width: 1100px)');
  const isSmallMobile = useMedia('(max-width: 800px)');
  const [isVisible, setIsVisible] = useState(false);
  // const { competitionAccount } = useCompetitionAccountChange(competitionNewId)

  const [currentOriginData, setCurrentOriginData] = useState<LeaderboardItem[]>(
    []
  );
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardItem[]>([]);
  const leaderboardDataRef = useRef<LeaderboardItem[]>([]);
  const [largeTradeLiveFeed, setLargeTradeLiveFeed] = useState<
    LeaderboardItem[]
  >([]);
  const [newestTradeData, setNewestTradeData] = useState<LeaderboardItem[]>([]);

  const [loadding, setLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [competitionItem, setCompetitionItem] = useState([]);
  const [competitionItemIndex, setCompetitionItemIndex] = useState(0);

  const [startTimeUtc, setStartTimeUtc] = useState<number | undefined>();
  const [endTimeUtc, setEndTimeUtc] = useState<number | undefined>();
  const { timeText, status } = useCountdownTimer(startTimeUtc, endTimeUtc);
  const {
    lastestThresholdTradeList,
    myLastestThresholdTrade,
    lastestTradeList,
    gtDeltaMaps,
  } = useCompetitionTradeHistory(
    competitionNewId,
    competitionInfo?.volumeMergeWindow,
    competitionInfo?.volumeThreshold,
    competitionInfo?.endTime,
    competitionConfig?.tradeModel
  );

  const gtDecimals = useAppStore(selectGtGlobalDetailsDecimals);
  const gtDeltaMapsRef = useRef(gtDeltaMaps);

  const [isParticipate, setIsParticipate] = useState(false);
  const [isReceive, setIsReceive] = useState(false);
  const [isDefaultData, setIsDefaultData] = useState(false);
  // const [selfParticipant, setSelfParticipant] = useState({
  //   trader: '',
  //   address: '',
  //   volume: new BN(0),
  // });

  // const selfParticipantRef = useRef({
  //   trader: '',
  //   address: '',
  //   volume: new BN(0),
  // });

  const { competitionList } = useCompetitionList();

  const wallet = useWallet();
  const { connected, publicKey } = wallet;
  const address = connected && publicKey ? publicKey.toBase58() : '';

  const activeItemRef = useRef<HTMLDivElement>(null);
  const noDataText = t`No trades found`;

  const { referralCodes: rLeaderboardCodes } = useBatchReferralCodes(
    currentOriginData.map((user) => user.trader)
  );

  const { referralCodes: largeTradeLiveFeedCodes } = useBatchReferralCodes(
    largeTradeLiveFeed.map((user) => user.trader)
  );

  const { referralCodes: newestTradeDataCodes } = useBatchReferralCodes(
    newestTradeData.map((user) => user.trader)
  );

  const { referralCodes: competitionInfoTradeDataCodes } =
    useBatchReferralCodes(
      competitionInfo?.extensionTriggerer
        ? [competitionInfo?.extensionTriggerer].map((user) => user)
        : []
    );

  const getCompetitionInfoById = useCallback(
    async (competitionNewId: PublicKey) => {
      if (!provider) return;

      try {
        const data = await provider.connection.getAccountInfo(competitionNewId);
        if (!data) return;

        const originalCompetitionInfo =
          program?.account?.competition?.coder?.accounts?.decode(
            'competition',
            data.data
          ) as CompetitionInfo;

        if (!originalCompetitionInfo || !originalCompetitionInfo.leaderboard) {
          setLoading(false);
          return;
        }

        const { leaderboard, startTime, endTime } = originalCompetitionInfo;

        setStartTimeUtc(startTime.toNumber());
        setEndTimeUtc(endTime.toNumber());

        const newData = leaderboard.map((item) => {
          const address = item.address.toString();
          return {
            ...item,
            trader: item.address,
            address: address,
            name: `${address.slice(0, 4)}...${address.slice(-4)}`,
          };
        });

        setIsDefaultData(false);
        if (status === 'notStarted' && !newData.length) {
          setIsDefaultData(true);
        }

        leaderboardDataRef.current = newData;
        setLeaderboardData(newData);
        // console.log('newData', newData)

        // const currentUserData = CurrentOriginData.find(
        //   (item) =>
        //     item.address === selfParticipantRef.current.trader.toString()
        // );

        // setIsParticipate(!!currentUserData);

        // const finalData = currentUserData
        //   ? [currentUserData, ...newData]
        //   : newData;
        // setCurrentOriginData(newData);

        setCompetitionInfo(originalCompetitionInfo);
        // console.log('competitionInfo', {
        //   ...originalCompetitionInfo,
        //   extensionTriggerer: originalCompetitionInfo.extensionTriggerer.toString(),
        // });
      } catch (error) {
        console.error('Failed to fetch competition info:', error);
      } finally {
        setLoading(false);
      }
    },
    [program, provider]
  );

  const getSelfParticipantById = useCallback(
    async (competitionNewId: PublicKey) => {
      const owner = storeProgram.provider.publicKey;
      if (!owner) return;

      const participantPDA = findPartitionedDataAccountPDA(
        owner,
        competitionNewId
      )[0];
      try {
        const { trader, volume } =
          await program.account.participant.fetch(participantPDA);
        // console.log('trader, volume', {
        //   trader, volume
        // })
        if (trader && volume) {
          setIsReceive(true);
          // const name = trader.toString();
          // selfParticipantRef.current = {
          //   trader: name,
          //   address: `${name.slice(0, 16)}...${name.slice(-6)}`,
          //   volume: volume,
          // };
          // setIsReceive(!!currentUserData);
          // const finalData = currentUserData
          //   ? [currentUserData, ...newData]
          //   : newData;
          // setCurrentOriginData(newData);
          // const currentUserData = {
          //   address: trader.toString(),
          //   name: `${trader.toString().slice(0, 4)}...${trader.toString().slice(-4)}`,
          //   volume: volume,
          // };
          // setIsParticipate(true);
          // const finalData = [currentUserData, ...currentOriginData];
          // setCurrentOriginData(finalData);
        } else {
          setIsReceive(false);
        }
      } catch (error) {
        setIsReceive(false);
        console.log('error selfParticipant', error);
      }
    },
    [program.account.participant, storeProgram.provider.publicKey]
  );

  const getParticipantListById = useCallback(
    async (competitionId: PublicKey) => {
      const originalParticipantList = await program.account.participant.all();
      let participantList = originalParticipantList
        .filter((item) => {
          return (
            item.account.competition.toString() === competitionId.toString()
          );
        })
        .map((item) => {
          const participant = item.account;
          return {
            ...participant,
            accountInfo: generateAccountInfo(
              participant.trader.toString() || ''
            ),
          };
        });

      const newData = participantList
        .map((item) => {
          const address = item.trader.toString();
          return {
            ...item,
            trader: item.trader,
            address: address,
            name: `${address.slice(0, 4)}...${address.slice(-4)}`,
          };
        })
        .sort((a, b) => {
          const volumeA = parseFloat(a.volume.toString());
          const volumeB = parseFloat(b.volume.toString());
          return volumeB - volumeA;
        });

      // updata last data
      const nowLeaderboardData = leaderboardDataRef.current;
      if (newData.length && nowLeaderboardData && nowLeaderboardData.length) {
        newData.splice(0, nowLeaderboardData.length, ...nowLeaderboardData);
      }

      const currentUserData = [];
      let currentUserIndex = -1;
      newData.forEach((item, index) => {
        if (item.address === address) {
          currentUserIndex = index;
          currentUserData.push(item);
        }
      });

      // setIsParticipate(!!currentUserData);
      // console.log('currentUserData1', currentUserData)
      // console.log('currentUserData2', newData)

      const finalData = currentUserData
        ? [...currentUserData, ...newData]
        : newData;

      finalData.forEach((item, index) => {
        let gt = '';
        if (item.address === address && index === 0 && currentUserIndex >= 0) {
          item.rank = currentUserIndex + 1;
          item.isUseRank = false;
        } else {
          item.rank = currentUserIndex >= 0 ? index : index + 1;
          item.isUseRank =
            currentUserIndex >= 0
              ? index < 6
                ? true
                : false
              : index < 5
                ? true
                : false;
        }
        const value = item.address && gtDeltaMapsRef.current[item.address];
        const gtValue = value
          ? formatAmount(new BN(value), gtDecimals, 2, true, true)
          : 0;
        // item.gt = (gtValue > 0 && gtValue < 0.01) ? '<0.01' : gtValue;
      });
      setCurrentOriginData(finalData);

      // console.log('participantList', {
      //   participantList: participantList.map((item) => ({
      //     // volume: item.volume.toString(),
      //     // trader: item.trader.toString(),
      //     ...item,
      //   })),
      // });
    },
    [program.account.participant, gtDecimals]
  );

  const currentData = useMemo(() => {
    if (!currentOriginData.length) return [];
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setPageCount(Math.ceil(currentOriginData.length / pageSize));
    return currentOriginData?.slice(startIndex, endIndex);
  }, [currentOriginData, page]);

  // const handleShowUseModal = () => {
  //   setIsVisible(true);
  //   void getSelfParticipantById(competitionNewId);
  // };

  const closeParticipant = async () => {
    const owner = storeProgram.provider.publicKey;
    if (!owner) return;
    helperToast.info(t`Creating competition market order...`);
    const participantPDA = findPartitionedDataAccountPDA(
      owner,
      competitionNewId
    )[0];
    const [signature] = await invokeCloseParticipant(
      program,
      {
        trader: owner,
        competitionId: competitionNewId,
        participant: participantPDA,
      },
      {
        signByProvider: true,
      }
    );
    if (competitionNewId) {
      void getSelfParticipantById(competitionNewId);
    }
    const url = isGmw378Enabled
      ? getTransactionUrlNew(signature)
      : getTransactionUrl(signature, currentRpcUrl);
    helperToast.success(
      <div>
        <Trans>Successfully closed participant account </Trans>&nbsp;
        <ExternalLink href={url}>
          <Trans>View Tx</Trans>
        </ExternalLink>
      </div>
    );
  };

  const handleCompetitionItem = (index: number) => {
    // There are only two, and the first one is not started.
    // let isFirstTimeStatus = false;
    // if (competitionItem[0].status === 'upcoming') {
    //   isFirstTimeStatus = true;
    //   return
    // }

    // All activities have ended.
    // const isAllActivitiesOver = competitionItem.every((item) => item.status === 'ended')
    // if (isAllActivitiesOver && index === competitionItem.length - 1) {
    //   return;
    // }

    // lock
    if (!competitionItem[index] || !competitionItem[index].startTime) {
      return;
    }

    // if (competitionItem[index].status === 'upcoming') {
    //   return;
    // }
    setStartTimeUtc(undefined);
    setEndTimeUtc(undefined);
    setCompetitionItemIndex(index);
    setCompetitionNewId(competitionItem[index].competitionId);
    setCompetitionConfig(competitionItem[index]);
  };

  useEffect(() => {
    setLoading(true);
    setPageCount(0);
    setPage(1);
    setIsParticipate(false);
    setCurrentOriginData([]);
    setLeaderboardData([]);
    setLargeTradeLiveFeed([]);
    setNewestTradeData([]);
    // selfParticipantRef.current = {
    //   trader: '',
    //   address: '',
    //   volume: new BN(0),
    // };

    const initData = async () => {
      await getCompetitionInfoById(competitionNewId);
      await getSelfParticipantById(competitionNewId);
      await getParticipantListById(competitionNewId);
    };

    void initData();

    const interval = setInterval(() => {
      void (async () => {
        try {
          await getCompetitionInfoById(competitionNewId);
          await getSelfParticipantById(competitionNewId);
          await getParticipantListById(competitionNewId);
        } catch (error) {
          console.error('Error in interval:', error);
        }
      })();
    }, 5000);

    return () => clearInterval(interval);
  }, [competitionNewId, connected]);

  useEffect(() => {
    const newData = [];
    let isParticipate = false;
    // if (
    //   myLastestThresholdTrade &&
    //   Object.keys(myLastestThresholdTrade).length &&
    //   connected &&
    //   myLastestThresholdTrade.user.toString() === address
    // ) {
    //   isParticipate = true;
    //   newData.push(myLastestThresholdTrade);
    // }
    // console.log('lastestThresholdTradeList: ', competitionInfo?.extensionTriggerer?.toString(), lastestThresholdTradeList);
    if (lastestThresholdTradeList.length) {
      newData.push(...lastestThresholdTradeList);
    }
    // competitionInfo.extensionTriggerer
    newData &&
      setLargeTradeLiveFeed(
        newData.map((item: TradeHistoryItem, index: number) => {
          const name = item.user.toString();
          const isUpdate =
            index === 0 &&
            competitionInfo.extensionTriggerer &&
            name !== competitionInfo.extensionTriggerer.toString();
          return {
            lasttest:
              isParticipate && index === 1
                ? true
                : !isParticipate && index === 0
                  ? true
                  : false,
            name: `${name.slice(0, 4)}...${name.slice(-4)}`,
            address: isUpdate
              ? competitionInfo.extensionTriggerer.toString()
              : name,
            volume: isUpdate ? null : item.volumeUsd,
            time: isUpdate ? null : item.timestamp.toString(),
            trader: item.user,
          };
        })
      );
  }, [competitionInfo?.extensionTriggerer, lastestThresholdTradeList]);

  useEffect(() => {
    if (lastestTradeList.length === 0) return;

    const incomingTimestamp = lastestTradeList[0].timestamp.toString();
    const lasttestItemArr = newestTradeData.slice(-1);
    const isNewData = lasttestItemArr.some((item) => {
      return item.timestamp.toString() === incomingTimestamp;
    });

    // console.log('isNewData', { isNewData, newestTradeData, lastestTradeList});
    if (!isNewData) {
      const mergedRawData = [...lasttestItemArr, ...lastestTradeList];

      const formattedData = mergedRawData.map((item) => {
        const user = item.user.toString();
        return {
          ...item,
          name: `${user.slice(0, 4)}...${user.slice(-4)}`,
          trader: item.user,
          address: user,
          volume: item.volumeUsd,
          time: item.timestamp.toString(),
        };
      });

      setNewestTradeData(formattedData);
    }
  }, [lastestTradeList]);

  useEffect(() => {
    if (status === 'ended') {
      setNewestTradeData((preveTradeData) => preveTradeData.slice(0, 1));
    }
  }, [status]);

  useEffect(() => {
    if (competitionList && competitionList.length) {
      const nweData = competitionList.map((item) => {
        return {
          ...item,
          startTime: item?.startTime?.toString(),
          endTime: item?.endTime?.toString(),
        };
      });
      const result = selectCompetitionItem(nweData);
      if (result) {
        // The first activity has not started.
        // const isFristActivitie = result.list.length === 1 && result.list[0].status === 'upcoming'
        // All activities have ended.
        // const isAllActivitiesOver = result.list.every((item) => item.status === 'ended')
        // if (isFristActivitie || isAllActivitiesOver) {
        //   result.list.push({
        //     ...result.list[0],
        //     startTime: '',
        //     endTime: '',
        //     competitionId: '',
        //     name: '',
        //     basePrize: new BN(0),
        //     treasuryPriceFactor: 0,
        //   });
        // }

        setCompetitionItem(
          result.list.map((item) => ({
            ...item,
            startTimeCustom: item.startTime
              ? dayjs.utc(item.startTime * 1000).format('YYYY.MM.DD')
              : '',
            endTimeCustom: item.endTime
              ? dayjs.utc(item.endTime * 1000).format('YYYY.MM.DD')
              : '',
          }))
        );
        setCompetitionItemIndex(result.index);
        setCompetitionNewId(result.item.competitionId);
        setCompetitionConfig(result.item);
      }
    }
  }, [competitionList]);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [competitionItemIndex]);

  useEffect(() => {
    gtDeltaMapsRef.current = gtDeltaMaps;
  }, [gtDeltaMaps]);

  const leaderboardDataPrizes = useMemo(() => {
    const prizePercentage = [0.35, 0.18, 0.1, 0.05, 0.02];
    return leaderboardData.map((item, index) => {
      const percent = Math.round(prizePercentage[index] * 100);
      return {
        ...item,
        prize: vol.mul(new BN(percent)).div(new BN(100)),
      };
    });
  }, [leaderboardData, vol]);

  // const prizeDistribution = [
  //   { rank: '1st', percentage: '35%' },
  //   { rank: '2nd', percentage: '18%' },
  //   { rank: '3rd', percentage: '10%' },
  //   { rank: '4th', percentage: '5%' },
  //   { rank: '5th', percentage: '2%' }
  // ];

  const [visibleIndex, setVisibleIndex] = useState(0);

  useEffect(() => {
    if (newestTradeData.length === 2) {
      setVisibleIndex(1);
    } else {
      setVisibleIndex(0);
    }
  }, [newestTradeData]);

  return (
    <div className="competition">
      <div className="top flex flex-col items-center justify-center text-center">
        <div className="layout-width">
          <div className="tabs-list">
            {competitionItem.length > 0 &&
              competitionItem.map((item, index) => {
                return (
                  <div
                    ref={competitionItemIndex === index ? activeItemRef : null}
                    className={`item ${competitionItemIndex === index ? 'item-active' : ''} ${!item.startTimeCustom && 'flex items-center justify-center'}`}
                    key={index}
                    onClick={() => handleCompetitionItem(index)}
                  >
                    {item.startTimeCustom && item.endTimeCustom ? (
                      <>
                        <div className="name flex items-center justify-center">
                          {item.status === 'upcoming' && (
                            <>
                              <img
                                src={IconLock}
                                className={`${!item.startTimeCustom && '!mr-[0]'}`}
                              />
                            </>
                          )}
                          <span>{item.name}</span>
                        </div>
                        <p className="line"></p>

                        <div className="time-text">
                          {item.startTimeCustom && item.endTimeCustom
                            ? (() => {
                                const timeTextMap = {
                                  ended: t`Ended：${item.endTimeCustom}`,
                                  ongoing: t`Now：${item.startTimeCustom} - ${item.endTimeCustom}`,
                                  upcoming: t`Start Time：${item.startTimeCustom}`,
                                };
                                return timeTextMap[item.status] || '';
                              })()
                            : '-'}
                        </div>
                      </>
                    ) : (
                      <img src={IconLock} />
                    )}
                  </div>
                );
              })}
          </div>
          {/* <div className="logo flex items-center justify-end">
            <img
              className="icon-use"
              src={IconUse}
              alt="icon use"
              width={80}
              style={{
                opacity: isParticipate ? 1 : 0,
                pointerEvents: isParticipate ? 'auto' : 'none',
              }}
              onClick={handleShowUseModal}
            />
          </div> */}
          <img
            className="icon-logo"
            src={IconLogo}
            alt="icon logo"
            width={130}
          />
          <p className="title">
            <Trans>Trading Competition</Trans>
          </p>
          <p className="caption">
            <Trans>One trade can change it all</Trans>
          </p>

          <HeaderLink
            to="/trade"
            className="rounded-10 to-cold-blue-500 text-body-small hover:to-cold-blue-700 sm:text-body-medium md:text-body-large inline-flex h-[4rem] min-w-[12rem] items-center justify-center bg-gradient-to-r from-primary-400 px-10 font-medium text-white no-underline transition-all duration-300 hover:-translate-y-2 hover:from-primary-300 sm:h-[4rem] sm:min-w-[14rem] md:h-[5rem] md:min-w-[18rem]"
          >
            <Trans>Trade Now</Trans>
          </HeaderLink>
        </div>
      </div>

      <div className="info layout-width flex items-start justify-between">
        <div className="left common flex flex-col items-center justify-center">
          {/* <img
            src={IconTime}
            alt="Coming Soon Icon"
            aria-label="Coming Soon Icon"
          /> */}
          <p className="coming-soon font-bold">
            {status === 'ended'
              ? t`Competition Ended`
              : status === 'running'
                ? t`Time Remaining`
                : t`Coming Soon`}
          </p>
          <div className="time">{timeText}</div>
          <span className="line"></span>
          <div className="introduce">
            <p>
              <Trans>Starts with 24 hours</Trans>
            </p>
            <p>
              {t`Each ${formatUsd(competitionInfo?.volumeThreshold, { displayDecimals: 0 })} + trade adds ${competitionInfo?.extensionDuration.toString()}s`}
            </p>
          </div>
        </div>
        <div className="right common flex flex-col items-center justify-center">
          {/* <img
            src={IconPool}
            alt="Total Prize Pool Icon"
            aria-label="Total Prize Pool Icon"
          /> */}
          <p className="coming-soon font-bold">
            <Trans>Total Prize Pool</Trans>
          </p>
          <div className="time">{formatUsd(vol, { displayDecimals: 2 })}</div>
          <span className="line"></span>
          <div className="introduce">
            <p>
              {t`Starts at ${formatUsd(competitionConfig?.basePrize, { displayDecimals: 0 })}`}
            </p>
            <p>
              {t`Grows with ${(competitionConfig?.treasuryPriceFactor || 0) * 100}% of treasury revenue`}
            </p>
          </div>
        </div>
      </div>

      {/* <div className="prizes-info flex flex-col items-center justify-center">
        <p className="title">Who Gets the Prizes</p>
        <div className="introduce">
          <p>Final eligible trade over $10,000 got 30%</p>
          <p>Top 5 trading volume share the rest 70%</p>
        </div>
        <div className="lists flex items-center justify-center flex-wrap">
          {prizeDistribution.map((item) => (
            <div className="item" key={item.percentage}>
              <p>{item.rank}</p>
              <em>{item.percentage}</em>
            </div>
          ))}
        </div>
      </div> */}

      {!isDefaultData && (
        <>
          <div className="leaderboard">
            <p className="label">
              <Trans>Leaderboard</Trans>
            </p>
            {leaderboardData.length > 0 && (
              <div className="ranklist layout-width">
                {!isSmallMobile && leaderboardData.length >= 4 && (
                  <>
                    <div className="item">
                      <div className="rank">
                        <img
                          className={`avatar ${isDefaultData && 'no-data-img'}`}
                          src={
                            generateAccountInfo(leaderboardData[3].address)
                              .avator
                          }
                        />
                        <img className="icon" src={IconRank04} />
                      </div>
                      <p className="name">
                        {isDefaultData ? '-' : leaderboardData[3].name}
                        <a
                          href={getExplorerAccountUrl(leaderboardData[3].address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 mt-1 text-[#A3A3A3] hover:text-white"
                        >
                          <FiExternalLink size={16} />
                        </a>
                      </p>
                      <p className="referral-code">
                        <CopyReferralCode
                          referralCode={
                            rLeaderboardCodes[leaderboardData[3].address]
                          }
                        />
                      </p>
                      <span className="volume">
                        {formatUsd(leaderboardDataPrizes[3].prize, {
                          displayDecimals: 2,
                        })}
                      </span>
                      <em className="prize">
                        <Trans>Prize</Trans>
                      </em>
                    </div>
                  </>
                )}
                {leaderboardData.length >= 2 && (
                  <div
                    className="item"
                    style={{
                      position: 'relative',
                      top: '-3.5rem',
                      marginLeft: '3rem',
                    }}
                  >
                    <div className="rank">
                      <img
                        className={`avatar ${isDefaultData && 'no-data-img'}`}
                        src={
                          generateAccountInfo(leaderboardData[1].address).avator
                        }
                      />
                      <img className="icon" src={IconRank02} />
                    </div>
                    <p className="name">
                      {isDefaultData ? '-' : leaderboardData[1].name}
                      <a
                        href={getExplorerAccountUrl(leaderboardData[1].address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 mt-1 text-[#A3A3A3] hover:text-white"
                      >
                        <FiExternalLink size={16} />
                      </a>
                    </p>
                    <p className="referral-code">
                      <CopyReferralCode
                        referralCode={
                          rLeaderboardCodes[leaderboardData[1].address]
                        }
                      />
                    </p>
                    <span className="volume">
                      {formatUsd(leaderboardDataPrizes[1].prize, {
                        displayDecimals: 2,
                      })}
                    </span>
                    <em className="prize">
                      <Trans>Prize</Trans>
                    </em>
                  </div>
                )}
                {leaderboardData.length >= 1 && (
                  <div
                    className="item one"
                    style={{
                      position: 'relative',
                      top: '-7rem',
                      margin: '0 2rem',
                    }}
                  >
                    <div className="rank">
                      <img
                        className={`avatar ${isDefaultData && 'no-data-img'}`}
                        src={
                          generateAccountInfo(leaderboardData[0].address).avator
                        }
                      />
                      <img className="icon" src={IconRank01} />
                    </div>
                    <p className="name">
                      {isDefaultData ? '-' : leaderboardData[0].name}
                      <a
                        href={getExplorerAccountUrl(leaderboardData[0].address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 mt-1 text-[#A3A3A3] hover:text-white"
                      >
                        <FiExternalLink size={16} />
                      </a>
                    </p>
                    <p className="referral-code">
                      <CopyReferralCode
                        referralCode={
                          rLeaderboardCodes[leaderboardData[0].address]
                        }
                      />
                    </p>
                    <span className="volume">
                      {formatUsd(leaderboardDataPrizes[0].prize, {
                        displayDecimals: 2,
                      })}
                    </span>
                    <em className="prize">
                      <Trans>Prize</Trans>
                    </em>
                  </div>
                )}
                {leaderboardData.length >= 3 && (
                  <div
                    className="item"
                    style={{
                      position: 'relative',
                      top: '-3.5rem',
                      marginRight: '3rem',
                    }}
                  >
                    <div className="rank">
                      <img
                        className={`avatar ${isDefaultData && 'no-data-img'}`}
                        src={
                          generateAccountInfo(leaderboardData[2].address).avator
                        }
                      />
                      <img className="icon" src={IconRank03} />
                    </div>
                    <p className="name">
                      {isDefaultData ? '-' : leaderboardData[2].name}
                      <a
                        href={getExplorerAccountUrl(leaderboardData[2].address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 mt-1 text-[#A3A3A3] hover:text-white"
                      >
                        <FiExternalLink size={16} />
                      </a>
                    </p>
                    <p className="referral-code">
                      <CopyReferralCode
                        referralCode={
                          rLeaderboardCodes[leaderboardData[2].address]
                        }
                      />
                    </p>
                    <span className="volume">
                      {formatUsd(leaderboardDataPrizes[2].prize, {
                        displayDecimals: 2,
                      })}
                    </span>
                    <em className="prize">
                      <Trans>Prize</Trans>
                    </em>
                  </div>
                )}
                {!isSmallMobile && leaderboardData.length > 4 && (
                  <>
                    <div className="item">
                      <div className="rank">
                        <img
                          className={`avatar ${isDefaultData && 'no-data-img'}`}
                          src={
                            generateAccountInfo(leaderboardData[4].address)
                              .avator
                          }
                        />
                        <img className="icon" src={IconRank05} />
                      </div>
                      <p className="name">
                        {isDefaultData ? '-' : leaderboardData[4].name}
                        <a
                          href={getExplorerAccountUrl(leaderboardData[4].address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 mt-1 text-[#A3A3A3] hover:text-white"
                        >
                          <FiExternalLink size={16} />
                        </a>
                      </p>
                      <p className="referral-code">
                        <CopyReferralCode
                          referralCode={
                            rLeaderboardCodes[leaderboardData[4].address]
                          }
                        />
                      </p>
                      <span className="volume">
                        {formatUsd(leaderboardDataPrizes[4].prize, {
                          displayDecimals: 2,
                        })}
                      </span>
                      <em className="prize">
                        <Trans>Prize</Trans>
                      </em>
                    </div>
                  </>
                )}
              </div>
            )}
            {isSmallMobile && leaderboardData.length > 0 && (
              <div className="ranklist layout-width !mt-[-2rem]">
                {leaderboardData.length >= 4 && (
                  <>
                    <div className="item max-w-[12rem]">
                      <div className="rank">
                        <img
                          className={`avatar ${isDefaultData && 'no-data-img'}`}
                          src={
                            generateAccountInfo(leaderboardData[3].address)
                              .avator
                          }
                        />
                        <img className="icon" src={IconRank04} />
                      </div>
                      <p className="name">
                        {isDefaultData ? '-' : leaderboardData[3].name}
                        <a
                          href={getExplorerAccountUrl(leaderboardData[3].address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 mt-1 text-[#A3A3A3] hover:text-white"
                        >
                          <FiExternalLink size={16} />
                        </a>
                      </p>
                      <p className="referral-code">
                        <CopyReferralCode
                          referralCode={
                            rLeaderboardCodes[leaderboardData[3].address]
                          }
                        />
                      </p>
                      <span className="volume">
                        {formatUsd(leaderboardDataPrizes[3].prize, {
                          displayDecimals: 2,
                        })}
                      </span>
                      <em className="prize">
                        <Trans>Prize</Trans>
                      </em>
                    </div>
                  </>
                )}
                {leaderboardData.length > 4 && (
                  <>
                    <div className="item max-w-[12rem]">
                      <div className="rank">
                        <img
                          className={`avatar ${isDefaultData && 'no-data-img'}`}
                          src={
                            generateAccountInfo(leaderboardData[4].address)
                              .avator
                          }
                        />
                        <img className="icon" src={IconRank05} />
                      </div>
                      <p className="name">
                        {isDefaultData ? '-' : leaderboardData[4].name}
                        <a
                          href={getExplorerAccountUrl(leaderboardData[4].address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 mt-1 text-[#A3A3A3] hover:text-white"
                        >
                          <FiExternalLink size={16} />
                        </a>
                      </p>
                      <p className="referral-code">
                        <CopyReferralCode
                          referralCode={
                            rLeaderboardCodes[leaderboardData[4].address]
                          }
                        />
                      </p>
                      <span className="volume">
                        {formatUsd(leaderboardDataPrizes[4].prize, {
                          displayDecimals: 2,
                        })}
                      </span>
                      <em className="prize">
                        <Trans>Prize</Trans>
                      </em>
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="rounded-4 mb-[15rem] mt-[3rem] text-left">
              <TableScrollFadeContainer>
                <div className={`${pageCount > 1 ? 'min-h-[44rem]' : 'auto'}`}>
                  <table
                    className={`mx-auto ${isSmallMobile && status === 'ended' && isReceive ? '!min-w-[60rem]' : 'w-[120rem]'} table-fixed`}
                  >
                    <thead>
                      <TableTheadTr bordered>
                        <TableTh
                          style={{
                            width: `${isSmallMobile ? '6rem' : '8rem'}`,
                          }}
                        >
                          <Trans>RANK</Trans>
                        </TableTh>
                        {/* <TableTh style={{ width: '20rem' }}>USER</TableTh> */}
                        <TableTh>
                          <Trans>USER</Trans>
                        </TableTh>
                        <TableTh
                          style={{
                            width: `${isSmallMobile ? '15rem' : '20rem'}`,
                            textAlign: 'left',
                          }}
                        >
                          <Trans>VOLUME</Trans>
                        </TableTh>
                        {/* <TableTh
                            style={{
                              width: `${isSmallMobile ? '10rem' : '13rem'}`,
                              textAlign: 'left',
                            }}
                          >
                            <Trans>GT</Trans>
                          </TableTh> */}
                        <TableTh
                          style={{
                            width: `${isSmallMobile ? '15rem' : '17rem'}`,
                            textAlign: 'left',
                          }}
                        >
                          <Trans>REFERRAL CODE</Trans>
                        </TableTh>
                      </TableTheadTr>
                    </thead>
                    <tbody>
                      {currentData.length > 0 &&
                        currentData.map((stats, index) => (
                          <MarketsListItem
                            key={index}
                            stats={stats}
                            index={index}
                            isParticipate={isParticipate}
                            isReceive={isReceive}
                            isDefaultData={isDefaultData}
                            page={page}
                            pageSize={pageSize}
                            type="all"
                            status={status}
                            address={address}
                            isSmallMobile={isSmallMobile}
                            rLeaderboardCodes={rLeaderboardCodes}
                            largeTradeLiveFeedCodes={largeTradeLiveFeedCodes}
                            onSetIsVisible={setIsVisible}
                            onCloseParticipant={closeParticipant}
                          />
                        ))}

                      {!currentData.length && !loadding && (
                        <TableTr
                          hoverable={false}
                          bordered={false}
                          className="h-[6.5rem] text-center"
                        >
                          <TableTd
                            colSpan={4}
                            className="align-top text-gray-400"
                          >
                            {noDataText}
                          </TableTd>
                        </TableTr>
                      )}

                      {currentData.length === 0 && loadding && (
                        <MarketListSkeleton count={pageSize} />
                      )}
                    </tbody>
                  </table>
                </div>
              </TableScrollFadeContainer>
              {pageCount > 1 && currentData.length > 0 && (
                <div className="pagination">
                  <BottomTablePagination
                    page={page}
                    pageCount={pageCount}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="eligible-trades">
            <p className="label">
              <Trans>Eligible Trades</Trans>
            </p>
            <p className="subtitle">
              {t`Recent trades over 
                  ${formatUsd(competitionInfo?.volumeThreshold, {
                    displayDecimals: 0,
                  })}`}
            </p>
            {competitionInfo && competitionInfo?.extensionTriggerer && (
              <div className="last-trade">
                <div className="left">
                  <div className="relative">
                    <img
                      src={IconCrown}
                      className="absolute left-1/2 top-[-1.8rem] !w-[2.2rem] -translate-x-1/2"
                    />
                    <img
                      src={`${generateAccountInfo(competitionInfo?.extensionTriggerer).avator}`}
                      width="28"
                      className="rounded-full"
                    />
                  </div>
                  <div className="ml-[1rem]">
                    <p className="flex items-center">
                      <em>{`${competitionInfo?.extensionTriggerer?.toString().slice(0, 4)}...${competitionInfo?.extensionTriggerer?.toString().slice(-4)}`}</em>
                      <a
                        href={getExplorerAccountUrl(String(competitionInfo.extensionTriggerer))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 mt-1 text-[#A3A3A3] hover:text-white"
                      >
                        <FiExternalLink size={16} />
                      </a>
                    </p>
                    <p className="copy">
                      <CopyReferralCode
                        referralCode={
                          competitionInfoTradeDataCodes[
                            competitionInfo?.extensionTriggerer?.toString()
                          ]
                        }
                      />
                    </p>
                    {/* {(
                        <p className="text-[1.2rem] text-[red] text-left">
                          {status === 'ended' ? 'Final Trades' : 'Latest Trades'}
                        </p>
                      )} */}
                  </div>
                </div>
                <div className="com center">
                  <em>
                    {formatUsd(vol.mul(new BN(30)).div(new BN(100)), {
                      displayDecimals: 2,
                    })}
                  </em>
                  <p>
                    <Trans>Prize</Trans>
                  </p>
                </div>
                {/* <div className="com center copy">
                    <CopyReferralCode
                      referralCode={competitionInfoTradeDataCodes[competitionInfo?.extensionTriggerer?.toString()]}/>
                    <p><Trans>Referral Code</Trans></p>
                  </div> */}

                {/* <div className="com right">
                    <span>Time Ago{isMobile ? '' : 's'}</span>
                    <em>{formatTime(Number(leaderboardData[0].time))}</em>
                  </div> */}
              </div>
            )}
            <div className="my-30 rounded-4 text-left">
              <TableScrollFadeContainer>
                <table className="mx-auto w-[120rem] table-fixed">
                  <thead>
                    <TableTheadTr bordered>
                      {/* <TableTh style={{ width: '20rem' }}>USER</TableTh> */}
                      <TableTh>
                        <Trans>USER</Trans>
                      </TableTh>
                      <TableTh
                        style={{
                          width: `${isSmallMobile ? '15rem' : '20rem'}`,
                        }}
                      >
                        <Trans>SIZE</Trans>
                      </TableTh>
                      <TableTh style={{ width: '15rem', textAlign: 'left' }}>
                        <Trans>TIME</Trans>
                      </TableTh>
                      <TableTh
                        style={{
                          width: `${isSmallMobile ? '15rem' : '20rem'}`,
                          textAlign: 'left',
                        }}
                      >
                        <Trans>REFERRAL CODE</Trans>
                      </TableTh>
                    </TableTheadTr>
                  </thead>
                  <tbody>
                    {largeTradeLiveFeed.length > 0 &&
                      largeTradeLiveFeed.map((stats, index) => (
                        <MarketsListItem
                          key={index}
                          stats={stats}
                          index={index}
                          isParticipate={isParticipate}
                          isReceive={isReceive}
                          isDefaultData={isDefaultData}
                          type="eligible"
                          status={status}
                          address={address}
                          isSmallMobile={isSmallMobile}
                          rLeaderboardCodes={rLeaderboardCodes}
                          largeTradeLiveFeedCodes={largeTradeLiveFeedCodes}
                        />
                      ))}
                    {!largeTradeLiveFeed.length && !loadding && (
                      <TableTr
                        hoverable={false}
                        bordered={false}
                        className="h-[6.5rem] text-center"
                      >
                        <TableTd
                          colSpan={4}
                          className="align-top text-gray-400"
                        >
                          {noDataText}
                        </TableTd>
                      </TableTr>
                    )}

                    {largeTradeLiveFeed.length === 0 && loadding && (
                      <MarketListSkeleton count={6} />
                    )}
                  </tbody>
                </table>

                <div className="mt-[2rem]"></div>
                <div className="subtitle mb-[1.3rem] text-center">
                  {competitionConfig?.tradeModel === TradeModel.OPEN ? (
                    <Trans>Latest Position Increase</Trans>
                  ) : (
                    <Trans>Latest Trade</Trans>
                  )}
                </div>

                <div className="mx-auto h-[40px] w-fit overflow-x-hidden overflow-y-hidden">
                  <table className="mx-auto w-[120rem] table-fixed">
                    <tbody className="relative">
                      {/* <VerticalSwiper height={50} delay={2500}> */}
                      {newestTradeData.length > 0 &&
                        newestTradeData.map((stats, index) => (
                          <TableTr
                            key={index}
                            bordered={true}
                            hoverable={true}
                            // className={`animate__animated flex w-full ${newestTradeData.length === 2 ? (index === 0 ? 'animate__fadeOutUp' : 'animate__fadeInUp') : ''}`}
                            className={`flex w-full ${newestTradeData.length === 2 ? 'transition-transform duration-500' : ''}`}
                            style={{
                              // background: 'rgba(250, 123, 78, 0.45)',
                              background: '#181818',
                              border: '16172E',
                              verticalAlign: 'bottom',
                              transform: `${newestTradeData.length === 2 ? `translateY(-${visibleIndex * 40}px)` : ''}`,
                            }}
                            onTransitionEnd={() => {
                              if (newestTradeData.length > 1) {
                                setNewestTradeData((list) => {
                                  return list.slice(-1);
                                });
                              }
                            }}
                          >
                            <TableTd
                              style={{ width: '100%', textAlign: 'left' }}
                            >
                              <div className="relative flex">
                                <img
                                  src={`${generateAccountInfo(stats.address).avator}`}
                                  width="20"
                                  className="rounded-full"
                                />
                                {address === stats.address.toString() ? (
                                  <em className="ml-[1rem]">
                                    <Trans>You</Trans>
                                  </em>
                                ) : (
                                  <div className="ml-[1rem]">
                                    {isSmallMobile
                                      ? `${stats.address.slice(0, 4)}...${stats.address.slice(-2)}`
                                      : stats.address.toString()}
                                  </div>
                                )}
                                <a
                                  href={getExplorerAccountUrl(stats.address)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 mt-1 text-[#A3A3A3] hover:text-white"
                                >
                                  <FiExternalLink size={16} />
                                </a>
                              </div>
                            </TableTd>
                            {/* <TableTd style={{ width: '100%', textAlign: 'left' }}>
                                {stats.address.toString()}
                              </TableTd> */}
                            <TableTd>
                              <div
                                style={{
                                  width: `${isSmallMobile ? '13rem' : '18rem'}`,
                                  textAlign: 'left',
                                }}
                              >
                                {formatUsd(stats.volume, {
                                  displayDecimals: 2,
                                })}
                              </div>
                            </TableTd>
                            <TableTd>
                              <div
                                style={{ width: '13rem', textAlign: 'left' }}
                              >
                                {formatTime(Number(stats.time))}
                              </div>
                            </TableTd>
                            <TableTd>
                              <div
                                style={{
                                  width: `${isSmallMobile ? '13rem' : '18rem'}`,
                                  textAlign: 'left',
                                }}
                              >
                                <CopyReferralCode
                                  referralCode={
                                    newestTradeDataCodes[stats.address]
                                  }
                                />
                              </div>
                            </TableTd>
                          </TableTr>
                        ))}
                      {/* </VerticalSwiper> */}
                    </tbody>
                  </table>
                </div>
              </TableScrollFadeContainer>
            </div>
          </div>
        </>
      )}
      <RuleNodesBoard
        competitionConfig={competitionConfig}
        competitionInfo={competitionInfo}
      />

      {/* <Modal
        className="PositionEditor-modal [&_.Modal-close-button]:hidden [&_.Modal-title]:w-full [&_.Modal-title]:text-center"
        isVisible={isVisible}
        contentPadding={true}
        setIsVisible={() => {}}
        qa="terms-modal"
      >
        <div className="mb-[1.5rem] px-[1.4rem]">
          <img
            className="absolute right-[1.2rem] top-[1.2rem] w-[1.2rem] cursor-pointer"
            src={IconClose}
            onClick={() => {
              setIsVisible(false);
            }}
          />
          <div className="flex w-[33rem] flex-col items-center">
            <p className="mb-[2rem] text-[1.8rem] font-medium">
              Competition Account
            </p>
            <div className="w-full text-left text-[1.4rem] text-[rgba(255,255,255,0.85)]">
              <p className="mb-[1.2rem]">
                Address: {selfParticipantRef.current.address.toString()}
              </p>
              <p>
                Volume:{' '}
                {formatUsd(selfParticipantRef.current.volume, {
                  displayDecimals: 2,
                })}
              </p>
            </div>
            <div
              className="mt-30 md:mt-30 flex justify-center gap-10"
              onClick={() => {
                setIsVisible(false);
                void closeParticipant();
              }}
            >
              {status === 'ended' && (
                <p className="rounded-8 to-cold-blue-500 text-body-small hover:to-cold-blue-700 sm:text-body-medium md:text-body-large inline-flex h-[3.2rem] w-[12rem] cursor-pointer items-center justify-center bg-gradient-to-r from-primary-400 px-10 text-[1.4rem] font-medium text-white no-underline transition-all duration-300 hover:-translate-y-2 hover:from-primary-300 sm:h-[3.2rem] sm:min-w-[8rem] md:h-[3.2rem] md:min-w-[12rem]">
                  Claim
                </p>
              )}
            </div>
          </div>
        </div>
      </Modal> */}
    </div>
  );
};

function MarketsListItem({
  stats,
  index,
  type,
  isParticipate,
  isReceive,
  isDefaultData,
  page,
  pageSize,
  status,
  address,
  isSmallMobile,
  rLeaderboardCodes,
  largeTradeLiveFeedCodes,
  onCloseParticipant,
  onSetIsVisible,
}: {
  stats: LeaderboardItem;
  index: number;
  type: string;
  isParticipate: boolean;
  isReceive: boolean;
  isDefaultData: boolean;
  page?: number;
  pageSize?: number;
  status?: string;
  address: string;
  isSmallMobile: boolean;
  rLeaderboardCodes: object;
  largeTradeLiveFeedCodes: object;
  onCloseParticipant?: () => Promise<void>;
  onSetIsVisible?: (visible: boolean) => void;
}) {
  const styleCustom = {
    background:
      type === 'slideshow'
        ? '#181818'
        : index === 0
          ? 'rgba(250, 123, 78, 0.1)'
          : '',
    border:
      index === 0
        ? `1px solid ${type === 'slideshow' ? '#181818' : 'rgba(250, 123, 78, 0.65)'}`
        : '',
    borderColor: index > 0 ? 'rgba(255,255,255,0.12)' : '',
    height: '5.4rem',
  };

  return (
    <TableTr
      bordered={true}
      hoverable={true}
      className={
        stats.lasttest
          ? 'animate-pulse-customize transition-colors-customize border-[#535353] bg-[rgba(250, 123, 78, 0.45)]'
          : ''
      }
      style={
        stats.address === address && page <= 1
          ? styleCustom
          : {
              height: '45px',
            }
      }
    >
      {type === 'all' && (
        <TableTd>
          {index === 0 && stats.address === address && page <= 1 ? (
            <>
              <span
                style={{
                  paddingLeft: '1rem',
                }}
              >
                {stats.rank}
              </span>
            </>
          ) : (
            <>
              {index >= 0 && stats.isUseRank && page <= 1 ? (
                <>
                  <img
                    src={`${[IconRank01, IconRank02, IconRank03, IconRank04, IconRank05][stats.rank - 1]}`}
                    alt="stats.token.symbol"
                    width="30"
                  />
                </>
              ) : (
                <>
                  <p
                    style={{
                      paddingLeft: index >= 5 || page > 0 ? '1.3rem' : '',
                    }}
                  >
                    {/* {(page <= 1 ? stats.rank : (page - 1 + pageSize + index - 1) +
                      (stats.address === address ? 0 : 1))} */}
                    {stats.rank}
                  </p>
                </>
              )}
            </>
          )}
        </TableTd>
      )}
      {/* <TableTd>
        <div className="token-symbol-wrapper" style={{ width: 'auto' }}>
          <div className="flex items-center">
            {type === 'eligible' &&
            address === stats.address.toString() &&
            index === 0 ? (
              <p
                style={{
                  paddingLeft: '1.3rem',
                }}
              >
                <span>You</span>
              </p>
            ) : (
              <>
                <img
                  src={`${generateAccountInfo(stats.address).avator}`}
                  alt="stats.token.symbol"
                  width="20"
                  height="20"
                  className="rounded-full bg-[#fff]"
                />
                <div className="ml-[1rem]">
                  <span>{generateAccountInfo(stats.address).nickName}</span>
                  {type === 'eligible' && stats.lasttest && (
                    <p className="text-[1.2rem] text-[red]">
                      {status === 'ended' ? 'Final Trades' : 'Latest Trades'}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </TableTd> */}
      <TableTd>
        <div className="flex items-center">
          <img
            src={`${generateAccountInfo(stats.address).avator}`}
            alt="stats.token.symbol"
            width="20"
            height="20"
            className={`rounded-full ${isDefaultData && 'no-data-img'}`}
          />
          <div className="ml-[1rem] flex items-center">
            {address === stats.address.toString() ? (
              <em>
                <Trans>You</Trans>
              </em>
            ) : (
              <span>
                {isDefaultData
                  ? '-'
                  : isSmallMobile
                    ? `${stats.address.slice(0, 4)}...${stats.address.slice(-2)}`
                    : stats.address.toString()}
              </span>
            )}
            {/* {type === 'eligible' && stats.lasttest && (
              <p className="mt-[0.1rem] text-[1.2rem] text-[red]">
                {status === 'ended' ? t`Final Trades` : t`Latest Trades`}
              </p>
            )} */}
          </div>
          {!isDefaultData && (
            <a
              href={getExplorerAccountUrl(stats.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 mt-1 text-[#A3A3A3] hover:text-white"
            >
              <FiExternalLink size={16} />
            </a>
          )}
          {type === 'all' &&
            status === 'ended' &&
            isReceive &&
            stats.address === address &&
            index === 0 && (
              <TooltipWithPortal
                handle={
                  <div className="mx-[1rem] text-left">
                    <p
                      className="button secondary center"
                      onClick={() => {
                        onSetIsVisible?.(false);
                        void onCloseParticipant?.();
                      }}
                    >
                      <Trans>Claim Rent</Trans>
                    </p>
                  </div>
                }
                position="bottom-end"
                content={
                  <p>
                    <Trans>Close participant account and claim rent</Trans>
                  </p>
                }
              />
            )}
        </div>
      </TableTd>
      <TableTd>
        <div style={{ width: '20rem', textAlign: 'left' }}>
          {isDefaultData || !stats.volume
            ? '--'
            : formatUsd(stats.volume, { displayDecimals: 2 })}
        </div>
      </TableTd>
      {/* {type === 'all' &&
        status === 'ended' &&
        isReceive &&
        stats.address === address && (
          <TableTd className="h-[57px]">
            <div className="w-[13rem] text-left">
              <p
                className="rounded-8 to-cold-blue-500 text-body-small hover:to-cold-blue-700 sm:text-body-medium md:text-body-large inline-flex h-[3.2rem] cursor-pointer items-center justify-center bg-gradient-to-r from-primary-400 px-10 text-[.8rem] font-medium text-white no-underline transition-all duration-300 hover:-translate-y-2 hover:from-primary-300 sm:h-[3.2rem] md:h-[3.2rem]"
                onClick={() => {
                  onSetIsVisible?.(false);
                  void onCloseParticipant?.();
                }}
              >
                Claim Rent
              </p>
            </div>
          </TableTd>
        )} */}
      {['eligible'].includes(type) && (
        <TableTd>
          <div style={{ width: '15rem', textAlign: 'left' }}>
            {stats.time ? formatTime(Number(stats.time)) : '--'}
          </div>
        </TableTd>
      )}
      {/* {['all'].includes(type) && (
        <TableTd>
          <div style={{ width: '10rem', textAlign: 'left' }}>
            {stats.gt}
          </div>
        </TableTd>
      )} */}
      <TableTd>
        <CopyReferralCode
          referralCode={
            type === 'all'
              ? (rLeaderboardCodes[stats.address] as string)
              : (largeTradeLiveFeedCodes[stats.address] as string)
          }
        />
      </TableTd>
    </TableTr>
  );
}

export default Competition;
