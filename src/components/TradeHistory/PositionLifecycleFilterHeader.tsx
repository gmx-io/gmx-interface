import { Plural, t } from "@lingui/macro";

import Button from "components/Button/Button";
import { MarketWithDirectionLabel } from "components/MarketWithDirectionLabel/MarketWithDirectionLabel";

import CloseIcon from "img/ic_close.svg?react";

export function PositionLifecycleFilterHeader({
  indexName,
  isLong,
  tokenSymbol,
  count,
  onClear,
}: {
  indexName: string | undefined;
  isLong: boolean | undefined;
  tokenSymbol: string | undefined;
  count: number | undefined;
  onClear: () => void;
}) {
  return (
    <div className="m-8 flex items-center justify-between gap-8 rounded-8 border border-slate-600 py-8 pl-16 pr-8">
      <div className="flex items-center gap-8">
        {indexName !== undefined && tokenSymbol !== undefined && isLong !== undefined ? (
          <MarketWithDirectionLabel indexName={indexName} isLong={isLong} tokenSymbol={tokenSymbol} />
        ) : null}
        {count !== undefined ? (
          <>
            <span className="text-typography-secondary">·</span>
            <span className="text-typography-secondary">
              <Plural value={count} one="# action in this lifecycle" other="# actions in this lifecycle" />
            </span>
          </>
        ) : null}
      </div>
      <Button variant="ghost" onClick={onClear} aria-label={t`Clear position history filter`}>
        <CloseIcon className="size-16" />
      </Button>
    </div>
  );
}
