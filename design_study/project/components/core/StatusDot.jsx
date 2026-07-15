import React from 'react';
const COLORS = {live:'var(--status-live)', 'in development':'var(--status-dev)', 'pre-launch':'var(--status-dev)', experimental:'var(--status-experimental)', planned:'transparent'};
export function StatusDot({status='live', label, breathe=true, size=7}) {
  const planned = status==='planned';
  const dot = React.createElement('span', {style:{width:size, height:size, borderRadius:'50%', flex:'none', display:'block',
    background:planned?'transparent':COLORS[status]||'var(--text-4)', border:planned?'1px solid var(--text-4)':'none',
    animation:(breathe&&!planned)?'lkBreathe 4s ease-in-out infinite':'none'}});
  if(!label && label!=='') return dot;
  return React.createElement('span', {style:{display:'flex', alignItems:'center', gap:9}}, dot,
    React.createElement('span', {style:{fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'.24em', textTransform:'uppercase',
      color:COLORS[status]&&!planned?COLORS[status]:'var(--text-4)'}}, label ?? status));
}