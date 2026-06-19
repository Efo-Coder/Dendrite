import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

interface ConstellationLinkProps {
  from: [number, number, number];
  to: [number, number, number];
  weight: number; // 0..1
  highlighted?: boolean; // lit when one end is the focused theme
}

const LINK_COLOR = '#6f78a6'; // faint blue-violet, a soft neural pathway
const LINK_COLOR_LIT = '#d8b878'; // warm gold when a pathway is in focus

// A barely-there arc between two themes. Curved (not straight) so the field reads
// as organic pathways rather than a wireframe graph.
const ConstellationLink = ({ from, to, weight, highlighted = false }: ConstellationLinkProps) => {
  const points = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    // Bow the curve slightly perpendicular to its direction for a gentle sag.
    const dir = b.clone().sub(a);
    const perp = new THREE.Vector3(-dir.y, dir.x, 0).normalize();
    mid.addScaledVector(perp, dir.length() * 0.12);
    mid.z = (a.z + b.z) * 0.5;
    return new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(24);
  }, [from, to]);

  return (
    <Line
      points={points}
      color={highlighted ? LINK_COLOR_LIT : LINK_COLOR}
      transparent
      opacity={highlighted ? 0.22 + 0.4 * weight : 0.05 + 0.16 * weight}
      lineWidth={(highlighted ? 1 : 0.5) + weight}
      depthWrite={false}
    />
  );
};

export default ConstellationLink;
