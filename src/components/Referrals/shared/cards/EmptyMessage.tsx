import Tooltip from "components/Tooltip/Tooltip";

type Props = {
  message?: string;
  tooltipText?: string;
};

export function EmptyMessage({ message = "", tooltipText }: Props) {
  return (
    <div className="text-body-medium flex flex-col items-center justify-center rounded-8 bg-slate-900 px-6 py-12 text-slate-100">
      {tooltipText ? <Tooltip handle={message} position="top" content={tooltipText} /> : <p>{message}</p>}
    </div>
  );
}
