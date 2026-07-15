import React from 'react';
export function Panel({children, nested=false, accent, pad='var(--panel-pad)', style={}}) {
  return React.createElement('div', {style:{
    background:nested?'var(--surface-2)':'var(--surface-1)',
    border:'1px solid '+(accent==='cyan'?'rgba(142,196,214,.22)':accent==='amber'?'var(--border-amber)':'var(--border-1)'),
    borderRadius:nested?'var(--radius-md)':'var(--radius-lg)', padding:pad,
    backdropFilter:nested?'none':'var(--blur-panel)', ...style}}, children);
}