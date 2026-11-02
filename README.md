# Alexis Barber

Landing page de **Alexis Barber** — barbería a domicilio en Barcelona.
Web estática (HTML + CSS + JS, sin build) desplegada en Cloudflare Pages.

---

## ⚠️ Las páginas se generan: no las edites a mano

`index.html`, `ca/index.html`, `en/index.html`, `fr/index.html` y
`de/index.html` son **archivos generados**. Si los editas directamente, el
cambio se pierde en la siguiente generación.

Lo que se edita está en `content/`:

| Archivo | Qué contiene |
|---|---|
| `content/config.json` | WhatsApp, Instagram, dominio, idiomas, precios y duraciones, zonas |
| `content/es.json` … `de.json` | Todos los textos de cada idioma |

Después de tocar cualquiera de ellos:

```bash
python3 build.py
```

Escribe las cinco páginas y el `sitemap.xml`, y avisa si algún marcador de la
plantilla se queda sin sustituir. No necesita dependencias. Cloudflare Pages
**no** lo ejecuta: sirve los archivos ya generados, por eso hay que commitear
el resultado junto con el cambio.

La plantilla es `src/index.template.html`, con marcadores `{{clave}}`.

## Idiomas

Castellano (en `/`), català (`/ca/`), english (`/en/`), français (`/fr/`) y
deutsch (`/de/`). Cada página es real y distinta: su propio `<title>`,
descripción, datos estructurados y mensaje de WhatsApp ya escrito en ese
idioma. Todas se enlazan entre sí con `hreflang`, así que Google puede
posicionar la inglesa para quien busque en inglés — que es justo el público
al que apunta el que Alexis hable cinco idiomas.

Para añadir un idioma: una entrada en `idiomas` dentro de `config.json`, un
`content/<code>.json` nuevo, y `python3 build.py`.

## Precios y zonas

Viven en `config.json` (números y nombres de barrio, iguales en todos los
idiomas); los nombres y descripciones de cada servicio están en los archivos
de idioma, enlazados por `id`. Hay que mantener los dos lados en sintonía: si
añades un servicio en `config.json`, añade su `id` en los cinco idiomas o
`build.py` fallará.

Pendiente: **el usuario de Instagram**. Mientras `instagram` esté vacío en
`config.json`, el enlace del footer no se genera.

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
index.html                  Página en castellano (generada)
build.py                    Genera las 5 páginas desde content/
src/index.template.html     Plantilla con marcadores {{clave}}
content/                    Lo editable: config.json + un json por idioma
ca/ en/ fr/ de/             Páginas generadas (no editar a mano)
assets/css/style.css        Estilos
assets/js/main.js           Interacción (ya no contiene contenido)
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

Un metal es un espejo: su aspecto **es** lo que refleja. Por eso el entorno es
un estudio de focos claros sobre fondo oscuro, pintado en un `<canvas>` de
1024×512 — sin él, con un degradado plano, la pieza parece plástico mate.

**Los focos van difuminados en los dos ejes** (el helper `foco` usa degradado
radial): con cantos duros, una superficie casi especular los refleja como
bandas nítidas.

**Nada de ruido sobre el mapa.** Se probó, para evitar bandeado del degradado,
y con la cara casi a espejo el reflejo lo reproduce píxel a píxel: se ve como
grano sobre el logo. El bandeado que ese ruido pretendía arreglar no existía;
era el chaflán.

**La cara y el canto llevan rugosidad distinta a propósito**: la cara en 0,055
(casi espejo, es la que lee como cromo) y el canto en 0,60. El canto necesita
bastante más difusión porque las facetas del contorno poligonal giran hasta
20° entre sí y, con un entorno contrastado, se marcan. Bajarlo lo raya.

Se evaluó atacar la causa limitando el giro por faceta al generar el contorno,
pero bajar de 20° a 6,5° exigía pasar de 4.100 a 12.600 puntos: triplicar la
geometría por una mejora que solo se aprecia en un fotograma de la vuelta.

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
