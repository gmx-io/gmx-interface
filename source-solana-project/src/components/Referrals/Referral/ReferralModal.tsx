import Modal from '@/components/Common/Modal/Modal';
import Button from '@/components/Common/Button/Button';
import { helperNotice } from '@/utils/lib/helperNotice';
import { t } from '@lingui/macro';
import IconRightBlue from '@/img/referrals/right-blue.svg';
import './ReferralModal.scss';
import { usePayer } from '@/components/TradeBoxNew/Hooks/usePayer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDecodeReferralCode, useSetReferrer } from '@/hooks/referralHooks';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMedia } from 'react-use';
import { useCheckReferralCodeExists } from '@/hooks/referralHooks/checkReferralCode';
import LoadingCircle from '../LoadingCircle/LoadingCircle';
import { useAppStore } from '@/zustand/useAppStore';
import {
  selectReferralCode,
  selectReferrer,
} from '@/selectors/referral/baseSelectors';
import { getGmw404Enabled, getGmw430Enabled } from '@/config/featureFlagEnable';
import {
  TopGtHoldersMobileModal,
  TopGtHoldersModal,
} from '@/components/Referrals/TopGtHoldersModal';

interface ReferralsCodeModalProps {
  showModal: boolean;
  onClose: () => void;
  initReferralCode?: string;
  onApplied?: (code: string) => void;
  zIndex?: number;
  isStyle2?: boolean; // if true, the modal will be styled as the second style (mobile only slide from bottom)
}

interface SetReferrerResult {
  error?: unknown;
  ok?: boolean;
  success?: boolean;
}

function isSetReferrerResult(res: unknown): res is SetReferrerResult {
  return typeof res === 'object' && res !== null;
}

function extractReferralCodeFromInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    const ref = url.searchParams.get('ref');
    if (ref) return ref.trim();
  } catch {
    // ignore
  }

  const match = trimmed.match(/[?&]ref=([^&#\s]+)/i);
  if (match?.[1]) return decodeURIComponent(match[1]).trim();

  const match2 = trimmed.match(/^ref=([^&#\s]+)$/i);
  if (match2?.[1]) return decodeURIComponent(match2[1]).trim();

  return trimmed;
}

export default function ReferralModal({
  showModal,
  onClose,
  initReferralCode = '',
  onApplied,
  zIndex,
  isStyle2 = false,
}: ReferralsCodeModalProps) {
  const [referrerCode, setReferrerCode] = useState('');
  const [ignoreUrlRef, setIgnoreUrlRef] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const validationIdRef = useRef(0);
  const copiedTopGtReferralCodeRef = useRef('');
  const { setReferrer, isSettingReferrer } = useSetReferrer();
  const decodeReferralCode = useDecodeReferralCode();
  const [checkCode, setCheckCode] = useState(false);
  const [isCheck, setIsCheck] = useState(false);
  const [checkStatus, setCheckStatus] = useState(true);
  const [isReferrerSet, setIsReferrerSet] = useState(false);
  const isGmw404Enabled = getGmw404Enabled();
  const isGmw430Enabled = getGmw430Enabled();
  const referrer = useAppStore(selectReferrer);
  const referralCode = useAppStore(selectReferralCode);
  const { checkReferralCode } = useCheckReferralCodeExists();
  const navigate = useNavigate();
  const location = useLocation();
  const { connected, openConnectWalletModal } = usePayer();
  const [referralCodeInput, setReferralCodeInput] = useState(initReferralCode);
  const [ownReferralCode, setOwnReferralCode] = useState('');
  const [isLoadingOwnReferralCode, setIsLoadingOwnReferralCode] =
    useState(false);
  const [showTopGtHoldersModal, setShowTopGtHoldersModal] = useState(false);
  const isMobile = useMedia('(max-width: 768px)');

  useEffect(() => {
    if (!referralCode) {
      setOwnReferralCode('');
      setIsLoadingOwnReferralCode(false);
      return;
    }

    let cancelled = false;
    setIsLoadingOwnReferralCode(true);

    void decodeReferralCode(referralCode)
      .then((decoded) => {
        if (!cancelled) {
          setOwnReferralCode(decoded.trim());
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOwnReferralCode('');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingOwnReferralCode(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [decodeReferralCode, referralCode]);

  const isOwnReferralCode = useMemo(() => {
    const code = referrerCode.trim();
    return Boolean(code && ownReferralCode && code === ownReferralCode.trim());
  }, [ownReferralCode, referrerCode]);

  const isCheckingReferralCode =
    isCheck || Boolean(referrerCode && checkCode && isLoadingOwnReferralCode);

  const handleClose = () => {
    validationIdRef.current += 1;
    copiedTopGtReferralCodeRef.current = '';
    setShowTopGtHoldersModal(false);
    setIgnoreUrlRef(true);
    onClose();
    setReferrerCode('');
    setReferralCodeInput('');
    setCheckCode(true);
    setIsCheck(false);
    setCheckStatus(true);
    setIsReferrerSet(false);
  };

  const checkCodeValidity = useCallback(
    (raw: string) => {
      const validationId = validationIdRef.current + 1;
      validationIdRef.current = validationId;
      const code = extractReferralCodeFromInput(raw);

      setReferralCodeInput(code);
      setReferrerCode(code);

      const regex = /^[A-HJ-NP-Za-km-z1-9]+$/;
      const basicOk = regex.test(code) && code.length <= 12;

      setCheckCode(basicOk);
      setIsCheck(true);

      if (!basicOk) {
        setIsCheck(false);
        setCheckStatus(true);
        return;
      }

      if (ownReferralCode && code === ownReferralCode.trim()) {
        setCheckStatus(true);
        setIsCheck(false);
        return;
      }

      void checkReferralCode(code).then(
        (exists) => {
          if (validationIdRef.current !== validationId) return;

          setCheckStatus(Boolean(exists));
          setIsCheck(false);
        },
        () => {
          if (validationIdRef.current !== validationId) return;

          setCheckStatus(false);
          setIsCheck(false);
        }
      );
    },
    [checkReferralCode, ownReferralCode]
  );

  useEffect(() => {
    if (!showModal) {
      setIgnoreUrlRef(false);
    }
  }, [showModal]);

  useEffect(() => {
    if (referrer) return;
    if (!showModal) return;
    if (ignoreUrlRef) return;

    const search = new URLSearchParams(location.search);
    const ref = (search.get('ref') ?? '').trim();
    if (!ref) return;

    sessionStorage.setItem('pending_referral_code', ref);
    checkCodeValidity(ref);
  }, [checkCodeValidity, ignoreUrlRef, location.search, referrer, showModal]);

  useEffect(() => {
    if (referrer) {
      sessionStorage.removeItem('pending_referral_code');
      return;
    }
    if (!showModal) return;

    const pendingCode = (
      sessionStorage.getItem('pending_referral_code') ?? ''
    ).trim();
    if (!pendingCode) return;

    checkCodeValidity(pendingCode);
    sessionStorage.removeItem('pending_referral_code');
  }, [checkCodeValidity, referrer, showModal]);

  useEffect(() => {
    if (referrer) return;
    if (!showModal) return;

    const code = initReferralCode.trim();
    if (!code) return;

    checkCodeValidity(code);
  }, [checkCodeValidity, initReferralCode, referrer, showModal]);

  const handleSubmit = async () => {
    if (
      !referrerCode ||
      !checkCode ||
      !checkStatus ||
      isCheckingReferralCode ||
      isOwnReferralCode ||
      (isGmw404Enabled && isReferrerSet) ||
      isSettingReferrer
    )
      return;

    try {
      const res: unknown = await setReferrer({
        referrerReferralCode: referrerCode,
      });
      if (res === undefined) {
        throw new Error(t`setReferrer failed`);
      }
      if (isSetReferrerResult(res)) {
        if (res.error || res.ok === false || res.success === false) {
          if (res.error instanceof Error) throw res.error;
          throw new Error(t`setReferrer failed`);
        }
      }

      if (isGmw404Enabled) {
        setIsReferrerSet(true);
      } else {
        onClose();
        setReferrerCode('');
        setReferralCodeInput('');
      }
      onApplied?.(referrerCode);
      setIgnoreUrlRef(true);
      setCheckCode(true);
      setIsCheck(false);
      setCheckStatus(true);
    } catch (e) {
      helperNotice.error(
        isGmw404Enabled
          ? t`Apply failed. Please try again.`
          : t`Failed to apply referrer. Please try again.`
      );
    }
  };

  const goGtLeaderboard = () => {
    if (isGmw404Enabled) {
      onClose();
    }
    localStorage.setItem('gt_active_tab', 'leaderboard');
    navigate(
      '/gt',
      isGmw404Enabled ? { state: { closeAccountModal: true } } : undefined
    );
  };

  const handleReferralModalVisibilityChange = (nextVisible: boolean) => {
    if (!nextVisible && !showTopGtHoldersModal) {
      handleClose();
    }
  };

  const handleTopGtHoldersClick = () => {
    if (!isGmw404Enabled) {
      goGtLeaderboard();
      return;
    }

    copiedTopGtReferralCodeRef.current = '';
    setShowTopGtHoldersModal(true);
  };

  const handleTopGtHoldersReferralCodeCopied = (referralCode: string) => {
    copiedTopGtReferralCodeRef.current = referralCode;
  };

  const handleTopGtHoldersClose = () => {
    setShowTopGtHoldersModal(false);

    const copiedReferralCode = copiedTopGtReferralCodeRef.current.trim();
    copiedTopGtReferralCodeRef.current = '';

    if (copiedReferralCode) {
      checkCodeValidity(copiedReferralCode);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const topGtHoldersModalZIndex = zIndex === undefined ? undefined : zIndex + 1;

  return (
    <div>
      <Modal
        isVisible={showModal}
        setIsVisible={
          isGmw430Enabled
            ? handleReferralModalVisibilityChange
            : () => handleClose()
        }
        className={
          isGmw404Enabled
            ? `referral-code-modal referral-set-referrer-modal ${isStyle2 ? 'referral-modal-style-2' : ''}`
            : 'referral-code-modal'
        }
        qa="referral-code-modal"
        label={t`Set Referrer`}
        zIndex={isGmw404Enabled ? zIndex : undefined}
      >
        {!connected ? (
          <div>
            <div className="mt-[5.7rem] text-center text-[1.4rem] font-[400] leading-[1.8rem]">
              <p>{t`Please input a referral code to benefit`}</p>
              <p>{t`from 10% trading fee discounts!`}</p>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                openConnectWalletModal();
                if (isGmw404Enabled) handleClose();
              }}
              className="mt-[6.4rem] w-full !rounded-[0.8rem] !bg-[#FA7B4E] !p-0 !text-[1.6rem] !font-[500] !leading-[4rem] !text-[#fff] hover:!bg-[#FA7B4E] active:!bg-[#FA7B4E]"
            >
              {t`Connect Wallet`}
            </Button>
          </div>
        ) : (
          <div>
            <div className="mt-[2rem] text-center text-[1.4rem] font-[400] leading-[1.8rem]">
              <p>{t`Please input a referral code to benefit`}</p>
              <p>{t`from 10% trading fee discounts!`}</p>
            </div>
            <p className="mt-[1rem] flex items-center justify-center text-[1.2rem] font-[500] leading-[1.5rem] text-[#FA7B4E]">
              <span
                onClick={
                  isGmw430Enabled ? handleTopGtHoldersClick : goGtLeaderboard
                }
                className="mr-[0.2rem] cursor-pointer"
              >
                {isGmw430Enabled
                  ? t`No referral code? Get one from a top GT holder`
                  : t`No referral code?  Grab one from GT leaderboard`}
              </span>
              <img
                className="cursor-pointer"
                onClick={
                  isGmw430Enabled ? handleTopGtHoldersClick : goGtLeaderboard
                }
                src={IconRightBlue}
                height={12}
                width={12}
              />
            </p>

            <input
              ref={inputRef}
              value={referralCodeInput}
              onChange={(e) => checkCodeValidity(e.target.value)}
              onPaste={
                isGmw430Enabled
                  ? (e) => {
                      const text = e.clipboardData?.getData('text') ?? '';
                      if (!text.trim()) return;
                      e.preventDefault();
                      checkCodeValidity(text);
                    }
                  : undefined
              }
              disabled={isSettingReferrer || (isGmw404Enabled && isReferrerSet)}
              className={`${!checkCode && referrerCode ? 'error' : ''} code-input mt-[2rem] w-full rounded-[0.8rem] !bg-[#1F1F1F] p-[1.2rem] text-center text-[1.2rem] font-[400] leading-[1.6rem] placeholder:!text-[#A3A3A3]`}
              type="text"
              placeholder={t`Enter Referral Code`}
            />

            <div className="mt-[0.8rem] text-center text-[1.2rem] font-[400] leading-[1.5rem] text-[#FF4D4D]">
              {!checkCode && referrerCode?.length > 12
                ? t`Code must be 12 characters or fewer.`
                : !checkCode && referrerCode
                  ? t`Code can only contain letters and numbers (0, O, I, and l are not allowed).`
                  : ''}
            </div>
            {isGmw404Enabled && (referrer || isReferrerSet) ? (
              <Button
                variant="ghost"
                disabled
                className="mt-[2rem] w-full !rounded-[0.8rem] !bg-[#1F1F1F] !p-0 !text-[1.6rem] !font-[500] !leading-[4rem] !text-[#A3A3A3] hover:!bg-[#1F1F1F]"
              >
                {t`Referrer set. You can't change it.`}
              </Button>
            ) : isGmw404Enabled && !referrerCode ? (
              <Button
                variant="ghost"
                disabled
                className="mt-[2rem] w-full !rounded-[0.8rem] !bg-[#1F1F1F] !p-0 !text-[1.6rem] !font-[500] !leading-[4rem] !text-[#A3A3A3] hover:!bg-[#1F1F1F]"
              >
                {t`Enter a code`}
              </Button>
            ) : !referrerCode || !checkCode ? (
              <Button
                variant="ghost"
                disabled
                className="mt-[2rem] w-full !rounded-[0.8rem] !bg-[#1F1F1F] !p-0 !text-[1.6rem] !font-[500] !leading-[4rem] !text-[#A3A3A3] hover:!bg-[#1F1F1F]"
              >
                {isGmw404Enabled
                  ? t`Apply`
                  : !referrerCode
                    ? t`Enter a code`
                    : t`Change a code`}
              </Button>
            ) : isOwnReferralCode ? (
              <Button
                variant="ghost"
                disabled
                className="mt-[2rem] w-full !rounded-[0.8rem] !bg-[#1F1F1F] !p-0 !text-[1.6rem] !font-[500] !leading-[4rem] !text-[#A3A3A3] hover:!bg-[#1F1F1F]"
              >
                {t`Own referral code not allowed`}
              </Button>
            ) : isCheckingReferralCode || !checkStatus ? (
              <Button
                variant="ghost"
                disabled
                className="mt-[2rem] w-full !rounded-[0.8rem] !bg-[#1F1F1F] !p-0 !text-[1.6rem] !font-[500] !leading-[4rem] !text-[#A3A3A3] hover:!bg-[#1F1F1F]"
              >
                <span className="flex items-center justify-center gap-[0.8rem]">
                  {isCheckingReferralCode ? <LoadingCircle /> : null}
                  {!isCheckingReferralCode && !checkStatus
                    ? t`Referral code does not exist`
                    : t`Checking a code`}
                </span>
              </Button>
            ) : (
              <Button
                variant="primary"
                type="button"
                disabled={isSettingReferrer}
                onClick={() => {
                  void handleSubmit();
                }}
                className="referral-apply-button mt-[2rem] w-full"
              >
                <span className="flex items-center justify-center gap-[0.8rem]">
                  {isSettingReferrer ? <LoadingCircle /> : null}
                  {isSettingReferrer ? t`Applying...` : t`Apply`}
                </span>
              </Button>
            )}
          </div>
        )}
      </Modal>
      {isGmw430Enabled && showTopGtHoldersModal ? (
        isMobile ? (
          <TopGtHoldersMobileModal
            isVisible
            onClose={handleTopGtHoldersClose}
            onReferralCodeCopied={handleTopGtHoldersReferralCodeCopied}
            zIndex={topGtHoldersModalZIndex}
          />
        ) : (
          <TopGtHoldersModal
            isVisible
            onClose={handleTopGtHoldersClose}
            onReferralCodeCopied={handleTopGtHoldersReferralCodeCopied}
            zIndex={topGtHoldersModalZIndex}
          />
        )
      ) : null}
    </div>
  );
}
