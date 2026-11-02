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
assets/js/main.js           CONFIG + animaciones
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

No son fotogramas. `main.js` apila 26 copias de `logo-3d-slab.webp` separadas en
el eje Z para generar el grosor de la pieza, y pone `logo-3d.webp` (la versión
cromada) en las dos caras. El conjunto gira con `rotateY` 360° dentro de un
contenedor con `transform-style: preserve-3d`, y un barrido de luz enmascarado
con la silueta hace el brillo metálico.

En móvil baja a 14 capas, la animación se pausa al salir de pantalla y con
`prefers-reduced-motion` el logo se queda quieto en una pose fija.

## Colores

| | |
|---|---|
| Rosa de marca | `#FFD4D3` |
| Negro de fondo | `#000000` |
