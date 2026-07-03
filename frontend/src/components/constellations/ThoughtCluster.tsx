import { useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { ThemeNote } from '../../types';
import { getGlowTexture } from './glowTexture';
// Same vendored brand serif (upright) as the constellation labels.
import cormorant from '../../fonts/CormorantGaramond.ttf?url';

interface ThoughtClusterProps {
  notes: ThemeNote[];
  center: [number, number, number];
  onOpenNote: (id: string) => void;
}

const BUD_SIZE = 0.3;
const BUD_COLOR = '#dcc08e'; // warm gold-ivory, like young growth
const BUD_COLOR_HOT = '#f3ddb0';
const STEM_COLOR = '#d8cdb4';
const STEM_LEN = 0.35;
const SPACING = 0.55;
const INNER_GAP = 3; // push the whole field out so a ring clears the theme node

// Deterministic z-jitter per note so the field has depth but never reshuffles.
function jitterZ(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000;
  return (h / 1000 - 0.5) * 0.8;
}

// Level 3: the theme's actual notes as a phyllotaxis field of gold buds that
// bloom out of the branch tip, each on a short stem toward the centre. Hover
// reveals the title, click opens the note.
const ThoughtCluster = ({ notes, center, onOpenNote }: ThoughtClusterProps) => {
  const group = useRef<THREE.Group>(null);
  const started = useRef(false);
  const [hover, setHover] = useState<number | null>(null);
  const texture = getGlowTexture();

  const positions = useMemo<[number, number, number][]>(
    () =>
      notes.map((n, i) => {
        const angle = i * 2.399963; // golden angle → even disk
        const r = Math.sqrt(i + INNER_GAP) * SPACING;
        return [Math.cos(angle) * r, Math.sin(angle) * r, jitterZ(n.id)];
      }),
    [notes],
  );

  // All stems share one geometry — hair-thin native lines are enough here.
  const stems = useMemo(() => {
    const arr = new Float32Array(positions.length * 6);
    positions.forEach(([x, y, z], i) => {
      const d = Math.hypot(x, y) || 1;
      arr.set([x - (x / d) * STEM_LEN, y - (y / d) * STEM_LEN, z, x, y, z], i * 6);
    });
    return arr;
  }, [positions]);

  useFrame((_, delta) => {
    if (!group.current) return;
    // Start collapsed, then bloom outward (not a JSX prop, so re-renders on hover
    // don't reset the animation).
    if (!started.current) {
      group.current.scale.setScalar(0.12);
      started.current = true;
    }
    const k = 1 - Math.pow(0.0006, delta);
    const s = THREE.MathUtils.lerp(group.current.scale.x, 1, k);
    group.current.scale.setScalar(s);
  });

  return (
    <group ref={group} position={center}>
      <lineSegments>
        <bufferGeometry key={positions.length}>
          <bufferAttribute attach="attributes-position" args={[stems, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={STEM_COLOR} transparent opacity={0.3} depthWrite={false} />
      </lineSegments>
      {notes.map((n, i) => {
        const hovered = hover === i;
        const size = BUD_SIZE * (hovered ? 1.6 : 1);
        return (
          <sprite
            key={n.id}
            position={positions[i]}
            scale={[size, size, 1]}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
              setHover(i);
            }}
            onPointerOut={() => {
              document.body.style.cursor = '';
              setHover(null);
            }}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onOpenNote(n.id);
            }}
          >
            <spriteMaterial
              map={texture}
              color={hovered ? BUD_COLOR_HOT : BUD_COLOR}
              transparent
              opacity={hovered ? 1 : 0.85}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        );
      })}
      {hover !== null && notes[hover] && (
        <Text
          font={cormorant}
          position={[positions[hover][0], positions[hover][1] + 0.5, positions[hover][2]]}
          fontSize={0.4}
          color="#f3ebdc"
          anchorX="center"
          anchorY="bottom"
          maxWidth={6}
          outlineWidth={0.006}
          outlineColor="#0b0604"
          outlineOpacity={0.7}
        >
          {notes[hover].title?.trim() || notes[hover].preview || 'Untitled'}
        </Text>
      )}
    </group>
  );
};

export default ThoughtCluster;
