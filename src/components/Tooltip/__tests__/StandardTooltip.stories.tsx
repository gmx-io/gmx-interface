import { useEffect, useState } from "react";

import Modal from "components/Modal/Modal";

import StandardTooltip from "../StandardTooltip";
import { TooltipAction, TooltipContent, TooltipLink, TooltipText } from "../TooltipBlocks";
import { TooltipGroup } from "../TooltipGroup";

const LONG_TEXT =
  "Tooltip text explains one thing in plain words. It stays short and goes straight to the point. ".repeat(4);

export function PlainStory() {
  return (
    <div className="p-96">
      <StandardTooltip handle="Trigger" content="Tooltip text" />
      <div className="mt-40">Outside</div>
    </div>
  );
}

export function GroupStory() {
  return (
    <TooltipGroup>
      <div className="flex gap-80 p-96">
        <StandardTooltip handle="First" content="First tooltip" />
        <StandardTooltip handle="Second" content="Second tooltip" />
        <StandardTooltip handle="Third" content="Third tooltip" />
      </div>
    </TooltipGroup>
  );
}

export function LinkActionStory() {
  const [clicks, setClicks] = useState(0);
  return (
    <div className="p-96">
      <StandardTooltip
        handle="Trigger"
        content={
          <TooltipContent>
            <TooltipText>Selectable tooltip text</TooltipText>
            <TooltipAction onClick={() => setClicks((c) => c + 1)}>Set max leverage</TooltipAction>
            <TooltipLink href="https://docs.gmx.io/">Read more</TooltipLink>
          </TooltipContent>
        }
      />
      <button type="button" className="ml-40">
        After
      </button>
      <div data-testid="clicks">{clicks}</div>
    </div>
  );
}

export function ScrollStory() {
  return (
    <div className="h-[3000px] p-96">
      <StandardTooltip
        handle="Trigger"
        content={
          <div data-testid="inner-scroll" className="max-h-80 overflow-y-auto">
            <div className="h-[400px]">Scrollable tooltip content</div>
          </div>
        }
      />
    </div>
  );
}

export function TallStory() {
  return (
    <div className="p-96">
      <StandardTooltip
        handle="Tall trigger"
        content={
          <TooltipContent>
            {Array.from({ length: 40 }, (_, index) => (
              <TooltipText key={index}>Row {index + 1}</TooltipText>
            ))}
          </TooltipContent>
        }
      />
    </div>
  );
}

function GrowingContent() {
  const [rows, setRows] = useState(2);
  useEffect(() => {
    const grow = () => setRows(7);
    window.addEventListener("grow-tooltip-content", grow);
    return () => window.removeEventListener("grow-tooltip-content", grow);
  }, []);
  return (
    <TooltipContent>
      {Array.from({ length: rows }, (_, index) => (
        <TooltipText key={index}>Row {index + 1}</TooltipText>
      ))}
    </TooltipContent>
  );
}

export function NoRoomBelowStory() {
  return (
    <div className="fixed bottom-[130px] left-40 flex gap-[200px]">
      <StandardTooltip handle="Long text trigger" content={LONG_TEXT} />
      <StandardTooltip handle="Growing trigger" renderContent={() => <GrowingContent />} />
    </div>
  );
}

export function ClickableRowStory() {
  const [rowClicks, setRowClicks] = useState(0);
  return (
    <div className="p-96">
      <div onClick={() => setRowClicks((value) => value + 1)} onDoubleClick={() => setRowClicks((value) => value + 1)}>
        <StandardTooltip handle="Row trigger" content="Row tooltip text" />
      </div>
      <div data-testid="row-clicks">{rowClicks}</div>
    </div>
  );
}

export function ModalStory() {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <div className="p-96">
      <button type="button" onClick={() => setIsVisible(true)}>
        Open modal
      </button>
      <div data-testid="modal-state">{isVisible ? "open" : "closed"}</div>
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label="Modal title">
        <StandardTooltip handle="Modal trigger" content="Modal tooltip text" />
      </Modal>
    </div>
  );
}

export function DisabledButtonStory() {
  const [clicks, setClicks] = useState(0);
  return (
    <div className="p-96">
      <StandardTooltip
        variant="none"
        isHandlerDisabled
        shouldPreventDefault={false}
        content="Max leverage exceeded"
        position="bottom"
      >
        <button type="button" disabled onClick={() => setClicks((c) => c + 1)}>
          Disabled action
        </button>
      </StandardTooltip>
      <div data-testid="clicks">{clicks}</div>
    </div>
  );
}

export function ButtonTriggerStory() {
  const [clicks, setClicks] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  return (
    <div className="flex flex-col items-start gap-40 p-96">
      <StandardTooltip variant="none" shouldPreventDefault={false} content="Counts clicks" position="bottom">
        <button type="button" onClick={() => setClicks((c) => c + 1)}>
          Count
        </button>
      </StandardTooltip>
      <StandardTooltip variant="none" shouldPreventDefault={false} content="Opens a modal" position="bottom">
        <button type="button" onClick={() => setIsVisible(true)}>
          Open modal
        </button>
      </StandardTooltip>
      <div data-testid="clicks">{clicks}</div>
      <div data-testid="modal-state">{isVisible ? "open" : "closed"}</div>
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label="Modal title">
        Modal body
      </Modal>
    </div>
  );
}

export function DropdownTriggerStory() {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="p-96">
      <StandardTooltip variant="none" shouldPreventDefault={false} content="Dropdown tooltip" position="bottom">
        <button type="button" aria-expanded={isExpanded} onClick={() => setIsExpanded((value) => !value)}>
          Dropdown
        </button>
      </StandardTooltip>
      {isExpanded && <div>Dropdown panel</div>}
    </div>
  );
}

export function PlacementStory() {
  return (
    <div className="relative h-screen">
      <div className="absolute left-40 top-40">
        <StandardTooltip handle="Top trigger" content="Below by default" />
      </div>
      <div className="absolute bottom-10 left-40">
        <StandardTooltip handle="Bottom trigger" content={LONG_TEXT} />
      </div>
      <div className="absolute right-4 top-[200px]">
        <StandardTooltip handle="Edge" content={LONG_TEXT} position="bottom-end" />
      </div>
    </div>
  );
}

export function SizeStory() {
  return (
    <div className="flex gap-[200px] p-96">
      <StandardTooltip handle="Default" content={LONG_TEXT} />
      <StandardTooltip handle="Wide" size="wide" content={LONG_TEXT} />
    </div>
  );
}

export function NestedStory() {
  return (
    <TooltipGroup>
      <div className="p-96">
        <StandardTooltip
          handle="Parent"
          content={
            <div className="p-8">
              <StandardTooltip handle="Child" content="Child tooltip" />
            </div>
          }
        />
      </div>
    </TooltipGroup>
  );
}

export function TriggerInsideButtonStory() {
  const [sorts, setSorts] = useState(0);
  return (
    <div className="flex gap-40 p-96">
      <button type="button" onClick={() => setSorts((value) => value + 1)}>
        <StandardTooltip
          handle="Sort by size"
          variant="iconStroke"
          content={
            <TooltipContent>
              <TooltipText>Size of the position</TooltipText>
              <TooltipLink href="https://docs.gmx.io/">Read more</TooltipLink>
            </TooltipContent>
          }
        />
      </button>
      <button type="button">After</button>
      <div data-testid="sorts">{sorts}</div>
    </div>
  );
}
