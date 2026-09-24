import { getGmw113Enabled } from '@/config/featureFlagEnable';
import { IC_ICONS } from '@/config/tokens';
import manifest from 'cryptocurrency-icons/manifest.json';

function symbolExists(symbol: string): boolean {
  return manifest.some(
    (icon) => icon.symbol.toLocaleLowerCase() === symbol.toLowerCase()
  );
}

export function getIconUrlPath(symbol: string, size: 24 | 40) {
  if (!symbol || !size) return;
  const lowerCaseSymbol = symbol.toLocaleLowerCase();
  
  const icPath = new URL(
    `../../img/ic_${lowerCaseSymbol}_${size}${(
      lowerCaseSymbol.startsWith('glv') && !getGmw113Enabled()
    ) ? '_backup' : ''}.svg`,
    import.meta.url
  ).href;

  return IC_ICONS.includes(lowerCaseSymbol)
    ? icPath
    : symbolExists(lowerCaseSymbol)
      ? `/icons/${lowerCaseSymbol}.svg`
      : `/icons/generic.svg`;
}
