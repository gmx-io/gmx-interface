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
    <div className="m-12 mb-4 flex items-center justify-between gap-8 rounded-8 border border-stroke-primary bg-fill-background/50 px-12 py-6">
      <div className="text-body-small flex items-center gap-8">
        {indexName !== undefined && tokenSymbol !== undefined && isLong !== undefined ? (
          <MarketWithDirectionLabel indexName={indexName} isLong={isLong} tokenSymbol={tokenSymbol} />
        ) : null}
        {count !== undefined ? (
          <>
            <span className="font-medium text-textIcon-inactive">·</span>
            <span className="text-textIcon-secondary">
              <Plural value={count} one="# action in this lifecycle" other="# actions in this lifecycle" />
            </span>
          </>
        ) : null}
      </div>
      <Button
        className="size-24 !p-0"
        size="controlled"
        variant="ghost"
        onClick={onClear}
        aria-label={t`Clear position history filter`}
      >
        <CloseIcon className="size-16" />
      </Button>
    </div>
  );
}
