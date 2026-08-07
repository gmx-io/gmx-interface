import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";

export function RewardsVestingSimulatorApprovalModal({
  action,
  onApprove,
  onReject,
}: {
  action: string | undefined;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <ModalWithPortal
      isVisible={action !== undefined}
      setIsVisible={(isVisible) => {
        if (!isVisible) onReject();
      }}
      label="Simulator wallet"
      zIndex={1002}
      contentPadding={false}
      hideHeaderBorder
      withMobileBottomPosition
      keepScrollbarVisible
      contentClassName="w-[420px]"
      qa="rewards-vesting-simulator-approval-modal"
    >
      <div className="flex flex-col gap-16 px-20 pb-20">
        <div className="flex flex-col gap-6">
          <div className="text-14 font-medium text-typography-primary">Approve transaction?</div>
          <p className="text-13 leading-[1.35] text-typography-secondary">
            Approve to complete this simulated transaction, or reject it to emulate cancelling the request in your
            wallet.
          </p>
        </div>

        <div className="flex items-center justify-between gap-12 rounded-8 bg-fill-surfaceElevated50 px-12 py-10 text-13">
          <span className="text-typography-secondary">Action</span>
          <span className="text-right font-medium text-typography-primary">{action}</span>
        </div>

        <div className="grid grid-cols-2 gap-12">
          <Button variant="secondary" size="medium" className="w-full" onClick={onReject}>
            Reject
          </Button>
          <Button variant="primary" size="medium" className="w-full" onClick={onApprove}>
            Approve
          </Button>
        </div>
      </div>
    </ModalWithPortal>
  );
}
