"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { SiteDictionary } from "@/lib/site";

export function SiteIntro({ copy }: { copy: SiteDictionary["common"] }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const exitTimerRef = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    setExiting(true);
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = window.setTimeout(() => {
      dialogRef.current?.close();
      setVisible(false);
    }, 980);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = window.sessionStorage.getItem("lk-intro-seen");
    if (reduced || seen) return;

    window.sessionStorage.setItem("lk-intro-seen", "1");
    const showTimer = window.setTimeout(() => setVisible(true), 0);
    const timer = window.setTimeout(dismiss, 6000);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(timer);
    };
  }, [dismiss]);

  useEffect(() => {
    if (visible && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    window.dispatchEvent(new Event("lattice:pause"));
    return () => {
      window.dispatchEvent(new Event("lattice:resume"));
    };
  }, [visible]);

  useEffect(
    () => () => {
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    },
    [],
  );

  if (!visible) return null;

  return (
    <dialog
      aria-label={copy.introduction}
      className={exiting ? "site-intro site-intro--exiting" : "site-intro"}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      ref={dialogRef}
    >
      <video aria-hidden="true" autoPlay loop muted playsInline src="/assets/hero-lattice-v1.mp4" />
      <div className="intro-vignette" />
      <button className="intro-skip" onClick={dismiss} type="button">
        {copy.skipIntro}
      </button>
      <div className="intro-lockup">
        <div>
          <h1>Eduardo Neto</h1>
          <p>latticeknight</p>
        </div>
        <div className="intro-statement">
          {copy.introStatement[0]}
          <br />
          {copy.introStatement[1]}
        </div>
      </div>
      <button className="intro-enter" onClick={dismiss} type="button">
        <span aria-hidden="true">↑</span>
        <span>{copy.enter}</span>
      </button>
    </dialog>
  );
}
