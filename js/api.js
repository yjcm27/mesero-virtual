// ===== Mesero Virtual: conexión con la API (backend) =====
// Aquí se traducen los nombres de campos: el frontend usa n, c, $, d, i, al, m, x
// y la API usa nombre, categoria, precio, descripcion, ingredientes, alergenos, modo, disponible.
const API = "http://localhost:3000/api";

// Hace la petición, y si algo falla lanza un Error con un mensaje claro para el usuario
async function pedir(ruta, opciones = {}) {
  let res;
  try {
    res = await fetch(API + ruta, { headers: { "Content-Type": "application/json" }, ...opciones });
  } catch (e) {
    throw new Error("No se pudo conectar con el servidor. ¿Está encendido el backend?");
  }
  if (res.status === 204) return null; // eliminar responde sin contenido
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(datos.error || "Error " + res.status);
  return datos;
}

// De la API al formato del frontend
const deApi = (p) => ({
  id: p.id, n: p.nombre, c: p.categoria, $: p.precio, d: p.descripcion,
  i: p.ingredientes, al: p.alergenos, m: p.modo,
  img: p.imagenUrl || null, x: p.disponible ? undefined : 1
});

// Del formato del frontend a la API (el formulario ya exigió la declaración de alérgenos)
const aApi = (p, restauranteId) => ({
  restauranteId, nombre: p.n, categoria: p.c, precio: p.$, descripcion: p.d,
  ingredientes: p.i, alergenos: p.al, sinAlergenos: p.al.length === 0,
  modo: p.m, imagenUrl: p.img || "", disponible: !p.x, declaracion: true
});

const listarRestaurantes = () => pedir("/restaurantes");
const listarProductos = async (rid) => (await pedir("/productos?restauranteId=" + rid)).map(deApi);
const crearProducto = async (rid, p) => deApi(await pedir("/productos", { method: "POST", body: JSON.stringify(aApi(p, rid)) }));
const actualizarProducto = async (rid, id, p) => deApi(await pedir("/productos/" + id, { method: "PUT", body: JSON.stringify(aApi(p, rid)) }));
const cambiarDisponibilidad = (id, disponible) => pedir("/productos/" + id + "/disponibilidad", { method: "PATCH", body: JSON.stringify({ disponible }) });
const eliminarProducto = (id) => pedir("/productos/" + id, { method: "DELETE" });


// Menú completo para la pantalla del cliente: restaurantes, cada uno con sus productos
async function cargarMenuCliente() {
  const restaurantes = await listarRestaurantes();
  return Promise.all(restaurantes.map(async (r) => ({
    id: r.id, n: r.nombre, c: r.categoria, loc: r.local,
    t: r.tiempoPrepMin, tm: `${r.tiempoPrepMin}–${r.tiempoPrepMin + 5} min`,
    P: await listarProductos(r.id)
  })));
}