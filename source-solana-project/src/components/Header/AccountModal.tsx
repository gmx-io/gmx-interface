/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

import './AccountModal.scss';
import Modal from "@/components/Common/Modal/Modal";
import Button from '@/components/Common/Button/Button';
import SettingsComponent from '@/components/TradeBoxNew/components/childs/Settings';
import Tooltip from '@/components/Common/Tooltip/Tooltip';
import TokenSelectDrawer from '@/components/Header/TokenSelectDrawer';
import ExternalLink from '@/components/Common/Link/ExternalLink';
import ReferralsCodeModal from '@/components/Referrals/Code/CodeModal';
import SettingsIcon from '@/components/TradeBoxNew/assets/Settings.svg';
import { useTickers } from '@/components/TradeBoxNew/Hooks/useTicker';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useCopyToClipboard, useMedia } from 'react-use';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatUsd, formatAmount, formatParseUsdToBN } from '@/utils/legacy/format';
import { generateAccountInfo } from '@/utils/index';
import { getAddressUrl } from '@/utils/lib/explorer';
import { helperNotice, removeNotice } from '@/utils/lib/helperNotice';
import { t, Trans } from '@lingui/macro';
import { BN_ZERO } from '@/config/constants';
import { BN } from '@coral-xyz/anchor';
import { useAppStore } from '@/zustand/useAppStore';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { findUserPDA } from 'gmsol';
import { useSWRConfig } from 'swr';

import copy from '@/img/ic_copy_16.svg';
import externalLink from '@/img/ic_new_link_16.svg';
import disconnect from '@/img/ic_sign_out_16.svg';

import { useDecodeReferralCode, useReferrerReferralCode } from '@/hooks/referralHooks';
import { useReferralDetails, useUserAccount } from '@/hooks/fetchHooks';
import { useStoreProgram } from '@/contexts/anchor';
import { selectSkipPreflight } from '@/selectors/setting/baseSelectors';
import {
  selectOpenReferralModal,
} from '@/selectors/referral/baseSelectors'
import { filterUserAccount } from '@/utils/lib/filter';
import { getGmw404Enabled } from '@/config/featureFlagEnable';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: BN;
  decimals: number;
  payerSwapList: any;
  initialDecodedReferralCode: string;
}

const AccountModal = ({
  isOpen,
  onClose,
  amount,
  decimals,
  payerSwapList,
  initialDecodedReferralCode,
}: AccountModalProps) => {
  useTickers();
  const isMobile = useMedia('(max-width: 768px)');
  const [popHeight, setPopHeight] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [decodedReferralCode, setDecodedReferralCode] = useState<string>(
    getGmw404Enabled() ? initialDecodedReferralCode : ''
  );
  const [legacyReferralCode, setLegacyReferralCode] = useState<PublicKey | null>(null);
  const { publicKey, disconnect: disconnectWallet } = useWallet();
  const store = useStoreProgram();
  const { mutate } = useSWRConfig();
  const skipPreflight = useAppStore(selectSkipPreflight);
  const [, copyToClipboard] = useCopyToClipboard();
  const decodeReferralCode = useDecodeReferralCode();
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [isCreatingGtAccount, setIsCreatingGtAccount] = useState(false);
  const createGtAccountNoticeId = useRef<number | null>(null);
  const createGtAccountSynced = useRef(false);

  const userKey = publicKey?.toBase58() ?? null;
  const { referralDetails, isLoading: isReferralDetailsLoading } = useReferralDetails(userKey);
  const { user: gtAccount, isLoading: isGtAccountLoading } = useUserAccount(GMX_SOLANA_STORE_ADDRESS);
  const openReferralModal = useAppStore(selectOpenReferralModal);

  // Use local referralDetails instead of store state
  const hasReferrer = referralDetails?.hasReferrer ?? false;
  const referrer = referralDetails?.referrer ?? null;

  const { referralCode: referrerCodeFromAddress } =
    useReferrerReferralCode(referrer);
  const isGmw404Enabled = getGmw404Enabled();
  const hasGtAccount = Boolean(gtAccount);

  const mutateGtAccount = useCallback(() => {
    void mutate(filterUserAccount);
  }, [mutate]);

  const invokeCreateGtAccount = useCallback(async () => {
    if (!store) throw new Error('Store program not found');
    if (!publicKey) throw new Error(t`Wallet is not connected`);

    const [userPda] = findUserPDA(GMX_SOLANA_STORE_ADDRESS, publicKey);

    let userAccountExists = false;
    try {
      await store.account.userHeader.fetch(userPda);
      userAccountExists = true;
    } catch {
      userAccountExists = false;
    }

    if (userAccountExists) {
      throw new Error(t`GT account already exists.`);
    }

    const prepareUserIx = await store.methods
      .prepareUser()
      .accountsStrict({
        owner: publicKey,
        store: GMX_SOLANA_STORE_ADDRESS,
        user: userPda,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const transaction = new Transaction().add(prepareUserIx);

    return store.provider.sendAndConfirm(transaction, [], {
      skipPreflight,
    });
  }, [store, publicKey, skipPreflight]);

  const clearCreateGtAccountNotice = useCallback(() => {
    if (createGtAccountNoticeId.current) {
      removeNotice(createGtAccountNoticeId.current);
      createGtAccountNoticeId.current = null;
    }
  }, []);

  const showCreateGtAccountSuccess = useCallback(() => {
    clearCreateGtAccountNotice();
    helperNotice.success(t`User account order created.`);
  }, [clearCreateGtAccountNotice]);

  const emptyTokens = useRef<any[]>([]);

  const memoizedPayerSwapList = useMemo(() => {
    if (!payerSwapList || !Array.isArray(payerSwapList)) {
      return emptyTokens.current;
    }
    return payerSwapList;
  }, [payerSwapList]);

  useEffect(() => {
    if (!isGmw404Enabled && !isReferralDetailsLoading) {
      setLegacyReferralCode(referralDetails?.referralCode || null);
    }
  }, [isGmw404Enabled, isReferralDetailsLoading, referralDetails]);

  useEffect(() => {
    sessionStorage.setItem('pre_user_key', userKey ?? '');
    setDecodedReferralCode(isGmw404Enabled ? initialDecodedReferralCode : '');
  }, [initialDecodedReferralCode, isGmw404Enabled, userKey]);

  useEffect(() => {
    if (!userKey) {
      setDecodedReferralCode('');
      return;
    }

    if (isReferralDetailsLoading) return;

    const referralCode = isGmw404Enabled
      ? referralDetails?.referralCode
      : legacyReferralCode;
    if (!referralCode) {
      setDecodedReferralCode('');
      return;
    }

    let cancelled = false;
    const currentUserKey = userKey;
    void decodeReferralCode(referralCode).then((decoded) => {
      const nowUserKey = publicKey?.toBase58() ?? null;
      if (!cancelled && nowUserKey === currentUserKey) {
        setDecodedReferralCode(decoded);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    decodeReferralCode,
    isReferralDetailsLoading,
    isGmw404Enabled,
    legacyReferralCode,
    publicKey,
    referralDetails?.referralCode,
    userKey,
  ]);

  useEffect(() => {
    if (!isMobile) {
      setPopHeight(null);
      return;
    }

    const calculateHeight = () => {
      const header = document.querySelector('.App-header');
      if (header instanceof HTMLElement) {
        const calculatedHeight = window.innerHeight - header.offsetHeight;
        setPopHeight(calculatedHeight);
      } else {
        const headerContainer = document.querySelector('.App-header-container');
        if (headerContainer instanceof HTMLElement) {
          setPopHeight(window.innerHeight - headerContainer.offsetHeight);
        } else {
          setPopHeight(window.innerHeight);
        }
      }
    };

    const timeoutId = setTimeout(calculateHeight, 0);
    window.addEventListener('resize', calculateHeight);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculateHeight);
    };
  }, [isMobile, isOpen]);

  const totalDefaultMaxTradeMoney = useMemo(() => {
    if (!payerSwapList || !Array.isArray(payerSwapList)) {
      return BN_ZERO;
    }

    return payerSwapList.filter((item) => new BN(item?.amount || '0').gt(new BN(0))).reduce((acc, item) => {
      const price = formatParseUsdToBN(formatAmount(new BN(item?.amount || '0'), item?.decimals).toString() || "0", item?.decimals).mul(new BN(item?.price || 0));
      return acc.add(price);
    }, BN_ZERO);
  }, [payerSwapList]);

  const formatDisplayAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-3)}`;
  };

  const handleCopyAddress = () => {
    if (publicKey) {
      copyToClipboard(publicKey.toBase58());
      helperNotice.success(t`Address copied to clipboard.`);
    }
  };

  const handleCopyReferralCode = () => {
    const referralCodeUrl = location.origin + '/r/' + decodedReferralCode;
    copyToClipboard(referralCodeUrl);
    helperNotice.success(t`Referral code copied to clipboard.`);
  }

  const handleDisconnect = () => {
    void disconnectWallet();
    onClose();
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const handleCreateInvite = () => {
    setShowCodeModal(true);
  }

  useEffect(() => {
    if (!hasGtAccount || !isCreatingGtAccount || createGtAccountSynced.current) {
      return;
    }

    createGtAccountSynced.current = true;
    showCreateGtAccountSuccess();
    setIsCreatingGtAccount(false);
  }, [hasGtAccount, isCreatingGtAccount, showCreateGtAccountSuccess]);

  const handleCreateGtAccount = async () => {
    if (isCreatingGtAccount) return;

    createGtAccountSynced.current = false;
    clearCreateGtAccountNotice();
    createGtAccountNoticeId.current = helperNotice.info(t`Creating user account...`);
    setIsCreatingGtAccount(true);

    try {
      await invokeCreateGtAccount();
      mutateGtAccount();

      if (!createGtAccountSynced.current) {
        createGtAccountSynced.current = true;
        showCreateGtAccountSuccess();
      }
    } catch {
      if (!createGtAccountSynced.current) {
        clearCreateGtAccountNotice();
        helperNotice.error(t`Failed to create user account.`);
      }
    } finally {
      setIsCreatingGtAccount(false);
    }
  };

  if (!publicKey) {
    return null;
  }

  const accountInfo = generateAccountInfo(publicKey.toBase58());
  const displayAddress = formatDisplayAddress(publicKey.toBase58());

  const handleSetReferrer = () => {
    if (!referrer) {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = (urlParams.get('ref') ?? '').trim();
      if (refCode) {
        sessionStorage.setItem('pending_referral_code', refCode);
      }
    }
    openReferralModal(undefined, true);
  };

  const modalNode = (
    <div
      style={isMobile && popHeight ? { '--pop-height': `${popHeight}px` } as React.CSSProperties : undefined}
    >
      <Modal
        className={`account-modal ${!isMobile && "account-custom-modal"}`}
        isVisible={isOpen}
        zIndex={isMobile ? 9000 : undefined}
        setIsVisible={(visible: boolean) => {
          if (!visible) {
            onClose();
          }
        }}
        label={t`GMTrade Account`}
        noDivider={true}
        contentPadding={isMobile ? true : false}
      >
        <div className="account-modal-content">
          <div className="account-info-bar">
            <div className="account-info-left">
              {isGmw404Enabled ? (
                <div className="flex items-center gap-x-[8px]">
                  <div className="account-avatar">
                    <img
                      src={accountInfo.avator}
                      alt="Account"
                      width={32}
                      height={32}
                    />
                  </div>
                  <span className="account-address">{displayAddress}</span>
                </div>
              ) : (
                <>
                  <div className="account-avatar">
                    <img
                      src={accountInfo.avator}
                      alt="Account"
                      width={32}
                      height={32}
                    />
                  </div>
                  <span className="account-address">{displayAddress}</span>
                </>
              )}
              <button
                className="action-btn"
                onClick={handleCopyAddress}
              >
                <img src={copy} alt="Copy" width={20} height={20} />
              </button>
            </div>
            <div className="account-actions">
              {/* <ExternalLink
                className="action-btn"
                href={`/portfolio?address=${publicKey.toBase58()}`}
              >
                <img src={PnlLogo} alt="External Link" className='pnl-logo' width={20} height={20} />
              </ExternalLink> */}
              <Tooltip
                fitContentWidth={true}
                preventDefault={false}
                handle={
                  <ExternalLink
                    href={getAddressUrl(publicKey)}
                    className="action-btn"
                  >
                    <img src={externalLink} alt="External Link" width={20} height={20} />
                  </ExternalLink>
                }
                position="bottom-end"
                content={<span>{t`View in Explorer`}</span>}
              />
              <Tooltip
                fitContentWidth={true}
                handle={
                  <button
                    className="action-btn"
                    onClick={handleSettingsClick}
                    title="Settings"
                  >
                    <img src={SettingsIcon} alt="Settings" width={20} height={20} />
                  </button>
                }
                position="bottom-end"
                content={<span>{t`Settings`}</span>}
              />
              <Tooltip
                fitContentWidth={true}
                handle={
                  <button
                    className="action-btn"
                    onClick={handleDisconnect}
                    title="Disconnect"
                  >
                    <img src={disconnect} alt="Disconnect" width={20} height={20} />
                  </button>
                }
                position="bottom-end"
                content={<span>{t`Disconnect`}</span>}
              />
            </div>
          </div>

          <div className="gt-referral">
            <div className="item">
              {isGmw404Enabled ? (
                <>
                  <div className="mb-[3px] text-secondary font-medium text-[12px]"><Trans>Referrer</Trans></div>
                  {hasReferrer ? (
                    <p>{referrerCodeFromAddress}</p>
                  ) : (
                    <Button
                      variant="primary"
                      className="!rounded-[2rem] !px-[0.8rem] !py-[0.2rem] !font-medium !text-[1.2rem]"
                      onClick={() => void handleSetReferrer()}
                      disabled={isReferralDetailsLoading}
                    >
                      {isCreatingGtAccount ? t`Setting...` : t`Set Referrer`}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-[3px] text-secondary font-medium text-[12px]"><Trans>GT Points</Trans></div>
                  {hasGtAccount ? (
                    <p>{formatAmount(amount, decimals, 2, true, true)}{' '}GT</p>
                  ) : (
                    <Button
                      variant="primary"
                      className="!rounded-[2rem] !px-[0.8rem] !py-[0.2rem] !font-medium !text-[1.2rem]"
                      onClick={() => void handleCreateGtAccount()}
                      disabled={isCreatingGtAccount}
                    >
                      {isCreatingGtAccount ? t`Creating...` : t`Create GT Account`}
                    </Button>
                  )}
                </>
              )}
            </div>
            <div className="item referral">
              <div className="left">
                <div className='mb-[3px] text-secondary font-medium text-[12px]'><Trans>Referral Code</Trans></div>
                {decodedReferralCode ? (
                  <p>{decodedReferralCode}</p>
                ) : (
                  <Button
                    variant="primary"
                    className="!rounded-[2rem] !px-[0.8rem] !py-[0.2rem] !font-medium !text-[1.2rem]"
                    onClick={handleCreateInvite}
                  >
                    {t`Create and Invite`}
                  </Button>
                )}
              </div>
              {
                decodedReferralCode &&
                <div className="right">
                  <button
                    className="action-btn"
                    onClick={handleCopyReferralCode}
                  >
                    <img src={copy} alt="Copy" width={20} height={20} />
                  </button>
                </div>
              }
            </div>
          </div>

          {isGmw404Enabled && <div className="item flex items-center justify-between mb-[12px] px-[16px] py-[10px] bg-fill-surface-elevated rounded-[8px]">
            <div className='text-secondary font-medium text-[12px]'><Trans>GT Points</Trans></div>
            {hasGtAccount ? (
              <p className='font-medium'>{formatAmount(amount, decimals, 2, true, true)}{' '}GT</p>
            ) : (
              <Button
                variant="primary"
                className="!rounded-[2rem] !px-[0.8rem] !py-[0.2rem] !font-medium !text-[1.2rem]"
                onClick={() => void handleCreateGtAccount()}
                disabled={isCreatingGtAccount}
              >
                {isCreatingGtAccount ? t`Creating...` : t`Create GT Account`}
              </Button>
            )}
          </div>}

          <div className="available-balance-section">
            <div className="balance-header">
              <span className="balance-label"><Trans>Available to Trade</Trans></span>
              <span className="amount-value">{formatUsd(totalDefaultMaxTradeMoney)}</span>
            </div>
            <div className="balance-divider"></div>
            <div className="balance-select-list">
              <TokenSelectDrawer
                payerSwapTokens={memoizedPayerSwapList}
                sortedTokens={emptyTokens.current}
              />
            </div>
          </div>

          <ReferralsCodeModal
            showModal={showCodeModal}
            onClose={() => setShowCodeModal(false)}
            onCreated={(code) => {
              setDecodedReferralCode(code);
            }}
          />
        </div>
      </Modal>
    </div>
  );

  return (
    <>
      {isMobile ? createPortal(modalNode, document.body) : modalNode}

      {isSettingsOpen && (
        isMobile ? createPortal(
          <SettingsComponent
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />,
          document.body
        ) : (
          <SettingsComponent
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        )
      )}
    </>
  );
};

export default AccountModal;
