import { Trans } from "@lingui/macro";
import { useHistory } from "react-router-dom";
import { zeroAddress } from "viem";

import { useGmxAccountDepositViewTokenAddress, useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useChainId } from "lib/chains";
import { formatAmount, formatUsd } from "lib/numbers";
import { getWrappedToken } from "sdk/configs/tokens";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";

function SwapButton({ children }: { children: React.ReactNode }) {
  const { chainId } = useChainId();
  const history = useHistory();
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();

  const wrappedTokenSymbol = getWrappedToken(chainId).symbol;

  return (
    <Button
      className="!text-body-small !text-yellow-500"
      variant="link"
      onClick={() => {
        setGmxAccountModalOpen(false);
        history.push(`/trade/swap?to=${wrappedTokenSymbol}`);
      }}
    >
      {children}
    </Button>
  );
}
function DepositButton({ children }: { children: React.ReactNode }) {
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();
  const [, setDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();

  return (
    <Button
      className="!text-body-small !text-yellow-500"
      variant="link"
      onClick={() => {
        setGmxAccountModalOpen("deposit");
        setDepositViewTokenAddress(zeroAddress);
      }}
    >
      {children}
    </Button>
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
        You’ll need <span className="numbers">{formattedAmount}</span> (<span className="numbers">{formattedUsd}</span>){" "}
        {wrappedNativeTokenSymbol} in your account to withdraw funds.
      </Trans>
    );
  } else {
    firstLine = <Trans>You’ll need some {wrappedNativeTokenSymbol} in your account to withdraw funds.</Trans>;
  }

  if (hasWeth) {
    secondLine = (
      <Trans>
        Please <DepositButton>deposit</DepositButton> or <SwapButton>swap</SwapButton> to get {wrappedNativeTokenSymbol}
        .
      </Trans>
    );
  } else {
    secondLine = (
      <Trans>
        Please <SwapButton>swap</SwapButton> to get {wrappedNativeTokenSymbol}.
      </Trans>
    );
  }

  return (
    <AlertInfoCard type="warning" className="my-4">
      {firstLine}
      <br />
      {secondLine}
    </AlertInfoCard>
  );
}
