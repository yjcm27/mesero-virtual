// ===== Mesero Virtual: interfaz de Cocina (conectada a la API) =====
// Cocina solo ve pedidos YA PAGADOS (En espera, En preparación y Listo), en orden de llegada.
// Flujo: En espera → [Observación leída, si hay observaciones] → Iniciar producción → En preparación → Marcar como listo → Listo
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ESTADOS = { espera: "En espera", prep: "En preparación", listo: "Listo" };
const NOMBRES = { espera: "Por preparar", prep: "En preparación", listo: "Terminados" };

let R = [];             // restaurantes (vienen de la API)
let rid = null;         // restaurante de esta cocina (más adelante vendrá del login)
let tab = "espera";     // lista que se está viendo
let vistos = null;      // pedidos ya conocidos (id → número), para avisar cuando llega o sale uno
let ultimo = "";        // última versión pintada (para no repintar sin necesidad)
let sinConexion = false;

// Aviso temporal y sonido de pedido nuevo
let tt;
function toast(m, mal) {
  const e = $("#toast");
  e.textContent = m;
  e.className = "on" + (mal ? " bad" : "");
  clearTimeout(tt);
  tt = setTimeout(() => (e.className = ""), 3000);
}
function beep() {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)(), g = c.createGain(), x = c.createOscillator();
    g.gain.value = 0.2; x.frequency.value = 880; x.connect(g); g.connect(c.destination);
    x.start(); x.stop(c.currentTime + 0.25);
  } catch (e) { /* el navegador puede bloquear el sonido hasta que se toque la pantalla */ }
}

// Pedidos pagados de este restaurante, del más antiguo (pagado primero) al más nuevo
async function pedidos() {
  const todos = await listarPedidosCocina(rid);
  return todos.filter((o) => Object.values(ESTADOS).includes(o.estado)).sort((a, b) => a.pagadoEn - b.pagadoEn);
}

// ---------- ACCIONES DE COCINA (cada una llama a la API) ----------
async function accion(fn, mensaje) {
  try { await fn(); if (mensaje) toast(mensaje); }
  catch (e) { toast(e.message, 1); }
  ultimo = "";
  await refrescar();
}
const leida = (id) => accion(() => marcarObservacionLeida(id));
const iniciar = (id) => accion(() => cambiarEstado(id, "En preparación"), "Pedido pasó a «En preparación»");
const listo = (id) => accion(() => cambiarEstado(id, "Listo"), "Pedido pasó a «Terminados»");

// ---------- PINTAR ----------
function linea(l) {
  return `<div class="it"><b class="price">${l.cantidad}×</b> ${esc(l.nombre)}` +
    l.quitar.map((x) => `<div class="sin">SIN ${esc(x).toUpperCase()}</div>`).join("") +
    (l.observacion ? `<div class="obs">⚠ OBSERVACIÓN DEL CLIENTE: ${esc(l.observacion)}</div>` : "") + `</div>`;
}

function acciones(o) {
  if (o.estado === "En espera") {
    const obs = o.tieneObservaciones, bloqueado = obs && !o.observacionLeida;
    return (obs ? (o.observacionLeida
        ? `<div class="leida">✔ Observación leída</div>`
        : `<label class="leida"><input type="checkbox" onchange="if(this.checked)leida(${o.id})"> Observación leída</label>`) : "") +
      `<button class="btn full" ${bloqueado ? "disabled" : ""} onclick="iniciar(${o.id})">🔥 Iniciar producción</button>` +
      (bloqueado ? `<div class="mut" style="margin-top:6px">Este pedido tiene observaciones: léelas y márcalas para poder iniciar.</div>` : "");
  }
  if (o.estado === "En preparación") return `<button class="btn ok full" onclick="listo(${o.id})">✔ Marcar como listo</button>`;
  return `<div class="note" style="border-color:var(--ok)">✅ Listo. Esperando la entrega en el mostrador.</div>`;
}

function tarjeta(o) {
  const t = o.estado === "Listo" ? o.listoEn : o.pagadoEn;
  return `<div class="card ${o.tieneObservaciones ? "conobs" : ""}">
    <div class="row sp"><h3>#${esc(o.numero)}</h3><span class="mut">⏱ ${o.estado === "Listo" ? "Listo hace" : "En cola hace"} <b data-t="${t}">0:00</b></span></div>
    <div class="mut">Mesa ${o.mesa} · Sesión #${o.sesion}${o.tieneObservaciones ? ' · <b style="color:#ff9800">CON OBSERVACIONES</b>' : ""}</div>
    <div style="margin-top:8px">${o.items.map(linea).join("")}</div>${acciones(o)}</div>`;
}

function pintar(lista) {
  const por = (e) => lista.filter((o) => o.estado === ESTADOS[e]);
  $("#tabs").innerHTML = Object.keys(ESTADOS).map((e) => `<button class="chip ${e === tab ? "on" : ""}" onclick="tab='${e}';ultimo='';refrescar()">${NOMBRES[e]} (${por(e).length})</button>`).join("");
  const l = por(tab);
  $("#lista").innerHTML = l.length ? l.map(tarjeta).join("") :
    `<div class="card" style="text-align:center"><div style="font-size:40px">${tab === "listo" ? "🍽️" : "✅"}</div><p class="mut">No hay pedidos en «${NOMBRES[tab]}».</p></div>`;
}

// Pide los pedidos a la API, avisa de los nuevos o de los que salieron, y repinta solo si algo cambió
async function refrescar() {
  let lista;
  try { lista = await pedidos(); sinConexion = false; }
  catch (e) { if (!sinConexion) toast(e.message, 1); sinConexion = true; return; }
  if (vistos) {
    lista.forEach((o) => { if (o.estado === "En espera" && !vistos.has(o.id)) { toast(`Nuevo pedido #${o.numero}`); beep(); } });
    const ids = new Set(lista.map((o) => o.id));
    vistos.forEach((numero, id) => { if (!ids.has(id)) toast(`El pedido #${numero} ya no está en la cola (cancelado o entregado)`, 1); });
  }
  vistos = new Map(lista.map((o) => [o.id, o.numero]));
  const firma = JSON.stringify(lista) + tab;
  if (firma !== ultimo) { ultimo = firma; pintar(lista); }
}

// ---------- INICIO ----------
async function arrancar() {
  try { R = await listarRestaurantes(); }
  catch (e) { return toast(e.message, 1); }
  $("#rest").innerHTML = R.map((r) => `<option value="${r.id}">${esc(r.nombre)}</option>`).join("");
  rid = R[0].id;
  await refrescar();
  setInterval(refrescar, 3000);   // consulta la API cada 3 segundos
}
$("#rest").onchange = (e) => { rid = Number(e.target.value); vistos = null; ultimo = ""; refrescar(); };
setInterval(() => document.querySelectorAll("[data-t]").forEach((e) => { // cronómetros en vivo
  const s = Math.max(0, Math.floor((Date.now() - e.dataset.t) / 1000));
  e.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}), 1000);
arrancar();
