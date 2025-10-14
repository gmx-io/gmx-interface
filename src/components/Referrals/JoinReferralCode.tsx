import { t, Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Contract } from "ethers";
import { useEffect, useMemo, useRef, useState } from "react";
import { encodeFunctionData, zeroAddress } from "viem";
import { usePublicClient } from "wagmi";

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
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { SendParam } from "domain/multichain/types";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/useMultichainDepositNetworkComposeGas";
import { setTraderReferralCodeByUser, validateReferralCodeExists } from "domain/referrals/hooks";
import { getRawRelayerParams, RawRelayParamsPayload, RelayParamsPayload } from "domain/synthetics/express";
import { signSetTraderReferralCode } from "domain/synthetics/express/expressOrderUtils";
import { convertToUsd, getMidPrice } from "domain/tokens";
import { useChainId } from "lib/chains";
import { useDebounce } from "lib/debounce/useDebounce";
import { helperToast } from "lib/helperToast";
import { formatUsd, numberToBigint } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { sendWalletTransaction } from "lib/transactions";
import { useThrottledAsync } from "lib/useThrottledAsync";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";
import { encodeReferralCode } from "sdk/utils/referrals";
import { nowInSeconds } from "sdk/utils/time";
import type { IStargate } from "typechain-types-stargate";

import Button from "components/Button/Button";
import { useMultichainTokensRequest } from "components/GmxAccountModal/hooks";
import { toastCustomOrStargateError } from "components/GmxAccountModal/toastCustomOrStargateError";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";

import SpinnerIcon from "img/ic_spinner.svg?react";

import { REFERRAL_CODE_REGEX } from "./referralsHelper";

function JoinReferralCode({ active }: { active: boolean }) {
  const { openConnectModal } = useConnectModal();
  return (
    <div className="referral-card section-center">
      <h2 className="title text-h2">
        <Trans>Enter referral code</Trans>
      </h2>
      <p className="sub-title">
        <Trans>Please input a referral code to benefit from fee discounts.</Trans>
      </p>
      <div className="card-action">
        {active ? (
          <ReferralCodeEditFormContainer />
        ) : (
          <Button variant="primary-action" className="w-full" type="submit" onClick={openConnectModal}>
            <Trans>Connect Wallet</Trans>
          </Button>
        )}
      </div>
    </div>
  );
}

function ReferralCodeForm({
  callAfterSuccess = undefined,
  userReferralCodeString = "",
  type = "join",
}: {
  callAfterSuccess?: () => void;
  userReferralCodeString?: string;
  type?: string;
}) {
  const { chainId } = useChainId();
  const { account, signer } = useWallet();
  const [referralCode, setReferralCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralCodeExists, setReferralCodeExists] = useState(true);
  const { pendingTxns, setPendingTxns } = usePendingTxns();
  const debouncedReferralCode = useDebounce(referralCode, 300);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!account) {
      return;
    }

    const isEdit = type === "edit";
    setIsSubmitting(true);

    try {
      const tx = await setTraderReferralCodeByUser(chainId, referralCode, signer, {
        account,
        successMsg: isEdit ? t`Referral code updated.` : t`Referral code added.`,
        failMsg: isEdit ? t`Referral code updated failed.` : t`Adding referral code failed.`,
        setPendingTxns,
        pendingTxns,
      });
      if (callAfterSuccess) {
        callAfterSuccess();
      }
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        setReferralCode("");
      }
    } catch (error) {
      toastCustomOrStargateError(chainId, error);
    } finally {
      setIsSubmitting(false);
      setIsValidating(false);
    }
  }

  let buttonState: {
    text: string;
    disabled?: boolean;
    onSubmit?: (event: React.FormEvent) => void;
  } = {
    text: "",
  };
  const isEdit = type === "edit";

  if (isEdit && debouncedReferralCode === userReferralCodeString) {
    buttonState = {
      text: t`Same as current active code`,
      disabled: true,
    };
  } else if (isEdit && isSubmitting) {
    buttonState = {
      text: t`Updating`,
      disabled: true,
    };
  } else if (isSubmitting) {
    buttonState = {
      text: t`Adding`,
      disabled: true,
    };
  } else if (debouncedReferralCode === "") {
    buttonState = {
      text: t`Enter referral code`,
      disabled: true,
    };
  } else if (isValidating) {
    buttonState = {
      text: t`Checking code`,
      disabled: true,
    };
  } else if (!referralCodeExists) {
    buttonState = {
      text: t`Referral code does not exist`,
      disabled: true,
    };
  } else if (isEdit) {
    buttonState = {
      text: t`Update`,
      disabled: false,
      onSubmit: handleSubmit,
    };
  } else {
    buttonState = {
      text: t`Submit`,
      disabled: false,
      onSubmit: handleSubmit,
    };
  }

  useEffect(() => {
    let cancelled = false;
    async function checkReferralCode() {
      if (debouncedReferralCode === "" || !REFERRAL_CODE_REGEX.test(debouncedReferralCode)) {
        setIsValidating(false);
        setReferralCodeExists(false);
        return;
      }

      setIsValidating(true);
      const codeExists = await validateReferralCodeExists(debouncedReferralCode, chainId);
      if (!cancelled) {
        setReferralCodeExists(codeExists);
        setIsValidating(false);
      }
    }
    checkReferralCode();
    return () => {
      cancelled = true;
    };
  }, [debouncedReferralCode, chainId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form onSubmit={buttonState.onSubmit} className="flex flex-col gap-15">
      <input
        ref={inputRef}
        disabled={isSubmitting}
        type="text"
        placeholder={t`Enter referral code`}
        className="text-input"
        value={referralCode}
        onChange={({ target }) => {
          const { value } = target;
          setReferralCode(value);
        }}
      />

      <Button
        variant="primary-action"
        type="submit"
        className="App-cta Exchange-swap-button"
        disabled={buttonState.disabled}
      >
        {buttonState.text}
      </Button>
    </form>
  );
}

function ReferralCodeFormMultichain({
  userReferralCodeString = "",
  type = "join",
  callAfterSuccess,
}: {
  callAfterSuccess?: () => void;
  userReferralCodeString?: string;
  type?: string;
}) {
  const { chainId, srcChainId } = useChainId();
  const { account, signer } = useWallet();
  const { provider } = useJsonRpcProvider(chainId);
  const [referralCode, setReferralCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralCodeExists, setReferralCodeExists] = useState(true);
  const debouncedReferralCode = useDebounce(referralCode, 300);
  const settlementChainPublicClient = usePublicClient({ chainId });
  const { tokenChainDataArray: multichainTokens } = useMultichainTokensRequest(chainId, account);

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
        marketsInfoData: p.globalExpressParams.marketsInfoData,
      }) as RawRelayParamsPayload;

      const relayParams: RelayParamsPayload = {
        ...rawRelayParamsPayload,
        deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
      };

      const signature = await signSetTraderReferralCode({
        chainId: p.chainId,
        srcChainId: p.srcChainId,
        signer: p.simulationSigner,
        relayParams,
        referralCode: p.referralCodeHex,
        shouldUseSignerMethod: true,
      });

      const action: MultichainAction = {
        actionType: MultichainActionType.SetTraderReferralCode,
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
        // TODO MLTCH take into account LD
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!account || srcChainId === undefined) {
      return;
    }

    setIsSubmitting(true);

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
        marketsInfoData: globalExpressParams.marketsInfoData,
      });

      const relayParamsPayload: RelayParamsPayload = {
        ...rawRelayParamsPayload,
        deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
      };

      const signature = await signSetTraderReferralCode({
        chainId,
        srcChainId,
        signer,
        relayParams: relayParamsPayload,
        referralCode: referralCodeHex,
      });

      const action: MultichainAction = {
        actionType: MultichainActionType.SetTraderReferralCode,
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
        msg: t`Sent referral code transaction`,
      });

      const receipt = await txnResult.wait();

      if (callAfterSuccess) {
        callAfterSuccess();
      }

      if (receipt.status === "success") {
        setReferralCode("");
      }

      helperToast.success(
        <>
          <Trans>Referral code added!</Trans>
          <br />
          <br />
          <Trans>It will take a couple of minutes to be reflected. Please check back later.</Trans>
        </>
      );
    } catch (error) {
      toastCustomOrStargateError(chainId, error);
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
  const isEdit = type === "edit";

  if (isEdit && debouncedReferralCode === userReferralCodeString) {
    buttonState = {
      text: t`Same as current active code`,
      disabled: true,
    };
  } else if (isEdit && isSubmitting) {
    buttonState = {
      text: t`Updating`,
      disabled: true,
    };
  } else if (isSubmitting) {
    buttonState = {
      text: t`Adding`,
      disabled: true,
    };
  } else if (debouncedReferralCode === "") {
    buttonState = {
      text: t`Enter referral code`,
      disabled: true,
    };
  } else if (isValidating) {
    buttonState = {
      text: t`Checking code`,
      disabled: true,
    };
  } else if (!referralCodeExists) {
    buttonState = {
      text: t`Referral code does not exist`,
      disabled: true,
    };
  } else if (result.isLoading || !result.data) {
    buttonState = {
      text: (
        <>
          <Trans>Loading</Trans>
          <SpinnerIcon className="ml-4 animate-spin" />
        </>
      ),
      disabled: true,
    };
  } else if (isEdit) {
    buttonState = {
      text: t`Update`,
      disabled: false,
      onSubmit: handleSubmit,
    };
  } else {
    buttonState = {
      text: t`Submit`,
      disabled: false,
      onSubmit: handleSubmit,
    };
  }

  useEffect(() => {
    let cancelled = false;
    async function checkReferralCode() {
      if (debouncedReferralCode === "" || !REFERRAL_CODE_REGEX.test(debouncedReferralCode)) {
        setIsValidating(false);
        setReferralCodeExists(false);
        return;
      }

      setIsValidating(true);
      const codeExists = await validateReferralCodeExists(debouncedReferralCode, chainId);
      if (!cancelled) {
        setReferralCodeExists(codeExists);
        setIsValidating(false);
      }
    }
    checkReferralCode();
    return () => {
      cancelled = true;
    };
  }, [debouncedReferralCode, chainId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form onSubmit={buttonState.onSubmit} className="flex flex-col gap-15">
      <input
        ref={inputRef}
        disabled={isSubmitting}
        type="text"
        placeholder={t`Enter referral code`}
        className="text-input"
        value={referralCode}
        onChange={({ target }) => {
          const { value } = target;
          setReferralCode(value);
        }}
      />
      {srcChainId && (
        <SyntheticsInfoRow label="Network Fee" value={networkFeeUsd !== undefined ? formatUsd(networkFeeUsd) : "..."} />
      )}

      <Button variant="primary-action" type="submit" disabled={buttonState.disabled}>
        {buttonState.text}
      </Button>
    </form>
  );
}

export function ReferralCodeEditFormContainer({
  callAfterSuccess = undefined,
  userReferralCodeString = "",
  type = "join",
}: {
  callAfterSuccess?: () => void;
  userReferralCodeString?: string;
  type?: string;
}) {
  const { srcChainId } = useChainId();

  if (srcChainId === undefined) {
    return (
      <ReferralCodeForm
        callAfterSuccess={callAfterSuccess}
        userReferralCodeString={userReferralCodeString}
        type={type}
      />
    );
  }

  return (
    <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType={"referrals"}>
      <ReferralCodeFormMultichain
        callAfterSuccess={callAfterSuccess}
        userReferralCodeString={userReferralCodeString}
        type={type}
      />
    </SyntheticsStateContextProvider>
  );
}

export default JoinReferralCode;
