import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Constellation, ConstellationLink as LinkType, ThemeNote } from '../../types';
import { constellationColor } from '../../lib/constellations';
import { useConstellationLayout, type LayoutMap } from './useConstellationLayout';
import { buildArbor } from './arborPaths';
import ArborBranches from './ArborBranches';
import DustBackdrop from './DustBackdrop';
import ConstellationNode from './ConstellationNode';
import ConstellationLink from './ConstellationLink';
import ThoughtCluster from './ThoughtCluster';

interface ConstellationCanvasProps {
  constellations: Constellation[];
  links: LinkType[];
  hoveredId: string | null;
  selectedId: string | null;
  level3: boolean; // selected theme opened down to its notes
  notes: ThemeNote[];
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onOpenNote: (id: string) => void;
}

const STAGE = '#0b0604'; // warm near-black, same fixed value as .constellations-stage
const FOV = 50;
const DEFAULT_Z = 18; // universe distance
const ZOOM_Z_L2 = 7; // distance once a theme is selected
const ZOOM_Z_L3 = 5; // closer still, among the theme's notes
const FIT_MARGIN = 0.62; // leave room for glow + labels at the field's edge
const ZOOM_DEFAULT = 1.2; // start a little zoomed in, not at the far distance
const ZOOM_MIN = 1.0; // fully zoomed out = the safe fit view
const ZOOM_MAX = 3.0; // closest the wheel allows at the universe level
const ZOOM_SPEED = 0.0012;

// Eases the camera from the wide universe toward the focused theme and back, so
// every level change is a quiet dolly rather than a cut.
const CameraRig = ({
  target,
  zoom,
  zoomRef,
  panRef,
}: {
  target: [number, number, number] | null;
  zoom: number;
  zoomRef: MutableRefObject<number>;
  panRef: MutableRefObject<{ x: number; y: number }>;
}) => {
  const look = useRef(new THREE.Vector3(0, 0, 0));
  useFrame((state, delta) => {
    const k = 1 - Math.pow(0.0009, delta);
    const cam = state.camera;
    const pan = panRef.current;
    // At the universe level the wheel zoom pulls the camera in and drag pans it.
    const [tx, ty, tz] = target
      ? [target[0], target[1], target[2] + zoom]
      : [pan.x, pan.y, DEFAULT_Z / zoomRef.current];
    cam.position.x = THREE.MathUtils.lerp(cam.position.x, tx, k);
    cam.position.y = THREE.MathUtils.lerp(cam.position.y, ty, k);
    cam.position.z = THREE.MathUtils.lerp(cam.position.z, tz, k);
    const [lx, ly, lz] = target ?? [pan.x, pan.y, 0];
    look.current.x = THREE.MathUtils.lerp(look.current.x, lx, k);
    look.current.y = THREE.MathUtils.lerp(look.current.y, ly, k);
    look.current.z = THREE.MathUtils.lerp(look.current.z, lz, k);
    cam.lookAt(look.current);
  });
  return null;
};

// Whole-field tilt that follows the pointer a little, giving the flat star map a
// quiet sense of depth. Stilled while a theme is focused so the detail holds. The
// fit scale keeps every theme inside the frustum.
const ParallaxGroup = ({ calm, scale, children }: { calm: boolean; scale: number; children: ReactNode }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (!ref.current) return;
    const k = 1 - Math.pow(0.001, delta);
    const amount = calm ? 0.02 : 1;
    ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, state.pointer.x * 0.12 * amount, k);
    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, -state.pointer.y * 0.08 * amount, k);
  });
  return (
    <group ref={ref} scale={scale}>
      {children}
    </group>
  );
};

// All ids one hop from the active theme, so they stay lit while the rest dims.
function relatedTo(activeId: string | null, links: LinkType[]): Set<string> {
  const set = new Set<string>();
  if (!activeId) return set;
  for (const l of links) {
    if (l.source === activeId) set.add(l.target);
    else if (l.target === activeId) set.add(l.source);
  }
  return set;
}

const ConstellationScene = ({
  constellations,
  links,
  layout,
  hoveredId,
  selectedId,
  level3,
  notes,
  onHover,
  onSelect,
  onOpenNote,
}: ConstellationCanvasProps & { layout: LayoutMap }) => {
  const { size, gl } = useThree();
  const zoomRef = useRef(ZOOM_DEFAULT);
  const panRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ down: false, moved: false, lastX: 0, lastY: 0 });
  const fieldRadiusRef = useRef(0);
  const hasSelectionRef = useRef(false);
  hasSelectionRef.current = !!selectedId;
  const activeId = selectedId ?? hoveredId;
  const related = useMemo(() => relatedTo(activeId, links), [activeId, links]);
  const arbor = useMemo(() => buildArbor(constellations, layout), [constellations, layout]);

  // The gossamer cross-links only appear once the arbor has finished drawing.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    setGrown(false);
    const id = window.setTimeout(() => setGrown(true), (arbor.totalSec + 0.2) * 1000);
    return () => window.clearTimeout(id);
  }, [arbor]);

  // Wheel zoom at the universe level — the field starts far, so let the eye in.
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const next = zoomRef.current * (1 - e.deltaY * ZOOM_SPEED);
      zoomRef.current = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [gl]);

  // Drag to pan the universe. Only at Level 1 (a focused theme owns the camera).
  // Moving past a threshold marks the gesture a drag so it won't select a star.
  useEffect(() => {
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => {
      dragRef.current = { down: !hasSelectionRef.current, moved: false, lastX: e.clientX, lastY: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d.down) return;
      const dx = e.clientX - d.lastX;
      const dy = e.clientY - d.lastY;
      d.lastX = e.clientX;
      d.lastY = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 3) {
        d.moved = true;
        el.style.cursor = 'grabbing';
      }
      const dist = DEFAULT_Z / zoomRef.current;
      const worldPerPx = (2 * Math.tan((FOV / 2) * (Math.PI / 180)) * dist) / size.height;
      const lim = fieldRadiusRef.current || DEFAULT_Z;
      panRef.current.x = Math.min(lim, Math.max(-lim, panRef.current.x - dx * worldPerPx));
      panRef.current.y = Math.min(lim, Math.max(-lim, panRef.current.y + dy * worldPerPx));
    };
    const onUp = () => {
      dragRef.current.down = false;
      el.style.cursor = '';
    };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [gl, size.height]);
  const selected = useMemo(() => constellations.find((c) => c.id === selectedId) ?? null, [constellations, selectedId]);

  // Scale the field so the farthest theme stays inside the Level-1 frustum with
  // margin — computed against DEFAULT_Z so it never shifts while zooming.
  const { fit, fieldRadius } = useMemo(() => {
    let maxR = 0;
    for (const p of layout.values()) maxR = Math.max(maxR, Math.hypot(p[0], p[1]));
    if (maxR === 0) return { fit: 1, fieldRadius: 0 };
    const halfH = Math.tan((FOV / 2) * (Math.PI / 180)) * DEFAULT_Z;
    const halfW = halfH * (size.width / Math.max(1, size.height));
    const safe = Math.min(halfW, halfH) * FIT_MARGIN;
    const fitted = Math.min(1, safe / maxR);
    return { fit: fitted, fieldRadius: maxR * fitted };
  }, [layout, size.width, size.height]);
  fieldRadiusRef.current = fieldRadius;

  // Inside the (scaled) group; world space for the camera multiplies by fit.
  const rawPos = selectedId ? layout.get(selectedId) ?? null : null;
  const camTarget = rawPos ? ([rawPos[0] * fit, rawPos[1] * fit, rawPos[2] * fit] as [number, number, number]) : null;

  return (
    <>
      <CameraRig target={camTarget} zoom={(level3 ? ZOOM_Z_L3 : ZOOM_Z_L2) * fit} zoomRef={zoomRef} panRef={panRef} />
      <ParallaxGroup calm={!!selectedId} scale={fit}>
        <ArborBranches arbor={arbor} activeId={activeId} related={related} level3={level3} calm={!!selectedId} />
        {grown &&
          !level3 &&
          links.map((l) => {
            const from = layout.get(l.source);
            const to = layout.get(l.target);
            if (!from || !to) return null;
            const highlighted = !!activeId && (l.source === activeId || l.target === activeId);
            return (
              <ConstellationLink key={`${l.source}-${l.target}`} from={from} to={to} weight={l.weight} highlighted={highlighted} />
            );
          })}
        {constellations.map((c) => {
          const position = layout.get(c.id);
          if (!position) return null;
          // At Level 3 even the theme star fades to a soft halo so its notes lead.
          const dimmed = level3 ? true : !!activeId && c.id !== activeId && !related.has(c.id);
          return (
            <ConstellationNode
              key={c.id}
              constellation={c}
              position={position}
              appearAt={arbor.appearAt.get(c.id) ?? 0}
              focused={activeId === c.id}
              dimmed={dimmed}
              dragRef={dragRef}
              onHover={onHover}
              onSelect={onSelect}
            />
          );
        })}
        {level3 && rawPos && selected && notes.length > 0 && (
          <ThoughtCluster notes={notes} center={rawPos} color={constellationColor(selected)} onOpenNote={onOpenNote} />
        )}
      </ParallaxGroup>
    </>
  );
};

const ConstellationCanvas = (props: ConstellationCanvasProps) => {
  const layout = useConstellationLayout(props.constellations, props.links);

  return (
    <Canvas
      camera={{ position: [0, 0, DEFAULT_Z], fov: FOV }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      onPointerMissed={() => {
        props.onHover(null);
        props.onSelect(null);
      }}
    >
      <color attach="background" args={[STAGE]} />
      <fog attach="fog" args={[STAGE, 20, 48]} />
      <DustBackdrop />
      <ConstellationScene {...props} layout={layout} />
    </Canvas>
  );
};

export default ConstellationCanvas;
