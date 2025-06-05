import { t, Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import type { IStargateAbi } from "domain/multichain/stargatePools";
import { Contract } from "ethers";
import { useEffect, useRef, useState } from "react";
import { encodeFunctionData } from "viem";
import { usePublicClient } from "wagmi";

import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useCalcSelector, useSelector } from "context/SyntheticsStateContext/utils";
import { selectArbitraryRelayParamsAndPayload } from "domain/multichain/arbitraryRelayParams";
import { type MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { TOKEN_GROUPS } from "domain/multichain/config";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/useMultichainDepositNetworkComposeGas";
import { setTraderReferralCodeByUser, validateReferralCodeExists } from "domain/referrals/hooks";
import { getExpressContractAddress, MultichainRelayParamsPayload } from "domain/synthetics/express";
import { signSetTraderReferralCode } from "domain/synthetics/express/expressOrderUtils";
import { useChainId } from "lib/chains";
import { useDebounce } from "lib/debounce/useDebounce";
import { numberToBigint } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { sendWalletTransaction } from "lib/transactions";
import useWallet from "lib/wallets/useWallet";
import { encodeReferralCode } from "sdk/utils/referrals";
import type { IStargate } from "typechain-types-stargate";
import type { SendParamStruct } from "typechain-types-stargate/interfaces/IStargate";

import Button from "components/Button/Button";
import { toastCustomOrStargateError } from "components/Synthetics/GmxAccountModal/toastCustomOrStargateError";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";

import { REFERRAL_CODE_REGEX } from "./referralsHelper";

function JoinReferralCode({ active }: { active: boolean }) {
  const { openConnectModal } = useConnectModal();
  return (
    <div className="referral-card section-center mt-medium">
      <h2 className="title text-h2">
        <Trans>Enter Referral Code</Trans>
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
  const { chainId, srcChainId } = useChainId();
  const { account, signer } = useWallet();
  const { provider } = useJsonRpcProvider(chainId);
  const [referralCode, setReferralCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralCodeExists, setReferralCodeExists] = useState(true);
  const { pendingTxns, setPendingTxns } = usePendingTxns();
  const debouncedReferralCode = useDebounce(referralCode, 300);
  const settlementChainPublicClient = usePublicClient({ chainId });

  function getPrimaryText() {
    const isEdit = type === "edit";
    if (isEdit && debouncedReferralCode === userReferralCodeString) {
      return t`Same as current active code`;
    }
    if (isEdit && isSubmitting) {
      return t`Updating...`;
    }

    if (isSubmitting) {
      return t`Adding...`;
    }
    if (debouncedReferralCode === "") {
      return t`Enter Referral Code`;
    }
    if (isValidating) {
      return t`Checking code...`;
    }
    if (!referralCodeExists) {
      return t`Referral Code does not exist`;
    }

    return isEdit ? t`Update` : t`Submit`;
  }
  function isPrimaryEnabled() {
    if (
      debouncedReferralCode === "" ||
      isSubmitting ||
      isValidating ||
      !referralCodeExists ||
      debouncedReferralCode === userReferralCodeString
    ) {
      return false;
    }
    return true;
  }

  const globalExpressParams = useSelector(selectExpressGlobalParams);

  const calcSelector = useCalcSelector();

  async function handleSubmit(event) {
    event.preventDefault();

    if (!account) {
      return;
    }

    const isEdit = type === "edit";
    setIsSubmitting(true);

    try {
      if (srcChainId) {
        const sourceChainTokenId = TOKEN_GROUPS["USDC.SG"]?.[srcChainId]; //getMultichainTokenId(srcChainId, zeroAddress);
        const settlementChainTokenId = TOKEN_GROUPS["USDC.SG"]?.[chainId];
        const getRelayParamsAndPayload = calcSelector(selectArbitraryRelayParamsAndPayload);

        if (
          sourceChainTokenId === undefined ||
          settlementChainTokenId === undefined ||
          provider === undefined ||
          globalExpressParams === undefined ||
          getRelayParamsAndPayload === undefined ||
          signer === undefined ||
          settlementChainPublicClient === undefined
        ) {
          throw new Error("Missing required parameters");
        }

        const tokenAmount = numberToBigint(0.02, sourceChainTokenId.decimals);
        const nativeAmount = numberToBigint(0.02, 18);

        const { fetchRelayParamsPayload } = getRelayParamsAndPayload({
          relayerFeeAmount: 0n,
          additionalNetworkFee: nativeAmount,
        });

        if (fetchRelayParamsPayload === undefined) {
          throw new Error("No fetchRelayParamsPayload");
        }

        const relayParamsPayload = await fetchRelayParamsPayload(
          provider,
          getExpressContractAddress(chainId, {
            isMultichain: true,
            isSubaccount: false,
            scope: "order",
          })
        );

        const referralCodeHex = encodeReferralCode(referralCode);

        const signature = await signSetTraderReferralCode({
          chainId,
          srcChainId,
          signer,
          relayParams: relayParamsPayload as MultichainRelayParamsPayload,
          referralCode: referralCodeHex,
        });

        const action: MultichainAction = {
          actionType: MultichainActionType.SetTraderReferralCode,
          actionData: {
            relayParams: relayParamsPayload as MultichainRelayParamsPayload,
            signature,
            referralCode: referralCodeHex,
          },
        };

        const composeGas = await estimateMultichainDepositNetworkComposeGas({
          action,
          chainId,
          account,
          srcChainId,
          tokenAddress: settlementChainTokenId.address,
          settlementChainPublicClient,
        });

        const sendParamsWithRoughAmount: SendParamStruct = getMultichainTransferSendParams({
          dstChainId: chainId,
          account,
          srcChainId,
          inputAmount: tokenAmount,
          composeGas,
          isDeposit: true,
          action,
        });

        const sourceChainStargateAddress = sourceChainTokenId.stargate;
        const iStargateInstance = new Contract(
          sourceChainStargateAddress,
          IStargateAbi,
          signer
        ) as unknown as IStargate;
        const [limit, oftFeeDetails] = await iStargateInstance.quoteOFT(sendParamsWithRoughAmount);

        let fee = 0n;
        for (const oftFeeDetail of oftFeeDetails) {
          fee += oftFeeDetail[0];
        }

        const minAmount = limit.minAmountLD === 0n ? 1n : limit.minAmountLD;

        const amount = minAmount * 1000n - fee;

        const sendParamsWithMinimumAmount: SendParamStruct = {
          ...sendParamsWithRoughAmount,
          amountLD: amount,
          minAmountLD: 0,
        };

        const quoteSend = await iStargateInstance.quoteSend(sendParamsWithMinimumAmount, false);

        await sendWalletTransaction({
          chainId: srcChainId,
          to: sourceChainStargateAddress,
          signer: signer!,
          callData: encodeFunctionData({
            abi: IStargateAbi,
            functionName: "sendToken",
            args: [
              sendParamsWithMinimumAmount,
              { nativeFee: quoteSend.nativeFee, lzTokenFee: quoteSend.lzTokenFee },
              account,
            ],
          }),
          value: quoteSend.nativeFee as bigint,
          msg: "Sent",
        });
      } else {
        const tx = await setTraderReferralCodeByUser(chainId, referralCode, signer, {
          account,
          successMsg: isEdit ? t`Referral code updated!` : t`Referral code added!`,
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
      }
    } catch (error) {
      toastCustomOrStargateError(chainId, error);
    } finally {
      setIsSubmitting(false);
      setIsValidating(false);
    }
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
    <form onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        disabled={isSubmitting}
        type="text"
        placeholder="Enter referral code"
        className="text-input mb-15"
        value={referralCode}
        onChange={({ target }) => {
          const { value } = target;
          setReferralCode(value);
        }}
      />
      {srcChainId && <SyntheticsInfoRow label="Network Fee" value={"$0.34"} />}

      <Button
        variant="primary-action"
        type="submit"
        className="App-cta Exchange-swap-button"
        disabled={!isPrimaryEnabled()}
      >
        {getPrimaryText()}
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
  return (
    <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType={"referrals"}>
      <ReferralCodeForm
        callAfterSuccess={callAfterSuccess}
        userReferralCodeString={userReferralCodeString}
        type={type}
      />
    </SyntheticsStateContextProvider>
  );
}

export default JoinReferralCode;
