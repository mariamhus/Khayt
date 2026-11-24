import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Fabric, Pattern } from "../../lib/api";
import { FABRIC_FEEL } from "../../lib/garments";
import { swatchPhoto, swatchTexture } from "./fabricTexture";

type Props = { fabric: Fabric; pattern: Pattern; hex: string; reduced: boolean; dropKey: number; photo?: string | null };

const N = 38;
const SIZE = 2.7;
const RADIUS = 0.74;
const CENTRE = new THREE.Vector3(0, 0.2, 0);
const FLOOR = -1.12;

class Cloth {
  position = new Float32Array(N * N * 3);
  previous = new Float32Array(N * N * 3);
  pairs: Int32Array;
  rest: Float32Array;
  kind: Uint8Array;
  still = 0;

  constructor() {
    const pairs: number[] = [];
    const rest: number[] = [];
    const kind: number[] = [];
    const step = SIZE / (N - 1);
    const add = (a: number, b: number, length: number, type: number) => {
      pairs.push(a, b);
      rest.push(length);
      kind.push(type);
    };
    for (let j = 0; j < N; j += 1)
      for (let i = 0; i < N; i += 1) {
        const index = j * N + i;
        if (i + 1 < N) add(index, index + 1, step, 0);
        if (j + 1 < N) add(index, index + N, step, 0);
        if (i + 1 < N && j + 1 < N) {
          add(index, index + N + 1, step * Math.SQRT2, 1);
          add(index + 1, index + N, step * Math.SQRT2, 1);
        }
        if (i + 2 < N) add(index, index + 2, step * 2, 2);
        if (j + 2 < N) add(index, index + N * 2, step * 2, 2);
      }
    this.pairs = Int32Array.from(pairs);
    this.rest = Float32Array.from(rest);
    this.kind = Uint8Array.from(kind);
    this.reset();
  }

  reset() {
    const angle = 0.5;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let j = 0; j < N; j += 1)
      for (let i = 0; i < N; i += 1) {
        const index = (j * N + i) * 3;
        const x = (i / (N - 1) - 0.5) * SIZE;
        const z = (j / (N - 1) - 0.5) * SIZE;
        this.position[index] = x * cos - z * sin;
        this.position[index + 1] = 1.25 + Math.sin(i * 0.7) * 0.01 + Math.cos(j * 0.9) * 0.01;
        this.position[index + 2] = x * sin + z * cos;
      }
    this.previous.set(this.position);
    this.still = 0;
  }

  step(fabric: Fabric) {
    const feel = FABRIC_FEEL[fabric];
    const p = this.position;
    const q = this.previous;
    const gravity = -0.0016;
    let moved = 0;
    for (let index = 0; index < p.length; index += 3) {
      const vx = (p[index]! - q[index]!) * feel.damping;
      const vy = (p[index + 1]! - q[index + 1]!) * feel.damping;
      const vz = (p[index + 2]! - q[index + 2]!) * feel.damping;
      q[index] = p[index]!;
      q[index + 1] = p[index + 1]!;
      q[index + 2] = p[index + 2]!;
      p[index] = p[index]! + vx;
      p[index + 1] = p[index + 1]! + vy + gravity;
      p[index + 2] = p[index + 2]! + vz;
      moved += Math.abs(vx) + Math.abs(vy) + Math.abs(vz);
    }
    const stiffness = [1, 0.7, feel.bend];
    for (let pass = 0; pass < feel.iterations; pass += 1) {
      for (let c = 0; c < this.rest.length; c += 1) {
        const a = this.pairs[c * 2]! * 3;
        const b = this.pairs[c * 2 + 1]! * 3;
        const dx = p[b]! - p[a]!;
        const dy = p[b + 1]! - p[a + 1]!;
        const dz = p[b + 2]! - p[a + 2]!;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const amount = ((distance - this.rest[c]!) / distance) * 0.5 * stiffness[this.kind[c]!]!;
        p[a] = p[a]! + dx * amount;
        p[a + 1] = p[a + 1]! + dy * amount;
        p[a + 2] = p[a + 2]! + dz * amount;
        p[b] = p[b]! - dx * amount;
        p[b + 1] = p[b + 1]! - dy * amount;
        p[b + 2] = p[b + 2]! - dz * amount;
      }
      for (let index = 0; index < p.length; index += 3) {
        const dx = p[index]! - CENTRE.x;
        const dy = p[index + 1]! - CENTRE.y;
        const dz = p[index + 2]! - CENTRE.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const limit = RADIUS + 0.03;
        if (distance < limit) {
          const scale = limit / (distance || 1e-6);
          p[index] = CENTRE.x + dx * scale;
          p[index + 1] = CENTRE.y + dy * scale;
          p[index + 2] = CENTRE.z + dz * scale;
          q[index] = p[index]! - (p[index]! - q[index]!) * feel.friction;
          q[index + 1] = p[index + 1]! - (p[index + 1]! - q[index + 1]!) * feel.friction;
          q[index + 2] = p[index + 2]! - (p[index + 2]! - q[index + 2]!) * feel.friction;
        }
        const radial = Math.sqrt(p[index]! * p[index]! + p[index + 2]! * p[index + 2]!);
        if (p[index + 1]! < CENTRE.y && radial < 0.2) {
          const scale = 0.2 / (radial || 1e-6);
          p[index] = p[index]! * scale;
          p[index + 2] = p[index + 2]! * scale;
        }
        if (p[index + 1]! < FLOOR) {
          p[index + 1] = FLOOR;
          q[index] = p[index]! - (p[index]! - q[index]!) * 0.3;
          q[index + 2] = p[index + 2]! - (p[index + 2]! - q[index + 2]!) * 0.3;
        }
      }
    }
    this.still = moved / (N * N) < 0.00035 ? this.still + 1 : 0;
  }
}

function Fabric({ fabric, pattern, hex, reduced, dropKey, spin, photo }: Props & { spin: React.RefObject<{ angle: number; dragging: boolean }> }) {
  const cloth = useMemo(() => new Cloth(), []);
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(SIZE, SIZE, N - 1, N - 1), []);
  const texture = useMemo(() => swatchTexture(pattern, fabric, hex), [pattern, fabric, hex]);
  const [image, setImage] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!photo) {
      setImage(null);
      return;
    }
    let alive = true;
    let loaded: THREE.Texture | null = null;
    swatchPhoto(photo)
      .then((result) => {
        loaded = result;
        if (alive) setImage(result);
        else result.dispose();
      })
      .catch(() => setImage(null));
    return () => {
      alive = false;
      loaded?.dispose();
    };
  }, [photo]);
  const feel = FABRIC_FEEL[fabric];
  const material = useMemo(
    () => new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, roughness: feel.roughness, metalness: 0, sheen: feel.sheen, sheenRoughness: fabric === "silk" ? 0.25 : 0.8, sheenColor: new THREE.Color("#ffffff") }),
    [feel.roughness, feel.sheen, fabric],
  );
  const budget = useRef(0);

  useEffect(() => {
    material.map = image ?? texture.map;
    material.bumpMap = texture.bump;
    material.bumpScale = image ? 0.6 : 1.4;
    material.color.set(image ? "#ffffff" : "#ffffff");
    material.needsUpdate = true;
  }, [material, texture, image]);

  useEffect(
    () => () => {
      texture.map.dispose();
      texture.bump.dispose();
    },
    [texture],
  );

  useEffect(() => {
    cloth.reset();
    if (reduced) for (let i = 0; i < 520; i += 1) cloth.step(fabric);
  }, [cloth, fabric, dropKey, reduced]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, delta) => {
    if (cloth.still < 90) {
      budget.current = Math.min(budget.current + delta, 0.05);
      let steps = 0;
      while (budget.current > 1 / 120 && steps < 4) {
        cloth.step(fabric);
        budget.current -= 1 / 120;
        steps += 1;
      }
      const position = geometry.attributes.position as THREE.BufferAttribute;
      (position.array as Float32Array).set(cloth.position);
      position.needsUpdate = true;
      geometry.computeVertexNormals();
    }
    const state = spin.current;
    if (!state.dragging && !reduced) state.angle += delta * 0.18;
    if (group.current) group.current.rotation.y = state.angle;
  });

  return (
    <group ref={group}>
      <mesh geometry={geometry} material={material} />
      <mesh position={CENTRE}>
        <sphereGeometry args={[RADIUS, 48, 32]} />
        <meshStandardMaterial color="#e9e1d2" roughness={0.9} />
      </mesh>
      <mesh position={[0, (CENTRE.y + FLOOR) / 2 - 0.2, 0]}>
        <cylinderGeometry args={[0.07, 0.09, CENTRE.y - FLOOR, 24]} />
        <meshStandardMaterial color="#6f5334" roughness={0.35} metalness={0.8} />
      </mesh>
      <mesh position={[0, FLOOR - 0.03, 0]}>
        <cylinderGeometry args={[1.7, 1.75, 0.05, 64]} />
        <meshStandardMaterial color="#e6dccb" roughness={0.95} />
      </mesh>
    </group>
  );
}

export default function Drape(props: Props) {
  const spin = useRef({ angle: 0.4, dragging: false });
  const last = useRef(0);
  return (
    <div
      className="h-full w-full cursor-grab active:cursor-grabbing"
      style={{ touchAction: "pan-y" }}
      onPointerDown={(event) => {
        spin.current.dragging = true;
        last.current = event.clientX;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!spin.current.dragging) return;
        spin.current.angle += (event.clientX - last.current) * 0.01;
        last.current = event.clientX;
      }}
      onPointerUp={() => (spin.current.dragging = false)}
      onPointerCancel={() => (spin.current.dragging = false)}
    >
      <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ fov: 32, position: [0, 1.5, 6.2] }} onCreated={({ camera }) => camera.lookAt(0, -0.1, 0)}>
        <ambientLight intensity={0.9} color="#fff4e6" />
        <directionalLight position={[3, 6, 4]} intensity={2.4} color="#fff7ec" />
        <directionalLight position={[-4, 2, -3]} intensity={0.9} color="#ffd2ad" />
        <Fabric {...props} spin={spin} />
      </Canvas>
    </div>
  );
}
