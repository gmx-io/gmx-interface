import Button from "components/Button/Button";

import OneClickIcon from "img/ic_one_click.svg?react";

export function OneClickButton({ openSettings }: { openSettings: () => void }) {
  return (
    <Button variant="secondary" onClick={openSettings} className="size-40 !p-0 max-md:size-32">
      <OneClickIcon className="h-20 w-20 p-0" />
    </Button>
  );
}
