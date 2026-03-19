import { Trans } from "@lingui/macro";
import { useCallback } from "react";

import { OrderOption } from "domain/synthetics/trade/usePositionSellerState";

import Modal from "components/Modal/Modal";
import Tabs from "components/Tabs/Tabs";

const ORDER_OPTIONS = [{ value: OrderOption.Market }, { value: OrderOption.Twap }];

type Props = {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  onSelect: (orderOption: OrderOption) => void;
};

export function ClosePositionModal({ isVisible, setIsVisible, onSelect }: Props) {
  const handleChange = useCallback(
    (value: OrderOption) => {
      setIsVisible(false);
      onSelect(value);
    },
    [setIsVisible, onSelect]
  );

  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={<Trans>Close Position</Trans>}>
      <Tabs type="inline" options={ORDER_OPTIONS} selectedValue={undefined} onChange={handleChange} />
    </Modal>
  );
}
