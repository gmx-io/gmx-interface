import { Trans, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import { Contract, type TransactionResponse } from "ethers";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { encodeFunctionData, zeroAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";

import {
  CHAIN_ID_PREFERRED_DEPOSIT_TOKEN,
  FAKE_INPUT_AMOUNT_MAP,
  getMappedTokenId,
  isSettlementChain,
  IStargateAbi,
  RANDOM_WALLET,
} from "config/multichain";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { type MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/estimateMultichainDepositNetworkComposeGas";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { toastCustomOrStargateError } from "domain/multichain/toastCustomOrStargateError";
import { SendParam } from "domain/multichain/types";
import { registerReferralCode } from "domain/referrals";
import { getRawRelayerParams, RawRelayParamsPayload, RelayParamsPayload } from "domain/synthetics/express";
import { signRegisterCode } from "domain/synthetics/express/expressOrderUtils";
import { getNeedTokenApprove, useTokensAllowanceData } from "domain/synthetics/tokens";
import { approveTokens, convertToUsd, getMidPrice } from "domain/tokens";
import { useChainId } from "lib/chains";
import { useDebounce } from "lib/debounce/useDebounce";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import { formatUsd, numberToBigint } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { sendWalletTransaction } from "lib/transactions";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { useThrottledAsync } from "lib/useThrottledAsync";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";
import { encodeReferralCode } from "sdk/utils/referrals";
import { nowInSeconds } from "sdk/utils/time";
import type { IStargate } from "typechain-types-stargate";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { useMultichainTradeTokensRequest } from "components/GmxAccountModal/hooks";
import { getCodeError, getReferralCodeTakenStatus, REFERRAL_CODE_REGEX } from "components/Referrals/referralsHelper";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import SpinnerIcon from "img/ic_spinner.svg?react";
import ReferralsIcon from "img/referrals.svg?react";

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
      setError("Referral code creation failed.");
      metrics.pushError(err, "createReferralCode");
    } finally {
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    setIsAlreadyTaken(false);
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
  } else if (isAlreadyTaken) {
    buttonState = {
      text: t`Code already taken`,
      disabled: true,
    };
  }

  return (
    <CreateReferralCodeLayout
      referralCode={referralCode}
      setReferralCode={setReferralCode}
      error={error}
      isAlreadyTaken={isAlreadyTaken}
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
  const { provider } = useJsonRpcProvider(chainId);
  const { openConnectModal } = useConnectModal();
  const { isConnected } = useAccount();
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState<string | null>(null);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!account || srcChainId === undefined) {
      return;
    }

    setIsSubmitting(true);

    const trimmedCode = referralCode.trim();
    const { takenStatus } = await getReferralCodeTakenStatus(account, trimmedCode, chainId);

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
        setReferralCode("");
        onSuccess(trimmedCode);
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
      metrics.pushError(err, "createReferralCodeMultichain");
    } finally {
      setIsSubmitting(false);
      setIsValidating(false);
    }
  }

  let buttonState: {
    text: React.ReactNode;
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
  } else if (hasOutdatedUi) {
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
  } else if (!debouncedReferralCode) {
    buttonState = {
      text: t`Enter a code`,
      disabled: true,
    };
  } else if (error) {
    buttonState = {
      text: t`Create code`,
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
          <SpinnerIcon className="ml-4 inline-block size-14 animate-spin" />
        </>
      ),
      disabled: true,
    };
  } else if (needsApproval) {
    buttonState = {
      text: t`Approve ${sourceChainTokenId?.symbol}`,
      disabled: false,
      onSubmit: (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        handleApprove();
      },
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
    setError(getCodeError(referralCode));
  }, [referralCode]);

  return (
    <CreateReferralCodeLayout
      referralCode={referralCode}
      setReferralCode={setReferralCode}
      error={error}
      isAlreadyTaken={referralCodeCheckStatus === "taken"}
      isProcessing={isSubmitting}
      isConnected={isConnected}
      buttonState={buttonState}
      inputRef={inputRef}
      networkFeeUsd={networkFeeUsd}
    />
  );
}

/**
 * Shared layout component
 */
function CreateReferralCodeLayout({
  referralCode,
  setReferralCode,
  error,
  isAlreadyTaken,
  isProcessing,
  isConnected,
  buttonState,
  inputRef,
  networkFeeUsd,
}: {
  referralCode: string;
  setReferralCode: (code: string) => void;
  error: string | null;
  isAlreadyTaken: boolean;
  isProcessing: boolean;
  isConnected: boolean;
  buttonState: {
    text: React.ReactNode;
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
      <form onSubmit={buttonState.onSubmit} className="flex flex-col gap-8">
        <div className="flex gap-8">
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
              {error ? <TooltipWithPortal handle={buttonState.text} content={error} /> : buttonState.text}
            </Button>
          </div>
        </div>
        {networkFeeUsd !== undefined && (
          <div className="flex justify-between text-12 text-typography-secondary">
            <span>
              <Trans>Network Fee</Trans>
            </span>
            <span>{formatUsd(networkFeeUsd)}</span>
          </div>
        )}
      </form>
    </div>
  );
}

export default CreateReferralCode;
