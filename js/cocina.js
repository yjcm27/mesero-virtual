// ===== Mesero Virtual: interfaz de Cocina =====
// Cocina solo ve pedidos YA PAGADOS (En espera, En preparación y Listo), en orden de llegada.
// Flujo: En espera → [Observación leída, si hay observaciones] → Iniciar producción → En preparación → Marcar como listo → Listo
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ESTADOS = { espera: "En espera", prep: "En preparación", listo: "Listo" };
const NOMBRES = { espera: "Por preparar", prep: "En preparación", listo: "Terminados" };

let rid = R[0].id;      // restaurante de esta cocina (más adelante vendrá del login)
let tab = "espera";     // lista que se está viendo
let vistos = null;      // pedidos ya conocidos, para avisar cuando llega uno nuevo
let ultimo = "";        // última versión pintada (para no repintar sin necesidad)

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

// Pedidos de este restaurante que cocina debe ver, del más antiguo (pagado primero) al más nuevo
const pedidos = () => cargarPedidos()
  .filter((o) => o.rid === rid && Object.values(ESTADOS).includes(o.st))
  .sort((a, b) => a.t0 - b.t0);

const tieneObs = (o) => o.items.some((l) => (l.rm && l.rm.length) || l.obs);

// Cambia un pedido directamente en LocalStorage; fn puede devolver false para cancelar el cambio
function actualizar(id, fn) {
  const todos = cargarPedidos(), o = todos.find((x) => x.id === id);
  if (o && fn(o) !== false) guardarPedidos(todos);
  refrescar();
}

// ---------- ACCIONES DE COCINA ----------
function leida(id, v) {
  actualizar(id, (o) => { if (o.st !== "En espera") return false; o.leida = v; });
}

function iniciar(id) {
  actualizar(id, (o) => {
    if (o.st !== "En espera") { toast("Este pedido ya cambió de estado.", 1); return false; }
    if (tieneObs(o) && !o.leida) { toast("Marca «Observación leída» antes de iniciar.", 1); return false; }
    o.st = "En preparación";
    o.tIni = Date.now();
    toast(`Pedido #${o.no} pasó a «En preparación»`);
  });
}

function listo(id) {
  actualizar(id, (o) => {
    if (o.st !== "En preparación") return false;
    o.st = "Listo";
    o.tListo = Date.now();
    toast(`Pedido #${o.no} pasó a «Terminados». Se avisó al cliente ✓`);
  });
}

// ---------- PINTAR ----------
function linea(l) {
  return `<div class="it"><b class="price">${l.q}×</b> ${esc(l.p.n)}` +
    (l.rm || []).map((x) => `<div class="sin">SIN ${esc(x).toUpperCase()}</div>`).join("") +
    (l.obs ? `<div class="obs">⚠ OBSERVACIÓN DEL CLIENTE: ${esc(l.obs)}</div>` : "") + `</div>`;
}

function acciones(o) {
  if (o.st === "En espera") {
    const obs = tieneObs(o);
    return (obs ? `<label class="leida"><input type="checkbox" ${o.leida ? "checked" : ""} onchange="leida(${o.id},this.checked)"> Observación leída</label>` : "") +
      `<button class="btn full" ${obs && !o.leida ? "disabled" : ""} onclick="iniciar(${o.id})">🔥 Iniciar producción</button>` +
      (obs && !o.leida ? `<div class="mut" style="margin-top:6px">Este pedido tiene observaciones: léelas y márcalas para poder iniciar.</div>` : "");
  }
  if (o.st === "En preparación") return `<button class="btn ok full" onclick="listo(${o.id})">✔ Marcar como listo</button>`;
  return `<div class="note" style="border-color:var(--ok)">✅ Listo. Esperando la entrega en el mostrador.</div>`;
}

function tarjeta(o) {
  const t = o.st === "Listo" ? o.tListo : o.t0;
  return `<div class="card ${tieneObs(o) ? "conobs" : ""}">
    <div class="row sp"><h3>#${esc(o.no)}</h3><span class="mut">⏱ ${o.st === "Listo" ? "Listo hace" : "En cola hace"} <b data-t="${t}">0:00</b></span></div>
    <div class="mut">Mesa ${o.mesa} · Sesión #${o.sesion}${tieneObs(o) ? ' · <b style="color:#ff9800">CON OBSERVACIONES</b>' : ""}</div>
    <div style="margin-top:8px">${o.items.map(linea).join("")}</div>${acciones(o)}</div>`;
}

function pintar(lista) {
  const por = (e) => lista.filter((o) => o.st === ESTADOS[e]);
  $("#tabs").innerHTML = Object.keys(ESTADOS).map((e) => `<button class="chip ${e === tab ? "on" : ""}" onclick="tab='${e}';ultimo='';refrescar()">${NOMBRES[e]} (${por(e).length})</button>`).join("");
  const l = por(tab);
  $("#lista").innerHTML = l.length ? l.map(tarjeta).join("") :
    `<div class="card" style="text-align:center"><div style="font-size:40px">${tab === "listo" ? "🍽️" : "✅"}</div><p class="mut">No hay pedidos en «${NOMBRES[tab]}».</p></div>`;
}

// Lee los pedidos guardados, avisa de los nuevos o cancelados y repinta solo si algo cambió
function refrescar() {
  const lista = pedidos();
  if (vistos) {
    lista.forEach((o) => { if (o.st === "En espera" && !vistos.has(o.id)) { toast(`Nuevo pedido #${o.no}`); beep(); } });
    cargarPedidos().filter((o) => o.rid === rid && o.st === "Cancelado" && vistos.has(o.id)).forEach((o) => toast(`El cliente canceló el pedido #${o.no}`, 1));
  }
  vistos = new Set(lista.map((o) => o.id));
  const firma = JSON.stringify(lista) + tab;
  if (firma !== ultimo) { ultimo = firma; pintar(lista); }
}

// ---------- INICIO ----------
$("#rest").innerHTML = R.map((r) => `<option value="${r.id}">${esc(r.n)}</option>`).join("");
$("#rest").onchange = (e) => { rid = Number(e.target.value); vistos = null; ultimo = ""; refrescar(); };
$("#limpiar").onclick = () => { if (confirm("Se borrarán todos los pedidos guardados. ¿Continuar?")) { reiniciarPedidos(); ultimo = ""; refrescar(); } };
window.addEventListener("storage", (e) => { if (e.key === CLAVE_P) refrescar(); }); // el cliente hizo un cambio en otra pestaña
setInterval(refrescar, 2000);                                                        // respaldo por si el evento no llega
setInterval(() => document.querySelectorAll("[data-t]").forEach((e) => { // cronómetros en vivo
  const s = Math.max(0, Math.floor((Date.now() - e.dataset.t) / 1000));
  e.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}), 1000);
refrescar();
