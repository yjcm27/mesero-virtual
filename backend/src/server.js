import { crearPool } from './config/db.js';
import { crearApp } from './app.js';
import { RestauranteRepository } from './repositories/RestauranteRepository.js';
import { ProductoRepository } from './repositories/ProductoRepository.js';
import { PedidoRepository } from './repositories/PedidoRepository.js';
import { RestauranteService } from './services/RestauranteService.js';
import { ProductoService } from './services/ProductoService.js';
import { PedidoService } from './services/PedidoService.js';

// RAÍZ DE COMPOSICIÓN: aquí se crean los objetos y se conectan las capas
// base de datos → repositorios → servicios → controladores (dentro de crearApp) → rutas
const pool = crearPool();

try {
  await pool.execute('SELECT 1'); // comprueba que MySQL responde antes de arrancar
} catch (error) {
  console.error('No se pudo conectar a MySQL. Revisa que esté encendido y que el archivo .env tenga los datos correctos.');
  console.error(error.message);
  process.exit(1);
}

const restauranteRepo = new RestauranteRepository(pool);
const productoRepo = new ProductoRepository(pool);
const pedidoRepo = new PedidoRepository(pool);

const app = crearApp({
  restauranteService: new RestauranteService(restauranteRepo),
  productoService: new ProductoService(productoRepo, restauranteRepo),
  pedidoService: new PedidoService(pedidoRepo, productoRepo, restauranteRepo)
});

const puerto = Number(process.env.PORT ?? 3000);
app.listen(puerto, () => console.log(`Mesero Virtual API escuchando en http://localhost:${puerto}`));
