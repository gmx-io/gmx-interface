import { Trans } from "@lingui/macro";

type Props = {
  onRatingClick: (rating: number) => void;
};

const ratingArr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function RatingToast({ onRatingClick }: Props) {
  return (
    <div>
      <div className="text-20">
        <Trans>How likely are you to recommend our service to a friend or colleague?</Trans>
      </div>
      <div className="flex w-full flex-row justify-between pb-8 pt-16">
        {ratingArr.map((rating) => (
          <RatingItem onClick={() => onRatingClick(rating)} rating={rating} key={rating} />
        ))}
      </div>
      <div className="mb-6 flex w-full flex-row justify-between text-gray-300">
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
    <div
      onClick={onClick}
      className="flex  h-26 w-26 cursor-pointer select-none items-center justify-center bg-pale-blue-100 text-center align-middle hover:bg-pale-blue-600"
    >
      {rating}
    </div>
  );
}
