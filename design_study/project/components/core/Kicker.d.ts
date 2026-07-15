/** @startingPoint section="Core" subtitle="Mono uppercase label / page kicker" viewport="700x120" */
export interface KickerProps {
  children: React.ReactNode;
  /** CSS color, default var(--cyan). Use var(--text-3) for section labels, var(--amber) for caution. */
  color?: string;
  /** px font size, default 11 (kicker). Use 10 for section labels. */
  size?: number;
  /** letter-spacing, default var(--track-kicker) (.3em). Use var(--track-label) (.2em) for labels. */
  tracking?: string;
  style?: React.CSSProperties;
}