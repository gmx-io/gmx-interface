import cx from "classnames";

export function ModalShrinkingContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("flex flex-col rounded-b-4 bg-slate-800 max-[700px]:grow", className)}>{children}</div>;
}
