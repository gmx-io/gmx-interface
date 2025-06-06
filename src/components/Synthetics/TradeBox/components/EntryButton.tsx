import cx from "classnames";

export function EntryButton({
  theme,
  className,
  ...props
}: { theme: "green" | "red" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex items-center justify-center rounded-4 border-none p-4 opacity-70 text-[12px]",
        "disabled:cursor-not-allowed disabled:bg-button-primaryDisabled disabled:text-textIcon-disabled",
        !props.disabled && "hover:opacity-100 disabled:hover:opacity-70",
        !props.disabled && (theme === "green" ? "bg-green-500/15 text-[#5EC989]" : "bg-red-500/15 text-[#E74E5D]"),
        className
      )}
    />
  );
}
