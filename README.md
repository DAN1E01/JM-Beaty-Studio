# M Beauty Studio 💄
Sitio web de reservas de servicios de belleza — 100% dinámico desde Google Sheets, con carrito de servicios, seña por QR y notificación a WhatsApp. Desplegado en GitHub Pages (sin base de datos tradicional).

## 🗂️ Estructura del Proyecto

```
m-beauty-studio/
│
├── index.html                  # Página principal (servicios destacados dinámicos)
├── README.md                   # Este archivo
├── .nojekyll                   # Necesario para GitHub Pages
│
├── pages/
│   ├── servicios.html          # Catálogo + carrito + calendario + QR de seña
│   ├── cursos.html             # Cursos (consulta directa, sin carrito)
│   └── contacto.html           # Formulario + WhatsApp directo
│
├── css/
│   └── styles.css              # Paleta de colores + estilos globales
│
├── js/
│   ├── config.js               # Config base + datos de RESPALDO (fallback)
│   ├── data.js                 # 🔑 Capa que conecta con Google Sheets
│   ├── carrito.js              # Lógica del carrito de servicios
│   ├── calendario.js           # Calendario interactivo de reservas
│   ├── reservas.js             # Envío de reservas a Sheets + validaciones
│   └── qr.js                   # QR de seña (transferencia) + WhatsApp
│
├── apps-script/
│   └── Code.gs                 # 🧠 Backend completo (pegar en Google Apps Script)
│
└── images/                     # Fotos de servicios y cursos
```

---

## 🧠 Cómo funciona (arquitectura sin base de datos)

```
┌─────────────────────┐         ┌──────────────────────┐
│   GitHub Pages       │         │   Google Apps Script  │
│   (sitio estático)   │ fetch() │   (backend gratuito)  │
│                       │ ───────▶│                        │
│  HTML + CSS + JS      │         │  doGet() / doPost()    │
└─────────────────────┘         └──────────┬─────────────┘
                                             │
                          ┌──────────────────┼──────────────────┐
                          ▼                  ▼                  
                  ┌───────────────┐  ┌───────────────────┐
                  │ Google Sheets  │  │  Google Calendar   │
                  │  (servicios,   │  │  (evento por cada   │
                  │   reservas,    │  │   reserva nueva)     │
                  │   config)      │  │                      │
                  └───────────────┘  └───────────────────┘
```

**Nada se hardcodea.** El dueño edita la hoja de Sheets y el sitio se actualiza solo, sin tocar código ni GitHub.

---

## 📋 Estructura de Google Sheets (3 hojas)

### Hoja "Servicios"
| id | nombre | descripcion | precio | duracion | categoria | destacado | disponible | imagen |
|---|---|---|---|---|---|---|---|---|
| srv-001 | Corte de Cabello | Corte personalizado... | 80 | 60 | cabello | TRUE | TRUE | corte.jpg |

- **destacado = TRUE** → aparece con ⭐ en la home y se prioriza en el preview
- **disponible = FALSE** → deja de mostrarse en el sitio (sin borrar la fila)
- **categoria** → se usa para avisar al cliente si combina servicios de distinto tipo en el carrito

### Hoja "Reservas" (se llena sola, no tocar)
| N°Reserva | Nombre | Teléfono | Servicios | Duración Total | Precio Total | Monto Seña | Fecha | Hora Inicio | Hora Fin | Estado | Estado Pago | Timestamp |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

- **Servicios** puede tener varios, separados por coma (carrito)
- **Estado** → el dueño cambia manualmente: Pendiente / Confirmado / Cancelado
- **Estado Pago** → Pendiente verificación / Verificado / No requiere

### Hoja "Config"
| clave | valor |
|---|---|
| negocio_nombre | M Beauty Studio |
| negocio_telefono | +59177777777 |
| negocio_whatsapp | 59177777777 |
| negocio_email | contacto@mbeautystudio.com |
| negocio_direccion | La Paz, Bolivia |
| negocio_instagram | https://instagram.com/... |
| negocio_facebook | https://facebook.com/... |
| qr_banco | Banco Unión |
| qr_titular | María González |
| qr_cuenta | 1234567890 |
| qr_porcentaje_sena | 30 |
| horario_apertura | 9 |
| horario_cierre | 19 |
| horario_dias | 1,2,3,4,5,6 |

Todo lo de esta hoja se puede cambiar **sin tocar código, sin GitHub, desde el celular.**

---

## 🛒 Cómo funciona el Carrito

1. El cliente navega `/servicios` y agrega varios servicios con el botón "+ Agregar"
2. Un badge en la navbar muestra cuántos servicios lleva
3. Al abrir el carrito ve: lista de servicios, duración total, precio total
4. Si combina **categorías distintas** (ej: cabello + manos), se le avisa que se reservará un bloque continuo de tiempo
5. Al continuar, el calendario bloquea un turno con la **suma de todas las duraciones**
6. Se calcula automáticamente el monto de seña según el % configurado en Sheets

El carrito vive en `sessionStorage` — sobrevive recargas de página pero se vacía al cerrar la pestaña.

---

## 💳 Cómo funciona la Seña (QR de transferencia)

**Importante: no es pago automático real.** Es un QR informativo con los datos bancarios:

```
1. Cliente confirma reserva
2. Se calcula: precio total × % de seña (configurado en Sheets) = monto a transferir
3. Se genera un QR con los datos de transferencia (banco, titular, cuenta, monto, referencia)
4. Cliente transfiere manualmente y manda captura por WhatsApp
5. Reserva queda en Sheets con "Estado Pago: Pendiente verificación"
6. El dueño confirma manualmente al recibir la transferencia
```

Si `qr_porcentaje_sena` está en `0` en la hoja Config, no se pide seña y el QR no aparece.

---

## 📅 Google Calendar — Evento automático

Cada reserva nueva crea un evento en el Google Calendar del dueño:

```
Título:    💅 Corte + Manicure — María López
Horario:   Martes 24 Jun, 10:00 a 11:45
Descripción:
  📞 591-77777777
  💰 Precio total: Bs. 140
  💳 Seña: Bs. 42 (verificar comprobante)
  🔖 N° Reserva: MB-240624-847
```

---

## 🚀 Instalación paso a paso

### 1. Google Sheets + Apps Script

1. Crear un Google Sheets nuevo
2. Crear las 3 hojas: `Servicios`, `Reservas`, `Config` (ver estructura arriba)
3. Llenar `Servicios` y `Config` con los datos reales del negocio
4. Ir a **Extensiones → Apps Script**
5. Pegar el contenido completo de `apps-script/Code.gs`
6. Guardar → **Implementar → Nueva implementación**
   - Tipo: Aplicación web
   - Ejecutar como: Yo
   - Acceso: Cualquier usuario
7. Copiar la URL que termina en `/exec`

### 2. Configurar el sitio

1. Abrir `js/config.js`
2. Pegar la URL en `CONFIG.googleSheets.scriptUrl`
3. Cambiar `CONFIG.googleSheets.activo` a `true`

### 3. Subir a GitHub Pages

1. Crear repositorio en GitHub
2. Subir todos los archivos del proyecto
3. **Settings → Pages → Source: main branch → / (root)**
4. El sitio queda en `https://tuusuario.github.io/m-beauty-studio`

---

## 🛟 Plan B si Google Sheets falla

Si la conexión con Sheets falla (sin internet del lado de Google, error temporal, etc.), el sitio:
- Muestra el catálogo de respaldo definido en `CONFIG.serviciosFallback` (dentro de `config.js`)
- Sigue funcionando para mostrar servicios, aunque no reflejen el inventario más actualizado
- La reserva queda guardada en `localStorage` del navegador como respaldo adicional

Esto evita una pantalla en blanco o un sitio roto si Google tiene una caída puntual.

---

## 🎨 Paleta de Colores

| Rol | Color | Hex |
|---|---|---|
| Primario | Beige cálido | `#D8C1AE` |
| Secundario | Champagne | `#EADFD5` |
| Botones | Marrón elegante | `#7A5736` |
| Hover botones | Marrón oscuro | `#5E432A` |
| Texto principal | Negro suave | `#1F1F1F` |
| Texto secundario | Gris cálido | `#6B625A` |
| Fondo | Marfil | `#F8F5F2` |
| Acento premium | Dorado suave | `#C8A978` |

---

## 📌 Pendientes / Próximos Pasos

- [ ] Llenar la hoja "Servicios" con el catálogo real
- [ ] Llenar la hoja "Config" con datos reales del negocio y banco
- [ ] Pegar y deployar `apps-script/Code.gs`
- [ ] Pegar la URL del script en `config.js` y activar `googleSheets.activo`
- [ ] Agregar fotos reales en `/images`
- [ ] Subir a GitHub y activar Pages
- [ ] Probar el flujo completo: agregar al carrito → reservar → ver QR → WhatsApp
- [ ] Verificar que el evento aparece correctamente en Google Calendar
