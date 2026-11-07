import { BusinessRuleError, ValidationError } from '../errors/AppError.js';

export const ESTADOS = Object.freeze({
  ENVIANDO: 'Enviando',
  PAGO_NO_CONFIRMADO: 'Pago no confirmado',
  EN_ESPERA: 'En espera',
  EN_PREPARACION: 'En preparación',
  LISTO: 'Listo',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado'
});

// Un renglón del pedido: producto, cantidad y personalización
export class ItemPedido {
  constructor({ productoId, nombre, precioUnitario, cantidad, quitar = [], observacion = '' }) {
    this.productoId = productoId;
    this.nombre = nombre;
    this.precioUnitario = precioUnitario;
    this.cantidad = cantidad;
    this.quitar = quitar;         // ingredientes que el cliente no quiere
    this.observacion = observacion;
  }

  get subtotal() {
    return this.precioUnitario * this.cantidad;
  }

  tieneObservaciones() {
    return this.quitar.length > 0 || this.observacion !== '';
  }
}

// Clase MODELO del pedido. Encapsula el ciclo de vida:
// Enviando → En espera → En preparación → Listo → Entregado   (y Pago no confirmado / Cancelado)
// Cada método valida que la transición sea legal; si no, lanza un error de regla de negocio.
export class Pedido {
  constructor({ id = null, numero = '', sesion, mesa, restauranteId, estado = ESTADOS.ENVIANDO, items = [],
                observacionLeida = false, motivoCancelacion = '', creadoEn = Date.now(),
                pagadoEn = null, inicioEn = null, listoEn = null, entregadoEn = null }) {
    this.id = id;
    this.numero = numero;
    this.sesion = sesion;
    this.mesa = mesa;
    this.restauranteId = restauranteId;
    this.estado = estado;
    this.items = items;
    this.observacionLeida = observacionLeida;
    this.motivoCancelacion = motivoCancelacion;
    this.creadoEn = creadoEn;
    this.pagadoEn = pagadoEn;
    this.inicioEn = inicioEn;
    this.listoEn = listoEn;
    this.entregadoEn = entregadoEn;
  }

  static desdeFila(fila, items) {
    return new Pedido({
      id: fila.id, numero: fila.numero, sesion: fila.sesion, mesa: fila.mesa, restauranteId: fila.restaurante_id,
      estado: fila.estado, observacionLeida: Boolean(fila.observacion_leida), motivoCancelacion: fila.motivo_cancelacion ?? '',
      creadoEn: fila.creado_en, pagadoEn: fila.pagado_en, inicioEn: fila.inicio_en, listoEn: fila.listo_en,
      entregadoEn: fila.entregado_en,
      items: items.map((i) => new ItemPedido({
        productoId: i.producto_id, nombre: i.nombre, precioUnitario: i.precio_unitario, cantidad: i.cantidad,
        quitar: JSON.parse(i.quitar), observacion: i.observacion
      }))
    });
  }

  get total() {
    return this.items.reduce((suma, item) => suma + item.subtotal, 0);
  }

  tieneObservaciones() {
    return this.items.some((item) => item.tieneObservaciones());
  }

  // Revisa que el estado actual permita la acción; si no, lanza el error
  exigirEstado(permitidos, accion) {
    if (!permitidos.includes(this.estado)) {
      throw new BusinessRuleError(`No se puede ${accion} un pedido en estado «${this.estado}».`);
    }
  }

  confirmarPago() {
    // También acepta "Pago no confirmado": el comprobante puede llegar tarde
    this.exigirEstado([ESTADOS.ENVIANDO, ESTADOS.PAGO_NO_CONFIRMADO], 'confirmar el pago de');
    this.estado = ESTADOS.EN_ESPERA;
    this.pagadoEn = Date.now();
  }

  marcarPagoNoConfirmado() {
    this.exigirEstado([ESTADOS.ENVIANDO], 'marcar sin pago');
    this.estado = ESTADOS.PAGO_NO_CONFIRMADO;
  }

  marcarObservacionLeida() {
    this.exigirEstado([ESTADOS.EN_ESPERA], 'marcar como leída la observación de');
    if (!this.tieneObservaciones()) {
      throw new BusinessRuleError('Este pedido no tiene observaciones.');
    }
    this.observacionLeida = true;
  }

  iniciarProduccion() {
    this.exigirEstado([ESTADOS.EN_ESPERA], 'iniciar la producción de');
    if (this.tieneObservaciones() && !this.observacionLeida) {
      throw new BusinessRuleError('Cocina debe marcar «Observación leída» antes de iniciar este pedido.');
    }
    this.estado = ESTADOS.EN_PREPARACION;
    this.inicioEn = Date.now();
  }

  marcarListo() {
    this.exigirEstado([ESTADOS.EN_PREPARACION], 'marcar como listo');
    this.estado = ESTADOS.LISTO;
    this.listoEn = Date.now();
  }

  entregar() {
    this.exigirEstado([ESTADOS.LISTO], 'entregar');
    this.estado = ESTADOS.ENTREGADO;
    this.entregadoEn = Date.now();
  }

  // El cliente solo puede cancelar en "En espera". El administrador, en cualquier estado
  // antes de "Entregado", y siempre indicando el motivo.
  cancelar(origen, motivo = '') {
    if (origen === 'cliente') {
      this.exigirEstado([ESTADOS.EN_ESPERA], 'cancelar (como cliente)');
    } else if (origen === 'administrador') {
      this.exigirEstado(
        [ESTADOS.ENVIANDO, ESTADOS.PAGO_NO_CONFIRMADO, ESTADOS.EN_ESPERA, ESTADOS.EN_PREPARACION, ESTADOS.LISTO],
        'cancelar'
      );
      if (String(motivo).trim().length < 3) {
        throw new ValidationError('El administrador debe indicar el motivo de la cancelación.');
      }
    } else {
      throw new ValidationError('El origen de la cancelación debe ser «cliente» o «administrador».');
    }
    this.estado = ESTADOS.CANCELADO;
    this.motivoCancelacion = String(motivo).trim();
  }

  toJSON() {
    return {
      id: this.id, numero: this.numero, sesion: this.sesion, mesa: this.mesa, restauranteId: this.restauranteId,
      estado: this.estado, total: this.total, observacionLeida: this.observacionLeida,
      tieneObservaciones: this.tieneObservaciones(), motivoCancelacion: this.motivoCancelacion,
      creadoEn: this.creadoEn, pagadoEn: this.pagadoEn, inicioEn: this.inicioEn, listoEn: this.listoEn,
      entregadoEn: this.entregadoEn,
      items: this.items.map((i) => ({
        productoId: i.productoId, nombre: i.nombre, precioUnitario: i.precioUnitario, cantidad: i.cantidad,
        quitar: i.quitar, observacion: i.observacion, subtotal: i.subtotal
      }))
    };
  }
}
