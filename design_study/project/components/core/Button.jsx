import React from 'react';
export function Button({children, variant='secondary', href, onClick, style={}}) {
  const base = {display:'inline-block', padding:'12px 22px', borderRadius:'var(--radius-sm)', fontSize:13.5, letterSpacing:'.03em',
    fontFamily:'var(--font-display)', cursor:'pointer', background:'none', textDecoration:'none', transition:'all var(--dur-micro)'};
  const variants = {
    primary:{border:'1px solid var(--border-cyan)', color:'var(--cyan)'},
    secondary:{border:'1px solid var(--border-3)', color:'var(--text-2)'},
    mono:{border:'1px solid var(--border-3)', color:'var(--text-3)', fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'.16em', textTransform:'uppercase', padding:'7px 12px', minHeight:34}};
  const Tag = href?'a':'button';
  return React.createElement(Tag, {href, onClick, style:{...base, ...variants[variant], ...style}}, children);
}