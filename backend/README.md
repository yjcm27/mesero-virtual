# Mesero Virtual — Backend (API REST)

API del sistema de pedidos para plazoletas de comidas **Mesero Virtual**. Implementa los módulos de **Productos** (menú del restaurante) y **Pedidos** (ciclo del pedido que usa Cocina), con arquitectura en capas, programación orientada a objetos y persistencia en MySQL.

## Tecnologías
- **Node.js 20.6 o superior** (JavaScript con módulos ES y clases)
- **Express 4**: framework web para las rutas y el servidor HTTP
- **MySQL / MariaDB** con el conector **mysql2**
- **node:test**: pruebas automáticas (viene con Node, sin librerías extra)
- **Git y GitHub**: control de versiones

## Arquitectura en capas

```
Cliente (frontend)
      │  petición HTTP (JSON)
      ▼
  Rutas  ──►  Controladores  ──►  Servicios  ──►  Repositorios  ──►  MySQL
 (routes)     (controllers)     (services)      (repositories)
                                     │
                                  Modelos (models): Producto, Pedido, ItemPedido
```

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Rutas | `src/routes` | Asocian cada URL y método HTTP con un método del controlador |
| Controladores | `src/controllers` | Reciben la petición, llaman al servicio y arman la respuesta HTTP |
| Servicios | `src/services` | Reglas de negocio que necesitan consultar datos (nombre repetido, producto agotado, total del pedido) |
| Repositorios | `src/repositories` | Acceso a datos: todo el SQL vive aquí, con consultas preparadas |
| Modelos | `src/models` | Clases con sus propias reglas y comportamiento (`Producto`, `Pedido`) |
| Errores y utilidades | `src/errors`, `src/utils`, `src/middlewares` | Errores propios, validaciones comunes y respuesta uniforme de errores |

Cada capa solo conoce a la siguiente. Los controladores no escriben SQL y los repositorios no tienen reglas de negocio.

## Programación orientada a objetos aplicada
- **Clases y encapsulamiento:** `Producto` valida sus propios datos (`validar()`); `Pedido` controla su ciclo de vida con métodos como `confirmarPago()`, `iniciarProduccion()` o `cancelar()`, y rechaza cambios de estado ilegales.
- **Herencia:** `ValidationError`, `NotFoundError`, `ConflictError` y `BusinessRuleError` heredan de `AppError`.
- **Inyección de dependencias:** cada servicio recibe sus repositorios por el constructor, y los repositorios reciben el pool de conexiones. Por eso se pueden probar sin MySQL (`testing/poolSqlite.js`).
- **Responsabilidad única:** cada clase hace una sola cosa.
- **Composición:** `Pedido` contiene objetos `ItemPedido`.

## Estructura del proyecto
```
backend/
├── package.json
├── .env.example
├── database/
│   ├── schema.sql          Tablas de MySQL
│   └── seed.sql            4 restaurantes y 11 productos de ejemplo
├── src/
│   ├── server.js           Arranque: conecta a MySQL y une las capas
│   ├── app.js              Aplicación Express
│   ├── config/db.js        Pool de conexiones
│   ├── routes/  controllers/  services/  repositories/  models/
│   ├── errors/  middlewares/  utils/
├── test/                   Pruebas automáticas (45)
├── testing/poolSqlite.js   Base de pruebas que imita a mysql2
└── docs/                   Pruebas de la API, guía de Git y plantilla del PDF
```

## Instalación y ejecución
1. Instala **Node.js 20.6 o superior** y **MySQL** (o XAMPP, que trae MySQL/MariaDB). Enciende el servicio de MySQL.
2. Crea la base de datos y los datos de ejemplo. Desde la carpeta `backend`:
   ```
   mysql -u root -p < database/schema.sql
   mysql -u root -p < database/seed.sql
   ```
   (o abre ambos archivos en phpMyAdmin o MySQL Workbench y ejecútalos en ese orden).
3. Copia `.env.example` como `.env` y escribe tu usuario y contraseña de MySQL.
4. Instala las dependencias y arranca:
   ```
   npm install
   npm start
   ```
5. Abre http://localhost:3000/api/salud. Debe responder `{"estado":"ok", ...}`.

Para desarrollo, `npm run dev` reinicia el servidor al guardar cambios.

## Endpoints

### Restaurantes
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/restaurantes` | Lista los restaurantes |
| GET | `/api/restaurantes/:id` | Detalle de un restaurante |

### Productos (CRUD)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/productos?restauranteId=&categoria=&q=` | Lista con filtros opcionales |
| GET | `/api/productos/:id` | Detalle |
| POST | `/api/productos` | Crear |
| PUT | `/api/productos/:id` | Actualizar |
| PATCH | `/api/productos/:id/disponibilidad` | Marcar agotado o disponible |
| DELETE | `/api/productos/:id` | Eliminar |

### Pedidos
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/pedidos` | Crear pedido (estado «Enviando»); el total lo calcula el servidor |
| GET | `/api/pedidos?restauranteId=&estado=&sesion=&vista=cocina` | Lista; `vista=cocina` solo muestra pedidos pagados, en orden de llegada |
| GET | `/api/pedidos/:id` | Detalle con sus productos |
| PATCH | `/api/pedidos/:id/pago` | `{ "confirmado": true/false }` (pago simulado) |
| PATCH | `/api/pedidos/:id/observacion-leida` | Cocina marca la observación como leída |
| PATCH | `/api/pedidos/:id/estado` | `{ "estado": "En preparación" \| "Listo" \| "Entregado" }` |
| PATCH | `/api/pedidos/:id/cancelar` | `{ "origen": "cliente" \| "administrador", "motivo": "..." }` |

Los ejemplos de peticiones están en `docs/pruebas-api.http`.

## Reglas de negocio implementadas
**Productos:** nombre de 3 a 60 caracteres y único por restaurante; precio entero entre 1 y 500000; descripción de 10 a 140 caracteres; al menos un ingrediente (dos si el cliente puede quitarlos); **alérgenos obligatorios** (lista o `sinAlergenos: true`) con declaración de responsabilidad; bloqueo de `<` y `>`.

**Pedidos:** cantidad de 1 a 10 por producto; no se piden productos agotados; el modo de personalización del producto se respeta (quitar ingredientes, solo observaciones o nada); el total se calcula en el servidor; numeración consecutiva por sesión y restaurante (`1042-R3-01`); el pedido se guarda con una **transacción** (todo o nada); Cocina no puede iniciar un pedido con observaciones sin marcarlas como leídas; el cliente solo cancela en «En espera» y el administrador cancela con motivo.

**Ciclo:** Enviando → En espera → En preparación → Listo → Entregado (más «Pago no confirmado» y «Cancelado»).

## Pruebas automáticas
```
npm test
```
Ejecuta 45 pruebas sobre modelos, repositorios (con su SQL real), servicios y controladores. Usan una base de datos en memoria, así que no necesitan MySQL.

## Buenas prácticas aplicadas
- Consultas SQL preparadas (evitan la inyección SQL) y contraseñas de conexión fuera del código (`.env`, ignorado por Git).
- Validación de todos los datos de entrada y respuestas de error uniformes con su código HTTP.
- El servidor nunca confía en los precios que envía el cliente.
- Nombres claros, comentarios, una responsabilidad por clase y pruebas automáticas.
- Commits pequeños con mensajes descriptivos (ver `docs/GUIA_GIT.md`).

## Pendiente
Autenticación y roles (hoy el origen de una cancelación se envía en el cuerpo de la petición), conexión del frontend a esta API, pagos reales y notificaciones.
