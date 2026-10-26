import { Trans } from "@lingui/macro";
import type { CSSProperties, PropsWithChildren } from "react";
import { isAddressEqual, type Address } from "viem";

import {
  usePositionEditorOpenAtPrice,
  usePositionEditorOpenDepositNow,
} from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import { parsePositionKey } from "domain/synthetics/positions";
import useWallet from "lib/wallets/useWallet";

import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";
import { TooltipAction } from "components/Tooltip/TooltipBlocks";

const remediationActionStyle = {
  color: "var(--colorful-banner-accent-color, inherit)",
  textDecorationColor: "currentColor",
} satisfies CSSProperties;

// the dashboard renders other accounts' positions; only the owner can edit margin
function useRemediablePositionKey(positionKey: string | undefined): string | undefined {
  const { account } = useWallet();

  const isRemediable =
    positionKey !== undefined &&
    account !== undefined &&
    isAddressEqual(parsePositionKey(positionKey).account as Address, account);

  return isRemediable ? positionKey : undefined;
}

export function DepositMarginNowAction({
  positionKey,
  isTooltipLine,
  children,
}: PropsWithChildren<{ positionKey: string | undefined; isTooltipLine?: boolean }>) {
  const openDepositNow = usePositionEditorOpenDepositNow();
  const remediablePositionKey = useRemediablePositionKey(positionKey);

  if (remediablePositionKey === undefined) {
    return isTooltipLine ? null : <>{children}</>;
  }

  return (
    <RemediationAction isTooltipLine={isTooltipLine} onClick={() => openDepositNow(remediablePositionKey)}>
      {children}
    </RemediationAction>
  );
}

export function ReplaceMarginDepositAction({
  positionKey,
  orderKey,
  isTooltipLine,
  children,
}: PropsWithChildren<{ positionKey: string | undefined; orderKey: string | undefined; isTooltipLine?: boolean }>) {
  const openAtPrice = usePositionEditorOpenAtPrice();
  const remediablePositionKey = useRemediablePositionKey(positionKey);

  if (remediablePositionKey === undefined || orderKey === undefined) {
    return isTooltipLine ? null : <>{children}</>;
  }

  return (
    <RemediationAction
      isTooltipLine={isTooltipLine}
      onClick={() => openAtPrice({ positionKey: remediablePositionKey, replacingOrderKey: orderKey })}
    >
      {children}
    </RemediationAction>
  );
}

function RemediationAction({
  isTooltipLine,
  onClick,
  children,
}: PropsWithChildren<{ isTooltipLine: boolean | undefined; onClick: () => void }>) {
  if (isTooltipLine) {
    return <TooltipAction onClick={onClick}>{children}</TooltipAction>;
  }

  return (
    <EmbeddedActionButton className="font-medium" style={remediationActionStyle} onClick={onClick}>
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
