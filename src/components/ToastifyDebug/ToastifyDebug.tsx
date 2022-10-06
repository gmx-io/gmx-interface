import { useState } from "react";

export function ToastifyDebug(props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="Toastify-debug">
      <span className="Toastify-debug-button" onClick={() => setOpen((old) => !old)}>
        {open ? "Hide error" : "Show error"}
      </span>
      {open && <div className="Toastify-debug-content">{props.children}</div>}
    </div>
  );
}
