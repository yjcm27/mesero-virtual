# Mesero Virtual

Sistema web de pedidos para **plazoletas de comidas**. El cliente escanea el código QR de su mesa, elige un restaurante, arma su carrito, envía el pedido y sigue su estado desde el navegador del celular, sin descargar nada ni registrarse. Cada restaurante gestiona su menú, su cocina y sus entregas desde sus propias pantallas, y el administrador consulta ventas, pedidos y configuración.

> **Estado:** aplicación integrada con **frontend, backend (API REST) y base de datos MySQL**. El pago es **simulado**; todavía no hay inicio de sesión ni pasarela de pago real.

## Módulos

| Módulo | Archivo | Quién lo usa | Qué hace |
|---|---|---|---|
| Cliente | `index.html` | Cliente en la mesa | Sesión por QR (simulado), restaurantes, menú, personalización, carrito, pago simulado, seguimiento del pedido, cancelación y alarma de pedido listo. La sesión y «Mis pedidos» sobreviven a recargar la página. |
| Gestión del menú | `gestion.html` | Restaurante | CRUD de productos: crear, listar, editar, eliminar y marcar agotado. Valida nombre, precio, ingredientes, alérgenos y foto. |
| Cocina | `cocina.html` | Cocina del restaurante | Muestra los pedidos pagados en orden de llegada (Por preparar, En preparación, Terminados), sin precios. Resalta las observaciones, que deben marcarse como leídas antes de iniciar la producción. |
| Mostrador | `mostrador.html` | Encargado de entregas | Recibe los pedidos listos y los marca como **entregados**. |
| Pantalla de pedidos listos | `listos.html` | Clientes (pantalla pública del local) | Muestra qué pedidos están listos para reclamar. Se creó para suplir la notificación que no puede enviarse en iPhone: el cliente mira la pantalla y ve si su pedido ya está listo. Se activa con una clave que se guarda en el navegador de esa pantalla. |
| Administrador | `admin.html` | Administración | **Ventas** (por día, mes y año), **Pedidos** (activos, completados y cancelados con motivo) y **Configuración** (tiempo de preparación y capacidad de cocina). |

### Ciclo de un pedido

`Enviando` → (pago confirmado) `En espera` → `En preparación` → `Listo` → `Entregado`

Estados alternos: `Pago no confirmado` y `Cancelado`. El cliente solo puede cancelar mientras el pedido está en espera; el administrador puede cancelar cualquier pedido activo escribiendo un motivo.

## Arquitectura

```
Navegador (HTML + CSS + JavaScript)  ──HTTP/JSON──▶  API REST (Node.js + Express)  ──SQL──▶  MySQL
         js/api.js                                    backend/src                          mesero_virtual
```

El backend sigue una **arquitectura por capas**; cada capa tiene una sola responsabilidad:

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Rutas | `backend/src/routes` | Define las direcciones de la API |
| Controladores | `backend/src/controllers` | Recibe la petición HTTP y arma la respuesta |
| Servicios | `backend/src/services` | Reglas de negocio y validaciones |
| Repositorios | `backend/src/repositories` | Único lugar con SQL; habla con MySQL |
| Modelos | `backend/src/models` | Estructura de los datos |
| Errores y middlewares | `backend/src/errors`, `backend/src/middlewares` | Errores propios (400, 404, 409, 422) y manejador central |

### Base de datos

Cuatro tablas, definidas en `backend/database/schema.sql`: `restaurantes`, `productos`, `pedidos` y `pedido_items`. El detalle de cada pedido guarda una copia del nombre y del precio del producto en el momento de la compra.

### Principales endpoints (`/api`)

| Método | Ruta | Uso |
|---|---|---|
| GET | `/restaurantes`, `/restaurantes/:id` | Listar y consultar restaurantes |
| PATCH | `/restaurantes/:id/config` | Cambiar tiempo de preparación y capacidad |
| GET, POST | `/productos` | Listar (por restaurante) y crear productos |
| PUT, DELETE | `/productos/:id` | Editar y eliminar un producto |
| PATCH | `/productos/:id/disponibilidad` | Marcar agotado o disponible |
| POST | `/pedidos` | Crear un pedido |
| GET | `/pedidos`, `/pedidos/:id` | Listar (por restaurante y estado) y consultar |
| PATCH | `/pedidos/:id/pago` | Confirmar o rechazar el pago (simulado) |
| PATCH | `/pedidos/:id/estado` | Avanzar el estado |
| PATCH | `/pedidos/:id/observacion-leida` | Cocina confirma que leyó las observaciones |
| PATCH | `/pedidos/:id/cancelar` | Cancelar (cliente o administrador, con motivo) |

## Estructura del proyecto

```
mesero-virtual/
├── index.html · gestion.html · cocina.html · mostrador.html · listos.html · admin.html
├── css/        styles.css, mostrador.css, admin.css
├── js/         api.js (conexión con la API), app.js, gestion.js, cocina.js,
│               mostrador.js, listos.js, admin.js
├── img/        logos
└── backend/
    ├── database/   schema.sql
    ├── docs/
    ├── src/        app.js, server.js, config, routes, controllers,
    │               services, repositories, models, middlewares, errors, utils
    ├── test/ · testing/
    ├── .env.example
    └── package.json
```

## Requisitos

- **Node.js 20.6 o superior**
- **MySQL 8** (o MariaDB) y **MySQL Workbench**
- **VS Code** con la extensión **Live Server**
- Git

## Instalación y ejecución

### 1. Clonar el repositorio

```bash
git clone https://github.com/yjcm27/mesero-virtual.git
cd mesero-virtual
```

### 2. Crear la base de datos

1. Abre MySQL Workbench y conéctate a tu servidor local.
2. Menú **File → Open SQL Script** y elige `backend/database/schema.sql`.
3. Ejecuta todo el script con el ícono del rayo. Crea la base `mesero_virtual` y sus cuatro tablas.
4. Abre y ejecuta también `backend/database/seed.sql`. Carga los datos de ejemplo: 4 restaurantes y 11 productos. Debe ejecutarse **una sola vez y después del esquema**; si lo ejecutas otra vez, MySQL responderá con un error de clave duplicada.

### 3. Configurar las variables de entorno

```bash
cd backend
copy .env.example .env      # en Linux/macOS: cp .env.example .env
```

Abre `backend/.env` y ajusta los valores a tu MySQL:

| Variable | Significado | Ejemplo |
|---|---|---|
| `PORT` | Puerto de la API | `3000` |
| `DB_HOST` | Servidor de MySQL | `localhost` |
| `DB_PORT` | Puerto de MySQL | `3306` |
| `DB_USER` | Usuario de MySQL | `root` |
| `DB_PASSWORD` | Contraseña de MySQL | *(la tuya)* |
| `DB_NAME` | Nombre de la base | `mesero_virtual` |

> El archivo `.env` contiene credenciales y **no se sube al repositorio** (está en `.gitignore`).

### 4. Instalar dependencias y arrancar el backend

```bash
npm install
npm start          # o "npm run dev" para reiniciar solo al guardar cambios
```

La API queda en `http://localhost:3000/api`. Para comprobarla, abre `http://localhost:3000/api/restaurantes`: debe responder una lista de restaurantes.

### 5. Abrir el frontend

En VS Code, abre la carpeta raíz del proyecto, haz clic derecho sobre `index.html` y elige **Open with Live Server**. Queda en `http://127.0.0.1:5500/index.html`. Las demás pantallas se abren igual (`cocina.html`, `gestion.html`, `mostrador.html`, `listos.html`, `admin.html`).

> El backend debe estar encendido; si no, el frontend muestra «No se pudo conectar con el servidor».

### Probar el ciclo completo

1. En `index.html` escanea el QR simulado, elige un restaurante y envía un pedido con una observación.
2. Pulsa **Demo: llega el comprobante** para simular el pago.
3. En `cocina.html` (mismo restaurante) marca la observación como leída, inicia la producción y marca el pedido como listo. En el cliente suena la alarma.
4. En `mostrador.html` marca el pedido como entregado.
5. En `admin.html` revisa el pedido en **Pedidos → Completados** y la venta en **Ventas**.

## Pruebas

```bash
cd backend
npm test
```

Las pruebas de integración de la entrega (frontend, API y base de datos) se documentan en el PDF de evidencia.

## Notas y limitaciones

- El **pago es simulado**: los botones «Demo» reemplazan la confirmación de un comprobante real.
- El navegador guarda en LocalStorage únicamente la **sesión del cliente** (`mv_sesion`) y la clave de activación de la pantalla de pedidos listos. Los pedidos, el menú y los datos del restaurante viven en MySQL.
- **GitHub Pages ya no sirve** para este proyecto, porque el frontend necesita el backend local.
- Pendientes: inicio de sesión de restaurantes, pagos reales, notificaciones en Android y asignación de número de sesión desde el servidor.

## Tecnologías

HTML, CSS y JavaScript puro en el frontend; Node.js, Express y `mysql2` en el backend; MySQL como base de datos. Tipografía Bricolage Grotesque (Google Fonts).

## Equipo

| Integrante | Rol | GitHub |
|---|---|---|
| Youler | Desarrollo del proyecto | [@yjcm27](https://github.com/yjcm27) |
| Nixon | Desarrollo del proyecto | [@nicwilmer-wq](https://github.com/nicwilmer-wq) |

## Cómo colaborar

1. Crea una rama desde `main` (`git checkout -b feature/nombre`).
2. Haz commits pequeños con mensajes descriptivos (`feat:`, `fix:`, `docs:`, `chore:`).
3. Sube la rama y abre un pull request hacia `main`.
4. Nunca subas el archivo `.env`.