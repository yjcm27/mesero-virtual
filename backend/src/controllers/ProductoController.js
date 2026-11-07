export class ProductoController {
  constructor(servicio) {
    this.servicio = servicio;
  }

  listar = async (req, res, next) => {
    try { res.json(await this.servicio.listar(req.query)); } catch (e) { next(e); }
  };

  obtener = async (req, res, next) => {
    try { res.json(await this.servicio.obtener(req.params.id)); } catch (e) { next(e); }
  };

  crear = async (req, res, next) => {
    try { res.status(201).json(await this.servicio.crear(req.body)); } catch (e) { next(e); }
  };

  actualizar = async (req, res, next) => {
    try { res.json(await this.servicio.actualizar(req.params.id, req.body)); } catch (e) { next(e); }
  };

  cambiarDisponibilidad = async (req, res, next) => {
    try { res.json(await this.servicio.cambiarDisponibilidad(req.params.id, req.body?.disponible)); } catch (e) { next(e); }
  };

  eliminar = async (req, res, next) => {
    try { await this.servicio.eliminar(req.params.id); res.status(204).end(); } catch (e) { next(e); }
  };
}
