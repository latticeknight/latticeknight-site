import React from 'react';
export function Chip({children, selected=false, onClick}) {
  return React.createElement(onClick?'button':'span', {onClick, style:{
    fontFamily:'var(--font-mono)', fontSize:onClick?11:10, letterSpacing:onClick?'.08em':'var(--track-chip)', textTransform:'uppercase',
    padding:onClick?'9px 13px':'7px 12px', borderRadius:'var(--radius-sm)', cursor:onClick?'pointer':'default',
    background:selected?'rgba(142,196,214,.12)':(onClick?'var(--surface-3)':'none'),
    border:'1px solid '+(selected?'var(--border-cyan-strong)':'var(--border-2)'),
    color:selected?'var(--cyan-bright)':'var(--text-3)', transition:'all var(--dur-micro)'}}, children);
}