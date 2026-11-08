// ===== Mesero Virtual: gestión del menú del restaurante (CRUD con la API) =====
// C = crear (guardar con el formulario vacío)   R = leer (pintar la lista)
// U = actualizar (editar y guardar)             D = eliminar
const $ = (s) => document.querySelector(s);
const ALERGENOS = ["Gluten", "Lácteos", "Huevo", "Pescado", "Soya", "Ajonjolí", "Nueces", "Maní", "Cebolla", "Ajo"];
const MODOS = { q: "Ingredientes removibles", o: "Solo observaciones", n: "Sin personalización" };

let R = [];          // restaurantes (vienen de la API)
let editId = null;   // id del producto en edición (null = producto nuevo)
let imgActual = null; // foto del formulario como texto (data URL); null = sin foto
let rid = null;      // restaurante que se está gestionando
let lista = [];      // productos del restaurante actual (vienen de la API)
const M = (n) => "$" + n.toLocaleString("es-CO");
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Aviso temporal (verde = bien, rojo = error)
let tt;
function toast(m, mal) {
  const e = $("#toast");
  e.textContent = m;
  e.className = "on" + (mal ? " bad" : "");
  clearTimeout(tt);
  tt = setTimeout(() => (e.className = ""), 2600);
}

// Muestra un error de validación y devuelve null (así leerForm() corta ahí)
function fallo(msg, campo) {
  $("#er").textContent = msg;
  if (campo) $(campo).focus();
  return null;
}

// ---------- VALIDAR Y LEER EL FORMULARIO ----------
function leerForm() {
  $("#er").textContent = "";
  const n = $("#f-n").value.replace(/\s+/g, " ").trim();
  const c = $("#f-c").value.trim();
  const precio = Number($("#f-p").value);
  const d = $("#f-d").value.trim();
  const ing = [...new Set($("#f-i").value.split(",").map((x) => x.trim()).filter(Boolean))];
  const al = [...document.querySelectorAll(".al-op:checked")].map((x) => x.value);
  const sinAl = $("#alsin").checked, modo = $("#f-m").value;

  if (n.length < 3 || n.length > 60) return fallo("El nombre debe tener entre 3 y 60 caracteres.", "#f-n");
  if (/[<>]/.test([n, c, d, ing.join()].join(" "))) return fallo("No se permiten los símbolos < y >.", "#f-n");
  if (lista.some((p) => p.id !== editId && p.n.toLowerCase() === n.toLowerCase())) return fallo("Ya existe un producto con ese nombre en este restaurante.", "#f-n");
  if (c.length < 3) return fallo("Escribe una categoría (mínimo 3 caracteres).", "#f-c");
  if (c.length > 30) return fallo("La categoría no puede superar 30 caracteres.", "#f-c");
  if (d.length < 10 || d.length > 140) return fallo("La descripción debe tener entre 10 y 140 caracteres.", "#f-d");
  if (!Number.isInteger(precio) || precio <= 0 || precio > 500000) return fallo("El precio debe ser un número entero mayor que 0 y hasta $500.000.", "#f-p");
  if (ing.length < 1) return fallo("Agrega al menos un ingrediente.", "#f-i");
  if (modo === "q" && ing.length < 2) return fallo("Para que el cliente pueda quitar ingredientes, el producto necesita al menos 2.", "#f-i");
  if (!sinAl && !al.length) return fallo("Declara los alérgenos: marca los que apliquen o «Sin alérgenos».");
  if (!$("#f-ack").checked) return fallo("Debes aceptar la declaración de alérgenos.", "#f-ack");

   const p = { n, c, $: precio, d, i: ing, al: sinAl ? [] : al, m: modo };
  if ($("#f-x").checked) p.x = 1; // x = agotado
  if (imgActual) p.img = imgActual; // foto del platillo
  return p;
}

// ---------- CREAR y ACTUALIZAR ----------
async function guardar(ev) {
  ev.preventDefault();
  const p = leerForm();
  if (!p) return;
  const edicion = editId !== null, boton = $("#guardar");
  boton.disabled = true;
  try {
    if (edicion) await actualizarProducto(rid, editId, p);
    else await crearProducto(rid, p);
    toast(edicion ? "Producto actualizado ✓" : "Producto creado ✓");
    limpiar();
    await cargar();
  } catch (e) {
    fallo(e.message);
  } finally {
    boton.disabled = false;
  }
}

// Pide los productos a la API y pinta la lista
async function cargar() {
  try { lista = await listarProductos(rid); }
  catch (e) { lista = []; toast(e.message, 1); }
  pintar();
}
// ---------- LEER (pintar la lista) ----------
function pintar() {
  const q = $("#q").value.trim().toLowerCase();
  const prods = lista.filter((p) => !q || (p.n + " " + p.c).toLowerCase().includes(q));
  $("#cuenta").textContent = `(${lista.length})`;
  $("#cats").innerHTML = [...new Set(lista.map((p) => p.c))].map((c) => `<option value="${esc(c)}">`).join("");
  $("#lista").innerHTML = prods.length ? prods.map((p) => `
    <div class="card">
      <div class="emo">${p.img ? `<img src="${p.img}" alt="">` : esc(p.n.charAt(0).toUpperCase())}</div>
        <div class="col"><h3>${esc(p.n)} ${p.x ? '<span class="tag" style="color:var(--mut)">Agotado</span>' : ""}</h3>
          <div class="mut">${esc(p.c)} · <b class="price">${M(p.$)}</b></div>
          <div class="mut">${p.al.length ? "⚠ " + p.al.map(esc).join(" · ") : "Sin alérgenos"} · ${MODOS[p.m]}</div></div></div>
      <div class="acc">
        <button class="btn alt" data-a="edit" data-id="${p.id}">✏️ Editar</button>
        <button class="btn alt" data-a="agot" data-id="${p.id}">${p.x ? "Marcar disponible" : "Marcar agotado"}</button>
        <button class="btn red" data-a="del" data-id="${p.id}">🗑 Eliminar</button>
      </div>
    </div>`).join("") : `<div class="card mut" style="text-align:center">No hay productos para mostrar.</div>`;
}

// ---------- ACTUALIZAR (cargar en el formulario) / ELIMINAR / AGOTADO ----------
function editar(id) {
  const p = lista.find((x) => x.id === id);
  if (!p) return;
  editId = id;
  $("#f-n").value = p.n; $("#f-c").value = p.c; $("#f-p").value = p.$;
  $("#f-d").value = p.d; $("#f-i").value = p.i.join(", "); $("#f-m").value = p.m; $("#f-x").checked = !!p.x;
  document.querySelectorAll(".al-op").forEach((x) => (x.checked = p.al.includes(x.value)));
  $("#alsin").checked = !p.al.length;
  $("#f-ack").checked = false; // debe confirmar de nuevo la declaración
  mostrarFoto(p.img || null);
  $("#titulo").textContent = "Editar producto";
  $("#guardar").textContent = "Guardar cambios";
  $("#cancelar").classList.remove("hide");
  $("#er").textContent = "";
  $("#form").scrollIntoView({ behavior: "smooth" });
}
async function eliminar(id) {
  const p = lista.find((x) => x.id === id);
  if (!p || !confirm(`¿Eliminar «${p.n}»? Esta acción no se puede deshacer.`)) return;
  try {
    await eliminarProducto(id);
    if (editId === id) limpiar();
    await cargar();
    toast("Producto eliminado");
  } catch (e) { toast(e.message, 1); }
}

async function alternarAgotado(id) {
  const p = lista.find((x) => x.id === id);
  if (!p) return;
  const agotar = !p.x;
  try {
    await cambiarDisponibilidad(id, !agotar);
    await cargar();
    toast(agotar ? "Marcado como agotado" : "Disponible de nuevo");
  } catch (e) { toast(e.message, 1); }
}

function limpiar() {
  $("#form").reset();
  editId = null;
  mostrarFoto(null);
  $("#titulo").textContent = "Nuevo producto";
  $("#guardar").textContent = "Guardar producto";
  $("#cancelar").classList.add("hide");
  $("#er").textContent = "";
}

// ---------- FOTO DEL PLATILLO ----------
// Muestra (o esconde) la vista previa y recuerda la foto actual
function mostrarFoto(dataUrl) {
  imgActual = dataUrl;
  $("#prev").src = dataUrl || "";
  $("#prevbox").classList.toggle("hide", !dataUrl);
  if (!dataUrl) $("#f-img").value = "";
}

// Reduce la imagen a máximo 480 px y la convierte a JPG liviano (así cabe en LocalStorage)
function reducirImagen(archivo) {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo), img = new Image();
    img.onload = () => {
      const k = Math.min(1, 480 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      const g = c.getContext("2d");
      g.fillStyle = "#fff"; // fondo blanco por si el PNG tiene transparencia
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(); };
    img.src = url;
  });
}

async function elegirFoto() {
  const f = $("#f-img").files[0];
  if (!f) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) { mostrarFoto(imgActual); return fallo("La foto debe ser JPG, PNG o WebP."); }
  if (f.size > 8 * 1024 * 1024) { mostrarFoto(imgActual); return fallo("La foto pesa más de 8 MB. Elige una más liviana."); }
  try {
    $("#er").textContent = "";
    mostrarFoto(await reducirImagen(f));
  } catch (e) {
    mostrarFoto(imgActual);
    fallo("No se pudo leer la imagen. Prueba con otra.");
  }
}

// ---------- INICIO: armar la página y conectar eventos ----------
$("#rest").innerHTML = R.map((r) => `<option value="${r.id}">${esc(r.n)}</option>`).join("");
$("#alerg").innerHTML = ALERGENOS.map((a) => `<label><input type="checkbox" class="al-op" value="${a}"> ${a}</label>`).join("") +
  `<label><input type="checkbox" id="alsin"> Sin alérgenos</label>`;

$("#rest").onchange = (e) => { rid = Number(e.target.value); limpiar(); pintar(); };
$("#form").onsubmit = guardar;
$("#cancelar").onclick = limpiar;
$("#f-img").onchange = elegirFoto;
$("#quitar").onclick = () => mostrarFoto(null);
$("#q").oninput = pintar;
$("#alerg").onchange = (e) => { // «Sin alérgenos» y los alérgenos concretos se excluyen entre sí
  if (e.target.id === "alsin" && e.target.checked) document.querySelectorAll(".al-op").forEach((x) => (x.checked = false));
  else if (e.target.classList.contains("al-op") && e.target.checked) $("#alsin").checked = false;
};
$("#lista").onclick = (e) => {
  const b = e.target.closest("button[data-a]");
  if (!b) return;
    ({ edit: editar, del: eliminar, agot: alternarAgotado })[b.dataset.a](Number(b.dataset.id));
};
$("#rest").onchange = (e) => { rid = Number(e.target.value); limpiar(); cargar(); };

async function iniciar() {
  try { R = await listarRestaurantes(); }
  catch (e) { return toast(e.message, 1); }
  $("#rest").innerHTML = R.map((r) => `<option value="${r.id}">${esc(r.nombre)}</option>`).join("");
  rid = R[0].id;
  await cargar();
}
iniciar();
