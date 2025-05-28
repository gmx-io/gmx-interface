import { t, Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Contract } from "ethers";
import { useEffect, useRef, useState } from "react";
import { encodeFunctionData, zeroAddress } from "viem";
import { usePublicClient } from "wagmi";

import { getMultichainTokenId } from "context/GmxAccountContext/config";
import { IStargateAbi } from "context/GmxAccountContext/stargatePools";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useCalcSelector, useSelector } from "context/SyntheticsStateContext/utils";
import { setTraderReferralCodeByUser, validateReferralCodeExists } from "domain/referrals/hooks";
import { getExpressContractAddress, MultichainRelayParamsPayload } from "domain/synthetics/express";
import { signSetTraderReferralCode } from "domain/synthetics/express/expressOrderUtils";
import { useChainId } from "lib/chains";
import { useDebounce } from "lib/debounce/useDebounce";
import { helperToast } from "lib/helperToast";
import { numberToBigint } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { sendWalletTransaction } from "lib/transactions";
import useWallet from "lib/wallets/useWallet";
import { encodeReferralCode } from "sdk/utils/referrals";
import type { IStargate } from "typechain-types-stargate";
import { SendParamStruct } from "typechain-types-stargate/interfaces/IStargate";

import Button from "components/Button/Button";
import { selectArbitraryRelayParamsAndPayload } from "components/Synthetics/GmxAccountModal/arbitraryRelayParams";
import { MultichainAction, MultichainActionType } from "components/Synthetics/GmxAccountModal/codecs/CodecUiHelper";
import { getSendParamsWithoutSlippage } from "components/Synthetics/GmxAccountModal/getSendParams";
import { estimateMultichainDepositNetworkComposeGas } from "components/Synthetics/GmxAccountModal/useMultichainDepositNetworkComposeGas";
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

  // const { composeGas } = useMultichainDepositNetworkComposeGas({
  //   enabled: srcChainId !== undefined,
  // });
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
        const sourceChainNativeTokenId = getMultichainTokenId(srcChainId, zeroAddress);
        const getRelayParamsAndPayload = calcSelector(selectArbitraryRelayParamsAndPayload);

        if (
          !sourceChainNativeTokenId ||
          provider === undefined ||
          globalExpressParams === undefined ||
          getRelayParamsAndPayload === undefined ||
          signer === undefined ||
          settlementChainPublicClient === undefined
        ) {
          console.log({
            sourceChainNativeTokenId,
            provider,
            globalExpressParams,
            getRelayParamsAndPayload,
            signer,
          });

          throw new Error("Missing required parameters");
        }

        const { fetchRelayParamsPayload } = getRelayParamsAndPayload({ relayerFeeAmount: 0n });

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

        // const expressParams = await estimateExpressParams({
        //   chainId,
        //   provider,
        //   transactionParams: {
        //     account,
        //     executionFeeAmount:
        //   },
        //   globalExpressParams,
        //   estimationMethod: "estimateGas",
        //   requireValidations: true,
        //   srcChainId,
        // });

        // getRawRelayerParams({
        //   chainId,
        //   externalCalls: EMPTY_EXTERNAL_CALLS,
        //   feeParams: {},
        // });
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
          depositViewTokenAddress: sourceChainNativeTokenId.address,
          settlementChainPublicClient,
        });

        const sendParamsWithRoughAmount: SendParamStruct = getSendParamsWithoutSlippage({
          dstChainId: chainId,
          account,
          srcChainId,
          inputAmount: numberToBigint(0.02, sourceChainNativeTokenId.decimals),
          composeGas,
          isDeposit: true,
          action,
        });

        const sourceChainStargateAddress = sourceChainNativeTokenId.stargate;
        const iStargateInstance = new Contract(
          sourceChainStargateAddress,
          IStargateAbi,
          signer
        ) as unknown as IStargate;
        const [limit, oftFeeDetails, receipt] = await iStargateInstance.quoteOFT(sendParamsWithRoughAmount);

        const minAmount = limit[0];

        const sendParamsWithMinimumAmount: SendParamStruct = {
          ...sendParamsWithRoughAmount,
          amountLD: minAmount,
          minAmountLD: minAmount,
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
          value: (quoteSend.nativeFee as bigint) + minAmount,
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
      // eslint-disable-next-line no-console
      console.error(error);
      if (error.name) {
        helperToast.error(error.message);
      }
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
