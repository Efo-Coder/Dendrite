import { useRef, useState, Suspense, MutableRefObject } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { shaderMaterial, useTexture } from '@react-three/drei';
import * as THREE from 'three';

const ForestHeroMaterial = shaderMaterial(
  {
    uProgress: 0.0,
    uScroll: 0.0,
    uDayTex: null as unknown as THREE.Texture,
    uNightTex: null as unknown as THREE.Texture,
    uDepthTex: null as unknown as THREE.Texture,
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
   uniform sampler2D uDepthTex;
   uniform float uProgress;
   uniform float uScroll;
   uniform vec2 uRepeat;
   uniform vec2 uOffset;

   void main() {
     vec2 baseUv = vUv * uRepeat + uOffset;

     float eased = pow(uScroll, 1.5);

     // 4-tap blur on depth map → smooth depth transitions, no tearing
     float bs = 0.008;
     float depth = (
       texture2D(uDepthTex, baseUv + vec2(-bs,  bs)).r +
       texture2D(uDepthTex, baseUv + vec2( bs,  bs)).r +
       texture2D(uDepthTex, baseUv + vec2(-bs, -bs)).r +
       texture2D(uDepthTex, baseUv + vec2( bs, -bs)).r
     ) * 0.25;

     // Global zoom (artefaktfrei) + kleines Depth-Parallax obendrauf
     float globalScale = 1.0 - eased * 0.46;
     vec2 focal = uOffset + uRepeat * 0.5;
     vec2 zoomedUv = focal + (baseUv - focal) * globalScale;
     float parallax = clamp(eased * depth * 0.22, 0.0, 0.20);
     vec2 sampledUv = focal + (zoomedUv - focal) * (1.0 - parallax);

     vec4 day   = texture2D(uDayTex,   sampledUv);
     vec4 night = texture2D(uNightTex, sampledUv);

     float brightness = dot(day.rgb, vec3(0.299, 0.587, 0.114));
     float mixFactor  = clamp((uProgress * 2.0) - brightness, 0.0, 1.0);

     gl_FragColor = mix(day, night, mixFactor);
   }`
);

extend({ ForestHeroMaterial });

useTexture.preload([
  '/img/backgrounds/forest.webp',
  '/img/backgrounds/forest-dark.webp',
  '/img/backgrounds/forest-depth.png',
]);

declare module '@react-three/fiber' {
  interface ThreeElements {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    forestHeroMaterial: any;
  }
}

function HeroMesh({
  isDark,
  scrollRef,
  onReady,
}: {
  isDark: boolean;
  scrollRef: MutableRefObject<number>;
  onReady?: () => void;
}) {
  const matRef = useRef<any>(null);
  const { viewport, size } = useThree();
  const [dayTex, nightTex, depthTex] = useTexture([
    '/img/backgrounds/forest.webp',
    '/img/backgrounds/forest-dark.webp',
    '/img/backgrounds/forest-depth.png',
  ]);
  const initialized = useRef(false);

  useFrame(() => {
    if (!matRef.current) return;

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
      matRef.current.uScroll = 0;
      initialized.current = true;
      onReady?.();
      return;
    }

    const targetProgress = isDark ? 1 : 0;
    const curProgress = matRef.current.uProgress as number;
    const nextProgress = THREE.MathUtils.lerp(curProgress, targetProgress, 0.04);
    matRef.current.uProgress = Math.abs(nextProgress - targetProgress) < 0.001 ? targetProgress : nextProgress;

    matRef.current.uScroll = THREE.MathUtils.lerp(
      matRef.current.uScroll as number,
      scrollRef.current,
      0.07,
    );
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <forestHeroMaterial
        ref={matRef}
        uDayTex={dayTex}
        uNightTex={nightTex}
        uDepthTex={depthTex}
      />
    </mesh>
  );
}

function StaticFallback({ isDark }: { isDark: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url('${isDark ? '/img/backgrounds/forest-dark.webp' : '/img/backgrounds/forest.webp'}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
  );
}

function FadingCanvas({
  isDark,
  scrollRef,
}: {
  isDark: boolean;
  scrollRef: MutableRefObject<number>;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      <Canvas gl={{ outputColorSpace: THREE.LinearSRGBColorSpace }}>
        <HeroMesh isDark={isDark} scrollRef={scrollRef} onReady={() => setVisible(true)} />
      </Canvas>
    </div>
  );
}

export default function ForestHeroBackground({
  isDark,
  scrollRef,
}: {
  isDark: boolean;
  scrollRef: MutableRefObject<number>;
}) {
  return (
    <div
      style={{ position: 'absolute', inset: 0, userSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <StaticFallback isDark={isDark} />
      <Suspense fallback={null}>
        <FadingCanvas isDark={isDark} scrollRef={scrollRef} />
      </Suspense>
    </div>
  );
}
