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
    <div className="m-12 mb-4 bg-slate-950/50 flex items-center justify-between gap-8 rounded-8 border border-slate-600 py-6 px-12">
      <div className="flex items-center gap-8 text-12">
        {indexName !== undefined && tokenSymbol !== undefined && isLong !== undefined ? (
          <MarketWithDirectionLabel indexName={indexName} isLong={isLong} tokenSymbol={tokenSymbol} />
        ) : null}
        {count !== undefined ? (
          <>
            <span className="text-typography-inactive font-medium">·</span>
            <span className="text-typography-secondary">
              <Plural value={count} one="# action in this lifecycle" other="# actions in this lifecycle" />
            </span>
          </>
        ) : null}
      </div>
      <Button className="!p-0 !px-4 !h-22 !min-h-22" variant="ghost" onClick={onClear} aria-label={t`Clear position history filter`}>
        <CloseIcon className="size-16" />
      </Button>
    </div>
  );
}
