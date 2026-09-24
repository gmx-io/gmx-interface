import './referralsCard.scss';
import {
  getGmw331Enabled,
  getGmw404Enabled,
} from '@/config/featureFlagEnable';
import Button from '@/components/Common/Button/Button';
import { t } from '@lingui/macro';
import IconRight from '@/img/referrals/right.svg';
import IconCopy from '@/img/referrals/copy.svg';
import ReferralsCodeModal from '../Code/CodeModal';
import {
  useDecodeReferralCode,
  useReferrerReferralCode,
} from '@/hooks/referralHooks';
import ReferralsList from '../ReferralsList/ReferralsList';
import { BN_ZERO, USD_DECIMALS } from '@/config/constants';
import { useEffect, useMemo, useState } from 'react';
import {
  selectGtUserDetailsAmount,
  selectGtUserDetailsRank,
} from '@/selectors/gt/gtUserDetailsSelectors';
import { useAppStore } from '@/zustand/useAppStore';
import {
  selectGtGlobalDetailsOrderFeeDiscountFactors,
  selectGtGlobalDetailsRanks,
  selectGtGlobalDetailsReferralRewardFactors,
} from '@/selectors/gt/gtGlobalDetailsSelectors';
import VipTiers from '@/components/GT/Wallet/VipTiers';
import { formatAmount, formatToKMBWithoutUsd } from '@/utils/legacy';
import { useStoreAccount } from '@/hooks/fetchHooks';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import {
  selectRefereeCount,
  selectReferralCode,
  selectReferrer,
  selectOpenReferralModal,
} from '@/selectors/referral/baseSelectors';
import { selectUserOrderFeeDiscountFactor } from '@/selectors/referral/selectUserOrderFeeDiscountFactor';
import { useGtEarnedTotals } from '@/components/GT/Hooks/useGtEarnedTotals';
import { useGtHistoryDataLegacy } from '@/components/GT/Hooks/useGtHistoryDataLegacy';
import { useCopyToClipboard, useMedia } from 'react-use';
import { helperNotice } from '@/utils/lib/helperNotice';
import ReferralModal from '../Referral/ReferralModal';
import { useLingui } from '@lingui/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { isRestrictedArea } from '@/components/Pools/utils/getApyData';

export default function ReferralsCard() {
  const { i18n } = useLingui();
  const { userOrderFeeReferralDiscountFactor } = useAppStore(
    selectUserOrderFeeDiscountFactor
  );
  const { publicKey } = useWallet();
  const userKey = publicKey?.toBase58() ?? null;

  const isMobile = useMedia('(max-width: 870px)');
  const BATCH_NAMES: { [key: number]: string } = {
    0: t`Novice`,
    1: t`Herald`,
    2: t`Guardian`,
    3: t`Crusader`,
    4: t`Archon`,
    5: t`Legend`,
    6: t`Ancient`,
    7: t`Divine`,
    8: t`Immortal`,
    9: t`Celestial`,
  };

  const [, copyToClipboard] = useCopyToClipboard();
  const referralCode = useAppStore(selectReferralCode);
  const referrer = useAppStore(selectReferrer);
  const { referralCode: referrerCodeFromAddress } =
    useReferrerReferralCode(referrer);

  const decodeReferralCode = useDecodeReferralCode();
  const [decodedReferralCode, setDecodedReferralCode] = useState<string>('');
  const refereeCount = useAppStore(selectRefereeCount);
  const { store } = useStoreAccount(GMX_SOLANA_STORE_ADDRESS);
  const userRank = useAppStore(selectGtUserDetailsRank);
  const batchName = BATCH_NAMES[userRank] ?? BATCH_NAMES[0];
  const gtDecimals = useMemo(() => store?.gt?.decimals, [store?.gt?.decimals]);
  const ranks = useAppStore(selectGtGlobalDetailsRanks);
  const userAmount = useAppStore(selectGtUserDetailsAmount);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const openReferralModal = useAppStore(selectOpenReferralModal);
  const [showModal, setShowModal] = useState(false);
  const [showVipTiers, setShowVipTiers] = useState(false);
  const isGmw331Enabled = getGmw331Enabled();
  const isGmw404Enabled = getGmw404Enabled();
  const { earnedTotals } = useGtEarnedTotals();
  const { gtHistory, isLoading: isGtHistoryLoading } = useGtHistoryDataLegacy(
    !isGmw331Enabled
  );
  const [referralAccount, setReferralAccount] = useState('');
  const [currentReferral, setCurrentReferral] = useState<any>({});
  const orderFeeDiscountFactors = useAppStore(
    selectGtGlobalDetailsOrderFeeDiscountFactors
  );
  const referralRewardFactors = useAppStore(
    selectGtGlobalDetailsReferralRewardFactors
  );
  const isUs = isRestrictedArea();
  useEffect(() => {
    sessionStorage.setItem('pre_user_key', userKey ?? '');
    setDecodedReferralCode('');
    setReferralAccount('');
    setCurrentReferral({});
  }, [userKey]);

  useEffect(() => {
    if (isGmw331Enabled) {
      return;
    }
    if (!gtHistory?.length) {
      return;
    }
    if (!userKey) {
      setReferralAccount('');
      return;
    }
    const referralTotalBN = gtHistory.reduce((acc, item) => {
      return item?.action === 'referral_rewards' && item?.amountBN
        ? acc.add(item.amountBN)
        : acc;
    }, BN_ZERO);

    setReferralAccount(
      formatToKMBWithoutUsd(referralTotalBN, 7, { displayDecimals: 2 })
    );
  }, [gtHistory, isGtHistoryLoading, userKey, isGmw331Enabled]);

  const referralAccountDisplay = isGmw331Enabled
    ? !userKey
      ? ''
      : formatToKMBWithoutUsd(earnedTotals.referralBN, 7, { displayDecimals: 2 })
    : referralAccount;

  useEffect(() => {
    if (!userKey || !ranks) {
      setCurrentReferral({});
    } else {
      const item = {
        gtHoldings: `${ranks[userRank]
          ? formatToKMBWithoutUsd(ranks[userRank], 7, { displayDecimals: 0 })
          : 0} GT`,
        feeDiscount:
          orderFeeDiscountFactors && orderFeeDiscountFactors[userRank]
            ? formatAmount(orderFeeDiscountFactors[userRank].muln(100), 20, 0, true)
            : '0',
        referralRewards:
          referralRewardFactors && referralRewardFactors[userRank]
            ? formatAmount(referralRewardFactors[userRank].muln(100), 20, 0, true)
            : '0',
      }
      setCurrentReferral({ ...item });
    }
  }, [userKey, ranks, userRank, orderFeeDiscountFactors, referralRewardFactors]);

  useEffect(() => {
    if (!userKey) {
      setDecodedReferralCode('');
      return;
    }

    if (!referralCode) {
      setDecodedReferralCode('');
      return;
    }

    const currentUserKey = userKey;
    void decodeReferralCode(referralCode).then((decoded) => {
      const nowUserKey = publicKey?.toBase58() ?? null;
      if (nowUserKey === currentUserKey) {
        setDecodedReferralCode(decoded);
        setShowCodeModal(false);
      }
    });
  }, [referralCode, decodeReferralCode, userKey, publicKey]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = (urlParams.get('ref') ?? '').trim();

    if (!isGmw404Enabled) {
      if (referrer || !userKey) {
        sessionStorage.removeItem('pending_referral_code');
        setShowReferralModal(false);
        return;
      }
      if (!refCode && userKey) {
        setShowReferralModal(false);
        return;
      }
      if (!refCode || !userKey) return;
      sessionStorage.setItem('pending_referral_code', refCode);
      setShowReferralModal(true);
      return;
    }

    if (!refCode || !userKey) return;
    sessionStorage.setItem('pending_referral_code', refCode);
    openReferralModal(refCode);
  }, [isGmw404Enabled, openReferralModal, referrer, userKey]);

  const handleCloseVipTiers = () => {
    setShowVipTiers(false);
  };

  const handleSetReferrer = () => {
    if (!referrer) {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = (urlParams.get('ref') ?? '').trim();
      if (refCode) {
        sessionStorage.setItem('pending_referral_code', refCode);
      }
    }
    if (isGmw404Enabled) {
      openReferralModal();
    } else {
      setShowReferralModal(true);
    }
  };

  const createCode = () => {
    setShowCodeModal(true);
  };

  const copyReferralCode = () => {
    const referralCodeUrl = location.origin + '/r/' + decodedReferralCode;
    copyToClipboard(referralCodeUrl);
    helperNotice.success(t`Referral code copied to clipboard.`);
  };
  return (
    <div
      key={`${i18n.locale}`}
      className="referrals flex flex-1 "
    >
      <div className="w-full gap-[0.8rem]">
        <div
          className={`rounded-[0.8rem] bg-[#181818] p-[2rem] ${isMobile ? '!px-[1.6rem] !py-[1.2rem]' : ''
            }`}
        >
          <p
            className={`text-[1.6rem] font-[500] leading-[2.8rem]`}
          >{t`Your GT VIP Level`}</p>
          <div className="card1-content mt-[1.6rem] flex">
            <div className="card1-content-left flex w-[50%] items-center border-r-[1px] border-[#535353]">
              <div
                className={`batch-logo batch-${userRank} !h-[6rem] !w-[6rem]`}
              />
              <span className="rank-name ml-[0.8rem] text-[3.6rem] font-[500]">
                {batchName}
              </span>
            </div>
            <div
              className={`card1-content-right flex items-center pl-[2rem] ${isMobile ? '!pl-[1.6rem]' : ''
                }`}
            >
              <div>
                <p
                  onClick={() => setShowVipTiers(true)}
                  className={`cursor-pointer text-[1.4rem] font-[500] leading-[1.8rem] text-[#A3A3A3]`}
                >{t`To Next Level`}</p>
                <p
                  className="cursor-pointer pr-[2rem] text-[1.4rem] font-[500] leading-[1.8rem] text-[#fff]"
                  onClick={() => setShowVipTiers(true)}
                >
                  <span className="">
                    {userAmount && currentReferral?.gtHoldings
                      ? formatToKMBWithoutUsd(userAmount, gtDecimals)
                      : '0'}
                  </span>
                  <span>{` `}</span>
                  <span>/</span>
                  <span>{` `}</span>
                  <span>
                    {!ranks || !currentReferral?.gtHoldings
                      ? '0 GT'
                      : currentReferral?.gtHoldings}
                  </span>
                </p>
              </div>
              <img
                className={`cursor-pointer ${isMobile ? '!ml-[1.6rem]' : ''}`}
                onClick={() => setShowVipTiers(true)}
                src={IconRight}
                width={16}
                height={16}
              />
            </div>
          </div>
          {isMobile ? (
            <div className={`!mt-[1.2rem] flex items-center justify-between`}>
              <ul className="">
                <li className="ref-percent-value text-[1.4rem] font-[500] leading-[1.8rem] text-[#fff]">
                  {`${formatAmount(
                    userOrderFeeReferralDiscountFactor.muln(100),
                    USD_DECIMALS,
                    0,
                    true
                  )}%`}
                </li>
                <li className="text-[1.2rem] font-[500] leading-[1.5rem] text-[#A3A3A3]">{t`Referral Discount`}</li>
              </ul>
              <ul className="">
                <li className="ref-percent-value text-[1.4rem] font-[500] leading-[1.8rem] text-[#fff]">
                  {currentReferral?.feeDiscount || 0}%
                </li>
                <li className="text-[1.2rem] font-[500] leading-[1.5rem] text-[#A3A3A3]">{t`VIP Discount`}</li>
              </ul>
              <ul className="">
                <li className="ref-percent-value text-[1.4rem] font-[500] leading-[1.8rem] text-[#fff]">
                  {currentReferral?.referralRewards || 0}%
                </li>
                <li className="text-[1.2rem] font-[500] leading-[1.5rem] text-[#A3A3A3]">{t`Referral Rewards`}</li>
              </ul>
            </div>
          ) : (
            <div className="mt-[2rem] flex items-center justify-between gap-[1rem]">
              <ul className="min-w-[33%]">
                <li className="text-[1.4rem] font-[500] leading-[1.8rem] text-[#fff]">
                  {`${formatAmount(
                    userOrderFeeReferralDiscountFactor.muln(100),
                    USD_DECIMALS,
                    0,
                    true
                  )}%`}
                </li>
                <li className="text-[1.4rem] font-[500] leading-[1.8rem] text-[#A3A3A3]">{t`Referral Fee Discount`}</li>
              </ul>
              <ul className="min-w-[33%]">
                <li className="text-[1.4rem] font-[500] leading-[1.8rem] text-[#fff]">
                  {/* {`${formatAmount(
                  userOrderFeeVipDiscountFactor.muln(100),
                  USD_DECIMALS,
                  0,
                  true
                )}%`} */}
                  {currentReferral?.feeDiscount || 0}%
                </li>
                <li className="text-[1.4rem] font-[500] leading-[1.8rem] text-[#A3A3A3]">{t`VIP Fee Discount`}</li>
              </ul>
              <ul className="min-w-[33%]">
                <li className="text-[1.4rem] font-[500] leading-[1.8rem] text-[#fff]">
                  {currentReferral?.referralRewards || 0}%
                </li>
                <li className="text-[1.4rem] font-[500] leading-[1.8rem] text-[#A3A3A3]">{t`Referral  Rewards`}</li>
              </ul>
            </div>
          )}
        </div>
        <div className="rewards-card mt-[0.8rem] rounded-[0.8rem] bg-[#181818] py-[2rem]">
          <p className="rewards-card-title pl-[2rem] text-[1.6rem] font-[500] leading-[2.8rem]">{t`Total Referral Rewards`}</p>
          <p
            className={`mt-[1.6rem]  flex items-center pl-[2rem] leading-[6.2rem] ${isMobile ? '!mt-[1.2rem]' : ''}`}
          >
            <span
              onClick={() => setShowModal(true)}
              className="rewards-card-value cursor-pointer pr-[2rem] text-[3.6rem] font-[500]"
            >
              {referralAccountDisplay ? `${referralAccountDisplay} GT` : '0 GT'}
            </span>
            <img
              onClick={() => setShowModal(true)}
              className="cursor-pointer"
              src={IconRight}
              width={16}
              height={16}
            />
          </p>
          <p className="rewards-card-fr mt-[3rem] flex items-center pl-[2rem] text-[1.8rem] font-[500] text-[#A3A3A3]">
            {t`You've invited `}
            <span className="mx-[0.4rem]">{refereeCount}</span>
            {t`friends`}
          </p>
        </div>
        <div className="code-box grid grid-cols-2 gap-[0.8rem]">
          <div
            className={`code-box-title  mt-[0.8rem]  rounded-[0.8rem] bg-[#181818] p-[2rem] ${isMobile ? '!px-[1.6rem]' : ''} flex flex-col`}
          >
            <p
              className={`text-[1.6rem] font-[500] leading-[2.2rem]`}
            >{t`Invite & Earn GT`}</p>

            <div className="code-box-des-container mt-[2rem] flex flex-1 flex-col">
              <p className="code-box-des pr-[2rem] text-[1.4rem] font-[400] leading-[1.8rem] text-[#A3A3A3]">
                {t`Earn bonus GT when your referees trade. Rewards range from 50% to 100% based on your GT VIP level.`}
              </p>

              <div className="mt-auto">
                {decodedReferralCode ? (
                  <div className="mt-[2rem] flex items-center justify-between rounded-[0.8rem] bg-[#1F1F1F] p-[1rem]">
                    <span className="text-[1.3rem] font-[500] text-[#A3A3A3]">
                      {decodedReferralCode}
                    </span>
                    <img
                      className="cursor-pointer"
                      onClick={() => copyReferralCode()}
                      src={IconCopy}
                      height={16}
                      width={16}
                    />
                  </div>
                ) : (
                  isUs ? (
                    <Button
                      variant="ghost"
                      disabled
                      className="primary-btn disabled-btn-style mt-[2rem] !w-fit !cursor-not-allowed !rounded-[0.8rem] !bg-[#1F1F1F] !p-[1.2rem] !text-[1.3rem] !font-[500] !leading-[1.6rem] !text-[#323232] hover:!bg-[#1F1F1F]"
                    >
                      {t`Access Restricted`}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      type="button"
                      onClick={() => createCode()}
                      className="referrals-card-primary-button primary-btn primary-btn-style mt-[2rem]"
                    >
                      {t`Create Your Referral Code`}
                    </Button>
                  ))}
              </div>
            </div>
          </div>

          <div
            className={`mt-[0.8rem] rounded-[0.8rem] bg-[#181818] p-[2rem] ${isMobile ? '!px-[1.6rem]' : ''} flex flex-col`}
          >
            <p
              className={`code-box-title text-[1.6rem] font-[500] leading-[2.2rem]`}
            >{t`Get a Trading Discount`}</p>

            <div className="code-box-des-container mt-[2rem] flex flex-1 flex-col">
              <p className="code-box-des pr-[2rem] text-[1.4rem] font-[400] leading-[1.8rem] text-[#A3A3A3]">
                {t`This is the referral code you applied from a friend. It gives you a permanent 10% fee discount.`}
              </p>

              <div className="mt-auto">
                {referrer ? (
                  <div className="mt-[2rem] flex items-center justify-between rounded-[0.8rem] bg-[#1F1F1F] p-[1rem]">
                    <span className="text-[1.3rem] font-[500] text-[#A3A3A3]">
                      {referrerCodeFromAddress}
                    </span>
                  </div>
                ) : (
                  isUs ?
                    <Button
                      variant="ghost"
                      disabled
                      className="primary-btn disabled-btn-style mt-[2rem] !w-fit !cursor-not-allowed !rounded-[0.8rem] !bg-[#1F1F1F] !p-[1.2rem] !text-[1.3rem] !font-[500] !leading-[1.6rem] !text-[#323232] hover:!bg-[#1F1F1F]"
                    >
                      {t`Access Restricted`}
                    </Button>
                    :
                    <Button
                      variant="primary"
                      type="button"
                      onClick={() => handleSetReferrer()}
                      className="referrals-card-primary-button primary-btn primary-btn-style mt-[2rem]"
                    >
                      {t`Apply Referral Code`}
                    </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReferralsCodeModal
        showModal={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        onCreated={(code) => {
          setDecodedReferralCode(code);
        }}
      />
      {!isGmw404Enabled && (
        <ReferralModal
          showModal={showReferralModal}
          onClose={() => setShowReferralModal(false)}
        />
      )}
      <ReferralsList
        showModal={showModal}
        onClose={() => setShowModal(false)}
      />
      <VipTiers isVisible={showVipTiers} onClose={handleCloseVipTiers} />
    </div>
  );
}
