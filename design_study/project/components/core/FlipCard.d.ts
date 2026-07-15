export interface FlipCardProps {
  /** Failure-mode name (front) */
  title: string;
  /** Problem statement (front, amber) */
  problem: string;
  /** How it is designed around (back, cyan) */
  mitigation: string;
  mitigationLabel?: string;
}