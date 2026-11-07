import { ESTADOS, ItemPedido, Pedido } from '../models/Pedido.js';
import { BusinessRuleError, NotFoundError, ValidationError } from '../errors/AppError.js';
import { tieneSimbolosPeligrosos, validarId } from '../utils/validaciones.js';

// CAPA DE SERVICIO de pedidos: coordina productos, restaurantes y el modelo Pedido.
export class PedidoService {
  constructor(pedidoRepo, productoRepo, restauranteRepo) {
    this.pedidoRepo = pedidoRepo;
    this.productoRepo = productoRepo;
    this.restauranteRepo = restauranteRepo;
  }

  // Crea un pedido nuevo en estado "Enviando". El TOTAL lo calcula el servidor con los precios
  // guardados en la base de datos; nunca se confía en los precios que envía el cliente.
  async crear(datos = {}) {
    const restauranteId = validarId(datos.restauranteId, 'restauranteId');
    const sesion = validarId(datos.sesion, 'sesion');
    const mesa = validarId(datos.mesa, 'mesa');
    if (mesa > 99) throw new ValidationError('La mesa debe estar entre 1 y 99.');

    if (!(await this.restauranteRepo.buscarPorId(restauranteId))) {
      throw new NotFoundError('El restaurante no existe.');
    }
    if (!Array.isArray(datos.items) || datos.items.length < 1 || datos.items.length > 20) {
      throw new ValidationError('El pedido debe tener entre 1 y 20 productos.');
    }

    const items = [];
    for (const entrada of datos.items) {
      items.push(await this.construirItem(entrada, restauranteId));
    }
    return this.pedidoRepo.crearConItems(new Pedido({ sesion, mesa, restauranteId, items }));
  }

  // Valida un renglón del pedido contra el producto real de la base de datos
  async construirItem(entrada = {}, restauranteId) {
    const productoId = validarId(entrada.productoId, 'productoId');
    const cantidad = Number(entrada.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 10) {
      throw new ValidationError('La cantidad debe ser un número entero entre 1 y 10.');
    }
    const quitar = Array.isArray(entrada.quitar) ? entrada.quitar.map(String) : [];
    const observacion = String(entrada.observacion ?? '').trim();
    if (observacion.length > 140) throw new ValidationError('La observación no puede superar 140 caracteres.');
    if (tieneSimbolosPeligrosos(observacion + quitar.join(''))) {
      throw new ValidationError('No se permiten los símbolos < y > en las observaciones.');
    }

    const producto = await this.productoRepo.buscarPorId(productoId);
    if (!producto || producto.restauranteId !== restauranteId) {
      throw new NotFoundError(`El producto ${productoId} no existe en este restaurante.`);
    }
    if (!producto.disponible) {
      throw new BusinessRuleError(`«${producto.nombre}» está agotado.`);
    }

    // Regla según el modo de personalización que eligió el restaurante
    if (producto.modo === 'n' && (quitar.length > 0 || observacion !== '')) {
      throw new BusinessRuleError(`«${producto.nombre}» no admite personalización.`);
    }
    if (producto.modo === 'o' && quitar.length > 0) {
      throw new BusinessRuleError(`«${producto.nombre}» no permite quitar ingredientes; usa las observaciones.`);
    }
    if (quitar.some((ingrediente) => !producto.ingredientes.includes(ingrediente))) {
      throw new ValidationError('Solo se pueden quitar ingredientes que pertenecen al producto.');
    }

    return new ItemPedido({ productoId, nombre: producto.nombre, precioUnitario: producto.precio, cantidad, quitar, observacion });
  }

  async obtener(id) {
    const pedido = await this.pedidoRepo.buscarPorId(validarId(id));
    if (!pedido) throw new NotFoundError('El pedido no existe.');
    return pedido;
  }

  // vista = "cocina": solo los pedidos ya pagados, en orden de llegada
  async listar({ restauranteId, estado, sesion, vista } = {}) {
    const filtros = {};
    if (restauranteId !== undefined) filtros.restauranteId = validarId(restauranteId, 'restauranteId');
    if (sesion !== undefined) filtros.sesion = validarId(sesion, 'sesion');
    if (estado) filtros.estado = estado;
    if (vista === 'cocina') filtros.estados = [ESTADOS.EN_ESPERA, ESTADOS.EN_PREPARACION, ESTADOS.LISTO];
    return this.pedidoRepo.listar(filtros);
  }

  // Cada operación: 1) busca el pedido, 2) el MODELO valida y cambia el estado, 3) se guarda.
  async registrarPago(id, confirmado) {
    const pedido = await this.obtener(id);
    if (confirmado === true) pedido.confirmarPago();
    else if (confirmado === false) pedido.marcarPagoNoConfirmado();
    else throw new ValidationError('El campo "confirmado" debe ser true o false.');
    return this.guardar(pedido);
  }

  async marcarObservacionLeida(id) {
    const pedido = await this.obtener(id);
    pedido.marcarObservacionLeida();
    return this.guardar(pedido);
  }

  async cambiarEstado(id, estado) {
    const pedido = await this.obtener(id);
    if (estado === ESTADOS.EN_PREPARACION) pedido.iniciarProduccion();
    else if (estado === ESTADOS.LISTO) pedido.marcarListo();
    else if (estado === ESTADOS.ENTREGADO) pedido.entregar();
    else throw new ValidationError('El estado debe ser «En preparación», «Listo» o «Entregado».');
    return this.guardar(pedido);
  }

  async cancelar(id, { origen, motivo } = {}) {
    const pedido = await this.obtener(id);
    pedido.cancelar(origen, motivo);
    return this.guardar(pedido);
  }

  async guardar(pedido) {
    await this.pedidoRepo.guardar(pedido);
    return pedido;
  }
}
