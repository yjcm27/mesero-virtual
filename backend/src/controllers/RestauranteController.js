// CAPA DE CONTROLADORES: recibe la petición HTTP, llama al servicio y arma la respuesta.
// No tiene reglas de negocio. Si algo falla, pasa el error al manejador (next).
export class RestauranteController {
  constructor(servicio) {
    this.servicio = servicio;
  }

  listar = async (req, res, next) => {
    try { res.json(await this.servicio.listar()); } catch (e) { next(e); }
  };

  obtener = async (req, res, next) => {
    try { res.json(await this.servicio.obtener(req.params.id)); } catch (e) { next(e); }
  };
}
