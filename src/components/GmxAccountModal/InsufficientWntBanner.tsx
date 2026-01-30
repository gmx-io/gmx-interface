import { Trans } from "@lingui/macro";
import { useHistory } from "react-router-dom";
import { zeroAddress } from "viem";

import { ContractsChainId } from "config/chains";
import { useGmxAccountDepositViewTokenAddress, useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { getWrappedToken } from "sdk/configs/tokens";

function SwapButton({ chainId, children }: { chainId: ContractsChainId; children: React.ReactNode }) {
  const history = useHistory();
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();

  const wrappedTokenSymbol = getWrappedToken(chainId).symbol;

  return (
    <span
      className="text-body-small cursor-pointer text-13 font-medium underline underline-offset-2"
      onClick={() => {
        setGmxAccountModalOpen(false);
        history.push(`/trade/swap?to=${wrappedTokenSymbol}`);
      }}
    >
      {children}
    </span>
  );
}

function DepositButton({ children, onBeforeDeposit }: { children: React.ReactNode; onBeforeDeposit?: () => void }) {
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();
  const [, setDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();

  return (
    <span
      className="text-body-small cursor-pointer text-13 font-medium underline underline-offset-2"
      onClick={() => {
        onBeforeDeposit?.();
        setGmxAccountModalOpen("deposit");
        setDepositViewTokenAddress(zeroAddress);
      }}
    >
      {children}
    </span>
  );
}

export function InsufficientWntBanner({
  chainId,
  onBeforeDeposit,
}: {
  chainId: ContractsChainId;
  onBeforeDeposit?: () => void;
}) {
  const wrappedNativeToken = getWrappedToken(chainId);
  const wrappedNativeTokenSymbol = wrappedNativeToken.symbol;

  const hasWeth = wrappedNativeTokenSymbol === "WETH";

  let firstLine: React.ReactNode | undefined;
  let secondLine: React.ReactNode | undefined;

  firstLine = <Trans>Insufficient {wrappedNativeTokenSymbol} for gas in your GMX Account.</Trans>;

  if (hasWeth) {
    secondLine = (
      <Trans>
        <DepositButton onBeforeDeposit={onBeforeDeposit}>Deposit</DepositButton> or{" "}
        <SwapButton chainId={chainId}>buy</SwapButton> {wrappedNativeTokenSymbol}.
      </Trans>
    );
  } else {
    secondLine = (
      <Trans>
        <SwapButton chainId={chainId}>Buy</SwapButton> {wrappedNativeTokenSymbol}.
      </Trans>
    );
  }

  return (
    <div>
      {firstLine}
      <br />
      {secondLine}
    </div>
  );
}
