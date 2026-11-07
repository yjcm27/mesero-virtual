import { Pedido } from '../models/Pedido.js';

// CAPA DE ACCESO A DATOS de pedidos.
export class PedidoRepository {
  constructor(pool) {
    this.pool = pool;
  }

  // Guarda el pedido y todos sus renglones DENTRO DE UNA TRANSACCIÓN:
  // o se guarda todo, o no se guarda nada (si algo falla se hace rollback).
  async crearConItems(pedido) {
    const conexion = await this.pool.getConnection();
    try {
      await conexion.beginTransaction();

      // Número consecutivo por sesión y restaurante: 1042-R3-01, 1042-R3-02...
      const [cuenta] = await conexion.execute(
        'SELECT COUNT(*) AS n FROM pedidos WHERE sesion = ? AND restaurante_id = ?', [pedido.sesion, pedido.restauranteId]);
      const consecutivo = String(Number(cuenta[0].n) + 1).padStart(2, '0');
      pedido.numero = `${pedido.sesion}-R${pedido.restauranteId}-${consecutivo}`;

      const [resultado] = await conexion.execute(
        `INSERT INTO pedidos (numero, sesion, mesa, restaurante_id, estado, total, observacion_leida, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [pedido.numero, pedido.sesion, pedido.mesa, pedido.restauranteId, pedido.estado, pedido.total, 0, pedido.creadoEn]);
      pedido.id = resultado.insertId;

      for (const item of pedido.items) {
        await conexion.execute(
          `INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio_unitario, cantidad, quitar, observacion)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [pedido.id, item.productoId, item.nombre, item.precioUnitario, item.cantidad, JSON.stringify(item.quitar), item.observacion]);
      }

      await conexion.commit();
      return pedido;
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release(); // siempre se devuelve la conexión al pool
    }
  }

  async buscarPorId(id) {
    const [filas] = await this.pool.execute('SELECT * FROM pedidos WHERE id = ?', [id]);
    if (filas.length === 0) return null;
    return this.armarPedido(filas[0]);
  }

  // estados: lista opcional de estados permitidos (la usa la vista de Cocina)
  async listar({ restauranteId, estado, estados, sesion } = {}) {
    let sql = 'SELECT * FROM pedidos WHERE 1 = 1';
    const params = [];
    if (restauranteId) { sql += ' AND restaurante_id = ?'; params.push(Number(restauranteId)); }
    if (sesion) { sql += ' AND sesion = ?'; params.push(Number(sesion)); }
    if (estado) { sql += ' AND estado = ?'; params.push(estado); }
    if (estados && estados.length > 0) {
      sql += ` AND estado IN (${estados.map(() => '?').join(', ')})`;
      params.push(...estados);
    }
    sql += ' ORDER BY COALESCE(pagado_en, creado_en) ASC, id ASC'; // orden de llegada
    const [filas] = await this.pool.execute(sql, params);
    const pedidos = [];
    for (const fila of filas) {
      pedidos.push(await this.armarPedido(fila));
    }
    return pedidos;
  }

  // Guarda los cambios de estado del pedido
  async guardar(pedido) {
    const [resultado] = await this.pool.execute(
      `UPDATE pedidos SET estado = ?, observacion_leida = ?, motivo_cancelacion = ?, pagado_en = ?, inicio_en = ?,
              listo_en = ?, entregado_en = ? WHERE id = ?`,
      [pedido.estado, pedido.observacionLeida ? 1 : 0, pedido.motivoCancelacion, pedido.pagadoEn, pedido.inicioEn,
       pedido.listoEn, pedido.entregadoEn, pedido.id]);
    return resultado.affectedRows > 0;
  }

  async armarPedido(fila) {
    const [items] = await this.pool.execute('SELECT * FROM pedido_items WHERE pedido_id = ? ORDER BY id', [fila.id]);
    return Pedido.desdeFila(fila, items);
  }
}
