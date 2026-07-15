"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { hrefFor, pageSlugs, type Locale, type PageSlug } from "@/lib/site";

type GraphNode = {
  slug: PageSlug;
  x: number;
  y: number;
  vx: number;
  vy: number;
  offsetX: number;
  offsetY: number;
  baseZ: number;
  phase: number;
};

type ProjectedNode = {
  x: number;
  y: number;
  scale: number;
  depth: number;
};

type DragState = {
  slug: PageSlug;
  pointerId: number;
  lastX: number;
  lastY: number;
  moved: boolean;
};

type SatelliteNode = {
  parent: PageSlug;
  index: number;
  angle: number;
  orbit: number;
  phase: number;
  depth: number;
  amber: boolean;
};

type GraphEngine = {
  nodes: GraphNode[];
  projected: Map<PageSlug, ProjectedNode>;
  hovered: PageSlug | null;
  dragging: DragState | null;
  suppressClick: PageSlug | null;
  pointer: { x: number; y: number; active: boolean };
  reduced: boolean;
  draw: (time?: number) => void;
};

const graphPositions: Record<PageSlug, [number, number]> = {
  home: [0.5, 0.46],
  systems: [0.16, 0.2],
  sdlc: [0.48, 0.07],
  workflows: [0.84, 0.2],
  automation: [0.95, 0.5],
  tooling: [0.81, 0.82],
  lab: [0.49, 0.93],
  notes: [0.15, 0.79],
  about: [0.05, 0.49],
  contact: [0.31, 0.57],
};

export const graphEdges: Array<[PageSlug, PageSlug]> = [
  ["home", "systems"],
  ["home", "sdlc"],
  ["home", "notes"],
  ["home", "lab"],
  ["home", "about"],
  ["systems", "sdlc"],
  ["sdlc", "workflows"],
  ["workflows", "automation"],
  ["automation", "tooling"],
  ["notes", "systems"],
  ["notes", "workflows"],
  ["lab", "workflows"],
  ["about", "contact"],
  ["home", "contact"],
];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function MapGraph({
  current,
  hint,
  labels,
  locale,
  mapLabel,
  onNavigate,
  visited,
}: {
  current: PageSlug;
  hint: string;
  labels: Record<PageSlug, string>;
  locale: Locale;
  mapLabel: string;
  onNavigate: () => void;
  visited: PageSlug[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const linkRefs = useRef<Partial<Record<PageSlug, HTMLAnchorElement | null>>>({});
  const engineRef = useRef<GraphEngine | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const visitedSet = new Set(visited);
    const monoFamily =
      getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || "monospace";
    let frame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    const nodes = pageSlugs.map((slug, index): GraphNode => ({
      slug,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      offsetX: 0,
      offsetY: 0,
      baseZ: (((index * 37) % 101) / 100 - 0.5) * 0.72,
      phase: index * 1.71 + 0.4,
    }));
    const satellites = pageSlugs.flatMap((parent, parentIndex) =>
      Array.from({ length: 4 }, (_, satelliteIndex): SatelliteNode => ({
        parent,
        index: satelliteIndex,
        angle: parentIndex * 0.83 + satelliteIndex * ((Math.PI * 2) / 4),
        orbit: 34 + ((parentIndex * 19 + satelliteIndex * 17) % 42),
        phase: parentIndex * 1.37 + satelliteIndex * 2.13,
        depth: 0.18 + ((parentIndex * 29 + satelliteIndex * 23) % 73) / 100,
        amber: (parentIndex + satelliteIndex * 3) % 7 === 0,
      })),
    );

    const engine: GraphEngine = {
      nodes,
      projected: new Map(),
      hovered: null,
      dragging: null,
      suppressClick: null,
      pointer: { x: 0, y: 0, active: false },
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      draw: () => undefined,
    };

    const targetFor = (node: GraphNode) => {
      const compact = width < 560;
      const horizontalPadding = compact ? 46 : 32;
      const verticalPadding = compact ? 66 : 30;
      const [normalX, normalY] = graphPositions[node.slug];
      return {
        x: horizontalPadding + normalX * Math.max(1, width - horizontalPadding * 2) + node.offsetX,
        y: verticalPadding + normalY * Math.max(1, height - verticalPadding * 2) + node.offsetY,
      };
    };

    const project = (node: GraphNode, time: number): ProjectedNode => {
      const centerX = width / 2;
      const centerY = height / 2;
      const motion = engine.reduced ? 0 : time;
      const depthWave = Math.sin(motion * 0.00035 + node.phase) * 0.16;
      const depth = node.baseZ + depthWave;
      const worldZ = depth * Math.min(width, height) * 0.34;
      const rotationY = engine.reduced ? 0 : Math.sin(time * 0.00009) * 0.1;
      const rotationX = engine.reduced ? 0 : Math.cos(time * 0.000075) * 0.065;
      const relativeX = node.x - centerX;
      const relativeY = node.y - centerY;
      const rotatedX = relativeX * Math.cos(rotationY) - worldZ * Math.sin(rotationY);
      const rotatedZ = relativeX * Math.sin(rotationY) + worldZ * Math.cos(rotationY);
      const rotatedY = relativeY * Math.cos(rotationX) - rotatedZ * Math.sin(rotationX);
      const finalZ = relativeY * Math.sin(rotationX) + rotatedZ * Math.cos(rotationX);
      const perspective = 780;
      const scale = clamp(perspective / (perspective + finalZ), 0.76, 1.24);
      return {
        x: centerX + rotatedX * scale,
        y: centerY + rotatedY * scale,
        scale,
        depth: clamp((scale - 0.76) / 0.48, 0, 1),
      };
    };

    const applyPhysics = () => {
      if (engine.reduced) return;
      const compact = width < 560;
      const minimumDistance = compact ? 58 : 88;

      engine.nodes.forEach((node) => {
        if (engine.dragging?.slug !== node.slug) {
          node.offsetX *= 0.986;
          node.offsetY *= 0.986;
        }
        const target = targetFor(node);
        node.vx += (target.x - node.x) * 0.0038;
        node.vy += (target.y - node.y) * 0.0038;
      });

      for (let firstIndex = 0; firstIndex < engine.nodes.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < engine.nodes.length; secondIndex += 1) {
          const first = engine.nodes[firstIndex];
          const second = engine.nodes[secondIndex];
          const deltaX = second.x - first.x;
          const deltaY = second.y - first.y;
          const distance = Math.max(1, Math.hypot(deltaX, deltaY));
          if (distance >= minimumDistance) continue;
          const force = ((minimumDistance - distance) / minimumDistance) * 0.14;
          first.vx -= (deltaX / distance) * force;
          first.vy -= (deltaY / distance) * force;
          second.vx += (deltaX / distance) * force;
          second.vy += (deltaY / distance) * force;
        }
      }

      if (engine.pointer.active && !engine.dragging) {
        engine.nodes.forEach((node) => {
          const deltaX = node.x - engine.pointer.x;
          const deltaY = node.y - engine.pointer.y;
          const distance = Math.max(1, Math.hypot(deltaX, deltaY));
          const radius = compact ? 90 : 140;
          if (distance >= radius) return;
          const force = ((radius - distance) / radius) * 0.38;
          node.vx += (deltaX / distance) * force;
          node.vy += (deltaY / distance) * force;
        });
      }

      engine.nodes.forEach((node) => {
        node.vx *= 0.9;
        node.vy *= 0.9;
        node.x += node.vx;
        node.y += node.vy;
      });
    };

    const drawEdge = (
      from: ProjectedNode,
      to: ProjectedNode,
      alpha: number,
      widthValue: number,
      glow: boolean,
    ) => {
      if (glow) {
        context.strokeStyle = `rgba(142,196,214,${alpha * 0.18})`;
        context.lineWidth = widthValue * 5;
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
      }
      const gradient = context.createLinearGradient(from.x, from.y, to.x, to.y);
      gradient.addColorStop(0, `rgba(142,196,214,${alpha * (0.62 + from.depth * 0.38)})`);
      gradient.addColorStop(1, `rgba(216,163,95,${alpha * (0.45 + to.depth * 0.3)})`);
      context.strokeStyle = gradient;
      context.lineWidth = widthValue;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    };

    engine.draw = (time = 0) => {
      applyPhysics();
      context.clearRect(0, 0, width, height);
      engine.projected.clear();
      engine.nodes.forEach((node) => engine.projected.set(node.slug, project(node, time)));

      const satelliteGroups = new Map<
        PageSlug,
        Array<{ x: number; y: number; depth: number; amber: boolean }>
      >();
      satellites.forEach((satellite) => {
        const parent = engine.projected.get(satellite.parent);
        if (!parent) return;
        const compact = width < 560;
        if (compact && satellite.index > 1) return;
        const motion = engine.reduced ? 0 : time;
        const angle = satellite.angle + Math.sin(motion * 0.00016 + satellite.phase) * 0.3;
        const orbit = satellite.orbit * (compact ? 0.58 : 1) * parent.scale;
        const depthWave = Math.sin(motion * 0.00028 + satellite.phase) * 0.18;
        const satelliteDepth = clamp(satellite.depth + depthWave, 0.05, 1);
        const satelliteX = parent.x + Math.cos(angle) * orbit;
        const satelliteY = parent.y + Math.sin(angle) * orbit * (0.46 + satelliteDepth * 0.25);
        const highlighted = satellite.parent === current || engine.hovered === satellite.parent;
        const parentVisited = visitedSet.has(satellite.parent);
        const alpha = highlighted ? 0.58 : parentVisited ? 0.42 : 0.24;

        const group = satelliteGroups.get(satellite.parent) ?? [];
        group.push({ x: satelliteX, y: satelliteY, depth: satelliteDepth, amber: satellite.amber });
        satelliteGroups.set(satellite.parent, group);

        context.strokeStyle = satellite.amber
          ? `rgba(216,163,95,${alpha * 0.72})`
          : `rgba(142,196,214,${alpha})`;
        context.lineWidth = 0.45 + satelliteDepth * 0.35;
        context.beginPath();
        context.moveTo(parent.x, parent.y);
        context.lineTo(satelliteX, satelliteY);
        context.stroke();

        context.fillStyle = satellite.amber
          ? `rgba(216,163,95,${alpha * 1.8})`
          : `rgba(183,221,233,${alpha * 1.65})`;
        context.beginPath();
        context.arc(satelliteX, satelliteY, 0.8 + satelliteDepth * 1.4, 0, Math.PI * 2);
        context.fill();

        if (highlighted && satelliteDepth > 0.55) {
          context.fillStyle = satellite.amber ? "rgba(216,163,95,.055)" : "rgba(142,196,214,.055)";
          context.beginPath();
          context.arc(satelliteX, satelliteY, 5 + satelliteDepth * 4, 0, Math.PI * 2);
          context.fill();
        }
      });

      satelliteGroups.forEach((group, parentSlug) => {
        if (group.length < 2) return;
        const highlighted = parentSlug === current || engine.hovered === parentSlug;
        const parentVisited = visitedSet.has(parentSlug);
        const alpha = highlighted ? 0.32 : parentVisited ? 0.2 : 0.11;
        group.forEach((point, index) => {
          const next = group[(index + 1) % group.length];
          context.strokeStyle = `rgba(142,196,214,${alpha})`;
          context.lineWidth = 0.45 + ((point.depth + next.depth) / 2) * 0.28;
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(next.x, next.y);
          context.stroke();
        });
      });

      graphEdges.forEach(([fromSlug, toSlug], edgeIndex) => {
        const from = engine.projected.get(fromSlug);
        const to = engine.projected.get(toSlug);
        if (!from || !to) return;
        const active = fromSlug === current || toSlug === current;
        const bothVisited = visitedSet.has(fromSlug) && visitedSet.has(toSlug);
        const hovered = engine.hovered === fromSlug || engine.hovered === toSlug;
        const alpha = hovered ? 0.94 : active ? 0.78 : bothVisited ? 0.46 : 0.23;
        const widthValue = hovered ? 1.65 : active ? 1.25 : 0.7 + ((from.depth + to.depth) / 2) * 0.35;
        drawEdge(from, to, alpha, widthValue, hovered || active);

        if (!engine.reduced && (active || hovered)) {
          const progress = (time * 0.00018 + edgeIndex * 0.17) % 1;
          const pulseX = from.x + (to.x - from.x) * progress;
          const pulseY = from.y + (to.y - from.y) * progress;
          context.fillStyle = hovered ? "rgba(233,229,220,.96)" : "rgba(183,221,233,.9)";
          context.beginPath();
          context.arc(pulseX, pulseY, hovered ? 2.8 : 2.1, 0, Math.PI * 2);
          context.fill();
        }
      });

      engine.nodes.forEach((node) => {
        const point = engine.projected.get(node.slug);
        if (!point) return;
        const isCurrent = node.slug === current;
        const isHovered = node.slug === engine.hovered;
        const isVisited = visitedSet.has(node.slug);
        const nodeScale = point.scale * (isHovered ? 1.14 : 1);
        const radius = (isCurrent ? 7.5 : isHovered ? 6.5 : isVisited ? 4.4 : 3.4) * nodeScale;
        const haloRadius = (isCurrent ? 22 : isHovered ? 19 : 8 + point.depth * 5) * nodeScale;
        context.fillStyle = isCurrent
          ? "rgba(142,196,214,.18)"
          : isHovered
            ? "rgba(216,163,95,.17)"
            : `rgba(142,196,214,${0.025 + point.depth * 0.025})`;
        context.beginPath();
        context.arc(point.x, point.y, haloRadius, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = isCurrent
          ? "rgba(183,221,233,.98)"
          : isHovered
            ? "rgba(216,163,95,.98)"
            : isVisited
              ? "rgba(142,196,214,.88)"
              : `rgba(233,229,220,${0.34 + point.depth * 0.28})`;
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fill();

        if (isCurrent || isHovered) {
          context.strokeStyle = isCurrent ? "rgba(183,221,233,.72)" : "rgba(216,163,95,.72)";
          context.lineWidth = 1;
          context.beginPath();
          context.arc(point.x, point.y, radius + 4, 0, Math.PI * 2);
          context.stroke();
        }

        const compact = width < 560;
        const labelSize = clamp((compact ? 7.5 : 9.6) * point.scale, compact ? 7 : 8.7, compact ? 8.5 : 10.8);
        context.fillStyle = isCurrent || isHovered
          ? "rgba(233,229,220,.96)"
          : isVisited
            ? "rgba(200,196,186,.9)"
            : `rgba(158,154,144,${0.68 + point.depth * 0.2})`;
        context.font = `${isCurrent || isHovered ? 500 : 400} ${labelSize}px ${monoFamily}`;
        context.textAlign = "center";
        context.textBaseline = "top";
        context.fillText(labels[node.slug].split("").join(" "), point.x, point.y + radius + (compact ? 6 : 8));
      });
    };

    const size = () => {
      const bounds = root.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      engine.nodes.forEach((node) => {
        const target = targetFor(node);
        const link = linkRefs.current[node.slug];
        if (link) {
          link.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`;
        }
        if (node.x === 0 && node.y === 0) {
          node.x = target.x;
          node.y = target.y;
        }
      });
      engine.draw(performance.now());
    };

    const animate = (time: number) => {
      engine.draw(time);
      frame = window.requestAnimationFrame(animate);
    };

    const stopAnimation = () => {
      if (!frame) return;
      window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const startAnimation = () => {
      if (engine.reduced || frame || document.hidden) return;
      frame = window.requestAnimationFrame(animate);
    };

    const onVisibilityChange = () => {
      if (document.hidden) stopAnimation();
      else {
        engine.draw(performance.now());
        startAnimation();
      }
    };

    const resizeObserver = new ResizeObserver(size);
    resizeObserver.observe(root);
    size();
    engineRef.current = engine;
    startAnimation();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopAnimation();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resizeObserver.disconnect();
      engineRef.current = null;
    };
  }, [current, labels, visited]);

  const redrawIfReduced = () => {
    const engine = engineRef.current;
    if (engine?.reduced) engine.draw();
  };

  return (
    <div
      className="map-graph"
      onPointerLeave={() => {
        const engine = engineRef.current;
        if (!engine) return;
        engine.pointer.active = false;
        engine.hovered = null;
        redrawIfReduced();
      }}
      onPointerMove={(event) => {
        const engine = engineRef.current;
        const root = rootRef.current;
        if (!engine || !root) return;
        const bounds = root.getBoundingClientRect();
        engine.pointer.x = event.clientX - bounds.left;
        engine.pointer.y = event.clientY - bounds.top;
        engine.pointer.active = true;
        if (engine.dragging && engine.dragging.pointerId === event.pointerId) {
          const node = engine.nodes.find((item) => item.slug === engine.dragging?.slug);
          if (node) {
            const deltaX = event.clientX - engine.dragging.lastX;
            const deltaY = event.clientY - engine.dragging.lastY;
            node.offsetX += deltaX;
            node.offsetY += deltaY;
            node.x += deltaX;
            node.y += deltaY;
            engine.dragging.lastX = event.clientX;
            engine.dragging.lastY = event.clientY;
            if (Math.abs(deltaX) + Math.abs(deltaY) > 1) engine.dragging.moved = true;
          }
        }
        redrawIfReduced();
      }}
      onPointerUp={(event) => {
        const engine = engineRef.current;
        if (!engine?.dragging || engine.dragging.pointerId !== event.pointerId) return;
        if (engine.dragging.moved) engine.suppressClick = engine.dragging.slug;
        engine.dragging = null;
        redrawIfReduced();
      }}
      ref={rootRef}
    >
      <canvas aria-hidden="true" className="map-graph-canvas" ref={canvasRef} />
      <nav aria-label={mapLabel} className="map-graph-nodes">
        {pageSlugs.map((slug) => {
          const isCurrent = current === slug;
          return (
            <Link
              aria-label={labels[slug]}
              aria-current={isCurrent ? "page" : undefined}
              className="map-node-hit-area"
              href={hrefFor(locale, slug)}
              key={slug}
              onBlur={() => {
                const engine = engineRef.current;
                if (engine?.hovered === slug) engine.hovered = null;
                redrawIfReduced();
              }}
              onClick={(event) => {
                const engine = engineRef.current;
                if (engine?.suppressClick === slug) {
                  event.preventDefault();
                  engine.suppressClick = null;
                  return;
                }
                onNavigate();
              }}
              onFocus={() => {
                const engine = engineRef.current;
                if (engine) engine.hovered = slug;
                redrawIfReduced();
              }}
              onPointerDown={(event) => {
                const engine = engineRef.current;
                if (!engine || event.button !== 0) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                engine.dragging = {
                  slug,
                  pointerId: event.pointerId,
                  lastX: event.clientX,
                  lastY: event.clientY,
                  moved: false,
                };
              }}
              onPointerEnter={() => {
                const engine = engineRef.current;
                if (engine) engine.hovered = slug;
                redrawIfReduced();
              }}
              onPointerLeave={() => {
                const engine = engineRef.current;
                if (engine?.hovered === slug && !engine.dragging) engine.hovered = null;
                redrawIfReduced();
              }}
              ref={(element) => {
                linkRefs.current[slug] = element;
              }}
            >
              <span className="map-node-accessible-label">{labels[slug]}</span>
            </Link>
          );
        })}
      </nav>
      <p className="map-graph-hint">{hint}</p>
    </div>
  );
}
