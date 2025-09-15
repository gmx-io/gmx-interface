import cx from "classnames";

type Props = {
  children: React.ReactNode;
  lastCompleted?: boolean;
};

export function Quarter({ children, lastCompleted }: Props) {
  return (
    <div
      className={cx(
        "group relative flex w-auto flex-shrink-0 flex-grow flex-col gap-16 py-28 pr-28 last:mr-8 sm:w-[282px] sm:pr-48",
        {
          "is-last-completed": lastCompleted,
        }
      )}
    >
      {lastCompleted && (
        <div className="absolute -right-9 -top-[7.5px] z-20 size-16 rounded-full border-1/2 border-blue-400" />
      )}
      <div className="absolute left-0 top-0 h-1 w-full bg-slate-600 group-[.is-last-completed]:bg-gradient-to-r group-[.is-last-completed]:from-slate-600 group-[.is-last-completed]:to-blue-400" />
      <div className="absolute -top-[3.5px] left-0 hidden size-8 rounded-full bg-slate-600 group-first:block" />
      <div className="absolute -right-5 -top-[3.5px] z-20 size-8 rounded-full bg-slate-600 group-[.is-last-completed]:bg-blue-400" />
      <div className="leading-heading-md flex flex-col gap-8 text-16 font-medium -tracking-[0.768px] group-[.is-last-completed]:text-slate-600 group-has-[~.is-last-completed]:text-slate-600 md:text-24">
        {children}
      </div>
    </div>
  );
}
