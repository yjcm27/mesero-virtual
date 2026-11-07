-- Mesero Virtual: esquema de la base de datos (MySQL / MariaDB)
CREATE DATABASE IF NOT EXISTS mesero_virtual CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mesero_virtual;

CREATE TABLE IF NOT EXISTS restaurantes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE,
  categoria VARCHAR(60) NOT NULL,
  local_numero VARCHAR(20) NOT NULL,
  tiempo_prep_min INT NOT NULL DEFAULT 15
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurante_id INT NOT NULL,
  nombre VARCHAR(60) NOT NULL,
  categoria VARCHAR(30) NOT NULL,
  precio INT NOT NULL,
  descripcion VARCHAR(140) NOT NULL,
  ingredientes TEXT NOT NULL,          -- lista en formato JSON, por ejemplo ["Pan","Carne"]
  alergenos TEXT NOT NULL,             -- lista en formato JSON, por ejemplo ["Gluten","Lácteos"]
  modo CHAR(1) NOT NULL DEFAULT 'o',   -- q = quitar ingredientes, o = observaciones, n = sin personalización
  imagen_url VARCHAR(255) NOT NULL DEFAULT '',
  disponible TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_productos_restaurante FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
  UNIQUE KEY uq_producto_nombre (restaurante_id, nombre)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,  -- sesión-restaurante-consecutivo, por ejemplo 1042-R3-01
  sesion INT NOT NULL,
  mesa INT NOT NULL,
  restaurante_id INT NOT NULL,
  estado VARCHAR(20) NOT NULL,
  total INT NOT NULL,
  observacion_leida TINYINT(1) NOT NULL DEFAULT 0,
  motivo_cancelacion VARCHAR(140) NULL,
  creado_en BIGINT NOT NULL,           -- fechas guardadas como milisegundos (Date.now())
  pagado_en BIGINT NULL,
  inicio_en BIGINT NULL,
  listo_en BIGINT NULL,
  entregado_en BIGINT NULL,
  CONSTRAINT fk_pedidos_restaurante FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id),
  INDEX idx_pedidos_restaurante_estado (restaurante_id, estado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedido_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  producto_id INT NULL,                -- si se borra el producto, el renglón se conserva
  nombre VARCHAR(60) NOT NULL,         -- se guarda copia del nombre y del precio en el momento de la compra
  precio_unitario INT NOT NULL,
  cantidad INT NOT NULL,
  quitar TEXT NOT NULL,                -- ingredientes quitados, en formato JSON
  observacion VARCHAR(140) NOT NULL DEFAULT '',
  CONSTRAINT fk_items_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
) ENGINE=InnoDB;
