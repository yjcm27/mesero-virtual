import { Router } from 'express';

// Rutas del módulo de Pedidos
export function crearRutasPedido(controlador) {
  const router = Router();
  router.post('/', controlador.crear);                                   // crear pedido (estado "Enviando")
  router.get('/', controlador.listar);                                   // listar (vista=cocina para Cocina)
  router.get('/:id', controlador.obtener);
  router.patch('/:id/pago', controlador.registrarPago);                  // pago confirmado o no (simulado)
  router.patch('/:id/observacion-leida', controlador.marcarObservacionLeida);
  router.patch('/:id/estado', controlador.cambiarEstado);                // En preparación / Listo / Entregado
  router.patch('/:id/cancelar', controlador.cancelar);
  return router;
}
