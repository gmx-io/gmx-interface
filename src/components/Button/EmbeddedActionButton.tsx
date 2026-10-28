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
        "bg-transparent relative z-[1] inline-flex cursor-pointer touch-manipulation select-none border-0 p-0 text-left text-13 underline decoration-1 underline-offset-2 focus-visible:rounded-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300",
        tone === "link"
          ? "text-blue-300 decoration-blue-300 hover:text-blue-100 hover:decoration-blue-100"
          : "text-gray-400 decoration-gray-400 hover:text-typography-primary hover:decoration-typography-primary focus-visible:text-typography-primary focus-visible:decoration-typography-primary",
        className
      )}
      {...props}
    />
  );
}
