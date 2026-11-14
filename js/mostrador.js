// ===== Mesero Virtual: interfaz de Mostrador =====
// El Mostrador es un rol de CONSULTA: ve el estado, el tiempo estimado, el costo y los productos de cada pedido.
// Solo puede hacer tres cosas: marcar un pedido Listo como Entregado, recordar al cliente y activar la pantalla de pedidos listos.
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const M = (n) => "$" + n.toLocaleString("es-CO");

const ESPERA_RECORDATORIO = 5 * 60 * 1000;   // el botón "Recordar" se bloquea 5 minutos tras cada uso
const PESTANAS = { cocina: "En cocina", listo: "Listos", entregado: "Entregados" };
const ESTADOS = { cocina: ["En espera", "En preparación"], listo: ["Listo"], entregado: ["Entregado"] };

let rid = R[0].id;     // restaurante de este mostrador (más adelante vendrá del login)
let tab = "listo";     // lista que se está viendo
let ultimo = "";       // última versión pintada (para no repintar sin necesidad)

// Aviso temporal
let tt;
function toast(m, mal) {
    const e = $("#toast");
    e.textContent = m;
    e.className = "on" + (mal ? " bad" : "");
    clearTimeout(tt);
    tt = setTimeout(() => (e.className = ""), 3000);
}

const pedidos = () => cargarPedidos().filter((o) => o.rid === rid);
const restaurante = () => R.find((r) => r.id === rid);

// Cambia un pedido directamente en LocalStorage; fn puede devolver false para cancelar el cambio
function actualizar(id, fn) {
    const todos = cargarPedidos(), o = todos.find((x) => x.id === id);
    if (o && fn(o) !== false) {
        guardarPedidos(todos);
    }
    refrescar();
}

// Mismo cálculo que ve el cliente: tiempo del restaurante + 4 minutos por cada pedido que está por delante
function tiempoEstimado(o) {
    const total = minutosEstimados(o);   // tiempo y capacidad configurados por el Administrador
    const pasados = Math.floor((Date.now() - o.t0) / 60000);
    const desde = Math.max(0, total - pasados), hasta = Math.max(0, total + 4 - pasados);
    return hasta === 0 ? "ya debería estar listo" : `faltan ${desde}–${hasta} min`;
}

// ---------- ACCIONES DEL MOSTRADOR ----------
function entregar(id) {
    actualizar(id, (o) => {
        if (o.st !== "Listo") {
            toast("Solo se puede entregar un pedido que esté Listo.", true);
            return false;
        }
        o.st = "Entregado";
        o.tEntrega = Date.now();
        toast(`Pedido #${o.no} entregado ✓`);
    });
}

function recordar(id) {
    actualizar(id, (o) => {
        if (o.st !== "Listo") {
            toast("Solo se puede recordar un pedido que esté Listo.", true);
            return false;
        }
        const falta = ESPERA_RECORDATORIO - (Date.now() - (o.tRec || 0));
        if (o.tRec && falta > 0) {
            toast("Espera unos minutos antes de volver a recordar este pedido.", true);
            return false;
        }
        o.rec = (o.rec || 0) + 1;       // el cliente detecta este número y vuelve a sonar su alarma
        o.tRec = Date.now();
        toast(`Se recordó al cliente del pedido #${o.no} 🔔`);
    });
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
    const l = (x) => `<div class="it"><b class="price">${x.q}×</b> ${esc(x.p.n)}` + (x.rm || []).map((i) => `<div class="sin">SIN ${esc(i).toUpperCase()}</div>`).join("") + (x.obs ? `<div class="mut">Obs.: ${esc(x.obs)}</div>` : "") + `</div>`;
    let pie = "";
    if (o.st === "Listo") {
        const ms = Date.now() - o.tListo, falta = ESPERA_RECORDATORIO - (Date.now() - (o.tRec || 0));
        const bloqueado = o.tRec && falta > 0;
        pie = `<div class="row sp"><span class="mut">Esperando que lo recojan hace</span><b class="${clase(ms)}" data-espera="${o.tListo}">0:00</b></div>` +
            (o.rec ? `<div class="mut">Recordatorios enviados: ${o.rec}</div>` : "") +
            `<div class="botones">
                <button class="btn ok" onclick="entregar(${o.id})">✔ Marcar entregado</button>
                <button class="btn alt" data-recordar="${o.id}" data-trec="${o.tRec || 0}" ${bloqueado ? "disabled" : ""} onclick="recordar(${o.id})">🔔 Recordar al cliente</button>
            </div>`;
    } else if (o.st === "Entregado") {
        pie = `<div class="mut">Entregado hace <b data-t="${o.tEntrega || o.tListo}">0:00</b></div>`;
    } else {
        pie = `<div class="row sp"><span class="mut">Tiempo estimado: <b style="color:var(--tx)">${tiempoEstimado(o)}</b></span><span class="mut">⏱ <b data-t="${o.t0}">0:00</b></span></div>`;
    }
    return `<div class="card"><div class="row sp"><h3>#${esc(o.no)}</h3><span class="estado" style="color:var(--${o.st === "Listo" ? "ok" : o.st === "Entregado" ? "mut" : "acc"})">${esc(o.st)}</span></div>
        <div class="mut">Mesa ${o.mesa} · Sesión #${o.sesion} · <b style="color:var(--tx)">${M(o.total)}</b></div>
        <div style="margin-top:6px">${o.items.map(l).join("")}</div>${pie}</div>`;
}

function pintarPantalla() {
    const activa = !!leerPantallas()[rid];
    $("#pantalla").innerHTML = `<div class="row sp"><div><b>Pantalla de pedidos listos</b><div class="mut">Estado: ${activa ? "✅ activa" : "apagada"} · muestra solo el número del pedido</div></div></div>
        <div class="botones">
            <button class="btn" onclick="activarPantalla()">📺 ${activa ? "Abrir de nuevo" : "Activar"} pantalla</button>
            ${activa ? `<button class="btn alt" onclick="desactivarPantalla()">Desactivar</button>` : ""}
        </div>`;
}

function pintar(lista) {
    const de = (t) => lista.filter((o) => ESTADOS[t].includes(o.st));
    $("#tabs").innerHTML = Object.keys(PESTANAS).map((t) => `<button class="chip ${t === tab ? "on" : ""}" onclick="tab='${t}';ultimo='';refrescar()">${PESTANAS[t]} (${de(t).length})</button>`).join("");
    let l = de(tab);
    if (tab === "entregado") {
        l = l.sort((a, b) => b.tEntrega - a.tEntrega).slice(0, 20);   // los más recientes primero
    } else {
        l = l.sort((a, b) => (tab === "listo" ? a.tListo - b.tListo : a.t0 - b.t0));
    }
    $("#lista").innerHTML = l.length ? l.map(tarjeta).join("") :
        `<div class="card" style="text-align:center"><div style="font-size:40px">${tab === "listo" ? "🍽️" : "✅"}</div><p class="mut">No hay pedidos en «${PESTANAS[tab]}».</p></div>`;
}

function refrescar() {
    const lista = pedidos().filter((o) => ["En espera", "En preparación", "Listo", "Entregado"].includes(o.st));
    // la firma incluye el minuto actual para que el tiempo estimado se actualice solo
    const firma = JSON.stringify(lista) + tab + Math.floor(Date.now() / 30000) + JSON.stringify(leerPantallas()[rid] || "");
    if (firma !== ultimo) {
        ultimo = firma;
        pintar(lista);
        pintarPantalla();
        setTimeout(() => typeof tick === "function" && tick(), 0);   // pone los cronómetros al día sin esperar 1 segundo
    }
}

// ---------- INICIO ----------
$("#rest").innerHTML = R.map((r) => `<option value="${r.id}">${esc(r.n)}</option>`).join("");
$("#rest").onchange = (e) => { rid = Number(e.target.value); ultimo = ""; refrescar(); };
window.addEventListener("storage", (e) => { if (e.key === CLAVE_P || e.key === CLAVE_PANT) refrescar(); });
setInterval(refrescar, 2000);

// Cronómetros en vivo y cuenta atrás del botón "Recordar"
function tick() {
    const fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    document.querySelectorAll("[data-t]").forEach((e) => { e.textContent = fmt(Math.max(0, Math.floor((Date.now() - e.dataset.t) / 1000))); });
    document.querySelectorAll("[data-espera]").forEach((e) => {
        const ms = Date.now() - e.dataset.espera;
        e.textContent = fmt(Math.max(0, Math.floor(ms / 1000)));
        e.className = clase(ms);
    });
    document.querySelectorAll("[data-recordar]").forEach((b) => {
        const falta = ESPERA_RECORDATORIO - (Date.now() - Number(b.dataset.trec));
        if (Number(b.dataset.trec) && falta > 0) {
            b.disabled = true;
            b.textContent = "🔔 Disponible en " + fmt(Math.ceil(falta / 1000));
        } else {
            b.disabled = false;
            b.textContent = "🔔 Recordar al cliente";
        }
    });
}
setInterval(tick, 1000);
refrescar();
tick();
