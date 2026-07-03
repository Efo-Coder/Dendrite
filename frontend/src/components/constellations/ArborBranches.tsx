import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { brightnessFor } from '../../lib/constellations';
import { Arbor, ArborLimb, ArborStroke, buildRibbonGeometry } from './arborPaths';
import { getGlowTexture } from './glowTexture';

// The living layer of the arbor: tapered ink limbs growing out of the soma,
// their twigs, and the occasional signal pulse gliding home. Dimming follows
// the same focus rules as the tip nodes.

interface ArborBranchesProps {
  arbor: Arbor;
  activeId: string | null;
  related: Set<string>;
  level3: boolean;
  calm: boolean; // a theme is selected — the idle pulses hold their breath
}

const INK = new THREE.Color('#d8cdb4');
const GOLD = new THREE.Color('#d8b878');
const DIM_OPACITY = 0.16;
const LEVEL3_OPACITY = 0.1;
const PULSE_COLOR = '#e6c98a';
const PULSE_SIZE = 0.16;
const PULSE_SLOTS = 2;

const vertexShader = /* glsl */ `
  attribute float aT;
  attribute float aU;
  varying float vT;
  varying float vU;
  void main() {
    vT = aT;
    vU = aU;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uProgress;
  varying float vT;
  varying float vU;
  void main() {
    // Soft growing end; uProgress overshoots 1.0 so the tip finishes solid.
    float tip = 1.0 - smoothstep(uProgress - 0.05, uProgress, vT);
    float edge = 1.0 - smoothstep(0.55, 1.0, abs(vU));
    float ink = mix(1.0, 0.85, vT); // the stroke thins toward the tip
    gl_FragColor = vec4(uColor, uOpacity * tip * edge * ink);
  }
`;

// One tapered stroke that draws itself between delay and delay+duration, then
// eases its presence (and gold warmth) toward whatever focus asks of it.
const StrokeMesh = ({ stroke, opacity, gold }: { stroke: ArborStroke; opacity: number; gold: number }) => {
  const geometry = useMemo(
    () => buildRibbonGeometry(stroke.points, stroke.width0, stroke.width1),
    [stroke],
  );
  const uniforms = useMemo(
    () => ({
      uColor: { value: INK.clone() },
      uOpacity: { value: 0 },
      uProgress: { value: 0 },
    }),
    [],
  );
  const goldMix = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    uniforms.uProgress.value = THREE.MathUtils.clamp((t - stroke.delay) / stroke.duration, 0, 1) * 1.08;
    const k = 1 - Math.pow(0.0004, delta);
    uniforms.uOpacity.value = THREE.MathUtils.lerp(uniforms.uOpacity.value, opacity, k);
    goldMix.current = THREE.MathUtils.lerp(goldMix.current, gold, k);
    uniforms.uColor.value.lerpColors(INK, GOLD, goldMix.current);
  });

  return (
    <mesh geometry={geometry} renderOrder={-1}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
};

// The quiet centre every signal returns to. Breathes, never blinks.
const Soma = () => {
  const halo = useRef<THREE.Sprite>(null);
  const haloMat = useRef<THREE.SpriteMaterial>(null);
  const coreMat = useRef<THREE.SpriteMaterial>(null);
  const texture = getGlowTexture();

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const k = 1 - Math.pow(0.002, delta);
    if (halo.current) {
      const s = 1.5 * (1 + 0.04 * Math.sin(t * 0.6));
      halo.current.scale.set(s, s, 1);
    }
    if (haloMat.current) haloMat.current.opacity = THREE.MathUtils.lerp(haloMat.current.opacity, 0.55, k);
    if (coreMat.current) coreMat.current.opacity = THREE.MathUtils.lerp(coreMat.current.opacity, 0.95, k);
  });

  return (
    <group>
      <sprite ref={halo} scale={[1.5, 1.5, 1]}>
        <spriteMaterial
          ref={haloMat}
          map={texture}
          color={GOLD}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite scale={[0.34, 0.34, 1]}>
        <spriteMaterial
          ref={coreMat}
          map={texture}
          color={'#f3ebdc'}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  );
};

interface Pulse {
  limb: number;
  start: number;
  duration: number;
}

// Idle life: every few seconds a faint signal glides along one grown limb back
// to the soma — a dendrite doing what dendrites do. Pauses while focused.
const SignalPulses = ({ limbs, calm }: { limbs: ArborLimb[]; calm: boolean }) => {
  const sprites = useRef<(THREE.Sprite | null)[]>([]);
  const pulses = useRef<(Pulse | null)[]>(Array(PULSE_SLOTS).fill(null));
  const nextAt = useRef(0);
  const texture = getGlowTexture();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (nextAt.current === 0) nextAt.current = t + 3;

    const active = pulses.current;
    if (!calm && t >= nextAt.current) {
      const slot = active.findIndex((p) => p === null);
      const grown = limbs.filter((l) => t > l.delay + l.duration);
      if (slot !== -1 && grown.length > 0) {
        const limb = limbs.indexOf(grown[Math.floor(Math.random() * grown.length)]);
        active[slot] = { limb, start: t, duration: 2.4 + Math.random() * 1.6 };
      }
      nextAt.current = t + 3.5 + Math.random() * 3.5;
    }

    for (let i = 0; i < PULSE_SLOTS; i++) {
      const sprite = sprites.current[i];
      if (!sprite) continue;
      const pulse = active[i];
      if (!pulse) {
        sprite.visible = false;
        continue;
      }
      const p = (t - pulse.start) / pulse.duration;
      if (p >= 1) {
        active[i] = null;
        sprite.visible = false;
        continue;
      }
      const points = limbs[pulse.limb].points;
      // Tip → soma, eased so the signal drifts in and settles.
      const eased = p * p * (3 - 2 * p);
      const at = (1 - eased) * (points.length - 1);
      const idx = Math.min(points.length - 2, Math.floor(at));
      const frac = at - idx;
      sprite.position.lerpVectors(points[idx], points[idx + 1], frac);
      sprite.visible = true;
      const mat = sprite.material as THREE.SpriteMaterial;
      mat.opacity = Math.sin(Math.PI * p) * 0.55;
    }
  });

  return (
    <>
      {Array.from({ length: PULSE_SLOTS }, (_, i) => (
        <sprite
          key={i}
          ref={(el) => {
            sprites.current[i] = el;
          }}
          visible={false}
          scale={[PULSE_SIZE, PULSE_SIZE, 1]}
        >
          <spriteMaterial
            map={texture}
            color={PULSE_COLOR}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </>
  );
};

const ArborBranches = ({ arbor, activeId, related, level3, calm }: ArborBranchesProps) => {
  return (
    <group>
      <Soma />
      {arbor.limbs.map((limb) => {
        const dimmed = !!activeId && limb.id !== activeId && !related.has(limb.id);
        const base = 0.52 + 0.3 * brightnessFor(limb.importance);
        const opacity = level3 ? LEVEL3_OPACITY : dimmed ? DIM_OPACITY : activeId === limb.id ? Math.min(0.9, base + 0.25) : base;
        const gold = activeId === limb.id ? 1 : 0;
        return (
          <group key={limb.id}>
            <StrokeMesh stroke={limb} opacity={opacity} gold={gold} />
            {limb.twigs.map((twig, i) => (
              <StrokeMesh key={i} stroke={twig} opacity={opacity * 0.95} gold={gold} />
            ))}
          </group>
        );
      })}
      <SignalPulses limbs={arbor.limbs} calm={calm} />
    </group>
  );
};

export default ArborBranches;
