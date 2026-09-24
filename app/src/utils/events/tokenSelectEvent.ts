export interface TokenSelectEventDetail {
  indexToken: string;
  symbol?: string;
  price?: string;
  volume24h?: string;
  openInterest?: string;
  availableLiquidity?: string;
  netRate?: string;
  lpLong?: string;
  lpShort?: string;
  maxLeverage?: string;
  percentChange24h?: string;
  [key: string]: any;
}

export const TOKEN_SELECT_EVENT = 'token-select-event';

export function emitTokenSelectEvent(token: TokenSelectEventDetail) {
  const event = new CustomEvent(TOKEN_SELECT_EVENT, {
    detail: token,
  });
  window.dispatchEvent(event);
}

export function onTokenSelect(
  callback: (token: TokenSelectEventDetail) => void
): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<TokenSelectEventDetail>;
    callback(customEvent.detail);
  };

  window.addEventListener(TOKEN_SELECT_EVENT, handler);

  return () => {
    window.removeEventListener(TOKEN_SELECT_EVENT, handler);
  };
}
