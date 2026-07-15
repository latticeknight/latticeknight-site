import React from 'react';
export function Kicker({children, color='var(--cyan)', size=11, tracking='var(--track-kicker)', style={}}) {
  return React.createElement('div', {style:{fontFamily:'var(--font-mono)', fontSize:size, letterSpacing:tracking, textTransform:'uppercase', color, ...style}}, children);
}