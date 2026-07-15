export interface PanelProps {
  children: React.ReactNode;
  /** Nested facet card: darker, smaller radius, no blur. */
  nested?: boolean;
  /** cyan (featured) | amber (failure/caution) border accent */
  accent?: 'cyan'|'amber';
  pad?: string;
  style?: React.CSSProperties;
}