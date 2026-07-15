"use client";

import { useState } from "react";

import { PageHeader } from "@/components/page-header";
import type { SiteDictionary } from "@/lib/site";
import { handleTabKeyDown } from "@/lib/tab-keyboard";

export function ToolingPage({ copy }: { copy: SiteDictionary["tooling"] }) {
  const [selectedRole, setSelectedRole] = useState(0);
  const [sliders, setSliders] = useState([2, 2, 2, 2, 2]);
  const role = copy.roles[selectedRole];

  const recommendation = (() => {
    const [complexity, risk, repetition, cost, verification] = sliders;
    let base: { title: string; lines: string[] };

    if (repetition >= 3 && complexity <= 1 && risk <= 1) {
      base = copy.recommendations.script;
    } else if (risk >= 3) {
      base = {
        title: copy.recommendations.highRisk.title,
        lines: [
          ...copy.recommendations.highRisk.lines,
          ...(verification >= 3 ? [copy.recommendations.highRisk.validation] : []),
        ],
      };
    } else if (complexity >= 3) {
      base = copy.recommendations.complex;
    } else {
      base = copy.recommendations.moderate;
    }

    return {
      title: base.title,
      lines: [
        ...base.lines,
        ...(cost >= 3 ? [copy.recommendations.cost] : []),
        ...(repetition >= 3 && base.title !== copy.recommendations.script.title
          ? [copy.recommendations.repetition]
          : []),
      ],
    };
  })();

  return (
    <div className="page">
      <PageHeader kicker={copy.kicker} title={copy.title} intro={copy.intro} />

      <section>
        <div className="section-label">{copy.selector}</div>
        <div className="chip-list" role="tablist" aria-label={copy.selector}>
          {copy.roles.map((item, index) => (
            <button
              aria-controls="role-panel"
              aria-selected={selectedRole === index}
              className={selectedRole === index ? "chip chip--active" : "chip"}
              id={`role-tab-${index}`}
              key={item.label}
              onClick={() => setSelectedRole(index)}
              onKeyDown={(event) => {
                handleTabKeyDown(event, index, copy.roles.length, setSelectedRole);
              }}
              role="tab"
              tabIndex={selectedRole === index ? 0 : -1}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          aria-labelledby={`role-tab-${selectedRole}`}
          className="panel role-panel"
          id="role-panel"
          role="tabpanel"
          tabIndex={0}
        >
          <h2>{role.name}</h2>
          <p>{role.body}</p>
          <p className="discipline"><span>{copy.discipline} · </span>{role.discipline}</p>
        </div>
      </section>

      <section className="workflow-designer">
        <div className="section-label">{copy.designer}</div>
        <p className="designer-caveat">{copy.caveat}</p>
        <div className="panel designer-panel">
          <div className="slider-list">
            {copy.sliderLabels.map((label, index) => (
              <label key={label}>
                <span><span>{label}</span><output>{copy.levels[sliders[index]]}</output></span>
                <input
                  aria-label={label}
                  max="4"
                  min="0"
                  onChange={(event) => {
                    const next = [...sliders];
                    next[index] = Number(event.target.value);
                    setSliders(next);
                  }}
                  step="1"
                  type="range"
                  value={sliders[index]}
                />
              </label>
            ))}
          </div>
          <div className="recommendation-panel" aria-live="polite">
            <div className="facet-tag facet-tag--cyan">{copy.recommendation}</div>
            <h2>{recommendation.title}</h2>
            {recommendation.lines.map((line) => (
              <p key={line}><span aria-hidden="true">-</span>{line}</p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
