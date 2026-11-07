import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESTADOS, ItemPedido, Pedido } from '../src/models/Pedido.js';

const item = (extra = {}) => new ItemPedido({ productoId: 1, nombre: 'Burger', precioUnitario: 10000, cantidad: 2, ...extra });
const pedido = (items = [item()]) => new Pedido({ sesion: 1042, mesa: 8, restauranteId: 1, items });
const pagado = (items) => { const p = pedido(items); p.confirmarPago(); return p; };

test('el total se calcula con precio × cantidad de cada renglón', () => {
  const p = pedido([item(), item({ precioUnitario: 5000, cantidad: 3 })]);
  assert.equal(p.total, 35000);
});

test('ciclo normal: Enviando → En espera → En preparación → Listo → Entregado', () => {
  const p = pedido();
  assert.equal(p.estado, ESTADOS.ENVIANDO);
  p.confirmarPago();        assert.equal(p.estado, ESTADOS.EN_ESPERA);
  p.iniciarProduccion();    assert.equal(p.estado, ESTADOS.EN_PREPARACION);
  p.marcarListo();          assert.equal(p.estado, ESTADOS.LISTO);
  p.entregar();             assert.equal(p.estado, ESTADOS.ENTREGADO);
  assert.ok(p.pagadoEn && p.inicioEn && p.listoEn && p.entregadoEn);
});

test('no se puede saltar pasos del ciclo', () => {
  const p = pedido();
  assert.throws(() => p.iniciarProduccion(), { name: 'BusinessRuleError' });  // sin pagar
  assert.throws(() => p.marcarListo(), { name: 'BusinessRuleError' });
  assert.throws(() => p.entregar(), { name: 'BusinessRuleError' });
});

test('con observaciones, Cocina debe marcarlas como leídas antes de iniciar', () => {
  const p = pagado([item({ observacion: 'Alergia a la cebolla' })]);
  assert.equal(p.tieneObservaciones(), true);
  assert.throws(() => p.iniciarProduccion(), { name: 'BusinessRuleError', message: /Observación leída/ });
  p.marcarObservacionLeida();
  assert.doesNotThrow(() => p.iniciarProduccion());
});

test('los ingredientes quitados también cuentan como observaciones', () => {
  const p = pagado([item({ quitar: ['Cebolla'] })]);
  assert.equal(p.tieneObservaciones(), true);
  assert.throws(() => p.iniciarProduccion(), { name: 'BusinessRuleError' });
});

test('un pedido sin observaciones no necesita ni permite marcarlas como leídas', () => {
  const p = pagado();
  assert.throws(() => p.marcarObservacionLeida(), { name: 'BusinessRuleError' });
  assert.doesNotThrow(() => p.iniciarProduccion());
});

test('pago no confirmado: puede confirmarse después (comprobante tardío)', () => {
  const p = pedido();
  p.marcarPagoNoConfirmado();
  assert.equal(p.estado, ESTADOS.PAGO_NO_CONFIRMADO);
  p.confirmarPago();
  assert.equal(p.estado, ESTADOS.EN_ESPERA);
});

test('el cliente solo puede cancelar en "En espera"', () => {
  const a = pagado();
  assert.doesNotThrow(() => a.cancelar('cliente'));
  assert.equal(a.estado, ESTADOS.CANCELADO);

  const b = pagado(); b.iniciarProduccion();
  assert.throws(() => b.cancelar('cliente'), { name: 'BusinessRuleError' });
});

test('el administrador cancela antes de "Entregado", siempre con motivo', () => {
  const p = pagado(); p.iniciarProduccion();
  assert.throws(() => p.cancelar('administrador'), { name: 'ValidationError' });
  p.cancelar('administrador', 'Se agotó un ingrediente');
  assert.equal(p.estado, ESTADOS.CANCELADO);
  assert.equal(p.motivoCancelacion, 'Se agotó un ingrediente');

  const e = pagado(); e.iniciarProduccion(); e.marcarListo(); e.entregar();
  assert.throws(() => e.cancelar('administrador', 'ya no importa'), { name: 'BusinessRuleError' });
  assert.throws(() => pedido().cancelar('otro'), { name: 'ValidationError' });
});
