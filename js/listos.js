// ===== Mesero Virtual: pantalla de pedidos listos =====
// Muestra SOLO el número de los pedidos que están Listos en un restaurante (sin precios ni datos del cliente).
// Solo funciona si el Mostrador la activó: la clave de la dirección debe coincidir con la guardada.
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const params = new URLSearchParams(location.search);
const rid = Number(params.get("r"));
const clave = params.get("t") || "";
const restaurante = R.find((r) => r.id === rid);

let conSonido = false;   // el navegador solo deja sonar tras un toque del usuario
let conocidos = null;    // pedidos que ya estaban en pantalla (para marcar los nuevos)
let ultimo = "";

function pitido() {
    if (!conSonido) {
        return;
    }
    try {
        const c = new (window.AudioContext || window.webkitAudioContext)(), g = c.createGain(), x = c.createOscillator();
        g.gain.value = 0.2;
        x.frequency.value = 988;
        x.connect(g);
        g.connect(c.destination);
        x.start();
        x.stop(c.currentTime + 0.3);
    } catch (e) { /* sin sonido */ }
}

// La pantalla es válida si el restaurante existe y la clave coincide con la que guardó el Mostrador
function activa() {
    return !!restaurante && clave !== "" && leerPantallas()[rid] === clave;
}

function pintar() {
    if (!activa()) {
        const texto = "Pantalla no activada. Actívala desde el Mostrador del restaurante.";
        if (ultimo !== texto) {
            ultimo = texto;
            $("#grid").innerHTML = `<div id="bloqueo">🔒 ${texto}</div>`;
        }
        return;
    }
    $("#nombre").textContent = "Pedidos listos · " + restaurante.n;
    const listos = cargarPedidos()
        .filter((o) => o.rid === rid && o.st === "Listo")
        .sort((a, b) => a.tListo - b.tListo);
    const firma = JSON.stringify(listos.map((o) => o.id));
    if (firma === ultimo) {
        return;
    }
    ultimo = firma;
    const nuevos = conocidos ? listos.filter((o) => !conocidos.has(o.id)) : [];
    if (nuevos.length) {
        pitido();
    }
    $("#grid").innerHTML = listos.length
        ? listos.map((o) => `<div class="ficha ${nuevos.includes(o) ? "nueva" : ""}"><div class="num">${esc(o.no)}</div><div class="ok">✔ Listo para recoger</div></div>`).join("")
        : `<div class="vacio">No hay pedidos listos por ahora</div>`;
    conocidos = new Set(listos.map((o) => o.id));
}

$("#sonido").onclick = () => {
    conSonido = !conSonido;
    $("#sonido").textContent = conSonido ? "🔊 Sonido activado" : "🔇 Sonido apagado";
    pitido();
};
window.addEventListener("storage", (e) => { if (e.key === CLAVE_P || e.key === CLAVE_PANT) pintar(); });
setInterval(pintar, 2000);   // respaldo por si el evento no llega
pintar();
