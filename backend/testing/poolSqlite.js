// SOLO PARA PRUEBAS: imita el "pool" de mysql2 usando la base de datos SQLite que trae Node.js.
// Así los repositorios (con su SQL real) se prueban sin necesitar MySQL instalado.
import { DatabaseSync } from 'node:sqlite';

const ESQUEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE restaurantes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE, categoria TEXT NOT NULL, local_numero TEXT NOT NULL, tiempo_prep_min INTEGER NOT NULL DEFAULT 15);
CREATE TABLE productos (id INTEGER PRIMARY KEY AUTOINCREMENT, restaurante_id INTEGER NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE, nombre TEXT NOT NULL, categoria TEXT NOT NULL, precio INTEGER NOT NULL, descripcion TEXT NOT NULL, ingredientes TEXT NOT NULL, alergenos TEXT NOT NULL, modo TEXT NOT NULL DEFAULT 'o', imagen_url TEXT NOT NULL DEFAULT '', disponible INTEGER NOT NULL DEFAULT 1, UNIQUE (restaurante_id, nombre));
CREATE TABLE pedidos (id INTEGER PRIMARY KEY AUTOINCREMENT, numero TEXT NOT NULL UNIQUE, sesion INTEGER NOT NULL, mesa INTEGER NOT NULL, restaurante_id INTEGER NOT NULL REFERENCES restaurantes(id), estado TEXT NOT NULL, total INTEGER NOT NULL, observacion_leida INTEGER NOT NULL DEFAULT 0, motivo_cancelacion TEXT, creado_en INTEGER NOT NULL, pagado_en INTEGER, inicio_en INTEGER, listo_en INTEGER, entregado_en INTEGER);
CREATE TABLE pedido_items (id INTEGER PRIMARY KEY AUTOINCREMENT, pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE, producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL, nombre TEXT NOT NULL, precio_unitario INTEGER NOT NULL, cantidad INTEGER NOT NULL, quitar TEXT NOT NULL, observacion TEXT NOT NULL DEFAULT '');
INSERT INTO restaurantes (id, nombre, categoria, local_numero, tiempo_prep_min) VALUES (1, 'Burger Craft & Grill', 'Hamburguesas', 'Local 3', 15), (2, 'Trattoria Pizza & Pasta', 'Italiana', 'Local 7', 20);
`;

export function crearPoolSqlite() {
  const db = new DatabaseSync(':memory:');
  db.exec(ESQUEMA);

  // Igual que mysql2: SELECT → [filas]; INSERT/UPDATE/DELETE → [{ insertId, affectedRows }]
  const ejecutar = (sql, params = []) => {
    const sentencia = db.prepare(sql);
    if (/^\s*SELECT/i.test(sql)) return [sentencia.all(...params), undefined];
    const info = sentencia.run(...params);
    return [{ insertId: Number(info.lastInsertRowid), affectedRows: Number(info.changes) }, undefined];
  };
  const conexion = {
    execute: async (sql, params) => ejecutar(sql, params),
    beginTransaction: async () => db.exec('BEGIN'),
    commit: async () => db.exec('COMMIT'),
    rollback: async () => db.exec('ROLLBACK'),
    release: () => {}
  };
  return { execute: async (sql, params) => ejecutar(sql, params), getConnection: async () => conexion, db };
}
