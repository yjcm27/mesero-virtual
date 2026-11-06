import { ValidationError } from '../errors/AppError.js';

// Convierte un valor a número entero positivo o lanza un error claro
export function validarId(valor, nombre = 'id') {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ValidationError(`El ${nombre} debe ser un número entero positivo.`);
  }
  return n;
}

// Los símbolos < y > no se permiten en textos (evita meter código HTML)
export function tieneSimbolosPeligrosos(texto) {
  return /[<>]/.test(String(texto));
}
