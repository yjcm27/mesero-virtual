import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Producto } from '../src/models/Producto.js';

const valido = {
  restauranteId: 1, nombre: 'Burger Test', categoria: 'Hamburguesas', precio: 25000,
  descripcion: 'Una hamburguesa de prueba muy rica', ingredientes: 'Pan, Carne, Queso',
  alergenos: ['Gluten'], modo: 'q', declaracion: true
};
const crear = (cambios = {}) => Producto.desdeEntrada({ ...valido, ...cambios });
const falla = (cambios, texto) => assert.throws(() => crear(cambios).validar(), { name: 'ValidationError', message: texto });

test('un producto correcto pasa todas las validaciones', () => {
  assert.doesNotThrow(() => crear().validar());
});

test('los ingredientes escritos con comas se convierten en lista', () => {
  assert.deepEqual(crear().ingredientes, ['Pan', 'Carne', 'Queso']);
});

test('valida el nombre', () => {
  falla({ nombre: 'ab' }, /nombre/);
  falla({ nombre: 'x'.repeat(61) }, /nombre/);
});

test('valida el precio (entero entre 1 y 500000)', () => {
  falla({ precio: 0 }, /precio/);
  falla({ precio: -5 }, /precio/);
  falla({ precio: 12.5 }, /precio/);
  falla({ precio: 500001 }, /precio/);
  falla({ precio: 'abc' }, /precio/);
});

test('valida la descripción y los ingredientes', () => {
  falla({ descripcion: 'corta' }, /descripción/);
  falla({ ingredientes: '' }, /ingrediente/);
});

test('para quitar ingredientes (modo q) se necesitan al menos 2', () => {
  falla({ ingredientes: 'Pan', modo: 'q' }, /al menos 2/);
  assert.doesNotThrow(() => crear({ ingredientes: 'Pan', modo: 'o' }).validar());
});

test('rechaza los símbolos < y > y modos inválidos', () => {
  falla({ nombre: '<b>Hack</b>' }, /símbolos/);
  falla({ modo: 'z' }, /modo/);
});

test('los alérgenos son obligatorios: lista, o sinAlergenos explícito', () => {
  falla({ alergenos: [] }, /Declara los alérgenos/);
  assert.doesNotThrow(() => crear({ alergenos: [], sinAlergenos: true }).validar());
  falla({ alergenos: ['Polvo de hadas'] }, /lista permitida/);
});

test('exige la declaración de responsabilidad', () => {
  falla({ declaracion: false }, /declaración/);
});

test('toJSON no expone los datos de la declaración', () => {
  const json = crear().toJSON();
  assert.equal('declaracion' in json, false);
  assert.equal(json.nombre, 'Burger Test');
});
