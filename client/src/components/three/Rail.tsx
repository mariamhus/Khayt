import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Product } from "../../lib/api";
import { FABRIC_FEEL } from "../../lib/garments";
import { garmentTexture, photoTexture, sampleField } from "./fabricTexture";

export type RailState = { progress: number; hover: number | null; focus: number };

type Props = { products: Product[]; state: React.RefObject<RailState>; onFocus: (index: number) => void; onPick: (index: number) => void; reduced: boolean };

const W = 1.7;
const H = (W * 130) / 100;
const COLS = 26;
const ROWS = 34;
const RAIL_Y = 1.55;
// Lifts the garment so its shoulder line sits over the hanger arms.
const GARMENT_Y = 0.1;

function hangerGeometry() {
  const points = [
    new THREE.Vector3(0.06, 0.34, 0),
    new THREE.Vector3(0.0, 0.4, 0),
    new THREE.Vector3(-0.07, 0.33, 0),
    new THREE.Vector3(-0.04, 0.25, 0),
    new THREE.Vector3(0, 0.2, 0),
    new THREE.Vector3(0, 0.1, 0),
    new THREE.Vector3(-0.42, -0.06, 0),
    new THREE.Vector3(-0.46, -0.1, 0),
    new THREE.Vector3(0.46, -0.1, 0),
    new THREE.Vector3(0.42, -0.06, 0),
    new THREE.Vector3(0, 0.1, 0),
  ];
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.12), 90, 0.012, 6, false);
}

type Built = ReturnType<typeof garmentTexture>;

function useGarment(product: Product) {
  const color = product.colors[0]!;
  const photo = product.images?.[color.key];
  const drawn = useMemo(() => garmentTexture(product.garment, product.pattern, product.fabric, color.hex), [product.garment, product.pattern, product.fabric, color.hex]);
  const [loaded, setLoaded] = useState<Built | null>(null);
  useEffect(() => {
    if (!photo) {
      setLoaded(null);
      return;
    }
    let alive = true;
    let result: Built | null = null;
    photoTexture(photo, product.fabric)
      .then((built) => {
        result = built;
        if (alive) setLoaded(built);
        else {
          built.map.dispose();
          built.normal.dispose();
        }
      })
      .catch(() => setLoaded(null));
    return () => {
      alive = false;
      if (result) {
        result.map.dispose();
        result.normal.dispose();
      }
    };
  }, [photo, product.fabric]);
  useEffect(
    () => () => {
      drawn.map.dispose();
      drawn.normal.dispose();
    },
    [drawn],
  );
  return loaded ?? drawn;
}

function Piece({ product, index, spacing, state, onPick, reduced, hanger }: { product: Product; index: number; spacing: number; state: React.RefObject<RailState>; onPick: (index: number) => void; reduced: boolean; hanger: THREE.BufferGeometry }) {
  const group = useRef<THREE.Group>(null);
  const built = useGarment(product);
  const feel = FABRIC_FEEL[product.fabric];
  const front = useMemo(() => {
    const plane = new THREE.PlaneGeometry(W, H, COLS, ROWS);
    plane.translate(0, -H / 2, 0);
    return plane;
  }, []);
  const back = useMemo(() => front.clone(), [front]);
  const depth = useMemo(() => {
    const values = new Float32Array((COLS + 1) * (ROWS + 1));
    for (let row = 0; row <= ROWS; row += 1)
      for (let col = 0; col <= COLS; col += 1) values[row * (COLS + 1) + col] = Math.pow(sampleField(built, col / COLS, row / ROWS), 0.55);
    return values;
  }, [built]);
  const puff = product.garment === "scarf" ? 0.05 : product.fabric === "silk" ? 0.1 : 0.16;
  const base = product.colors[0]!;
  // Real photos already carry their own highlights; a strong white sheen on top washes them out.
  const isPhoto = Boolean(product.images?.[base.key]);
  const materials = useMemo(() => {
    const sheen = isPhoto ? Math.min(feel.sheen, 0.25) : feel.sheen;
    const sheenColor = isPhoto ? new THREE.Color(base.hex).lerp(new THREE.Color("#ffffff"), 0.3) : new THREE.Color("#ffffff");
    const make = (side: THREE.Side, tone: number) =>
      new THREE.MeshPhysicalMaterial({
        map: built.map,
        normalMap: built.normal,
        normalScale: new THREE.Vector2(0.35 + feel.weave * 0.5, 0.35 + feel.weave * 0.5),
        alphaTest: 0.5,
        side,
        roughness: isPhoto ? Math.max(feel.roughness, 0.8) : feel.roughness,
        specularIntensity: isPhoto ? 0.35 : 1,
        metalness: 0,
        sheen,
        sheenRoughness: product.fabric === "silk" ? 0.3 : 0.8,
        sheenColor,
        color: new THREE.Color(tone, tone, tone),
      });
    return { front: make(THREE.FrontSide, 1), back: make(THREE.BackSide, 0.82) };
  }, [built, feel.weave, feel.roughness, feel.sheen, product.fabric, isPhoto, base.hex]);
  const swing = useRef({ angle: 0, velocity: 0, lift: 0, turn: 0, energy: 0 });
  const phase = index * 1.7;

  useEffect(
    () => () => {
      front.dispose();
      back.dispose();
    },
    [front, back],
  );
  useEffect(
    () => () => {
      materials.front.dispose();
      materials.back.dispose();
    },
    [materials],
  );

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const shared = state.current;
    const body = swing.current;
    const hovered = shared.hover === index;
    const push = (shared as RailState & { accel?: number }).accel ?? 0;
    if (!reduced) {
      const lightness = 1.6 - feel.weight * 0.18;
      body.velocity += (-body.angle * 26 - push * 0.9 * lightness) * dt;
      body.velocity *= Math.exp(-2.2 * dt);
      body.angle += body.velocity * dt;
      body.angle = Math.max(-0.45, Math.min(0.45, body.angle));
      body.energy += (Math.min(1, Math.abs(body.velocity) * 0.9 + Math.abs(push) * 0.05) - body.energy) * Math.min(1, dt * 4);
    }
    body.lift += ((hovered ? 1 : 0) - body.lift) * Math.min(1, dt * 8);
    body.turn += ((hovered ? 0 : Math.sin(index * 2.3) * 0.32) - body.turn) * Math.min(1, dt * 5);
    if (group.current) {
      group.current.position.set(index * spacing, RAIL_Y - 0.36, body.lift * 0.55);
      group.current.rotation.set(0, body.turn + (reduced ? 0 : Math.sin(clock.elapsedTime * 0.4 + phase) * 0.04), body.angle);
      group.current.scale.setScalar(1 + body.lift * 0.07);
    }
    const time = clock.elapsedTime;
    const soft = 1.5 - feel.bend;
    const breeze = reduced ? 0 : 0.01 + body.energy * 0.12;
    const a = front.attributes.position as THREE.BufferAttribute;
    const b = back.attributes.position as THREE.BufferAttribute;
    for (let row = 0; row <= ROWS; row += 1) {
      const v = row / ROWS;
      const fall = Math.pow(v, 1.5);
      for (let col = 0; col <= COLS; col += 1) {
        const u = col / COLS - 0.5;
        const i = row * (COLS + 1) + col;
        const wave = Math.sin(u * 7 + time * 1.6 + phase + v * 3.2) * breeze * soft * fall + Math.sin(u * 13 - time * 2.3 + phase) * breeze * 0.35 * soft * fall;
        const fold = Math.cos(u * 9 + phase) * 0.02 * fall;
        const drag = -body.velocity * 0.09 * fall * soft;
        const bulge = depth[i]! * puff * (1 - 0.35 * fall);
        const x = u * W * (1 - 0.03 * fall * Math.abs(Math.sin(u * 9 + phase))) + drag;
        const z = wave + fold + body.lift * 0.02 * Math.sin(u * 5 + time * 3) * fall;
        a.setXYZ(i, x, a.getY(i), z + bulge);
        b.setXYZ(i, x, b.getY(i), z - bulge * 0.75);
      }
    }
    a.needsUpdate = true;
    b.needsUpdate = true;
    front.computeVertexNormals();
    back.computeVertexNormals();
  });

  const events = {
    onPointerOver: (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      state.current.hover = index;
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      if (state.current.hover === index) state.current.hover = null;
      document.body.style.cursor = "";
    },
    onClick: (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      onPick(index);
    },
  };

  return (
    <>
      <group ref={group}>
        {/* Hanger sits inside the garment: arms hidden by the shoulders, only the hook and neck show. */}
        <mesh geometry={hanger} position={[0, -0.02, -0.015]} scale={[product.garment === "trousers" ? 0.62 : 1, 1, 1]}>
          <meshStandardMaterial color="#8c6a43" roughness={0.45} metalness={0.6} />
        </mesh>
        <mesh geometry={front} material={materials.front} position={[0, GARMENT_Y, 0]} {...events} />
        <mesh geometry={back} material={materials.back} position={[0, GARMENT_Y, 0]} {...events} />
      </group>
      <mesh position={[index * spacing, RAIL_Y - 0.36 - H - 0.62, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.55, 1]}>
        <circleGeometry args={[0.8, 32]} />
        <meshBasicMaterial color="#3a2f24" transparent opacity={0.08} depthWrite={false} />
      </mesh>
    </>
  );
}

function Scene({ products, state, onFocus, onPick, reduced }: Props) {
  const { camera, size } = useThree();
  const rail = useRef<THREE.Group>(null);
  const narrow = size.width < 700;
  const spacing = narrow ? 1.5 : 1.95;
  const hanger = useMemo(hangerGeometry, []);
  const motion = useRef({ x: 0, velocity: 0, last: 0, focus: -1 });
  const length = (products.length - 1) * spacing;

  useLayoutEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = narrow ? 46 : 34;
    perspective.position.set(0, 0.25, narrow ? 7.4 : 8.2);
    perspective.lookAt(0, 0.1, 0);
    perspective.updateProjectionMatrix();
  }, [camera, narrow]);

  useEffect(() => () => hanger.dispose(), [hanger]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const body = motion.current;
    const target = state.current.progress * length;
    const before = body.x;
    body.x += (target - body.x) * (reduced ? 1 : Math.min(1, dt * 5));
    const velocity = (body.x - before) / Math.max(dt, 0.001);
    const accel = (velocity - body.velocity) / Math.max(dt, 0.001);
    body.velocity = velocity;
    (state.current as RailState & { accel?: number }).accel = Math.max(-60, Math.min(60, accel));
    if (rail.current) rail.current.position.x = -body.x - (narrow ? 0 : 1.8);
    const focus = Math.max(0, Math.min(products.length - 1, Math.round(body.x / spacing)));
    if (focus !== body.focus) {
      body.focus = focus;
      state.current.focus = focus;
      onFocus(focus);
    }
  });

  return (
    <>
      <hemisphereLight args={["#fff8ee", "#d9c8ad", 1.1]} />
      <directionalLight position={[2.5, 4, 6]} intensity={2.4} color="#fff6e8" />
      <directionalLight position={[-6, 1.5, 2]} intensity={0.55} color="#ffd9b8" />
      <directionalLight position={[0, 3, -6]} intensity={0.9} color="#fff1dc" />
      <group ref={rail}>
        <mesh position={[length / 2, RAIL_Y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, length + 14, 16]} />
          <meshStandardMaterial color="#6f5334" roughness={0.3} metalness={0.85} />
        </mesh>
        {products.map((product, index) => (
          <Piece key={product.id} product={product} index={index} spacing={spacing} state={state} onPick={onPick} reduced={reduced} hanger={hanger} />
        ))}
      </group>
    </>
  );
}

export default function Rail(props: Props) {
  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ fov: 34, position: [0, 0.25, 8.2] }} style={{ touchAction: "pan-y" }}>
      <Scene {...props} />
    </Canvas>
  );
}
