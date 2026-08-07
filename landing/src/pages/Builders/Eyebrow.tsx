import cx from "classnames";

type Props = {
  children: React.ReactNode;
  gradient?: boolean;
};

export function Eyebrow({ children, gradient }: Props) {
  return (
    <span
      className={cx(
        "inline-flex h-24 w-fit items-center rounded-full bg-blue-300/20 px-6 text-16 font-medium -tracking-[0.512px]",
        !gradient && "text-blue-400"
      )}
    >
      {gradient ? (
        <span className="text-transparent bg-gradient-to-r from-[#90ADF9] to-[#84A0FA] bg-clip-text">{children}</span>
      ) : (
        children
      )}
    </span>
  );
}
