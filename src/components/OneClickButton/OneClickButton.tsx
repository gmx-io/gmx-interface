import Button from "components/Button/Button";

import OneClickIcon from "img/ic_one_click.svg?react";

export function OneClickButton({ openSettings }: { openSettings: () => void }) {
  return (
    <Button variant="secondary" onClick={openSettings}>
      <OneClickIcon className="size-24" />
    </Button>
  );
}
