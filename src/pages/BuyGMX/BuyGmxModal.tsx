import { Trans } from "@lingui/macro";
import { MouseEvent, ReactNode, useState } from "react";
import { useHistory } from "react-router-dom";

import { ARBITRUM } from "config/chains";
import { getSyntheticsTradeOptionsKey } from "config/localStorage";
import { useChainId } from "lib/chains";
import { metrics } from "lib/metrics";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { getContract } from "sdk/configs/contracts";
import { TradeMode, TradeType } from "sdk/types/trade";

import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import GmxRoundedWhiteIcon from "img/ic_gmx_rounded_white.svg?react";
import SpinnerIcon from "img/ic_spinner.svg?react";

import { BUY_GMX_MODAL_LINKS } from "./buyGmxModalConfig";

const DIRECT_BUY_PATH = "/trade/swap";

const ARB_USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const ARB_GMX_ADDRESS = getContract(ARBITRUM, "GMX");

function setArbitrumSwapToGmxOptions() {
  const key = JSON.stringify(getSyntheticsTradeOptionsKey(ARBITRUM));
  const existingRaw = localStorage.getItem(key);
  const existing = existingRaw ? JSON.parse(existingRaw) : {};

  const updated = {
    ...existing,
    tradeType: TradeType.Swap,
    tradeMode: TradeMode.Market,
    tokens: {
      ...existing.tokens,
      fromTokenAddress: ARB_USDC_ADDRESS,
      swapToTokenAddress: ARB_GMX_ADDRESS,
    },
  };

  localStorage.setItem(key, JSON.stringify(updated));
}

export function BuyGmxModal({
  isVisible,
  setIsVisible,
}: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
}) {
  const { chainId } = useChainId();
  const { active } = useWallet();
  const history = useHistory();
  const [isSwitching, setIsSwitching] = useState(false);

  const handleBuyDirectClick = async (event: MouseEvent) => {
    event.preventDefault();

    if (isSwitching) {
      return;
    }

    // Pre-set trade options in localStorage for Arbitrum before navigation/network switch.
    // This ensures the correct Swap mode with USDC -> GMX is applied after chain change.
    setArbitrumSwapToGmxOptions();

    if (chainId === ARBITRUM) {
      history.push(DIRECT_BUY_PATH);
      return;
    }

    setIsSwitching(true);

    try {
      if (!active) {
        history.push(DIRECT_BUY_PATH);
        switchNetwork(ARBITRUM, active);
      } else {
        await switchNetwork(ARBITRUM, active);
        history.push(DIRECT_BUY_PATH);
      }
    } catch (e) {
      metrics.pushError(e, "buyGmxModal.switchNetworkError");
    }

    setIsSwitching(false);
  };

  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={<Trans>Buy GMX</Trans>}
      contentClassName="w-[420px]"
      withMobileBottomPosition={true}
    >
      <div className="flex flex-col gap-16">
        <BuyGmxModalButton
          variant="primary"
          icon={<GmxRoundedWhiteIcon className="size-20" />}
          newTab={false}
          onClick={handleBuyDirectClick}
          isLoading={isSwitching}
          disabled={isSwitching}
        >
          <Trans>Buy on GMX directly</Trans>
        </BuyGmxModalButton>
        <div className="flex flex-col gap-8">
          <span className="text-14 font-medium text-typography-secondary">
            <Trans>Buy on other platforms</Trans>
          </span>
          <div className="grid grid-cols-2 gap-12">
            {BUY_GMX_MODAL_LINKS.map((button) => {
              const link = button.getLink(chainId);

              return (
                <BuyGmxModalButton key={button.id} variant="secondary" icon={button.icon} to={link} newTab>
                  {button.label}
                </BuyGmxModalButton>
              );
            })}
          </div>
        </div>
      </div>
    </ModalWithPortal>
  );
}

function BuyGmxModalButton({
  to,
  icon,
  children,
  variant,
  newTab,
  onClick,
  isLoading,
  disabled,
}: {
  to?: string;
  icon: ReactNode;
  children: ReactNode;
  variant: "primary" | "secondary";
  newTab: boolean;
  onClick?: (event: MouseEvent) => void;
  isLoading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      variant={variant}
      className="w-full !justify-between !py-10 px-16 text-14 normal-nums"
      to={to}
      newTab={newTab}
      showExternalLinkArrow={false}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="flex items-center gap-8">
        {icon}
        {children}
      </span>
      {isLoading ? <SpinnerIcon className="spin size-20" /> : <ArrowRightIcon className="size-20" />}
    </Button>
  );
}
