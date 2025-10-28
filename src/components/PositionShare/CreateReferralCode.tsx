import { Trans, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import type { TransactionResponse } from "ethers";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";

import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { registerReferralCode } from "domain/referrals";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getReferralCodeTakenStatus, getReferralsPageUrlForCreateCode } from "components/Referrals/referralsHelper";

import ReferralsIcon from "img/referrals.svg?react";

type Props = {
  onSuccess: (code: string) => void;
};

const REFERRAL_DOCS_LINK = "https://docs.gmx.io/docs/referrals";

export function CreateReferralCode({ onSuccess }: Props) {
  const { signer } = useWallet();
  const { pendingTxns } = usePendingTxns();
  const { openConnectModal } = useConnectModal();
  const { address: account, isConnected } = useAccount();
  const { chainId, srcChainId } = useChainId();

  const [referralCode, setReferralCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(false);
  const [isAlreadyTaken, setIsAlreadyTaken] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const createReferralCode = useCallback(
    (referralCode: string) => {
      if (!signer) {
        return Promise.reject(new Error("Wallet not connected"));
      }

      return registerReferralCode(chainId, referralCode, signer, {
        sentMsg: t`Referral code submitted.`,
        failMsg: t`Referral code creation failed.`,
        pendingTxns,
      });
    },
    [chainId, pendingTxns, signer]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsProcessing(true);
    try {
      const { takenStatus } = await getReferralCodeTakenStatus(account, referralCode, chainId);

      if (takenStatus !== "none") {
        setIsAlreadyTaken(true);
        return;
      }

      const tx = (await createReferralCode(referralCode)) as TransactionResponse;
      const receipt = await tx.wait();

      if (receipt?.status === 1) {
        helperToast.success(t`Referral code created.`);
        onSuccess(referralCode);
        setReferralCode("");
      }
    } catch (err) {
      setError(true);
    } finally {
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    setIsAlreadyTaken(false);
    setError(false);
  }, [referralCode]);

  let buttonState: {
    text: string;
    disabled: boolean;
    onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  } = {
    text: t`Create code`,
    disabled: false,
    onSubmit: handleSubmit,
  };

  if (!isConnected) {
    buttonState = {
      text: t`Connect wallet`,
      disabled: false,
      onSubmit: (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        openConnectModal?.();
      },
    };
  } else if (srcChainId !== undefined) {
    buttonState = {
      text: t`Create code`,
      disabled: !referralCode,
      onSubmit: (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!referralCode) {
          return;
        }

        const url = getReferralsPageUrlForCreateCode(referralCode);
        window.location.assign(url);
      },
    };
  } else if (isProcessing) {
    buttonState = {
      text: t`Creating code`,
      disabled: true,
    };
  } else if (!referralCode) {
    buttonState = {
      text: t`Enter a code`,
      disabled: true,
    };
  } else if (isAlreadyTaken) {
    buttonState = {
      text: t`Code already taken`,
      disabled: true,
    };
  }

  return (
    <div className="flex flex-col gap-16 rounded-12 border border-slate-600/60 bg-slate-900/60 p-16">
      <div className="flex flex-col gap-4">
        <p className="text-13 font-medium text-typography-primary">
          <Trans>Earn rewards by sharing your code!</Trans>
        </p>
        <p className="text-13 text-typography-secondary">
          <Trans>
            Get 5% back and give your community 5% off every trade. Higher referral tiers unlock even more.{" "}
            <ExternalLink className="font-medium text-blue-300 !no-underline" href={REFERRAL_DOCS_LINK} newTab>
              <Trans>Learn more</Trans>
            </ExternalLink>
          </Trans>
        </p>
      </div>
      <form onSubmit={buttonState.onSubmit ?? handleSubmit} className="flex gap-8">
        <label
          className={cx(
            "flex grow cursor-pointer items-center gap-8 rounded-8 border-1/2 bg-slate-800 p-8",
            error || isAlreadyTaken ? "border-red-500" : "border-slate-800"
          )}
        >
          <ReferralsIcon className="size-16 text-typography-secondary" />
          <input
            ref={inputRef}
            value={referralCode}
            disabled={isProcessing || !isConnected}
            placeholder={t`Enter referral code`}
            className="grow p-0 py-2 text-13 leading-[13px] placeholder:text-typography-secondary"
            onChange={(event) => {
              const { value } = event.target;
              setReferralCode(value);
            }}
          />
        </label>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={buttonState.disabled}
            className="min-w-[140px] justify-center"
          >
            {buttonState.text}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CreateReferralCode;
