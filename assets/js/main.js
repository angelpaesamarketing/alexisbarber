/* ══════════════════════════════════════════════════════════════
   ALEXIS BARBER — comportamiento de la página

   El CONTENIDO ya no vive aquí: las páginas se generan con
   build.py a partir de content/*.json, una por idioma. Este
   archivo solo se ocupa de la interacción y del respaldo del
   logo cuando no hay WebGL.
   ══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const lessMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();

  const stage = $("#stage");
  const spin  = $("#spin");

  /* ── Logo: pila de capas en CSS (respaldo sin WebGL) ───── */
  const buildCssLogo = () => {
    if (!spin || spin.dataset.built) return;
    spin.dataset.built = "1";

    const small  = innerWidth < 560;
    const LAYERS = small ? 16 : 28;

    const DEPTH = Math.round((spin.offsetWidth || 260) * 0.19);
    $("#logo3d").style.setProperty("--depth", DEPTH + "px");

    // Las láminas no llegan hasta el borde: dejan un margen libre para que
    // el navegador ordene sin ambigüedad las caras cromadas por delante.
    const INSET = 7;
    const SPAN  = DEPTH - INSET * 2;

    const front = $(".logo3d__face--front", spin);
    const frag  = document.createDocumentFragment();

    for (let i = 0; i < LAYERS; i++) {
      const t = i / (LAYERS - 1);
      const z = -SPAN / 2 + t * SPAN;

      // El tono va horneado en la imagen: un `filter` aquí haría que Chromium
      // aplanase la lámina y ordenase todo el conjunto por orden de DOM en
      // lugar de por profundidad, tapando las caras cromadas.
      const edge = Math.abs(t - .5) * 2;
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
  };

  const hasWebGL = () => {
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch { return false; }
  };

  window.__abFallback = () => {
    stage?.removeAttribute("data-pending3d");
    buildCssLogo();
  };

  if (spin && !lessMotion && hasWebGL()) {
    stage?.setAttribute("data-pending3d", "");
    // Red de seguridad: si el módulo 3D ni siquiera llega a ejecutarse (CDN
    // bloqueado, sin importmap), nadie llamaría a __abFallback y el visitante
    // se quedaría sin logo. A los 4 s se monta la versión CSS igualmente.
    setTimeout(() => {
      if (!stage?.hasAttribute("data-webgl")) window.__abFallback();
    }, 4000);
  } else {
    buildCssLogo();
  }

  /* ── Inclinación del logo con el puntero (solo respaldo CSS) ── */
  const tilt = $("#tilt");
  if (tilt && !stage?.hasAttribute("data-webgl") && !lessMotion && matchMedia("(pointer: fine)").matches) {
    addEventListener("pointermove", e => {
      const y = 13 + (e.clientY / innerHeight - .5) * -16;
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
  $$(".reveal").forEach(el => io.observe(el));

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

  /* ── Nav fijo + botón flotante + paralaje del patrón ───── */
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
