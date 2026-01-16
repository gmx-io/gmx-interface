import Modal, { ModalProps } from "./Modal";
import Portal from "../Portal/Portal";

export default function ModalWithPortal(props: ModalProps) {
  return (
    <Portal>
      <Modal {...props} />
    </Portal>
  );
}
