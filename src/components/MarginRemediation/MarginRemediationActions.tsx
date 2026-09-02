import { Trans } from "@lingui/macro";
import type { PropsWithChildren } from "react";
import { isAddressEqual, type Address } from "viem";

import {
  usePositionEditorOpenAtPrice,
  usePositionEditorOpenDepositNow,
} from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import { parsePositionKey } from "domain/synthetics/positions";
import useWallet from "lib/wallets/useWallet";

import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";

const remediationActionClassName = "font-medium !text-red-500 !decoration-red-500";

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
  children,
}: PropsWithChildren<{ positionKey: string | undefined }>) {
  const openDepositNow = usePositionEditorOpenDepositNow();
  const remediablePositionKey = useRemediablePositionKey(positionKey);

  if (remediablePositionKey === undefined) {
    return <>{children}</>;
  }

  return (
    <EmbeddedActionButton
      className={remediationActionClassName}
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
  const openAtPrice = usePositionEditorOpenAtPrice();
  const remediablePositionKey = useRemediablePositionKey(positionKey);

  if (remediablePositionKey === undefined || orderKey === undefined) {
    return <>{children}</>;
  }

  return (
    <EmbeddedActionButton
      className={remediationActionClassName}
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
      or move the trigger farther from liquidation.
    </Trans>
  );
}
