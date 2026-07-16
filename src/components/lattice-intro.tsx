"use client";

import { useEffect, useRef } from "react";

import type { SiteDictionary } from "@/lib/site";

export type LatticeIntroStage = "pending" | "forming" | "identity" | "handoff" | "complete";

export function LatticeIntro({
  copy,
  onSkip,
  stage,
}: {
  copy: SiteDictionary["common"];
  onSkip: () => void;
  stage: Exclude<LatticeIntroStage, "complete">;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && stage !== "handoff") onSkip();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSkip, stage]);

  return (
    <>
      <div aria-hidden="true" className={`site-intro-v2-background site-intro-v2-background--${stage}`} />
      <div
        aria-label={copy.introduction}
        aria-modal="true"
        className={`site-intro-v2 site-intro-v2--${stage}`}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <button className="intro-v2-skip" onClick={onSkip} tabIndex={stage === "handoff" ? -1 : undefined} type="button">
          {copy.skipIntro}
        </button>
        <div aria-hidden="true" className="intro-v2-lockup">
          <div className="intro-v2-wordmark">latticeknight</div>
          <div className="intro-v2-statement">{copy.introV2Statement}</div>
        </div>
      </div>
    </>
  );
}
