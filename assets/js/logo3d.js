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
  bisel:      .0018,  // ancho del chaflán. NO subirlo: el chaflán desplaza el
                     // contorno hacia dentro, y en las curvas cerradas de las
                     // letras ese desplazamiento se cruza consigo mismo y el
                     // canto sale escalonado. A .010 ya se nota.
  vueltaSeg:  16,    // segundos por vuelta completa
  pausaCaras: .34,   // 0 = velocidad constante; más alto = se demora de frente
  faseIni:    -.34,  // ángulo inicial, para que la primera imagen sea legible
  caraBrillo: .12,   // rugosidad de la cara: 0 = espejo
  cantoBrillo:.34,   // rugosidad del canto
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

  /* ── Escena de reflejos ──────────────────────────────────── */
  // Un degradado liso, nada más. Se probaron focos pintados y el
  // RoomEnvironment de Three.js: los dos tienen cantos duros que una
  // superficie casi especular refleja como bandas.
  const envCanvas = document.createElement("canvas");
  envCanvas.width = 512; envCanvas.height = 256;
  {
    const g = envCanvas.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0,   "#1a1314");
    gr.addColorStop(.30, "#584244");
    gr.addColorStop(.50, "#f2e2e1");
    gr.addColorStop(.70, "#4b383a");
    gr.addColorStop(1,   "#0c0909");
    g.fillStyle = gr; g.fillRect(0, 0, 512, 256);

    // Ruido fino. Un degradado liso en 8 bits, al difuminarse para la
    // rugosidad alta, se cuantiza y aparece como terrazas en las paredes
    // interiores. El ruido rompe esos escalones y el desenfoque lo promedia.
    const img = g.getImageData(0, 0, 512, 256);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - .5) * 11;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
  }

  /* ── Render ──────────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  if (!renderer.getContext()) throw new Error("sin contexto WebGL");
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = LOOK.exposicion;

  const envTex = new THREE.CanvasTexture(envCanvas);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;
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
