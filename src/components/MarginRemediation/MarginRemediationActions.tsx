import { Trans } from "@lingui/macro";
import type { CSSProperties, PropsWithChildren } from "react";

import { getNetworkFeatures } from "config/features";
import {
  usePositionEditorOpenAtPrice,
  usePositionEditorOpenDepositNow,
} from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import { parsePositionKey } from "domain/synthetics/positions";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { isSameAddress } from "sdk/utils/address";

import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";

const remediationActionStyle = {
  color: "var(--colorful-banner-accent-color, inherit)",
  textDecorationColor: "currentColor",
} satisfies CSSProperties;

// the dashboard renders other accounts' positions; only the owner can edit margin
function useRemediablePositionKey(positionKey: string | undefined): string | undefined {
  const { account } = useWallet();

  const isRemediable =
    positionKey !== undefined && account !== undefined && isSameAddress(parsePositionKey(positionKey).account, account);

  return isRemediable ? positionKey : undefined;
}

export function DepositMarginNowAction({
  positionKey,
  children,
}: PropsWithChildren<{ positionKey: string | undefined }>) {
  const { networkId } = useChainId();
  const openDepositNow = usePositionEditorOpenDepositNow();
  const remediablePositionKey = useRemediablePositionKey(positionKey);

  if (!getNetworkFeatures(networkId).collateralDeposit || remediablePositionKey === undefined) {
    return <>{children}</>;
  }

  return (
    <EmbeddedActionButton
      className="font-medium"
      style={remediationActionStyle}
      onClick={() => openDepositNow(remediablePositionKey)}
    >
      {children}
    </EmbeddedActionButton>
  );
}

export function ReplaceMarginDepositAction({
  positionKey,
  orderKey,
  children,
}: PropsWithChildren<{ positionKey: string | undefined; orderKey: string | undefined }>) {
  const { networkId } = useChainId();
  const openAtPrice = usePositionEditorOpenAtPrice();
  const remediablePositionKey = useRemediablePositionKey(positionKey);

  if (
    !getNetworkFeatures(networkId).collateralDeposit ||
    remediablePositionKey === undefined ||
    orderKey === undefined
  ) {
    return <>{children}</>;
  }

  return (
    <EmbeddedActionButton
      className="font-medium"
      style={remediationActionStyle}
      onClick={() => openAtPrice({ positionKey: remediablePositionKey, replacingOrderKey: orderKey })}
    >
      {children}
    </EmbeddedActionButton>
  );
}

export function LiquidatableIncreaseMessage({ positionKey }: { positionKey: string | undefined }) {
  return (
    <Trans>
      Order may not execute: the resulting position would be liquidatable at the trigger price.{" "}
      <DepositMarginNowAction positionKey={positionKey}>Deposit margin</DepositMarginNowAction> or reduce the order
      size.
    </Trans>
  );
}

export function MarginDepositInsufficientMessage({
  positionKey,
  orderKey,
}: {
  positionKey?: string;
  orderKey?: string;
}) {
  return (
    <Trans>
      This deposit would not leave the position above its liquidation requirement at the trigger price.{" "}
      <ReplaceMarginDepositAction positionKey={positionKey} orderKey={orderKey}>
        Increase the deposit amount
      </ReplaceMarginDepositAction>{" "}
      or move the trigger price farther from the liquidation price.
    </Trans>
  );
}
