import TokenIcon from '@/components/Common/TokenIcon/TokenIcon';
import cx from 'classnames';

type Props = {
  displaySize: number;
  symbol?: string;
  className?: string;
  importSize?: 24 | 40;
  name?: string;
};

export default function TokenWithIcon({
  symbol,
  className,
  importSize,
  displaySize,
  name,
}: Props) {
  const classNames = cx(
    'inline-flex items-center whitespace-nowrap align-bottom',
    className
  );

  if (!symbol) return <></>;
  return (
    <span className={classNames}>
      <TokenIcon
        className="mr-2"
        symbol={symbol}
        importSize={importSize}
        displaySize={displaySize}
      />
      {name || symbol}
    </span>
  );
}
