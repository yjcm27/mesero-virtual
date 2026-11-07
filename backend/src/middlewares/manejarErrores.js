import { AppError } from '../errors/AppError.js';

// Middleware de errores: todos los errores del proyecto llegan aquí y se convierten en una respuesta JSON.
export function manejarErrores(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.estado).json({ error: err.message });
  }
  if (err.type === 'entity.parse.failed') {   // el cuerpo enviado no es un JSON válido
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
  }
  console.error(err); // error inesperado: se registra y se responde sin detalles internos
  return res.status(500).json({ error: 'Error interno del servidor.' });
}
