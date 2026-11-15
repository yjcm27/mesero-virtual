// ===== Mesero Virtual: interfaz de Mostrador (conectada a la API) =====
// El Mostrador es un rol de CONSULTA: ve el estado, el tiempo estimado, el costo y los productos de cada pedido.
// Solo puede hacer dos cosas: marcar un pedido Listo como Entregado y activar la pantalla de pedidos listos.
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const M = (n) => "$" + n.toLocaleString("es-CO");

// Hora de entrega: "hoy a las 3:45 p. m." si es de hoy; si es de otro día, "12 nov, 3:45 p. m."
function horaEntrega(ms) {
    const d = new Date(ms), hoy = new Date();
    const h = d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
    return d.toDateString() === hoy.toDateString()
        ? "hoy a las " + h
        : d.toLocaleDateString("es-CO", { day: "numeric", month: "short" }) + ", " + h;
}

const PESTANAS = { cocina: "En cocina", listo: "Listos", entregado: "Entregados" };
const ESTADOS = { cocina: ["En espera", "En preparación"], listo: ["Listo"], entregado: ["Entregado"] };

let R = [];            // restaurantes (vienen de la API)
let rid = null;        // restaurante de este mostrador (más adelante vendrá del login)
let tab = "listo";     // lista que se está viendo
let lista = [];        // pedidos del restaurante (vienen de la API)
let ultimo = "";       // última versión pintada (para no repintar sin necesidad)
let sinConexion = false;

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

// Pedidos de este restaurante que el mostrador debe ver
async function pedidos() {
    const todos = await listarPedidos(rid);
    const visibles = todos.filter((o) => ["En espera", "En preparación", "Listo", "Entregado"].includes(o.estado));
    // si la lista no trae los productos de cada pedido, se piden uno por uno
    return Promise.all(visibles.map((o) => (o.items ? o : obtenerPedido(o.id))));
}

// Tiempo del restaurante + 4 minutos por cada pedido que está por delante (igual que lo ve el cliente)
function tiempoEstimado(o) {
    const delante = lista.filter((x) => x.id !== o.id && x.pagadoEn < o.pagadoEn && ["En espera", "En preparación"].includes(x.estado)).length;
    const total = restaurante().tiempoPrepMin + delante * 4;
    const pasados = Math.floor((Date.now() - o.pagadoEn) / 60000);
    const desde = Math.max(0, total - pasados), hasta = Math.max(0, total + 4 - pasados);
    return hasta === 0 ? "ya debería estar listo" : `faltan ${desde}–${hasta} min`;
}

// ---------- ACCIONES DEL MOSTRADOR ----------
async function entregar(id) {
    try {
        const r = await cambiarEstado(id, "Entregado");
        toast(`Pedido #${r.numero} entregado ✓`);
    } catch (e) {
        toast(e.message, true);
    }
    ultimo = "";
    await refrescar();
}

// ---------- PANTALLA DE PEDIDOS LISTOS ----------
function activarPantalla() {
    const claves = leerPantallas();
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    claves[rid] = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");   // clave nueva cada vez
    if (!guardarPantallas(claves)) {
        toast("No se pudo activar la pantalla en este navegador.", true);
        return;
    }
    window.open(`listos.html?r=${rid}&t=${claves[rid]}`, "_blank");
    toast("Pantalla activada. Se abrió en una pestaña nueva.");
    ultimo = "";
    refrescar();
}

function desactivarPantalla() {
    const claves = leerPantallas();
    delete claves[rid];
    guardarPantallas(claves);
    toast("Pantalla desactivada.");
    ultimo = "";
    refrescar();
}

// ---------- PINTAR ----------
function clase(ms) {
    return ms >= 10 * 60000 ? "espera-mal" : ms >= 5 * 60000 ? "espera-aviso" : "espera-ok";
}

function tarjeta(o) {
    const linea = (x) => `<div class="it"><b class="price">${x.cantidad}×</b> ${esc(x.nombre)}` +
        x.quitar.map((i) => `<div class="sin">SIN ${esc(i).toUpperCase()}</div>`).join("") +
        (x.observacion ? `<div class="mut">Obs.: ${esc(x.observacion)}</div>` : "") + `</div>`;
    let pie = "";
    if (o.estado === "Listo") {
        const ms = Date.now() - o.listoEn;
        pie = `<div class="row sp"><span class="mut">Esperando que lo recojan hace</span><b class="${clase(ms)}" data-espera="${o.listoEn}">0:00</b></div>
            <div class="botones">
                <button class="btn ok" onclick="entregar(${o.id})">✔ Marcar entregado</button>
            </div>`;
    } else if (o.estado === "Entregado") {
        pie = `<div class="mut">Entregado ${horaEntrega(o.entregadoEn || o.listoEn)}</div>`;
    } else {
        pie = `<div class="row sp"><span class="mut">Tiempo estimado: <b style="color:var(--tx)">${tiempoEstimado(o)}</b></span><span class="mut">⏱ <b data-t="${o.pagadoEn}">0:00</b></span></div>`;
    }
    return `<div class="card"><div class="row sp"><h3>#${esc(o.numero)}</h3><span class="estado" style="color:var(--${o.estado === "Listo" ? "ok" : o.estado === "Entregado" ? "mut" : "acc"})">${esc(o.estado)}</span></div>
        <div class="mut">Mesa ${o.mesa} · Sesión #${o.sesion} · <b style="color:var(--tx)">${M(o.total)}</b></div>
        <div style="margin-top:6px">${o.items.map(linea).join("")}</div>${pie}</div>`;
}

function pintarPantalla() {
    const activa = !!leerPantallas()[rid];
    $("#pantalla").innerHTML = `<div class="row sp"><div><b>Pantalla de pedidos listos</b><div class="mut">Estado: ${activa ? "✅ activa" : "apagada"} · muestra solo el número del pedido</div></div></div>
        <div class="botones">
            <button class="btn" onclick="activarPantalla()">📺 ${activa ? "Abrir de nuevo" : "Activar"} pantalla</button>
            ${activa ? `<button class="btn alt" onclick="desactivarPantalla()">Desactivar</button>` : ""}
        </div>`;
}

function pintar(pedidosLista) {
    const de = (t) => pedidosLista.filter((o) => ESTADOS[t].includes(o.estado));
    $("#tabs").innerHTML = Object.keys(PESTANAS).map((t) => `<button class="chip ${t === tab ? "on" : ""}" onclick="tab='${t}';ultimo='';refrescar()">${PESTANAS[t]} (${de(t).length})</button>`).join("");
    let l = de(tab);
    if (tab === "entregado") {
        l = l.sort((a, b) => b.entregadoEn - a.entregadoEn).slice(0, 20);   // los más recientes primero
    } else {
        l = l.sort((a, b) => (tab === "listo" ? a.listoEn - b.listoEn : a.pagadoEn - b.pagadoEn));
    }
    $("#lista").innerHTML = l.length ? l.map(tarjeta).join("") :
        `<div class="card" style="text-align:center"><div style="font-size:40px">${tab === "listo" ? "🍽️" : "✅"}</div><p class="mut">No hay pedidos en «${PESTANAS[tab]}».</p></div>`;
}

// Pide los pedidos a la API y repinta solo si algo cambió
async function refrescar() {
    try {
        lista = await pedidos();
        sinConexion = false;
    } catch (e) {
        if (!sinConexion) toast(e.message, true);
        sinConexion = true;
        return;
    }
    // la firma incluye la hora (cada 30 s) para que el tiempo estimado se actualice solo
    const firma = JSON.stringify(lista) + tab + Math.floor(Date.now() / 30000) + JSON.stringify(leerPantallas()[rid] || "");
    if (firma !== ultimo) {
        ultimo = firma;
        pintar(lista);
        pintarPantalla();
        setTimeout(() => typeof tick === "function" && tick(), 0);   // pone los cronómetros al día sin esperar 1 segundo
    }
}

// ---------- INICIO ----------
async function arrancar() {
    try {
        R = await listarRestaurantes();
    } catch (e) {
        return toast(e.message, true);
    }
    $("#rest").innerHTML = R.map((r) => `<option value="${r.id}">${esc(r.nombre)}</option>`).join("");
    rid = R[0].id;
    await refrescar();
    setInterval(refrescar, 3000);   // consulta la API cada 3 segundos
}
$("#rest").onchange = (e) => { rid = Number(e.target.value); ultimo = ""; refrescar(); };
window.addEventListener("storage", (e) => { if (e.key === CLAVE_PANT) { ultimo = ""; refrescar(); } });

// Cronómetros en vivo
function tick() {
    const fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    document.querySelectorAll("[data-t]").forEach((e) => { e.textContent = fmt(Math.max(0, Math.floor((Date.now() - e.dataset.t) / 1000))); });
    document.querySelectorAll("[data-espera]").forEach((e) => {
        const ms = Date.now() - e.dataset.espera;
        e.textContent = fmt(Math.max(0, Math.floor(ms / 1000)));
        e.className = clase(ms);
    });
}
setInterval(tick, 1000);
arrancar();