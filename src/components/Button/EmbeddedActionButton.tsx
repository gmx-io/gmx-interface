import cx from "classnames";
import type { ButtonHTMLAttributes } from "react";

export function EmbeddedActionButton({
  className,
  tone = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "default" | "link" }) {
  return (
    <button
      type="button"
      className={cx(
        "bg-transparent text-body-small relative z-[1] inline-flex cursor-pointer touch-manipulation select-none border-0 p-0 text-left underline decoration-1 underline-offset-2 focus-visible:rounded-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-strong",
        tone === "link"
          ? "text-blue-strong decoration-blue-strong hover:text-blue-secondary hover:decoration-blue-secondary"
          : "text-textIcon-secondary decoration-textIcon-secondary hover:text-textIcon-primary hover:decoration-textIcon-primary focus-visible:text-textIcon-primary focus-visible:decoration-textIcon-primary",
        className
      )}
      {...props}
    />
  );
}
