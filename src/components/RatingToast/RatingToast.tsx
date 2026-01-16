import { Trans } from "@lingui/macro";

import Button from "components/Button/Button";

type Props = {
  onRatingClick: (rating: number) => void;
};

const ratingArr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function RatingToast({ onRatingClick }: Props) {
  return (
    <div>
      <div>
        <Trans>How likely are you to recommend our service to a friend or colleague?</Trans>
      </div>
      <div className="flex w-full flex-row gap-2 pb-8 pt-16">
        {ratingArr.map((rating) => (
          <RatingItem onClick={() => onRatingClick(rating)} rating={rating} key={rating} />
        ))}
      </div>
      <div className="mb-6 flex w-full flex-row justify-between text-typography-secondary">
        <div>
          <Trans>Not likely</Trans>
        </div>
        <div>
          <Trans>Very likely</Trans>
        </div>
      </div>
    </div>
  );
}

function RatingItem({ rating, onClick }: { rating: number; onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      variant="secondary"
      size="small"
      className="h-32 w-28 whitespace-nowrap hover:!bg-blue-500 hover:!text-white"
    >
      {rating}
    </Button>
  );
}
