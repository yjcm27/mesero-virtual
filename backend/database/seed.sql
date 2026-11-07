-- Datos de ejemplo: 4 restaurantes y 11 productos
USE mesero_virtual;

INSERT INTO restaurantes (id, nombre, categoria, local_numero, tiempo_prep_min) VALUES
 (1, 'Burger Craft & Grill', 'Hamburguesas artesanales', 'Local 3', 15),
 (2, 'Trattoria Pizza & Pasta', 'Italiana y pizzas al horno', 'Local 7', 20),
 (3, 'Sabor Latino Grill', 'Cortes y comida típica', 'Local 9', 15),
 (4, 'Sushi Roll & Asian', 'Japonesa y fusión', 'Local 12', 10);

INSERT INTO productos (restaurante_id, nombre, categoria, precio, descripcion, ingredientes, alergenos, modo, disponible) VALUES
 (1, 'Burger Doble Queso Bacon', 'Hamburguesas', 28900, 'Doble carne 150g, cheddar fundido, tocineta crocante y salsa ahumada.', '["Pan brioche","Carne 150 g","Cheddar","Tocineta","Salsa ahumada"]', '["Gluten","Lácteos"]', 'q', 1),
 (1, 'Trufa & Mushroom Burger', 'Hamburguesas', 32000, 'Champiñones en mantequilla de trufa, queso suizo y cebolla caramelizada.', '["Pan brioche","Carne","Champiñones","Mantequilla de trufa","Queso suizo","Cebolla caramelizada"]', '["Gluten","Lácteos","Cebolla"]', 'q', 1),
 (1, 'Papas Rústicas con Queso & Bacon', 'Acompañamientos', 14500, 'Papas en cascos con dip de cheddar y tocineta picada.', '["Papa","Dip de cheddar","Tocineta"]', '["Lácteos"]', 'n', 1),
 (1, 'Limonada de Coco Menta', 'Bebidas', 9500, 'Limonada cremada con leche de coco y menta fresca.', '["Limón","Leche de coco","Menta"]', '[]', 'n', 0),
 (2, 'Pizza Pepperoni Suprema', 'Pizzas', 34900, 'Salsa san marzano, mozzarella fiordilatte y generoso pepperoni.', '["Masa","Salsa san marzano","Mozzarella fiordilatte","Pepperoni"]', '["Gluten","Lácteos"]', 'q', 1),
 (2, 'Fettuccine Alfredo', 'Pastas', 29500, 'Pasta artesanal en salsa alfredo con parmesano y pollo a la parrilla.', '["Pasta artesanal","Salsa alfredo","Parmesano","Pollo a la parrilla"]', '["Gluten","Lácteos","Huevo"]', 'o', 1),
 (2, 'Pan de Ajo & Hierbas', 'Entradas', 11000, 'Cuatro lonjas de baguette tostado con mantequilla de ajo.', '["Baguette","Mantequilla de ajo","Hierbas"]', '["Gluten","Lácteos","Ajo"]', 'n', 1),
 (3, 'Parrilla Mixta Personal', 'Carnes', 38000, 'Lomo de res, pollo, chorizo, patacón y papa criolla.', '["Lomo de res","Pollo","Chorizo","Patacón","Papa criolla"]', '[]', 'o', 1),
 (3, 'Desgranado Gourmet Típico', 'Especialidades', 26000, 'Maíz tierno con pollo, carne, queso costeño, ripio y tártara.', '["Maíz tierno","Pollo","Carne","Queso costeño","Ripio","Salsa tártara"]', '["Lácteos","Huevo"]', 'o', 1),
 (4, 'Philadelphia Roll (10 piezas)', 'Rolls', 31000, 'Salmón fresco, queso crema y aguacate en ajonjolí tostado.', '["Salmón","Queso crema","Aguacate","Ajonjolí","Arroz"]', '["Pescado","Lácteos","Ajonjolí"]', 'o', 1),
 (4, 'Poke Bowl Salmón Teriyaki', 'Bowls', 33500, 'Arroz sushi, salmón marinado, edamame, mango y salsa teriyaki.', '["Arroz sushi","Salmón","Edamame","Mango","Salsa teriyaki"]', '["Pescado","Soya"]', 'n', 1);
