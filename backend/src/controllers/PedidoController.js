export class PedidoController {
  constructor(servicio) {
    this.servicio = servicio;
  }

  crear = async (req, res, next) => {
    try { res.status(201).json(await this.servicio.crear(req.body)); } catch (e) { next(e); }
  };

  listar = async (req, res, next) => {
    try { res.json(await this.servicio.listar(req.query)); } catch (e) { next(e); }
  };

  obtener = async (req, res, next) => {
    try { res.json(await this.servicio.obtener(req.params.id)); } catch (e) { next(e); }
  };

  registrarPago = async (req, res, next) => {
    try { res.json(await this.servicio.registrarPago(req.params.id, req.body?.confirmado)); } catch (e) { next(e); }
  };

  marcarObservacionLeida = async (req, res, next) => {
    try { res.json(await this.servicio.marcarObservacionLeida(req.params.id)); } catch (e) { next(e); }
  };

  cambiarEstado = async (req, res, next) => {
    try { res.json(await this.servicio.cambiarEstado(req.params.id, req.body?.estado)); } catch (e) { next(e); }
  };

  cancelar = async (req, res, next) => {
    try { res.json(await this.servicio.cancelar(req.params.id, req.body)); } catch (e) { next(e); }
  };
}
