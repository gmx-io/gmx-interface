/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import Modal from '@/components/Common/Modal/Modal';
import Button from '@/components/Common/Button/Button';
import { t } from '@lingui/macro';
import './codeModal.scss';
import { usePayer } from '@/components/TradeBoxNew/Hooks/usePayer';
import { useRef, useState } from 'react';
import { useInitializeReferralCode } from '@/hooks/referralHooks';
import { useCheckReferralCodeExists } from '@/hooks/referralHooks/checkReferralCode';
import LoadingCircle from '../LoadingCircle/LoadingCircle';
import { helperNotice } from '@/utils/lib/helperNotice';

interface ReferralsCodeModalProps {
  showModal: boolean;
  onClose: () => void;
  onCreated?: (code: string) => void;
}

export default function ReferralsCodeModal({ showModal, onClose, onCreated }: ReferralsCodeModalProps) {
  const handleClose = () => {
    onClose();
    setReferralCode('');
    setCheckCode(false);
    setIsCheck(false);
    setCheckStatus(true);
  };

  const { checkReferralCode } = useCheckReferralCodeExists();
  const [isCheck, setIsCheck] = useState(false);
  const [checkStatus, setCheckStatus] = useState(true);
  const { connected, openConnectWalletModal } = usePayer();
  const [referralCode, setReferralCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { initialize: initializeReferralCode, isInitializing } = useInitializeReferralCode();
  const [checkCode, setCheckCode] = useState(false);

  const checkCodeValidity = (code: any) => {
    setReferralCode(code);

    const regex = /^[A-HJ-NP-Za-km-z1-9]+$/;
    const basicOk = regex.test(code) && code?.length <= 12;
    setCheckCode(basicOk);

    if (!basicOk) {
      setCheckStatus(true);
      setIsCheck(false);
      return;
    }

    setIsCheck(true);
    void checkReferralCode(code).then((exists) => {
      setCheckStatus(!exists);
      setIsCheck(false);
    });
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const waitUntilCodeExists = async (code: string, timeoutMs = 8000, intervalMs = 500) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const exists = await checkReferralCode(code);
        if (exists) return true;
      } catch {
        // ignore and retry
      }
      await sleep(intervalMs);
    }
    return false;
  };

  const handleSubmit = async () => {
    if (!referralCode || !checkCode || !checkStatus || isCheck || isInitializing) return;

    try {
      await initializeReferralCode({ referralCode });
      const ok = await waitUntilCodeExists(referralCode, 8000, 500);
      if (!ok) {
        helperNotice.error(t`Referral code creation failed or has not been confirmed yet.`);
        return;
      }

      onCreated?.(referralCode);

      onClose();
      setReferralCode('');
      setCheckCode(false);
      setIsCheck(false);
      setCheckStatus(true);
    } catch (e) {
      helperNotice.error(t`Failed to create referral code. Please try again.`);
    }
  };

  return (
    <div>
      <Modal
        isVisible={showModal}
        setIsVisible={() => handleClose()}
        className="referral-code-modal"
        qa="referral-code-modal"
        label={t`Create Referral Code`}
      >
        {!connected ? (
          <div className="w-full">
            <div className="mt-[5.7rem] text-center text-[1.4rem] font-[400] leading-[1.8rem]">
              <p>{t`Create your referral code now and start`}</p>
              <p>{t`earning rewards!`}</p>
            </div>
            <Button
              variant="ghost"
              onClick={() => openConnectWalletModal()}
              className="mt-[6.4rem] w-full !rounded-[0.8rem] !bg-[#FA7B4E] !p-0 !text-[1.6rem] !font-[500] !leading-[4rem] !text-[#fff] hover:!bg-[#FA7B4E] active:!bg-[#FA7B4E]"
            >
              {t`Connect Wallet`}
            </Button>
          </div>
        ) : (
          <div className="w-full">
            <div className="mt-[2rem] text-center text-[1.4rem] font-[400] leading-[1.8rem]">
              <p>{t`Create your referral code now and start`}</p>
              <p>{t`earning rewards!`}</p>
            </div>

            <input
              ref={inputRef}
              value={referralCode}
              onChange={(e) => checkCodeValidity(e?.target.value)}
              disabled={isInitializing}
              className={`${!checkCode && referralCode ? 'error' : ''} code-input mt-[2rem] w-full rounded-[0.8rem] !bg-[#1F1F1F] p-[1.2rem] text-center text-[1.2rem] font-[400] leading-[1.6rem] placeholder:!text-[#A3A3A3]`}
              type="text"
              placeholder={t`Enter Referral Code`}
            />

            <div className="mt-[0.8rem]  text-center text-[1.2rem] font-[400] leading-[1.5rem] text-[#FF4D4D]">
              {!checkCode && referralCode?.length > 12
                ? t`Code must be 12 characters or fewer.`
                : !checkCode && referralCode
                  ? t`Code can only contain letters and numbers (0, O, I, and l are not allowed).`
                  : !isCheck && !checkStatus
                    ? t`This code is already taken.`
                    : ''}
            </div>

            {!referralCode || !checkCode ? (
              <Button
                variant="ghost"
                disabled
                className="mt-[2rem] w-full !rounded-[0.8rem] !bg-[#1F1F1F] !p-0 !text-[1.6rem] !font-[500] !leading-[4rem] !text-[#A3A3A3] hover:!bg-[#1F1F1F]"
              >
                {!referralCode ? t`Enter a code` : t`Change a code`}
              </Button>
            ) : (
              <Button
                variant="ghost"
                disabled={isInitializing || isCheck || !checkStatus}
                onClick={() => void handleSubmit()}
                className="primary-btn-style mt-[2rem] w-full !rounded-[0.8rem] !bg-[#FA7B4E] !p-0 !text-[1.6rem] !font-[500] !leading-[4rem] !text-[#fff] hover:!bg-[#FA7B4E] active:!bg-[#FA7B4E] disabled:!bg-[#1F1F1F] disabled:!text-[#A3A3A3]"
              >
                <span className="flex items-center justify-center gap-[0.8rem]">
                  {isInitializing ? <LoadingCircle /> : null}
                  {isInitializing ? t`Creating...` : t`Create`}
                </span>
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
