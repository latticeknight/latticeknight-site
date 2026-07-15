import type { KeyboardEvent } from "react";

type SelectTab = (index: number) => void;

export function handleTabKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  index: number,
  count: number,
  selectTab: SelectTab,
) {
  let nextIndex: number | null = null;

  if (event.key === "ArrowRight") nextIndex = (index + 1) % count;
  if (event.key === "ArrowLeft") nextIndex = (index - 1 + count) % count;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = count - 1;
  if (nextIndex === null) return;

  event.preventDefault();
  selectTab(nextIndex);
  const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
    '[role="tab"]',
  );
  tabs?.[nextIndex]?.focus();
}
