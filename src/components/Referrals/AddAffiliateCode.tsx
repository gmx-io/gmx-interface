import { Trans, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import { type TransactionResponse } from "ethers";
import { useEffect, useRef, useState } from "react";
import { encodeFunctionData, zeroAddress } from "viem";
import { useAccount } from "wagmi";

import type { SettlementChainId } from "config/chains";
import { ContractsChainId, getChainName } from "config/chains";
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
import type { ReferralCodeStats } from "domain/referrals/types";
import { signRegisterCode } from "domain/synthetics/express/expressOrderUtils";
import { ValidationBannerErrorName } from "domain/synthetics/trade/utils/validation";
import { useChainId } from "lib/chains";
import { useDebounce } from "lib/debounce/useDebounce";
import { helperToast } from "lib/helperToast";
import { formatUsd } from "lib/numbers";
import { sendWalletTransaction } from "lib/transactions";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";
import { encodeReferralCode } from "sdk/utils/referrals";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { ValidationBannerErrorContent } from "components/TradeBox/hooks/useTradeButtonState";

import {
  getCodeError,
  getReferralCodeTakenStatus,
  getSampleReferrarStat,
  REFERRAL_CODE_REGEX,
} from "./referralsHelper";

type AddAffiliateCodeProps = {
  handleCreateReferralCode: (code: string) => Promise<unknown>;
  active: boolean;
  setRecentlyAddedCodes: (code: ReferralCodeStats[]) => void;
  recentlyAddedCodes: ReferralCodeStats[] | undefined;
  initialReferralCode: string | undefined;
};

function AddAffiliateCode({
  handleCreateReferralCode,
  active,
  setRecentlyAddedCodes,
  recentlyAddedCodes,
  initialReferralCode,
}: AddAffiliateCodeProps) {
  const { openConnectModal } = useConnectModal();

  return (
    <div className="referral-card section-center">
      <h2 className="title">
        <Trans>Generate Referral Code</Trans>
      </h2>
      <p className="sub-title">
        <Trans>
          Looks like you don't have a referral code to share. <br /> Create one now and start earning rebates!
        </Trans>
      </p>
      <div className="card-action">
        {active ? (
          <Form
            recentlyAddedCodes={recentlyAddedCodes}
            setRecentlyAddedCodes={setRecentlyAddedCodes}
            initialReferralCode={initialReferralCode}
            handleCreateReferralCode={handleCreateReferralCode}
          />
        ) : (
          <Button variant="primary-action" className="w-full" onClick={openConnectModal}>
            <Trans>Connect Wallet</Trans>
          </Button>
        )}
      </div>
    </div>
  );
}

function Form({
  recentlyAddedCodes,
  setRecentlyAddedCodes,
  initialReferralCode,
  handleCreateReferralCode,
}: {
  recentlyAddedCodes: ReferralCodeStats[] | undefined;
  setRecentlyAddedCodes: (code: ReferralCodeStats[]) => void;
  initialReferralCode: string | undefined;
  handleCreateReferralCode: (code: string) => Promise<unknown>;
}) {
  const { srcChainId } = useChainId();
  const isMultichain = srcChainId !== undefined;

  if (isMultichain) {
    return (
      <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="referrals">
        <AffiliateCodeFormMultichain
          recentlyAddedCodes={recentlyAddedCodes}
          setRecentlyAddedCodes={setRecentlyAddedCodes}
          initialReferralCode={initialReferralCode}
        />
      </SyntheticsStateContextProvider>
    );
  }
  return (
    <AffiliateCodeForm
      handleCreateReferralCode={handleCreateReferralCode}
      recentlyAddedCodes={recentlyAddedCodes}
      setRecentlyAddedCodes={setRecentlyAddedCodes}
      initialReferralCode={initialReferralCode}
    />
  );
}

function AffiliateCodeFormMultichain({
  recentlyAddedCodes,
  setRecentlyAddedCodes,
  callAfterSuccess,
  initialReferralCode = "",
}: {
  recentlyAddedCodes: ReferralCodeStats[] | undefined;
  setRecentlyAddedCodes: (code: ReferralCodeStats[]) => void;
  callAfterSuccess?: () => void;
  initialReferralCode?: string;
}) {
  const { chainId, srcChainId } = useChainId();
  const { account, signer } = useWallet();
  const [referralCode, setReferralCode] = useState(initialReferralCode?.trim() ?? "");
  const [error, setError] = useState("");
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!account || srcChainId === undefined) {
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmedCode = referralCode.trim();
      const { takenStatus, info: takenInfo } = await getReferralCodeTakenStatus(account, trimmedCode, chainId);

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
        msg: t`Creating referral code`,
      });

      const receipt = await txnResult.wait();

      if (receipt.status === "success") {
        if (recentlyAddedCodes) {
          recentlyAddedCodes.push(getSampleReferrarStat({ code: trimmedCode, takenInfo, account }));
          setRecentlyAddedCodes(recentlyAddedCodes);
        }
        setReferralCode("");

        if (callAfterSuccess) {
          callAfterSuccess();
        }

        helperToast.success(
          <>
            <Trans>Referral code created!</Trans>
            <br />
            <br />
            <Trans>It will take a couple of minutes to be reflected. Please check back later.</Trans>
          </>
        );
      }
    } catch (err) {
      toastCustomOrStargateError(chainId, err);
    } finally {
      setIsSubmitting(false);
      setIsValidating(false);
    }
  }

  let buttonState: {
    text: React.ReactNode;
    bannerErrorName?: ValidationBannerErrorName;
    disabled?: boolean;
    onSubmit?: (event: React.FormEvent) => void;
  } = {
    text: "",
  };

  if (hasOutdatedUi) {
    buttonState = {
      text: t`Page outdated, please refresh`,
      disabled: true,
    };
  } else if (isApproving) {
    buttonState = {
      text: t`Approving...`,
      disabled: true,
    };
  } else if (isSubmitting) {
    buttonState = {
      text: t`Creating...`,
      disabled: true,
    };
  } else if (debouncedReferralCode === "") {
    buttonState = {
      text: t`Enter a code`,
      disabled: true,
    };
  } else if (error) {
    buttonState = {
      text: t`Create`,
      disabled: true,
    };
  } else if (isValidating || referralCodeCheckStatus === "checking") {
    buttonState = {
      text: t`Checking code...`,
      disabled: true,
    };
  } else if (referralCodeCheckStatus === "taken") {
    buttonState = {
      text: t`Code already taken`,
      disabled: true,
    };
  } else if (hasNoTokensOnSourceChain) {
    buttonState = {
      text: t`No tokens on source chain`,
      disabled: true,
    };
  } else if (sourceChainNativeFeeError) {
    buttonState = {
      text: sourceChainNativeFeeError.buttonErrorMessage,
      bannerErrorName: sourceChainNativeFeeError.bannerErrorName,
      disabled: true,
    };
  } else if (isTokensLoading || quoteResult.isLoading || !quoteResult.data || !isAllowanceLoaded) {
    buttonState = {
      text: t`Loading...`,
      disabled: true,
    };
  } else if (needsApproval) {
    buttonState = {
      text: t`Approve ${sourceChainDepositTokenId?.symbol}`,
      disabled: false,
      onSubmit: (event: React.FormEvent) => {
        event.preventDefault();
        handleApprove();
      },
    };
  } else {
    buttonState = {
      text: t`Create`,
      disabled: false,
      onSubmit: handleSubmit,
    };
  }

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
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const sanitizedCode = initialReferralCode?.trim() ?? "";
    setReferralCode(sanitizedCode);
    setError(getCodeError(sanitizedCode));
  }, [initialReferralCode]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        buttonState.onSubmit?.(event);
      }}
      className="flex flex-col gap-15"
    >
      <input
        ref={inputRef}
        disabled={isSubmitting}
        type="text"
        placeholder={t`Enter a code`}
        className={cx("text-input", { "mb-0": error })}
        value={referralCode}
        onChange={({ target }) => {
          const { value } = target;
          setReferralCode(value);
          setError(getCodeError(value));
        }}
      />
      {error && <p className="AffiliateCode-error">{error}</p>}
      {srcChainId && (
        <SyntheticsInfoRow
          label="Network Fee"
          value={quoteResult.networkFeeUsd !== undefined ? formatUsd(quoteResult.networkFeeUsd) : "..."}
        />
      )}
      {rpcFailedChains.length > 0 && referralCodeCheckStatus !== "taken" && (
        <AlertInfoCard type="info" className="text-left">
          {rpcFailedChains.length === 1 ? (
            <Trans>
              Unable to verify code availability on {getChainName(rpcFailedChains[0])}. You can still create the code,
              but it may already be taken on that network.
            </Trans>
          ) : (
            <Trans>
              Unable to verify code availability on {rpcFailedChains.map((id) => getChainName(id)).join(", ")}. You can
              still create the code, but it may already be taken on those networks.
            </Trans>
          )}
        </AlertInfoCard>
      )}
      {hasNoTokensOnSourceChain && srcChainId && (
        <AlertInfoCard type="warning" className="text-left" hideClose>
          <Trans>
            You need USDC or ETH on {getChainName(srcChainId)} to create a referral code via GMX Account. Please deposit
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

      <Button variant="primary-action" className="w-full" type="submit" disabled={buttonState.disabled}>
        {buttonState.text}
      </Button>
    </form>
  );
}

export function AffiliateCodeForm({
  handleCreateReferralCode,
  recentlyAddedCodes,
  setRecentlyAddedCodes,
  callAfterSuccess,
  initialReferralCode = "",
}: {
  handleCreateReferralCode: (code: string) => Promise<unknown>;
  recentlyAddedCodes: ReferralCodeStats[] | undefined;
  setRecentlyAddedCodes: (code: ReferralCodeStats[]) => void;
  callAfterSuccess?: () => void;
  initialReferralCode?: string;
}) {
  const [referralCode, setReferralCode] = useState(initialReferralCode?.trim() ?? "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [referralCodeCheckStatus, setReferralCodeCheckStatus] = useState("ok");
  const [rpcFailedChains, setRpcFailedChains] = useState<ContractsChainId[]>([]);
  const debouncedReferralCode = useDebounce(referralCode, 300);
  const { chainId } = useChainId();
  const { address: account } = useAccount();
  const hasOutdatedUi = useHasOutdatedUi();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const sanitizedCode = initialReferralCode?.trim() ?? "";
    setReferralCode(sanitizedCode);
    setError(getCodeError(sanitizedCode));
  }, [initialReferralCode]);

  useEffect(() => {
    let cancelled = false;
    const checkCodeTakenStatus = async () => {
      if (error || !debouncedReferralCode) {
        setReferralCodeCheckStatus("ok");
        setRpcFailedChains([]);
        return;
      }
      const { takenStatus, failedChains } = await getReferralCodeTakenStatus(account, debouncedReferralCode, chainId);
      // ignore the result if the referral code to check has changed
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsProcessing(true);

    const trimmedCode = referralCode.trim();
    const {
      takenStatus,
      info: takenInfo,
      failedChains,
    } = await getReferralCodeTakenStatus(account, trimmedCode, chainId);
    setRpcFailedChains(failedChains);

    if (["all", "current"].includes(takenStatus)) {
      setIsProcessing(false);
      return;
    }

    try {
      const tx = (await handleCreateReferralCode(trimmedCode)) as TransactionResponse;

      if (callAfterSuccess) {
        callAfterSuccess();
      }

      const receipt = await tx.wait();

      if (receipt?.status === 1) {
        if (recentlyAddedCodes) {
          recentlyAddedCodes.push(getSampleReferrarStat({ code: trimmedCode, takenInfo, account }));
          setRecentlyAddedCodes(recentlyAddedCodes);
        }
        helperToast.success(t`Referral code created.`);
        setReferralCode("");
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }

  let buttonState: {
    text: string;
    disabled?: boolean;
    onSubmit?: (event: React.FormEvent) => void;
  } = {
    text: "",
    disabled: false,
    onSubmit: undefined,
  };

  if (hasOutdatedUi) {
    buttonState = {
      text: t`Page outdated, please refresh`,
      disabled: true,
    };
  } else if (!debouncedReferralCode) {
    buttonState = {
      text: t`Enter a code`,
      disabled: true,
    };
  } else if (referralCodeCheckStatus === "taken") {
    buttonState = {
      text: t`Code already taken`,
      disabled: true,
    };
  } else if (referralCodeCheckStatus === "checking") {
    buttonState = {
      text: t`Checking code...`,
      disabled: true,
    };
  } else if (isProcessing) {
    buttonState = {
      text: t`Creating...`,
      disabled: true,
    };
  } else {
    buttonState = {
      text: t`Create`,
      disabled: false,
      onSubmit: handleSubmit,
    };
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        buttonState.onSubmit?.(event);
      }}
    >
      <input
        type="text"
        ref={inputRef}
        value={referralCode}
        disabled={isProcessing}
        className={cx("text-input", { "mb-15": !error })}
        placeholder={t`Enter a code`}
        onChange={({ target }) => {
          const { value } = target;
          setReferralCode(value);
          setError(getCodeError(value));
        }}
      />
      {error && <p className="AffiliateCode-error">{error}</p>}
      {rpcFailedChains.length > 0 && referralCodeCheckStatus !== "taken" && (
        <AlertInfoCard type="info" className="mb-15 text-left">
          {rpcFailedChains.length === 1 ? (
            <Trans>
              Unable to verify code availability on {getChainName(rpcFailedChains[0])}. You can still create the code,
              but it may already be taken on that network.
            </Trans>
          ) : (
            <Trans>
              Unable to verify code availability on {rpcFailedChains.map((id) => getChainName(id)).join(", ")}. You can
              still create the code, but it may already be taken on those networks.
            </Trans>
          )}
        </AlertInfoCard>
      )}
      <Button variant="primary-action" className="w-full" type="submit" disabled={buttonState.disabled}>
        {buttonState.text}
      </Button>
    </form>
  );
}

export function AffiliateCodeFormContainer({
  handleCreateReferralCode,
  recentlyAddedCodes,
  setRecentlyAddedCodes,
  callAfterSuccess,
  initialReferralCode = "",
}: {
  handleCreateReferralCode: (code: string) => Promise<unknown>;
  recentlyAddedCodes: ReferralCodeStats[] | undefined;
  setRecentlyAddedCodes: (code: ReferralCodeStats[]) => void;
  callAfterSuccess?: () => void;
  initialReferralCode?: string;
}) {
  const { srcChainId } = useChainId();

  if (srcChainId !== undefined) {
    return (
      <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="referrals">
        <AffiliateCodeFormMultichain
          recentlyAddedCodes={recentlyAddedCodes}
          setRecentlyAddedCodes={setRecentlyAddedCodes}
          callAfterSuccess={callAfterSuccess}
          initialReferralCode={initialReferralCode}
        />
      </SyntheticsStateContextProvider>
    );
  }

  return (
    <AffiliateCodeForm
      handleCreateReferralCode={handleCreateReferralCode}
      recentlyAddedCodes={recentlyAddedCodes}
      setRecentlyAddedCodes={setRecentlyAddedCodes}
      callAfterSuccess={callAfterSuccess}
      initialReferralCode={initialReferralCode}
    />
  );
}

export default AddAffiliateCode;
