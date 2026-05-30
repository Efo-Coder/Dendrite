import { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { shaderMaterial, useTexture } from '@react-three/drei';
import * as THREE from 'three';

const NightTransitionMaterial = shaderMaterial(
  {
    uProgress: 0.0,
    uDayTex: null as unknown as THREE.Texture,
    uNightTex: null as unknown as THREE.Texture,
    uRepeat: new THREE.Vector2(1, 1),
    uOffset: new THREE.Vector2(0, 0),
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
   uniform vec2 uRepeat;
   uniform vec2 uOffset;
   void main() {
     vec2 uv = vUv * uRepeat + uOffset;
     vec4 day   = texture2D(uDayTex,   uv);
     vec4 night = texture2D(uNightTex, uv);
     float brightness = dot(day.rgb, vec3(0.299, 0.587, 0.114));
     float mixFactor  = clamp((uProgress * 2.0) - brightness, 0.0, 1.0);
     vec4 result = mix(day, night, mixFactor);
     gl_FragColor = vec4(result.rgb, result.a);
   }`
);

extend({ NightTransitionMaterial });

useTexture.preload(['/dendrite-forest.webp', '/dendrite-forest-dark.webp']);

declare module '@react-three/fiber' {
  interface ThreeElements {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nightTransitionMaterial: any;
  }
}

function BackgroundMesh({ isDark }: { isDark: boolean }) {
  const matRef = useRef<any>(null);
  const { viewport, size } = useThree();
  const [dayTex, nightTex] = useTexture([
    '/dendrite-forest.webp',
    '/dendrite-forest-dark.webp',
  ]);
  const initialized = useRef(false);

  useFrame(() => {
    if (!matRef.current) return;

    // Cover UV — berechnet bei jedem Frame damit Resize korrekt reagiert
    const img = dayTex.image as HTMLImageElement | null;
    if (img?.width) {
      const imgAspect = img.width / img.height;
      const canvasAspect = size.width / size.height;
      let rx = 1, ry = 1, ox = 0, oy = 0;
      if (canvasAspect > imgAspect) {
        ry = imgAspect / canvasAspect;
        oy = (1 - ry) / 2;
      } else {
        rx = canvasAspect / imgAspect;
        ox = (1 - rx) / 2;
      }
      matRef.current.uRepeat.set(rx, ry);
      matRef.current.uOffset.set(ox, oy);
    }

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
        position: 'absolute',
        inset: 0,
        backgroundImage: `url('${isDark ? '/dendrite-forest-dark.webp' : '/dendrite-forest.webp'}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
  );
}

function FadingCanvas({ isDark }: { isDark: boolean }) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease',
    }}>
      <Canvas
        gl={{ outputColorSpace: THREE.LinearSRGBColorSpace }}
        onCreated={() => requestAnimationFrame(() => setVisible(true))}
      >
        <BackgroundMesh isDark={isDark} />
      </Canvas>
    </div>
  );
}

export default function NightTransitionBackground({ isDark }: { isDark: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <StaticFallback isDark={isDark} />
      <Suspense fallback={null}>
        <FadingCanvas isDark={isDark} />
      </Suspense>
    </div>
  );
}
