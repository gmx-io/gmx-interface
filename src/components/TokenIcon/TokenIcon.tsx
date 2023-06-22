import { importImage } from "lib/legacy";

function getIconUrlPath(symbol, size: 24 | 40) {
  if (!symbol || !size) return;
  return `ic_${symbol.toLowerCase()}_${size}.svg`;
}

type Props = {
  symbol: string;
  displaySize: number;
  importSize: 24 | 40;
  className?: string;
};

function TokenIcon({ className, symbol, displaySize, importSize }: Props) {
  const iconPath = getIconUrlPath(symbol, importSize);
  if (!iconPath) return <></>;
  return <img className={className} src={importImage(iconPath)} alt={symbol} width={displaySize} />;
}

export default TokenIcon;
