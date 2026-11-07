import express from 'express';
import { crearRutasRestaurante } from './routes/restauranteRoutes.js';
import { crearRutasProducto } from './routes/productoRoutes.js';
import { crearRutasPedido } from './routes/pedidoRoutes.js';
import { RestauranteController } from './controllers/RestauranteController.js';
import { ProductoController } from './controllers/ProductoController.js';
import { PedidoController } from './controllers/PedidoController.js';
import { manejarErrores } from './middlewares/manejarErrores.js';

// Arma la aplicación Express con los servicios que recibe (inyección de dependencias).
export function crearApp({ restauranteService, productoService, pedidoService }) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  // CORS: permite que el frontend (otra dirección) consuma la API
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/api/salud', (req, res) => res.json({ estado: 'ok', servicio: 'Mesero Virtual API' }));
  app.use('/api/restaurantes', crearRutasRestaurante(new RestauranteController(restauranteService)));
  app.use('/api/productos', crearRutasProducto(new ProductoController(productoService)));
  app.use('/api/pedidos', crearRutasPedido(new PedidoController(pedidoService)));

  app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
  app.use(manejarErrores);
  return app;
}
