import { Trans, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import type { TransactionResponse } from "ethers";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";

import { ContractsChainId, getChainName } from "config/chains";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { registerReferralCode } from "domain/referrals";
import { useChainId } from "lib/chains";
import { useDebounce } from "lib/debounce/useDebounce";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import useWallet from "lib/wallets/useWallet";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import {
  getCodeError,
  getReferralCodeTakenStatus,
  getReferralsPageUrlForCreateCode,
} from "components/Referrals/referralsHelper";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

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
  const [error, setError] = useState<string | null>(null);
  const [rpcFailedChains, setRpcFailedChains] = useState<ContractsChainId[]>([]);
  const [referralCodeCheckStatus, setReferralCodeCheckStatus] = useState<"ok" | "checking" | "taken">("ok");
  const debouncedReferralCode = useDebounce(referralCode, 300);
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

  useEffect(() => {
    let cancelled = false;
    const checkCodeTakenStatus = async () => {
      if (error || !debouncedReferralCode) {
        setReferralCodeCheckStatus("ok");
        setRpcFailedChains([]);
        return;
      }
      const { takenStatus, failedChains } = await getReferralCodeTakenStatus(account, debouncedReferralCode, chainId);
      if (cancelled) {
        return;
      }
      setRpcFailedChains(failedChains);
      if (takenStatus === "none") {
        setReferralCodeCheckStatus("ok");
      } else {
        setReferralCodeCheckStatus("taken");
      }
    };
    setReferralCodeCheckStatus("checking");
    checkCodeTakenStatus();
    return () => {
      cancelled = true;
    };
  }, [account, debouncedReferralCode, error, chainId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsProcessing(true);
    try {
      const { takenStatus, failedChains } = await getReferralCodeTakenStatus(account, referralCode, chainId);
      setRpcFailedChains(failedChains);

      if (takenStatus === "all" || takenStatus === "current") {
        setReferralCodeCheckStatus("taken");
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
      setError("Referral code creation failed.");
      metrics.pushError(err, "createReferralCode");
    } finally {
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    setError(getCodeError(referralCode));
  }, [referralCode]);

  let buttonState: {
    text: string;
    disabled: boolean;
    onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  } = {
    text: t`Create code`,
    disabled: Boolean(error),
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
  } else if (referralCodeCheckStatus === "checking") {
    buttonState = {
      text: t`Checking code...`,
      disabled: true,
    };
  } else if (referralCodeCheckStatus === "taken") {
    buttonState = {
      text: t`Code already taken`,
      disabled: true,
    };
  } else if (srcChainId !== undefined) {
    buttonState = {
      text: t`Create code`,
      disabled: !referralCode || !!error,
      onSubmit: (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!referralCode) {
          return;
        }

        const url = getReferralsPageUrlForCreateCode(referralCode);
        window.location.assign(url);
      },
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
              <Trans>Read more</Trans>
            </ExternalLink>
            .
          </Trans>
        </p>
      </div>
      <form onSubmit={buttonState.onSubmit ?? handleSubmit} className="flex flex-col gap-8">
        <div className="flex gap-8">
          <label
            className={cx(
              "flex grow cursor-pointer items-center gap-8 rounded-8 border-1/2 bg-slate-800 p-8",
              error || referralCodeCheckStatus === "taken" ? "border-red-500" : "border-slate-800"
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
              {error ? <TooltipWithPortal handle={buttonState.text} content={error} /> : buttonState.text}
            </Button>
          </div>
        </div>
        {rpcFailedChains.length > 0 && referralCodeCheckStatus !== "taken" && (
          <AlertInfoCard type="info" className="text-left">
            {rpcFailedChains.length === 1 ? (
              <Trans>
                Unable to verify code availability on {getChainName(rpcFailedChains[0])}. You can still create the code,
                but it may already be taken on that network.
              </Trans>
            ) : (
              <Trans>
                Unable to verify code availability on {rpcFailedChains.map((id) => getChainName(id)).join(", ")}. You
                can still create the code, but it may already be taken on those networks.
              </Trans>
            )}
          </AlertInfoCard>
        )}
      </form>
    </div>
  );
}

export default CreateReferralCode;
