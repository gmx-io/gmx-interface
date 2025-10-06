import { Trans } from "@lingui/macro";
import { ReactNode } from "react";

import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";

import OneInchIcon from "img/ic_1inch.svg?react";
import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import BanxaIcon from "img/ic_banxa.svg?react";
import BinanceIcon from "img/ic_binance.svg?react";
import BybitIcon from "img/ic_bybit.svg?react";
import GmxRoundedWhiteIcon from "img/ic_gmx_rounded_white.svg?react";
import MatchaIcon from "img/ic_matcha.svg?react";
import TransakIcon from "img/ic_tansak.svg?react";
import UniswapIcon from "img/ic_uni_24.svg?react";

export function BuyGmxModal({
  isVisible,
  setIsVisible,
}: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
}) {
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
          to="/trade/swap?from=usdc&to=gmx"
          icon={<GmxRoundedWhiteIcon className="size-20" />}
          newTab={false}
        >
          <Trans>Buy GMX directly</Trans>
        </BuyGmxModalButton>
        <div className="flex flex-col gap-8">
          <span className="text-14 font-medium text-typography-secondary">
            <Trans>Buy on other platforms</Trans>
          </span>
          <div className="grid grid-cols-2 gap-12">
            <BuyGmxModalButton
              variant="secondary"
              icon={<UniswapIcon className="size-20" />}
              newTab={false}
              to="https://uniswap.org/"
            >
              Uniswap
            </BuyGmxModalButton>
            <BuyGmxModalButton
              variant="secondary"
              icon={<OneInchIcon className="size-20" />}
              newTab={false}
              to="https://1inch.io/"
            >
              1inch
            </BuyGmxModalButton>
            <BuyGmxModalButton
              variant="secondary"
              icon={<MatchaIcon className="size-20" />}
              newTab={false}
              to="https://www.matcha.xyz/"
            >
              Matcha
            </BuyGmxModalButton>
            <BuyGmxModalButton
              variant="secondary"
              icon={<BinanceIcon className="size-20" />}
              newTab={false}
              to="https://www.binance.com/"
            >
              Binance
            </BuyGmxModalButton>
            <BuyGmxModalButton
              variant="secondary"
              icon={<BybitIcon className="size-20" />}
              newTab={false}
              to="https://www.bybit.com/"
            >
              Bybit
            </BuyGmxModalButton>
            <BuyGmxModalButton
              variant="secondary"
              icon={<BanxaIcon className="size-20" />}
              newTab={false}
              to="https://www.banxa.com/"
            >
              Banxa
            </BuyGmxModalButton>
            <BuyGmxModalButton
              variant="secondary"
              icon={<TransakIcon className="size-20" />}
              newTab={false}
              to="https://www.transak.com/"
            >
              Transak
            </BuyGmxModalButton>
          </div>
        </div>
      </div>
    </ModalWithPortal>
  );
}

export function BuyGmxModalButton({
  to,
  newTab,
  icon,
  children,
  variant,
}: {
  to: string;
  newTab: boolean;
  icon: ReactNode;
  children: ReactNode;
  variant: "primary" | "secondary";
}) {
  return (
    <Button
      variant={variant}
      className="w-full !justify-between !py-10 px-16 text-14 normal-nums"
      to={to}
      newTab={newTab}
      showExternalLinkArrow={false}
    >
      <span className="flex items-center gap-8">
        {icon}
        {children}
      </span>
      <ArrowRightIcon className="size-20" />
    </Button>
  );
}
