import Modal, { type ModalProps } from "./Modal";
import Portal from "../Common/Portal";

export default function ModalWithPortal(props: ModalProps) {
  return (
    <Portal>
      <Modal {...props} />
    </Portal>
  );
}
