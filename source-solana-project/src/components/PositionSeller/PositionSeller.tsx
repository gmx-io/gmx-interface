import { PositionSellerConfirmationBox } from '@/components/PositionSeller/PositionSellerConfirmationBox';
import { NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import {
  selectPositionSellerDefaultReceiveTokenAddress,
  selectPositionSellerReceiveTokenAddress,
  selectSetPositionSellerDefaultReceiveTokenAddress,
  selectSetPositionSellerReceiveTokenAddress,
} from '@/selectors/positionSeller/baseSelectors';
import { selectPositionSellerClosingPosition } from '@/selectors/positionSeller/selectPositionSellerClosingPosition';
import { isWrappedNativeToken } from '@/utils/token/isWrappedNativeToken';
import { useAppStore } from '@/zustand/useAppStore';
import { useEffect } from 'react';

export function PositionSeller() {
  const position = useAppStore(selectPositionSellerClosingPosition);

  const defaultReceiveTokenAddress = useAppStore(
    selectPositionSellerDefaultReceiveTokenAddress
  );
  const setDefaultReceiveTokenAddress = useAppStore(
    selectSetPositionSellerDefaultReceiveTokenAddress
  );
  const receiveTokenAddress = useAppStore(
    selectPositionSellerReceiveTokenAddress
  );
  const setReceiveTokenAddress = useAppStore(
    selectSetPositionSellerReceiveTokenAddress
  );

  // Handle setting default receive token address
  useEffect(() => {
    if (!position || defaultReceiveTokenAddress) {
      return;
    }

    if (isWrappedNativeToken(position.collateralTokenAddress)) {
      setDefaultReceiveTokenAddress(NATIVE_TOKEN_ADDRESS.toBase58());
    } else {
      setDefaultReceiveTokenAddress(position.collateralTokenAddress.toBase58());
    }
  }, [position, defaultReceiveTokenAddress, setDefaultReceiveTokenAddress]);

  // Handle setting receive token address
  useEffect(() => {
    if (!defaultReceiveTokenAddress || receiveTokenAddress) {
      return;
    }

    setReceiveTokenAddress(defaultReceiveTokenAddress);
  }, [defaultReceiveTokenAddress, receiveTokenAddress, setReceiveTokenAddress]);

  return <PositionSellerConfirmationBox />;
}
