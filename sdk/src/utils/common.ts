export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const TIMEZONE_OFFSET_SEC = -new Date().getTimezoneOffset() * 60;
