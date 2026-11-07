import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { crearPoolSqlite } from '../testing/poolSqlite.js';
import { ProductoRepository } from '../src/repositories/ProductoRepository.js';
import { RestauranteRepository } from '../src/repositories/RestauranteRepository.js';
import { PedidoRepository } from '../src/repositories/PedidoRepository.js';
import { ProductoService } from '../src/services/ProductoService.js';
import { PedidoService } from '../src/services/PedidoService.js';
import { ItemPedido, Pedido } from '../src/models/Pedido.js';

let pool, servicio, productos, ids;
const base = { restauranteId: 1, categoria: 'Varios', descripcion: 'Producto de prueba para los pedidos', declaracion: true, alergenos: ['Gluten'] };

beforeEach(async () => {
  pool = crearPoolSqlite();
  const productoRepo = new ProductoRepository(pool), restauranteRepo = new RestauranteRepository(pool);
  productos = new ProductoService(productoRepo, restauranteRepo);
  servicio = new PedidoService(new PedidoRepository(pool), productoRepo, restauranteRepo);
  ids = {
    burger: (await productos.crear({ ...base, nombre: 'Burger', precio: 28900, ingredientes: ['Pan', 'Carne', 'Cebolla'], modo: 'q' })).id,
    pasta: (await productos.crear({ ...base, nombre: 'Pasta', precio: 29500, ingredientes: ['Pasta', 'Crema'], modo: 'o' })).id,
    papas: (await productos.crear({ ...base, nombre: 'Papas', precio: 14500, ingredientes: ['Papa'], modo: 'n' })).id,
    limonada: (await productos.crear({ ...base, nombre: 'Limonada', precio: 9500, ingredientes: ['Limón'], modo: 'n', disponible: false })).id
  };
});

const pedido = (items, extra = {}) => servicio.crear({ restauranteId: 1, sesion: 1042, mesa: 8, items, ...extra });

test('crea el pedido en "Enviando" y calcula el total en el servidor', async () => {
  const p = await pedido([{ productoId: ids.burger, cantidad: 2 }, { productoId: ids.papas, cantidad: 1, precioUnitario: 1 }]);
  assert.equal(p.estado, 'Enviando');
  assert.equal(p.total, 28900 * 2 + 14500);   // el precio enviado por el cliente (1) se ignora
  assert.equal(p.items.length, 2);
});

test('numera los pedidos por sesión y restaurante: 1042-R1-01, 1042-R1-02...', async () => {
  const a = await pedido([{ productoId: ids.burger, cantidad: 1 }]);
  const b = await pedido([{ productoId: ids.burger, cantidad: 1 }]);
  const c = await pedido([{ productoId: ids.burger, cantidad: 1 }], { sesion: 1043 });
  assert.equal(a.numero, '1042-R1-01');
  assert.equal(b.numero, '1042-R1-02');
  assert.equal(c.numero, '1043-R1-01');
});

test('el pedido guardado se puede leer de nuevo con sus renglones', async () => {
  const creado = await pedido([{ productoId: ids.burger, cantidad: 2, quitar: ['Cebolla'] }]);
  const leido = await servicio.obtener(creado.id);
  assert.equal(leido.numero, creado.numero);
  assert.deepEqual(leido.items[0].quitar, ['Cebolla']);
  assert.equal(leido.items[0].nombre, 'Burger');
});

test('valida los datos del pedido', async () => {
  await assert.rejects(pedido([]), { name: 'ValidationError' });
  await assert.rejects(pedido([{ productoId: ids.burger, cantidad: 0 }]), { name: 'ValidationError' });
  await assert.rejects(pedido([{ productoId: ids.burger, cantidad: 11 }]), { name: 'ValidationError' });
  await assert.rejects(pedido([{ productoId: ids.burger, cantidad: 1, observacion: 'x'.repeat(141) }]), { name: 'ValidationError' });
  await assert.rejects(pedido([{ productoId: ids.burger, cantidad: 1, observacion: '<script>' }]), { name: 'ValidationError' });
  await assert.rejects(pedido([{ productoId: ids.burger, cantidad: 1 }], { restauranteId: 99 }), { name: 'NotFoundError' });
  await assert.rejects(pedido([{ productoId: 999, cantidad: 1 }]), { name: 'NotFoundError' });
});

test('no deja pedir productos agotados', async () => {
  await assert.rejects(pedido([{ productoId: ids.limonada, cantidad: 1 }]), { name: 'BusinessRuleError', message: /agotado/ });
});

test('respeta el modo de personalización de cada producto', async () => {
  await pedido([{ productoId: ids.burger, cantidad: 1, quitar: ['Cebolla'], observacion: 'sin sal' }]);                       // q: permite ambos
  await pedido([{ productoId: ids.pasta, cantidad: 1, observacion: 'poca sal' }]);                                          // o: solo observación
  await assert.rejects(pedido([{ productoId: ids.pasta, cantidad: 1, quitar: ['Crema'] }]), { name: 'BusinessRuleError' });  // o: no quita
  await assert.rejects(pedido([{ productoId: ids.papas, cantidad: 1, observacion: 'x' }]), { name: 'BusinessRuleError' });   // n: nada
  await assert.rejects(pedido([{ productoId: ids.burger, cantidad: 1, quitar: ['Tomate'] }]), { name: 'ValidationError' });  // no es ingrediente
});

test('la transacción hace rollback: si un renglón falla, no queda nada guardado', async () => {
  const repo = new PedidoRepository(pool);
  const malo = new Pedido({ sesion: 1, mesa: 1, restauranteId: 1, items: [
    new ItemPedido({ productoId: ids.burger, nombre: 'Burger', precioUnitario: 100, cantidad: 1 }),
    new ItemPedido({ productoId: ids.burger, nombre: null, precioUnitario: 100, cantidad: 1 })   // viola NOT NULL
  ] });
  await assert.rejects(repo.crearConItems(malo));
  assert.equal((await repo.listar()).length, 0);
});

test('flujo completo de Cocina con observaciones', async () => {
  const p = await pedido([{ productoId: ids.burger, cantidad: 1, quitar: ['Cebolla'], observacion: 'Alergia a la cebolla' }]);
  await servicio.registrarPago(p.id, true);
  await assert.rejects(servicio.cambiarEstado(p.id, 'En preparación'), { name: 'BusinessRuleError' });   // falta "leída"
  await servicio.marcarObservacionLeida(p.id);
  assert.equal((await servicio.cambiarEstado(p.id, 'En preparación')).estado, 'En preparación');
  assert.equal((await servicio.cambiarEstado(p.id, 'Listo')).estado, 'Listo');
  assert.equal((await servicio.cambiarEstado(p.id, 'Entregado')).estado, 'Entregado');
  assert.equal((await servicio.obtener(p.id)).estado, 'Entregado');   // quedó guardado en la base de datos
  await assert.rejects(servicio.cambiarEstado(p.id, 'Cualquiera'), { name: 'ValidationError' });
});

test('la vista de Cocina solo muestra pedidos pagados, en orden de pago', async () => {
  const a = await pedido([{ productoId: ids.burger, cantidad: 1 }]);
  const b = await pedido([{ productoId: ids.burger, cantidad: 1 }]);
  const c = await pedido([{ productoId: ids.burger, cantidad: 1 }]);   // este nunca se paga
  await servicio.registrarPago(b.id, true);
  await new Promise((r) => setTimeout(r, 5));
  await servicio.registrarPago(a.id, true);

  const cocina = await servicio.listar({ restauranteId: 1, vista: 'cocina' });
  assert.deepEqual(cocina.map((p) => p.numero), [b.numero, a.numero]);
  assert.equal((await servicio.listar({ restauranteId: 1 })).length, 3);
  assert.equal((await servicio.listar({ estado: 'Enviando' }))[0].id, c.id);
});

test('pago no confirmado y reintento', async () => {
  const p = await pedido([{ productoId: ids.burger, cantidad: 1 }]);
  assert.equal((await servicio.registrarPago(p.id, false)).estado, 'Pago no confirmado');
  assert.equal((await servicio.registrarPago(p.id, true)).estado, 'En espera');
  await assert.rejects(servicio.registrarPago(p.id, 'tal vez'), { name: 'ValidationError' });
});

test('cancelación: cliente solo en "En espera"; administrador con motivo', async () => {
  const a = await pedido([{ productoId: ids.burger, cantidad: 1 }]);
  await servicio.registrarPago(a.id, true);
  assert.equal((await servicio.cancelar(a.id, { origen: 'cliente' })).estado, 'Cancelado');

  const b = await pedido([{ productoId: ids.burger, cantidad: 1 }]);
  await servicio.registrarPago(b.id, true);
  await servicio.cambiarEstado(b.id, 'En preparación');
  await assert.rejects(servicio.cancelar(b.id, { origen: 'cliente' }), { name: 'BusinessRuleError' });
  const cancelado = await servicio.cancelar(b.id, { origen: 'administrador', motivo: 'Se agotó la carne' });
  assert.equal(cancelado.motivoCancelacion, 'Se agotó la carne');
  assert.equal((await servicio.obtener(b.id)).estado, 'Cancelado');
});
