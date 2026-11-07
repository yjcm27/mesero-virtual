import { Producto } from '../models/Producto.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError.js';
import { validarId } from '../utils/validaciones.js';

// CAPA DE SERVICIO: aquí están las REGLAS DE NEGOCIO que necesitan consultar datos
// (por ejemplo, "no repetir el nombre"). Usa los repositorios, pero no sabe nada de HTTP ni de SQL.
export class ProductoService {
  constructor(productoRepo, restauranteRepo) {
    this.productoRepo = productoRepo;
    this.restauranteRepo = restauranteRepo;
  }

  async listar(filtros = {}) {
    const f = { ...filtros };
    if (f.restauranteId !== undefined) f.restauranteId = validarId(f.restauranteId, 'restauranteId');
    return this.productoRepo.listar(f);
  }

  async obtener(id) {
    const producto = await this.productoRepo.buscarPorId(validarId(id));
    if (!producto) throw new NotFoundError('El producto no existe.');
    return producto;
  }

  async crear(datos) {
    const producto = Producto.desdeEntrada(datos);
    producto.validar();                                   // reglas propias del producto

    if (!(await this.restauranteRepo.buscarPorId(producto.restauranteId))) {
      throw new NotFoundError('El restaurante no existe.');
    }
    if (await this.productoRepo.buscarPorNombre(producto.restauranteId, producto.nombre)) {
      throw new ConflictError('Ya existe un producto con ese nombre en este restaurante.');
    }

    const id = await this.productoRepo.crear(producto);
    return this.productoRepo.buscarPorId(id);
  }

  async actualizar(id, datos) {
    const existente = await this.obtener(id);
    // El producto no puede cambiarse de restaurante; si no se envía "disponible", se conserva el actual
    const producto = Producto.desdeEntrada({ disponible: existente.disponible, ...datos, restauranteId: existente.restauranteId });
    producto.validar();

    const repetido = await this.productoRepo.buscarPorNombre(existente.restauranteId, producto.nombre);
    if (repetido && repetido.id !== existente.id) {
      throw new ConflictError('Ya existe un producto con ese nombre en este restaurante.');
    }

    await this.productoRepo.actualizar(existente.id, producto);
    return this.productoRepo.buscarPorId(existente.id);
  }

  async cambiarDisponibilidad(id, disponible) {
    if (typeof disponible !== 'boolean') {
      throw new ValidationError('El campo "disponible" debe ser true o false.');
    }
    const existente = await this.obtener(id);
    await this.productoRepo.cambiarDisponibilidad(existente.id, disponible);
    return this.productoRepo.buscarPorId(existente.id);
  }

  async eliminar(id) {
    const existente = await this.obtener(id);
    await this.productoRepo.eliminar(existente.id);
  }
}
