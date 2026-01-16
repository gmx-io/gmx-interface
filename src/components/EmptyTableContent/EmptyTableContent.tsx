import { Trans } from "@lingui/macro";
import type { ReactNode } from "react";

export function EmptyTableContent({
  isLoading,
  isEmpty,
  emptyText = <Trans>No items yet</Trans>,
}: {
  isLoading: boolean;
  isEmpty: boolean;
  emptyText?: ReactNode;
}) {
  if (!isLoading && !isEmpty) return null;

  return (
    <div className="flex min-h-[164px] w-full grow items-center justify-center bg-slate-900 text-[13px] text-typography-secondary">
      {isLoading ? <Trans>Loading...</Trans> : isEmpty ? emptyText : null}
    </div>
  );
}
