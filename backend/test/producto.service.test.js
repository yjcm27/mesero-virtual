import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { crearPoolSqlite } from '../testing/poolSqlite.js';
import { ProductoRepository } from '../src/repositories/ProductoRepository.js';
import { RestauranteRepository } from '../src/repositories/RestauranteRepository.js';
import { ProductoService } from '../src/services/ProductoService.js';
import { Producto } from '../src/models/Producto.js';

let servicio, repo;
const datos = (cambios = {}) => ({
  restauranteId: 1, nombre: 'Burger Test', categoria: 'Hamburguesas', precio: 25000,
  descripcion: 'Una hamburguesa de prueba muy rica', ingredientes: ['Pan', 'Carne', 'Queso'],
  alergenos: ['Gluten', 'Lácteos'], modo: 'q', declaracion: true, ...cambios
});

beforeEach(() => {
  const pool = crearPoolSqlite();               // base de datos nueva y vacía para cada prueba
  repo = new ProductoRepository(pool);
  servicio = new ProductoService(repo, new RestauranteRepository(pool));
});

test('CREATE: guarda el producto y devuelve el id asignado por la base de datos', async () => {
  const p = await servicio.crear(datos());
  assert.ok(p.id > 0);
  assert.equal(p.nombre, 'Burger Test');
  assert.deepEqual(p.alergenos, ['Gluten', 'Lácteos']);
  assert.equal(p.disponible, true);
});

test('CREATE: rechaza datos inválidos y restaurantes que no existen', async () => {
  await assert.rejects(servicio.crear(datos({ precio: 0 })), { name: 'ValidationError' });
  await assert.rejects(servicio.crear(datos({ restauranteId: 99 })), { name: 'NotFoundError' });
});

test('CREATE: no permite nombres repetidos en el mismo restaurante (sin importar mayúsculas)', async () => {
  await servicio.crear(datos());
  await assert.rejects(servicio.crear(datos({ nombre: 'burger test' })), { name: 'ConflictError' });
  const otro = await servicio.crear(datos({ restauranteId: 2 })); // en otro restaurante sí se puede
  assert.equal(otro.restauranteId, 2);
});

test('READ: lista con filtros y busca por id', async () => {
  await servicio.crear(datos());
  await servicio.crear(datos({ nombre: 'Limonada', categoria: 'Bebidas', ingredientes: ['Limón'], modo: 'n', alergenos: [], sinAlergenos: true }));
  await servicio.crear(datos({ restauranteId: 2, nombre: 'Pizza Test' }));

  assert.equal((await servicio.listar()).length, 3);
  assert.equal((await servicio.listar({ restauranteId: '1' })).length, 2);
  assert.equal((await servicio.listar({ categoria: 'Bebidas' })).length, 1);
  assert.equal((await servicio.listar({ q: 'PIZZA' })).length, 1);
  const uno = await servicio.obtener((await servicio.listar({ q: 'limonada' }))[0].id);
  assert.equal(uno.nombre, 'Limonada');
});

test('READ: un id inválido o inexistente da error', async () => {
  await assert.rejects(servicio.obtener('abc'), { name: 'ValidationError' });
  await assert.rejects(servicio.obtener(999), { name: 'NotFoundError' });
});

test('UPDATE: cambia los datos y conserva la disponibilidad si no se envía', async () => {
  const p = await servicio.crear(datos());
  await servicio.cambiarDisponibilidad(p.id, false);
  const editado = await servicio.actualizar(p.id, datos({ precio: 31000, nombre: 'Burger Test Plus' }));
  assert.equal(editado.precio, 31000);
  assert.equal(editado.nombre, 'Burger Test Plus');
  assert.equal(editado.disponible, false);
});

test('UPDATE: no permite quedarse con el nombre de otro producto', async () => {
  await servicio.crear(datos());
  const b = await servicio.crear(datos({ nombre: 'Otro Producto' }));
  await assert.rejects(servicio.actualizar(b.id, datos({ nombre: 'Burger Test' })), { name: 'ConflictError' });
  const igual = await servicio.actualizar(b.id, datos({ nombre: 'Otro Producto' })); // su propio nombre sí
  assert.equal(igual.nombre, 'Otro Producto');
});

test('PATCH: marcar agotado y disponible', async () => {
  const p = await servicio.crear(datos());
  assert.equal((await servicio.cambiarDisponibilidad(p.id, false)).disponible, false);
  assert.equal((await servicio.cambiarDisponibilidad(p.id, true)).disponible, true);
  await assert.rejects(servicio.cambiarDisponibilidad(p.id, 'si'), { name: 'ValidationError' });
});

test('DELETE: elimina el producto', async () => {
  const p = await servicio.crear(datos());
  await servicio.eliminar(p.id);
  await assert.rejects(servicio.obtener(p.id), { name: 'NotFoundError' });
  await assert.rejects(servicio.eliminar(p.id), { name: 'NotFoundError' });
});

test('el repositorio traduce el error de clave repetida de la base de datos', async () => {
  const p = Producto.desdeEntrada(datos());
  await repo.crear(p);
  await assert.rejects(repo.crear(p), { name: 'ConflictError' });
});
