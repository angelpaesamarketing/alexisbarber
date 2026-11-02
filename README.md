# Alexis Barber

Landing page de **Alexis Barber** — barbería a domicilio en Barcelona.
Web estática (HTML + CSS + JS, sin build) desplegada en Cloudflare Pages.

---

## ⚠️ Pendiente antes de publicar en el dominio

Todo lo editable está en un solo sitio: el bloque `CONFIG` al principio de
[`assets/js/main.js`](assets/js/main.js).

| Campo | Estado | Qué poner |
|---|---|---|
| `whatsapp` | ❌ **provisional** (`34600000000`) | Móvil con prefijo, sin `+` ni espacios. Ej: `34612345678` |
| `instagram` | ❌ **vacío** | Usuario sin la `@`. Si se deja vacío, el enlace del footer desaparece solo |
| `servicios` | ⚠️ precios de ejemplo | Revisar nombres, precios y duraciones |
| `zonas` | ⚠️ revisar | Barrios de Barcelona que cubre |
| `horario` | ⚠️ revisar | Texto libre que sale bajo el botón final |

Mientras `whatsapp` siga siendo el número provisional, la consola del navegador
muestra un aviso.

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
leer el resto.

### Tres avisos para quien lo toque

- **El chaflán no puede crecer mucho.** Por encima de `bisel: .012` el chaflán
  se auto-interseca en las zonas cóncavas y deforma las letras.

- **El canto se ve liso por tres cosas combinadas**, y quitar cualquiera de
  ellas devuelve el rayado:
  1. `cantoBrillo` está en **0,38**. Es la que más pesa: difumina el reflejo
     del canto lo justo para que las facetas de la pared dejen de delatarse.
     Bajarlo a 0,16 devuelve las rayas aunque todo lo demás siga igual.
  2. El mapa de entorno se pinta a **192×96 px** a propósito, dibujando en
     coordenadas de 1024×512 y escalando el contexto. A resolución alta, los
     cantos duros de los focos se reflejan en la pared como bandas nítidas.
  3. `alisado` (40°) suaviza las normales de la pared manteniendo el chaflán,
     y `toCreasedNormals` se aplica **antes** de escalar la pieza a 1 unidad:
     agrupa vértices con precisión fija de ~0,01, que a escala final sería el
     1 % del logo y mezclaría cara con chaflán. `bevelSegments` vale **1** por
     lo mismo: con un solo tramo el chaflán queda a 45°, por encima del
     umbral; partido en dos, el primer tramo cae a ~22° y las caras se vetean.

- **La densidad de `logo-shape.json` importa.** El contorno se muestreó cada
  2,6 px (unos 2.750 puntos). Con muestreos más gruesos, las curvas cerradas
  generan facetas de ángulo grande que quedan fuera del alisado.

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
