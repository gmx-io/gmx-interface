import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback } from "react";
import Skeleton from "react-loading-skeleton";
import { createBreakpoint } from "react-use";

import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useChainId } from "lib/chains";
import { useENS } from "lib/legacy";
import { formatUsd } from "lib/numbers";
import { shortenAddressOrEns } from "lib/wallets";

import { Avatar } from "components/Avatar/Avatar";
import { useAvailableToTradeAssetSettlementChain } from "components/Synthetics/GmxAccountModal/hooks";

type Props = {
  account: string;
};

const useBreakpoint = createBreakpoint({ L: 450, S: 0 }) as () => "L" | "S";

function AddressDropdown({ account }: Props) {
  const { srcChainId } = useChainId();
  const { ensName } = useENS(account);
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();
  const { totalUsd, gmxAccountUsd, isGmxAccountLoading } = useAvailableToTradeAssetSettlementChain();

  const breakpoint = useBreakpoint();
  const isSmallScreen = breakpoint === "S";

  const displayAddressLength = isSmallScreen ? 9 : 13;

  const handleOpenGmxAccountModal = useCallback(() => {
    setGmxAccountModalOpen(true);
  }, [setGmxAccountModalOpen]);

  const handleOpenDeposit = useCallback(() => {
    setGmxAccountModalOpen("deposit");
  }, [setGmxAccountModalOpen]);

  const showSideButton = srcChainId !== undefined || (gmxAccountUsd !== undefined && gmxAccountUsd > 0n);
  const showDepositButton = !isGmxAccountLoading && gmxAccountUsd === 0n && srcChainId !== undefined;

  return (
    <div className="flex">
      {!(isSmallScreen && showSideButton) && (
        <button
          data-qa="user-address"
          className={cx("flex h-36 items-center gap-8 rounded-l-4 border border-stroke-primary px-12 text-slate-100", {
            "rounded-r-4": !showSideButton,
          })}
          onClick={handleOpenGmxAccountModal}
        >
          <div className="ml-1 mr-2">
            <Avatar size={20} ensName={ensName} address={account} />
          </div>
          <span className="">{shortenAddressOrEns(ensName || account, displayAddressLength)}</span>
        </button>
      )}
      {showSideButton && (
        <button
          className={cx(
            "h-36 items-center border-stroke-primary px-12",
            isSmallScreen ? "rounded-4" : "rounded-r-4 border-b border-r border-t",
            showDepositButton && "bg-blue-600 active:bg-[--primary-btn-active] desktop-hover:bg-[--primary-btn-hover]",
            isSmallScreen && !showDepositButton && "border"
          )}
          onClick={showDepositButton ? handleOpenDeposit : handleOpenGmxAccountModal}
        >
          <div className="relative -top-1">
            {showDepositButton ? (
              <Trans>Deposit</Trans>
            ) : isGmxAccountLoading ? (
              <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={55} height={16} />
            ) : (
              formatUsd(srcChainId ? gmxAccountUsd : totalUsd)
            )}
          </div>
        </button>
      )}
    </div>
  );
}

export default AddressDropdown;
