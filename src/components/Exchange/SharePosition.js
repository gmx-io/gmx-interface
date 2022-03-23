import Modal from "../Modal/Modal";

function SharePosition(props) {
  let { isVisible, setIsVisible, title } = props;
  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
      Hello World
    </Modal>
  );
}

export default SharePosition;
