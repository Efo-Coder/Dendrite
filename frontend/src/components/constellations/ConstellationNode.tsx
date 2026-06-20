import { useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { Constellation } from '../../types';
import { brightnessFor, constellationColor, radiusFor } from '../../lib/constellations';
import { getGlowTexture } from './glowTexture';
// Brand display serif (upright), vendored for troika (it can't read the CSS @import font).
import cormorant from '../../fonts/CormorantGaramond.ttf?url';

interface ConstellationNodeProps {
  constellation: Constellation;
  position: [number, number, number];
  focused: boolean; // hovered or selected — lifts the glow
  dimmed: boolean;
  // True while the pointer is panning — guards against selecting on drag-release.
  dragRef: { readonly current: { moved: boolean } };
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

const GLOW_MIN = 1.2;
const GLOW_MAX = 3.4;
const LABEL_COLOR = '#f3ebdc'; // warm white, on-brand against the night

const ConstellationNode = ({ constellation, position, focused, dimmed, dragRef, onHover, onSelect }: ConstellationNodeProps) => {
  const glowRef = useRef<THREE.Sprite>(null);
  const glowMat = useRef<THREE.SpriteMaterial>(null);
  const coreMat = useRef<THREE.SpriteMaterial>(null);
  const opacity = useRef(1);

  const texture = getGlowTexture();
  const color = useMemo(() => new THREE.Color(constellationColor(constellation)), [constellation]);
  const glowBase = radiusFor(constellation.importance, GLOW_MIN, GLOW_MAX);
  const coreBase = glowBase * 0.3;
  const glowOpacity = 0.45 + 0.55 * brightnessFor(constellation.importance);
  const labelOpacity = Math.max(0.5, brightnessFor(constellation.importance));

  useFrame((_, delta) => {
    // Damp toward targets so hover and focus changes ease rather than snap.
    const k = 1 - Math.pow(0.0001, delta);
    const targetScale = glowBase * (focused ? 1.28 : 1);
    if (glowRef.current) {
      const s = THREE.MathUtils.lerp(glowRef.current.scale.x, targetScale, k);
      glowRef.current.scale.set(s, s, 1);
    }
    const targetOpacity = dimmed ? 0.3 : 1;
    opacity.current = THREE.MathUtils.lerp(opacity.current, targetOpacity, k);
    if (glowMat.current) glowMat.current.opacity = glowOpacity * opacity.current;
    if (coreMat.current) coreMat.current.opacity = opacity.current;
  });

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    onHover(constellation.id);
  };
  const handleOut = () => {
    document.body.style.cursor = '';
    onHover(null);
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (dragRef.current.moved) return; // a pan, not a click
    onSelect(constellation.id);
  };

  return (
    <group position={position}>
      <sprite
        ref={glowRef}
        scale={[glowBase, glowBase, 1]}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <spriteMaterial
          ref={glowMat}
          map={texture}
          color={color}
          transparent
          opacity={glowOpacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite scale={[coreBase, coreBase, 1]}>
        <spriteMaterial
          ref={coreMat}
          map={texture}
          color={'#ffffff'}
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <Text
        font={cormorant}
        position={[0, -(glowBase * 0.4 + 0.2), 0]}
        fontSize={0.58}
        letterSpacing={0.02}
        color={LABEL_COLOR}
        fillOpacity={labelOpacity}
        anchorX="center"
        anchorY="top"
        outlineWidth={0.008}
        outlineColor="#05060c"
        outlineOpacity={0.6}
      >
        {constellation.title}
      </Text>
    </group>
  );
};

export default ConstellationNode;
