import { Toaster, ToastBar } from "react-hot-toast";

function AnimatedToaster() {
  <Toaster
    position="top-right"
    reverseOrder={true}
    gutter={20}
    containerClassName="event-toast-container"
    containerStyle={{
      zIndex: 2,
      top: "93px",
      right: "30px",
    }}
    toastOptions={{
      duration: Infinity,
    }}
  >
    {(t) => (
      <ToastBar
        toast={t}
        style={{
          ...t.style,
          animation: t.visible ? "zoomIn 0.2 ease" : "zoomOut 0.2 ease",
        }}
      />
    )}
  </Toaster>;
}
export default AnimatedToaster;
