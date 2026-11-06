import { NotFoundError } from '../errors/AppError.js';
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
}
