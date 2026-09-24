export function shortenAddressOrEns(
  address: string,
  length: number,
  padStart: number = 1
) {
  if (!length) {
    return '';
  }
  if (!address) {
    return address;
  }
  if (address.length < 10) {
    return address;
  }
  if (length >= address.length) {
    return address;
  }
  const left = Math.floor((length - 3) / 2) + (padStart || 0);
  return (
    address.substring(0, left) +
    '...' +
    address.substring(address.length - (length - (left + 3)), address.length)
  );
}
