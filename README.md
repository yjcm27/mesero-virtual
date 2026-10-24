# Mesero Virtual

Sistema web de pedidos para **plazoletas de comidas**. El cliente escanea el código QR de su mesa, elige un restaurante, arma su carrito, envía el pedido y sigue su estado, todo desde el navegador del celular, sin descargar nada ni registrarse. Los restaurantes administran su menú desde un panel web.

**Prototipo en línea:** https://yjcm27.github.io/mesero-virtual/
**Gestión del menú:** https://yjcm27.github.io/mesero-virtual/gestion.html
**Cocina:** https://yjcm27.github.io/mesero-virtual/cocina.html

> Estado: prototipo funcional de frontend. Los datos se guardan en **LocalStorage** del navegador; todavía no hay servidor ni base de datos.

## Qué incluye hoy

### Interfaz del cliente (`index.html`)
- Sesión simulada por escaneo de QR de la mesa, con número de sesión.
- Lista de restaurantes con su categoría, calificación y tiempo estimado.
- Menú por restaurante con filtro por categoría, fotos de los platillos y alérgenos visibles.
- Personalización por producto según la decisión del restaurante: quitar ingredientes, solo observaciones o sin personalización.
- Confirmación obligatoria de alérgenos antes de agregar un producto.
- Carrito independiente por restaurante, con pago simulado.
- Seguimiento del pedido con estados (Enviando, En espera, En preparación, Listo, Entregado), tiempo estimado, cronómetro y cancelación mientras está en espera.
- Alarma de pedido listo, con aviso para iPhone cuando no se pueden enviar notificaciones.
- Cierre de sesión y aviso por inactividad.
- Modo claro y oscuro automático, con el logo en dos versiones.

### Gestión del menú del restaurante (`gestion.html`)
CRUD completo con formulario y persistencia en LocalStorage:
- **Crear** productos: nombre, foto, emoji, categoría, precio, descripción, ingredientes, alérgenos, modo de personalización y estado agotado.
- **Leer**: lista con contador, búsqueda y miniaturas.
- **Actualizar**: edición de cualquier dato, incluida la foto.
- **Eliminar**: con confirmación.
- Marcar un producto como agotado o disponible.
- Los cambios se reflejan al instante en el menú del cliente.

### Interfaz de Cocina (`cocina.html`)
- Muestra solo los pedidos **ya pagados** del restaurante elegido, en orden de llegada, en tres listas: Por preparar, En preparación y Terminados.
- Cada pedido indica número, mesa, sesión, productos, cantidades y cronómetro de espera. No muestra precios.
- Las **observaciones del cliente** salen resaltadas y los ingredientes quitados aparecen como «SIN cebolla».
- Si el pedido tiene observaciones, Cocina debe marcar **«Observación leída»** antes de poder pulsar «Iniciar producción».
- «Marcar como listo» pasa el pedido a Terminados y dispara la alarma en la pantalla del cliente.
- Avisa con mensaje y sonido cuando llega un pedido nuevo o el cliente cancela.
- Se actualiza sola: cliente y Cocina comparten los pedidos por LocalStorage.

**Cómo probar el ciclo completo:** abre `index.html` y `cocina.html` en dos pestañas del mismo navegador. En el cliente, haz un pedido con una observación y pulsa «Demo: llega el comprobante». Cocina lo recibe, lo lees, lo inicias y lo marcas como listo; en el cliente suena la alarma.

### Validaciones y reglas de negocio
- Nombre de 3 a 60 caracteres, sin repetirse dentro del mismo restaurante.
- Precio entero mayor que 0 y hasta $500.000.
- Al menos un ingrediente (dos si el cliente puede quitarlos).
- Alérgenos obligatorios: se marcan los que apliquen o «Sin alérgenos», con declaración de responsabilidad del restaurante.
- Fotos JPG, PNG o WebP de hasta 8 MB, reducidas automáticamente a 480 px.
- Se bloquean los símbolos `<` y `>` en los textos.
- Máximo 10 unidades por producto y 140 caracteres en las observaciones.
- Protección contra doble envío del pedido y contra pedidos con la sesión cerrada.
- El cliente solo puede cancelar mientras el pedido está «En espera»; si Cocina ya inició la producción, se bloquea.
- Cocina no puede iniciar un pedido con observaciones sin marcarlas como leídas.

## Estructura del proyecto

```
mesero-virtual/
├── index.html        Interfaz del cliente
├── gestion.html      Gestión del menú del restaurante
├── cocina.html       Interfaz de Cocina
├── css/
│   └── styles.css    Estilos (modo claro y oscuro)
├── js/
│   ├── datos.js      Datos de ejemplo (4 restaurantes, 11 productos)
│   ├── almacen.js    Lectura y escritura en LocalStorage (menú y pedidos)
│   ├── app.js        Lógica de la interfaz del cliente
│   ├── gestion.js    Lógica del CRUD de productos
│   └── cocina.js     Lógica de la interfaz de Cocina
└── img/
    ├── logo-claro.png
    └── logo-oscuro.png
```

## Cómo funciona el almacenamiento

El menú se guarda en LocalStorage con la clave `mv_menu`, los pedidos con `mv_pedidos` y los contadores de sesión y pedido con `mv_contadores`. Si no hay nada guardado, la aplicación parte de los datos de ejemplo de `datos.js`. El botón «Restaurar datos de ejemplo» en la gestión borra los cambios.

Puedes ver los datos en el navegador con **F12 → Application → Local Storage**.

Limitaciones:
- Cada navegador y cada dispositivo tiene sus propios datos: lo que se crea en un equipo no aparece en otro.
- LocalStorage ofrece unos 5 MB por sitio. Por eso las fotos se comprimen antes de guardarse.
- No es un almacenamiento seguro, por lo que no se guardan contraseñas ni datos sensibles.

## Cómo ejecutarlo

**En línea:** abre el enlace del prototipo en cualquier navegador de Android, iPhone o computador.

**En tu computador:** descarga el proyecto y abre `index.html` con doble clic. Para comprobar que los datos persisten entre las dos páginas, es más fiable abrirlo con un servidor local:

```
python3 -m http.server 8000
```

y entrar a `http://localhost:8000`.

## Publicar en GitHub Pages

1. Sube todo el contenido del proyecto a un repositorio público, conservando las carpetas `css/`, `js/` e `img/`.
2. En **Settings → Pages**, elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. Espera uno o dos minutos y abre el enlace que aparece.

Para actualizar, vuelve a subir los archivos modificados.

## Próximos pasos

- [x] Interfaz de **Cocina**: pedidos pagados en orden de llegada, observaciones resaltadas y confirmación de lectura antes de iniciar producción.
- [ ] Interfaz de **Mostrador** y pantalla de pedidos listos por restaurante.
- [x] Guardar los pedidos en LocalStorage para probar el ciclo completo entre pestañas.
- [ ] Paneles de **Administrador** y **Plazoleta**: ventas, aprobación de restaurantes, mesas y códigos QR.
- [ ] Inicio de sesión y registro de restaurantes.
- [ ] **Servidor y base de datos MySQL** con API: datos compartidos entre dispositivos, contraseñas con hash, notificaciones de Android.
- [ ] Pagos reales y sistema POS.

## Tecnologías

HTML, CSS y JavaScript puro, sin librerías ni dependencias. Tipografía Bricolage Grotesque (Google Fonts).

## Equipo

| Integrante | Rol | GitHub |
|---|---|---|
| Youler | Desarrollo del proyecto | [@yjcm27](https://github.com/yjcm27) |
| Nixon | Desarrollo del proyecto | [@nicwilmer-wq](https://github.com/nicwilmer-wq) |


## Cómo colaborar

1. Antes de subir cambios, avisa al equipo para no sobrescribir el trabajo de otra persona.
2. Descarga la versión más reciente del repositorio y prueba tus cambios abriendo `index.html`, `gestion.html` y `cocina.html`.
3. Sube los archivos modificados con una descripción corta de lo que cambiaste (**Commit changes**).
