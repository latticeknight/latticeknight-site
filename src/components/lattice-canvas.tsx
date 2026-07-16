"use client";

import { useEffect, useRef } from "react";

import { pageSlugs, type PageSlug } from "@/lib/site";

type NodePoint = {
  cluster: PageSlug;
  angle: number;
  radius: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  offsetX: number;
  offsetY: number;
  breatheX: number;
  breatheY: number;
  amber: boolean;
  phase: number;
  size: number;
  introAlpha: number;
  introBegin: number;
  mobileVisible: boolean;
  seedNode: boolean;
  amberWindow?: [number, number];
};

type PruneEdge = {
  first: NodePoint;
  second: NodePoint;
  startsAt: number;
  endsAt: number;
  amber: boolean;
};

type Engine = {
  active: PageSlug;
  visited: Set<PageSlug>;
  nodes: NodePoint[];
  edges: Array<[number, number]>;
  pulse: { from: PageSlug; to: PageSlug; progress: number } | null;
  reduced: boolean;
  layout: (immediate: boolean) => void;
  draw: (time?: number) => void;
  skipIntro: () => void;
};

type LatticeCanvasProps = {
  active: PageSlug;
  visited: PageSlug[];
  labels: Record<PageSlug, string>;
  introEnabled: boolean;
  introSkipKey: number;
  onIntroStart: () => void;
  onIntroIdentity: () => void;
  onIntroHandoff: () => void;
  onIntroComplete: () => void;
};

const routes: Array<[PageSlug, PageSlug]> = [
  ["home", "systems"],
  ["home", "sdlc"],
  ["home", "notes"],
  ["systems", "sdlc"],
  ["sdlc", "workflows"],
  ["workflows", "automation"],
  ["automation", "tooling"],
  ["notes", "systems"],
  ["about", "contact"],
  ["home", "lab"],
  ["lab", "workflows"],
  ["notes", "workflows"],
];

const introMapPositions: Record<PageSlug, [number, number]> = {
  home: [50, 45],
  systems: [22, 24],
  sdlc: [50, 12],
  workflows: [78, 22],
  automation: [90, 50],
  tooling: [78, 78],
  lab: [50, 88],
  notes: [22, 76],
  about: [10, 50],
  contact: [32, 58],
};

const introParents: Partial<Record<PageSlug, PageSlug>> = {
  systems: "home",
  sdlc: "home",
  notes: "home",
  lab: "home",
  about: "home",
  contact: "about",
  workflows: "sdlc",
  automation: "workflows",
  tooling: "automation",
};

const primaryIntroLabels = new Set<PageSlug>(["systems", "sdlc", "workflows", "automation", "notes"]);

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function smoothStep(value: number) {
  const time = clamp(value);
  return time * time * (3 - 2 * time);
}

function travelStep(value: number) {
  const time = clamp(value);
  return time < 0.5 ? 2 * time * time : 1 - Math.pow(-2 * time + 2, 2) / 2;
}

function anchor(cluster: PageSlug, active: PageSlug) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (cluster === active) {
    return {
      x: width * 0.5,
      y: height * 0.46,
      radius: Math.min(width, height) * 0.34,
    };
  }

  const others = pageSlugs.filter((slug) => slug !== active);
  const index = others.indexOf(cluster);
  const angle = (index / others.length) * Math.PI * 2 - Math.PI / 2;
  return {
    x: width * 0.5 + Math.cos(angle) * width * 0.44,
    y: height * 0.46 + Math.sin(angle) * height * 0.42,
    radius: Math.min(width, height) * 0.055,
  };
}

export function LatticeCanvas({
  active,
  visited,
  labels,
  introEnabled,
  introSkipKey,
  onIntroStart,
  onIntroIdentity,
  onIntroHandoff,
  onIntroComplete,
}: LatticeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const initialActiveRef = useRef(active);
  const initialVisitedRef = useRef(visited);
  const initialLabelsRef = useRef(labels);
  const initialIntroEnabledRef = useRef(introEnabled);
  const callbacksRef = useRef({ onIntroStart, onIntroIdentity, onIntroHandoff, onIntroComplete });

  useEffect(() => {
    callbacksRef.current = { onIntroStart, onIntroIdentity, onIntroHandoff, onIntroComplete };
  }, [onIntroComplete, onIntroHandoff, onIntroIdentity, onIntroStart]);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    const drawingContext = canvasElement.getContext("2d");
    if (!drawingContext) return;

    let frame = 0;
    let pausedByOverlay = false;
    let seed = 42;
    let introActive = false;
    let introElapsed = 0;
    let introLastTime: number | null = null;
    let introTimings: number[] = [];
    let introPruneEdges: PruneEdge[] = [];
    let introHomeSeed: NodePoint | null = null;
    let introHomeSecond: NodePoint | null = null;
    let identityNotified = false;
    let handoffNotified = false;
    const pointer = { x: -999, y: -999 };
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };

    const engine: Engine = {
      active: initialActiveRef.current,
      visited: new Set(initialVisitedRef.current),
      nodes: [],
      edges: [],
      pulse: null,
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      layout: () => undefined,
      draw: () => undefined,
      skipIntro: () => undefined,
    };

    const sizeCanvas = () => {
      const density = Math.min(window.devicePixelRatio || 1, 2);
      canvasElement.width = window.innerWidth * density;
      canvasElement.height = window.innerHeight * density;
      drawingContext.setTransform(density, 0, 0, density, 0, 0);
    };

    const edgeKeys = new Set<string>();
    const addEdge = (first: number, second: number) => {
      if (first === second) return;
      const key = first < second ? `${first}:${second}` : `${second}:${first}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      engine.edges.push([first, second]);
    };

    const nodesPerCluster = window.innerWidth < 640 ? 8 : window.innerWidth < 1200 ? 10 : 14;
    pageSlugs.forEach((cluster, clusterIndex) => {
      const count = clusterIndex === 0 ? nodesPerCluster + 3 : nodesPerCluster;
      const start = engine.nodes.length;
      for (let index = 0; index < count; index += 1) {
        engine.nodes.push({
          cluster,
          angle: random() * Math.PI * 2,
          radius: 0.25 + random() * 0.75,
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          targetX: 0,
          targetY: 0,
          offsetX: 0,
          offsetY: 0,
          breatheX: 0,
          breatheY: 0,
          amber: random() < 0.14,
          phase: random() * Math.PI * 2,
          size: 1 + random() * 1.6,
          introAlpha: 0,
          introBegin: 0,
          mobileVisible: true,
          seedNode: false,
        });
      }

      for (let index = 0; index < count; index += 1) {
        addEdge(start + index, start + ((index + 1 + Math.floor(random() * 2)) % count));
        if (random() < 0.5) addEdge(start + index, start + Math.floor(random() * count));
      }
    });

    routes.forEach(([from, to]) => {
      const fromIndex = engine.nodes.findIndex((node) => node.cluster === from);
      const toIndex = engine.nodes.findIndex((node) => node.cluster === to);
      if (fromIndex >= 0 && toIndex >= 0) addEdge(fromIndex, toIndex);
    });

    engine.layout = (immediate) => {
      engine.nodes.forEach((node) => {
        const point = anchor(node.cluster, engine.active);
        node.targetX = point.x + Math.cos(node.angle) * point.radius * node.radius;
        node.targetY = point.y + Math.sin(node.angle) * point.radius * node.radius;
        if (immediate) {
          node.x = node.targetX;
          node.y = node.targetY;
        }
      });
    };

    const clusterAlpha = (cluster: PageSlug) => {
      if (cluster === engine.active) return 1;
      return engine.visited.has(cluster) ? 0.45 : 0.16;
    };

    const pointX = (node: NodePoint) => node.x + node.offsetX + node.breatheX;
    const pointY = (node: NodePoint) => node.y + node.offsetY + node.breatheY;

    engine.draw = () => {
      drawingContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
      engine.edges.forEach(([firstIndex, secondIndex]) => {
        const first = engine.nodes[firstIndex];
        const second = engine.nodes[secondIndex];
        if (!first || !second) return;
        const alpha =
          Math.min(clusterAlpha(first.cluster), clusterAlpha(second.cluster)) *
          (first.cluster === second.cluster ? 0.22 : 0.3);
        drawingContext.strokeStyle = `rgba(142,196,214,${alpha})`;
        drawingContext.lineWidth = 0.7;
        drawingContext.beginPath();
        drawingContext.moveTo(pointX(first), pointY(first));
        drawingContext.lineTo(pointX(second), pointY(second));
        drawingContext.stroke();
      });

      engine.nodes.forEach((node) => {
        const alpha = clusterAlpha(node.cluster);
        drawingContext.fillStyle = node.amber
          ? `rgba(216,163,95,${0.85 * alpha})`
          : `rgba(180,214,226,${0.8 * alpha})`;
        drawingContext.beginPath();
        drawingContext.arc(
          pointX(node),
          pointY(node),
          node.size * (node.cluster === engine.active ? 1.3 : 1),
          0,
          Math.PI * 2,
        );
        drawingContext.fill();
        if (alpha > 0.4 && node.size > 2) {
          drawingContext.fillStyle = node.amber
            ? `rgba(216,163,95,${0.1 * alpha})`
            : `rgba(142,196,214,${0.1 * alpha})`;
          drawingContext.beginPath();
          drawingContext.arc(pointX(node), pointY(node), node.size * 5, 0, Math.PI * 2);
          drawingContext.fill();
        }
      });

      if (engine.pulse) {
        const from = anchor(engine.pulse.from, engine.active);
        const to = anchor(engine.pulse.to, engine.active);
        const progress = engine.pulse.progress;
        const x = from.x + (to.x - from.x) * progress;
        const y = from.y + (to.y - from.y) * progress;
        drawingContext.strokeStyle = `rgba(142,196,214,${0.35 * (1 - progress)})`;
        drawingContext.lineWidth = 1;
        drawingContext.beginPath();
        drawingContext.moveTo(from.x, from.y);
        drawingContext.lineTo(x, y);
        drawingContext.stroke();
        drawingContext.fillStyle = "rgba(200,235,245,.9)";
        drawingContext.beginPath();
        drawingContext.arc(x, y, 2.6, 0, Math.PI * 2);
        drawingContext.fill();
      }
    };

    const prepareIntro = () => {
      const scale = window.innerWidth < 640 ? 0.78 : 1;
      introTimings = [0, 0.45, 0.95, 1.7, 2.75, 3.55, 4.35, 5.3].map((time) => time * scale);
      const byCluster = {} as Record<PageSlug, NodePoint[]>;
      pageSlugs.forEach((slug) => {
        byCluster[slug] = [];
      });
      engine.nodes.forEach((node) => {
        node.amberWindow = undefined;
        node.seedNode = false;
        byCluster[node.cluster].push(node);
      });

      let introSeed = 7;
      const introRandom = () => {
        introSeed = (introSeed * 16807) % 2147483647;
        return introSeed / 2147483647;
      };
      const order: Record<PageSlug, [number, number]> = {
        home: [0.5, 1.55],
        systems: [1.72, 2.3],
        sdlc: [1.8, 2.38],
        workflows: [1.9, 2.48],
        notes: [2, 2.56],
        automation: [2.1, 2.62],
        tooling: [2.3, 2.9],
        lab: [2.4, 2.98],
        about: [2.5, 3.05],
        contact: [2.56, 3.1],
      };

      pageSlugs.forEach((cluster) => {
        const nodes = byCluster[cluster];
        const [start, end] = order[cluster];
        nodes.forEach((node, index) => {
          node.introBegin =
            (start + (end - start) * (index / Math.max(nodes.length - 1, 1)) + introRandom() * 0.05) * scale;
          node.mobileVisible = index < Math.ceil(nodes.length * 0.55);
        });
      });

      const homeNodes = byCluster.home;
      introHomeSeed = homeNodes[0] ?? null;
      introHomeSecond = homeNodes[1] ?? introHomeSeed;
      if (introHomeSeed) {
        introHomeSeed.introBegin = 0.5 * scale;
        introHomeSeed.seedNode = true;
        introHomeSeed.mobileVisible = true;
      }
      if (introHomeSecond) {
        introHomeSecond.introBegin = 1 * scale;
        introHomeSecond.mobileVisible = true;
      }

      const workflowNode = byCluster.workflows[1] ?? byCluster.workflows[0] ?? introHomeSeed;
      if (workflowNode) workflowNode.amberWindow = [1.9 * scale, 2.62 * scale];

      introPruneEdges = [];
      for (let index = 0; index < 9; index += 1) {
        const firstCluster = pageSlugs[Math.floor(introRandom() * pageSlugs.length)];
        const secondCluster = pageSlugs[Math.floor(introRandom() * pageSlugs.length)];
        if (firstCluster === secondCluster) continue;
        const firstNodes = byCluster[firstCluster];
        const secondNodes = byCluster[secondCluster];
        const first = firstNodes[Math.floor(introRandom() * firstNodes.length)];
        const second = secondNodes[Math.floor(introRandom() * secondNodes.length)];
        introPruneEdges.push({
          first,
          second,
          startsAt: (1.74 + introRandom() * 0.4) * scale,
          endsAt: (2.28 + introRandom() * 0.42) * scale,
          amber: index === 2,
        });
      }
    };

    const introAnchorPosition = (cluster: PageSlug, elapsed: number) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const [mapX, mapY] = introMapPositions[cluster];
      const spread = 0.42 + 0.58 * smoothStep((elapsed - introTimings[3]) / (introTimings[4] - introTimings[3] + 0.4));
      const mobile = width < 640;
      const factorX = mobile ? 0.92 : 0.86;
      const factorY = mobile ? 1.02 : 0.92;
      return {
        x: width * 0.5 + ((mapX - 50) / 100) * width * factorX * spread,
        y: height * 0.46 + ((mapY - 46) / 100) * height * factorY * spread,
      };
    };

    const introNodePosition = (node: NodePoint, elapsed: number) => {
      const point = introAnchorPosition(node.cluster, elapsed);
      const clusterRadius = Math.min(window.innerWidth, window.innerHeight) * (node.cluster === "home" ? 0.1 : 0.06);
      const emergence = smoothStep((elapsed - (node.introBegin - 0.05)) / 0.6);
      const parent = introParents[node.cluster];
      let baseX = point.x;
      let baseY = point.y;
      if (parent) {
        const parentPoint = introAnchorPosition(parent, elapsed);
        baseX = parentPoint.x + (point.x - parentPoint.x) * emergence;
        baseY = parentPoint.y + (point.y - parentPoint.y) * emergence;
      }
      let x = baseX + Math.cos(node.angle) * clusterRadius * node.radius * (0.3 + 0.7 * emergence);
      let y = baseY + Math.sin(node.angle) * clusterRadius * node.radius * (0.3 + 0.7 * emergence);
      const handoff = travelStep((elapsed - introTimings[6]) / (introTimings[7] - introTimings[6]));
      if (handoff > 0) {
        const finalAnchor = anchor(node.cluster, "home");
        const finalX = finalAnchor.x + Math.cos(node.angle) * finalAnchor.radius * node.radius;
        const finalY = finalAnchor.y + Math.sin(node.angle) * finalAnchor.radius * node.radius;
        x += (finalX - x) * handoff;
        y += (finalY - y) * handoff;
      }
      return { x, y };
    };

    const drawIntro = (elapsed: number) => {
      drawingContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const mobile = window.innerWidth < 640;
      const handoff = travelStep((elapsed - introTimings[6]) / (introTimings[7] - introTimings[6]));

      engine.nodes.forEach((node) => {
        const position = introNodePosition(node, elapsed);
        node.x = position.x;
        node.y = position.y;
        node.targetX = position.x;
        node.targetY = position.y;
        node.introAlpha = mobile && !node.mobileVisible ? 0 : clamp((elapsed - node.introBegin) / 0.3);
      });

      engine.edges.forEach(([firstIndex, secondIndex]) => {
        const first = engine.nodes[firstIndex];
        const second = engine.nodes[secondIndex];
        if (!first || !second) return;
        const edgeBegins = Math.max(first.introBegin, second.introBegin) + 0.12;
        const growth = clamp((elapsed - edgeBegins) / 0.38);
        if (growth <= 0 || first.introAlpha <= 0 || second.introAlpha <= 0) return;
        const pageAlpha = Math.min(clusterAlpha(first.cluster), clusterAlpha(second.cluster));
        const ambientMix = 1 + (pageAlpha - 1) * handoff;
        const alpha =
          (first.cluster === second.cluster ? 0.24 : 0.32) *
          Math.min(first.introAlpha, second.introAlpha) *
          ambientMix *
          (1.3 - 0.3 * handoff) *
          growth;
        const endX = first.x + (second.x - first.x) * growth;
        const endY = first.y + (second.y - first.y) * growth;
        drawingContext.strokeStyle = `rgba(142,196,214,${alpha})`;
        drawingContext.lineWidth = 0.7;
        drawingContext.beginPath();
        drawingContext.moveTo(first.x, first.y);
        drawingContext.lineTo(endX, endY);
        drawingContext.stroke();
        if (growth < 1) {
          drawingContext.fillStyle = "rgba(200,235,245,.85)";
          drawingContext.beginPath();
          drawingContext.arc(endX, endY, 1.6, 0, Math.PI * 2);
          drawingContext.fill();
        }
      });

      introPruneEdges.forEach((edge) => {
        if (elapsed < edge.startsAt || elapsed > edge.endsAt + 0.05) return;
        const fadeIn = clamp((elapsed - edge.startsAt) / 0.22);
        const fadeOut = 1 - clamp((elapsed - (edge.endsAt - 0.3)) / 0.3);
        const alpha = Math.min(fadeIn, fadeOut) * Math.min(edge.first.introAlpha, edge.second.introAlpha);
        if (alpha <= 0) return;
        drawingContext.strokeStyle = edge.amber
          ? `rgba(216,163,95,${0.3 * alpha})`
          : `rgba(142,196,214,${0.2 * alpha})`;
        drawingContext.lineWidth = 0.6;
        drawingContext.setLineDash([3, 4]);
        drawingContext.beginPath();
        drawingContext.moveTo(edge.first.x, edge.first.y);
        drawingContext.lineTo(edge.second.x, edge.second.y);
        drawingContext.stroke();
        drawingContext.setLineDash([]);
      });

      if (
        introHomeSeed &&
        introHomeSecond &&
        introHomeSecond !== introHomeSeed &&
        elapsed > introTimings[1] + 0.12 &&
        elapsed < introTimings[2] + 0.05
      ) {
        const progress = clamp(
          (elapsed - (introTimings[1] + 0.12)) / (introTimings[2] - introTimings[1] - 0.08),
        );
        const target = introNodePosition(introHomeSecond, introTimings[2] + 0.1);
        const x = introHomeSeed.x + (target.x - introHomeSeed.x) * progress;
        const y = introHomeSeed.y + (target.y - introHomeSeed.y) * progress;
        drawingContext.strokeStyle = `rgba(142,196,214,${0.3 * (1 - progress)})`;
        drawingContext.lineWidth = 0.7;
        drawingContext.beginPath();
        drawingContext.moveTo(introHomeSeed.x, introHomeSeed.y);
        drawingContext.lineTo(x, y);
        drawingContext.stroke();
        drawingContext.fillStyle = "rgba(200,235,245,.9)";
        drawingContext.beginPath();
        drawingContext.arc(x, y, 1.8, 0, Math.PI * 2);
        drawingContext.fill();
      }

      engine.nodes.forEach((node) => {
        if (node.introAlpha <= 0) return;
        const pageAlpha = clusterAlpha(node.cluster);
        const alpha = node.introAlpha * (1 + (pageAlpha - 1) * handoff);
        let colour = `rgba(180,214,226,${0.8 * alpha})`;
        let halo: string | null = null;
        if (node.amberWindow) {
          if (elapsed >= node.amberWindow[0] && elapsed < node.amberWindow[1]) {
            colour = `rgba(216,163,95,${(0.55 + 0.3 * Math.sin(elapsed * 7)) * alpha})`;
            halo = `rgba(216,163,95,${0.12 * alpha})`;
          } else if (elapsed >= node.amberWindow[1] && elapsed < node.amberWindow[1] + 0.4) {
            colour = `rgba(183,221,233,${0.9 * alpha})`;
            halo = `rgba(142,196,214,${0.14 * alpha})`;
          }
        } else if (node.amber && elapsed > introTimings[4]) {
          colour = `rgba(216,163,95,${0.85 * alpha})`;
        }
        const size = node.size * (node.cluster === "home" ? 1.28 : 1);
        drawingContext.fillStyle = colour;
        drawingContext.beginPath();
        drawingContext.arc(node.x, node.y, size, 0, Math.PI * 2);
        drawingContext.fill();
        if (node.seedNode && elapsed < introTimings[3]) {
          const bloom =
            clamp((elapsed - node.introBegin) / 0.35) *
            (1 - 0.55 * clamp((elapsed - introTimings[2]) / (introTimings[3] - introTimings[2])));
          drawingContext.fillStyle = `rgba(142,196,214,${0.16 * bloom})`;
          drawingContext.beginPath();
          drawingContext.arc(node.x, node.y, 14, 0, Math.PI * 2);
          drawingContext.fill();
        } else if (halo || (alpha > 0.5 && node.size > 2.1)) {
          drawingContext.fillStyle = halo ?? `rgba(142,196,214,${0.09 * alpha})`;
          drawingContext.beginPath();
          drawingContext.arc(node.x, node.y, size * 4.5, 0, Math.PI * 2);
          drawingContext.fill();
        }
      });

      if (elapsed > introTimings[4] - 0.05 && handoff < 0.98) {
        const fontFamily =
          window.getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() ||
          '"IBM Plex Mono"';
        drawingContext.font = `10px ${fontFamily}, monospace`;
        drawingContext.textAlign = "center";
        pageSlugs.forEach((slug) => {
          if (slug === "home") return;
          const primary = primaryIntroLabels.has(slug);
          if (mobile && !primary) return;
          let alpha = primary
            ? clamp((elapsed - introTimings[4]) / 0.4)
            : 0.62 * clamp((elapsed - (introTimings[4] + 0.45)) / 0.4);
          alpha *= 1 - clamp((elapsed - introTimings[6]) / 0.5);
          if (alpha <= 0) return;
          const point = introAnchorPosition(slug, elapsed);
          const radius = Math.min(window.innerWidth, window.innerHeight) * 0.06;
          drawingContext.fillStyle = primary
            ? `rgba(184,180,171,${alpha})`
            : `rgba(125,122,114,${alpha})`;
          const label = Array.from(initialLabelsRef.current[slug]).join(" ");
          const halfLabelWidth = drawingContext.measureText(label).width / 2;
          const labelX = clamp(
            point.x,
            halfLabelWidth + 8,
            window.innerWidth - halfLabelWidth - 8,
          );
          drawingContext.fillText(label, labelX, point.y + radius + 20);
        });
      }
    };

    const markIntroSeen = () => {
      try {
        window.sessionStorage.setItem("lk-intro-v2-seen", "1");
      } catch {
        // The intro remains usable when storage is unavailable.
      }
    };

    const finishIntro = () => {
      introActive = false;
      introElapsed = introTimings[7] ?? 5.3;
      markIntroSeen();
      engine.active = "home";
      engine.layout(false);
      callbacksRef.current.onIntroComplete();
    };

    engine.skipIntro = () => {
      if (!introActive) return;
      introActive = false;
      introElapsed = introTimings[7] ?? 5.3;
      markIntroSeen();
      engine.active = "home";
      engine.layout(true);
      engine.draw();
      callbacksRef.current.onIntroComplete();
    };

    const startIntro = () => {
      prepareIntro();
      markIntroSeen();
      introActive = true;
      introElapsed = 0;
      introLastTime = null;
      identityNotified = false;
      handoffNotified = false;
      callbacksRef.current.onIntroStart();
    };

    const animate = (time: number) => {
      if (introActive) {
        const now = time / 1000;
        const delta = introLastTime === null ? 0.016 : Math.min(now - introLastTime, 0.05);
        introLastTime = now;
        introElapsed = Math.min(introElapsed + delta, introTimings[7]);
        drawIntro(introElapsed);
        if (!identityNotified && introElapsed >= introTimings[5]) {
          identityNotified = true;
          callbacksRef.current.onIntroIdentity();
        }
        if (!handoffNotified && introElapsed >= introTimings[6]) {
          handoffNotified = true;
          callbacksRef.current.onIntroHandoff();
        }
        if (introElapsed >= introTimings[7]) finishIntro();
      } else {
        engine.nodes.forEach((node) => {
          node.x += (node.targetX - node.x) * 0.055;
          node.y += (node.targetY - node.y) * 0.055;
          const deltaX = node.x - pointer.x;
          const deltaY = node.y - pointer.y;
          const distance = Math.hypot(deltaX, deltaY);
          const push = distance > 0 && distance < 150 ? ((150 - distance) * 0.1) / distance : 0;
          node.offsetX = deltaX * push;
          node.offsetY = deltaY * push;
          const seconds = time / 1000;
          node.breatheX = Math.sin(seconds * 0.4 + node.phase) * 3;
          node.breatheY = Math.cos(seconds * 0.33 + node.phase) * 3;
        });
        if (engine.pulse) {
          engine.pulse.progress += 0.022;
          if (engine.pulse.progress > 1) engine.pulse = null;
        }
        engine.draw();
      }
      frame = window.requestAnimationFrame(animate);
    };

    const stopAnimation = () => {
      if (!frame) return;
      window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const startAnimation = () => {
      if (engine.reduced || frame || document.hidden || pausedByOverlay) return;
      frame = window.requestAnimationFrame(animate);
    };

    const onVisibilityChange = () => {
      if (document.hidden) stopAnimation();
      else startAnimation();
    };

    const onPause = () => {
      pausedByOverlay = true;
      stopAnimation();
    };

    const onResume = () => {
      pausedByOverlay = false;
      engine.draw();
      startAnimation();
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };

    const onResize = () => {
      sizeCanvas();
      if (introActive) {
        prepareIntro();
        drawIntro(introElapsed);
      } else {
        engine.layout(true);
        engine.draw();
      }
    };

    sizeCanvas();
    engine.layout(true);
    engineRef.current = engine;

    let seen = false;
    try {
      seen = window.sessionStorage.getItem("lk-intro-v2-seen") === "1";
    } catch {
      seen = false;
    }
    const introPreference = new URLSearchParams(window.location.search).get("intro");
    const forceReplay = introPreference === "replay";
    const introOff = introPreference === "off";
    const shouldPlayIntro =
      initialIntroEnabledRef.current && !engine.reduced && !introOff && (forceReplay || !seen);

    if (shouldPlayIntro) startIntro();
    else {
      callbacksRef.current.onIntroComplete();
      if (engine.reduced) engine.draw();
    }
    if (!engine.reduced) startAnimation();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("lattice:pause", onPause);
    window.addEventListener("lattice:resume", onResume);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      stopAnimation();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("lattice:pause", onPause);
      window.removeEventListener("lattice:resume", onResume);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const previous = engine.active;
    engine.active = active;
    engine.visited = new Set(visited);
    if (previous !== active && !engine.reduced) {
      engine.pulse = { from: previous, to: active, progress: 0 };
    }
    engine.layout(engine.reduced);
    if (engine.reduced) engine.draw();
  }, [active, visited]);

  useEffect(() => {
    if (introSkipKey > 0) engineRef.current?.skipIntro();
  }, [introSkipKey]);

  return <canvas aria-hidden="true" className="lattice-canvas" ref={canvasRef} />;
}
