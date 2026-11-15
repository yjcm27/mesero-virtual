// CAPA DE ACCESO A DATOS: solo habla con la base de datos (SQL). No tiene reglas de negocio.
export class RestauranteRepository {
  constructor(pool) {
    this.pool = pool; // el pool de conexiones se "inyecta" desde fuera (inyección de dependencias)
  }

  async listar() {
    const [filas] = await this.pool.execute('SELECT * FROM restaurantes ORDER BY id');
    return filas.map((f) => this.aObjeto(f));
  }

  async buscarPorId(id) {
    const [filas] = await this.pool.execute('SELECT * FROM restaurantes WHERE id = ?', [id]);
    return filas.length > 0 ? this.aObjeto(filas[0]) : null;
  }

  async actualizarConfig(id, tiempoPrepMin, capacidad) {
    await this.pool.execute(
      'UPDATE restaurantes SET tiempo_prep_min = ?, capacidad = ? WHERE id = ?',
      [tiempoPrepMin, capacidad, id]
    );
    return this.buscarPorId(id);
  }

  aObjeto(f) {
    return {
      id: f.id,
      nombre: f.nombre,
      categoria: f.categoria,
      local: f.local_numero,
      tiempoPrepMin: f.tiempo_prep_min,
      capacidad: f.capacidad
    };
  }
}