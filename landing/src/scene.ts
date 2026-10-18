import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Drop a garbage truck model at public/models/truck.glb to replace the built-in one.
const TRUCK_GLB = "/models/truck.glb";
const TRUCK_GLB_LENGTH = 6.4; // model is scaled to this length
const TRUCK_GLB_ROTATION_Y = 0; // set to Math.PI / 2 etc. if the model faces the wrong way

export const TOTAL = 150; // length of the journey in world units
const TRUCK_Z = 1.5;

export type BinStatus = "clean" | "minor" | "major";
export interface BinStop { x: number; status: BinStatus; label: string; pts: number }
const STATUSES: BinStatus[] = ["clean", "clean", "minor", "clean", "clean", "major", "clean", "clean", "minor"];
const PTS = { clean: 40, minor: 25, major: 0 };
export const BIN_STOPS: BinStop[] = STATUSES.map((status, i) => ({
  x: 16 + i * 14,
  status,
  label: `Block ${"ABCD"[i % 4]} · bin ${i + 1}`,
  pts: PTS[status],
}));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (a: number, b: number, t: number) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const mat = (color: string | number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra });

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---------- sky / mood keyframes (morning -> day -> golden hour -> dusk) ----------
// One mood per page section (index 0..10), blended as you scroll between them.
const MOODS = [
  { sky: "#cdeec6", ground: "#8fcf74", sun: "#fff6c4", light: 1.15, night: 0 },
  { sky: "#bfe6f7", ground: "#86c76d", sun: "#fff3b0", light: 1.2, night: 0 },
  { sky: "#bfe6f7", ground: "#86c76d", sun: "#fff3b0", light: 1.2, night: 0 },
  { sky: "#fbe9ad", ground: "#8ec870", sun: "#ffe28a", light: 1.15, night: 0 },
  { sky: "#fbe9ad", ground: "#8ec870", sun: "#ffe28a", light: 1.1, night: 0 },
  { sky: "#f8d9a0", ground: "#86c06b", sun: "#ffc45e", light: 1.0, night: 0 },
  { sky: "#f8c18c", ground: "#7fb56a", sun: "#ffa95f", light: 0.92, night: 0.05 },
  { sky: "#f4a77f", ground: "#76a864", sun: "#ff9250", light: 0.82, night: 0.15 },
  { sky: "#e58a74", ground: "#6a9a5e", sun: "#ff8040", light: 0.7, night: 0.35 },
  { sky: "#16343a", ground: "#2f5e4a", sun: "#ffb27a", light: 0.5, night: 1 },
].map((m) => ({ ...m, skyC: new THREE.Color(m.sky), groundC: new THREE.Color(m.ground), sunC: new THREE.Color(m.sun) }));

function pick(s: number, n: number) {
  const x = Math.min(Math.max(s, 0), n - 1.0001);
  const i = Math.floor(x);
  return { i, t: smooth(0, 1, x - i) };
}

function mood(s: number) {
  const { i, t } = pick(s, MOODS.length);
  const a = MOODS[i], b = MOODS[i + 1];
  return {
    sky: a.skyC.clone().lerp(b.skyC, t), ground: a.groundC.clone().lerp(b.groundC, t),
    sun: a.sunC.clone().lerp(b.sunC, t), light: lerp(a.light, b.light, t), night: lerp(a.night, b.night, t),
  };
}

// One camera shot per page section. shift > 0 puts the truck on the right of the screen.
interface Key { pos: [number, number, number]; look: [number, number, number]; shift: number }
const KEYS: Key[] = [
  { pos: [-1, 3.6, 14.5], look: [0.5, 2.0, 0], shift: 0.2 },   // hero
  { pos: [5.5, 2.0, 9.5], look: [0, 2.0, 0], shift: -0.2 },    // problem
  { pos: [-2, 4.2, 14], look: [0, 1.8, 0], shift: 0.3 },       // resident tour
  { pos: [-6, 2.6, 8.5], look: [-2, 2.2, 0], shift: -0.22 },   // collector (rear view, bins lift)
  { pos: [3, 5, 22], look: [0, 7, 0], shift: 0.0 },           // admin
  { pos: [9, 3.0, 10], look: [0, 2.0, 0], shift: 0.2 },        // rewards
  { pos: [-4, 4.5, 12], look: [0, 2.0, 0], shift: -0.2 },      // ai
  { pos: [6, 3.5, 12], look: [0, 2.0, 0], shift: 0.2 },        // multi-society
  { pos: [-5, 3.0, 11], look: [0, 2.0, 0], shift: -0.2 },      // impact
  { pos: [-9, 5.5, 20], look: [7, 6.5, 0], shift: 0.0 },       // end
];

function sampleKey(s: number) {
  const { i, t } = pick(s, KEYS.length);
  const a = KEYS[i], b = KEYS[i + 1];
  const mix = (x: number[], y: number[]) => x.map((v, k) => lerp(v, y[k], t));
  return { pos: mix(a.pos, b.pos), look: mix(a.look, b.look), shift: lerp(a.shift, b.shift, t) };
}

// ---------- builders ----------
function buildTruck() {
  const g = new THREE.Group();
  const green = mat("#2f9e5a"), deep = mat("#1c6b3d"), dark = mat("#1a2b26"), white = mat("#f6f6ef");
  const glass = mat("#9fd3e6", { roughness: 0.15, metalness: 0.3 });

  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
  };

  add(new THREE.BoxGeometry(6.4, 0.35, 1.9), dark, 0, 0.8, 0);
  add(new RoundedBoxGeometry(4.0, 2.1, 2.2, 4, 0.2), green, -0.55, 2.0, 0);
  add(new RoundedBoxGeometry(1.0, 1.3, 2.0, 3, 0.15), deep, -3.0, 1.6, 0);
  add(new RoundedBoxGeometry(1.7, 1.7, 2.0, 4, 0.2), white, 2.3, 1.75, 0);
  add(new THREE.BoxGeometry(0.06, 0.8, 1.7), glass, 3.12, 2.1, 0);
  add(new THREE.BoxGeometry(1.0, 0.7, 0.06), glass, 2.1, 2.1, 1.01);
  add(new THREE.BoxGeometry(1.0, 0.7, 0.06), glass, 2.1, 2.1, -1.01);
  add(new THREE.BoxGeometry(0.25, 0.3, 2.15), dark, 3.1, 0.95, 0);
  add(new THREE.BoxGeometry(4.05, 0.12, 2.25), deep, -0.55, 1.1, 0);

  const lightMat = new THREE.MeshStandardMaterial({ color: "#fff4c2", emissive: "#fff0a0", emissiveIntensity: 1.2 });
  add(new THREE.SphereGeometry(0.17, 12, 8), lightMat, 3.12, 1.2, 0.7);
  add(new THREE.SphereGeometry(0.17, 12, 8), lightMat, 3.12, 1.2, -0.7);
  const beaconMat = new THREE.MeshStandardMaterial({ color: "#ffb300", emissive: "#ff9800", emissiveIntensity: 1 });
  add(new THREE.CylinderGeometry(0.18, 0.22, 0.2, 12), beaconMat, 2.3, 2.7, 0);

  const logo = canvasTex(512, 256, (c) => {
    c.fillStyle = "rgba(0,0,0,0)"; c.clearRect(0, 0, 512, 256);
    c.fillStyle = "#fff"; c.font = "800 78px 'Bricolage Grotesque', system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("SegreGate", 290, 112);
    c.fillStyle = "#f5c518"; c.beginPath(); c.ellipse(78, 112, 34, 52, -0.7, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#1c6b3d"; c.lineWidth = 6; c.beginPath(); c.moveTo(56, 138); c.lineTo(100, 86); c.stroke();
    c.fillStyle = "rgba(255,255,255,.85)"; c.font = "500 30px system-ui, sans-serif"; c.fillText("Sort. Collect. Score.", 280, 192);
  });
  const logoMat = new THREE.MeshBasicMaterial({ map: logo, transparent: true });
  const right = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.75), logoMat); right.position.set(-0.55, 2.05, 1.12); g.add(right);
  const left = right.clone(); left.position.z = -1.12; left.rotation.y = Math.PI; g.add(left);

  const wheels: THREE.Group[] = [];
  for (const x of [2.3, -0.9, -2.3]) for (const z of [1.02, -1.02]) {
    const w = new THREE.Group(); w.position.set(x, 0.55, z);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.4, 20), mat("#15201c")); tire.rotation.x = Math.PI / 2; tire.castShadow = true;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.43, 10), mat("#b9c4bd", { metalness: 0.3 })); hub.rotation.x = Math.PI / 2;
    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.45), mat("#6b7a72")); // visible spin marker
    w.add(tire, hub, bolt); g.add(w); wheels.push(w);
  }
  return { group: g, wheels, beaconMat };
}

function buildBin(color: string) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.33, 0.95, 16), mat(color)); body.castShadow = true;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.1, 16), mat("#" + new THREE.Color(color).multiplyScalar(0.7).getHexString())); lid.position.y = 0.5; lid.castShadow = true;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.41, 0.08, 16), mat("#f6f6ef")); band.position.y = 0.1;
  g.add(body, lid, band);
  return g;
}

function windowTextures(seed: number) {
  const r = rng(seed);
  const cells: [number, number, boolean][] = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) cells.push([x, y, r() > 0.55]);
  const base = canvasTex(128, 256, (c) => {
    c.fillStyle = "#ffffff"; c.fillRect(0, 0, 128, 256);
    for (const [x, y, lit] of cells) { c.fillStyle = lit ? "#ffe9a8" : "#6a8aa0"; c.fillRect(x * 32 + 6, y * 32 + 7, 20, 18); }
    c.fillStyle = "rgba(0,0,0,.08)"; for (let y = 0; y < 8; y++) c.fillRect(0, y * 32 + 30, 128, 2);
  });
  const glow = canvasTex(128, 256, (c) => {
    c.fillStyle = "#000"; c.fillRect(0, 0, 128, 256);
    for (const [x, y, lit] of cells) if (lit) { c.fillStyle = "#ffcf70"; c.fillRect(x * 32 + 6, y * 32 + 7, 20, 18); }
  });
  for (const t of [base, glow]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return { base, glow };
}

// ---------- world ----------
export interface HudState { label: string; status: BinStatus; pts: number; amount: number }

export function createWorld(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#cdeec6", 35, 120);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 400);

  const hemi = new THREE.HemisphereLight("#ffffff", "#7aa66a", 1.1);
  const sunLight = new THREE.DirectionalLight("#fff6c4", 2.4);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunLight.shadow.camera, { left: -22, right: 22, top: 18, bottom: -18, near: 1, far: 70 });
  sunLight.shadow.bias = -0.0004;
  scene.add(hemi, sunLight, sunLight.target);

  // ground, road, sidewalks
  const groundMat = mat("#8fcf74");
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(TOTAL + 260, 200), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.set(TOTAL / 2, 0, -40); ground.receiveShadow = true; scene.add(ground);
  const road = new THREE.Mesh(new THREE.BoxGeometry(TOTAL + 260, 0.1, 6), mat("#3b4743"));
  road.position.set(TOTAL / 2, 0.05, 0); road.receiveShadow = true; scene.add(road);
  for (const z of [4.2, -4.2]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(TOTAL + 260, 0.16, 2.2), mat("#dcd8c8"));
    w.position.set(TOTAL / 2, 0.08, z); w.receiveShadow = true; scene.add(w);
  }
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.02, 0.14), new THREE.MeshBasicMaterial({ color: "#f3e9b0" }), 110);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 110; i++) { m4.setPosition(-60 + i * 3, 0.11, 0); dashes.setMatrixAt(i, m4); }
  scene.add(dashes);

  // truck
  const truck = buildTruck();
  truck.group.position.set(0, 0, TRUCK_Z);
  scene.add(truck.group);
  let glbLoaded = false;
  fetch(TRUCK_GLB, { method: "HEAD" }).then((r) => {
    if (!r.ok || (r.headers.get("content-type") || "").includes("text/html")) return;
    new GLTFLoader().load(TRUCK_GLB, (gltf) => {
      const m = gltf.scene;
      const box = new THREE.Box3().setFromObject(m);
      const size = box.getSize(new THREE.Vector3());
      m.scale.setScalar(TRUCK_GLB_LENGTH / Math.max(size.x, size.z));
      m.rotation.y = TRUCK_GLB_ROTATION_Y;
      const b2 = new THREE.Box3().setFromObject(m);
      m.position.y -= b2.min.y;
      m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      truck.group.clear(); truck.group.add(m); glbLoaded = true;
    });
  }).catch(() => {});

  // bins
  const binColors = ["#2e9d57", "#2f6fd6", "#d94a4a"];
  const bins = BIN_STOPS.map((s, i) => {
    const g = buildBin(binColors[i % 3]);
    g.position.set(s.x, 0.62, 4.0);
    scene.add(g);
    return { g, stop: s };
  });

  // apartment blocks (row near the road + a taller, hazier row behind)
  const r = rng(7);
  const buildingMats: THREE.MeshStandardMaterial[] = [];
  const pastel = ["#f2d5b8", "#cfe3c3", "#f6c9c0", "#d6e0f2", "#f4e6a8", "#e3d0ea"];
  const makeBuilding = (x: number, z: number, w: number, floors: number, d: number, seed: number) => {
    const h = floors * 3;
    const tex = windowTextures(seed);
    const rep: [number, number] = [Math.max(1, Math.round(w / 4)), floors / 8];
    tex.base.repeat.set(...rep); tex.glow.repeat.set(...rep);
    const m = new THREE.MeshStandardMaterial({
      color: pastel[Math.floor(r() * pastel.length)], map: tex.base, emissive: new THREE.Color("#ffb347"), emissiveMap: tex.glow, emissiveIntensity: 0, roughness: 0.9,
    });
    buildingMats.push(m);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, h / 2, z); b.castShadow = true; b.receiveShadow = true; scene.add(b);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.4, d + 0.4), mat("#8a7f72"));
    roof.position.set(x, h + 0.2, z); scene.add(roof);
  };
  for (let x = -18, i = 0; x < TOTAL + 40; x += 9.5 + r() * 2.5, i++) makeBuilding(x, -10.5 - r() * 2, 6.5 + r() * 2, 2 + Math.floor(r() * 3), 6, i + 1);
  // reflections: skyline row is a parallax layer
  const skyline = new THREE.Group(); scene.add(skyline);
  const skyMat = mat("#a9c7b4");
  for (let x = -90; x < TOTAL * 0.4 + 120; x += 6 + r() * 5) {
    const h = 10 + r() * 22;
    const b = new THREE.Mesh(new THREE.BoxGeometry(5 + r() * 4, h, 5), skyMat);
    b.position.set(x, h / 2, -42); skyline.add(b);
  }

  // hills (far parallax)
  const hills = new THREE.Group(); scene.add(hills);
  const hillMat = mat("#79b872", { flatShading: true });
  for (let x = -110; x < TOTAL * 0.1 + 130; x += 30 + r() * 18) {
    const hh = 9 + r() * 12;
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), hillMat);
    hill.scale.set(28 + r() * 14, hh, 14); hill.position.set(x, 0, -80); hills.add(hill);
  }

  // trees & lamps along the sidewalks
  const trunkM = mat("#7a5a3a"), leafMs = [mat("#3f9b4a", { flatShading: true }), mat("#58b25a", { flatShading: true }), mat("#2f8a47", { flatShading: true })];
  const lampBulbs: THREE.MeshStandardMaterial[] = [];
  const addTree = (x: number, z: number, s: number) => {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.2 * s, 1.6 * s, 7), trunkM); trunk.position.y = 0.8 * s; trunk.castShadow = true;
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15 * s, 0), leafMs[Math.floor(r() * 3)]); leaf.position.y = 2.3 * s; leaf.castShadow = true;
    t.add(trunk, leaf); t.position.set(x, 0, z); scene.add(t);
  };
  // low shrubs on the camera side so they never hide the truck
  for (let x = -20; x < TOTAL + 50; x += 5 + r() * 4) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + r() * 0.3, 0), leafMs[Math.floor(r() * 3)]);
    b.position.set(x, 0.35, 5.3 + r() * 0.5); b.scale.y = 0.7; b.castShadow = true; scene.add(b);
  }
  for (let x = -20; x < TOTAL + 50; x += 8 + r() * 6) { addTree(x, -5.0 - r() * 0.8, 1 + r() * 0.6); }
  for (let x = -10; x < TOTAL + 40; x += 15) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.6, 8), mat("#3d4b45")); pole.position.set(x, 1.8, -4.6); scene.add(pole);
    const bm = new THREE.MeshStandardMaterial({ color: "#fff3c4", emissive: "#ffd166", emissiveIntensity: 0.2 }); lampBulbs.push(bm);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), bm); bulb.position.set(x, 3.7, -4.6); scene.add(bulb);
  }

  // clouds (parallax layer)
  const clouds = new THREE.Group(); scene.add(clouds);
  const cloudMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, transparent: true, opacity: 0.95, fog: false });
  for (let x = -90; x < TOTAL * 0.2 + 110; x += 26 + r() * 14) {
    const c = new THREE.Group();
    for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(3 + r() * 2.5, 12, 8), cloudMat); s.position.set(k * 3.6 - 5, r() * 1.5, r() * 2); s.scale.y = 0.65; c.add(s); }
    c.position.set(x, 24 + r() * 10, -70 - r() * 15); clouds.add(c);
  }
  const sun = new THREE.Mesh(new THREE.SphereGeometry(5, 20, 14), new THREE.MeshBasicMaterial({ color: "#fff3b0", fog: false }));
  scene.add(sun);

  // gate at the end of the journey
  const gate = new THREE.Group(); gate.position.set(TOTAL + 8, 0, 0);
  for (const z of [-4.4, 4.4]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.1, 5.5, 1.1), mat("#d8cdb8")); p.position.set(0, 2.75, z); p.castShadow = true; gate.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.6, 10.6), mat("#d8cdb8")); beam.position.set(0, 5.6, 0); beam.castShadow = true; gate.add(beam);
  const signTex = canvasTex(1024, 256, (c) => {
    c.fillStyle = "#0f4c36"; c.fillRect(0, 0, 1024, 256); c.fillStyle = "#f5c518"; c.fillRect(0, 230, 1024, 26);
    c.fillStyle = "#fff"; c.font = "800 110px 'Bricolage Grotesque', system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("Green Meadows", 512, 108);
    c.fillStyle = "#cfeec9"; c.font = "500 40px system-ui, sans-serif"; c.fillText("Welcome home", 512, 190);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 1.4), new THREE.MeshBasicMaterial({ map: signTex }));
  sign.rotation.y = -Math.PI / 2; sign.position.set(-0.56, 5.6, 0); gate.add(sign);
  scene.add(gate);

  // ---------- per-frame ----------
  const lookV = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  let camInit = false;
  let size = { w: 1, h: 1 };

  function resize() {
    size = { w: window.innerWidth, h: window.innerHeight };
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
  }
  resize();

  function update(p: number, sec: number, time: number, mouse: { x: number; y: number }): HudState | null {
    const truckX = lerp(-6, TOTAL - 4, p);
    const bob = Math.sin(truckX * 4) * 0.015;
    truck.group.position.set(truckX, bob, TRUCK_Z);
    if (!glbLoaded) for (const w of truck.wheels) w.rotation.z = -truckX / 0.58;
    truck.beaconMat.emissiveIntensity = 0.4 + 0.9 * (Math.sin(time * 6) > 0 ? 1 : 0);

    // bins get lifted into the rear hopper as the truck passes
    let hud: HudState | null = null;
    const hopperX = truckX - 3.0;
    for (const { g, stop } of bins) {
      const rel = hopperX - stop.x;
      const u = clamp01((rel + 2.6) / 5.4);
      const arc = Math.sin(Math.PI * u);
      const toward = rel < 0 ? smooth(-2.6, 0, rel) : 1 - smooth(0, 2.8, rel);
      g.position.x = lerp(stop.x, hopperX, toward);
      g.position.y = 0.62 + 2.7 * arc;
      g.position.z = lerp(4.0, TRUCK_Z, smooth(0, 1, arc));
      g.rotation.x = -2.0 * smooth(0.55, 1, arc);
      if (u > 0.08 && u < 0.97) hud = { label: stop.label, status: stop.status, pts: stop.pts, amount: arc };
    }

    // mood
    const m = mood(sec);
    scene.background = m.sky;
    (scene.fog as THREE.Fog).color.copy(m.sky);
    groundMat.color.copy(m.ground);
    hemi.intensity = 0.55 + 0.6 * m.light * (1 - m.night * 0.5);
    hemi.color.copy(m.sky).lerp(new THREE.Color("#ffffff"), 0.5);
    sunLight.intensity = 2.4 * m.light * (1 - m.night * 0.7);
    sunLight.color.copy(m.sun);
    for (const b of buildingMats) b.emissiveIntensity = m.night * 1.1;
    for (const l of lampBulbs) l.emissiveIntensity = 0.2 + m.night * 1.8;

    const lightAngle = lerp(0.3, 1.2, sec / 9);
    sunLight.position.set(truckX - 10 + Math.cos(lightAngle) * 6, 16 + Math.sin(lightAngle) * 4 - m.night * 6, 14);
    sunLight.target.position.set(truckX, 0, 0);

    sun.position.set(truckX + 40, lerp(32, 8, smooth(0.5, 0.95, sec / 9)), -85);
    (sun.material as THREE.MeshBasicMaterial).color.copy(m.sun);

    // parallax layers follow the truck at different rates
    skyline.position.x = truckX * 0.6;
    hills.position.x = truckX * 0.9;
    clouds.position.x = truckX * 0.85 - time * 0.4;

    // camera
    const k = sampleKey(sec);
    const mx = mouse.x * 0.9, my = mouse.y * 0.5;
    camPos.set(truckX + k.pos[0] + mx, k.pos[1] + my, k.pos[2]);
    if (!camInit) { camera.position.copy(camPos); camInit = true; }
    camera.position.lerp(camPos, 0.18);
    lookV.set(truckX + k.look[0], k.look[1], k.look[2]);
    camera.lookAt(lookV);
    const narrow = size.w < 820;
    const shift = narrow ? 0 : k.shift;
    camera.setViewOffset(size.w, size.h, -shift * size.w, narrow ? size.h * 0.3 : 0, size.w, size.h);
    camera.fov = narrow ? 64 : 38;
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
    return hud;
  }

  return { update, resize, renderer, truckX: (p: number) => lerp(-6, TOTAL - 4, p) };
}
