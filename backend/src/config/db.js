import mysql from 'mysql2/promise';

// Pool de conexiones a MySQL. Los datos de conexión se leen del archivo .env
export function crearPool() {
  return mysql.createPool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'mesero_virtual',
    waitForConnections: true,
    connectionLimit: 10
  });
}
