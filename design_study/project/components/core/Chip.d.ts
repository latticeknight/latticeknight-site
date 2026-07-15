export interface ChipProps {
  children: React.ReactNode;
  /** Cyan-tinted selected state (stage/role pickers) */
  selected?: boolean;
  /** Presence makes it a button (selectable); absence renders a passive tag */
  onClick?: () => void;
}