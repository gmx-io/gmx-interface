import cx from "classnames";

type Props = {
  children: React.ReactNode;
  lastCompleted?: boolean;
};

export function Quarter({ children, lastCompleted }: Props) {
  return (
    <div
      className={cx(
        "group relative flex w-auto flex-shrink-0 flex-grow flex-col gap-16 py-24 pr-24 last:mr-8 sm:w-[282px] sm:pr-48",
        {
          "is-last-completed": lastCompleted,
        }
      )}
    >
      {lastCompleted && (
        <div className="border-blue-400 absolute -right-8 -top-8 z-20 size-16 rounded-full border-1/2" />
      )}
      <div className="bg-slate-600 group-[.is-last-completed]:from-slate-600 group-[.is-last-completed]:to-blue-400 absolute left-0 top-0 h-1 w-full group-[.is-last-completed]:bg-gradient-to-r" />
      <div className="bg-slate-600 absolute -top-4 left-0 hidden size-8 rounded-full group-first:block" />
      <div className="bg-slate-600 group-[.is-last-completed]:bg-blue-400 absolute -right-4 -top-4 z-20 size-8 rounded-full" />
      <div className="leading-heading-md group-[.is-last-completed]:text-slate-600 group-has-[~.is-last-completed]:text-slate-600 md:text-24 flex flex-col gap-8 text-16 font-medium -tracking-[0.768px]">
        {children}
      </div>
    </div>
  );
}
