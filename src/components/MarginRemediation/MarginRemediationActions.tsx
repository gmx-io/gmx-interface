import { Trans } from "@lingui/macro";
import type { PropsWithChildren } from "react";

import {
  usePositionEditorOpenAtPrice,
  usePositionEditorOpenDepositNow,
} from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import { parsePositionKey } from "domain/synthetics/positions";
import useWallet from "lib/wallets/useWallet";

import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";

/** The remediation must never open the editor for a position the connected wallet cannot edit. */
function useRemediablePositionKey(positionKey: string | undefined): string | undefined {
  const { account } = useWallet();

  const isRemediable =
    positionKey !== undefined && account !== undefined && parsePositionKey(positionKey).account === account;

  return isRemediable ? positionKey : undefined;
}

/**
 * Margin-remediation phrase that opens `Edit margin` → `Deposit` → `Now` for the position.
 * Renders plain text when the position cannot be resolved for the connected wallet.
 */
export function DepositMarginNowAction({
  positionKey,
  children,
}: PropsWithChildren<{ positionKey: string | undefined }>) {
  const openDepositNow = usePositionEditorOpenDepositNow();
  const remediablePositionKey = useRemediablePositionKey(positionKey);

  if (remediablePositionKey === undefined) {
    return <>{children}</>;
  }

  return <EmbeddedActionButton onClick={() => openDepositNow(remediablePositionKey)}>{children}</EmbeddedActionButton>;
}

/**
 * Remediation phrase for an existing conditional margin deposit that opens the `At price`
 * replace flow bound to that order, prefilled with its deposit amount and trigger price.
 * Renders plain text when the position or order cannot be resolved for the connected wallet.
 */
export function ReplaceMarginDepositAction({
  positionKey,
  orderKey,
  children,
}: PropsWithChildren<{ positionKey: string | undefined; orderKey: string | undefined }>) {
  const openAtPrice = usePositionEditorOpenAtPrice();
  const remediablePositionKey = useRemediablePositionKey(positionKey);

  if (remediablePositionKey === undefined || orderKey === undefined) {
    return <>{children}</>;
  }

  return (
    <EmbeddedActionButton
      onClick={() => openAtPrice({ positionKey: remediablePositionKey, replacingOrderKey: orderKey })}
    >
      {children}
    </EmbeddedActionButton>
  );
}

/** Shared liquidatable-at-trigger copy; the phrase opens the deposit-now flow when the position resolves. */
export function LiquidatableIncreaseMessage({ positionKey }: { positionKey: string | undefined }) {
  return (
    <Trans>
      Order may not execute: the resulting position would be liquidatable at the trigger price.{" "}
      <DepositMarginNowAction positionKey={positionKey}>Deposit margin</DepositMarginNowAction> or reduce the order
      size.
    </Trans>
  );
}

/** Shared insufficient-deposit copy; actionable only where the replaced order is bound. */
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
      or move the trigger farther from liquidation.
    </Trans>
  );
}
