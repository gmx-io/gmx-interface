import { Trans } from "@lingui/macro";
import { useHistory } from "react-router-dom";
import { zeroAddress } from "viem";

import { useGmxAccountDepositViewTokenAddress, useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useChainId } from "lib/chains";
import { formatAmount, formatUsd } from "lib/numbers";
import { getWrappedToken } from "sdk/configs/tokens";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

function SwapButton({ children }: { children: React.ReactNode }) {
  const { chainId } = useChainId();
  const history = useHistory();
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();

  const wrappedTokenSymbol = getWrappedToken(chainId).symbol;

  return (
    <span
      className="text-body-small cursor-pointer text-13 font-medium text-yellow-500 underline underline-offset-2"
      onClick={() => {
        setGmxAccountModalOpen(false);
        history.push(`/trade/swap?to=${wrappedTokenSymbol}`);
      }}
    >
      {children}
    </span>
  );
}
function DepositButton({ children }: { children: React.ReactNode }) {
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();
  const [, setDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();

  return (
    <span
      className="text-body-small cursor-pointer text-13 font-medium text-yellow-500 underline underline-offset-2"
      onClick={() => {
        setGmxAccountModalOpen("deposit");
        setDepositViewTokenAddress(zeroAddress);
      }}
    >
      {children}
    </span>
  );
}
export function InsufficientWntBanner({
  neededAmount,
  neededAmountUsd,
}: {
  neededAmount: bigint | undefined;
  neededAmountUsd: bigint | undefined;
}) {
  const { chainId } = useChainId();

  const wrappedNativeToken = getWrappedToken(chainId);
  const wrappedNativeTokenSymbol = wrappedNativeToken.symbol;
  const wrappedNativeTokenDecimals = wrappedNativeToken.decimals;

  const hasWeth = wrappedNativeTokenSymbol === "WETH";

  let firstLine: React.ReactNode | undefined;
  let secondLine: React.ReactNode | undefined;

  if (neededAmount !== undefined && neededAmountUsd !== undefined) {
    const formattedAmount = formatAmount(neededAmount, wrappedNativeTokenDecimals);
    const formattedUsd = formatUsd(neededAmountUsd);

    firstLine = (
      <Trans>
        <span className="numbers">{formattedAmount}</span> (<span className="numbers">{formattedUsd}</span>){" "}
        {wrappedNativeTokenSymbol} required in your account to withdraw
      </Trans>
    );
  } else {
    firstLine = <Trans>{wrappedNativeTokenSymbol} required in your account to withdraw</Trans>;
  }

  if (hasWeth) {
    secondLine = (
      <Trans>
        <DepositButton>Deposit</DepositButton> or <SwapButton>Swap</SwapButton> to get {wrappedNativeTokenSymbol}
      </Trans>
    );
  } else {
    secondLine = (
      <Trans>
        <SwapButton>Swap</SwapButton> to get {wrappedNativeTokenSymbol}
      </Trans>
    );
  }

  return (
    <AlertInfoCard type="warning" className="my-4">
      <div>
        {firstLine}
        <br />
        {secondLine}
      </div>
    </AlertInfoCard>
  );
}
