export interface StatusDotProps {
  /** live | in development | pre-launch | experimental | planned */
  status?: 'live'|'in development'|'pre-launch'|'experimental'|'planned';
  /** Mono uppercase label next to the dot; omit for dot only */
  label?: string;
  /** Slow opacity pulse (active systems). Default true. */
  breathe?: boolean;
  size?: number;
}