import { ReactNode, forwardRef, memo, useCallback, useMemo, ChangeEvent } from "react";
import cx from "classnames";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

interface InputRowProps {
  value: string;
  setValue: (value: string) => void;
  label: string;
  symbol?: string;
  description: ReactNode;
  placeholder: string;
  negativeSign?: boolean;
  inputTooltip?: ReactNode;
}

const InputBase = forwardRef<
  HTMLInputElement,
  {
    value: string;
    setValue: (value: string) => void;
    symbol: string;
    placeholder: string;
    negativeSign: boolean;
    tooltip?: ReactNode;
  }
>(({ value, setValue, symbol, placeholder, negativeSign, tooltip }, ref) => {
  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    },
    [setValue]
  );
  const id = useMemo(() => `input-${Math.random()}`, []);

  return (
    <div className="relative">
      <div className="rounded-sm flex border border-slate-700 bg-cold-blue-700 focus-within:border-cold-blue-500 hover:border-cold-blue-700">
        {negativeSign && <span className="ml-[3px] flex items-center">-</span>}
        <input
          ref={ref}
          placeholder={placeholder}
          onChange={onChange}
          id={id}
          value={value}
          className="rounded bg-transparent text-align-right w-60 px-[0.5rem] py-[0.2rem] pb-[0.35rem] text-14 outline-none"
        />
        <label htmlFor={id} className="flex w-60 cursor-pointer select-none items-center justify-end pr-4">
          <span className="opacity-70">{symbol}</span>
        </label>
      </div>
      {tooltip && <div className="text-xs text-slate-400 absolute right-0 mt-1">{tooltip}</div>}
    </div>
  );
});

const InputRowBase = forwardRef<HTMLInputElement, InputRowProps>(
  ({ value, setValue, label, symbol = "", description, placeholder, negativeSign = false, inputTooltip }, ref) => {
    const renderTooltipContent = useCallback(() => description, [description]);

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="mr-4 text-14">
            <TooltipWithPortal position="top-start" handle={label} renderContent={renderTooltipContent} />
          </div>
          <Input
            ref={ref}
            negativeSign={negativeSign}
            placeholder={placeholder}
            tooltip={inputTooltip}
            value={value}
            setValue={setValue}
            symbol={symbol}
          />
        </div>
      </div>
    );
  }
);

export const InputRow = memo(InputRowBase);
export const Input = memo(InputBase);
