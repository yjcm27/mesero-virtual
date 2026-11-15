import { NotFoundError, ValidationError } from '../errors/AppError.js';
import { validarId } from '../utils/validaciones.js';

export class RestauranteService {
  constructor(restauranteRepo) {
    this.restauranteRepo = restauranteRepo;
  }

  listar() {
    return this.restauranteRepo.listar();
  }

  async obtener(id) {
    const restaurante = await this.restauranteRepo.buscarPorId(validarId(id));
    if (!restaurante) throw new NotFoundError('El restaurante no existe.');
    return restaurante;
  }

  // Regla de negocio: el administrador puede cambiar el tiempo de preparación y la capacidad de cocina
  async actualizarConfig(id, datos) {
    const restauranteId = validarId(id);
    const { tiempoPrepMin, capacidad } = datos || {};

    if (!Number.isInteger(tiempoPrepMin) || tiempoPrepMin < 1 || tiempoPrepMin > 120) {
      throw new ValidationError('El tiempo de preparación debe ser un número entero de minutos entre 1 y 120.');
    }
    if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 10) {
      throw new ValidationError('La capacidad debe ser un número entero entre 1 y 10.');
    }

    await this.obtener(restauranteId); // lanza 404 si el restaurante no existe
    return this.restauranteRepo.actualizarConfig(restauranteId, tiempoPrepMin, capacidad);
  }
}