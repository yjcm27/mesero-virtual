import { Router } from 'express';

export function crearRutasRestaurante(controlador) {
  const router = Router();
  router.get('/', controlador.listar);
  router.get('/:id', controlador.obtener);
  router.patch('/:id/config', controlador.actualizarConfig);
  return router;
}