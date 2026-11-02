# Alexis Barber

Landing page de **Alexis Barber** — barbería a domicilio en Barcelona.
Web estática (HTML + CSS + JS, sin build) desplegada en Cloudflare Pages.

---

## Contenido editable

Todo lo editable está en un solo sitio: el bloque `CONFIG` al principio de
[`assets/js/main.js`](assets/js/main.js).

| Campo | Estado | Qué poner |
|---|---|---|
| `whatsapp` | ✅ `34659412558` | — |
| `instagram` | ❌ **vacío** | Usuario sin la `@`. Vacío oculta el enlace del footer |
| `idiomas` | ✅ 5 idiomas | Se pintan solos en el hero y en las ventajas |
| `servicios` | ⚠️ precios por confirmar | Revisar precios y duraciones |
| `zonas` | ⚠️ revisar | Barrios de Barcelona que cubre |
| `horario` | ⚠️ revisar | Texto libre que sale bajo el botón final |

Alexis atiende en castellano, catalán, inglés, francés y alemán; los idiomas
salen del array `CONFIG.idiomas` y se pintan solos en el hero y en la sección
de ventajas.

## Desplegar en Cloudflare Pages

**Workers & Pages → Create → Pages → Connect to Git →** repo `alexisbarber`.

| Ajuste | Valor |
|---|---|
| Framework preset | `None` |
| Build command | *(vacío)* |
| Build output directory | `/` |
| Production branch | `main` |

Luego **Custom domains → Set up a custom domain →** `alexisbarber.com` y
`www.alexisbarber.com`. Al estar el dominio en la misma cuenta de Cloudflare,
los registros DNS y el SSL se crean solos.

## Estructura

```
index.html                  Página completa (una sola)
assets/css/style.css        Estilos
assets/js/main.js           CONFIG + animaciones de la página
assets/js/logo3d.js         Logo 3D con Three.js (bloque LOOK para ajustarlo)
assets/img/
  logo-3d.webp               Logo cromado, cara frontal del giro
  logo-3d-slab.webp          Silueta sólida, capas de extrusión 3D
  logo-3d-side.webp          Vista 3/4 (sin uso, de reserva)
  logo-mark.webp             Isotipo plano rosa
  logo-lockup.webp           Logo + "ALEXIS BARBER" (footer)
  pattern.webp              Patrón de herramientas de barbería
  og.jpg                    Imagen al compartir (1200×630)
  icon-*.png                Favicon e iconos de app
```

## Cómo funciona el logo giratorio

Es 3D de verdad, no fotogramas ni capas simuladas. `assets/js/logo3d.js` carga
`assets/img/logo-shape.json` —la silueta del **logo original vectorizada**, dos
contornos sólidos y un hueco— y la extruye con Three.js (`ExtrudeGeometry` con
chaflán) para obtener una pieza con grosor y borde biselado. La recubre un
material metálico con reflejos de un entorno generado en un `<canvas>`, así que
no hace falta ningún archivo de imagen para el cromado.

Gira 360° con *easing*: se demora mirando de frente y cruza deprisa los dos
instantes en que queda de canto, donde la marca no se lee. La curva es
`θ = φ − k·sin(2φ)`, que sigue avanzando 2π por vuelta.

Todo el aspecto se ajusta desde el bloque `LOOK` al principio del archivo
(grosor, chaflán, rugosidad, reflejos, duración de la vuelta). No hace falta
leer el resto — pero lee el aviso de abajo antes de tocar `bisel`.

### Por qué el canto se ve liso (y qué lo rompe)

Costó encontrarlo porque parecía un problema de sombreado y era geométrico.
Tres cosas lo sostienen; quitar cualquiera devuelve el escalonado:

- **`bisel` está en 0,0018 y no puede subir.** Es la causa real. El chaflán
  desplaza el contorno hacia dentro, y las curvas de estas letras tienen un
  radio muy pequeño: en cuanto el desplazamiento supera ese radio, el borde se
  cruza consigo mismo y el canto sale a escalones. A 0,004 ya se nota, y a
  0,010 es evidente en los huecos de las letras.

- **El contorno se aplana por curvatura, no por longitud.** `logo-shape.json`
  se genera subdividiendo cada bézier hasta que se separa menos de 0,08
  unidades de su cuerda (4.109 puntos). Muestrear cada N píxeles deja
  escalones angulares grandes justo en las curvas cerradas.

- **`alisado` (40°) suavizando las normales**, aplicado **antes** de escalar
  la pieza a 1 unidad: `toCreasedNormals` agrupa vértices con una precisión
  fija de ~0,01, que a escala final sería el 1 % del logo y mezclaría las
  normales de la cara con las del chaflán, veteándolas. `bevelSegments` vale
  **1** por lo mismo: con un tramo el chaflán queda a 45°, por encima del
  umbral; partido en dos, el primero cae a ~22° y se mezcla con la cara.

Descartados por el camino, por si vuelve a aparecer: no eran las normales
(medido: a 40° solo el 5,9 % de los triángulos del lateral quedan planos), ni
la resolución del mapa de entorno, ni su contraste, ni triángulos degenerados.

### El entorno de reflejos

Es un degradado vertical liso con ruido fino, dibujado en un `<canvas>` de
512×256. Nada más, y a propósito: se probaron focos pintados y el
`RoomEnvironment` de Three.js, y los dos tienen cantos duros que una superficie
casi especular refleja como bandas. El ruido evita que el degradado se cuantice
al difuminarse para la rugosidad del canto.

### Respaldo sin WebGL

Si el navegador no tiene WebGL, el usuario ha pedido menos movimiento, o el CDN
de Three.js está bloqueado, se monta una versión en CSS: 28 copias de
`logo-3d-slab.webp` apiladas en el eje Z con el render cromado en las dos caras.
`main.js` la monta pasados 4 s si para entonces el módulo 3D no ha arrancado —
sin ese plazo, un CDN bloqueado dejaría la página sin logo.

Esa versión CSS tiene dos trampas aprendidas a base de depurar, por si se toca:
en Chromium, cualquier capa con `filter` o `backface-visibility` dentro del
bloque 3D se promociona a capa propia, sale de la ordenación por profundidad y
el navegador pinta por orden del DOM, de modo que las láminas tapan el cromo.
Por eso los tonos del canto van horneados en `logo-slab-d/m/l.webp` en vez de
aplicarse con `filter`, y no hay ni un `backface-visibility` ahí dentro.

## Colores

| | |
|---|---|
| Rosa de marca | `#FFD4D3` |
| Negro de fondo | `#000000` |
