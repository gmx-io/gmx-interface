import { Trans, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import { Contract, type TransactionResponse } from "ethers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { encodeFunctionData, zeroAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";

import type { ReferralCodeStats } from "domain/referrals/types";
import { useChainId } from "lib/chains";
import { useDebounce } from "lib/debounce/useDebounce";
import { helperToast } from "lib/helperToast";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";

import Button from "components/Button/Button";
import { useMultichainTradeTokensRequest } from "components/GmxAccountModal/hooks";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";

import {
  CHAIN_ID_PREFERRED_DEPOSIT_TOKEN,
  FAKE_INPUT_AMOUNT_MAP,
  getMappedTokenId,
  isSettlementChain,
  IStargateAbi,
  RANDOM_WALLET,
} from "config/multichain";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { type MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/estimateMultichainDepositNetworkComposeGas";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { toastCustomOrStargateError } from "domain/multichain/toastCustomOrStargateError";
import { SendParam } from "domain/multichain/types";
import { getRawRelayerParams, RawRelayParamsPayload, RelayParamsPayload } from "domain/synthetics/express";
import { signRegisterCode } from "domain/synthetics/express/expressOrderUtils";
import { getNeedTokenApprove, useTokensAllowanceData } from "domain/synthetics/tokens";
import { approveTokens, convertToUsd, getMidPrice } from "domain/tokens";
import { formatUsd, numberToBigint } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { sendWalletTransaction } from "lib/transactions";
import { useThrottledAsync } from "lib/useThrottledAsync";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";
import { encodeReferralCode } from "sdk/utils/referrals";
import { nowInSeconds } from "sdk/utils/time";
import type { IStargate } from "typechain-types-stargate";

import SpinnerIcon from "img/ic_spinner.svg?react";

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

  const { srcChainId } = useChainId();
  const isMultichain = srcChainId !== undefined;

  const renderForm = () => {
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
  };

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
          renderForm()
        ) : (
          <Button variant="primary-action" className="w-full" onClick={openConnectModal}>
            <Trans>Connect Wallet</Trans>
          </Button>
        )}
      </div>
    </div>
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
  const { provider } = useJsonRpcProvider(chainId);
  const [referralCode, setReferralCode] = useState(initialReferralCode?.trim() ?? "");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [referralCodeCheckStatus, setReferralCodeCheckStatus] = useState<"ok" | "taken" | "checking">("ok");
  const debouncedReferralCode = useDebounce(referralCode, 300);
  const settlementChainPublicClient = usePublicClient({ chainId });
  const { tokenChainDataArray: multichainTokens } = useMultichainTradeTokensRequest(chainId, account);
  const hasOutdatedUi = useHasOutdatedUi();

  const simulationSigner = useMemo(() => {
    if (!signer?.provider) {
      return;
    }

    return RANDOM_WALLET.connect(signer?.provider);
  }, [signer?.provider]);

  const globalExpressParams = useSelector(selectExpressGlobalParams);

  const referralCodeHex = useMemo(() => encodeReferralCode(referralCode), [referralCode]);

  const depositTokenAddress = useMemo(() => {
    const tokens = multichainTokens.filter(
      (token) =>
        token.sourceChainId === srcChainId && token.sourceChainBalance !== undefined && token.sourceChainBalance > 0n
    );

    if (tokens.length === 0) {
      return;
    }

    const preferredToken = tokens.find((token) => token.address === CHAIN_ID_PREFERRED_DEPOSIT_TOKEN[chainId]);

    if (preferredToken) {
      return preferredToken.address;
    }

    return tokens[0].address;
  }, [chainId, multichainTokens, srcChainId]);

  const sourceChainTokenId = useMemo(() => {
    if (depositTokenAddress === undefined || srcChainId === undefined || !isSettlementChain(chainId)) {
      return;
    }

    return getMappedTokenId(chainId, depositTokenAddress, srcChainId);
  }, [chainId, depositTokenAddress, srcChainId]);

  const result = useThrottledAsync(
    async ({ params: p }) => {
      if (p.sourceChainTokenId === undefined) {
        throw new Error("sourceChainTokenId is undefined");
      }

      const rawRelayParamsPayload = getRawRelayerParams({
        chainId: p.chainId,
        gasPaymentTokenAddress: p.globalExpressParams.gasPaymentTokenAddress,
        relayerFeeTokenAddress: p.globalExpressParams.relayerFeeTokenAddress,
        feeParams: {
          feeToken: p.globalExpressParams.relayerFeeTokenAddress,
          feeAmount: 0n,
          feeSwapPath: [],
        },
        externalCalls: getEmptyExternalCallsPayload(),
        tokenPermits: [],
      }) as RawRelayParamsPayload;

      const relayParams: RelayParamsPayload = {
        ...rawRelayParamsPayload,
        deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
      };

      const signature = await signRegisterCode({
        chainId: p.chainId,
        srcChainId: p.srcChainId,
        signer: p.simulationSigner,
        relayParams,
        referralCode: p.referralCodeHex,
        shouldUseSignerMethod: true,
      });

      const action: MultichainAction = {
        actionType: MultichainActionType.RegisterCode,
        actionData: {
          relayParams,
          signature,
          referralCode: p.referralCodeHex,
        },
      };

      const composeGas = await estimateMultichainDepositNetworkComposeGas({
        action,
        chainId: p.chainId,
        account: p.simulationSigner.address,
        srcChainId: p.srcChainId,
        tokenAddress: p.depositTokenAddress,
        settlementChainPublicClient: p.settlementChainPublicClient,
      });

      const sourceChainStargateAddress = p.sourceChainTokenId.stargate;

      const iStargateInstance = new Contract(sourceChainStargateAddress, IStargateAbi, signer) as unknown as IStargate;

      const tokenAmount =
        FAKE_INPUT_AMOUNT_MAP[p.sourceChainTokenId.symbol] ?? numberToBigint(0.02, p.sourceChainTokenId.decimals);

      const sendParamsWithRoughAmount = getMultichainTransferSendParams({
        isToGmx: true,
        dstChainId: p.chainId,
        account: p.simulationSigner.address,
        amountLD: tokenAmount,
        srcChainId: p.srcChainId,
        composeGas,
        action,
      });

      const [limit, oftFeeDetails] = await iStargateInstance.quoteOFT(sendParamsWithRoughAmount);

      let negativeFee = 0n;
      for (const oftFeeDetail of oftFeeDetails) {
        negativeFee += oftFeeDetail[0];
      }

      const minAmount = limit.minAmountLD === 0n ? 1n : limit.minAmountLD;

      let amountBeforeFee = minAmount - negativeFee;
      amountBeforeFee = (amountBeforeFee * 15n) / 10n;

      const sendParamsWithMinimumAmount: SendParam = {
        ...sendParamsWithRoughAmount,
        amountLD: amountBeforeFee,
        minAmountLD: 0n,
      };

      const quoteSend = await iStargateInstance.quoteSend(sendParamsWithMinimumAmount, false);

      return {
        nativeFee: quoteSend.nativeFee,
        amount: amountBeforeFee,
        composeGas,
      };
    },
    {
      throttleMs: 1000,
      params:
        provider !== undefined &&
        srcChainId !== undefined &&
        settlementChainPublicClient !== undefined &&
        globalExpressParams !== undefined &&
        simulationSigner !== undefined &&
        referralCodeHex !== undefined &&
        account !== undefined &&
        sourceChainTokenId !== undefined &&
        depositTokenAddress !== undefined
          ? {
              provider,
              chainId,
              srcChainId,
              settlementChainPublicClient,
              globalExpressParams,
              simulationSigner,
              referralCodeHex,
              account,
              sourceChainTokenId,
              depositTokenAddress,
            }
          : undefined,
    }
  );

  const networkFeeUsd = useMemo(() => {
    if (result.data === undefined || globalExpressParams?.tokensData[zeroAddress].prices === undefined) {
      return;
    }

    return convertToUsd(result.data.nativeFee, 18, getMidPrice(globalExpressParams?.tokensData[zeroAddress].prices));
  }, [globalExpressParams?.tokensData, result.data]);

  const stargateSpenderAddress = sourceChainTokenId?.stargate;
  const sourceChainTokenAddress = sourceChainTokenId?.address;
  const amountToApprove = result.data?.amount;

  const { tokensAllowanceData, isLoaded: isAllowanceLoaded } = useTokensAllowanceData(srcChainId, {
    spenderAddress: stargateSpenderAddress,
    tokenAddresses: sourceChainTokenAddress ? [sourceChainTokenAddress] : [],
    skip: srcChainId === undefined || sourceChainTokenAddress === undefined || sourceChainTokenAddress === zeroAddress,
  });

  const needsApproval = useMemo(() => {
    if (sourceChainTokenAddress === zeroAddress) {
      return false;
    }
    return getNeedTokenApprove(tokensAllowanceData, sourceChainTokenAddress, amountToApprove, EMPTY_ARRAY);
  }, [tokensAllowanceData, sourceChainTokenAddress, amountToApprove]);

  const handleApprove = useCallback(async () => {
    if (!sourceChainTokenAddress || !stargateSpenderAddress || !srcChainId || !signer) {
      return;
    }

    await approveTokens({
      setIsApproving,
      signer,
      tokenAddress: sourceChainTokenAddress,
      spender: stargateSpenderAddress,
      chainId: srcChainId,
      permitParams: undefined,
      approveAmount: undefined,
    });
  }, [sourceChainTokenAddress, stargateSpenderAddress, srcChainId, signer]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!account || srcChainId === undefined) {
      return;
    }

    setIsSubmitting(true);

    const trimmedCode = referralCode.trim();
    const { takenStatus, info: takenInfo } = await getReferralCodeTakenStatus(account, trimmedCode, chainId);

    if (takenStatus === "all" || takenStatus === "current") {
      setReferralCodeCheckStatus("taken");
      setIsSubmitting(false);
      return;
    }

    try {
      if (
        sourceChainTokenId === undefined ||
        provider === undefined ||
        globalExpressParams === undefined ||
        signer === undefined ||
        result.data === undefined
      ) {
        throw new Error("Missing required parameters");
      }

      const rawRelayParamsPayload = getRawRelayerParams({
        chainId: chainId,
        gasPaymentTokenAddress: globalExpressParams.gasPaymentTokenAddress,
        relayerFeeTokenAddress: globalExpressParams.relayerFeeTokenAddress,
        feeParams: {
          feeToken: globalExpressParams.relayerFeeTokenAddress,
          feeAmount: 0n,
          feeSwapPath: [],
        },
        externalCalls: getEmptyExternalCallsPayload(),
        tokenPermits: [],
      });

      const relayParamsPayload: RelayParamsPayload = {
        ...rawRelayParamsPayload,
        deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
      };

      const signature = await signRegisterCode({
        chainId,
        srcChainId,
        signer,
        relayParams: relayParamsPayload,
        referralCode: referralCodeHex,
      });

      const action: MultichainAction = {
        actionType: MultichainActionType.RegisterCode,
        actionData: {
          relayParams: relayParamsPayload,
          signature,
          referralCode: referralCodeHex,
        },
      };

      const sendParams: SendParam = getMultichainTransferSendParams({
        dstChainId: chainId,
        account,
        srcChainId,
        amountLD: result.data.amount,
        composeGas: result.data.composeGas,
        isToGmx: true,
        action,
      });

      const sourceChainStargateAddress = sourceChainTokenId.stargate;

      const value =
        sourceChainTokenId.address === zeroAddress ? result.data.nativeFee + result.data.amount : result.data.nativeFee;

      const txnResult = await sendWalletTransaction({
        chainId: srcChainId,
        to: sourceChainStargateAddress,
        signer: signer,
        callData: encodeFunctionData({
          abi: IStargateAbi,
          functionName: "sendToken",
          args: [sendParams, { nativeFee: result.data.nativeFee, lzTokenFee: 0n }, account],
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
      }

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
    } catch (err) {
      toastCustomOrStargateError(chainId, err);
    } finally {
      setIsSubmitting(false);
      setIsValidating(false);
    }
  }

  let buttonState: {
    text: React.ReactNode;
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
  } else if (result.isLoading || !result.data || !isAllowanceLoaded) {
    buttonState = {
      text: (
        <>
          <Trans>Loading...</Trans>
          <SpinnerIcon className="ml-4 animate-spin" />
        </>
      ),
      disabled: true,
    };
  } else if (needsApproval) {
    buttonState = {
      text: t`Approve ${sourceChainTokenId?.symbol}`,
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
        return;
      }

      setIsValidating(true);
      setReferralCodeCheckStatus("checking");
      const { takenStatus } = await getReferralCodeTakenStatus(account, debouncedReferralCode, chainId);
      if (!cancelled) {
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
    <form onSubmit={buttonState.onSubmit} className="flex flex-col gap-15">
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
        <SyntheticsInfoRow label="Network Fee" value={networkFeeUsd !== undefined ? formatUsd(networkFeeUsd) : "..."} />
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
  const debouncedReferralCode = useDebounce(referralCode, 300);
  const { chainId, srcChainId } = useChainId();
  const { address: account, isConnected } = useAccount();
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
      if (error) {
        setReferralCodeCheckStatus("ok");
        return;
      }
      const { takenStatus: takenStatus } = await getReferralCodeTakenStatus(account, debouncedReferralCode, chainId);
      // ignore the result if the referral code to check has changed
      if (cancelled) {
        return;
      }
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
    const { takenStatus, info: takenInfo } = await getReferralCodeTakenStatus(account, trimmedCode, chainId);
    if (["all", "current", "other"].includes(takenStatus)) {
      setIsProcessing(false);
    }

    if (takenStatus === "none" || takenStatus === "other") {
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
    <form onSubmit={buttonState.onSubmit}>
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
