import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProductoController } from '../src/controllers/ProductoController.js';
import { PedidoController } from '../src/controllers/PedidoController.js';
import { manejarErrores } from '../src/middlewares/manejarErrores.js';
import { ValidationError, NotFoundError } from '../src/errors/AppError.js';

// Una "respuesta" falsa para probar los controladores sin levantar Express
function respuestaFalsa() {
  return {
    codigo: 200, cuerpo: undefined, terminada: false,
    status(c) { this.codigo = c; return this; },
    json(b) { this.cuerpo = b; return this; },
    end() { this.terminada = true; return this; }
  };
}

test('ProductoController.crear responde 201 con el producto creado', async () => {
  const servicio = { crear: async (datos) => ({ id: 7, ...datos }) };
  const res = respuestaFalsa();
  await new ProductoController(servicio).crear({ body: { nombre: 'X' } }, res, () => assert.fail('no debía fallar'));
  assert.equal(res.codigo, 201);
  assert.equal(res.cuerpo.id, 7);
});

test('los errores del servicio se pasan al manejador con next()', async () => {
  const servicio = { crear: async () => { throw new ValidationError('mal'); } };
  let recibido;
  await new ProductoController(servicio).crear({ body: {} }, respuestaFalsa(), (e) => { recibido = e; });
  assert.equal(recibido.name, 'ValidationError');
});

test('ProductoController.eliminar responde 204 sin contenido', async () => {
  const res = respuestaFalsa();
  await new ProductoController({ eliminar: async () => {} }).eliminar({ params: { id: '3' } }, res, () => {});
  assert.equal(res.codigo, 204);
  assert.equal(res.terminada, true);
});

test('PedidoController pasa los filtros y el cuerpo al servicio', async () => {
  const llamadas = [];
  const servicio = {
    listar: async (q) => { llamadas.push(['listar', q]); return []; },
    cambiarEstado: async (id, estado) => { llamadas.push(['estado', id, estado]); return { id, estado }; },
    cancelar: async (id, cuerpo) => { llamadas.push(['cancelar', id, cuerpo]); return {}; }
  };
  const c = new PedidoController(servicio);
  await c.listar({ query: { vista: 'cocina' } }, respuestaFalsa(), () => {});
  await c.cambiarEstado({ params: { id: '5' }, body: { estado: 'Listo' } }, respuestaFalsa(), () => {});
  await c.cancelar({ params: { id: '5' }, body: { origen: 'cliente' } }, respuestaFalsa(), () => {});
  assert.deepEqual(llamadas, [['listar', { vista: 'cocina' }], ['estado', '5', 'Listo'], ['cancelar', '5', { origen: 'cliente' }]]);
});

test('manejarErrores traduce cada tipo de error a su código HTTP', () => {
  let res = respuestaFalsa();
  manejarErrores(new NotFoundError('no existe'), {}, res, () => {});
  assert.equal(res.codigo, 404);
  assert.deepEqual(res.cuerpo, { error: 'no existe' });

  res = respuestaFalsa();
  manejarErrores(Object.assign(new Error('x'), { type: 'entity.parse.failed' }), {}, res, () => {});
  assert.equal(res.codigo, 400);

  res = respuestaFalsa();
  const original = console.error; console.error = () => {};
  manejarErrores(new Error('falla interna secreta'), {}, res, () => {});
  console.error = original;
  assert.equal(res.codigo, 500);
  assert.equal(res.cuerpo.error, 'Error interno del servidor.');   // no filtra detalles internos
});
