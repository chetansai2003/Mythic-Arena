import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BoxGeometry,
  CylinderGeometry,
  OctahedronGeometry,
  Object3D,
} from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei/core/Stars';
import { Edges } from '@react-three/drei/core/Edges';

function Arena({ active }) {
  const group = useRef();
  const ring = useRef();
  const lightning = useRef();
  const bolt = useRef();
  const boltPoints = useMemo(
    () =>
      new Float32Array([
        -3, 2.8, -1, -2.65, 2.15, -1, -2.9, 1.95, -1, -2.45, 1.25, -1,
      ]),
    [],
  );
  const pointer = useRef({ x: 0, y: 0 });
  const frames = useRef(0);
  const geometry = useMemo(
    () => ({
      rune: new BoxGeometry(0.12, 0.045, 0.015),
      pillar: new CylinderGeometry(0.12, 0.2, 0.85, 5),
      crystal: new OctahedronGeometry(0.22, 0),
    }),
    [],
  );
  useEffect(
    () => () => Object.values(geometry).forEach((item) => item.dispose()),
    [geometry],
  );
  const { gl } = useThree();
  const columns = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        return [Math.cos(angle) * 2.1, 0.3, Math.sin(angle) * 2.1];
      }),
    [],
  );
  useEffect(() => {
    const canvas = gl.domElement;
    const parent = canvas.closest('.hero-panel');
    const move = (event) => {
      if (event.pointerType === 'touch') return;
      const bounds = parent.getBoundingClientRect();
      pointer.current = {
        x: (event.clientX - bounds.left) / bounds.width - 0.5,
        y: (event.clientY - bounds.top) / bounds.height - 0.5,
      };
    };
    const leave = () => {
      pointer.current = { x: 0, y: 0 };
    };
    parent?.addEventListener('pointermove', move);
    parent?.addEventListener('pointerleave', leave);
    return () => {
      parent?.removeEventListener('pointermove', move);
      parent?.removeEventListener('pointerleave', leave);
    };
  }, [gl]);
  useFrame(({ clock }, delta) => {
    if (!active) return;
    gl.domElement.dataset.frames = String(++frames.current);
    const elapsed = clock.elapsedTime;
    ring.current.rotation.z += Math.min(delta, 0.05) * 0.075;
    group.current.position.y = Math.sin(elapsed * 0.45) * 0.08;
    group.current.rotation.y +=
      (pointer.current.x * 0.12 - group.current.rotation.y) * 0.035;
    group.current.rotation.x +=
      (pointer.current.y * 0.045 - group.current.rotation.x) * 0.035;
    // One gentle violet glow every twelve seconds, never a strobe.
    lightning.current.intensity =
      1.1 + Math.pow(Math.max(0, Math.sin((elapsed * Math.PI) / 6)), 30) * 1.2;
    bolt.current.opacity =
      Math.pow(Math.max(0, Math.sin((elapsed * Math.PI) / 6)), 30) * 0.45;
  });
  return (
    <>
      <color attach="background" args={['#151b2b']} />
      <fog attach="fog" args={['#151b2b', 10, 22]} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[3, 6, 2]} intensity={3} color="#ffe3ac" />
      <pointLight
        ref={lightning}
        position={[-3, 3, -2]}
        color="#ae8cff"
        intensity={1.1}
      />
      <Stars
        radius={13}
        depth={12}
        count={180}
        factor={2}
        saturation={0}
        fade
        speed={0}
      />
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[boltPoints, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial ref={bolt} color="#c0a1ec" transparent opacity={0} />
      </line>
      <group ref={group}>
        <mesh position={[0, -0.98, 0]} rotation={[0, Math.PI / 6, Math.PI]}>
          <coneGeometry args={[3, 1.7, 6]} />
          <meshStandardMaterial color="#343d57" roughness={0.85} flatShading />
          <Edges color="#697089" />
        </mesh>
        <mesh rotation={[0, Math.PI / 6, 0]}>
          <cylinderGeometry args={[2.9, 2.7, 0.24, 6]} />
          <meshStandardMaterial
            color="#4d4963"
            metalness={0.3}
            roughness={0.7}
          />
          <Edges color="#d4b779" />
        </mesh>
        <group
          ref={ring}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.17, 0]}
        >
          <mesh>
            <torusGeometry args={[2.35, 0.017, 4, 64]} />
            <meshBasicMaterial color="#e7c583" />
          </mesh>
          <mesh>
            <torusGeometry args={[1.85, 0.012, 4, 64]} />
            <meshBasicMaterial color="#9e82c8" />
          </mesh>
          <Repeated
            geometry={geometry.rune}
            positions={Array.from({ length: 18 }, (_, i) => [
              Math.cos((i * Math.PI) / 9) * 2.12,
              Math.sin((i * Math.PI) / 9) * 2.12,
              0,
              (i * Math.PI) / 9,
            ])}
          >
            <meshBasicMaterial color="#e2c58e" />
          </Repeated>
        </group>
        <Repeated
          geometry={geometry.pillar}
          positions={columns.map(([x, y, z]) => [x, y + 0.35, z])}
        >
          <meshStandardMaterial color="#6a5d79" />
        </Repeated>
        <Repeated
          geometry={geometry.crystal}
          positions={columns.map(([x, y, z]) => [x, y + 1, z])}
        >
          <meshStandardMaterial
            color="#ccafff"
            emissive="#9263d4"
            emissiveIntensity={1.3}
          />
        </Repeated>

        <mesh position={[0, 0.7, 0]}>
          <octahedronGeometry args={[0.4, 0]} />
          <meshStandardMaterial
            color="#ddc7ff"
            emissive="#9365c7"
            emissiveIntensity={0.8}
          />
        </mesh>
      </group>
    </>
  );
}

export default function ArenaScene({ active, onReady, onFailure }) {
  const [capability] = useState(() => {
    try {
      const context = document.createElement('canvas').getContext('webgl2');
      if (!context) return { supported: false };
      const info = context.getExtension('WEBGL_debug_renderer_info');
      const software =
        info &&
        /swiftshader|llvmpipe|software/i.test(
          context.getParameter(info.UNMASKED_RENDERER_WEBGL),
        );
      context.getExtension('WEBGL_lose_context')?.loseContext();
      return { supported: true, software };
    } catch {
      return { supported: false };
    }
  });
  const cleanup = useRef(() => {});
  useEffect(() => () => cleanup.current(), []);
  const created = useCallback(
    ({ gl }) => {
      const canvas = gl.domElement;
      const lost = (event) => {
        event.preventDefault();
        onFailure();
      };
      canvas.addEventListener('webglcontextlost', lost);
      cleanup.current = () =>
        canvas.removeEventListener('webglcontextlost', lost);
      onReady();
    },
    [onReady, onFailure],
  );
  if (!capability.supported) return <Failure onFailure={onFailure} />;
  return (
    <Canvas
      camera={{ position: [4.8, 4.2, 6.6], fov: 42 }}
      dpr={capability.software ? 0.65 : [1, 1.25]}
      frameloop={active ? 'always' : 'never'}
      gl={{ antialias: false, alpha: false, powerPreference: 'low-power' }}
      onCreated={created}
      fallback={<span>Static arena artwork is available.</span>}
    >
      <Arena active={active} />
    </Canvas>
  );
}
function Failure({ onFailure }) {
  useEffect(() => {
    onFailure();
  }, [onFailure]);
  return null;
}

function Repeated({ geometry, positions, children }) {
  const mesh = useRef();
  useLayoutEffect(() => {
    const object = new Object3D();
    positions.forEach(([x, y, z, rotation = 0], index) => {
      object.position.set(x, y, z);
      object.rotation.set(0, 0, rotation);
      object.updateMatrix();
      mesh.current.setMatrixAt(index, object.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [positions]);
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, positions.length]}>
      {children}
    </instancedMesh>
  );
}
