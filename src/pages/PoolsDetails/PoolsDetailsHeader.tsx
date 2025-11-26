import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import {
  PLATFORM_TOKEN_DECIMALS,
  selectPoolsDetailsCanBridgeInMarket,
  selectPoolsDetailsCanBridgeOutMarket,
} from "context/PoolsDetailsContext/selectors";
import { selectMultichainMarketTokenBalances } from "context/PoolsDetailsContext/selectors/selectMultichainMarketTokenBalances";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  getGlvMarketShortening,
  getGlvOrMarketAddress,
  getMarketIndexName,
  getMarketPoolName,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import { convertToUsd, TokenData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatAmountHuman, formatBalanceAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useBreakpoints } from "lib/useBreakpoints";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

import { BridgeInModal } from "components/BridgeModal/BridgeInModal";
import { BridgeOutModal } from "components/BridgeModal/BridgeOutModal";
import Button from "components/Button/Button";
import { MultichainBalanceTooltip } from "components/MultichainBalanceTooltip/MultichainBalanceTooltip";
import TokenIcon from "components/TokenIcon/TokenIcon";

import Buy16Icon from "img/ic_buy_16.svg?react";
import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import Sell16Icon from "img/ic_sell_16.svg?react";

import { PoolsDetailsMarketAmount } from "./PoolsDetailsMarketAmount";

type Props = {
  glvOrMarketInfo: GlvOrMarketInfo | undefined;
  marketToken: TokenData | undefined;
};

export function PoolsDetailsHeader({ glvOrMarketInfo, marketToken }: Props) {
  const { chainId, srcChainId } = useChainId();
  const canBridgeInMarket = useSelector(selectPoolsDetailsCanBridgeInMarket);
  const canBridgeOutMarket = useSelector(selectPoolsDetailsCanBridgeOutMarket);
  const isGlv = glvOrMarketInfo && isGlvInfo(glvOrMarketInfo);
  const iconName = glvOrMarketInfo?.isSpotOnly
    ? getNormalizedTokenSymbol(glvOrMarketInfo.longToken.symbol) +
      getNormalizedTokenSymbol(glvOrMarketInfo.shortToken.symbol)
    : isGlv
      ? glvOrMarketInfo?.glvToken.symbol
      : glvOrMarketInfo?.indexToken.symbol;

  const [openedTransferModal, setOpenedTransferModal] = useState<"transferIn" | "transferOut" | undefined>(undefined);

  const marketPrice = marketToken?.prices?.maxPrice;

  const marketTotalSupply = marketToken?.totalSupply;
  const marketTotalSupplyUsd = convertToUsd(marketTotalSupply, marketToken?.decimals, marketPrice);

  const userEarnings = useUserEarnings(chainId, srcChainId);
  const marketEarnings = getByKey(userEarnings?.byMarketAddress, marketToken?.address);

  const { isMobile, isTablet } = useBreakpoints();

  const multichainMarketTokensBalances = useSelector(selectMultichainMarketTokenBalances);
  const multichainMarketTokenBalances = marketToken?.address
    ? multichainMarketTokensBalances[marketToken.address]
    : undefined;

  const totalBalance = multichainMarketTokenBalances?.totalBalance;
  const marketBalanceUsd = multichainMarketTokenBalances?.totalBalanceUsd;

  const [isOpen, setIsOpen] = useState(true);

  const handleToggle = useCallback(() => {
    setIsOpen((isOpen) => !isOpen);
  }, []);

  const glvOrGm = isGlv ? "GLV" : "GM";

  return (
    <div
      className={cx(
        "flex justify-between gap-18 rounded-8 bg-slate-900 px-16 py-20 max-lg:flex-col max-md:px-12 max-md:py-12"
      )}
    >
      <div
        className={cx("flex", {
          "flex-col gap-18": isMobile,
          "items-center gap-28": !isMobile,
        })}
      >
        {!glvOrMarketInfo ? (
          <div>...</div>
        ) : (
          <>
            <div
              className={cx("flex items-center justify-between ", {
                "border-b-1/2 border-slate-600 pb-18": isOpen && isMobile,
              })}
            >
              <div className="flex items-center gap-20">
                {iconName && (
                  <TokenIcon
                    symbol={iconName}
                    displaySize={40}
                    badge={
                      isGlv
                        ? getGlvMarketShortening(chainId, getGlvOrMarketAddress(glvOrMarketInfo))
                        : ([glvOrMarketInfo.longToken.symbol, glvOrMarketInfo.shortToken.symbol] as const)
                    }
                  />
                )}
                <div className={cx("flex flex-col gap-4 pr-20 font-medium")}>
                  <div className="text-body-large">{isGlv ? "GLV" : `GM: ${getMarketIndexName(glvOrMarketInfo)}`}</div>
                  <div className="text-body-small text-typography-secondary">{`[${getMarketPoolName(glvOrMarketInfo)}]`}</div>
                </div>
              </div>
              {isMobile && (
                <Button
                  className="flex h-32 w-32 items-center justify-center"
                  variant="secondary"
                  onClick={handleToggle}
                >
                  <ChevronDownIcon className={cx({ "rotate-180": isOpen })} />
                </Button>
              )}
            </div>
            {(isOpen || !isMobile) && (
              <div className="flex gap-14 max-md:flex-col">
                <PoolsDetailsMarketAmount
                  label={<Trans>TVL (Supply)</Trans>}
                  value={formatAmountHuman(marketTotalSupplyUsd, USD_DECIMALS, true, 2)}
                  secondaryValue={
                    typeof marketTotalSupply === "bigint" && typeof marketToken?.decimals === "number"
                      ? `${formatAmountHuman(marketTotalSupply, marketToken?.decimals, false, 2)} ${isGlv ? "GLV" : "GM"}`
                      : undefined
                  }
                />
                {typeof totalBalance === "bigint" && typeof marketToken?.decimals === "number" && (
                  <PoolsDetailsMarketAmount
                    label={<Trans>Balance</Trans>}
                    value={formatUsd(marketBalanceUsd)}
                    secondaryValue={`${formatBalanceAmount(totalBalance, marketToken?.decimals, undefined, {
                      showZero: true,
                    })} ${isGlv ? "GLV" : "GM"}`}
                    tooltipContent={
                      <MultichainBalanceTooltip
                        multichainBalances={multichainMarketTokenBalances}
                        symbol={glvOrGm}
                        decimals={PLATFORM_TOKEN_DECIMALS}
                      />
                    }
                  />
                )}
                {marketEarnings && (
                  <PoolsDetailsMarketAmount
                    label={<Trans>Total Earned Fees</Trans>}
                    value={formatUsd(marketEarnings?.total)}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className={cx("flex items-center gap-8 max-lg:w-full lg:gap-12")}>
        {canBridgeOutMarket && (
          <Button
            className="min-w-max basis-full"
            variant="secondary"
            size={isTablet ? "small" : "medium"}
            onClick={() => setOpenedTransferModal("transferOut")}
          >
            {isTablet && <Sell16Icon className="size-16" />}
            <Trans>Withdraw {glvOrGm}</Trans>
          </Button>
        )}
        {canBridgeInMarket && (
          <Button
            className="min-w-max basis-full"
            variant="secondary"
            size={isTablet ? "small" : "medium"}
            onClick={() => setOpenedTransferModal("transferIn")}
          >
            {isTablet && <Buy16Icon className="size-16" />}
            <Trans>Deposit {glvOrGm}</Trans>
          </Button>
        )}
      </div>
      {canBridgeOutMarket && (
        <BridgeOutModal
          isVisible={openedTransferModal === "transferOut"}
          setIsVisible={(newIsVisible) => setOpenedTransferModal(newIsVisible ? "transferOut" : undefined)}
          glvOrMarketInfo={glvOrMarketInfo}
        />
      )}
      {canBridgeInMarket && (
        <BridgeInModal
          isVisible={openedTransferModal === "transferIn"}
          setIsVisible={(newIsVisible) => setOpenedTransferModal(newIsVisible ? "transferIn" : undefined)}
          glvOrMarketInfo={glvOrMarketInfo}
        />
      )}
    </div>
  );
}
