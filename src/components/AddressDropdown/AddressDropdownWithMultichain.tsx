import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback } from "react";
import Skeleton from "react-loading-skeleton";

import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useGmxAccountShowDepositButton } from "domain/multichain/useGmxAccountShowDepositButton";
import { useBreakpoints } from "lib/breakpoints";
import { useChainId } from "lib/chains";
import { useENS } from "lib/legacy";
import { formatUsd } from "lib/numbers";
import { shortenAddressOrEns } from "lib/wallets";

import { Avatar } from "components/Avatar/Avatar";
import Button from "components/Button/Button";
import { useAvailableToTradeAssetSettlementChain } from "components/Synthetics/GmxAccountModal/hooks";

type Props = {
  account: string;
};

export function AddressDropdownWithMultichain({ account }: Props) {
  const { srcChainId } = useChainId();
  const { ensName } = useENS(account);
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();
  const { totalUsd, gmxAccountUsd, isGmxAccountLoading } = useAvailableToTradeAssetSettlementChain();
  const { shouldShowDepositButton } = useGmxAccountShowDepositButton();

  const { isMobile } = useBreakpoints();
  const displayAddressLength = isMobile ? 9 : 13;

  const handleOpenGmxAccountModal = useCallback(() => {
    setGmxAccountModalOpen(true);
  }, [setGmxAccountModalOpen]);

  const handleOpenDeposit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setGmxAccountModalOpen("deposit");
    },
    [setGmxAccountModalOpen]
  );

  const showSideButton = srcChainId !== undefined || (gmxAccountUsd !== undefined && gmxAccountUsd > 0n);

  return (
    <div className="text-body-medium flex font-medium text-typography-primary">
      <Button
        variant="secondary"
        type="button"
        className={cx("h-40", { "!py-4 !pl-12 !pr-4": shouldShowDepositButton })}
        onClick={handleOpenGmxAccountModal}
      >
        <div
          className={cx(
            "text-body-medium flex items-center font-medium text-typography-primary",
            !shouldShowDepositButton ? "gap-16" : "gap-20"
          )}
        >
          <div className="flex items-center gap-8">
            <Avatar size={isMobile ? 16 : 24} ensName={ensName} address={account} />

            {shortenAddressOrEns(ensName || account, displayAddressLength)}
          </div>

          {showSideButton && !shouldShowDepositButton && (
            <>
              <div className="h-20 w-1 shrink-0 bg-slate-600" />

              {isGmxAccountLoading ? (
                <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={55} height={18} />
              ) : (
                formatUsd(srcChainId ? gmxAccountUsd : totalUsd)
              )}
            </>
          )}

          {shouldShowDepositButton && (
            <Button variant="primary" type="button" onClick={handleOpenDeposit}>
              <Trans>Deposit</Trans>
            </Button>
          )}
        </div>
      </Button>
    </div>
  );
}
