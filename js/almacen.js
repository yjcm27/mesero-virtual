// ===== Mesero Virtual: almacenamiento local (LocalStorage) =====
// Lo usan tanto el menú del cliente (cliente.html) como la gestión del restaurante (gestion.html).
// Si ya hay un menú guardado lo usa; si no, parte de los datos de ejemplo de datos.js.
const CLAVE = "mv_menu";

function cargarMenu() {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado) return JSON.parse(guardado);
  } catch (e) { /* si falla, usamos los datos de ejemplo */ }
  return JSON.parse(JSON.stringify(R_SEMILLA)); // copia, para no modificar la semilla
}

// Devuelve true si se pudo guardar (puede fallar si el navegador bloquea LocalStorage)
function guardarMenu(menu) {
  try { localStorage.setItem(CLAVE, JSON.stringify(menu)); return true; } catch (e) { return false; }
}

function reiniciarMenu() {
  try { localStorage.removeItem(CLAVE); } catch (e) { }
}

const R = cargarMenu(); // app.js y gestion.js trabajan con esta variable
