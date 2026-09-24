import { SUPPORT_CHAT_USER_ID_KEY } from './constants';

export function getSupportChatNetwork(genesisHash?: string): string | undefined {
  switch (genesisHash) {
    case '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d':
      return 'Solana Mainnet';
    case 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG':
      return 'Solana Devnet';
    case '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY':
      return 'Solana Testnet';
    default:
      return undefined;
  }
}

export function getOrCreateSupportChatUserId(): string {
  const existingUserId = localStorage.getItem(SUPPORT_CHAT_USER_ID_KEY);
  if (existingUserId) {
    return existingUserId;
  }

  const userId = crypto.randomUUID();
  localStorage.setItem(SUPPORT_CHAT_USER_ID_KEY, userId);

  return userId;
}
