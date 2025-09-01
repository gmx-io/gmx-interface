import SuggestionInput from "components/SuggestionInput/SuggestionInput";

export const ValueInput = ({
  value,
  onChange,
  label,
  onBlur,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  label?: string;
  className?: string;
}) => {
  const onValueChange = (value: string) => {
    const parsedValue = parseInt(value);

    if (isNaN(parsedValue)) {
      onChange(0);
    } else {
      onChange(parsedValue);
    }
  };

  return (
    <SuggestionInput
      label={label}
      className={className}
      value={value.toString()}
      setValue={onValueChange}
      onBlur={onBlur}
    />
  );
};
