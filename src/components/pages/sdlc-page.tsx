"use client";

import { useState } from "react";

import { PageHeader } from "@/components/page-header";
import type { SiteDictionary } from "@/lib/site";
import { handleTabKeyDown } from "@/lib/tab-keyboard";

export function SdlcPage({ copy }: { copy: SiteDictionary["sdlc"] }) {
  const [selectedStage, setSelectedStage] = useState(0);
  const [flipped, setFlipped] = useState<Set<number>>(() => new Set());
  const stage = copy.stages[selectedStage];

  function toggleFailure(index: number) {
    setFlipped((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="page">
      <PageHeader kicker={copy.kicker} title={copy.title} intro={copy.intro} />

      <section className="lifecycle-section">
        <div className="section-label">{copy.selector}</div>
        <div className="chip-list" role="tablist" aria-label={copy.selector}>
          {copy.stages.map((item, index) => (
            <button
              aria-controls="stage-panel"
              aria-selected={selectedStage === index}
              className={selectedStage === index ? "chip chip--active" : "chip"}
              id={`stage-tab-${index}`}
              key={item.label}
              onClick={() => setSelectedStage(index)}
              onKeyDown={(event) => {
                handleTabKeyDown(event, index, copy.stages.length, setSelectedStage);
              }}
              role="tab"
              tabIndex={selectedStage === index ? 0 : -1}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          aria-labelledby={`stage-tab-${selectedStage}`}
          className="panel stage-panel"
          id="stage-panel"
          role="tabpanel"
          tabIndex={0}
        >
          <div>
            <h2>{stage.name}</h2>
            <p>{stage.detail}</p>
          </div>
          <div className="responsibility-bars">
            <div className="section-label">{copy.responsibility}</div>
            {stage.weights.map((weight, index) => (
              <div className="responsibility-row" key={copy.actors[index]}>
                <span>{copy.actors[index]}</span>
                <span className="responsibility-track">
                  <span
                    className={index === 0 ? "responsibility-fill responsibility-fill--human" : "responsibility-fill"}
                    style={{ width: `${(weight / 3) * 100}%` }}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="failures-section">
        <h2 className="failures-title">{copy.failuresTitle}</h2>
        <p className="failures-intro">{copy.failuresIntro}</p>
        <div className="failure-grid">
          {copy.failures.map((failure, index) => {
            const isFlipped = flipped.has(index);
            return (
              <button
                aria-pressed={isFlipped}
                className="flip-card"
                key={failure.name}
                onClick={() => toggleFailure(index)}
                type="button"
              >
                <span className={isFlipped ? "flip-card-inner flip-card-inner--flipped" : "flip-card-inner"}>
                  <span aria-hidden={isFlipped} className="flip-face flip-face--front">
                    <span className="failure-name"><span aria-hidden="true" />{failure.name}</span>
                    <span className="failure-copy">{failure.problem}</span>
                    <span className="flip-glyph" aria-hidden="true">⟲</span>
                  </span>
                  <span aria-hidden={!isFlipped} className="flip-face flip-face--back">
                    <span className="mitigation-label">{copy.mitigation}</span>
                    <span className="failure-copy">{failure.fix}</span>
                    <span className="flip-glyph" aria-hidden="true">⟲</span>
                  </span>
                </span>
                <span className="sr-only">{isFlipped ? copy.flipBack : copy.flipFor}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
