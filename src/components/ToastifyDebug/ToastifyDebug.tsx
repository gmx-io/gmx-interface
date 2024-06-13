import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useState } from "react";

async function copy(raw: string) {
  const text = typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
}

export function ToastifyDebug(props: { error: string }) {
  const [open, setOpen] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await copy(props.error);
    setHasCopied(true);
  }, [props.error]);

  return (
    <div className="text-12 opacity-70">
      <div className="flex gap-10">
        <span className="inline-block cursor-pointer border-b border-dashed" onClick={() => setOpen((old) => !old)}>
          {open ? <Trans>Hide error</Trans> : <Trans>Show error</Trans>}
        </span>
        <span
          className={cx("inline-block cursor-pointer border-b border-dashed", {
            "text-green-500": hasCopied,
          })}
          onClick={handleCopy}
        >
          {hasCopied ? <Trans>Copied</Trans> : <Trans>Copy error</Trans>}
        </span>
      </div>
      {open && <div className="mb-8 mt-4 max-h-[200px] overflow-auto">{props.error}</div>}
    </div>
  );
}
