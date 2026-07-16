"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";

type PortraitVideoCopy = {
  portraitAlt: string;
  playPortraitVideo: string;
  replayPortraitVideo: string;
  closePortraitVideo: string;
  loadingPortraitVideo: string;
  portraitVideoLabel: string;
  portraitVideoHint: string;
};

type OverlayStage = "idle" | "loading" | "expanded" | "collapsing";

type VideoGeometry = {
  originHeight: number;
  originLeft: number;
  originTop: number;
  originWidth: number;
  targetHeight: number;
  targetLeft: number;
  targetTop: number;
  targetWidth: number;
};

function measureVideoGeometry(element: HTMLElement): VideoGeometry {
  const origin = element.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const targetWidth = Math.min(viewportWidth * 0.88, 900, viewportHeight * 0.72 * (16 / 9));
  const targetHeight = targetWidth * (9 / 16);

  return {
    originHeight: origin.height,
    originLeft: origin.left,
    originTop: origin.top,
    originWidth: origin.width,
    targetHeight,
    targetLeft: (viewportWidth - targetWidth) / 2,
    targetTop: (viewportHeight - targetHeight) / 2,
    targetWidth,
  };
}

function geometryStyle(geometry: VideoGeometry): CSSProperties {
  return {
    "--portrait-origin-height": `${geometry.originHeight}px`,
    "--portrait-origin-left": `${geometry.originLeft}px`,
    "--portrait-origin-top": `${geometry.originTop}px`,
    "--portrait-origin-width": `${geometry.originWidth}px`,
    "--portrait-target-height": `${geometry.targetHeight}px`,
    "--portrait-target-left": `${geometry.targetLeft}px`,
    "--portrait-target-top": `${geometry.targetTop}px`,
    "--portrait-target-width": `${geometry.targetWidth}px`,
  } as CSSProperties;
}

function playVideo(video: HTMLVideoElement) {
  void video.play().catch(() => {
    // Removing or replacing a video can abort an in-flight play request.
  });
}

export function PortraitVideo({ copy }: { copy: PortraitVideoCopy }) {
  const [overlayStage, setOverlayStage] = useState<OverlayStage>("idle");
  const [geometry, setGeometry] = useState<VideoGeometry | null>(null);
  const [inlinePlaying, setInlinePlaying] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const overlayVideoRef = useRef<HTMLVideoElement>(null);
  const inlineVideoRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const overlayStageRef = useRef<OverlayStage>("idle");
  const playbackStartedRef = useRef(false);
  const collapseTimerRef = useRef<number | null>(null);
  const loadingTimerRef = useRef<number | null>(null);
  const expandFrameRef = useRef<number | null>(null);
  const restoreFocusRef = useRef(false);
  const overlayActive = overlayStage !== "idle";

  const changeOverlayStage = useCallback((stage: OverlayStage) => {
    overlayStageRef.current = stage;
    setOverlayStage(stage);
  }, []);

  const clearLoadingTimer = useCallback(() => {
    if (!loadingTimerRef.current) return;
    window.clearTimeout(loadingTimerRef.current);
    loadingTimerRef.current = null;
  }, []);

  const clearCollapseTimer = useCallback(() => {
    if (!collapseTimerRef.current) return;
    window.clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = null;
  }, []);

  const finishCollapse = useCallback(() => {
    clearCollapseTimer();
    clearLoadingTimer();
    changeOverlayStage("idle");
    setGeometry(null);
  }, [changeOverlayStage, clearCollapseTimer, clearLoadingTimer]);

  const resetExperience = useCallback(() => {
    playbackStartedRef.current = false;
    restoreFocusRef.current = true;
    setInlinePlaying(false);
    finishCollapse();
  }, [finishCollapse]);

  const beginCollapse = useCallback(
    (restoreFocus: boolean) => {
      const stage = overlayStageRef.current;
      if (stage === "idle" || stage === "collapsing") return;
      clearLoadingTimer();
      const video = overlayVideoRef.current;
      const canContinueInline = Boolean(
        playbackStartedRef.current && video && video.readyState >= 2,
      );
      if (video && canContinueInline) {
        video.loop = true;
        if (video.ended) video.currentTime = 0;
        playVideo(video);
      }
      restoreFocusRef.current = restoreFocus;
      setInlinePlaying(canContinueInline);
      changeOverlayStage("collapsing");
      clearCollapseTimer();
      collapseTimerRef.current = window.setTimeout(finishCollapse, 950);
    },
    [changeOverlayStage, clearCollapseTimer, clearLoadingTimer, finishCollapse],
  );

  const startExperience = () => {
    if (!triggerRef.current || overlayStageRef.current !== "idle") return;
    clearCollapseTimer();
    clearLoadingTimer();
    playbackStartedRef.current = false;
    setGeometry(measureVideoGeometry(triggerRef.current));
    changeOverlayStage("loading");
    loadingTimerRef.current = window.setTimeout(resetExperience, 10_000);
  };

  const handleVideoReady = () => {
    if (overlayStageRef.current !== "loading") return;
    const video = overlayVideoRef.current;
    if (!video) return;
    clearLoadingTimer();
    playbackStartedRef.current = true;
    video.loop = false;
    video.currentTime = 0;
    playVideo(video);
    if (expandFrameRef.current) window.cancelAnimationFrame(expandFrameRef.current);
    expandFrameRef.current = window.requestAnimationFrame(() => {
      expandFrameRef.current = null;
      if (overlayStageRef.current === "loading") changeOverlayStage("expanded");
    });
  };

  const handleFirstPassEnded = () => {
    if (overlayStageRef.current !== "expanded") return;
    const video = overlayVideoRef.current;
    if (video) {
      video.loop = true;
      video.currentTime = 0;
      playVideo(video);
    }
    restoreFocusRef.current = true;
    setInlinePlaying(true);
    changeOverlayStage("collapsing");
    clearCollapseTimer();
    collapseTimerRef.current = window.setTimeout(finishCollapse, 950);
  };

  useEffect(() => {
    if (!overlayActive) return;
    const shell = document.querySelector<HTMLElement>(".site-shell");
    const shellWasInert = shell?.hasAttribute("inert") ?? false;
    const previousOverflow = document.body.style.overflow;
    shell?.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
    window.dispatchEvent(new Event("lattice:pause"));

    return () => {
      if (!shellWasInert) shell?.removeAttribute("inert");
      document.body.style.overflow = previousOverflow;
      window.dispatchEvent(new Event("lattice:resume"));
    };
  }, [overlayActive]);

  useEffect(() => {
    if (!overlayActive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") beginCollapse(true);
    };
    const onResize = () => {
      if (triggerRef.current) setGeometry(measureVideoGeometry(triggerRef.current));
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [beginCollapse, overlayActive]);

  useEffect(() => {
    if (overlayStage === "expanded") dialogRef.current?.focus({ preventScroll: true });
    if (overlayStage === "idle" && restoreFocusRef.current) {
      triggerRef.current?.focus({ preventScroll: true });
      restoreFocusRef.current = false;
    }
  }, [overlayStage]);

  useEffect(() => {
    if (!inlinePlaying) return;
    const inlineVideo = inlineVideoRef.current;
    if (!inlineVideo) return;

    const beginInlinePlayback = () => {
      const overlayVideo = overlayVideoRef.current;
      if (overlayVideo && Number.isFinite(overlayVideo.currentTime)) {
        inlineVideo.currentTime = overlayVideo.currentTime;
      }
      playVideo(inlineVideo);
    };

    if (inlineVideo.readyState >= 1) beginInlinePlayback();
    else inlineVideo.addEventListener("loadedmetadata", beginInlinePlayback, { once: true });
    return () => inlineVideo.removeEventListener("loadedmetadata", beginInlinePlayback);
  }, [inlinePlaying]);

  useEffect(
    () => () => {
      clearCollapseTimer();
      clearLoadingTimer();
      if (expandFrameRef.current) window.cancelAnimationFrame(expandFrameRef.current);
    },
    [clearCollapseTimer, clearLoadingTimer],
  );

  const overlay = geometry && overlayStage !== "idle" ? (
    <div
      aria-label={copy.portraitVideoLabel}
      aria-modal="true"
      className={`portrait-cinema portrait-cinema--${overlayStage}`}
      onClick={(event: ReactMouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) beginCollapse(true);
      }}
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <div className="portrait-cinema__frame" style={geometryStyle(geometry)}>
        <video
          aria-hidden="true"
          muted
          onCanPlay={handleVideoReady}
          onEnded={handleFirstPassEnded}
          onError={resetExperience}
          playsInline
          poster="/assets/portrait.png"
          preload="auto"
          ref={overlayVideoRef}
          src="/assets/hero-lattice-v1.mp4"
        />
      </div>
      <span aria-live="polite" className="portrait-cinema__loading" role="status">
        {overlayStage === "loading" ? copy.loadingPortraitVideo : ""}
      </span>
      <button
        className="portrait-cinema__close"
        onClick={() => beginCollapse(true)}
        type="button"
      >
        {copy.closePortraitVideo}
      </button>
    </div>
  ) : null;

  return (
    <>
      <button
        aria-label={inlinePlaying ? copy.replayPortraitVideo : copy.playPortraitVideo}
        className="portrait-media"
        onClick={startExperience}
        ref={triggerRef}
        tabIndex={overlayStage === "idle" ? undefined : -1}
        type="button"
      >
        {inlinePlaying ? (
          <video
            aria-hidden="true"
            autoPlay
            className="portrait-media__asset"
            loop
            muted
            playsInline
            poster="/assets/portrait.png"
            ref={inlineVideoRef}
            src="/assets/hero-lattice-v1.mp4"
          />
        ) : (
          <Image
            alt={copy.portraitAlt}
            className="portrait-media__asset"
            height={200}
            priority
            src="/assets/portrait.png"
            width={200}
          />
        )}
        <span aria-hidden="true" className="portrait-media__cue">
          <span>▶</span>
          <span>{copy.portraitVideoHint}</span>
        </span>
      </button>
      {overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
