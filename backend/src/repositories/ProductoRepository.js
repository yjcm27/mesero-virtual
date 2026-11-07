import { Producto } from '../models/Producto.js';
import { ConflictError } from '../errors/AppError.js';

// CAPA DE ACCESO A DATOS de productos: SQL con consultas preparadas (los "?" evitan la inyección SQL).
export class ProductoRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async listar({ restauranteId, categoria, q } = {}) {
    let sql = 'SELECT * FROM productos WHERE 1 = 1';
    const params = [];
    if (restauranteId) { sql += ' AND restaurante_id = ?'; params.push(Number(restauranteId)); }
    if (categoria) { sql += ' AND categoria = ?'; params.push(categoria); }
    if (q) { sql += ' AND LOWER(nombre) LIKE ?'; params.push(`%${String(q).toLowerCase()}%`); }
    sql += ' ORDER BY categoria, nombre';
    const [filas] = await this.pool.execute(sql, params);
    return filas.map((f) => Producto.desdeFila(f));
  }

  async buscarPorId(id) {
    const [filas] = await this.pool.execute('SELECT * FROM productos WHERE id = ?', [id]);
    return filas.length > 0 ? Producto.desdeFila(filas[0]) : null;
  }

  async buscarPorNombre(restauranteId, nombre) {
    const [filas] = await this.pool.execute(
      'SELECT * FROM productos WHERE restaurante_id = ? AND LOWER(nombre) = LOWER(?)', [restauranteId, nombre]);
    return filas.length > 0 ? Producto.desdeFila(filas[0]) : null;
  }

  // Devuelve el id que le asignó la base de datos
  async crear(p) {
    try {
      const [resultado] = await this.pool.execute(
        `INSERT INTO productos (restaurante_id, nombre, categoria, precio, descripcion, ingredientes, alergenos, modo, imagen_url, disponible)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.restauranteId, p.nombre, p.categoria, p.precio, p.descripcion, JSON.stringify(p.ingredientes),
         JSON.stringify(p.alergenos), p.modo, p.imagenUrl, p.disponible ? 1 : 0]);
      return resultado.insertId;
    } catch (error) {
      this.traducirError(error);
    }
  }

  async actualizar(id, p) {
    try {
      const [resultado] = await this.pool.execute(
        `UPDATE productos SET nombre = ?, categoria = ?, precio = ?, descripcion = ?, ingredientes = ?, alergenos = ?,
                modo = ?, imagen_url = ?, disponible = ? WHERE id = ?`,
        [p.nombre, p.categoria, p.precio, p.descripcion, JSON.stringify(p.ingredientes), JSON.stringify(p.alergenos),
         p.modo, p.imagenUrl, p.disponible ? 1 : 0, id]);
      return resultado.affectedRows > 0;
    } catch (error) {
      this.traducirError(error);
    }
  }

  async cambiarDisponibilidad(id, disponible) {
    const [resultado] = await this.pool.execute('UPDATE productos SET disponible = ? WHERE id = ?', [disponible ? 1 : 0, id]);
    return resultado.affectedRows > 0;
  }

  async eliminar(id) {
    const [resultado] = await this.pool.execute('DELETE FROM productos WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
  }

  // Convierte el error de "clave repetida" de la base de datos en un error de negocio entendible
  traducirError(error) {
    if (error.code === 'ER_DUP_ENTRY' || /UNIQUE/i.test(error.message)) {
      throw new ConflictError('Ya existe un producto con ese nombre en este restaurante.');
    }
    throw error;
  }
}
