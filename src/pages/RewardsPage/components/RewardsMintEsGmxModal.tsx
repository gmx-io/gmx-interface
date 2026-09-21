import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import { useEffect, useMemo, useRef, useState } from "react";

import { ARBITRUM_SEPOLIA } from "config/chains";
import { getContract } from "config/contracts";
import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useChainId } from "lib/chains";
import { useMultipleWalletExtensionsChainError } from "lib/chains/getMultipleWalletExtensionsChainError";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { GMX_DECIMALS } from "lib/legacy";
import { formatAmount, parseValue } from "lib/numbers";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";

import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import NumberInput from "components/NumberInput/NumberInput";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tabs from "components/Tabs/Tabs";
import { ButtonTooltipWrapper } from "components/Tooltip/ButtonTooltipWrapper";

import { RewardsVestingChainGuard } from "./RewardsVestingChainGuard";

type Props = {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  walletEsGmxBalance?: bigint;
  walletSbfGmxBalance?: bigint;
  onMinted: () => Promise<unknown>;
};

export function RewardsMintEsGmxModal({
  isVisible,
  setIsVisible,
  walletEsGmxBalance,
  walletSbfGmxBalance,
  onMinted,
}: Props) {
  const { chainId } = useChainId();
  const { account, active, signer, chainId: walletChainId, connector } = useWallet();
  const { openConnectModal } = useConnectModal();
  const { setPendingTxns } = usePendingTxns();
  const hasOutdatedUi = useHasOutdatedUi();
  const chainError = useMultipleWalletExtensionsChainError();
  const [tokenSymbol, setTokenSymbol] = useState<"esGMX" | "sbfGMX">("esGMX");
  const [value, setValue] = useState("100");
  const [isMinting, setIsMinting] = useState(false);
  const tokenOptions = useMemo(
    () => [
      { value: "esGMX" as const, disabled: isMinting },
      { value: "sbfGMX" as const, disabled: isMinting },
    ],
    [isMinting]
  );
  const pendingRef = useRef(false);
  const sessionRef = useRef(0);
  const amount = parseValue(value, GMX_DECIMALS);
  const hasValidAmount = amount !== undefined && amount > 0n;
  const walletBalance = tokenSymbol === "esGMX" ? walletEsGmxBalance : walletSbfGmxBalance;
  const mintLabel = t`Mint ${tokenSymbol}`;

  useEffect(() => {
    sessionRef.current += 1;
    pendingRef.current = false;
    setIsMinting(false);
    return () => {
      sessionRef.current += 1;
    };
  }, [account, active, chainId, connector?.uid, isVisible, signer, tokenSymbol, walletChainId]);

  useEffect(() => {
    setValue("100");
    setTokenSymbol("esGMX");
  }, [account, isVisible]);

  const handleMint = async () => {
    if (
      !isVisible ||
      chainId !== ARBITRUM_SEPOLIA ||
      walletChainId !== ARBITRUM_SEPOLIA ||
      !account ||
      !active ||
      !signer ||
      !hasValidAmount ||
      pendingRef.current ||
      hasOutdatedUi ||
      chainError.buttonErrorMessage
    ) {
      return;
    }

    const session = ++sessionRef.current;
    pendingRef.current = true;
    setIsMinting(true);
    try {
      const token = new ethers.Contract(
        getContract(ARBITRUM_SEPOLIA, tokenSymbol === "esGMX" ? "IncentiveEsGmx" : "IncentivePairToken"),
        abis.Token,
        signer
      );
      const transaction = await callContract(ARBITRUM_SEPOLIA, token, "mint", [account, amount], {
        sentMsg: t`${tokenSymbol} mint submitted`,
        failMsg: t`${tokenSymbol} mint failed`,
        successMsg: t`${tokenSymbol} minted`,
        setPendingTxns,
      });
      if (!transaction || sessionRef.current !== session) return;
      await transaction.wait();
      if (sessionRef.current !== session) return;
      try {
        await onMinted();
      } catch {
        if (sessionRef.current === session) helperToast.info(t`Balances will refresh shortly.`);
      }
      if (sessionRef.current === session) setIsVisible(false);
    } catch {
      // Transaction errors are reported by callContract and the pending transaction watcher.
    } finally {
      if (sessionRef.current === session) {
        pendingRef.current = false;
        setIsMinting(false);
      }
    }
  };

  const primaryText = hasOutdatedUi
    ? getPageOutdatedError()
    : chainError.buttonErrorMessage ??
      (isMinting ? t`Confirming...` : !hasValidAmount ? t`Enter an amount` : mintLabel);

  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={(visible) => {
        if (!pendingRef.current) setIsVisible(visible);
      }}
      label={mintLabel}
      contentClassName="w-[420px]"
      withMobileBottomPosition
      qa="rewards-mint-esgmx-modal"
    >
      <div className="flex flex-col gap-16">
        <Tabs<"esGMX" | "sbfGMX">
          type="inline-primary"
          selectedValue={tokenSymbol}
          onChange={(symbol) => {
            if (!pendingRef.current) setTokenSymbol(symbol);
          }}
          options={tokenOptions}
          regularOptionClassname="flex-1"
        />
        <p className="text-13 text-typography-secondary">
          {tokenSymbol === "esGMX" ? (
            <Trans>Mint test esGMX to your connected wallet. Your rewards vesting limit stays the same.</Trans>
          ) : (
            <Trans>Mint test sbfGMX to your connected wallet to use as vesting collateral.</Trans>
          )}
        </p>
        <div className="flex flex-col gap-8">
          <label htmlFor="rewards-mint-esgmx-amount" className="text-13 text-typography-secondary">
            <Trans>Amount</Trans>
          </label>
          <div className="flex h-48 items-center gap-8 rounded-8 bg-fill-surfaceElevated50 px-12">
            <NumberInput
              inputId="rewards-mint-esgmx-amount"
              value={value}
              onValueChange={(event) => setValue(event.target.value)}
              maxDecimals={GMX_DECIMALS}
              isDisabled={isMinting}
              placeholder="0"
              className="bg-transparent min-w-0 grow text-16 outline-none"
            />
            <span className="text-14">{tokenSymbol}</span>
          </div>
        </div>
        {account && walletBalance !== undefined ? (
          <SyntheticsInfoRow
            label={<Trans>Wallet balance</Trans>}
            value={`${formatAmount(walletBalance, GMX_DECIMALS, 4, true, { trimTrailingZeros: true })} ${tokenSymbol}`}
          />
        ) : null}
        {!active || !account ? (
          <Button variant="primary-action" className="w-full" onClick={openConnectModal}>
            <Trans>Connect wallet</Trans>
          </Button>
        ) : (
          <RewardsVestingChainGuard chainId={ARBITRUM_SEPOLIA}>
            <ButtonTooltipWrapper content={chainError.buttonTooltipMessage}>
              <Button
                variant="primary-action"
                className="w-full"
                onClick={handleMint}
                disabled={
                  isMinting ||
                  !hasValidAmount ||
                  !signer ||
                  chainId !== ARBITRUM_SEPOLIA ||
                  hasOutdatedUi ||
                  Boolean(chainError.buttonErrorMessage)
                }
              >
                {primaryText}
              </Button>
            </ButtonTooltipWrapper>
          </RewardsVestingChainGuard>
        )}
      </div>
    </ModalWithPortal>
  );
}
