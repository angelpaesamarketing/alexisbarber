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
  cantoBrillo:.38,   // rugosidad del canto: difumina el reflejo y con él
                     // las bandas que delatan las facetas de la pared
  reflejos:   2.5,   // intensidad de los reflejos del entorno
  exposicion: 1.08,
  alisado:    40,    // grados: por debajo de este ángulo se suavizan las
                     // normales, para que el canto salga liso y no a rayas.
                     // Tiene que quedar por debajo de 45°, que es el ángulo
                     // entre la cara y el chaflán
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
    // Un solo tramo: el chaflán queda a 45° de la cara, muy por encima del
    // umbral de alisado, así que cara y borde no se mezclan. Partirlo en
    // varios tramos deja el primero a ~22° y las caras salen veteadas.
    bevelSegments:  1,
    curveSegments:  1,
  });

  // Alisado del canto. OJO con el orden: toCreasedNormals agrupa vértices con
  // una precisión fija de ~0.01 unidades, así que hay que aplicarlo AHORA, con
  // la geometría todavía a ~900 unidades de ancho. Si se hace después de
  // escalarla a 1, esa precisión pasa a ser el 1 % del logo, mezcla las
  // normales de la cara con las del chaflán y las caras salen veteadas.
  let geoF = geo;
  if (LOOK.alisado > 0) {
    try {
      const { toCreasedNormals } = await import("three/addons/utils/BufferGeometryUtils.js");
      geoF = toCreasedNormals(geo, LOOK.alisado * Math.PI / 180);
      if (!geoF.groups?.length) for (const g of geo.groups) geoF.addGroup(g.start, g.count, g.materialIndex);
    } catch {
      geoF = geo;   // sin el módulo de utilidades: facetas planas, como antes
    }
  }

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
  // El entorno se pinta A BAJA RESOLUCIÓN a propósito. Comprobado: con un
  // entorno plano los laterales salen perfectamente lisos, así que las rayas
  // del canto no venían de la geometría sino de reflejar cantos duros del
  // mapa. A 192x96, el filtrado bilineal los difumina por construcción y ya
  // no pueden existir. Se dibuja en coordenadas de 1024x512 y se escala.
  const EW = 192, EH = 96;
  const c = document.createElement("canvas");
  c.width = EW; c.height = EH;
  const g = c.getContext("2d");
  g.scale(EW / 1024, EH / 512);

  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0,   "#140e0f");
  grad.addColorStop(.34, "#4a3739");
  grad.addColorStop(.5,  "#e7d3d2");
  grad.addColorStop(.68, "#3a2b2c");
  grad.addColorStop(1,   "#0a0708");
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);

  // Focos de estudio: lo que dibuja los brillos del cromo. Van con los bordes
  // difuminados en los dos ejes a propósito. Con bordes duros, la pared lisa
  // del canto refleja esos cantos como bandas nítidas y el lateral parece
  // rayado aunque la geometría esté perfectamente suavizada.
  const strip = (x, y, w, h, col) => {
    const cx = x + w / 2, cy = y + h / 2, r = Math.max(w, h) / 2;
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, col);
    rg.addColorStop(.45, col);
    rg.addColorStop(1, "transparent");
    g.save();
    g.translate(cx, cy); g.scale(1, h / Math.max(w, h)); g.translate(-cx, -cy);
    g.fillStyle = rg; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.restore();
  };
  strip(20,  10, 360, 170, "#ffffff");
  strip(540, 26, 340, 160, "#ffffff");
  strip(380, 80, 130, 100, "#fff4f3");
  strip(860, 54, 170, 130, "#ffffff");
  strip(80,  310, 420, 150, "rgba(255,206,204,1)");
  strip(600, 292, 300, 130, "rgba(255,234,233,.95)");
  // zonas oscuras entre focos: sin ellas el reflejo sale plano
  strip(320, 150, 120, 170, "rgba(14,10,11,.78)");
  strip(850, 160, 140, 160, "rgba(14,10,11,.78)");
  strip(460, 190, 130, 140, "rgba(14,10,11,.7)");

  const envTex = new THREE.CanvasTexture(c);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.magFilter = THREE.LinearFilter;
  envTex.minFilter = THREE.LinearFilter;
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

  const key = new THREE.DirectionalLight(0xfff6f5, 3.4); key.position.set(-1.1, 1.5, 2.2);
  const rim = new THREE.DirectionalLight(0xffc6c4, 2.2); rim.position.set(1.7, -.5, -1.5);
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
