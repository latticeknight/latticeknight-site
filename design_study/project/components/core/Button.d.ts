/** @startingPoint section="Core" subtitle="Outline buttons — primary cyan, secondary neutral, mono control" viewport="700x120" */
export interface ButtonProps {
  children: React.ReactNode;
  /** primary = cyan outline CTA · secondary = neutral outline · mono = small uppercase control (MAP, MENU) */
  variant?: 'primary'|'secondary'|'mono';
  href?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}