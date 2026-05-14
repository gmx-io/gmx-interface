import { Trans, t } from "@lingui/macro";
import { Signer, ethers } from "ethers";
import { Link } from "react-router-dom";
import { maxUint256 } from "viem";

import { getChainName, getExplorerUrl } from "config/chains";
import { JUMPER_BRIDGE_URL } from "config/links";
import { AddTokenPermitFn } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import { INVALID_PERMIT_SIGNATURE_ERROR } from "lib/errors/customErrors";
import { estimateGasLimit } from "lib/gas/estimateGasLimit";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import { getProvider } from "lib/rpc";
import TokenAbi from "sdk/abis/Token";
import { getNativeToken, getToken } from "sdk/configs/tokens";
import { InfoTokens, Token, TokenInfo } from "sdk/utils/tokens/types";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";

type Params = {
  setIsApproving: (val: boolean) => void;
  signer: Signer | undefined;
  tokenAddress: string;
  spender: string;
  chainId: number;
  permitParams:
    | {
        addTokenPermit: AddTokenPermitFn;
        setIsPermitsDisabled: (disabled: boolean) => void;
        isPermitsDisabled: boolean;
      }
    | undefined;
  onApproveSubmitted?: ({ isPermit }: { isPermit: boolean }) => void;
  onApproveFail?: (error: Error, { isPermit }: { isPermit: boolean }) => void;
  getTokenInfo?: (infoTokens: InfoTokens, tokenAddress: string) => TokenInfo;
  infoTokens?: InfoTokens;
  pendingTxns?: any[];
  setPendingTxns?: (txns: any[]) => void;
  includeMessage?: boolean;
  approveAmount: bigint | undefined;
};

type PermitFallbackReason = "unsupported" | "disabled" | "permitsDisabled" | "failed" | "invalidSignature";

export async function approveTokens({
  setIsApproving,
  signer,
  tokenAddress,
  spender,
  chainId,
  onApproveSubmitted,
  onApproveFail,
  getTokenInfo,
  infoTokens,
  pendingTxns,
  setPendingTxns,
  includeMessage,
  approveAmount,
  permitParams,
}: Params): Promise<void> {
  setIsApproving(true);

  if (approveAmount === undefined) {
    approveAmount = maxUint256;
  }

  let token: Token | undefined;
  let permitFallbackReason: PermitFallbackReason | undefined;

  try {
    token = getToken(chainId, tokenAddress);

    if (!token.isPermitSupported) {
      permitFallbackReason = "unsupported";
    } else if (token.isPermitDisabled) {
      permitFallbackReason = "disabled";
    }
  } catch (e) {
    // ...ignore in case of glv / gm approval
  }

  if (permitParams?.isPermitsDisabled && token?.isPermitSupported && !permitFallbackReason) {
    permitFallbackReason = "permitsDisabled";
  }

  const addTokenPermit = permitParams?.addTokenPermit;
  const shouldUsePermit = Boolean(
    addTokenPermit && token?.isPermitSupported && !token.isPermitDisabled && !permitParams?.isPermitsDisabled
  );

  if (shouldUsePermit && addTokenPermit && permitParams) {
    try {
      await addTokenPermit(tokenAddress, spender, approveAmount);
      onApproveSubmitted?.({ isPermit: true });
      helperToast.success(
        <div>
          <Trans>Permit signed</Trans>
          <br />
        </div>
      );
      setIsApproving(false);
      return;
    } catch (e) {
      const error = e as Error;
      const lowerMessage = error.message?.toLowerCase();
      const isUserRejection = lowerMessage?.includes("user rejected") || lowerMessage?.includes("user denied");

      if (isUserRejection) {
        onApproveFail?.(error, { isPermit: true });
        helperToast.error(t`Permit signing cancelled`);
        setIsApproving(false);
        return;
      }

      if (error.message?.includes(INVALID_PERMIT_SIGNATURE_ERROR)) {
        permitParams.setIsPermitsDisabled(true);
        metrics.pushError(error, "approveTokens.permitError");
        permitFallbackReason = "invalidSignature";
      } else {
        permitParams.setIsPermitsDisabled(true);
        metrics.pushError(error, "approveTokens.permitError");
        permitFallbackReason = "failed";
      }
    }
  }

  if (permitParams && permitFallbackReason) {
    helperToast.info(getPermitFallbackToastContent(permitFallbackReason));
  }

  const contract = new ethers.Contract(tokenAddress, TokenAbi, signer);
  const nativeToken = getNativeToken(chainId);
  const networkName = getChainName(chainId);

  const finalApproveAmount = approveAmount ?? maxUint256;

  try {
    const gasLimit = await estimateGasLimit(getProvider(undefined, chainId), {
      to: tokenAddress,
      data: contract.interface.encodeFunctionData("approve", [spender, finalApproveAmount]),
      from: await signer!.getAddress(),
      value: undefined,
    });

    const res = await contract.approve(spender, finalApproveAmount, { gasLimit });

    const txUrl = getExplorerUrl(chainId) + "tx/" + res.hash;
    helperToast.success(
      <div>
        <Trans>
          Approval submitted
          <br />
          <br />
          <ExternalLink href={txUrl}>View status</ExternalLink>
        </Trans>
      </div>
    );

    if (onApproveSubmitted) {
      onApproveSubmitted({ isPermit: false });
    }
    if (getTokenInfo && infoTokens && pendingTxns && setPendingTxns) {
      const token = getTokenInfo(infoTokens, tokenAddress);
      const pendingTxn = {
        hash: res.hash,
        message: includeMessage ? t`${token.symbol} approved` : false,
      };
      setPendingTxns([...pendingTxns, pendingTxn]);
    }
  } catch (e) {
    onApproveFail?.(e, { isPermit: false });
    // eslint-disable-next-line no-console
    console.error(e);
    let failMsg;
    if (
      ["not enough funds for gas", "failed to execute call with revert code InsufficientGasFunds"].includes(
        e.data?.message
      )
    ) {
      failMsg = (
        <div>
          <Trans>
            Insufficient {nativeToken.symbol} for gas on {networkName}
            <br />
            <br />
            <Link className="underline" to={`/trade/swap?to=${nativeToken.symbol}`}>
              Swap
            </Link>{" "}
            or <ExternalLink href={JUMPER_BRIDGE_URL}>bridge</ExternalLink> {nativeToken.symbol} to {networkName}
          </Trans>
        </div>
      );
    } else if (e.message?.includes("User denied transaction signature")) {
      failMsg = t`Approval cancelled`;
    } else {
      failMsg = (
        <>
          <Trans>Approval failed</Trans>
          <br />
          <br />
          <ToastifyDebug error={String(e)} />
        </>
      );
    }
    helperToast.error(failMsg);
  } finally {
    setIsApproving(false);
  }
}

function getPermitFallbackToastContent(reason: PermitFallbackReason) {
  let reasonText: string;

  switch (reason) {
    case "unsupported":
      reasonText = t`This token does not support permit approvals.`;
      break;
    case "disabled":
      reasonText = t`Permit approvals are disabled for this token.`;
      break;
    case "permitsDisabled":
      reasonText = t`Permit approvals are unavailable after a previous permit error.`;
      break;
    case "invalidSignature":
      reasonText = t`The permit signature could not be validated.`;
      break;
    case "failed":
      reasonText = t`Permit approval could not be completed.`;
      break;
  }

  return (
    <div>
      {reasonText}
      <br />
      <br />
      <Trans>A standard approval transaction is required to continue.</Trans>
    </div>
  );
}
