/* ══════════════════════════════════════════════════════════════
   ALEXIS BARBER — logo 3D real

   Extruye la silueta vectorizada del logo original (logo-shape.json)
   con bisel y la recubre con un material metálico. Sustituye a la
   versión apilada en CSS cuando hay WebGL; si algo falla, avisa a
   main.js para que monte esa versión de respaldo.
   ══════════════════════════════════════════════════════════════ */

import * as THREE from "three";

/* Ajuste del aspecto. Son los únicos números que hay que tocar para cambiar
   cómo se ve la pieza; el resto del archivo no hace falta leerlo. */
const LOOK = {
  grosor:     .17,   // profundidad de la extrusión, en anchos de logo
  bisel:      .010,  // ancho del chaflán del borde (subirlo deforma las letras)
  vueltaSeg:  16,    // segundos por vuelta completa
  pausaCaras: .34,   // 0 = velocidad constante; más alto = se demora de frente
  faseIni:    -.34,  // ángulo inicial, para que la primera imagen sea legible
  caraBrillo: .07,   // rugosidad de la cara: 0 = espejo
  cantoBrillo:.28,   // rugosidad del canto
  reflejos:   2.6,   // intensidad de los reflejos del entorno
  exposicion: 1.08,
};

const stage = document.getElementById("stage");
const host  = document.getElementById("logo3d");

const fail = (why) => {
  console.warn("[logo3d] " + why + " — se usa la versión CSS de respaldo.");
  stage?.removeAttribute("data-pending3d");
  window.__abFallback?.();
};

if (!stage || !host) {
  fail("no se encontró el contenedor");
} else {
  try {
    await build();
  } catch (e) {
    fail(e && e.message ? e.message : String(e));
  }
}

async function build() {
  const res = await fetch("/assets/img/logo-shape.json");
  if (!res.ok) throw new Error("no se pudo cargar logo-shape.json");
  const data = await res.json();

  const lessMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Geometría ───────────────────────────────────────────── */
  const toVecs = pts => pts.map(([x, y]) => new THREE.Vector2(x, -y)); // SVG mira hacia abajo

  const shapes = data.shapes.map(s => {
    const shape = new THREE.Shape(toVecs(s.outer));
    for (const h of s.holes) shape.holes.push(new THREE.Path(toVecs(h)));
    return shape;
  });

  const W = data.w;
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth:          W * LOOK.grosor,
    bevelEnabled:   true,
    bevelThickness: W * LOOK.bisel * .92,
    bevelSize:      W * LOOK.bisel,
    bevelOffset:    0,
    bevelSegments:  2,
    curveSegments:  1,
  });

  // Normales planas por faceta, que es lo que trae ExtrudeGeometry: deja las
  // caras limpias y el chaflán nítido. Suavizarlas con toCreasedNormals se
  // probó y queda peor (las caras salen veteadas).
  const geoF = geo;

  geoF.computeBoundingBox();
  const bb = geoF.boundingBox, size = new THREE.Vector3();
  bb.getSize(size);
  geoF.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -(bb.min.z + bb.max.z) / 2);
  geoF.scale(1 / size.x, 1 / size.x, 1 / size.x);   // el logo mide 1 de ancho
  const aspect = size.y / size.x;

  /* ── Materiales: cara cromada, canto en rosa más profundo ─── */
  const face = new THREE.MeshPhysicalMaterial({
    color: 0xffdad9, metalness: 1, roughness: LOOK.caraBrillo,
    clearcoat: .35, clearcoatRoughness: .06, envMapIntensity: LOOK.reflejos,
  });
  const side = new THREE.MeshPhysicalMaterial({
    color: 0xeaadab, metalness: 1, roughness: LOOK.cantoBrillo,
    clearcoat: .3, clearcoatRoughness: .14, envMapIntensity: LOOK.reflejos * .8,
  });

  const mesh  = new THREE.Mesh(geoF, [face, side]);
  const pivot = new THREE.Group();
  pivot.add(mesh);

  const scene = new THREE.Scene();
  scene.add(pivot);

  /* ── Escena de reflejos (sin archivos externos) ──────────── */
  const EW = 1024, EH = 512;
  const c = document.createElement("canvas");
  c.width = EW; c.height = EH;
  const g = c.getContext("2d");

  const grad = g.createLinearGradient(0, 0, 0, EH);
  grad.addColorStop(0,   "#0d0a0b");
  grad.addColorStop(.46, "#3a2b2d");
  grad.addColorStop(.52, "#e9d6d5");
  grad.addColorStop(.6,  "#241a1b");
  grad.addColorStop(1,   "#050404");
  g.fillStyle = grad; g.fillRect(0, 0, EW, EH);

  // focos de estudio: lo que dibuja los brillos del cromo
  const strip = (x, y, w, h, col) => {
    const lg = g.createLinearGradient(x, y, x, y + h);
    lg.addColorStop(0, "transparent"); lg.addColorStop(.5, col); lg.addColorStop(1, "transparent");
    g.fillStyle = lg; g.fillRect(x, y, w, h);
  };
  strip(40,  18, 300, 150, "#ffffff");
  strip(560, 40, 300, 130, "#ffffff");
  strip(390, 96,  90,  70, "rgba(255,236,235,.85)");
  strip(880, 70, 130, 110, "rgba(255,246,245,.9)");
  strip(100, 320, 380, 130, "rgba(255,198,196,.95)");
  strip(620, 300, 260, 110, "rgba(255,228,227,.85)");
  // zonas oscuras entre focos: sin ellas el reflejo sale plano
  g.fillStyle = "rgba(10,7,8,.72)";
  g.fillRect(340, 150, 60, 120);
  g.fillRect(870, 160, 80, 110);
  g.fillRect(480, 190, 70,  90);

  const envTex = new THREE.CanvasTexture(c);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;

  /* ── Render ──────────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  if (!renderer.getContext()) throw new Error("sin contexto WebGL");
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = LOOK.exposicion;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose(); pmrem.dispose();

  const key = new THREE.DirectionalLight(0xfff6f5, 2.6); key.position.set(-1.1, 1.5, 2.2);
  const rim = new THREE.DirectionalLight(0xffb9b7, 1.5); rim.position.set(1.6, -.6, -1.4);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, .14));

  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  camera.position.set(0, 0, 3.35);

  const cv = renderer.domElement;
  cv.className = "logo3d__canvas";
  cv.setAttribute("aria-hidden", "true");
  stage.insertBefore(cv, host);

  const resize = () => {
    const w = stage.clientWidth || 260;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, w, false);
    camera.aspect = 1;
    // encuadra el logo al ~92 % del alto disponible pase lo que pase al girar
    const fit = Math.max(1.06, aspect) / .92;
    camera.position.z = (fit / 2) / Math.tan((camera.fov * Math.PI / 180) / 2);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
  new ResizeObserver(resize).observe(stage);
  resize();

  // ya hay 3D: se retira la versión CSS
  stage.dataset.webgl = "";
  stage.removeAttribute("data-pending3d");

  /* ── Animación ───────────────────────────────────────────── */
  const TURN = LOOK.vueltaSeg;
  let tilt = .22, tiltTarget = .22, running = true, raf = 0;

  if (lessMotion) {
    pivot.rotation.set(.1, LOOK.faseIni, 0);
    renderer.render(scene, camera);
    return;
  }

  const clock = new THREE.Clock();
  const tick = () => {
    raf = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    // Giro completo de 360°, pero con easing: se demora mirando de frente y
    // cruza deprisa los dos instantes de canto, donde la marca no se lee.
    // θ = φ − k·sin(2φ) sigue avanzando 2π por vuelta (monótono si k < .5).
    const phi = (t / TURN) * Math.PI * 2 + LOOK.faseIni;
    pivot.rotation.y = phi - LOOK.pausaCaras * Math.sin(2 * phi);
    tilt += (tiltTarget - tilt) * .045;
    pivot.rotation.x = tilt + Math.sin(t * .5) * .035;
    renderer.render(scene, camera);
  };
  tick();

  new IntersectionObserver(([en]) => {
    if (en.isIntersecting && !running) { running = true; clock.start(); tick(); }
    else if (!en.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
  }, { threshold: .02 }).observe(document.getElementById("inicio") || stage);

  if (matchMedia("(pointer: fine)").matches) {
    addEventListener("pointermove", e => {
      tiltTarget = .22 + (e.clientY / innerHeight - .5) * -.42;
    }, { passive: true });
  }
}
