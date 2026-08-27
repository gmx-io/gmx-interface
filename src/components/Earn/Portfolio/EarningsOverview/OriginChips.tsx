import { Trans } from "@lingui/macro";

import { getChainName, GMX_ACCOUNT_PSEUDO_CHAIN_ID, type GmxAccountPseudoChainId } from "config/chains";
import { getChainIcon } from "config/icons";
import type { AnyChainId } from "sdk/configs/chains";

export type EarningsOrigin = AnyChainId | GmxAccountPseudoChainId;

function OriginIcon({ origin }: { origin: EarningsOrigin }) {
  return <img className="size-16 rounded-full" src={getChainIcon(origin)} alt={getOriginName(origin)} />;
}

function getOriginName(origin: EarningsOrigin): string {
  return origin === GMX_ACCOUNT_PSEUDO_CHAIN_ID ? "GMX Account" : getChainName(origin);
}

export function OriginChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-body-small flex items-center gap-4 rounded-full bg-slate-700 px-6 py-2 font-medium text-typography-secondary">
      {children}
    </span>
  );
}

export function OriginChips({ origins }: { origins: EarningsOrigin[] }) {
  if (origins.length === 0) {
    return null;
  }

  if (origins.length === 1) {
    const origin = origins[0];
    return (
      <OriginChip>
        <OriginIcon origin={origin} />
        {origin === GMX_ACCOUNT_PSEUDO_CHAIN_ID ? <Trans>GMX Account</Trans> : getOriginName(origin)}
      </OriginChip>
    );
  }

  const chainOrigins = origins.filter((origin) => origin !== GMX_ACCOUNT_PSEUDO_CHAIN_ID);
  const hasGmxAccount = origins.some((origin) => origin === GMX_ACCOUNT_PSEUDO_CHAIN_ID);

  return (
    <div className="flex items-center gap-4">
      {chainOrigins.length > 0 && (
        <div className="flex items-center">
          {chainOrigins.map((origin, index) => (
            <span key={origin} className={index > 0 ? "-ml-4" : undefined}>
              <OriginIcon origin={origin} />
            </span>
          ))}
        </div>
      )}
      {hasGmxAccount && (
        <OriginChip>
          <OriginIcon origin={GMX_ACCOUNT_PSEUDO_CHAIN_ID} />
          <Trans>GMX Account</Trans>
        </OriginChip>
      )}
    </div>
  );
}
