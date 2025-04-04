export const DEFAULT_TWAP_NUMBER_OF_PARTS = 5;
export const MIN_TWAP_NUMBER_OF_PARTS = 2;
export const MAX_TWAP_NUMBER_OF_PARTS = 30;

export const changeTWAPNumberOfPartsValue = (value: number) => {
  if (value < MIN_TWAP_NUMBER_OF_PARTS) {
    return MIN_TWAP_NUMBER_OF_PARTS;
  }
  if (value > MAX_TWAP_NUMBER_OF_PARTS) {
    return MAX_TWAP_NUMBER_OF_PARTS;
  }
  if (isNaN(value)) {
    return DEFAULT_TWAP_NUMBER_OF_PARTS;
  }

  return value;
};
