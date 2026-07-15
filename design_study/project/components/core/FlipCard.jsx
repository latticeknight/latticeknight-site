import React from 'react';
export function FlipCard({title, problem, mitigation, mitigationLabel='MITIGATION'}) {
  const [flipped, setFlipped] = React.useState(false);
  const face = {gridArea:'1/1', backfaceVisibility:'hidden', borderRadius:'var(--radius-md)', padding:'16px 18px 34px', position:'relative'};
  const icon = c => React.createElement('span', {style:{position:'absolute', bottom:10, right:12, fontFamily:'var(--font-mono)', fontSize:19, color:c, opacity:.8}}, '⟲');
  return React.createElement('div', {onClick:()=>setFlipped(f=>!f), style:{perspective:1200, cursor:'pointer'}},
    React.createElement('div', {style:{display:'grid', transformStyle:'preserve-3d', transition:'transform var(--dur-flip) var(--ease-flip)', transform:flipped?'rotateY(180deg)':'rotateY(0)'}},
      React.createElement('div', {style:{...face, border:'1px solid var(--border-amber)', background:'rgba(15,18,24,.92)'}},
        React.createElement('div', {style:{display:'flex', alignItems:'center', gap:9, marginBottom:7}},
          React.createElement('span', {style:{width:14, height:1, background:'var(--amber)', display:'block'}}),
          React.createElement('span', {style:{fontSize:13.5, fontWeight:600}}, title)),
        React.createElement('p', {style:{fontSize:13, lineHeight:1.6, color:'var(--text-3)', margin:0}}, problem), icon('var(--amber)')),
      React.createElement('div', {style:{...face, transform:'rotateY(180deg)', border:'1px solid rgba(142,196,214,.28)', background:'rgba(15,22,28,.96)'}},
        React.createElement('div', {style:{fontFamily:'var(--font-mono)', fontSize:9.5, letterSpacing:'.2em', color:'var(--cyan)', marginBottom:8}}, mitigationLabel),
        React.createElement('p', {style:{fontSize:13, lineHeight:1.6, color:'var(--text-2)', margin:0}}, mitigation), icon('var(--cyan)'))));
}