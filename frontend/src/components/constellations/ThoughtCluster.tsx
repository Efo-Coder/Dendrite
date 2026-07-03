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
  color: string;
  onOpenNote: (id: string) => void;
}

const STAR_SIZE = 0.42;
const SPACING = 0.55;
const INNER_GAP = 3; // push the whole field out so a ring clears the theme star

// Deterministic z-jitter per note so the field has depth but never reshuffles.
function jitterZ(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000;
  return (h / 1000 - 0.5) * 0.8;
}

// Level 3: the theme's actual notes as a phyllotaxis field of small stars that
// bloom out of the constellation. Hover reveals the title, click opens the note.
const ThoughtCluster = ({ notes, center, color, onOpenNote }: ThoughtClusterProps) => {
  const group = useRef<THREE.Group>(null);
  const started = useRef(false);
  const [hover, setHover] = useState<number | null>(null);
  const texture = getGlowTexture();
  const tint = useMemo(() => new THREE.Color(color), [color]);

  const positions = useMemo<[number, number, number][]>(
    () =>
      notes.map((n, i) => {
        const angle = i * 2.399963; // golden angle → even disk
        const r = Math.sqrt(i + INNER_GAP) * SPACING;
        return [Math.cos(angle) * r, Math.sin(angle) * r, jitterZ(n.id)];
      }),
    [notes],
  );

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
      {notes.map((n, i) => {
        const hovered = hover === i;
        const size = STAR_SIZE * (hovered ? 1.7 : 1);
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
              color={hovered ? '#ffffff' : tint}
              transparent
              opacity={hovered ? 1 : 0.9}
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
