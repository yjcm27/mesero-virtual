import { ValidationError } from '../errors/AppError.js';
import { tieneSimbolosPeligrosos } from '../utils/validaciones.js';

// Modos de personalización: q = ingredientes quitables, o = solo observaciones, n = sin personalización
export const MODOS = ['q', 'o', 'n'];
export const ALERGENOS_VALIDOS = ['Gluten', 'Lácteos', 'Huevo', 'Pescado', 'Soya', 'Ajonjolí', 'Nueces', 'Maní', 'Cebolla', 'Ajo'];

// Clase MODELO: representa un producto del menú y conoce sus propias reglas (encapsulamiento).
export class Producto {
  constructor({ id = null, restauranteId, nombre, categoria, precio, descripcion, ingredientes = [], alergenos = [],
                modo = 'o', imagenUrl = '', disponible = true, sinAlergenos = false, declaracion = false }) {
    this.id = id;
    this.restauranteId = restauranteId;
    this.nombre = nombre;
    this.categoria = categoria;
    this.precio = precio;
    this.descripcion = descripcion;
    this.ingredientes = ingredientes;
    this.alergenos = alergenos;
    this.modo = modo;
    this.imagenUrl = imagenUrl;
    this.disponible = disponible;
    // Estos dos datos solo viajan en la petición (no se guardan): la declaración de alérgenos
    this.sinAlergenos = sinAlergenos;
    this.declaracion = declaracion;
  }

  // Crea un Producto a partir de lo que llega en el cuerpo de la petición, limpiando los textos
  static desdeEntrada(datos = {}) {
    const ingredientes = Array.isArray(datos.ingredientes)
      ? datos.ingredientes
      : String(datos.ingredientes ?? '').split(',');
    return new Producto({
      restauranteId: Number(datos.restauranteId),
      nombre: String(datos.nombre ?? '').trim(),
      categoria: String(datos.categoria ?? '').trim(),
      precio: Number(datos.precio),
      descripcion: String(datos.descripcion ?? '').trim(),
      ingredientes: ingredientes.map((i) => String(i).trim()).filter((i) => i !== ''),
      alergenos: Array.isArray(datos.alergenos) ? datos.alergenos : [],
      modo: datos.modo ?? 'o',
      imagenUrl: String(datos.imagenUrl ?? '').trim(),
      disponible: datos.disponible === undefined ? true : Boolean(datos.disponible),
      sinAlergenos: datos.sinAlergenos === true,
      declaracion: datos.declaracion === true
    });
  }

  // Crea un Producto a partir de una fila de la base de datos
  static desdeFila(fila) {
    return new Producto({
      id: fila.id,
      restauranteId: fila.restaurante_id,
      nombre: fila.nombre,
      categoria: fila.categoria,
      precio: fila.precio,
      descripcion: fila.descripcion,
      ingredientes: JSON.parse(fila.ingredientes),
      alergenos: JSON.parse(fila.alergenos),
      modo: fila.modo,
      imagenUrl: fila.imagen_url,
      disponible: Boolean(fila.disponible)
    });
  }

  // Reglas de negocio propias del producto. Lanza ValidationError si algo está mal.
  validar() {
    if (!Number.isInteger(this.restauranteId) || this.restauranteId <= 0) {
      throw new ValidationError('El restauranteId es obligatorio.');
    }
    if (this.nombre.length < 3 || this.nombre.length > 60) {
      throw new ValidationError('El nombre debe tener entre 3 y 60 caracteres.');
    }
    if (this.categoria.length < 3 || this.categoria.length > 30) {
      throw new ValidationError('La categoría debe tener entre 3 y 30 caracteres.');
    }
    if (!Number.isInteger(this.precio) || this.precio <= 0 || this.precio > 500000) {
      throw new ValidationError('El precio debe ser un número entero entre 1 y 500000.');
    }
    if (this.descripcion.length < 10 || this.descripcion.length > 140) {
      throw new ValidationError('La descripción debe tener entre 10 y 140 caracteres.');
    }
    if (this.ingredientes.length < 1) {
      throw new ValidationError('Debes indicar al menos un ingrediente.');
    }
    if (!MODOS.includes(this.modo)) {
      throw new ValidationError('El modo de personalización debe ser q, o o n.');
    }
    if (this.modo === 'q' && this.ingredientes.length < 2) {
      throw new ValidationError('Para que el cliente pueda quitar ingredientes, el producto necesita al menos 2.');
    }
    if (tieneSimbolosPeligrosos([this.nombre, this.categoria, this.descripcion, ...this.ingredientes].join(' '))) {
      throw new ValidationError('No se permiten los símbolos < y > en los textos.');
    }
    if (this.alergenos.some((a) => !ALERGENOS_VALIDOS.includes(a))) {
      throw new ValidationError('Hay un alérgeno que no pertenece a la lista permitida.');
    }
    // Seguridad del cliente: declarar alérgenos, o declarar de forma explícita que no tiene
    if (this.alergenos.length === 0 && !this.sinAlergenos) {
      throw new ValidationError('Declara los alérgenos del producto o indica sinAlergenos: true.');
    }
    if (!this.declaracion) {
      throw new ValidationError('Debes aceptar la declaración de alérgenos (declaracion: true).');
    }
  }

  // Lo que se envía como respuesta JSON (JSON.stringify llama a este método solo)
  toJSON() {
    return {
      id: this.id, restauranteId: this.restauranteId, nombre: this.nombre, categoria: this.categoria,
      precio: this.precio, descripcion: this.descripcion, ingredientes: this.ingredientes,
      alergenos: this.alergenos, modo: this.modo, imagenUrl: this.imagenUrl, disponible: this.disponible
    };
  }
}
