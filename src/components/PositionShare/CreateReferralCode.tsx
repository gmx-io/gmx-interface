import { t, Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import { type TransactionResponse } from "ethers";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { encodeFunctionData, zeroAddress } from "viem";
import { useAccount } from "wagmi";

import type { SettlementChainId, SourceChainId } from "config/chains";
import { ContractsChainId, getChainName } from "config/chains";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { type MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { sendQuoteFromNative } from "domain/multichain/sendQuoteFromNative";
import { toastCustomOrStargateError } from "domain/multichain/toastCustomOrStargateError";
import { SendParam } from "domain/multichain/types";
import { useMultichainReferralDepositToken } from "domain/multichain/useMultichainReferralDepositToken";
import {
  createRelayEmptyParamsPayload,
  useMultichainReferralQuote,
} from "domain/multichain/useMultichainReferralQuote";
import { useMultichainStargateApproval } from "domain/multichain/useMultichainStargateApproval";
import { useSourceChainNativeFeeError } from "domain/multichain/useSourceChainNetworkFeeError";
import { registerReferralCode } from "domain/referrals";
import { signRegisterCode } from "domain/synthetics/express/expressOrderUtils";
import { ValidationBannerErrorName } from "domain/synthetics/trade/utils/validation";
import { useChainId } from "lib/chains";
import { useDebounce } from "lib/debounce/useDebounce";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import { formatUsd } from "lib/numbers";
import { sendWalletTransaction } from "lib/transactions";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";
import { encodeReferralCode } from "sdk/utils/referrals";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import { ValidationBannerErrorContent } from "components/Errors/gasErrors";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getCodeError, getReferralCodeTakenStatus, REFERRAL_CODE_REGEX } from "components/Referrals/referralsHelper";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ReferralsIcon from "img/ic_referrals.svg?react";

type Props = {
  onSuccess: (code: string) => void;
};

const REFERRAL_DOCS_LINK = "https://docs.gmx.io/docs/referrals";

export function CreateReferralCode({ onSuccess }: Props) {
  const { srcChainId } = useChainId();

  if (srcChainId !== undefined) {
    return (
      <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="referrals">
        <CreateReferralCodeMultichain onSuccess={onSuccess} />
      </SyntheticsStateContextProvider>
    );
  }

  return <CreateReferralCodeSettlement onSuccess={onSuccess} />;
}

function CreateReferralCodeSettlement({ onSuccess }: Props) {
  const { signer } = useWallet();
  const { pendingTxns } = usePendingTxns();
  const { openConnectModal } = useConnectModal();
  const { address: account, isConnected } = useAccount();
  const { chainId } = useChainId();

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
        sentMsg: t`Referral code submitted`,
        failMsg: t`Referral code creation failed`,
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

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
          helperToast.success(t`Referral code created`);
          onSuccess(referralCode);
          setReferralCode("");
        }
      } catch (err) {
        setError(t`Referral code creation failed`);
        metrics.pushError(err, "createReferralCode");
      } finally {
        setIsProcessing(false);
      }
    },
    [account, referralCode, chainId, createReferralCode, onSuccess]
  );

  useEffect(() => {
    setError(getCodeError(referralCode));
  }, [referralCode]);

  const buttonState = useMemo((): {
    text: string;
    disabled: boolean;
    onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  } => {
    if (!isConnected) {
      return {
        text: t`Connect wallet`,
        disabled: false,
        onSubmit: (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          openConnectModal?.();
        },
      };
    }
    if (isProcessing) {
      return { text: t`Creating code...`, disabled: true };
    }
    if (!referralCode) {
      return { text: t`Enter a code`, disabled: true };
    }
    if (referralCodeCheckStatus === "checking") {
      return { text: t`Checking code...`, disabled: true };
    }
    if (referralCodeCheckStatus === "taken") {
      return { text: t`Code already taken`, disabled: true };
    }
    return {
      text: t`Create code`,
      disabled: Boolean(error),
      onSubmit: handleSubmit,
    };
  }, [isConnected, openConnectModal, isProcessing, referralCode, referralCodeCheckStatus, error, handleSubmit]);

  return (
    <CreateReferralCodeLayout
      chainId={chainId}
      referralCode={referralCode}
      setReferralCode={setReferralCode}
      error={error}
      referralCodeCheckStatus={referralCodeCheckStatus}
      rpcFailedChains={rpcFailedChains}
      isProcessing={isProcessing}
      isConnected={isConnected}
      buttonState={buttonState}
      inputRef={inputRef}
    />
  );
}

function CreateReferralCodeMultichain({ onSuccess }: Props) {
  const { chainId, srcChainId } = useChainId();
  const { account, signer } = useWallet();
  const { openConnectModal } = useConnectModal();
  const { isConnected } = useAccount();
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralCodeCheckStatus, setReferralCodeCheckStatus] = useState<"ok" | "taken" | "checking">("ok");
  const [rpcFailedChains, setRpcFailedChains] = useState<ContractsChainId[]>([]);
  const debouncedReferralCode = useDebounce(referralCode, 300);
  const hasOutdatedUi = useHasOutdatedUi();
  const globalExpressParams = useSelector(selectExpressGlobalParams);

  const {
    depositTokenAddress,
    sourceChainDepositTokenId,
    hasNoTokensOnSourceChain,
    isLoading: isTokensLoading,
  } = useMultichainReferralDepositToken();

  const quoteResult = useMultichainReferralQuote({
    depositTokenAddress,
    actionType: MultichainActionType.RegisterCode,
    referralCode,
  });

  const { needsApproval, isApproving, isAllowanceLoaded, handleApprove } = useMultichainStargateApproval({
    depositTokenAddress,
    amountToApprove: quoteResult.data?.amount,
  });

  const sourceChainNativeFeeError = useSourceChainNativeFeeError({
    networkFeeUsd: quoteResult.networkFeeUsd,
    paySource: "sourceChain",
    chainId: chainId as ContractsChainId,
    srcChainId,
    paySourceChainNativeTokenAmount: 0n,
  });

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!account || srcChainId === undefined) {
        return;
      }

      setIsSubmitting(true);

      try {
        const trimmedCode = referralCode.trim();
        const { takenStatus } = await getReferralCodeTakenStatus(account, trimmedCode, chainId);

        if (takenStatus === "all" || takenStatus === "current") {
          setReferralCodeCheckStatus("taken");
          return;
        }
        if (
          sourceChainDepositTokenId === undefined ||
          globalExpressParams === undefined ||
          signer === undefined ||
          quoteResult.data === undefined
        ) {
          throw new Error("Missing required parameters");
        }

        const relayParamsPayload = createRelayEmptyParamsPayload(chainId as SettlementChainId, globalExpressParams);
        const referralCodeHex = encodeReferralCode(referralCode);

        const signature = await signRegisterCode({
          chainId: chainId as SettlementChainId,
          srcChainId,
          signer,
          relayParams: relayParamsPayload,
          referralCode: referralCodeHex,
        });

        const action: MultichainAction = {
          actionType: MultichainActionType.RegisterCode,
          actionData: { relayParams: relayParamsPayload, signature, referralCode: referralCodeHex },
        };

        const sendParams: SendParam = getMultichainTransferSendParams({
          dstChainId: chainId,
          account,
          srcChainId,
          amountLD: quoteResult.data.amount,
          composeGas: quoteResult.data.composeGas,
          isToGmx: true,
          action,
        });

        const sourceChainStargateAddress = sourceChainDepositTokenId.stargate;

        const value =
          sourceChainDepositTokenId.address === zeroAddress
            ? quoteResult.data.nativeFee + quoteResult.data.amount
            : quoteResult.data.nativeFee;

        const txnResult = await sendWalletTransaction({
          chainId: srcChainId,
          to: sourceChainStargateAddress,
          signer,
          callData: encodeFunctionData({
            abi: abis.IStargate,
            functionName: "sendToken",
            args: [sendParams, sendQuoteFromNative(quoteResult.data.nativeFee), account],
          }),
          value,
          msg: t`Creating referral code...`,
        });

        const receipt = await txnResult.wait();

        if (receipt.status === "success") {
          setReferralCode("");
          onSuccess(trimmedCode);
          helperToast.success(
            <>
              <Trans>Referral code created</Trans>
              <br />
              <br />
              <Trans>May take a few minutes to appear. Check back later</Trans>
            </>
          );
        }
      } catch (err) {
        toastCustomOrStargateError(chainId, err);
        metrics.pushError(err, "createReferralCodeMultichain");
      } finally {
        setIsSubmitting(false);
        setIsValidating(false);
      }
    },
    [
      account,
      srcChainId,
      referralCode,
      chainId,
      sourceChainDepositTokenId,
      globalExpressParams,
      signer,
      quoteResult.data,
      onSuccess,
    ]
  );

  const buttonState = useMemo((): {
    text: React.ReactNode;
    bannerErrorName?: ValidationBannerErrorName;
    disabled: boolean;
    onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  } => {
    if (!isConnected) {
      return {
        text: t`Connect wallet`,
        disabled: false,
        onSubmit: (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          openConnectModal?.();
        },
      };
    }
    if (hasOutdatedUi) {
      return { text: getPageOutdatedError(), disabled: true };
    }
    if (isApproving) {
      return { text: t`Approving...`, disabled: true };
    }
    if (isSubmitting) {
      return { text: t`Creating...`, disabled: true };
    }
    if (!debouncedReferralCode) {
      return { text: t`Enter a code`, disabled: true };
    }
    if (error) {
      return { text: t`Create code`, disabled: true };
    }
    if (isValidating || referralCodeCheckStatus === "checking") {
      return { text: t`Checking code...`, disabled: true };
    }
    if (referralCodeCheckStatus === "taken") {
      return { text: t`Code already taken`, disabled: true };
    }
    if (hasNoTokensOnSourceChain) {
      return { text: t`No tokens on source chain`, disabled: true };
    }
    if (sourceChainNativeFeeError) {
      return {
        text: sourceChainNativeFeeError.buttonErrorMessage,
        bannerErrorName: sourceChainNativeFeeError.bannerErrorName,
        disabled: true,
      };
    }
    if (isTokensLoading || quoteResult.isLoading || !quoteResult.data || !isAllowanceLoaded) {
      return {
        text: t`Loading...`,
        disabled: true,
      };
    }
    if (needsApproval) {
      return {
        text: t`Approve ${sourceChainDepositTokenId?.symbol}`,
        disabled: false,
        onSubmit: (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          handleApprove();
        },
      };
    }
    return {
      text: t`Create code`,
      disabled: Boolean(error),
      onSubmit: handleSubmit,
    };
  }, [
    isConnected,
    openConnectModal,
    hasOutdatedUi,
    isApproving,
    isSubmitting,
    debouncedReferralCode,
    error,
    isValidating,
    referralCodeCheckStatus,
    hasNoTokensOnSourceChain,
    sourceChainNativeFeeError,
    isTokensLoading,
    quoteResult.isLoading,
    quoteResult.data,
    isAllowanceLoaded,
    needsApproval,
    sourceChainDepositTokenId?.symbol,
    handleApprove,
    handleSubmit,
  ]);

  useEffect(() => {
    let cancelled = false;
    async function checkReferralCodeTaken() {
      if (debouncedReferralCode === "" || !REFERRAL_CODE_REGEX.test(debouncedReferralCode) || error) {
        setIsValidating(false);
        setReferralCodeCheckStatus("ok");
        setRpcFailedChains([]);
        return;
      }

      setIsValidating(true);
      setReferralCodeCheckStatus("checking");
      const { takenStatus, failedChains } = await getReferralCodeTakenStatus(account, debouncedReferralCode, chainId);
      if (!cancelled) {
        setRpcFailedChains(failedChains);
        if (takenStatus === "none" || takenStatus === "other") {
          setReferralCodeCheckStatus("ok");
        } else {
          setReferralCodeCheckStatus("taken");
        }
        setIsValidating(false);
      }
    }
    checkReferralCodeTaken();
    return () => {
      cancelled = true;
    };
  }, [debouncedReferralCode, chainId, account, error]);

  useEffect(() => {
    setError(getCodeError(referralCode));
  }, [referralCode]);

  return (
    <CreateReferralCodeLayout
      chainId={chainId}
      referralCode={referralCode}
      setReferralCode={setReferralCode}
      error={error}
      referralCodeCheckStatus={referralCodeCheckStatus}
      rpcFailedChains={rpcFailedChains}
      hasNoTokensOnSourceChain={hasNoTokensOnSourceChain}
      srcChainId={srcChainId}
      isProcessing={isSubmitting}
      isConnected={isConnected}
      buttonState={buttonState}
      inputRef={inputRef}
      networkFeeUsd={quoteResult.networkFeeUsd}
    />
  );
}

function CreateReferralCodeLayout({
  chainId,
  srcChainId,
  referralCode,
  setReferralCode,
  error,
  referralCodeCheckStatus,
  rpcFailedChains,
  hasNoTokensOnSourceChain,
  isProcessing,
  isConnected,
  buttonState,
  inputRef,
  networkFeeUsd,
}: {
  chainId: ContractsChainId;
  srcChainId?: SourceChainId;
  referralCode: string;
  setReferralCode: (code: string) => void;
  error: string | undefined | null;
  referralCodeCheckStatus: "ok" | "checking" | "taken";
  rpcFailedChains?: ContractsChainId[];
  hasNoTokensOnSourceChain?: boolean;
  isProcessing: boolean;
  isConnected: boolean;
  buttonState: {
    text: React.ReactNode;
    bannerErrorName?: ValidationBannerErrorName;
    disabled: boolean;
    onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  };
  inputRef: React.RefObject<HTMLInputElement>;
  networkFeeUsd?: bigint;
}) {
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
      <form
        onSubmit={(event) => {
          event.preventDefault();
          buttonState.onSubmit?.(event);
        }}
        className="flex flex-col gap-8"
      >
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
        {networkFeeUsd !== undefined && (
          <div className="flex justify-between text-12 text-typography-secondary">
            <span>
              <Trans>Network fee</Trans>
            </span>
            <span>{formatUsd(networkFeeUsd)}</span>
          </div>
        )}
        {rpcFailedChains && rpcFailedChains.length > 0 && referralCodeCheckStatus !== "taken" && (
          <AlertInfoCard type="warning" hideClose className="text-left">
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
        {hasNoTokensOnSourceChain && srcChainId && (
          <AlertInfoCard type="error" className="text-left" hideClose>
            <Trans>
              You need USDC or ETH on {getChainName(srcChainId)} to create a referral code via GMX Account. Deposit
              funds or switch to a different network.
            </Trans>
          </AlertInfoCard>
        )}
        {buttonState.bannerErrorName && (
          <AlertInfoCard type="error" hideClose>
            <ValidationBannerErrorContent
              validationBannerErrorName={buttonState.bannerErrorName}
              chainId={chainId}
              srcChainId={srcChainId}
            />
          </AlertInfoCard>
        )}
      </form>
    </div>
  );
}

export default CreateReferralCode;
