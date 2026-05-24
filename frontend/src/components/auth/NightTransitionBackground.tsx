import { useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { shaderMaterial, useTexture } from '@react-three/drei';
import * as THREE from 'three';

const NightTransitionMaterial = shaderMaterial(
  {
    uProgress: 0.0,
    uDayTex: null as unknown as THREE.Texture,
    uNightTex: null as unknown as THREE.Texture,
  },
  `varying vec2 vUv;
   void main() {
     vUv = uv;
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
   }`,
  `varying vec2 vUv;
   uniform sampler2D uDayTex;
   uniform sampler2D uNightTex;
   uniform float uProgress;
   void main() {
     vec4 day   = texture2D(uDayTex,   vUv);
     vec4 night = texture2D(uNightTex, vUv);
     // dunkle Pixel wechseln zuerst zur Nacht, helle (Himmel) zuletzt
     float brightness = dot(day.rgb, vec3(0.299, 0.587, 0.114));
     float mixFactor  = clamp((uProgress * 2.0) - brightness, 0.0, 1.0);
     vec4 result = mix(day, night, mixFactor);
     gl_FragColor = vec4(result.rgb * 1.0, result.a);
   }`
);

extend({ NightTransitionMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nightTransitionMaterial: any;
  }
}

function BackgroundMesh({ isDark }: { isDark: boolean }) {
  const matRef = useRef<any>(null);
  const { viewport } = useThree();
  const [dayTex, nightTex] = useTexture([
    '/dendrite-forest.jpg',
    '/dendrite-forest-dark.png',
  ]);
  const initialized = useRef(false);

  useFrame(() => {
    if (!matRef.current) return;

    if (!initialized.current) {
      matRef.current.uProgress = isDark ? 1 : 0;
      initialized.current = true;
      return;
    }

    const target = isDark ? 1 : 0;
    const cur = matRef.current.uProgress as number;
    const next = THREE.MathUtils.lerp(cur, target, 0.04);
    matRef.current.uProgress = Math.abs(next - target) < 0.001 ? target : next;
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <nightTransitionMaterial ref={matRef} uDayTex={dayTex} uNightTex={nightTex} />
    </mesh>
  );
}

function StaticFallback({ isDark }: { isDark: boolean }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundImage: `url('${isDark ? '/dendrite-forest-dark.png' : '/dendrite-forest.jpg'}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
  );
}

export default function NightTransitionBackground({ isDark }: { isDark: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Suspense fallback={<StaticFallback isDark={isDark} />}>
        <Canvas gl={{ outputColorSpace: THREE.LinearSRGBColorSpace }}>
          <BackgroundMesh isDark={isDark} />
        </Canvas>
      </Suspense>
    </div>
  );
}
