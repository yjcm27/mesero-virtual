// ===== Mesero Virtual: panel del Administrador =====
// Tres secciones: Ventas (día, mes y año), Pedidos (activos, completados y cancelados con motivo) y Configuración (tiempos y capacidad).
// El menú se gestiona en gestion.html. Cocina y Mostrador tienen sus propias pantallas.
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const M = (n) => "$" + Math.round(n).toLocaleString("es-CO");

const SECCIONES = { ventas: "Ventas", pedidos: "Pedidos", config: "Configuración" };
const VENDIDOS = ["En espera", "En preparación", "Listo", "Entregado"];                       // pedidos con el pago confirmado
const ACTIVOS = ["Enviando", "Pago no confirmado", "En espera", "En preparación", "Listo"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MOTIVOS = ["Se agotó un ingrediente", "Error en el pedido", "La cocina está saturada", "Pedido duplicado"];
const LISTAS = { activos: "Activos", completados: "Completados", cancelados: "Cancelados" };

let rid = R[0].id;          // restaurante de esta sesión (más adelante vendrá del login)
let seccion = "ventas";     // sección que se está viendo
let periodo = "dia";        // dia, mes o año
let ref = new Date();       // fecha de referencia del periodo
let filtro = "activos";     // lista de pedidos que se está viendo
let pendiente = null;       // id del pedido que se va a cancelar
let ultimo = "";

// Aviso temporal
let tt;
function toast(m, mal) {
    const e = $("#toast");
    e.textContent = m;
    e.className = "on" + (mal ? " bad" : "");
    clearTimeout(tt);
    tt = setTimeout(() => (e.className = ""), 3000);
}

const restaurante = () => R.find((r) => r.id === rid);
const pedidos = () => cargarPedidos().filter((o) => o.rid === rid);

// ---------- VENTAS ----------
// Una venta es un pedido con el pago confirmado y que no fue cancelado
const ventas = () => pedidos().filter((o) => VENDIDOS.includes(o.st) && o.t0 > 0);

// Inicio y fin (en milisegundos) del periodo elegido
function limites() {
    const a = ref.getFullYear(), m = ref.getMonth(), d = ref.getDate();
    if (periodo === "dia") return [new Date(a, m, d).getTime(), new Date(a, m, d + 1).getTime()];
    if (periodo === "mes") return [new Date(a, m, 1).getTime(), new Date(a, m + 1, 1).getTime()];
    return [new Date(a, 0, 1).getTime(), new Date(a + 1, 0, 1).getTime()];
}

function titulo() {
    if (periodo === "dia") return ref.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (periodo === "mes") return MESES[ref.getMonth()] + " de " + ref.getFullYear();
    return "Año " + ref.getFullYear();
}

function mover(d) {
    if (periodo === "dia") ref = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + d);
    else if (periodo === "mes") ref = new Date(ref.getFullYear(), ref.getMonth() + d, 1);
    else ref = new Date(ref.getFullYear() + d, 0, 1);
    if (limites()[0] > Date.now()) {            // no se puede ir al futuro
        ref = new Date();
        toast("No hay ventas en el futuro.", true);
    }
    ultimo = "";
    refrescar();
}

// Las barras del gráfico: horas del día, días del mes o meses del año
function barras(lista) {
    let n, etq, pos;
    if (periodo === "dia") { n = 24; etq = (i) => (i % 3 === 0 ? i + "h" : ""); pos = (t) => new Date(t).getHours(); }
    else if (periodo === "mes") { n = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate(); etq = (i) => ((i + 1) % 5 === 0 || i === 0 ? i + 1 : ""); pos = (t) => new Date(t).getDate() - 1; }
    else { n = 12; etq = (i) => MESES[i].slice(0, 3); pos = (t) => new Date(t).getMonth(); }
    const totales = Array(n).fill(0);
    lista.forEach((o) => { totales[pos(o.t0)] += o.total; });
    const max = Math.max(...totales, 1);
    return `<div class="barras">${totales.map((v) => `<div class="barra" title="${M(v)}"><i style="height:${(v / max) * 100}%;${v ? "" : "opacity:.25"}"></i></div>`).join("")}</div>
        <div class="etiquetas">${totales.map((v, i) => `<span>${etq(i)}</span>`).join("")}</div>`;
}

function vistaVentas() {
    const [ini, fin] = limites();
    const enPeriodo = (o) => o.t0 >= ini && o.t0 < fin;
    const lista = ventas().filter(enPeriodo);
    const total = lista.reduce((s, o) => s + o.total, 0);
    const cancelados = pedidos().filter((o) => o.st === "Cancelado" && o.t0 > 0 && enPeriodo(o));
    const reembolsos = cancelados.reduce((s, o) => s + o.total, 0);
    const porProducto = {};
    lista.forEach((o) => o.items.forEach((l) => { porProducto[l.p.n] = (porProducto[l.p.n] || 0) + l.q; }));
    const top = Object.entries(porProducto).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const futuro = fin > Date.now();
    const botones = [["dia", "Día"], ["mes", "Mes"], ["año", "Año"]].map(([p, t]) => `<button class="chip ${p === periodo ? "on" : ""}" data-accion="periodo" data-valor="${p}">${t}</button>`).join("");
    return `<div class="chips">${botones}</div>
        <div class="navegador"><button class="btn alt" data-accion="atras" aria-label="Anterior">◀</button><b>${titulo()}</b>
        <button class="btn alt" data-accion="adelante" aria-label="Siguiente" ${futuro ? "disabled" : ""}>▶</button><button class="btn alt" data-accion="hoy">Hoy</button></div>
        <div class="kpis">
            <div class="kpi"><div class="mut">Ventas</div><div class="valor">${M(total)}</div></div>
            <div class="kpi"><div class="mut">Pedidos</div><div class="valor">${lista.length}</div></div>
            <div class="kpi"><div class="mut">Ticket promedio</div><div class="valor">${lista.length ? M(total / lista.length) : "—"}</div></div>
            <div class="kpi"><div class="mut">Cancelados pagados</div><div class="valor">${cancelados.length}</div><div class="mut">Reembolso pendiente: ${M(reembolsos)}</div></div>
        </div>
        <div class="card"><b>Ventas por ${periodo === "dia" ? "hora" : periodo === "mes" ? "día" : "mes"}</b>${lista.length ? barras(lista) : `<p class="mut">No hay ventas en este periodo.</p>`}</div>
        <div class="card top5"><b>Productos más vendidos</b>${top.length ? top.map(([n, q]) => `<div class="fila"><span class="nombre">${esc(n)}</span><span class="tira"><i style="width:${(q / top[0][1]) * 100}%"></i></span><b>${q}</b></div>`).join("") : `<p class="mut">Sin datos en este periodo.</p>`}</div>
        <p class="mut">Una venta es un pedido con el pago confirmado y no cancelado, contado en el momento del pago.</p>`;
}

// ---------- PEDIDOS ----------
function deLista(f) {
    const todos = pedidos();
    if (f === "activos") return todos.filter((o) => ACTIVOS.includes(o.st)).sort((a, b) => a.id - b.id);
    if (f === "completados") return todos.filter((o) => o.st === "Entregado").sort((a, b) => (b.tEntrega || 0) - (a.tEntrega || 0)).slice(0, 30);
    return todos.filter((o) => o.st === "Cancelado").sort((a, b) => b.id - a.id).slice(0, 30);
}

function tarjeta(o) {
    const lineas = o.items.map((l) => `<div class="it"><b class="price">${l.q}×</b> ${esc(l.p.n)}` + (l.rm || []).map((i) => `<div class="sin">SIN ${esc(i).toUpperCase()}</div>`).join("") + (l.obs ? `<div class="mut">Obs.: ${esc(l.obs)}</div>` : "") + `</div>`).join("");
    const color = o.st === "Cancelado" ? "red" : o.st === "Entregado" ? "mut" : o.st === "Listo" ? "ok" : "acc";
    let pie = "";
    if (o.st === "Cancelado") {
        const quien = o.motivo ? "el Administrador" : "el cliente";
        pie = `<div class="note" style="border-color:var(--red)">Cancelado por ${quien}${o.motivo ? ". Motivo: " + esc(o.motivo) : ""}.<br>${o.t0 > 0 ? "<b>Reembolso pendiente: " + M(o.total) + "</b>" : "No hubo cobro."}</div>`;
    } else if (ACTIVOS.includes(o.st)) {
        pie = `<div class="botones"><button class="btn red" data-accion="cancelar" data-id="${o.id}">✖ Cancelar pedido</button></div>`;
    }
    return `<div class="card"><div class="row sp"><h3>#${esc(o.no)}</h3><span class="estado" style="color:var(--${color})">${esc(o.st)}</span></div>
        <div class="mut">Mesa ${o.mesa} · Sesión #${o.sesion} · <b style="color:var(--tx)">${M(o.total)}</b></div>
        <div style="margin-top:6px">${lineas}</div>${pie}</div>`;
}

function vistaPedidos() {
    const chips = Object.keys(LISTAS).map((f) => `<button class="chip ${f === filtro ? "on" : ""}" data-accion="filtro" data-valor="${f}">${LISTAS[f]} (${deLista(f).length})</button>`).join("");
    const l = deLista(filtro);
    return `<div class="chips">${chips}</div>` + (l.length ? l.map(tarjeta).join("") : `<div class="card" style="text-align:center"><div style="font-size:40px">🧾</div><p class="mut">No hay pedidos en «${LISTAS[filtro]}».</p></div>`);
}

// ---------- CANCELAR CON MOTIVO ----------
function pedirCancelar(id) {
    const o = cargarPedidos().find((x) => x.id === id);
    if (!o || !ACTIVOS.includes(o.st)) {
        toast("Este pedido ya no se puede cancelar.", true);
        return;
    }
    pendiente = id;
    $("#modal-info").textContent = `Pedido #${o.no} · ${M(o.total)} · estado actual: ${o.st}`;
    const aviso = $("#modal-aviso");
    aviso.classList.toggle("hide", !["En preparación", "Listo"].includes(o.st));
    aviso.textContent = o.st === "Listo" ? "El pedido ya está listo en el mostrador." : "Cocina ya inició la producción de este pedido.";
    $("#motivos").innerHTML = MOTIVOS.map((m) => `<button type="button" class="chip" data-motivo="${esc(m)}">${esc(m)}</button>`).join("");
    $("#motivo").value = "";
    $("#cuenta").textContent = "0/120";
    limpiarError();
    $("#modal").classList.remove("hide");
    $("#motivo").focus();
}

function limpiarError() {
    $("#er-motivo").textContent = "";
    $("#motivo").classList.remove("bad");
}

function confirmarCancelar() {
    limpiarError();
    const motivo = $("#motivo").value.trim().replace(/\s+/g, " ");
    let error = "";
    if (motivo.length < 5) error = "Escribe el motivo (mínimo 5 caracteres) para poder cancelar.";
    else if (motivo.length > 120) error = "El motivo no puede pasar de 120 caracteres.";
    else if (/[<>]/.test(motivo)) error = "No uses los símbolos < o >.";
    if (error) {
        const caja = $("#er-motivo");
        caja.textContent = error;
        caja.classList.remove("shake");
        void caja.offsetWidth;
        caja.classList.add("shake");
        $("#motivo").classList.add("bad");
        $("#motivo").focus();
        return;
    }
    const todos = cargarPedidos(), o = todos.find((x) => x.id === pendiente);
    if (!o || !ACTIVOS.includes(o.st)) {            // pudo cambiar mientras escribías el motivo
        toast("Este pedido ya no se puede cancelar.", true);
    } else {
        o.st = "Cancelado";
        o.motivo = motivo;                          // el cliente recibe este motivo
        o.canceladoPor = "Administrador";
        o.tCancel = Date.now();
        o.reembolso = o.t0 > 0;                     // si ya estaba pagado queda "Reembolso pendiente"
        guardarPedidos(todos);
        toast(`Pedido #${o.no} cancelado. Se avisó al cliente.`);
    }
    cerrarModal();
    ultimo = "";
    refrescar();
}

function cerrarModal() {
    pendiente = null;
    $("#modal").classList.add("hide");
}

// ---------- CONFIGURACIÓN ----------
const tiempoDe = (t, cap, delante) => t + Math.floor(delante / cap) * 4;

function vistaConfig() {
    const r = restaurante();
    return `<div class="card campo">
            <b>Tiempos de cocina de ${esc(r.n)}</b>
            <p class="mut">El cliente ve un tiempo estimado que se calcula con estos valores y con los pedidos que están por delante.</p>
            <label for="c-t">Tiempo de preparación (minutos)</label>
            <input id="c-t" type="number" min="1" max="120" step="1" value="${r.t}">
            <div class="err" id="er-t" role="alert"></div>
            <label for="c-cap">Capacidad de cocina (pedidos que prepara a la vez)</label>
            <input id="c-cap" type="number" min="1" max="10" step="1" value="${r.cap || 1}">
            <div class="err" id="er-cap" role="alert"></div>
            <div class="note" id="vista-previa" style="margin-top:12px"></div>
            <div class="botones"><button class="btn" data-accion="guardar">Guardar tiempos</button></div>
        </div>
        <div class="card">
            <b>Datos de ejemplo para pruebas</b>
            <p class="mut">Crea unas ventas de los últimos 13 meses para ver los reportes. Se pueden borrar sin afectar los pedidos reales.</p>
            <div class="botones"><button class="btn alt" data-accion="demo">Cargar ventas de ejemplo</button><button class="btn alt" data-accion="borrar-demo">Borrar ventas de ejemplo</button></div>
        </div>`;
}

// Muestra qué tiempo vería un cliente con los valores escritos
function vistaPrevia() {
    const t = Number($("#c-t").value), cap = Number($("#c-cap").value);
    const caja = $("#vista-previa");
    if (!Number.isInteger(t) || !Number.isInteger(cap) || t < 1 || cap < 1) {
        caja.textContent = "Escribe valores válidos para ver el tiempo estimado.";
        return;
    }
    const f = (d) => { const a = tiempoDe(t, cap, d); return `${a}–${a + 4} min`; };
    caja.innerHTML = `<b>Así lo verá el cliente:</b> sin pedidos por delante ${f(0)} · con 3 por delante ${f(3)} · con 8 por delante ${f(8)}`;
}

function guardarConfig() {
    ["t", "cap"].forEach((c) => { $("#er-" + c).textContent = ""; $("#c-" + c).classList.remove("bad"); });
    const t = Number($("#c-t").value), cap = Number($("#c-cap").value);
    const errores = {};
    if ($("#c-t").value === "" || !Number.isInteger(t) || t < 1 || t > 120) errores.t = "Escribe un número entero de minutos entre 1 y 120.";
    if ($("#c-cap").value === "" || !Number.isInteger(cap) || cap < 1 || cap > 10) errores.cap = "La capacidad debe ser un número entero entre 1 y 10.";
    const claves = Object.keys(errores);
    if (claves.length) {
        claves.forEach((c) => { $("#er-" + c).textContent = errores[c]; $("#c-" + c).classList.add("bad"); });
        $("#c-" + claves[0]).focus();
        toast("Revisa los campos marcados en rojo.", true);
        return;
    }
    const r = restaurante();
    r.t = t;
    r.cap = cap;
    if (guardarMenu(R)) toast("Tiempos guardados ✓");
    else toast("No se pudo guardar en este navegador.", true);
}

// Ventas de ejemplo (marcadas con demo: true para poder borrarlas)
function cargarDemo() {
    const productos = restaurante().P;
    if (!productos.length) { toast("Este restaurante no tiene productos.", true); return; }
    const todos = cargarPedidos();
    if (todos.some((o) => o.demo && o.rid === rid)) { toast("Ya hay ventas de ejemplo. Bórralas antes de cargarlas otra vez.", true); return; }
    let n = 0;
    for (let dia = 400; dia >= 1; dia--) {
        const cantidad = Math.floor(Math.random() * 5);                       // de 0 a 4 pedidos por día
        for (let k = 0; k < cantidad; k++) {
            const lineas = Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => {
                const p = productos[Math.floor(Math.random() * productos.length)];
                return { q: 1 + Math.floor(Math.random() * 2), p: { id: p.id, n: p.n, $: p.$ }, rm: [], obs: "" };
            });
            const f = new Date();
            f.setDate(f.getDate() - dia);
            f.setHours(Math.random() < 0.6 ? 12 + Math.floor(Math.random() * 3) : 18 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0, 0);
            const sesion = 5000 + n;                                                  // rango propio para no chocar con las sesiones reales
            todos.push({ id: siguiente("pedido"), sesion, mesa: 1 + Math.floor(Math.random() * 20), rid, no: `${sesion}-R${rid}-01`, items: lineas,
                total: lineas.reduce((s, l) => s + l.p.$ * l.q, 0), st: "Entregado", t0: f.getTime(), tListo: f.getTime() + 900000, tEntrega: f.getTime() + 960000, demo: true });
            n++;
        }
    }
    guardarPedidos(todos);
    toast(`Se cargaron ${n} ventas de ejemplo.`);
}

function borrarDemo() {
    const antes = cargarPedidos();
    const quedan = antes.filter((o) => !(o.demo && o.rid === rid));
    guardarPedidos(quedan);
    toast(`Se borraron ${antes.length - quedan.length} ventas de ejemplo.`);
}

// ---------- PINTAR ----------
function pintar() {
    $("#secciones").innerHTML = Object.keys(SECCIONES).map((s) => `<button class="chip ${s === seccion ? "on" : ""}" data-accion="seccion" data-valor="${s}">${SECCIONES[s]}</button>`).join("");
    $("#contenido").innerHTML = seccion === "ventas" ? vistaVentas() : seccion === "pedidos" ? vistaPedidos() : vistaConfig();
    if (seccion === "config") vistaPrevia();
}

function refrescar() {
    // Configuración tiene formularios: solo se repinta cuando se entra, para no borrar lo que se está escribiendo
    const firma = seccion === "config" ? "config" + rid : JSON.stringify(pedidos()) + seccion + periodo + ref.getTime() + filtro + rid;
    if (firma !== ultimo) {
        ultimo = firma;
        pintar();
    }
}

// ---------- EVENTOS ----------
$("#contenido").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-accion]");
    if (!b || b.disabled) return;
    const a = b.dataset.accion, v = b.dataset.valor;
    if (a === "periodo") { periodo = v; ref = new Date(); ultimo = ""; refrescar(); }
    else if (a === "atras") mover(-1);
    else if (a === "adelante") mover(1);
    else if (a === "hoy") { ref = new Date(); ultimo = ""; refrescar(); }
    else if (a === "filtro") { filtro = v; ultimo = ""; refrescar(); }
    else if (a === "cancelar") pedirCancelar(Number(b.dataset.id));
    else if (a === "guardar") guardarConfig();
    else if (a === "demo") { cargarDemo(); ultimo = ""; refrescar(); }
    else if (a === "borrar-demo") { borrarDemo(); ultimo = ""; refrescar(); }
});
$("#contenido").addEventListener("input", (ev) => { if (ev.target.id === "c-t" || ev.target.id === "c-cap") vistaPrevia(); });
$("#secciones").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-accion='seccion']");
    if (b) { seccion = b.dataset.valor; ultimo = ""; refrescar(); }
});
$("#rest").addEventListener("change", (ev) => { rid = Number(ev.target.value); ultimo = ""; refrescar(); });
$("#confirmar").addEventListener("click", confirmarCancelar);
$("#volver").addEventListener("click", cerrarModal);
$("#modal").addEventListener("click", (ev) => { if (ev.target.id === "modal") cerrarModal(); });
$("#motivo").addEventListener("input", (ev) => { $("#cuenta").textContent = ev.target.value.length + "/120"; limpiarError(); });
$("#motivos").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-motivo]");
    if (b) { $("#motivo").value = b.dataset.motivo; $("#cuenta").textContent = b.dataset.motivo.length + "/120"; limpiarError(); }
});
window.addEventListener("storage", (e) => { if (e.key === CLAVE_P) refrescar(); });
setInterval(refrescar, 2000);

// ---------- INICIO ----------
$("#rest").innerHTML = R.map((r) => `<option value="${r.id}">${esc(r.n)}</option>`).join("");
refrescar();
