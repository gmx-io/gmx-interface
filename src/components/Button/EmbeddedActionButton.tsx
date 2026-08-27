import cx from "classnames";
import type { ButtonHTMLAttributes } from "react";

export function EmbeddedActionButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx(
        "bg-transparent relative z-[1] inline-flex cursor-pointer touch-manipulation select-none border-0 p-0 text-left text-13 text-gray-400 underline decoration-gray-400 decoration-1 underline-offset-2 hover:text-typography-primary hover:decoration-typography-primary focus-visible:rounded-2 focus-visible:text-typography-primary focus-visible:decoration-typography-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300",
        className
      )}
      {...props}
    />
  );
}
