import Checkbox from "components/Checkbox/Checkbox";

import "./ApproveTokenButton.scss";

type Props = {};

export function ApproveTokenButton(p: Props) {
  return (
    <Checkbox
      isChecked={false}
      setIsChecked={function (checked: boolean): void {
        throw new Error("Function not implemented.");
      }}
    >
      Approve token
    </Checkbox>
  );
}
