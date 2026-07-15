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
  depth: number;
  amber: boolean;
  phase: number;
  size: number;
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

function anchor(cluster: PageSlug, active: PageSlug) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const compact = width < 760;
  if (cluster === active) {
    return {
      x: width * 0.52,
      y: height * 0.47,
      radius: Math.min(width, height) * (compact ? 0.52 : 0.48),
    };
  }

  const others = pageSlugs.filter((slug) => slug !== active);
  const index = others.indexOf(cluster);
  const angle = (index / others.length) * Math.PI * 2 - Math.PI / 2;
  return {
    x: width * 0.5 + Math.cos(angle) * width * (compact ? 0.34 : 0.38),
    y: height * 0.47 + Math.sin(angle) * height * (compact ? 0.32 : 0.35),
    radius: Math.min(width, height) * (compact ? 0.14 : 0.12),
  };
}

export function LatticeCanvas({ active, visited }: { active: PageSlug; visited: PageSlug[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const initialActiveRef = useRef(active);
  const initialVisitedRef = useRef(visited);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    const drawingContext = canvasElement.getContext("2d");
    if (!drawingContext) return;

    let frame = 0;
    let pausedByOverlay = false;
    let seed = 42;
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
    };

    const sizeCanvas = () => {
      const density = Math.min(window.devicePixelRatio || 1, 2);
      canvasElement.width = window.innerWidth * density;
      canvasElement.height = window.innerHeight * density;
      drawingContext.setTransform(density, 0, 0, density, 0, 0);
    };

    const edgeKeys = new Set<string>();
    const addEdge = (a: number, b: number) => {
      if (a === b) return;
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      engine.edges.push([a, b]);
    };

    const nodesPerCluster = window.innerWidth < 760 ? 9 : window.innerWidth < 1200 ? 14 : 18;
    pageSlugs.forEach((cluster, clusterIndex) => {
      const count = clusterIndex === 0 ? nodesPerCluster + 5 : nodesPerCluster;
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
          depth: 0.18 + random() * 0.82,
          amber: random() < 0.14,
          phase: random() * Math.PI * 2,
          size: 0.75 + random() * 1.55,
        });
      }

      const clusterNodes = Array.from({ length: count }, (_, index) => start + index).sort(
        (a, b) => engine.nodes[a].angle - engine.nodes[b].angle,
      );
      for (let index = 0; index < clusterNodes.length; index += 1) {
        addEdge(clusterNodes[index], clusterNodes[(index + 1) % count]);
        if (random() < 0.9) addEdge(clusterNodes[index], clusterNodes[(index + 2) % count]);
        if (random() < 0.42) {
          addEdge(clusterNodes[index], clusterNodes[(index + 3 + Math.floor(random() * 3)) % count]);
        }
      }
    });

    routes.forEach(([from, to]) => {
      const fromNodes = engine.nodes
        .map((node, index) => (node.cluster === from ? index : -1))
        .filter((index) => index >= 0);
      const toNodes = engine.nodes
        .map((node, index) => (node.cluster === to ? index : -1))
        .filter((index) => index >= 0);
      const connections = window.innerWidth < 760 ? 1 : 3;
      for (let index = 0; index < connections; index += 1) {
        addEdge(
          fromNodes[Math.floor(random() * fromNodes.length)],
          toNodes[Math.floor(random() * toNodes.length)],
        );
      }
    });

    engine.layout = (immediate) => {
      engine.nodes.forEach((node) => {
        const point = anchor(node.cluster, engine.active);
        const perspective = 0.62 + node.depth * 0.58;
        node.targetX = point.x + Math.cos(node.angle) * point.radius * node.radius * perspective;
        node.targetY = point.y + Math.sin(node.angle) * point.radius * node.radius * perspective;
        if (immediate) {
          node.x = node.targetX;
          node.y = node.targetY;
        }
      });
    };

    const clusterAlpha = (cluster: PageSlug) => {
      if (cluster === engine.active) return 1;
      return engine.visited.has(cluster) ? 0.52 : 0.28;
    };

    engine.draw = (time = 0) => {
      drawingContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const pointX = (node: NodePoint) => node.x + node.offsetX + node.breatheX;
      const pointY = (node: NodePoint) => node.y + node.offsetY + node.breatheY;
      const visualDepth = (node: NodePoint) =>
        Math.min(1, Math.max(0.12, node.depth + Math.sin(time * 0.00016 + node.phase) * 0.08));

      engine.edges.forEach(([a, b]) => {
        const first = engine.nodes[a];
        const second = engine.nodes[b];
        const depth = (visualDepth(first) + visualDepth(second)) / 2;
        const alpha =
          Math.min(clusterAlpha(first.cluster), clusterAlpha(second.cluster)) *
          (first.cluster === second.cluster ? 0.12 + depth * 0.16 : 0.14 + depth * 0.18);
        if (depth > 0.72) {
          drawingContext.strokeStyle = `rgba(142,196,214,${alpha * 0.16})`;
          drawingContext.lineWidth = 2.4 + depth * 1.8;
          drawingContext.beginPath();
          drawingContext.moveTo(pointX(first), pointY(first));
          drawingContext.lineTo(pointX(second), pointY(second));
          drawingContext.stroke();
        }
        drawingContext.strokeStyle = `rgba(142,196,214,${alpha})`;
        drawingContext.lineWidth = 0.45 + depth * 0.7;
        drawingContext.beginPath();
        drawingContext.moveTo(pointX(first), pointY(first));
        drawingContext.lineTo(pointX(second), pointY(second));
        drawingContext.stroke();
      });

      engine.nodes.forEach((node) => {
        const alpha = clusterAlpha(node.cluster);
        const depth = visualDepth(node);
        const nodeAlpha = alpha * (0.48 + depth * 0.42);
        drawingContext.fillStyle = node.amber
          ? `rgba(216,163,95,${nodeAlpha})`
          : `rgba(180,214,226,${nodeAlpha})`;
        drawingContext.beginPath();
        drawingContext.arc(
          pointX(node),
          pointY(node),
          node.size * (0.66 + depth * 0.9) * (node.cluster === engine.active ? 1.18 : 1),
          0,
          Math.PI * 2,
        );
        drawingContext.fill();
        if (depth > 0.68 && alpha > 0.35) {
          drawingContext.fillStyle = node.amber
            ? `rgba(216,163,95,${0.08 * alpha * depth})`
            : `rgba(142,196,214,${0.08 * alpha * depth})`;
          drawingContext.beginPath();
          drawingContext.arc(pointX(node), pointY(node), node.size * (4 + depth * 4), 0, Math.PI * 2);
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

      if (!engine.reduced) {
        engine.nodes.forEach((node) => {
          node.x += (node.targetX - node.x) * 0.055;
          node.y += (node.targetY - node.y) * 0.055;
          const deltaX = node.x - pointer.x;
          const deltaY = node.y - pointer.y;
          const distance = Math.hypot(deltaX, deltaY);
          const push =
            distance > 0 && distance < 170
              ? (((170 - distance) * 0.085) / distance) * (0.65 + node.depth * 0.8)
              : 0;
          node.offsetX = deltaX * push;
          node.offsetY = deltaY * push;
          node.breatheX = Math.sin(time * (0.00025 + node.depth * 0.00016) + node.phase) * (2 + node.depth * 3.5);
          node.breatheY = Math.cos(time * (0.00022 + node.depth * 0.00014) + node.phase) * (2 + node.depth * 3.5);
        });
        if (engine.pulse) {
          engine.pulse.progress += 0.022;
          if (engine.pulse.progress > 1) engine.pulse = null;
        }
      }
    };

    function animate(time: number) {
      engine.draw(time);
      frame = window.requestAnimationFrame(animate);
    }

    function stopAnimation() {
      if (!frame) return;
      window.cancelAnimationFrame(frame);
      frame = 0;
    }

    function startAnimation() {
      if (engine.reduced || frame || document.hidden || pausedByOverlay) return;
      frame = window.requestAnimationFrame(animate);
    }

    function onVisibilityChange() {
      if (document.hidden) stopAnimation();
      else startAnimation();
    }

    function onPause() {
      pausedByOverlay = true;
      stopAnimation();
    }

    function onResume() {
      pausedByOverlay = false;
      engine.draw(performance.now());
      startAnimation();
    }

    function onPointerMove(event: PointerEvent) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }

    function onResize() {
      sizeCanvas();
      engine.layout(true);
      engine.draw();
    }

    sizeCanvas();
    engine.layout(true);
    engineRef.current = engine;
    if (engine.reduced) engine.draw();
    else startAnimation();
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

  return <canvas aria-hidden="true" className="lattice-canvas" ref={canvasRef} />;
}
