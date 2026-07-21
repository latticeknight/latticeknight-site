"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { introWillPlay, markIntroDone, markIntroSeen } from "@/lib/intro-decision";
import {
  hrefFor,
  pageSlugs,
  type Locale,
  type PageSlug,
} from "@/lib/site";

type ProjectedNode = {
  x: number;
  y: number;
  scale: number;
  depth: number;
};

type SceneNode = {
  id: number;
  cluster: PageSlug;
  hub: boolean;
  angle: number;
  radius: number;
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  attractionX: number;
  attractionY: number;
  amber: boolean;
  phase: number;
  size: number;
  introAlpha: number;
  introBegin: number;
  mobileVisible: boolean;
  seedNode: boolean;
  projected: ProjectedNode;
  amberWindow?: [number, number];
};

type SceneEdge = {
  first: number;
  second: number;
  route: boolean;
};

type PruneEdge = {
  first: SceneNode;
  second: SceneNode;
  startsAt: number;
  endsAt: number;
  amber: boolean;
};

type LabelMotion = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type LabelSize = {
  halfWidth: number;
  height: number;
};

type CameraState = {
  yaw: number;
  pitch: number;
  velocityYaw: number;
  velocityPitch: number;
};

type DragState = {
  pointerId: number;
  lastX: number;
  lastY: number;
  moved: boolean;
};

type SceneEngine = {
  active: PageSlug;
  visited: Set<PageSlug>;
  nodes: SceneNode[];
  edges: SceneEdge[];
  projected: Map<number, ProjectedNode>;
  hubIndexes: Map<PageSlug, number>;
  hoveredCluster: PageSlug | null;
  hoveredEdge: number | null;
  pointer: { x: number; y: number; active: boolean };
  camera: CameraState;
  dragging: DragState | null;
  suppressClick: boolean;
  navigatorOpen: boolean;
  navigatorProgress: number;
  reduced: boolean;
  pulse: { from: PageSlug; to: PageSlug; progress: number } | null;
  layout: (immediate: boolean) => void;
  requestDraw: () => void;
  skipIntro: () => void;
};

type LatticeCanvasProps = {
  active: PageSlug;
  visited: PageSlug[];
  labels: Record<PageSlug, string>;
  locale: Locale;
  introEnabled: boolean;
  introSkipKey: number;
  navigatorOpen: boolean;
  navigatorLabel: string;
  navigatorHint: string;
  closeLabel: string;
  onNavigatorClose: () => void;
  onNavigatorCancelNavigation: () => void;
  onNavigatorNavigate: () => void;
  onIntroStart: () => void;
  onIntroIdentity: () => void;
  onIntroHandoff: () => void;
  onIntroComplete: () => void;
};

const routes: Array<[PageSlug, PageSlug]> = [
  ["home", "systems"],
  ["home", "sdlc"],
  ["home", "notes"],
  ["home", "lab"],
  ["home", "about"],
  ["home", "contact"],
  ["systems", "sdlc"],
  ["sdlc", "workflows"],
  ["workflows", "automation"],
  ["automation", "tooling"],
  ["notes", "systems"],
  ["notes", "workflows"],
  ["lab", "workflows"],
  ["about", "contact"],
];

const mapPositions: Record<PageSlug, [number, number, number]> = {
  home: [50, 45, -0.06],
  systems: [22, 24, 0.2],
  sdlc: [50, 12, -0.18],
  workflows: [78, 22, 0.12],
  automation: [90, 50, -0.12],
  tooling: [78, 78, 0.24],
  lab: [50, 88, -0.2],
  notes: [22, 76, 0.1],
  about: [10, 50, -0.14],
  contact: [32, 58, 0.18],
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

const primaryIntroLabels = new Set<PageSlug>([
  "systems",
  "sdlc",
  "workflows",
  "automation",
  "notes",
]);

const frameMilliseconds = 1000 / 60;
const introFadeDuration = 620;

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

/**
 * The easing below is authored as per-frame factors at 60fps. Both helpers
 * rescale a factor to the frame actually elapsed so the scene converges at the
 * same rate on a 120Hz display as on a 60Hz one.
 */
function easeFactor(factor: number, step: number) {
  return 1 - Math.pow(1 - factor, step);
}

function decayFactor(factor: number, step: number) {
  return Math.pow(factor, step);
}

function normalizeAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function smoothStep(value: number) {
  const time = clamp(value);
  return time * time * (3 - 2 * time);
}

function travelStep(value: number) {
  const time = clamp(value);
  return time < 0.5
    ? 2 * time * time
    : 1 - Math.pow(-2 * time + 2, 2) / 2;
}

function distanceToSegment(
  pointX: number,
  pointY: number,
  firstX: number,
  firstY: number,
  secondX: number,
  secondY: number,
) {
  const deltaX = secondX - firstX;
  const deltaY = secondY - firstY;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) return Math.hypot(pointX - firstX, pointY - firstY);
  const progress = clamp(
    ((pointX - firstX) * deltaX + (pointY - firstY) * deltaY) /
      lengthSquared,
  );
  return Math.hypot(
    pointX - (firstX + progress * deltaX),
    pointY - (firstY + progress * deltaY),
  );
}

function anchorPosition(
  cluster: PageSlug,
  width: number,
  height: number,
) {
  const [mapX, mapY, mapZ] = mapPositions[cluster];
  const compact = width < 640;
  const factorX = compact ? 0.9 : 0.84;
  const factorY = compact ? 0.9 : 0.84;
  return {
    x: width * 0.5 + ((mapX - 50) / 100) * width * factorX,
    y: height * 0.46 + ((mapY - 46) / 100) * height * factorY,
    z: mapZ * Math.min(width, height),
  };
}

export function LatticeCanvas({
  active,
  visited,
  labels,
  locale,
  introEnabled,
  introSkipKey,
  navigatorOpen,
  navigatorLabel,
  navigatorHint,
  closeLabel,
  onNavigatorClose,
  onNavigatorCancelNavigation,
  onNavigatorNavigate,
  onIntroStart,
  onIntroIdentity,
  onIntroHandoff,
  onIntroComplete,
}: LatticeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SceneEngine | null>(null);
  const linkRefs = useRef<Partial<Record<PageSlug, HTMLAnchorElement | null>>>({});
  const labelMotionRef = useRef<Partial<Record<PageSlug, LabelMotion>>>({});
  const labelSizeRef = useRef<Partial<Record<PageSlug, LabelSize>>>({});
  const hintRef = useRef<HTMLParagraphElement>(null);
  const hintHeightRef = useRef(0);
  const initialActiveRef = useRef(active);
  const initialVisitedRef = useRef(visited);
  const initialLabelsRef = useRef(labels);
  const initialIntroEnabledRef = useRef(introEnabled);
  const callbacksRef = useRef({
    onIntroStart,
    onIntroIdentity,
    onIntroHandoff,
    onIntroComplete,
  });

  useEffect(() => {
    callbacksRef.current = {
      onIntroStart,
      onIntroIdentity,
      onIntroHandoff,
      onIntroComplete,
    };
  }, [onIntroComplete, onIntroHandoff, onIntroIdentity, onIntroStart]);

  useEffect(() => {
    initialLabelsRef.current = labels;
    labelSizeRef.current = {};
  }, [labels]);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) {
      callbacksRef.current.onIntroComplete();
      return;
    }
    const context = canvasElement.getContext("2d");
    if (!context) {
      callbacksRef.current.onIntroComplete();
      return;
    }

    let frame = 0;
    let reducedFrame = 0;
    let pausedByOverlay = false;
    let seed = 42;
    let introActive = false;
    let introElapsed = 0;
    let introLastTime: number | null = null;
    let introTimings: number[] = [];
    let introScale = 0;
    const introProjection: ProjectedNode = { x: 0, y: 0, scale: 1, depth: 0 };
    let introMonoFont: string | null = null;
    let introPruneEdges: PruneEdge[] = [];
    let introHomeSeed: SceneNode | null = null;
    let introHomeSecond: SceneNode | null = null;
    let identityNotified = false;
    let handoffNotified = false;
    let sceneMotionStartedAt: number | null = null;
    let sceneLastTime: number | null = null;
    let introFade: { snapshot: HTMLCanvasElement; startedAt: number } | null = null;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let layoutWidth = width;
    let layoutHeight = height;
    let resizeFrame = 0;
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };

    const engine: SceneEngine = {
      active: initialActiveRef.current,
      visited: new Set(initialVisitedRef.current),
      nodes: [],
      edges: [],
      projected: new Map(),
      hubIndexes: new Map(),
      hoveredCluster: null,
      hoveredEdge: null,
      pointer: { x: -999, y: -999, active: false },
      camera: {
        yaw: 0,
        pitch: 0,
        velocityYaw: 0,
        velocityPitch: 0,
      },
      dragging: null,
      suppressClick: false,
      navigatorOpen: false,
      navigatorProgress: 0,
      reduced: reducedQuery.matches,
      pulse: null,
      layout: () => undefined,
      requestDraw: () => undefined,
      skipIntro: () => undefined,
    };

    const sizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const density = Math.min(window.devicePixelRatio || 1, 2);
      canvasElement.width = Math.round(width * density);
      canvasElement.height = Math.round(height * density);
      canvasElement.style.width = `${width}px`;
      canvasElement.style.height = `${height}px`;
      context.setTransform(density, 0, 0, density, 0, 0);
    };

    const edgeKeys = new Set<string>();
    const addEdge = (first: number, second: number, route = false) => {
      if (first === second) return;
      const key = first < second ? `${first}:${second}` : `${second}:${first}`;
      if (edgeKeys.has(key)) {
        if (route) {
          const edge = engine.edges.find(
            (candidate) =>
              (candidate.first === first && candidate.second === second) ||
              (candidate.first === second && candidate.second === first),
          );
          if (edge) edge.route = true;
        }
        return;
      }
      edgeKeys.add(key);
      engine.edges.push({ first, second, route });
    };

    const nodesPerCluster = width < 640 ? 7 : width < 1200 ? 9 : 12;
    pageSlugs.forEach((cluster) => {
      const count = cluster === "home" ? nodesPerCluster + 2 : nodesPerCluster;
      const start = engine.nodes.length;
      for (let index = 0; index < count; index += 1) {
        const hub = index === 0;
        const id = engine.nodes.length;
        const node: SceneNode = {
          id,
          cluster,
          hub,
          angle: hub ? 0 : random() * Math.PI * 2,
          radius: hub ? 0 : 0.3 + random() * 0.7,
          x: width / 2,
          y: height / 2,
          z: 0,
          targetX: width / 2,
          targetY: height / 2,
          targetZ: 0,
          attractionX: 0,
          attractionY: 0,
          amber: !hub && random() < 0.14,
          phase: random() * Math.PI * 2,
          size: hub ? 3.2 : 1 + random() * 1.5,
          introAlpha: 0,
          introBegin: 0,
          mobileVisible: true,
          seedNode: false,
          projected: { x: width / 2, y: height / 2, scale: 1, depth: 0 },
        };
        engine.nodes.push(node);
        engine.projected.set(id, node.projected);
        if (hub) engine.hubIndexes.set(cluster, id);
      }

      for (let index = 1; index < count; index += 1) {
        addEdge(start, start + index);
        addEdge(
          start + index,
          start + 1 + (index % Math.max(1, count - 1)),
        );
        if (index > 2 && random() < 0.42) {
          addEdge(start + index, start + 1 + Math.floor(random() * (count - 1)));
        }
      }
    });

    routes.forEach(([from, to]) => {
      const first = engine.hubIndexes.get(from);
      const second = engine.hubIndexes.get(to);
      if (first !== undefined && second !== undefined) addEdge(first, second, true);
    });

    engine.layout = (immediate) => {
      const clusterRadii = new Map<PageSlug, number>();
      pageSlugs.forEach((slug) => {
        clusterRadii.set(
          slug,
          Math.min(width, height) * (slug === "home" ? 0.095 : 0.055),
        );
      });
      engine.nodes.forEach((node) => {
        const anchor = anchorPosition(node.cluster, width, height);
        const radius = clusterRadii.get(node.cluster) ?? 40;
        node.targetX = anchor.x + Math.cos(node.angle) * radius * node.radius;
        node.targetY =
          anchor.y + Math.sin(node.angle) * radius * node.radius * 0.72;
        node.targetZ =
          anchor.z +
          (node.hub ? 0 : Math.sin(node.angle * 1.7 + node.phase) * radius * 0.9);
        if (immediate) {
          node.x = node.targetX;
          node.y = node.targetY;
          node.z = node.targetZ;
        }
      });
    };

    const project = (
      x: number,
      y: number,
      z: number,
      yaw: number,
      pitch: number,
      zoom: number,
      out?: ProjectedNode,
    ): ProjectedNode => {
      const centerX = width / 2;
      const centerY = height * 0.46;
      const relativeX = x - centerX;
      const relativeY = y - centerY;
      const rotatedX = relativeX * Math.cos(yaw) - z * Math.sin(yaw);
      const rotatedZ = relativeX * Math.sin(yaw) + z * Math.cos(yaw);
      const rotatedY = relativeY * Math.cos(pitch) - rotatedZ * Math.sin(pitch);
      const finalZ = relativeY * Math.sin(pitch) + rotatedZ * Math.cos(pitch);
      const perspective = Math.max(680, Math.min(width, height) * 1.25);
      const depthDenominator = Math.max(perspective + finalZ, perspective * 0.25);
      const scale = clamp(perspective / depthDenominator, 0.66, 1.42);
      const target = out ?? { x: 0, y: 0, scale: 1, depth: 0 };
      target.x = centerX + rotatedX * scale * zoom;
      target.y = centerY + rotatedY * scale * zoom;
      target.scale = scale;
      target.depth = clamp((scale - 0.66) / 0.76);
      return target;
    };

    const labelSize = (slug: PageSlug, link: HTMLAnchorElement) => {
      const cached = labelSizeRef.current[slug];
      if (cached) return cached;
      const measured = {
        halfWidth: Math.max(62, link.offsetWidth / 2),
        height: Math.max(34, link.offsetHeight),
      };
      labelSizeRef.current[slug] = measured;
      return measured;
    };

    const updateLabels = (step: number) => {
      const labelMaxY = Math.max(
        48,
        height - Math.max(74, hintHeightRef.current + (width < 640 ? 55 : 62)),
      );
      const states: Array<{
        link: HTMLAnchorElement;
        motion: LabelMotion;
        labelScale: number;
        halfWidth: number;
        labelHeight: number;
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
        depth: number;
      }> = [];
      pageSlugs.forEach((slug) => {
        const link = linkRefs.current[slug];
        const hubIndex = engine.hubIndexes.get(slug);
        const hub = hubIndex === undefined ? undefined : engine.projected.get(hubIndex);
        if (!link || !hub) return;
        const labelScale = clamp(0.86 + hub.depth * 0.2, 0.84, 1.08);
        const size = labelSize(slug, link);
        const halfWidth = size.halfWidth * labelScale;
        const labelHeight = size.height * labelScale;
        const margin = Math.min(
          halfWidth + 8,
          width / 2,
        );
        const targetX = clamp(hub.x, margin, Math.max(margin, width - margin));
        const targetY = clamp(hub.y + 18 * hub.scale, 48, labelMaxY);
        let motion = labelMotionRef.current[slug];
        if (!motion) {
          motion = { x: targetX, y: targetY, vx: 0, vy: 0 };
          labelMotionRef.current[slug] = motion;
        }
        const spring = engine.reduced ? 1 : 0.115 * step;
        const damping = engine.reduced ? 0 : decayFactor(0.72, step);
        motion.vx = (motion.vx + (targetX - motion.x) * spring) * damping;
        motion.vy = (motion.vy + (targetY - motion.y) * spring) * damping;
        motion.x += engine.reduced ? targetX - motion.x : motion.vx * step;
        motion.y += engine.reduced ? targetY - motion.y : motion.vy * step;
        states.push({
          link,
          motion,
          labelScale,
          halfWidth,
          labelHeight,
          minX: margin,
          maxX: Math.max(margin, width - margin),
          minY: 48,
          maxY: labelMaxY,
          depth: hub.depth,
        });
      });

      for (let iteration = 0; iteration < 6; iteration += 1) {
        for (let firstIndex = 0; firstIndex < states.length; firstIndex += 1) {
          const first = states[firstIndex];
          for (let secondIndex = firstIndex + 1; secondIndex < states.length; secondIndex += 1) {
            const second = states[secondIndex];
            const deltaX = second.motion.x - first.motion.x;
            const firstCenterY = first.motion.y + first.labelHeight / 2;
            const secondCenterY = second.motion.y + second.labelHeight / 2;
            const deltaY = secondCenterY - firstCenterY;
            const overlapX = first.halfWidth + second.halfWidth + 8 - Math.abs(deltaX);
            const overlapY =
              first.labelHeight / 2 + second.labelHeight / 2 + 6 - Math.abs(deltaY);
            if (overlapX <= 0 || overlapY <= 0) continue;

            if (overlapX < overlapY) {
              const direction = deltaX >= 0 ? 1 : -1;
              const shift = overlapX / 2;
              first.motion.x -= direction * shift;
              second.motion.x += direction * shift;
            } else {
              const direction = deltaY >= 0 ? 1 : -1;
              const shift = overlapY / 2;
              first.motion.y -= direction * shift;
              second.motion.y += direction * shift;
            }
            first.motion.x = clamp(first.motion.x, first.minX, first.maxX);
            first.motion.y = clamp(first.motion.y, first.minY, first.maxY);
            second.motion.x = clamp(second.motion.x, second.minX, second.maxX);
            second.motion.y = clamp(second.motion.y, second.minY, second.maxY);
          }
        }
      }

      states.forEach(({ link, motion, labelScale, minX, maxX, minY, maxY, depth }) => {
        const boundedX = clamp(motion.x, minX, maxX);
        const boundedY = clamp(motion.y, minY, maxY);
        const boundaryEase = engine.reduced ? 1 : easeFactor(0.32, step);
        motion.x += (boundedX - motion.x) * boundaryEase;
        motion.y += (boundedY - motion.y) * boundaryEase;
        link.style.transform = `translate3d(${motion.x}px, ${motion.y}px, 0) translate(-50%, 0) scale(${labelScale})`;
        link.style.zIndex = `${Math.round(10 + depth * 20)}`;
      });
    };

    const updateHoverTarget = () => {
      if (!engine.pointer.active || engine.navigatorOpen) {
        engine.hoveredEdge = null;
        if (!engine.navigatorOpen) engine.hoveredCluster = null;
        return;
      }
      let closestNode: SceneNode | null = null;
      let closestNodeDistance = 18;
      for (const node of engine.nodes) {
        const point = node.projected;
        const distance = Math.hypot(
          point.x - engine.pointer.x,
          point.y - engine.pointer.y,
        );
        if (distance < closestNodeDistance) {
          closestNode = node;
          closestNodeDistance = distance;
        }
      }
      if (closestNode) {
        engine.hoveredCluster = closestNode.cluster;
        engine.hoveredEdge = null;
        return;
      }
      engine.hoveredCluster = null;
      let closestEdge: number | null = null;
      let closestEdgeDistance = 6;
      engine.edges.forEach((edge, index) => {
        const first = engine.nodes[edge.first].projected;
        const second = engine.nodes[edge.second].projected;
        const distance = distanceToSegment(
          engine.pointer.x,
          engine.pointer.y,
          first.x,
          first.y,
          second.x,
          second.y,
        );
        if (distance < closestEdgeDistance) {
          closestEdge = index;
          closestEdgeDistance = distance;
        }
      });
      engine.hoveredEdge = closestEdge;
    };

    const depthOrder = engine.nodes.slice();

    const drawScene = (time = performance.now()) => {
      const previousTime = sceneLastTime;
      const step =
        previousTime === null
          ? 1
          : clamp((time - previousTime) / frameMilliseconds, 0.2, 3);
      sceneLastTime = time;
      const targetProgress = engine.navigatorOpen ? 1 : 0;
      engine.navigatorProgress = engine.reduced
        ? targetProgress
        : engine.navigatorProgress +
          (targetProgress - engine.navigatorProgress) * easeFactor(0.075, step);
      const progress = engine.navigatorProgress;
      const sceneMotionProgress = engine.reduced
        ? 0
        : sceneMotionStartedAt === null
          ? 1
          : smoothStep((time - sceneMotionStartedAt) / 1200);

      if (!engine.dragging) {
        if (engine.reduced) {
          if (!engine.navigatorOpen) {
            engine.camera.yaw = 0;
            engine.camera.pitch = 0;
          }
        } else if (engine.navigatorOpen) {
          engine.camera.yaw += engine.camera.velocityYaw * step;
          engine.camera.pitch += engine.camera.velocityPitch * step;
          engine.camera.velocityYaw *= decayFactor(0.94, step);
          engine.camera.velocityPitch *= decayFactor(0.9, step);
        } else {
          const returnEase = easeFactor(0.055, step);
          engine.camera.yaw = normalizeAngle(engine.camera.yaw);
          engine.camera.yaw += -engine.camera.yaw * returnEase;
          engine.camera.pitch += -engine.camera.pitch * returnEase;
          engine.camera.velocityYaw *= decayFactor(0.72, step);
          engine.camera.velocityPitch *= decayFactor(0.72, step);
        }
      }
      engine.camera.pitch = clamp(engine.camera.pitch, -0.68, 0.68);
      const autoYaw = engine.reduced
        ? 0
        : Math.sin(time * 0.000055) *
          0.105 *
          (1 - progress) *
          sceneMotionProgress;
      const autoPitch = engine.reduced
        ? 0
        : Math.cos(time * 0.000047) *
          0.055 *
          (1 - progress) *
          sceneMotionProgress;
      const yaw = engine.camera.yaw + autoYaw;
      const pitch = engine.camera.pitch + autoPitch;
      const zoom = 1 + progress * 0.09;

      engine.nodes.forEach((node) => {
        const settle = engine.reduced ? 1 : easeFactor(0.055, step);
        node.x += (node.targetX - node.x) * settle;
        node.y += (node.targetY - node.y) * settle;
        node.z += (node.targetZ - node.z) * settle;
        const seconds = time / 1000;
        const motion = sceneMotionProgress;
        const floatStrength = (2.2 + progress * 2.8) * motion;
        const projected = node.projected;
        project(
          node.x + Math.sin(seconds * 0.19 + node.phase) * floatStrength,
          node.y + Math.cos(seconds * 0.16 + node.phase) * floatStrength,
          node.z + Math.sin(seconds * 0.14 + node.phase * 1.3) * 14 * motion,
          yaw,
          pitch,
          zoom,
          projected,
        );
        const distance = Math.hypot(
          engine.pointer.x - projected.x,
          engine.pointer.y - projected.y,
        );
        const radius = 155 + progress * 145;
        const falloff =
          engine.pointer.active && distance < radius
            ? Math.pow(1 - distance / radius, 2)
            : 0;
        const attraction = (0.035 + progress * 0.16) * falloff;
        const targetAttractionX =
          (engine.pointer.x - projected.x) * attraction;
        const targetAttractionY =
          (engine.pointer.y - projected.y) * attraction;
        const attractionEase = engine.reduced ? 1 : easeFactor(0.12, step);
        node.attractionX +=
          (targetAttractionX - node.attractionX) * attractionEase;
        node.attractionY +=
          (targetAttractionY - node.attractionY) * attractionEase;
        projected.x += node.attractionX;
        projected.y += node.attractionY;
      });

      updateHoverTarget();
      context.clearRect(0, 0, width, height);
      const baseAlpha = 0.11 + progress * 0.34;
      engine.edges.forEach((edge, edgeIndex) => {
        const firstNode = engine.nodes[edge.first];
        const secondNode = engine.nodes[edge.second];
        const first = firstNode.projected;
        const second = secondNode.projected;
        const activeEdge =
          firstNode.cluster === engine.active ||
          secondNode.cluster === engine.active;
        const hovered =
          edgeIndex === engine.hoveredEdge ||
          firstNode.cluster === engine.hoveredCluster ||
          secondNode.cluster === engine.hoveredCluster;
        const visitedEdge =
          engine.visited.has(firstNode.cluster) &&
          engine.visited.has(secondNode.cluster);
        const alphaMultiplier = hovered
          ? 1.9
          : activeEdge
            ? 1.35
            : visitedEdge
              ? 1.08
              : 0.7;
        const alpha = baseAlpha * alphaMultiplier * (edge.route ? 1 : 0.62);
        if (hovered || (progress > 0.45 && activeEdge && edge.route)) {
          context.strokeStyle = `rgba(142,196,214,${alpha * 0.13})`;
          context.lineWidth = edge.route ? 6 : 4;
          context.beginPath();
          context.moveTo(first.x, first.y);
          context.lineTo(second.x, second.y);
          context.stroke();
        }
        if (edge.route || activeEdge || hovered) {
          const gradient = context.createLinearGradient(
            first.x,
            first.y,
            second.x,
            second.y,
          );
          gradient.addColorStop(0, `rgba(142,196,214,${alpha})`);
          gradient.addColorStop(
            1,
            `rgba(216,163,95,${alpha * (edge.route ? 0.78 : 0.42)})`,
          );
          context.strokeStyle = gradient;
        } else {
          context.strokeStyle = `rgba(164,186,179,${alpha * 0.71})`;
        }
        context.lineWidth = edge.route ? 0.85 + progress * 0.45 : 0.55;
        context.beginPath();
        context.moveTo(first.x, first.y);
        context.lineTo(second.x, second.y);
        context.stroke();

        if (!engine.reduced && edge.route && (activeEdge || hovered || progress > 0.8)) {
          const pulseProgress = (time * 0.00012 + edgeIndex * 0.13) % 1;
          context.fillStyle = hovered
            ? "rgba(233,229,220,.9)"
            : "rgba(183,221,233,.72)";
          context.beginPath();
          context.arc(
            first.x + (second.x - first.x) * pulseProgress,
            first.y + (second.y - first.y) * pulseProgress,
            1.2 + progress * 0.8,
            0,
            Math.PI * 2,
          );
          context.fill();
        }
      });

      depthOrder.sort((first, second) => first.projected.scale - second.projected.scale);
      depthOrder.forEach((node) => {
        const point = node.projected;
        const activeNode = node.cluster === engine.active;
        const hovered = node.cluster === engine.hoveredCluster;
        const visitedNode = engine.visited.has(node.cluster);
        const hubBoost = node.hub ? 1.45 + progress * 0.35 : 1;
        const radius =
          node.size * point.scale * hubBoost * (hovered ? 1.28 : 1);
        const alpha =
          (0.26 + progress * 0.5) *
          (hovered ? 1.25 : activeNode ? 1.1 : visitedNode ? 0.9 : 0.68);
        if (node.hub || hovered || (activeNode && node.size > 1.8)) {
          context.fillStyle = node.amber
            ? `rgba(216,163,95,${alpha * 0.12})`
            : `rgba(142,196,214,${alpha * (node.hub ? 0.16 : 0.09)})`;
          context.beginPath();
          context.arc(point.x, point.y, radius * (node.hub ? 5.2 : 3.8), 0, Math.PI * 2);
          context.fill();
        }
        context.fillStyle = node.amber
          ? `rgba(216,163,95,${Math.min(0.98, alpha)})`
          : `rgba(183,221,233,${Math.min(0.98, alpha)})`;
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fill();
        if (node.hub && (activeNode || hovered || progress > 0.6)) {
          context.strokeStyle = hovered
            ? "rgba(216,163,95,.72)"
            : "rgba(183,221,233,.58)";
          context.lineWidth = 0.8;
          context.beginPath();
          context.arc(point.x, point.y, radius + 4 + progress * 2, 0, Math.PI * 2);
          context.stroke();
        }
      });

      if (engine.pulse) {
        const fromIndex = engine.hubIndexes.get(engine.pulse.from);
        const toIndex = engine.hubIndexes.get(engine.pulse.to);
        const from = fromIndex === undefined ? undefined : engine.projected.get(fromIndex);
        const to = toIndex === undefined ? undefined : engine.projected.get(toIndex);
        if (from && to) {
          const pulseProgress = engine.pulse.progress;
          const pulseX = from.x + (to.x - from.x) * pulseProgress;
          const pulseY = from.y + (to.y - from.y) * pulseProgress;
          context.fillStyle = `rgba(233,229,220,${1 - pulseProgress})`;
          context.beginPath();
          context.arc(pulseX, pulseY, 2.8, 0, Math.PI * 2);
          context.fill();
          engine.pulse.progress += 0.022 * step;
          if (engine.pulse.progress > 1) engine.pulse = null;
        }
      }
      updateLabels(step);
    };

    const scheduleReducedDraw = () => {
      if (!engine.reduced || reducedFrame) return;
      reducedFrame = window.requestAnimationFrame((time) => {
        reducedFrame = 0;
        drawScene(time);
      });
    };

    engine.requestDraw = scheduleReducedDraw;

    /**
     * Reading a custom property forces a style recalculation, so the mono
     * family is resolved once per intro run instead of on every labelled
     * frame.
     */
    const resolveIntroMonoFont = () => {
      if (introMonoFont === null) {
        introMonoFont =
          window
            .getComputedStyle(document.documentElement)
            .getPropertyValue("--font-mono")
            .trim() || '"IBM Plex Mono"';
      }
      return introMonoFont;
    };

    const prepareIntro = () => {
      introMonoFont = null;
      const scale = width < 640 ? 0.78 : 1;
      introTimings = [0, 0.45, 0.95, 1.7, 2.75, 3.55, 4.35, 5.3].map(
        (time) => time * scale,
      );
      if (introScale > 0 && introScale !== scale) {
        introElapsed = Math.min(
          introElapsed * (scale / introScale),
          introTimings[7],
        );
      }
      introScale = scale;
      const byCluster = {} as Record<PageSlug, SceneNode[]>;
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
            (start +
              (end - start) * (index / Math.max(nodes.length - 1, 1)) +
              introRandom() * 0.05) *
            scale;
          node.mobileVisible = index < Math.ceil(nodes.length * 0.62);
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

      const workflowNode = byCluster.workflows[1] ?? byCluster.workflows[0];
      if (workflowNode) {
        workflowNode.amberWindow = [1.9 * scale, 2.62 * scale];
      }

      introPruneEdges = [];
      for (let index = 0; index < 9; index += 1) {
        const firstCluster =
          pageSlugs[Math.floor(introRandom() * pageSlugs.length)];
        const secondCluster =
          pageSlugs[Math.floor(introRandom() * pageSlugs.length)];
        if (firstCluster === secondCluster) continue;
        const firstNodes = byCluster[firstCluster];
        const secondNodes = byCluster[secondCluster];
        introPruneEdges.push({
          first: firstNodes[Math.floor(introRandom() * firstNodes.length)],
          second: secondNodes[Math.floor(introRandom() * secondNodes.length)],
          startsAt: (1.74 + introRandom() * 0.4) * scale,
          endsAt: (2.28 + introRandom() * 0.42) * scale,
          amber: index === 2,
        });
      }
    };

    const introAnchorPosition = (cluster: PageSlug, elapsed: number) => {
      const [mapX, mapY] = mapPositions[cluster];
      const spread =
        0.42 +
        0.58 *
          smoothStep(
            (elapsed - introTimings[3]) /
              (introTimings[4] - introTimings[3] + 0.4),
          );
      const mobile = width < 640;
      const factorX = mobile ? 0.92 : 0.86;
      const factorY = mobile ? 1.02 : 0.92;
      return {
        x: width * 0.5 + ((mapX - 50) / 100) * width * factorX * spread,
        y: height * 0.46 + ((mapY - 46) / 100) * height * factorY * spread,
      };
    };

    const introNodePosition = (node: SceneNode, elapsed: number) => {
      const point = introAnchorPosition(node.cluster, elapsed);
      const clusterRadius =
        Math.min(width, height) * (node.cluster === "home" ? 0.1 : 0.06);
      const emergence = smoothStep((elapsed - (node.introBegin - 0.05)) / 0.6);
      const parent = introParents[node.cluster];
      let baseX = point.x;
      let baseY = point.y;
      if (parent) {
        const parentPoint = introAnchorPosition(parent, elapsed);
        baseX = parentPoint.x + (point.x - parentPoint.x) * emergence;
        baseY = parentPoint.y + (point.y - parentPoint.y) * emergence;
      }
      let x =
        baseX +
        Math.cos(node.angle) * clusterRadius * node.radius * (0.3 + 0.7 * emergence);
      let y =
        baseY +
        Math.sin(node.angle) * clusterRadius * node.radius * (0.3 + 0.7 * emergence) * 0.72;
      const handoff = travelStep(
        (elapsed - introTimings[6]) / (introTimings[7] - introTimings[6]),
      );
      if (handoff > 0) {
        const target = project(
          node.targetX,
          node.targetY,
          node.targetZ,
          0,
          0,
          1,
          introProjection,
        );
        x += (target.x - x) * handoff;
        y += (target.y - y) * handoff;
      }
      return { x, y };
    };

    const drawIntro = (elapsed: number) => {
      context.clearRect(0, 0, width, height);
      const mobile = width < 640;
      const handoff = travelStep(
        (elapsed - introTimings[6]) / (introTimings[7] - introTimings[6]),
      );
      engine.nodes.forEach((node) => {
        const position = introNodePosition(node, elapsed);
        node.x = position.x;
        node.y = position.y;
        node.introAlpha = mobile && !node.mobileVisible
          ? 0
          : clamp((elapsed - node.introBegin) / 0.3);
      });

      const drawIntroEdge = (
        first: SceneNode,
        second: SceneNode,
        amber: boolean,
        alphaMultiplier = 1,
      ) => {
        const edgeBegins = Math.max(first.introBegin, second.introBegin) + 0.12;
        const growth = clamp((elapsed - edgeBegins) / 0.35);
        if (growth <= 0 || first.introAlpha <= 0 || second.introAlpha <= 0) return;
        const alpha =
          growth *
          Math.min(first.introAlpha, second.introAlpha) *
          alphaMultiplier *
          (1 - handoff * 0.55);
        const endX = first.x + (second.x - first.x) * growth;
        const endY = first.y + (second.y - first.y) * growth;
        context.strokeStyle = amber
          ? `rgba(216,163,95,${0.7 * alpha})`
          : `rgba(142,196,214,${0.42 * alpha})`;
        context.lineWidth = amber ? 1.2 : 0.75;
        context.beginPath();
        context.moveTo(first.x, first.y);
        context.lineTo(endX, endY);
        context.stroke();
      };

      engine.edges.forEach((edge) => {
        const first = engine.nodes[edge.first];
        const second = engine.nodes[edge.second];
        if (!first || !second) return;
        drawIntroEdge(first, second, first.amber || second.amber, edge.route ? 1.15 : 0.82);
      });
      introPruneEdges.forEach((edge) => {
        const fadeIn = clamp((elapsed - edge.startsAt) / 0.18);
        const fadeOut = 1 - clamp((elapsed - edge.endsAt) / 0.24);
        const alpha =
          Math.min(fadeIn, fadeOut) *
          Math.min(edge.first.introAlpha, edge.second.introAlpha);
        if (alpha <= 0) return;
        context.strokeStyle = edge.amber
          ? `rgba(216,163,95,${0.65 * alpha})`
          : `rgba(142,196,214,${0.26 * alpha})`;
        context.lineWidth = 0.8;
        context.beginPath();
        context.moveTo(edge.first.x, edge.first.y);
        context.lineTo(edge.second.x, edge.second.y);
        context.stroke();
      });

      if (
        introHomeSeed &&
        introHomeSecond &&
        introHomeSecond !== introHomeSeed &&
        elapsed > introTimings[1] + 0.12 &&
        elapsed < introTimings[2] + 0.05
      ) {
        const progress = clamp(
          (elapsed - (introTimings[1] + 0.12)) /
            (introTimings[2] - introTimings[1] - 0.08),
        );
        const target = introNodePosition(
          introHomeSecond,
          introTimings[2] + 0.1,
        );
        const x = introHomeSeed.x + (target.x - introHomeSeed.x) * progress;
        const y = introHomeSeed.y + (target.y - introHomeSeed.y) * progress;
        context.strokeStyle = `rgba(183,221,233,${0.65 * (1 - progress * 0.3)})`;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(introHomeSeed.x, introHomeSeed.y);
        context.lineTo(x, y);
        context.stroke();
      }

      engine.nodes.forEach((node) => {
        if (node.introAlpha <= 0) return;
        const activeAmber =
          node.amberWindow &&
          elapsed >= node.amberWindow[0] &&
          elapsed <= node.amberWindow[1];
        const alpha = node.introAlpha * (1 - handoff * 0.18);
        const size = node.size * (node.hub ? 1.22 : 1);
        context.fillStyle = activeAmber || node.amber
          ? `rgba(216,163,95,${0.9 * alpha})`
          : `rgba(183,221,233,${0.82 * alpha})`;
        context.beginPath();
        context.arc(node.x, node.y, size, 0, Math.PI * 2);
        context.fill();
        if (node.seedNode && elapsed < introTimings[3]) {
          const bloom =
            clamp((elapsed - node.introBegin) / 0.35) *
            (1 -
              0.55 *
                clamp(
                  (elapsed - introTimings[2]) /
                    (introTimings[3] - introTimings[2]),
                ));
          context.fillStyle = `rgba(142,196,214,${0.16 * bloom})`;
          context.beginPath();
          context.arc(node.x, node.y, 14, 0, Math.PI * 2);
          context.fill();
        } else if (activeAmber || node.hub) {
          context.fillStyle = activeAmber
            ? `rgba(216,163,95,${0.12 * alpha})`
            : `rgba(142,196,214,${0.08 * alpha})`;
          context.beginPath();
          context.arc(node.x, node.y, size * 4.5, 0, Math.PI * 2);
          context.fill();
        }
      });

      if (elapsed > introTimings[4] - 0.05 && handoff < 0.98) {
        context.font = `10px ${resolveIntroMonoFont()}, monospace`;
        context.textAlign = "center";
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
          const radius = Math.min(width, height) * 0.06;
          context.fillStyle = primary
            ? `rgba(184,180,171,${alpha})`
            : `rgba(125,122,114,${alpha})`;
          const label = Array.from(initialLabelsRef.current[slug]).join(" ");
          const halfLabelWidth = context.measureText(label).width / 2;
          context.fillText(
            label,
            clamp(point.x, halfLabelWidth + 8, width - halfLabelWidth - 8),
            point.y + radius + 20,
          );
        });
      }
    };

    const settleAtScene = () => {
      engine.nodes.forEach((node) => {
        node.x = node.targetX;
        node.y = node.targetY;
        node.z = node.targetZ;
      });
    };

    /**
     * The intro ends several times brighter than the ambient scene, and on
     * mobile it hides part of the graph, so the last intro frame is kept as a
     * layer that cross-fades into the ambient one instead of cutting to it.
     */
    const captureIntroFrame = () => {
      const snapshot = document.createElement("canvas");
      snapshot.width = canvasElement.width;
      snapshot.height = canvasElement.height;
      const snapshotContext = snapshot.getContext("2d");
      if (!snapshotContext) return null;
      snapshotContext.drawImage(canvasElement, 0, 0);
      return snapshot;
    };

    const finishIntro = (time: number) => {
      const snapshot = captureIntroFrame();
      introActive = false;
      introElapsed = introTimings[7] ?? 5.3;
      settleAtScene();
      sceneMotionStartedAt = time;
      sceneLastTime = null;
      introFade = snapshot ? { snapshot, startedAt: time } : null;
      markIntroDone();
      callbacksRef.current.onIntroComplete();
    };

    engine.skipIntro = () => {
      const hadFade = introFade !== null;
      introFade = null;
      if (!introActive) {
        if (hadFade && !frame) drawScene(performance.now());
        return;
      }
      introActive = false;
      introElapsed = introTimings[7] ?? 5.3;
      settleAtScene();
      sceneMotionStartedAt = performance.now();
      sceneLastTime = null;
      introFade = null;
      markIntroDone();
      drawScene(performance.now());
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
        const delta =
          introLastTime === null ? 0.016 : Math.min(now - introLastTime, 0.05);
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
        if (introElapsed >= introTimings[7]) finishIntro(time);
      } else if (introFade) {
        const overlay = introFade;
        const fade = clamp((time - overlay.startedAt) / introFadeDuration);
        context.globalAlpha = fade;
        drawScene(time);
        context.globalAlpha = 1 - fade;
        context.drawImage(overlay.snapshot, 0, 0, width, height);
        context.globalAlpha = 1;
        if (fade >= 1) introFade = null;
      } else {
        drawScene(time);
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
      sceneLastTime = null;
      frame = window.requestAnimationFrame(animate);
    };

    const onVisibilityChange = () => {
      if (document.hidden) stopAnimation();
      else startAnimation();
    };

    /**
     * The preference can be flipped mid-session, so the scene has to switch
     * between the animated loop and the redraw-on-demand mode without a reload.
     */
    const onReducedChange = (event: MediaQueryListEvent) => {
      if (engine.reduced === event.matches) return;
      engine.reduced = event.matches;
      if (event.matches) {
        engine.skipIntro();
        stopAnimation();
        engine.camera.velocityYaw = 0;
        engine.camera.velocityPitch = 0;
        engine.pulse = null;
        scheduleReducedDraw();
        return;
      }
      if (reducedFrame) {
        window.cancelAnimationFrame(reducedFrame);
        reducedFrame = 0;
      }
      sceneLastTime = null;
      sceneMotionStartedAt = performance.now();
      startAnimation();
    };

    const onPause = () => {
      pausedByOverlay = true;
      stopAnimation();
    };

    const onResume = () => {
      pausedByOverlay = false;
      if (!document.hidden) {
        if (introActive) drawIntro(introElapsed);
        else drawScene(performance.now());
      }
      startAnimation();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (engine.navigatorOpen) return;
      engine.pointer.x = event.clientX;
      engine.pointer.y = event.clientY;
      engine.pointer.active = true;
      scheduleReducedDraw();
    };

    const onPointerLeave = () => {
      if (engine.navigatorOpen) return;
      engine.pointer.active = false;
      scheduleReducedDraw();
    };

    /**
     * Mobile browsers fire `resize` for every URL bar collapse while scrolling.
     * Those are height-only changes, so the scene keeps its motion state and
     * eases to the new anchors instead of snapping; only a width change is
     * treated as a genuine relayout.
     */
    const applyResize = () => {
      resizeFrame = 0;
      const previousWidth = layoutWidth;
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;
      if (nextWidth === previousWidth && nextHeight === layoutHeight) return;
      const widthChanged = nextWidth !== previousWidth;
      layoutWidth = nextWidth;
      layoutHeight = nextHeight;
      sizeCanvas();
      engine.layout(!introActive && widthChanged);
      labelSizeRef.current = {};
      if (widthChanged) labelMotionRef.current = {};
      if (introActive) {
        if ((previousWidth < 640) !== (nextWidth < 640)) prepareIntro();
        drawIntro(introElapsed);
      } else if (!frame) {
        drawScene(performance.now());
      }
    };

    const onResize = () => {
      if (resizeFrame) return;
      resizeFrame = window.requestAnimationFrame(applyResize);
    };

    sizeCanvas();
    engine.layout(true);
    engineRef.current = engine;

    const shouldPlayIntro =
      initialIntroEnabledRef.current && !engine.reduced && introWillPlay();
    if (shouldPlayIntro) startIntro();
    else {
      callbacksRef.current.onIntroComplete();
      drawScene(performance.now());
    }
    startAnimation();

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    reducedQuery.addEventListener("change", onReducedChange);
    window.addEventListener("lattice:pause", onPause);
    window.addEventListener("lattice:resume", onResume);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      stopAnimation();
      if (reducedFrame) {
        window.cancelAnimationFrame(reducedFrame);
        reducedFrame = 0;
      }
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame);
        resizeFrame = 0;
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      reducedQuery.removeEventListener("change", onReducedChange);
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
    engine.requestDraw();
  }, [active, visited]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.navigatorOpen = navigatorOpen;
    engine.pointer.active = false;
    engine.hoveredCluster = null;
    engine.hoveredEdge = null;
    labelSizeRef.current = {};
    if (!navigatorOpen) {
      engine.dragging = null;
      engine.suppressClick = false;
    }
    if (navigatorOpen) engine.skipIntro();
    engine.requestDraw();
    if (!navigatorOpen) return;
    const frameId = window.requestAnimationFrame(() => {
      linkRefs.current[active]?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [active, navigatorOpen]);

  useEffect(() => {
    const hint = hintRef.current;
    if (!navigatorOpen || !hint) {
      hintHeightRef.current = 0;
      return;
    }
    const updateHintHeight = () => {
      const height = hint.offsetHeight;
      if (hintHeightRef.current === height) return;
      hintHeightRef.current = height;
      engineRef.current?.requestDraw();
    };
    updateHintHeight();
    const observer = new ResizeObserver(updateHintHeight);
    observer.observe(hint);
    return () => observer.disconnect();
  }, [navigatorHint, navigatorOpen]);

  useEffect(() => {
    if (introSkipKey > 0) engineRef.current?.skipIntro();
  }, [introSkipKey]);

  const redrawIfReduced = useCallback(() => {
    engineRef.current?.requestDraw();
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const engine = engineRef.current;
    if (!engine || !navigatorOpen) return;
    engine.suppressClick = false;
    if (event.button !== 0) return;
    if ((event.target as Element).closest("a, button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    engine.dragging = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    };
    engine.camera.velocityYaw = 0;
    engine.camera.velocityPitch = 0;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const engine = engineRef.current;
    if (!engine || !navigatorOpen) return;
    engine.pointer.x = event.clientX;
    engine.pointer.y = event.clientY;
    engine.pointer.active = true;
    const drag = engine.dragging;
    if (drag && drag.pointerId === event.pointerId) {
      const deltaX = event.clientX - drag.lastX;
      const deltaY = event.clientY - drag.lastY;
      engine.camera.yaw += deltaX * 0.0052;
      engine.camera.pitch = clamp(
        engine.camera.pitch + deltaY * 0.0044,
        -0.68,
        0.68,
      );
      engine.camera.velocityYaw = deltaX * 0.00042;
      engine.camera.velocityPitch = deltaY * 0.0003;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      if (Math.abs(deltaX) + Math.abs(deltaY) > 3) drag.moved = true;
    }
    redrawIfReduced();
  };

  const endDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    suppressClick: boolean,
  ) => {
    const engine = engineRef.current;
    if (!engine?.dragging || engine.dragging.pointerId !== event.pointerId) return;
    if (suppressClick && engine.dragging.moved) {
      engine.suppressClick = true;
      window.requestAnimationFrame(() => {
        if (engineRef.current === engine) engine.suppressClick = false;
      });
    }
    engine.dragging = null;
    redrawIfReduced();
  };

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    const engine = engineRef.current;
    if (!engine?.suppressClick) return;
    engine.suppressClick = false;
    if (event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
    onNavigatorCancelNavigation();
  };

  return (
    <div
      className={`lattice-scene${navigatorOpen ? " lattice-scene--navigator" : ""}`}
      onClickCapture={handleClickCapture}
      onPointerCancel={(event) => endDrag(event, false)}
      onPointerDown={handlePointerDown}
      onPointerLeave={() => {
        const engine = engineRef.current;
        if (!engine || engine.dragging) return;
        engine.pointer.active = false;
        redrawIfReduced();
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => endDrag(event, true)}
    >
      <canvas aria-hidden="true" className="lattice-canvas" ref={canvasRef} />
      {navigatorOpen ? (
        <div
          aria-label={navigatorLabel}
          aria-modal="true"
          className="lattice-navigation"
          id="lattice-navigation"
          role="dialog"
        >
          <button
            className="lattice-navigation__close"
            onClick={onNavigatorClose}
            type="button"
          >
            {closeLabel}
          </button>
          <nav aria-label={navigatorLabel} className="lattice-navigation__nodes">
            {pageSlugs.map((slug) => (
              <Link
                aria-current={active === slug ? "page" : undefined}
                className="lattice-node-link"
                href={hrefFor(locale, slug)}
                key={slug}
                onBlur={() => {
                  const engine = engineRef.current;
                  if (engine?.hoveredCluster === slug) engine.hoveredCluster = null;
                  redrawIfReduced();
                }}
                onFocus={() => {
                  const engine = engineRef.current;
                  if (engine) engine.hoveredCluster = slug;
                  redrawIfReduced();
                }}
                onNavigate={onNavigatorNavigate}
                onPointerEnter={() => {
                  const engine = engineRef.current;
                  if (engine) engine.hoveredCluster = slug;
                  redrawIfReduced();
                }}
                onPointerLeave={() => {
                  const engine = engineRef.current;
                  if (engine?.hoveredCluster === slug && !engine.dragging) {
                    engine.hoveredCluster = null;
                  }
                  redrawIfReduced();
                }}
                ref={(element) => {
                  linkRefs.current[slug] = element;
                }}
              >
                <span aria-hidden="true" className="lattice-node-link__dot" />
                <span>{labels[slug]}</span>
              </Link>
            ))}
          </nav>
          <p className="lattice-navigation__hint" ref={hintRef}>{navigatorHint}</p>
        </div>
      ) : null}
    </div>
  );
}
