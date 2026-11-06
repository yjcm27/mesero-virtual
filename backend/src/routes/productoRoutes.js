import { Router } from 'express';

// Rutas del módulo de Productos (CRUD): URL + método HTTP → método del controlador
export function crearRutasProducto(controlador) {
  const router = Router();
  router.get('/', controlador.listar);                                   // leer todos (con filtros)
  router.get('/:id', controlador.obtener);                               // leer uno
  router.post('/', controlador.crear);                                   // crear
  router.put('/:id', controlador.actualizar);                            // actualizar
  router.patch('/:id/disponibilidad', controlador.cambiarDisponibilidad); // agotado / disponible
  router.delete('/:id', controlador.eliminar);                           // eliminar
  return router;
}
