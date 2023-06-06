import { importImage } from "lib/legacy";
import { ReactNode } from "react";

function getIconUrlPath(symbol, size: 24 | 40) {
  if (!symbol || !size) return;
  return `ic_${symbol.toLowerCase()}_${size}.svg`;
}

type Props = {
  symbol: string;
  displySize: number;
  importSize: 24 | 40;
  className?: string;
  children: ReactNode;
};

function TokenIcon({ className, symbol, displySize, importSize }: Props) {
  const iconPath = getIconUrlPath(symbol, importSize);
  if (!iconPath) return "";
  return <img className={className} src={importImage(iconPath)} alt={symbol} width={displySize} />;
}

export default TokenIcon;
