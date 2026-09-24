import { BN_TWO, ONE_USD } from '@/config/constants';
import { BN } from '@coral-xyz/anchor';

export function getTradeLeverageSliderMarks(maxLeverage: BN) {
  const allowedLeverage = maxLeverage.div(ONE_USD).div(BN_TWO).toNumber();

  if (allowedLeverage >= 125) {
    return [0.1, , 2, 5, 10, 25, 50, 75, 100, allowedLeverage];
  } else if (allowedLeverage >= 120) {
    return [0.1, 1, 2, 5, 10, 15, 30, 60, 90, 120];
  } else if (allowedLeverage >= 110) {
    return [0.1, 1, 2, 5, 10, 25, 50, 75, 100, 110];
  } else if (allowedLeverage >= 100) {
    return [0.1, 1, 2, 5, 10, 15, 25, 50, 75, 100];
  } else if (allowedLeverage >= 90) {
    return [0.1, 1, 2, 5, 10, 15, 30, 60, 90];
  } else if (allowedLeverage >= 80) {
    return [0.1, 1, 2, 5, 10, 15, 30, 60, 80];
  } else if (allowedLeverage >= 75) {
    return [0.1, 1, 2, 5, 10, 15, 30, 50, 75];
  } else if (allowedLeverage >= 70) {
    return [0.1, 1, 2, 5, 10, 15, 30, 50, 70];
  } else if (allowedLeverage >= 60) {
    return [0.1, 1, 2, 5, 10, 15, 25, 50, 60];
  } else if (allowedLeverage >= 50) {
    return [0.1, 1, 2, 5, 10, 15, 25, 50];
  } else if (allowedLeverage >= 30) {
    return [0.1, 1, 2, 5, 10, 15, 30];
  } else {
    return [0.1, 1, 2, 5, 10];
  }
}
