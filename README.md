# Mesero Virtual

Menú virtual para plazoletas de comidas. El cliente escanea el QR de su mesa, ve los restaurantes de la plazoleta, arma su carrito, envía su pedido a pagar y sigue su estado, sin descargar nada ni registrarse.

**Página publicada:** https://yjcm27.github.io/mesero-virtual/

## Autores

Proyecto desarrollado en equipo por:

- Youler Cordoba ([@yjcm27](https://github.com/yjcm27))
- Nixón Chavez

## Estado actual

Este repositorio contiene el **prototipo de la interfaz del cliente** (versión 1.1). Funciona con datos de ejemplo y con un pago simulado. Todavía no tiene servidor ni base de datos.

### Qué incluye

- Simulación del escaneo del QR, que crea una sesión nueva.
- Lista de 4 restaurantes y 11 productos de ejemplo, con alérgenos.
- Tres modos de personalización por producto: ingredientes quitables, solo observaciones o sin personalización.
- Carrito y pedido separados por restaurante.
- Estados del pedido con cronómetro: Enviando, En espera, En preparación, Listo y Entregado, además de Pago no confirmado y Cancelado.
- Alarma cuando el pedido está listo y simulación de avisos para Android e iPhone.
- Modo claro y modo oscuro automático.
- Botones "Demo" que hacen de cocina para probar el flujo completo.

### Validaciones

- El producto agotado no se puede pedir.
- Los alérgenos se deben confirmar antes de agregar un producto.
- En los productos con ingredientes quitables, debe quedar al menos un ingrediente.
- Las observaciones tienen un máximo de 140 caracteres, con contador, y no aceptan los símbolos `<` y `>`.
- Máximo 10 unidades por producto.
- No se puede enviar un carrito vacío.
- Antiduplicados: el botón de pago se bloquea al enviar, así que un doble toque no crea dos pedidos.
- Un pedido solo se puede cancelar mientras está en "En espera".
- Una sesión cerrada no permite agregar ni enviar pedidos.

## Estructura del proyecto

```
mesero-virtual/
├── index.html        Estructura de la página
├── css/
│   └── styles.css    Estilos (colores, modo claro y oscuro, diseño móvil)
├── js/
│   ├── datos.js      Restaurantes y productos de ejemplo
│   └── app.js        Lógica de la interfaz
└── img/
    ├── logo-claro.png
    └── logo-oscuro.png
```

## Cómo usarlo

1. Descarga o clona el repositorio, manteniendo las carpetas tal como están.
2. Abre `index.html` en el navegador. No necesita instalar nada.
3. Para verlo como lo vería un cliente, activa la vista de celular en las herramientas del navegador (F12, luego Ctrl+Shift+M).

## Tecnologías

HTML, CSS y JavaScript, sin librerías externas. La única conexión externa es la tipografía de Google Fonts.

## Lo que falta

- Interfaces de Cocina, Mostrador, pantalla de pedidos listos, Administrador y Plazoleta, y el login y registro de restaurantes.
- Fotos reales de los platos (ahora se usan emojis).
- Servidor real: base de datos, sesiones por QR, tiempo real entre dispositivos, notificaciones push en Android y separación de datos por restaurante.
- Al final: pagos reales y POS.
- Decisiones pendientes: reglas de reembolso y fórmula detallada del tiempo estimado.
