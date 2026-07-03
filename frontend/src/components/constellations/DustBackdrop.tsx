import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// The depth layer: sparse motes of dust adrift in lamplight, far behind the
// arbor. They breathe far slower than a star twinkle would, so the stage feels
// inhabited without anything asking for the eye.

const MOTE_COUNT = 160;
const FIELD_RADIUS = 60;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  attribute float aSeed;
  attribute float aScale;
  varying float vBreathe;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vBreathe = 0.5 + 0.5 * sin(uTime * 0.18 + aSeed * 6.2831853);
    gl_PointSize = uSize * aScale * (260.0 / -mv.z);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vBreathe;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    // Narrow amplitude and a global damp: dust glints, it never blinks.
    a *= (0.45 + 0.4 * vBreathe) * 0.55;
    gl_FragColor = vec4(uColor, a);
  }
`;

const DustBackdrop = () => {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.ShaderMaterial>(null);

  const { positions, seeds, scales } = useMemo(() => {
    const positions = new Float32Array(MOTE_COUNT * 3);
    const seeds = new Float32Array(MOTE_COUNT);
    const scales = new Float32Array(MOTE_COUNT);
    for (let i = 0; i < MOTE_COUNT; i++) {
      // Spherical shell, pushed outward so the dust sits behind the arbor.
      const r = FIELD_RADIUS * (0.55 + Math.random() * 0.45);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = -Math.abs(r * Math.cos(phi)) - 8;
      seeds[i] = Math.random();
      scales[i] = 0.4 + Math.random() * Math.random() * 1.2; // skew toward small
    }
    return { positions, seeds, scales };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 2.2 },
      uColor: { value: new THREE.Color('#d3bb8a') },
    }),
    [],
  );

  useFrame((_, delta) => {
    if (material.current) material.current.uniforms.uTime.value += delta;
    if (points.current) points.current.rotation.z += delta * 0.004; // slow drift
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
        <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default DustBackdrop;
