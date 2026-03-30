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
import { InfoTokens, TokenInfo } from "sdk/utils/tokens/types";

import { getInvalidPermitSignatureToastContent } from "components/Errors/errorToasts";
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

  let shouldUsePermit = false;
  try {
    const token = getToken(chainId, tokenAddress);
    shouldUsePermit = Boolean(token?.isPermitSupported && !token.isPermitDisabled);
  } catch (e) {
    // ...ignore in case of glv / gm approval
  }

  if (permitParams?.addTokenPermit && shouldUsePermit && !permitParams.isPermitsDisabled) {
    try {
      await permitParams.addTokenPermit(tokenAddress, spender, approveAmount);
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
      const isUserRejection = e.message?.includes("user rejected");

      if (isUserRejection) {
        onApproveFail?.(e, { isPermit: true });
        helperToast.error(t`Permit signing cancelled`);
        setIsApproving(false);
        return;
      }

      if (e.message?.includes(INVALID_PERMIT_SIGNATURE_ERROR)) {
        onApproveFail?.(e, { isPermit: true });
        permitParams.setIsPermitsDisabled(true);
        metrics.pushError(e, "approveTokens.permitError");
        helperToast.error(getInvalidPermitSignatureToastContent());
        setIsApproving(false);
        return;
      }

      // For Smart wallets (Safe, etc.) and other wallets that don't support
      // eth_signTypedData_v4, fall back to standard ERC20 approve() transaction
      permitParams.setIsPermitsDisabled(true);
      metrics.pushError(e, "approveTokens.permitError");
    }
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
