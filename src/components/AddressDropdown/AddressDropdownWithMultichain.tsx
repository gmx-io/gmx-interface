import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";

import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useGmxAccountShowDepositButton } from "domain/multichain/useGmxAccountShowDepositButton";
import { isIncentivesEnabled } from "domain/synthetics/incentives/constants";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/useAccountIncentiveStatus";
import { useChainId } from "lib/chains";
import { useENS } from "lib/legacy";
import { formatUsd } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";
import { shortenAddressOrEns } from "lib/wallets";

import { Avatar } from "components/Avatar/Avatar";
import Button from "components/Button/Button";
import { useAvailableToTradeAssetSettlementChain } from "components/GmxAccountModal/hooks";
import { MultiplierBadge } from "components/MultiplierBadge/MultiplierBadge";

const BACKDROP_ANIMATION_DURATION = 300;

type Props = {
  account: string;
};

export function AddressDropdownWithMultichain({ account }: Props) {
  const { chainId, srcChainId } = useChainId();
  const { ensName } = useENS(account);
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();
  const { totalUsd, gmxAccountUsd, isGmxAccountLoading } = useAvailableToTradeAssetSettlementChain();
  const { shouldShowDepositButton } = useGmxAccountShowDepositButton();

  const incentivesEnabled = isIncentivesEnabled(chainId);
  const { data: incentiveStatus } = useAccountIncentiveStatus(chainId, {
    account,
    enabled: incentivesEnabled,
  });
  const multiplier = incentiveStatus?.multiplier;
  const showMultiplier = incentivesEnabled && multiplier !== undefined && multiplier > 0;

  const { isMobile, isSmallMobile } = useBreakpoints();
  const displayAddressLength = isMobile ? 9 : 13;

  const [isGmxAccountModalOpen] = useGmxAccountModalOpen();
  const isModalOpen = isGmxAccountModalOpen !== false;

  // Keep elevated z-index during backdrop fade-out animation
  const [isElevated, setIsElevated] = useState(false);
  useEffect(() => {
    if (isModalOpen) {
      setIsElevated(true);
    } else {
      const timeout = setTimeout(() => setIsElevated(false), BACKDROP_ANIMATION_DURATION);
      return () => clearTimeout(timeout);
    }
  }, [isModalOpen]);

  const handleToggleGmxAccountModal = useCallback(() => {
    setGmxAccountModalOpen(isModalOpen ? false : true);
  }, [setGmxAccountModalOpen, isModalOpen]);

  const handleOpenDeposit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setGmxAccountModalOpen("deposit");
    },
    [setGmxAccountModalOpen]
  );

  const showSideButton = srcChainId !== undefined || (gmxAccountUsd !== undefined && gmxAccountUsd > 0n);

  return (
    <div
      className={cx("text-body-medium relative flex font-medium text-typography-primary", {
        "z-[1002]": isElevated,
      })}
    >
      <Button
        variant="secondary"
        type="button"
        size="controlled"
        className={cx("h-32 md:h-40", {
          "!py-4 !pl-12 !pr-4": shouldShowDepositButton && !isMobile,
          "!py-0 !pl-12 !pr-0": shouldShowDepositButton && isMobile,
        })}
        onClick={handleToggleGmxAccountModal}
      >
        <div
          className={cx(
            "text-body-medium flex items-center font-medium text-typography-primary",
            !isMobile && (!shouldShowDepositButton ? "gap-12" : "gap-20"),
            isMobile && "gap-8"
          )}
        >
          <div className="flex items-center gap-8">
            <Avatar size={isMobile ? 16 : 24} ensName={ensName} address={account} />

            {!isSmallMobile && <>{shortenAddressOrEns(ensName || account, displayAddressLength)}</>}

            {showMultiplier && <MultiplierBadge multiplier={multiplier} />}
          </div>

          {showSideButton && !shouldShowDepositButton && (
            <>
              {!isSmallMobile && <div className="h-20 w-1 shrink-0 bg-slate-600" />}

              {isGmxAccountLoading ? (
                <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={55} height={18} />
              ) : (
                formatUsd(srcChainId ? gmxAccountUsd : totalUsd, { displayDecimals: 0 })
              )}
            </>
          )}

          {shouldShowDepositButton && (
            <Button variant="primary" onClick={handleOpenDeposit}>
              <Trans>Deposit</Trans>
            </Button>
          )}
        </div>
      </Button>
    </div>
  );
}
