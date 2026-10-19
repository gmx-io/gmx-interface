import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import { useEffect, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";

import { getChainName, type ContractsChainId } from "config/chains";
import type { RatioVestingConfig } from "config/vesting";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useMultipleWalletExtensionsChainError } from "lib/chains/getMultipleWalletExtensionsChainError";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { GMX_DECIMALS } from "lib/legacy";
import { formatBalanceAmount } from "lib/numbers";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";

import Button from "components/Button/Button";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ButtonTooltipWrapper } from "components/Tooltip/ButtonTooltipWrapper";

export function EsGmxIssuerClaimableAmounts({
  chainId,
  config,
  amount,
  isLoading,
  error,
  mutate,
}: {
  chainId: ContractsChainId;
  config: RatioVestingConfig;
  amount?: bigint;
  isLoading: boolean;
  error?: unknown;
  mutate: () => Promise<bigint | undefined>;
}) {
  const { account, active, signer, chainId: walletChainId } = useWallet();
  const { setPendingTxns } = usePendingTxns();
  const hasOutdatedUi = useHasOutdatedUi();
  const chainError = useMultipleWalletExtensionsChainError();
  const [isClaiming, setIsClaiming] = useState(false);
  const pendingRef = useRef(false);
  const sessionRef = useRef(0);
  const hasClaimableAmount = amount !== undefined && amount > 0n;

  useEffect(() => {
    sessionRef.current += 1;
    pendingRef.current = false;
    setIsClaiming(false);
    return () => {
      sessionRef.current += 1;
    };
  }, [account, active, signer, chainId, walletChainId, config.issuer, hasOutdatedUi, chainError.buttonErrorMessage]);

  const handleClaim = async () => {
    if (
      !active ||
      !account ||
      !signer ||
      walletChainId !== chainId ||
      !hasClaimableAmount ||
      error ||
      pendingRef.current ||
      hasOutdatedUi ||
      chainError.buttonErrorMessage
    )
      return;

    const session = sessionRef.current;
    pendingRef.current = true;
    setIsClaiming(true);
    try {
      let refreshedAmount;
      try {
        refreshedAmount = await mutate();
      } catch {
        if (sessionRef.current === session)
          helperToast.error(t`Unable to refresh claimable rewards. Please try again.`);
        return;
      }
      if (sessionRef.current !== session) return;
      if (refreshedAmount === undefined) {
        helperToast.error(t`Unable to refresh claimable rewards. Please try again.`);
        return;
      }
      if (refreshedAmount === 0n) {
        helperToast.info(t`No rewards are currently available to claim.`);
        return;
      }

      const transaction = await callContract(
        chainId,
        new ethers.Contract(config.issuer, abis.EsGmxIssuer, signer),
        "claim",
        [],
        {
          sentMsg: t`esGMX claim submitted`,
          failMsg: t`esGMX claim failed`,
          successMsg: t`esGMX claimed`,
          setPendingTxns,
        }
      );
      if (!transaction || sessionRef.current !== session) return;
      await transaction.wait();
      if (sessionRef.current !== session) return;
      try {
        await mutate();
      } catch {
        if (sessionRef.current === session) helperToast.info(t`Balances will refresh shortly.`);
      }
    } catch {
      // callContract reports transaction errors.
    } finally {
      if (sessionRef.current === session) {
        pendingRef.current = false;
        setIsClaiming(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-12 rounded-8 bg-fill-surfaceElevated50 p-12">
      <div className="text-body-medium font-medium">
        <Trans>esGMX incentives</Trans>
      </div>
      {isLoading && !error && amount === undefined ? (
        <Skeleton height={40} baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" />
      ) : error || amount === undefined ? (
        <div className="text-13 text-typography-secondary">
          <Trans>Unable to refresh claimable rewards. Please try again.</Trans>
        </div>
      ) : (
        <div className="flex items-center gap-6 text-16 numbers">
          <TokenIcon symbol="esGMX" displaySize={20} />
          {formatBalanceAmount(amount, GMX_DECIMALS)} esGMX
        </div>
      )}
      {active && walletChainId !== chainId ? (
        <Button variant="primary-action" className="w-full" onClick={() => switchNetwork(chainId, true)}>
          <Trans>Switch to {getChainName(chainId)}</Trans>
        </Button>
      ) : (
        <ButtonTooltipWrapper content={chainError.buttonTooltipMessage}>
          <Button
            variant="primary"
            size="medium"
            className="w-full"
            onClick={handleClaim}
            disabled={
              isClaiming ||
              !hasClaimableAmount ||
              Boolean(error) ||
              !active ||
              !signer ||
              hasOutdatedUi ||
              Boolean(chainError.buttonErrorMessage)
            }
          >
            {chainError.buttonErrorMessage ?? (isClaiming ? <Trans>Claiming...</Trans> : <Trans>Claim esGMX</Trans>)}
          </Button>
        </ButtonTooltipWrapper>
      )}
    </div>
  );
}
