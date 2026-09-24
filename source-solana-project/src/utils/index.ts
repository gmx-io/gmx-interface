import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { PublicKey } from '@solana/web3.js';
import { createHash } from 'crypto';
import { createAvatar } from '@dicebear/core';
import * as shapes from '@dicebear/shapes';

dayjs.extend(utc);

type AccountInfo = {
  avator: string;
  nickName: string;
};

const AVATAR_COLOR_OPTIONS = {
  backgroundColor: ['A3A3A3', 'FFE4D6', 'FA7B4E', '676767', '905A48', 'E6552A'],
  shape1Color: ['A3A3A3', 'FFE4D6', 'FA7B4E', '676767', '905A48', 'E6552A'],
  shape2Color: [
    'A3A3A3',
    'FFE4D6',
    'FA7B4E',
    '676767',
    '905A48',
    '594F4A',
    'E6552A',
  ],
  shape3Color: [
    'A3A3A3',
    'FFE4D6',
    'FA7B4E',
    '676767',
    '905A48',
    '594F4A',
    'E6552A',
  ],
} as const;

type AvatarColorLayer = keyof typeof AVATAR_COLOR_OPTIONS;

const accountInfoCache = new Map<string, AccountInfo>();

function getHashNumber(value: string): number {
  return parseInt(
    createHash('sha256').update(value.toLowerCase()).digest('hex').slice(0, 8),
    16
  );
}

function pickAvatarColors(address: string): Record<AvatarColorLayer, string> {
  const usedColors = new Set<string>();
  const colors = {} as Record<AvatarColorLayer, string>;

  (
    Object.entries(AVATAR_COLOR_OPTIONS) as Array<
      [AvatarColorLayer, readonly string[]]
    >
  ).forEach(([layer, options], layerIndex) => {
    const availableColors = options.filter((color) => !usedColors.has(color));
    const colorPool = availableColors.length > 0 ? availableColors : options;
    const color =
      colorPool[
        getHashNumber(`${address}:${layer}:${layerIndex}`) % colorPool.length
      ];

    colors[layer] = color;
    usedColors.add(color);
  });

  return colors;
}

function generateAvatarDataUri(address: string): string {
  const colors = pickAvatarColors(address);

  return createAvatar(shapes, {
    seed: address,
    shape2: ['ellipse', 'ellipseFilled', 'line'],
    backgroundColor: [colors.backgroundColor],
    shape1Color: [colors.shape1Color],
    shape2Color: [colors.shape2Color],
    shape3Color: [colors.shape3Color],
  }).toDataUri();
}

function normalizeDate(date: number): Date {
  return dayjs(date).utc().startOf('day').toDate();
}

export function getDatesBetween(startDate: number, endDate: number): Date[] {
  const dates: Date[] = [];
  let currentDate = dayjs(normalizeDate(startDate));
  const stopDate = dayjs(normalizeDate(endDate));

  while (currentDate.isSame(stopDate) || currentDate.isBefore(stopDate)) {
    dates.push(currentDate.toDate());
    currentDate = currentDate.add(1, 'day');
  }

  return dates;
}

export function generateAccountInfo(address: string): AccountInfo {
  const cachedAccountInfo = accountInfoCache.get(address);

  if (cachedAccountInfo) {
    return cachedAccountInfo;
  }

  const accountInfo = {
    avator: generateAvatarDataUri(address),
    nickName: generateUniqueNickname(address), // generateNickname(address),
  };

  accountInfoCache.set(address, accountInfo);

  return accountInfo;
}

export function generateNickname(address: string | PublicKey = ''): string {
  const adjectives = [
    'Cool',
    'Brave',
    'Swift',
    'Lucky',
    'Bright',
    'Bold',
    'Clever',
    'Happy',
    'Wise',
    'Vivid',
    'Gentle',
    'Fierce',
    'Calm',
    'Shiny',
    'Quick',
    'Strong',
  ];
  const nouns = [
    'Star',
    'Whale',
    'Eagle',
    'Tiger',
    'Cloud',
    'River',
    'Moon',
    'Flame',
    'Sky',
    'Wolf',
    'Tree',
    'Stone',
    'Wave',
    'Hill',
    'Dawn',
    'Peak',
  ];
  const addressString = address.toString();
  const hash = createHash('sha256')
    .update(addressString.toLowerCase())
    .digest('hex');

  const adjIndex = parseInt(hash.slice(0, 8), 16) % adjectives.length;
  const nounIndex = parseInt(hash.slice(8, 16), 16) % nouns.length;
  const number = parseInt(hash.slice(16, 20), 16) % 1000; // 0-999

  return `${adjectives[adjIndex]}${nouns[nounIndex]}${number}`;
}

export function generateUniqueNickname(
  uniqueValue: string | number | PublicKey = ''
): string {
  // Convert input to string
  const input = String(uniqueValue);

  // Simple hash function to convert string to number
  const hashString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  };

  // Adjectives pool
  const adjectives = [
    'brave',
    'clever',
    'cute',
    'gentle',
    'bright',
    'sunny',
    'mysterious',
    'elegant',
    'charming',
    'happy',
    'calm',
    'wise',
    'witty',
    'kind',
    'pure',
    'warm',
    'cool',
    'bold',
    'delicate',
    'strong',
    'soft',
    'swift',
    'sweet',
    'fresh',
    'dreamy',
    'classic',
    'modern',
    'free',
    'unique',
    'special',
    'simple',
    'amazing',
    'perfect',
    'bright',
    'dark',
    'light',
    'hot',
    'cold',
    'flying',
    'running',
    'jumping',
    'dancing',
    'singing',
    'laughing',
    'smiling',
    'shining',
    'sparkling',
    'glowing',
    'flowing',
    'floating',
    'ancient',
    'cosmic',
    'magic',
    'royal',
    'noble',
    'fierce',
    'peaceful',
    'wild',
    'tender',
    'jolly',
    'lucky',
    'golden',
    'silver',
    'crystal',
    'diamond',
    'emerald',
    'ruby',
    'sapphire',
    'crimson',
    'azure',
  ];

  // Nouns pool
  const nouns = [
    'star',
    'moon',
    'sun',
    'rainbow',
    'cloud',
    'rain',
    'snow',
    'flower',
    'leaf',
    'butterfly',
    'bird',
    'cat',
    'dog',
    'rabbit',
    'panda',
    'tiger',
    'lion',
    'elephant',
    'dolphin',
    'whale',
    'mountain',
    'river',
    'ocean',
    'forest',
    'meadow',
    'desert',
    'island',
    'waterfall',
    'lake',
    'stream',
    'diamond',
    'pearl',
    'gem',
    'crystal',
    'gold',
    'silver',
    'emerald',
    'ruby',
    'amber',
    'coral',
    'music',
    'paint',
    'poem',
    'story',
    'dream',
    'hope',
    'miracle',
    'legend',
    'fairy',
    'myth',
    'spring',
    'summer',
    'autumn',
    'winter',
    'morning',
    'noon',
    'evening',
    'night',
    'dawn',
    'sunset',
    'coffee',
    'tea',
    'cake',
    'candy',
    'honey',
    'lemon',
    'apple',
    'cherry',
    'peach',
    'berry',
    'kite',
    'balloon',
    'ship',
    'castle',
    'garden',
    'house',
    'bridge',
    'tower',
    'temple',
    'palace',
    'fairy',
    'angel',
    'unicorn',
    'phoenix',
    'dragon',
    'wizard',
    'knight',
    'prince',
    'princess',
    'hero',
    'wave',
    'flame',
    'breeze',
    'thunder',
    'lightning',
    'comet',
    'meteor',
    'galaxy',
    'cosmos',
    'universe',
  ];

  // Generate hash from input
  const hash = hashString(input);

  // Use hash to select words consistently
  const adjectiveIndex = hash % adjectives.length;
  const nounIndex = Math.floor(hash / adjectives.length) % nouns.length;

  const adjective = adjectives[adjectiveIndex];
  const noun = nouns[nounIndex];

  // Capitalize first letter of each word
  const capitalizedAdjective =
    adjective.charAt(0).toUpperCase() + adjective.slice(1);
  const capitalizedNoun = noun.charAt(0).toUpperCase() + noun.slice(1);

  return `${capitalizedAdjective}${capitalizedNoun}`;
}

export const formatTime = (timestamp: number): string => {
  const now = dayjs.utc().unix();
  const diff = now - timestamp;

  if (diff < 60) {
    return `${diff}s ago`;
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diff / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};

export function calculateDaysBetweenDates(date1: string, date2: string) {
  const d1 = dayjs(date1);
  const d2 = dayjs(date2);
  const daysDifference = d2.diff(d1, 'day');
  return Math.abs(daysDifference);
}

// get recent days
export function getRecentDays(num: number = 30): string[] {
  const today = dayjs.utc();
  const dateList: string[] = [];

  for (let i = 0; i < num; i++) {
    const date = today.subtract(i, 'day');
    dateList.push(date.format('YYYY-MM-DD'));
  }

  return dateList;
}
