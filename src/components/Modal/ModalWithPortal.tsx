import Portal from "../Common/Portal";
import Modal, { type ModalProps } from "./Modal";

export default function ModalWithPortal(props: ModalProps) {
  return (
    <Portal>
      <Modal {...props} />
    </Portal>
  );
}
