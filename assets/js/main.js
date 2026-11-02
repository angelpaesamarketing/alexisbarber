/* ══════════════════════════════════════════════════════════════
   ALEXIS BARBER — main.js

   ┌──────────────────────────────────────────────────────────┐
   │  TODO LO QUE HAY QUE EDITAR ESTÁ EN ESTE BLOQUE CONFIG.  │
   │  No hace falta tocar nada más del archivo.               │
   └──────────────────────────────────────────────────────────┘
   ══════════════════════════════════════════════════════════════ */

const CONFIG = {

  // ⚠️ PENDIENTE — pon aquí el móvil con prefijo y SIN espacios ni "+"
  //    Ejemplo para España: "34612345678"
  whatsapp: "34600000000",

  // ⚠️ PENDIENTE — usuario de Instagram sin la @ (deja "" para ocultar el enlace)
  instagram: "",

  // Horario que se muestra bajo el botón final
  horario: "Lunes a sábado · 10:00 – 21:00",

  // Servicios y precios. Añade o quita bloques libremente.
  // feat: true  → destaca la tarjeta
  servicios: [
    { nombre: "Corte",            precio: 18, desc: "Corte a tijera o máquina, lavado y peinado con acabado de barbería.", tiempo: "35 min" },
    { nombre: "Corte + Barba",    precio: 25, desc: "El pack completo: corte, perfilado de barba con navaja y toalla caliente.", tiempo: "55 min", feat: true, tag: "El más pedido" },
    { nombre: "Barba",            precio: 12, desc: "Arreglo, perfilado y apurado con navaja. Aceite y bálsamo incluidos.", tiempo: "25 min" },
    { nombre: "Corte infantil",   precio: 14, desc: "Para los peques, en casa y sin agobios. Hasta 12 años.", tiempo: "30 min" },
    { nombre: "Rapado completo",  precio: 12, desc: "Máquina a un solo número, limpio y rápido.", tiempo: "20 min" },
    { nombre: "Cejas y detalles", precio: 5,  desc: "Perfilado de cejas o retoque de líneas. Solo junto a otro servicio.", tiempo: "10 min" }
  ],

  // Zonas de cobertura que se listan en la sección "Zona"
  zonas: [
    "Eixample","Gràcia","Sants","Sant Martí","Ciutat Vella","Sarrià",
    "Les Corts","Horta","Nou Barris","Sant Andreu","Poblenou","L'Hospitalet","Badalona"
  ]
};

/* ══════════════════════════════════════════════════════════════
   A partir de aquí no hace falta tocar nada.
   ══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const lessMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Enlaces de WhatsApp ───────────────────────────────── */
  const waNumber = String(CONFIG.whatsapp || "").replace(/\D/g, "");
  const isPlaceholder = !waNumber || waNumber === "34600000000";

  if (isPlaceholder) {
    console.warn(
      "[Alexis Barber] El número de WhatsApp todavía es el provisional.\n" +
      "Edita CONFIG.whatsapp en /assets/js/main.js antes de publicar en el dominio."
    );
  }

  $$(".js-wa").forEach(el => {
    const msg = el.dataset.msg || "Hola Alexis, quería reservar un corte.";
    el.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
    el.target = "_blank";
    el.rel = "noopener";
  });

  /* ── Instagram ─────────────────────────────────────────── */
  const ig = $("#ig");
  if (ig) {
    if (CONFIG.instagram) {
      ig.href = `https://instagram.com/${CONFIG.instagram.replace(/^@/, "")}`;
      ig.querySelector("span").textContent = `@${CONFIG.instagram.replace(/^@/, "")}`;
    } else {
      ig.remove();
    }
  }

  /* ── Textos dinámicos ──────────────────────────────────── */
  const yr = $("#year");          if (yr)  yr.textContent = new Date().getFullYear();
  const hrs = $("#hours");        if (hrs) hrs.textContent = CONFIG.horario || "";

  /* ── Tarjetas de precio ────────────────────────────────── */
  const prices = $("#prices");
  if (prices) {
    prices.innerHTML = CONFIG.servicios.map(s => `
      <article class="price reveal"${s.feat ? " data-feat" : ""}>
        ${s.tag ? `<span class="price__tag">${s.tag}</span>` : ""}
        <h3>${s.nombre}</h3>
        <p class="price__desc">${s.desc}</p>
        <p class="price__amount">${s.precio}<small>€</small></p>
        ${s.tiempo ? `<p class="price__time">${s.tiempo} aprox.</p>` : ""}
      </article>`).join("");
  }

  /* ── Zonas ─────────────────────────────────────────────── */
  const zones = $("#zones");
  if (zones) zones.innerHTML = CONFIG.zonas.map(z => `<li>${z}</li>`).join("");

  /* ── Logo 3D: capas de extrusión ───────────────────────── */
  const spin = $("#spin");
  if (spin) {
    const small = innerWidth < 560;
    const LAYERS = small ? 16 : 28;

    // Grosor de la pieza, escalado al tamaño real del logo.
    // Se publica como --depth para que las dos caras usen el mismo valor.
    const DEPTH = Math.round((spin.offsetWidth || 260) * 0.19);
    $("#logo3d").style.setProperty("--depth", DEPTH + "px");

    // Las láminas no llegan hasta el borde: dejan un margen libre para que
    // el navegador ordene sin ambigüedad las caras cromadas por delante.
    const INSET = 7;
    const SPAN  = DEPTH - INSET * 2;

    const front = $(".logo3d__face--front", spin);
    const frag  = document.createDocumentFragment();

    for (let i = 0; i < LAYERS; i++) {
      const t = i / (LAYERS - 1);                 // 0 → cara trasera, 1 → cara frontal
      const z = -SPAN / 2 + t * SPAN;
      // El tono va horneado en la imagen: un `filter` aquí haría que Chromium
      // aplanase la lámina y ordenase todo el conjunto por orden de DOM
      // en lugar de por profundidad, tapando las caras cromadas.
      const edge = Math.abs(t - .5) * 2;                 // 0 centro · 1 borde
      const tone = edge > .78 ? "l" : edge > .4 ? "m" : "d";

      const img = document.createElement("img");
      img.className = "logo3d__slab";
      img.src = `/assets/img/logo-slab-${tone}.webp`;
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      img.decoding = "async";
      img.style.transform = `translateZ(${z.toFixed(2)}px)`;
      frag.appendChild(img);
    }
    spin.insertBefore(frag, front);
  }

  /* ── Inclinación del logo con el puntero ───────────────── */
  const tilt = $("#tilt");
  if (tilt && !lessMotion && matchMedia("(pointer: fine)").matches) {
    addEventListener("pointermove", e => {
      const y = 13 + (e.clientY / innerHeight - .5) * -16;   // 5° … 21°
      const x = (e.clientX / innerWidth - .5) * 7;
      tilt.style.setProperty("--tx", `${y.toFixed(2)}deg`);
      tilt.style.setProperty("--tz", `${x.toFixed(2)}deg`);
    }, { passive: true });
  }

  /* ── Reveal al hacer scroll ────────────────────────────── */
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((en, i) => {
      if (!en.isIntersecting) return;
      setTimeout(() => en.target.setAttribute("data-in", ""), i * 80);
      obs.unobserve(en.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: .12 });

  const watchReveals = () => $$(".reveal:not([data-in])").forEach(el => io.observe(el));
  watchReveals();

  /* ── Tilt 3D en las tarjetas ───────────────────────────── */
  if (!lessMotion && matchMedia("(pointer: fine)").matches) {
    $$(".tilt").forEach(card => {
      let raf = 0;
      card.addEventListener("pointermove", e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        card.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          card.style.transform =
            `perspective(900px) rotateX(${((.5 - py) * 8).toFixed(2)}deg) rotateY(${((px - .5) * 10).toFixed(2)}deg) translateY(-4px)`;
        });
      }, { passive: true });
      card.addEventListener("pointerleave", () => {
        cancelAnimationFrame(raf);
        card.style.transform = "";
      });
    });
  }

  /* ── Nav fijo + botón flotante ─────────────────────────── */
  const nav = $("#nav"), fab = $(".fab"), hero = $("#inicio"), bgLayer = $(".hero__bg");

  const onScroll = () => {
    const y = scrollY;
    nav.toggleAttribute("data-stuck", y > 30);
    if (fab) fab.toggleAttribute("data-on", y > innerHeight * .55);
    if (bgLayer && !lessMotion && y < innerHeight * 1.2) {
      bgLayer.style.transform = `translate3d(0,${(y * .22).toFixed(1)}px,0)`;
    }
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ── Pausa la animación del logo fuera de pantalla ─────── */
  if (hero && spin) {
    const glint = $(".stage__glint");
    new IntersectionObserver(([en]) => {
      const st = en.isIntersecting ? "running" : "paused";
      spin.style.animationPlayState = st;
      if (glint) glint.style.animationPlayState = st;
    }, { threshold: .02 }).observe(hero);
  }
})();
