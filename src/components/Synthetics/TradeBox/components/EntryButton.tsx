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
        "inline-flex items-center justify-center rounded-4 border-none p-5 opacity-70",
        "disabled:cursor-not-allowed disabled:bg-cold-blue-900 disabled:text-slate-500",
        !props.disabled && "hover:opacity-100 disabled:hover:opacity-70",
        !props.disabled && (theme === "green" ? "bg-green-500/15 text-[#5EC989]" : "bg-red-500/15 text-[#E74E5D]"),
        className
      )}
    />
  );
}
